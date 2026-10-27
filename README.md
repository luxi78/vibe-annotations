# Pinvelto

Internal-use visual Feedback for webpages, connected to coding agents through the local Pinvelto MCP service. This independent project derives from Vibe Annotations; inherited attribution and license notices remain intact.

## Install from a reviewed revision

Use Node.js **24** and pnpm **11** (verified with Node 24.13.1 and pnpm 11.24.0), Git, and a Chromium browser. The server alone supports older Node versions; the complete workspace build uses the toolchain above.

The implementation is delivered on the **issue/23 integration branch**, not automatically merged into main. Ask the maintainer for the reviewed Pinvelto commit or ref and substitute it for PINVELTO_REF below. Do not install the default branch without checking that it contains the accepted implementation.

```sh
git clone https://github.com/luxi78/vibe-annotations.git
cd vibe-annotations
git checkout PINVELTO_REF
pnpm install --frozen-lockfile
pnpm --filter pinvelto-extension build
npm install --global ./packages/server
pinvelto --version
pinvelto init --agent codex --non-interactive
pinvelto status
```

The npm command installs **this local directory**, not a registry package. Global local installation links to this checkout, so retain the checkout and its dependencies. On Windows use pinvelto.cmd if PowerShell blocks npm's generated script. If global installation requires elevated permissions, use a writable user prefix (`npm install --global --prefix PATH ./packages/server`) and add that prefix's executable directory to PATH; do not substitute an upstream npm package.

Load **packages/extension/.output/chrome-mv3** in chrome://extensions with Developer mode and **Load unpacked**. This is the production output. Do not load .output-e2e: it belongs to isolated browser tests. Pin the extension action, open a local webpage, and create Feedback with its pencil control.

The default service endpoint is **http://127.0.0.1:3847/mcp**. Init starts the service and adds a new pinvelto MCP configuration entry; restart or reconnect your coding agent afterward. Other agent entries and upstream data are left untouched. Choose another supported agent through `pinvelto init --help`. No legacy migration, cleanup, or compatibility aliases are provided.

## Use Feedback

Create a comment or design preview, attach an image, and ask your agent to read it with `pinvelto_list_feedback` or `pinvelto_get_project_context`. The extension shows the result of MCP actions. Use **View all** to review the selected site, switch **All / This page**, export, or delete Feedback. Its toolbar count covers all sites; global deletion removes Feedback metadata and attachments, never generated project code.

[Workflows](packages/website/src/app/docs/workflows/page.mdx), [screenshots](packages/website/src/app/docs/workflows/screenshots/page.mdx), [exports](packages/website/src/app/docs/workflows/sharing/page.mdx), and [Variants](packages/website/src/app/docs/workflows/variants/page.mdx) describe the everyday paths. Service commands and all seven MCP tools are in [the server guide](packages/server/README.md).

## Read documentation locally

```sh
pnpm dev:web
```

Open http://localhost:3000/docs. Documentation is bundled in this repository and needs no hosted deployment. Build it with `pnpm build:web`; run `pnpm --filter pinvelto-docs start` to serve that production build. Built-in extension help links to this repository and provides setup guidance without requiring the documentation server.

## Deliberate local updates

Finish or save current work, record `git rev-parse HEAD`, and obtain the maintainer's next reviewed PINVELTO_REF. Back up **your Pinvelto state** before an update if needed; do not alter another product's state or entries.

```sh
pinvelto stop
git fetch origin
git checkout PINVELTO_REF
pnpm install --frozen-lockfile
pnpm --filter pinvelto-extension build
npm install --global ./packages/server
pinvelto start --daemon
pinvelto status
pinvelto --version
```

Reload the unpacked extension in chrome://extensions, reload target pages, then reconnect the agent. Check Feedback and images before resuming. A local linked install follows the checkout, so stop the service before changing revisions. To revert, stop Pinvelto and repeat these steps with the previously recorded revision and its matching extension. Do not import upstream data. No automatic npm/version polling or upgrade prompts are used. Local version labels identify the installed package; record the Git commit to distinguish builds with equal versions.

## Troubleshooting and verification

- Offline: check `pinvelto status`, then `pinvelto start --daemon`; verify the endpoint and reconnect your agent. Use `pinvelto logs --lines 50` for diagnostics.
- Occupied endpoint or ownership error: Pinvelto refuses to manage the other service. Inspect its owner; choose a free service port with PINVELTO_PORT for isolated automation. The production extension expects 3847. Do not stop unrelated services.
- Missing overlay: reload the extension and page, use its action to enable the site, and check permissions. Screenshots need granted capture access. Source tests cannot establish browser permission state.
- Missing shared images: HTML embeds available server images; JSON/Markdown refer to local images and do not transport attachment bytes. Keep the original files or reattach images after import.

```sh
pnpm test:extension
pnpm --filter pinvelto-server test
pnpm test:extension:e2e
pnpm build:web
pnpm --filter pinvelto-docs typecheck
node --test tests/upstream-guard.test.mjs
```

Browser tests use temporary profiles, service homes, and a controlled test endpoint. See [E2E evidence and harness](docs/e2e-testing.md); never point test fixtures at a maintainer's active service or agent configuration.

## Maintenance and provenance

Project [issues](https://github.com/luxi78/vibe-annotations/issues) and [contributions](CONTRIBUTING.md) target this repository. Configure the [upstream read safeguard](docs/upstream-maintenance.md) in each clone. Upstream adoption needs a traceable assessment and maintainer confirmation. Repository renaming and directory relocation remain separate operations after implementation acceptance.

All workspace packages are private and publishing is disabled. Preserve [LICENSE](LICENSE), [NOTICE](NOTICE), and [server LICENSE](packages/server/LICENSE). [Inherited terms](TERMS.md) are retained as provenance and contain an older inconsistent MIT statement; current license guidance points to LICENSE and NOTICE, without asserting legal clearance from rebranding or internal use.
