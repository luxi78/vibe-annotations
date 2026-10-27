import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
export function run(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      env: { ...process.env, ...env },
      windowsHide: true
    });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('error', reject);
    child.on('exit', (code) => resolve({ code, output }));
  });
}
test('local executable introduces itself as Pinvelto', async (t) => {
  const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-cli-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const result = await run(['--help'], {
    HOME: home,
    USERPROFILE: home,
    PINVELTO_HOME: home
  });
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /Usage: pinvelto /);
  assert.match(result.output, /Pinvelto/);
});
import net from 'node:net';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

test('fresh init waits for a slow owned service to become ready before reporting success', { timeout: 30000 }, async t => {
  const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-slow-install-'));
  const port = await freePort();
  const preload = path.join(home, 'cold-start.mjs');
  await writeFile(preload, `if (process.argv[1]?.replaceAll('\\\\', '/').endsWith('/lib/server.js')) await new Promise(resolve => setTimeout(resolve, 5500));\n`);
  const env = { PINVELTO_HOME: home, PINVELTO_PORT: String(port), NODE_OPTIONS: `--import="${pathToFileURL(preload).href}"` };
  const invoke = (...args) => run(args, env);
  t.after(async () => {
    await invoke('stop');
    await rm(home, { recursive: true, force: true });
  });
  const initialized = await invoke('init', '--agent', 'codex', '--non-interactive', '--skip-extension');
  assert.equal(initialized.code, 0, initialized.output);
  const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json();
  assert.equal(health.product, 'pinvelto');
  assert.match((await invoke('status')).output, /Pinvelto is running/);
  assert.equal((await invoke('stop')).code, 0);
});
test(
  'CLI starts fresh isolated Feedback, persists it across restart, and stops its own service',
  { timeout: 30000 },
  async (t) => {
    const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-service-'));
    const port = await freePort();
    const env = {
      HOME: home,
      USERPROFILE: home,
      PINVELTO_HOME: home,
      PINVELTO_PORT: String(port)
    };
    const invoke = (...args) => run(['--port', String(port), ...args], env);
    t.after(async () => {
      await invoke('stop');
      await rm(home, { recursive: true, force: true });
    });
    await mkdir(path.join(home, '.vibe-annotations'));
    const old = '[{"id":"upstream-record"}]';
    await writeFile(
      path.join(home, '.vibe-annotations', 'annotations.json'),
      old
    );
    const started = await invoke('start', '--daemon');
    assert.equal(started.code, 0, started.output);
    const url = `http://127.0.0.1:${port}`;
    const health = await (await fetch(url + '/health')).json();
    assert.equal(health.product, 'pinvelto');
    assert.match((await invoke('status')).output, /Pinvelto is running/);
    assert.deepEqual(
      (await (await fetch(url + '/api/annotations')).json()).annotations,
      []
    );
    const feedback = {
      id: 'new-feedback',
      url: 'http://localhost:3000/',
      comment: 'Make heading blue',
      status: 'pending'
    };
    assert.equal(
      (
        await fetch(url + '/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedback)
        })
      ).status,
      200
    );
    const restarted = await invoke('restart');
    assert.equal(restarted.code, 0, restarted.output);
    const saved = await (await fetch(url + '/api/annotations')).json();
    assert.equal(saved.annotations[0].id, 'new-feedback');
    assert.equal(
      await readFile(
        path.join(home, '.vibe-annotations', 'annotations.json'),
        'utf8'
      ),
      old
    );
    assert.equal((await invoke('stop')).code, 0);
    await assert.rejects(fetch(url + '/health'));
  }
);
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
test(
  'real MCP exposes only the complete Pinvelto Feedback capability surface and reads persisted Feedback',
  { timeout: 15000 },
  async (t) => {
    const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-mcp-'));
    const port = await freePort();
    const invoke = (...args) =>
      run(['--port', String(port), ...args], {
        PINVELTO_HOME: home,
        HOME: home,
        USERPROFILE: home
      });
    const client = new Client({
      name: 'pinvelto-acceptance',
      version: '1.0.0'
    });
    t.after(async () => {
      await client.close();
      await invoke('stop');
      await rm(home, { recursive: true, force: true });
    });
    const started = await invoke('start', '--daemon');
    assert.equal(started.code, 0, started.output);
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`))
    );
    assert.equal(client.getServerVersion().name, 'pinvelto');
    const { tools } = await client.listTools();
    assert.deepEqual(
      tools.map((tool) => tool.name).sort(),
      [
        'pinvelto_list_feedback',
        'pinvelto_delete_feedback',
        'pinvelto_delete_project_feedback',
        'pinvelto_get_project_context',
        'pinvelto_get_screenshot',
        'pinvelto_watch_feedback',
        'pinvelto_update_feedback'
      ].sort()
    );
    const url = `http://127.0.0.1:${port}/api/annotations`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'mcp-feedback',
        url: 'http://localhost:3000/',
        comment: 'Blue heading',
        status: 'pending'
      })
    });
    const result = await client.callTool({
      name: 'pinvelto_list_feedback',
      arguments: { url: 'http://localhost:3000/*' }
    });
    assert.equal(
      JSON.parse(result.content[0].text).data[0].comment,
      'Blue heading'
    );
    await assert.rejects(
      client.callTool({ name: 'read_annotations', arguments: {} }),
      /Unknown tool/
    );
    await client.callTool({
      name: 'pinvelto_delete_feedback',
      arguments: { id: 'mcp-feedback' }
    });
    assert.equal((await (await fetch(url)).json()).annotations.length, 0);
  }
);
test(
  'fresh local setup adds pinvelto MCP configuration without changing upstream or other agent entries',
  { timeout: 15000 },
  async (t) => {
    const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-config-'));
    const port = await freePort();
    t.after(() => rm(home, { recursive: true, force: true }));
    const previous = {
      theme: 'dark',
      mcpServers: {
        'vibe-annotations': { type: 'http', url: 'http://127.0.0.1:3846/mcp' },
        other: { command: 'other-service' }
      }
    };
    await writeFile(path.join(home, '.claude.json'), JSON.stringify(previous));
    const result = await run(
      [
        '--port',
        String(port),
        'init',
        '--non-interactive',
        '--skip-server',
        '--skip-extension',
        '--agent',
        'claude-code'
      ],
      {
        HOME: home,
        USERPROFILE: home,
        PINVELTO_HOME: home,
        PATH: path.dirname(process.execPath)
      }
    );
    assert.equal(result.code, 0, result.output);
    const config = JSON.parse(
      await readFile(path.join(home, '.claude.json'), 'utf8')
    );
    assert.deepEqual(config.mcpServers.pinvelto, {
      type: 'http',
      url: `http://127.0.0.1:${port}/mcp`
    });
    delete config.mcpServers.pinvelto;
    assert.deepEqual(config, previous);
    assert.doesNotMatch(result.output, /chromewebstore|npm install.*vibe/);
  }
);
async function foreignProcess(t, product) {
  const port = await freePort();
  const script = `require('http').createServer((q,s)=>{s.setHeader('Content-Type','application/json');s.end(JSON.stringify({status:'ok',version:'99.0.0',product:${JSON.stringify(product)},pid:process.pid,instanceId:'foreign-instance'}))}).listen(${port},'127.0.0.1',()=>console.log('ready'));`;
  const child = spawn(process.execPath, ['-e', script], { windowsHide: true });
  await new Promise((resolve, reject) => {
    child.stdout.once('data', resolve);
    child.once('error', reject);
  });
  t.after(() => {
    if (child.exitCode === null) child.kill();
  });
  return { port, child };
}
for (const product of ['vibe-annotations', undefined, 'pinvelto']) {
  test(
    `CLI refuses to manage an unowned ${product || 'generic healthy'} service even with a stale live PID record`,
    { timeout: 20000 },
    async (t) => {
      const { port, child } = await foreignProcess(t, product);
      const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-foreign-'));
      t.after(() => rm(home, { recursive: true, force: true }));
      await mkdir(path.join(home, '.pinvelto'));
      await writeFile(
        path.join(home, '.pinvelto', `service-${port}.json`),
        JSON.stringify({
          product: 'pinvelto',
          pid: child.pid,
          instanceId: 'stale-instance',
          token: 'stale-secret'
        })
      );
      const invoke = (...args) =>
        run(['--port', String(port), ...args], {
          HOME: home,
          USERPROFILE: home,
          PINVELTO_HOME: home
        });
      for (const args of [
        ['status'],
        ['start', '--daemon'],
        ['stop'],
        ['restart'],
        ['init', '--non-interactive', '--skip-extension', '--agent', 'codex']
      ]) {
        const result = await invoke(...args);
        assert.notEqual(result.code, 0, result.output);
        assert.match(result.output, /occupied|Cannot stop/);
        assert.equal(
          (await fetch(`http://127.0.0.1:${port}/health`)).status,
          200
        );
        assert.equal(
          child.exitCode,
          null,
          'The unowned service must remain alive'
        );
      }
    }
  );
}
test(
  'stale process record pointing to a living unrelated process never authorizes signaling it',
  { timeout: 15000 },
  async (t) => {
    const { child } = await foreignProcess(t, 'unrelated');
    const port = await freePort();
    const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-stale-'));
    t.after(() => rm(home, { recursive: true, force: true }));
    await mkdir(path.join(home, '.pinvelto'));
    await writeFile(
      path.join(home, '.pinvelto', `service-${port}.json`),
      JSON.stringify({
        product: 'pinvelto',
        pid: child.pid,
        instanceId: 'stale',
        token: 'stale'
      })
    );
    const env = { HOME: home, USERPROFILE: home, PINVELTO_HOME: home };
    assert.equal((await run(['--port', String(port), 'stop'], env)).code, 0);
    assert.equal(child.exitCode, null);
    assert.equal(
      (await run(['--port', String(port), 'start', '--daemon'], env)).code,
      0
    );
    t.after(() => run(['--port', String(port), 'stop'], env));
    assert.equal((await run(['--port', String(port), 'stop'], env)).code, 0);
    assert.equal(child.exitCode, null);
  }
);
test(
  'an occupied non-HTTP endpoint is rejected without starting a daemon',
  { timeout: 15000 },
  async (t) => {
    const sockets = new Set();
    const socketServer = net.createServer((socket) => {
      sockets.add(socket);
      socket.resume();
      socket.on('error', () => {});
      socket.on('close', () => sockets.delete(socket));
    });
    socketServer.listen(0, '127.0.0.1');
    await new Promise((resolve) => socketServer.once('listening', resolve));
    const port = socketServer.address().port;
    t.after(() => {
      for (const socket of sockets) socket.destroy();
      return new Promise((resolve) => socketServer.close(resolve));
    });
    const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-occupied-'));
    t.after(() => rm(home, { recursive: true, force: true }));
    const result = await run(['--port', String(port), 'start', '--daemon'], {
      PINVELTO_HOME: home
    });
    assert.notEqual(result.code, 0);
    assert.match(result.output, /occupied/);
  }
);
test(
  'Codex setup preserves upstream TOML and uses only the isolated home',
  { timeout: 15000 },
  async (t) => {
    const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-codex-'));
    const port = await freePort();
    t.after(() => rm(home, { recursive: true, force: true }));
    await mkdir(path.join(home, '.codex'));
    const previous =
      'model = "example"\n\n[mcp_servers.vibe-annotations]\nurl = "http://127.0.0.1:3846/mcp"\n';
    const file = path.join(home, '.codex', 'config.toml');
    await writeFile(file, previous);
    const result = await run(
      [
        '--port',
        String(port),
        'init',
        '--non-interactive',
        '--skip-server',
        '--skip-extension',
        '--agent',
        'codex'
      ],
      { PINVELTO_HOME: home }
    );
    assert.equal(result.code, 0, result.output);
    const text = await readFile(file, 'utf8');
    assert.ok(text.startsWith(previous));
    assert.ok(
      text.includes(
        `[mcp_servers.pinvelto]\ntransport = "http"\nurl = "http://127.0.0.1:${port}/mcp"`
      )
    );
  }
);
