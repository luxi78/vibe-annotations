import { spawnSync } from 'node:child_process';
import { writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const controlledUrl = 'http://127.0.0.1:3005';
const build = spawnSync(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/wxt/bin/wxt.mjs', import.meta.url)),
    'build'
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_PINVELTO_SERVICE_URL: controlledUrl,
      PINVELTO_E2E_BUILD: '1'
    }
  }
);
if (build.status !== 0) process.exit(build.status || 1);
writeFileSync(
  new URL('../.output-e2e/chrome-mv3/.pinvelto-e2e', import.meta.url),
  controlledUrl
);
// An extension-origin client exercises the public runtime protocol without adding a production page.
writeFileSync(new URL('../.output-e2e/chrome-mv3/acceptance.html', import.meta.url),
  '<!doctype html><html><title>Pinvelto runtime acceptance client</title></html>');
const specs = process.argv.slice(2);
const result = spawnSync(
  process.execPath,
  [
    fileURLToPath(
      new URL('../node_modules/@playwright/test/cli.js', import.meta.url)
    ),
    'test',
    ...(specs.length
      ? specs
      : readdirSync(new URL('./e2e/', import.meta.url))
          .filter(
            (name) =>
              name.endsWith('.spec.js') && name !== 'keyboard-baseline.spec.js'
          )
          .map((name) => `tests/e2e/${name}`))
  ],
  { cwd: root, stdio: 'inherit' }
);
process.exit(result.status ?? 1);
