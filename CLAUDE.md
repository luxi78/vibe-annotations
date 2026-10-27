# Pinvelto monorepo

Internal-use webpage Feedback connected to coding agents through the local Pinvelto MCP service. Use Node 24 and pnpm 11 for this workspace (verified 24.13.1 / 11.24.0).

## Packages and commands

- packages/extension: pinvelto-extension, WXT Chromium MV3 build. Production output is .output/chrome-mv3; source is not loadable.
- packages/server: pinvelto-server, local pinvelto executable and HTTP/MCP service on port 3847.
- packages/website: pinvelto-docs, Next.js internal documentation served locally; no hosted deployment required.

Run pnpm install --frozen-lockfile at the root. Build extension with pnpm --filter pinvelto-extension build; test with pnpm test:extension and pnpm test:extension:e2e. Run service tests with pnpm --filter pinvelto-server test. Run docs with pnpm dev:web, build with pnpm build:web, and check with pnpm --filter pinvelto-docs typecheck.

Read each package's CLAUDE.md where present when working on its architecture. Installation and deliberate updates follow [README.md](README.md): checkout a reviewed Pinvelto ref, install local artifacts, and preserve other products' state. All packages are private; public publishing is disabled.

## Engineering conventions

Write engineering documentation, issue/spec/ticket text, PR text, and commits in English. Preserve literal UI strings and diagnostic quotes when needed. Use 2-space indentation and the surrounding style.

For implementation, read [the tracker workflow](docs/agents/issue-tracker.md): GitHub via gh, issue/<number> branches, test-driven slices, verified commits with closing directives, and issue closure. For triage, read [the label vocabulary](docs/agents/triage-labels.md).

Before domain changes, read [GLOSSARY.md](GLOSSARY.md), relevant ADRs in docs/adr, and [domain guidance](docs/agents/domain.md). For upstream inspection or adoption, follow [upstream maintenance](docs/upstream-maintenance.md); no automatic merges or upstream PRs. Preserve LICENSE, NOTICE, inherited source attribution, and history. Repository renaming/directory relocation remain separate post-acceptance operations.

Browser tests use .output-e2e, temporary profiles/homes, and controlled endpoints. Never use a maintainer's active service or agent configuration for acceptance fixtures. Read [E2E guidance](docs/e2e-testing.md) before browser coverage changes.
