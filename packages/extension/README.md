# Pinvelto extension

Build from the maintainer-reviewed Pinvelto revision with Node 24 and pnpm 11.

~~~sh
pnpm install --frozen-lockfile
pnpm --filter pinvelto-extension build
~~~

Open chrome://extensions, enable Developer mode, and load packages/extension/.output/chrome-mv3 as unpacked. The source directory is not loadable. Do not use .output-e2e for regular installation: its endpoint belongs to isolated acceptance tests.

Connect the locally installed service on port 3847 using [the root instructions](../../README.md). The extension has independent Pinvelto settings and Feedback storage; it does not import upstream data. For deliberate updates stop the local service, check out the next reviewed revision, install dependencies, rebuild, reload the extension and pages, reinstall the local service link, and reconnect the agent.

Run pnpm --filter pinvelto-extension test:unit and pnpm --filter pinvelto-extension test:e2e for regressions. The browser runner builds a separate controlled output and uses temporary profiles/services. See [the E2E guide](../../docs/e2e-testing.md).
