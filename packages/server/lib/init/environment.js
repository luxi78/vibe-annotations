import { inspectService } from '../lifecycle.js';
import { readFileSync } from 'node:fs';
export async function checkEnvironment() {
  const status = await inspectService();
  const pkg = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  );
  return {
    node: process.versions.node,
    nodeOk: Number(process.versions.node.split('.')[0]) >= 18,
    serverInstalled: { installed: true, version: pkg.version },
    portState: {
      state:
        status.state === 'owned'
          ? 'ours'
          : status.state === 'stopped'
            ? 'free'
            : 'foreign',
      version: status.health?.version
    }
  };
}
