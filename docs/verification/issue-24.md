# Issue #24 verification

## Scope and confirmed seams

Implements the service/CLI/MCP slice of [#23](https://github.com/luxi78/vibe-annotations/issues/23) through the approved public CLI, real HTTP/MCP protocol, and temporary-filesystem boundaries. No browser-to-MCP completion claim is made here; #25 owns that acceptance fixture. The worktree was created from `issue/23` at `dde2810` and updated to integration commit `3f19a71` before delivery.

## Red → Green evidence

1. `node --test packages/server/tests/pinvelto-cli.test.js`: the executable identity test failed because help introduced `vibe-annotations-server`; after CLI identity changes it passed.
2. The isolated lifecycle/persistence test initially failed with `unknown option '--port'`, before any service could start. After introducing the independent endpoint/configuration and launch ownership lifecycle, start/status/restart/stop and persisted Feedback passed.
3. A real MCP client's complete-tool-list assertion failed with the seven upstream tool names. After replacing registrations, dispatch names, and cross-tool references, it passed; the same protocol test lists persisted Feedback, deletes it, and rejects an old `read_annotations` alias.
4. The local setup preservation test failed because no `pinvelto` configuration entry existed. After independent MCP setup, it passed while the old product's entry and unrelated agent settings remained intact.

These failures were run and inspected before their corresponding implementations. Additional isolation cases verify actual unowned processes, generic/upstream health responses, stale live PIDs, occupied non-HTTP endpoints, and preserved Codex TOML.

## Final automated checks

`node --test packages/server/tests/*.test.js`: **18 passed, 0 failed**, including the existing confirmed-global-purge suite. All new lifecycle/MCP fixtures use temporary homes, explicit ephemeral ports, actual processes, real HTTP exchanges, and the MCP SDK client. Dedicated-home setup skips installed agent CLIs and confines agent paths, including VS Code's Windows application-data location, to the temporary root.

The service defaults to port **3847**, uses `~/.pinvelto`, and supports `PINVELTO_HOME` / `PINVELTO_PORT` isolation. Health identifies the product, PID, and launch instance. CLI stop requires the corresponding launch record and secret and asks the responding instance to shut itself down; it never sends an OS signal based on a persisted PID. Only a newly spawned child may be terminated after its own startup fails.

The runtime npm update poller was removed. Package metadata is private, the executable map contains only `pinvelto`, and public publishing configuration was removed. Inherited author/license fields and license files remain intact.

## Local installation smoke

Executed `npm install --global --prefix <new temporary directory> ./packages/server --offline --ignore-scripts` using the local repository artifact. npm reported **added 1 package**. The prefix contained `pinvelto`, `pinvelto.cmd`, and `pinvelto.ps1`, with no old executable aliases. Running the installed `pinvelto.cmd --version` returned **0.5.1**. No registry access was possible in this smoke because npm was offline; the existing repository dependencies were already available locally.

The broader clean-clone dependency-install/update and browser acceptance workflows belong to #25/#28. This slice changes neither a maintainer's running service nor actual agent configurations.

## Handoff

HTTP Feedback payloads retain the existing `/api/annotations` shape for extension integration. The complete new MCP tools are documented in `packages/server/README.md`. Export HTML/filenames, generated Variants markers, and their observable workflows remain for #26; the service already refers to the new tools in generated instructions. The default endpoint and product check must be used by #25. Repository/directory renaming remains deferred.
