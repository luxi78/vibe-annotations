# Local development commands

Build the extension: `pnpm --filter pinvelto-extension build`. Load `packages/extension/.output/chrome-mv3`.

Run the local HTTP/MCP service in the foreground: `pnpm --filter pinvelto-server start`; watch source changes with `pnpm --filter pinvelto-server dev`.

For managed daemon startup, installation, and deliberate updates use [README.md](README.md).
