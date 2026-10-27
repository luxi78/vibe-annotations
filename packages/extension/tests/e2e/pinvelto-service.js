import net from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
export const PINVELTO_TOOLS = [
  'pinvelto_list_feedback',
  'pinvelto_delete_feedback',
  'pinvelto_delete_project_feedback',
  'pinvelto_get_project_context',
  'pinvelto_get_screenshot',
  'pinvelto_watch_feedback',
  'pinvelto_update_feedback'
].sort();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function startPinveltoService() {
  const home = await mkdtemp(path.join(tmpdir(), 'pinvelto-browser-service-'));
  const reservation = net.createServer();
  reservation.listen(0, '127.0.0.1');
  await new Promise((resolve) => reservation.once('listening', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const url = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL('../../../server/lib/server.js', import.meta.url))],
    {
      windowsHide: true,
      env: { ...process.env, PINVELTO_HOME: home, PINVELTO_PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let logs = '';
  child.stdout.on('data', (data) => (logs += data));
  child.stderr.on('data', (data) => (logs += data));
  const client = new Client({
    name: 'pinvelto-browser-acceptance',
    version: '1.0.0'
  });
  async function close() {
    await client.close();
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([
        new Promise((resolve) => child.once('exit', resolve)),
        pause(2000)
      ]);
    }
    await rm(home, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100
    });
  }
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      if (child.exitCode !== null) throw new Error(logs);
      try {
        const health = await (
          await fetch(`${url}/health`, { signal: AbortSignal.timeout(500) })
        ).json();
        if (health.product === 'pinvelto') {
          ready = true;
          break;
        }
      } catch {}
      await pause(100);
    }
    if (!ready) throw new Error(`Isolated Pinvelto did not start: ${logs}`);
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`${url}/mcp`))
    );
    return {
      url,
      home,
      client,
      close,
      logs: () => logs,
      async call(name, args = {}) {
        const result = await client.callTool({ name, arguments: args });
        if (result.isError) throw new Error(JSON.stringify(result.content));
        return JSON.parse(result.content[0].text);
      }
    };
  } catch (error) {
    await close();
    throw error;
  }
}
