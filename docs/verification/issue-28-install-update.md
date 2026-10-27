# Independent Pinvelto #28 installation and update verification

Verified on Windows with Node **24.13.1** and pnpm **11.24.0**.

- Initial reviewed revision: **45d7dc87b227457dcb14c3e07dfcc94a66abce9f**.
- Final reviewed update revision: **1ace11a87a4ff63aa9278887291761c8ec0c0eac** (includes the `aa42211` content audit and the cold-start fix).
- Fresh local clone and retained raw evidence: `C:/Users/lx/.codex/tmp/pinvelto-issue28-install-da544d88073f41449b10fd0e7ed9d6a4/`.
- The verification clone is clean and detached at the final revision. No repository source was edited by this verifier. The upstream GitHub repository was not changed; the unpublished reviewed commits were cloned/fetched from the local repository.

## Install and local artifact

Read the checked-out README and followed its reviewed-ref installation path, substituting a writable temporary npm prefix and isolated homes/ports as documented for automation:

```text
git clone --no-hardlinks --no-checkout D:/dev/vibe-annotations <fresh>/checkout
git checkout --detach 45d7dc87b227457dcb14c3e07dfcc94a66abce9f
pnpm install --frozen-lockfile
pnpm --filter pinvelto-extension build
npm install --global --prefix <fresh>/prefix <fresh>/checkout/packages/server --offline
pinvelto --version
pinvelto init --agent codex --non-interactive
pinvelto status
pinvelto stop
```

The normal frozen workspace install passed in approximately **39 seconds**: 878 packages, 873 reused and 3 downloaded. Ordinary dependency-registry access was allowed. This was a fresh checkout and fresh node_modules, with the existing pnpm content store and installed toolchain available; it was not an empty-machine/offline dependency-install claim.

The extension production build passed. The offline global install added one package from the local server directory. Only `pinvelto`, `pinvelto.cmd`, and `pinvelto.ps1` shims were installed; no upstream executable aliases. The installed command reports **0.5.1**. Lifecycle checks initially invoked the installed prefix's Node entry; an additional actual `prefix/pinvelto.cmd --version`, `init --agent codex --non-interactive`, `status`, and `stop` sequence also passed on the final revision.

The first initial-revision init attempt failed its approximately four-second readiness budget before the new server produced any log output. This failure is preserved in `first-init-failure.log`, `cli-lifecycle.log`, and the empty first service log. An immediately subsequent direct owned-process startup took approximately 1.9 seconds, and the retry passed. The empty log and timing support a cold-import/readiness-budget explanation but do not independently identify a particular Windows scanner or filesystem cause.

This was treated as an acceptance defect, not hidden by retry. The implementation agent reproduced a public delayed-process Red/Green case and added the bounded **20-second** readiness deadline in `1ace11a`. Independent final checks below verify the fix.

## Actual revision update and persistence

Created Feedback through real HTTP at the initial revision, attached a real PNG, and read it using the real MCP SDK. Then stopped the service and executed the documented deliberate-update sequence against a distinct actual revision:

```text
git fetch origin                 # local source repository
git checkout --detach 1ace11a87a4ff63aa9278887291761c8ec0c0eac
pnpm install --frozen-lockfile
pnpm --filter pinvelto-extension build
npm install --global --prefix <fresh>/prefix <fresh>/checkout/packages/server --offline
pinvelto start --daemon
pinvelto status
pinvelto --version
pinvelto stop
```

**Passed**. The same isolated home retained the original Feedback comment and exact PNG bytes across revision switch/rebuild/local reinstall/restart. The actual MCP server identifies `pinvelto`, exposes exactly the seven expected `pinvelto_` tools, reads the persisted Feedback and usable local attachment path, and rejects `read_annotations`. Existing upstream-like data and the old Codex MCP entry remain byte-for-byte/prefix unchanged; only the new Pinvelto entry is added. Shutdown is confirmed by the endpoint no longer accepting HTTP. All lifecycle service ports were ephemeral (58255 for the failed first attempt, then 53051 for initial install/update, 62764 and 56297 for final fresh/cold checks); neither 3846 nor 3847 was probed.

