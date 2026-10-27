#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const program = new Command();
program
  .name('pinvelto')
  .description('Pinvelto local webpage Feedback and MCP service')
  .version(pkg.version)
  .option(
    '--port <number>',
    'Local service port (default: PINVELTO_PORT or 3847)'
  )
  .hook('preAction', () => {
    if (program.opts().port) process.env.PINVELTO_PORT = program.opts().port;
  });
async function lifecycle() {
  return import('../lib/lifecycle.js');
}
function failure(result) {
  if (!result.ok) {
    console.error(result.reason);
    process.exitCode = 1;
    return true;
  }
  return false;
}
program
  .command('start')
  .description('Start the Pinvelto service')
  .option('-d, --daemon', 'Run in the background')
  .action(async (options) => {
    const result = await (
      await lifecycle()
    ).startService({ daemon: !!options.daemon });
    if (!failure(result))
      console.log(`Pinvelto is running (PID ${result.pid})`);
  });
program
  .command('stop')
  .description('Stop the owned Pinvelto service')
  .action(async () => {
    const result = await (await lifecycle()).stopService();
    if (!failure(result))
      console.log(
        result.stopped ? 'Pinvelto stopped' : 'Pinvelto is not running'
      );
  });
program
  .command('restart')
  .description('Restart the owned Pinvelto service')
  .action(async () => {
    const service = await lifecycle();
    if (failure(await service.stopService())) return;
    const result = await service.startService();
    if (!failure(result))
      console.log(`Pinvelto is running (PID ${result.pid})`);
  });
program
  .command('status')
  .description('Inspect service identity and ownership')
  .action(async () => {
    const status = await (await lifecycle()).inspectService();
    if (status.state === 'owned')
      console.log(
        `Pinvelto is running (PID ${status.health.pid}, version ${status.health.version})`
      );
    else if (status.state === 'stopped') console.log('Pinvelto is not running');
    else {
      console.error(
        `Endpoint occupied: ${status.state} service; Pinvelto does not own it`
      );
      process.exitCode = 1;
    }
  });
program
  .command('logs')
  .description('Show local service logs')
  .option('-n, --lines <number>', 'Number of lines', '50')
  .action(async (options) => {
    const { LOG_FILE } = await lifecycle();
    if (existsSync(LOG_FILE))
      console.log(
        readFileSync(LOG_FILE, 'utf8')
          .split('\n')
          .slice(-Number(options.lines))
          .join('\n')
      );
  });
program
  .command('init')
  .description('Configure Pinvelto from the installed local artifact')
  .option(
    '--agent <name>',
    'Agent to configure (repeatable)',
    (value, previous) => [...previous, value],
    []
  )
  .option('--non-interactive', 'Use defaults without prompts')
  .option('--skip-extension', 'Skip extension guidance')
  .option('--skip-server', 'Configure without starting the service')
  .option('--project', 'Configure at project scope')
  .action(async (options) => {
    await (
      await import('../lib/init/index.js')
    ).runInit({
      ...options,
      agent: options.agent.length ? options.agent : null
    });
  });
await program.parseAsync(process.argv);
