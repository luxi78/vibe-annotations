# Pinvelto internal documentation

Next.js 15 App Router with MDX, Tailwind, and locally bundled fonts. It runs locally; no public domain, analytics, deployment, store, or release-feed integration is required.

From the root: pnpm dev:web, pnpm build:web, pnpm --filter pinvelto-docs typecheck. Use Node24/pnpm11. Root / redirects to /docs. src/app/docs contains installation, MCP, Feedback/review, exports, Variants, troubleshooting, local-update, and provenance guides. Navbar/Footer and docs/layout.tsx provide shared navigation; assets use approved Pinvelto Feedback Window branding.

Keep docs commands aligned with ../../README.md and ../server/README.md. Installation must select a maintainer-reviewed Pinvelto ref, build .output/chrome-mv3, and install the local server directory. Do not assume main contains an integration-branch implementation. Public npm/store distribution and automatic upstream updates are outside scope.

For UI changes preserve the existing documentation reading layout and blue brand, inspect actual rendered pages at desktop/mobile widths, and run the extension Playwright internal-docs spec against the local docs server. Source builds alone do not prove usable docs or links. Never fetch upstream releases during build. Use ../../GLOSSARY.md terms, and preserve inherited LICENSE/NOTICE rather than repeat the inherited TERMS MIT inconsistency as active guidance.