On the final revision, **fresh-home init/status/MCP/stop passes**. A second independent fresh-home run used an external Node preload delaying only the spawned `/lib/server.js` entry by **5500 ms**, leaving the CLI itself undelayed. The installed CLI still initialized, reported running, completed the real MCP/image/configuration checks, and stopped successfully. The preload and all test helpers live outside the repository. The actual installed Windows shim sequence subsequently passed too.

Raw evidence: `install-lifecycle-retry.log`, `update-lifecycle-result.log`, `final-fresh-lifecycle-result.log`, `final-cold-start-result.log`, `cli-lifecycle.log`, and `mcp-verification.log`.

## Fresh-clone browser workflow

From the same final checkout, ran the unmodified repository harness:

```text
node packages/extension/tests/run-e2e.js tests/e2e/pinvelto-workflow.spec.js
```

**2 passed, 0 failed**, approximately **14.7 seconds**. The actual loaded extension creates Feedback through its editor, attaches a screenshot of the fixture rectangle, proves usable visual context and persisted bytes through the actual local service/MCP, observes exactly seven tools and the server identity, rejects the old alias, and shows the MCP-produced state in View all. The separate real foreign-health test verifies offline behavior and no Feedback mutation sent to that service. Profiles, homes, service ports, data and MCP clients were temporary/owned. The fixture server owns port 3005; it does not reuse a maintainer service.

The production output was built separately and audited: both its worker and content bundle contain the expected default **3847**, with no test default **3005**. The browser acceptance artifact is separately built under `.output-e2e`; it deliberately uses the controlled initial fixture endpoint and then an ephemeral actual service, avoiding any probe of the maintainer's default service. This proves the documented source/build plus isolated workflow; it does not claim to have manually installed the production artifact into the maintainer's normal browser profile.

Raw evidence: `fresh-clone-browser-workflow.log`, the clone's Playwright JSON/trace/screenshot outputs, and its preserved production `.output` alongside `.output-e2e`.

## Runtime network observations

An external preload observed Node `fetch` URLs and attached Chromium request-event observers without rewriting requests, intercepting protocol payloads, or changing repository code.

- `runtime-network.jsonl`: **131** Node fetch events, all to the verifier's ephemeral loopback service ports.
- `browser-runtime-network.jsonl`: **43** Node-fetch/Chromium request events, all HTTP origins loopback (actual service, controlled fixture, or deliberate foreign fixture), plus local data resources.
- **No observed upstream product npm, browser-store, release/version, or hosted-product endpoint** in those runtime observations.
- The global local-server install and all publish dry runs used npm `--offline`. The workspace frozen dependency install was normal network-enabled operation; its complete network traffic was not captured. Source/manifest audit found no active upstream-product package installation, store-opening, or version polling path. This is scoped evidence, not a claim that all browser telemetry/dependency installer traffic was packet-captured. Chromium observers attach after context creation; the harness's controlled compile-time endpoint supplies the startup-isolation guarantee.

## Public publishing prevention

Inspected all four package manifests: names are `pinvelto`, `pinvelto-server`, `pinvelto-extension`, and `pinvelto-docs`; each has `private: true`, no public `publishConfig`, and an explicit rejecting `prepublishOnly` hook. There is no `.github/workflows` directory at the tested final revision, so the old public publishing job is absent.

Executed **only dry runs**, with an isolated npm cache and offline mode, from each package directory:

```text
npm publish --dry-run --offline --cache <fresh>/npm-cache
```

All four exited **1** with the explicit `Pinvelto packages are internal-only; public publishing is disabled` error from the hook. No actual publish command was run and no registry write was attempted. Raw `publish-dry-run-*.log` files are retained.

## Disposition

Independent clean-install/update acceptance passes at **1ace11a**. The initial cold-start failure was fixed and independently reverified. Website/docs visual acceptance and broader branch regression/review remain the other agents' work; this verifier makes no independent claim for those checks. All verifier-owned services and browser contexts have stopped. The clone, local prefix, isolated states, and logs are retained solely as inspectable evidence; none are installed in the user's normal prefix or agent home.
