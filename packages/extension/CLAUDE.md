# Pinvelto extension

WXT-built Chromium MV3 extension using vanilla JavaScript modules. Run pnpm install --frozen-lockfile from the root; build with pnpm --filter pinvelto-extension build. Load .output/chrome-mv3, not the source directory. WXT dev uses port 3010.

## Architecture

entrypoints/background.js manages storage, server synchronization, tab injection, capture, and cross-frame sessions. entrypoints/content/index.js boots the overlay and keyboard routing. entrypoints/bridge.content.js supplies the main-world window.__pinvelto API.

lib/background/api-sync.js connects to the product-checked service on 127.0.0.1:3847; lib/service-url.js supplies production and controlled E2E endpoint selection. Extension state keys and page integrations use independent Pinvelto names. No upstream settings/data import is supported.

Overlay UI lives in a shadow root on #pinvelto-feedback-root. lib/content/floating-toolbar.js owns review/settings navigation; toolbar-docs.js owns built-in guides. The settings shell persists across internal navigation to preserve focus and scroll. Keyboard/session routing starts at document_start and uses the tab coordinator; late injection requires reload for full early-listener protection.

Feedback creation/review and design previews are browser behaviors. The local service provides MCP tools; agent source changes remain separate from design previews. Consult ../../GLOSSARY.md before naming domain behavior.

## Verification

~~~sh
pnpm test:unit
pnpm test:e2e
pnpm test:baseline
~~~

The E2E runner builds .output-e2e with a controlled endpoint and marker, then loads it in fresh temporary Chromium profiles. Real-service acceptance spawns its own temporary home and port. Production installation uses .output/chrome-mv3 and port3847. Never point fixtures at an active user service. Read ../../docs/e2e-testing.md for details and ../../docs/verification for delivered evidence.

For service setup and deliberate updates use ../../README.md and ../server/README.md. Only install local repository artifacts. Keep license/attribution notices intact and do not add legacy aliases.
