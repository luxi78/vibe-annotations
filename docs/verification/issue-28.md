# Issue #28 verification

## Delivered boundaries

The implementation follows the approved browser/service, installation, and
documentation seams in #23. Development started at integration commit `1920b98`.
The installation instructions require a maintainer-reviewed Pinvelto ref: this
delivery remains on `issue/23` until separately accepted and merged into main.

All workspace packages use Pinvelto identities and are private. Each has a
failing `prepublishOnly` guard; the public npm publishing workflow is removed.
The server is installed from the local checkout and links to that checkout.
The production extension is built into `.output/chrome-mv3`; `.output-e2e`
remains dedicated to the controlled browser acceptance fixture.

The existing website now serves internal installation, MCP, Feedback/review,
design, attachment, export/import, Variants, troubleshooting, update, and
provenance documentation. Marketing routes/assets, store/review promotion,
user-count claims, analytics, invented hosted canonical URLs, and the upstream
release fetch are removed. Help links target this project's reviewed branch
resources; local package versions remain visible without remote polling.

## Red → Green evidence

1. A real browser navigation test failed because the old landing page did not
   contain the Pinvelto documentation heading. After conversion it passed through
   installation, MCP, review, and deliberate-update navigation, checking rendered
   commands, useful links, HTTP results, and runtime requests.
2. The real loaded extension's help test failed because it linked a nonexistent
   release tag instead of the installation/update guide. New local-artifact
   guidance and project-owned links made it pass while retaining the existing
   settings shell, focus, back-navigation, and scroll behavior.
3. Visual inspection found MDX copy controls attached to the page's top rather
   than their code blocks. A rendered bounding-box assertion failed with copy
   Y=8 versus code block Y≈481. Including `mdx-components.tsx` in Tailwind's
   content scan and keeping copy controls visible made it pass at actual sizes.
4. Independent fresh installation exposed the existing four-second service
   startup budget. A real CLI/init fixture uses Node's standard `NODE_OPTIONS`
   preload to delay only its spawned service by 5.5 seconds. The original loop
   failed after 4.65 seconds. A bounded 20-second wall-clock deadline passed
   init/HTTP health/status/stop in about seven seconds. No fake service, protocol
   mock, production test hook, or change to process ownership was introduced.

## Automated and visual results

- Extension behavioral units: **200 passed**.
- Server public CLI/HTTP/MCP and persistence tests: **19 passed**, including the
  slow-start case and existing foreign-service/stale-record isolation checks.
- Upstream Git boundary tests: **4 passed**.
- Relevant combined browser run: **12 passed**, covering production docs,
  built-in help/settings navigation, real browser-to-MCP Feedback, foreign-service
  rejection, new exports/import, and chosen/discarded/global-delete Variants.
- After the copy-control fix: docs/help/settings **6 passed**. The final help
  wording correction was rerun separately: **1 passed**. After moving routine
  artifacts to Playwright's output directory, docs/help **2 passed**; selected
  delivery captures are committed once and routine tests do not rewrite them.
- Production extension build, documentation production build, and documentation
  typecheck passed. The documentation build produces 24 static routes; it no
  longer fetches an upstream release feed.
- `npm publish --dry-run --offline` in the root and all three packages rejected
  publication at the explicit internal-only guard. No publication was attempted.
- Impeccable's mechanical detector returned an empty finding list for the changed
  shared documentation UI.

The desktop overview, full installation page, 390-pixel mobile page, and actual
loaded extension help were inspected. The approved blue Feedback Window brand,
local version, reading hierarchy, and working navigation remain visible. Mobile
has no horizontal document overflow; code samples scroll within their blocks.
Copy controls now stay within their corresponding code block. Screenshots:

- [Desktop documentation](issue-28-docs-desktop.png)
- [Installation](issue-28-installation.png)
- [Mobile documentation](issue-28-docs-mobile.png)
- [Loaded extension help](issue-28-extension-help.png)

The tracked [browser request record](issue-28-docs-network.json) contains 31
requests, all to the isolated loopback documentation origin. It includes actual
navigation/assets, not a source grep. Internal navigation links returned HTTP
200; the removed marketing benchmark route returned 404. This is evidence for
the exercised documentation path, not a blanket claim about all network access.

## Installation/update evidence

An independent verifier cloned actual local commit `45d7dc8` into a fresh
checkout, followed the documented install/build/local-prefix setup, then
deliberately updated to distinct reviewed commit `1ace11a` using the documented
stop/fetch/checkout/frozen-install/build/local-reinstall/start procedure.
Persisted Feedback, exact PNG bytes, existing upstream-like data, and old MCP
configuration survived unchanged. Real MCP reported the correct identity and
seven tools; the installed Windows shim and fresh-home initialization passed.
The cold-start fix was independently rechecked with a delayed actual service.

The same clean checkout's unmodified browser acceptance fixture passed **2/2**
tests, exercising editor-created visual Feedback, actual MCP/HTTP/image exchange,
visible state changes, and foreign-service rejection. Production output was
built separately with default 3847; controlled acceptance used `.output-e2e`,
owned temporary homes/profiles and ephemeral services. No maintainer default
service or normal browser profile was probed or modified.

The verifier observed **131** Node fetch events and **43** combined browser/Node
events, all HTTP origins loopback, with local data resources. No observed runtime
request reached an upstream product package, store, release/version, or hosted
product endpoint. The local server installation and publish dry runs were
offline. Normal workspace dependency installation was network-enabled and used
an existing content store; it was not an empty-machine or packet-capture claim.
The [full independent report](issue-28-install-update.md) records exact commands,
revisions, raw evidence location, first failure, correction, and scoped limits.

An offline dependency attempt initially lacked pnpm metadata; normal
frozen-lockfile installation succeeded. Dependency-registry access is allowed;
no dependency upgrades or substitute upstream product installation were used.

## Old-name and provenance audit

Remaining matches were inspected by context rather than replaced indiscriminately:

- `luxi78/vibe-annotations` and the current directory name remain the actual
  project identity for repository URLs/paths until the separately deferred rename.
- Root/server licenses, NOTICE, inherited authorship, upstream read-source policy,
  and historical design/verification evidence retain accurate provenance.
- Inherited `TERMS.md` is retained with an explicit historical-provenance preface.
  Its old MIT claim is not active Pinvelto legal/install guidance. The website
  points to the actual LICENSE/NOTICE and describes the inconsistency.
- The archived, unused `orchestrator.js.pre-wxt` is historical source, not a loaded
  extension entrypoint. Test-only old names model foreign installations and
  rejected legacy inputs. Old product storage is mentioned only to explain
  preservation or test isolation, never imported by initialization.
- Neutral `/api/annotations`, `annotation_id`, and JSON field names retain their
  transport meaning. Exposed tools and live prose use Pinvelto Feedback; no old
  command/tool alias is registered.
- WXT's transitive `publish-browser-extension` dependency is tooling provenance,
  not a configured public publishing workflow.

The root LICENSE and server LICENSE both remain blob
`d5c8f1d22db321f3afb1e0f6aeef9df3d2211173`; NOTICE remains
`6465dfc824a6a128264769bbad53e4a41dfac0e2`, identical to main before this delivery.
Git history is preserved. Internal use/rebranding is not asserted to establish
legal clearance.

## Limits and deferred operations

No public distribution, hosted deployment, repository rename, directory move,
upstream adoption, legacy migration, or deletion of another installation's data
is included. Normal installation requires the documented Node24/pnpm11 toolchain,
retaining the linked checkout, and a reviewed ref. The internal documentation
can run locally; the browser-to-MCP workflow does not require it to be hosted.
