# Pinvelto local service

Pinvelto is an internal-use visual Feedback product derived from Vibe Annotations. This package provides its local HTTP API, MCP interface, and `pinvelto` command. Install only this repository's artifact; no public registry package is needed for Pinvelto itself.

## Local installation

From the repository root with Node.js 18+ and pnpm installed:

```sh
pnpm install --frozen-lockfile
npm install --global ./packages/server
pinvelto --version
pinvelto init --agent codex --non-interactive
pinvelto status
```

The global installation source is the local `packages/server` directory. The only installed executable is `pinvelto`. Alternatively, run `node packages/server/bin/cli.js` in place of `pinvelto`, which is useful in a temporary test environment or when avoiding global installation.

`init` starts the installed local service and creates a new `pinvelto` entry for the selected agent. Other entries, including upstream entries, remain intact. Existing conflicting Pinvelto entries are preserved in non-interactive mode. For project-scoped setup use `--project` with an agent that supports it. `--skip-server` configures without starting; `--skip-extension` suppresses unpacked-extension guidance. The wizard does not download packages or open a browser store.

Build the repository extension separately and load its unpacked output; see [the extension instructions](../extension/README.md). Do not install an upstream extension to connect to Pinvelto.

## Endpoint and local state

The default MCP URL is `http://127.0.0.1:3847/mcp`; SSE clients may use `/sse`. `/health` reports `product: "pinvelto"`, the installed package version, PID, and launch identity. The extension's Feedback transport remains `/api/annotations`.

New state lives in `~/.pinvelto/`: Feedback in `annotations.json`, images in `attachments/`, and port-specific service records/logs. No upstream state is read or migrated. Existing installations, agent entries, and `~/.vibe-annotations` remain untouched.

For isolated automation, set `PINVELTO_HOME` to a temporary home directory and `PINVELTO_PORT` to a free port. `pinvelto --port 43847 ...` overrides the service port for that command; use the same port for setup and lifecycle commands. The default extension uses port 3847. `PINVELTO_HOME` scopes both service state and wizard agent configuration; it does not change your actual home. Never point an acceptance fixture at a user's active service/configuration.

```sh
pinvelto start --daemon
pinvelto status
pinvelto logs --lines 50
pinvelto restart
pinvelto stop
```

Without `--daemon`, `start` runs in the foreground. Lifecycle operations require both the matching Pinvelto response and the port-specific launch record. Shutdown is an authenticated request to that exact instance; a stale PID never authorizes signaling a process. An occupied endpoint or an unowned Pinvelto service produces an error and remains running. Inspect the reported endpoint and choose a free port or stop its owning application deliberately.

## MCP capabilities

Only these tools are registered:

- `pinvelto_list_feedback`
- `pinvelto_get_project_context`
- `pinvelto_get_screenshot`
- `pinvelto_watch_feedback`
- `pinvelto_delete_feedback`
- `pinvelto_delete_project_feedback`
- `pinvelto_update_feedback`

List/read returns Feedback plus project guidance and existing local attachment paths. Filter by the intended project URL. Screenshot retrieval and watch preserve their existing capabilities. `pinvelto_update_feedback` handles Variants lifecycle transitions rather than acting as a general Feedback editor. Ordinary completed Feedback is deleted through the delete tools; Variants must follow their generation/selection/finalization workflow.

The confirmed global deletion endpoint `POST /api/annotations/purge` accepts `{ "ids": ["confirmed-id"], "confirm": true }`. It removes only confirmed Feedback and attachments, preserves concurrent additions, and never edits generated project code.

## Deliberate updates and tests

Stop Pinvelto, check out the intended project revision, run `pnpm install --frozen-lockfile`, repeat the local installation command, rebuild/reload the extension, then run `pinvelto start --daemon` and inspect `pinvelto status`. Agent HTTP URLs remain stable. Updates are deliberate; the service does not poll public package versions or display registry upgrade prompts.

```sh
pnpm --filter pinvelto-server test
```

Tests spawn actual CLI/service processes, exchange HTTP and MCP requests, persist Feedback, and use temporary homes and ephemeral ports. They verify foreign-service rejection, stale PID isolation, configuration preservation, independent state, persistence, and shutdown.

## Provenance and license

Inherited authorship and notices remain in [LICENSE](LICENSE), the repository [LICENSE](../../LICENSE), and [NOTICE](../../NOTICE). The inherited code is under PolyForm Shield 1.0.0 as recorded in those files; independent branding and internal use do not relicense it or establish legal clearance. Project issues: [luxi78/vibe-annotations](https://github.com/luxi78/vibe-annotations/issues).
