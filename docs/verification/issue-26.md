# Issue #26 verification

Implements [#26](https://github.com/luxi78/vibe-annotations/issues/26) against the
approved browser/service/MCP and generated-project seams in specification #23.
The worktree began from integration commit `4999060` on `issue/26`.

## Delivered behavior

Pinvelto's downloaded JSON, page API export, and runtime JSON/MCP exports share
one fresh format: `product: "pinvelto"`, `pinvelto_feedback_export: true`,
`version: "1.0"`, `feedback`, source/scope metadata, and
`attachments: "references-only"`. Import requires this identity and version;
upstream envelopes and the intermediate mechanical rename are not aliases.
The normal import confirmation, deduplication, origin remapping, and server
synchronization remain in place. Export filenames use `pinvelto-feedback-`.
Runtime exports use `pinvelto:exportFeedback`; the old action is rejected.
CSV includes a Product column identifying Pinvelto.

Markdown and Copy all still render offline. They describe references honestly,
name `pinvelto_list_feedback` / `pinvelto_get_screenshot`, and direct Variants
work to the returned `variant_instructions`. They do not fabricate local paths
from extension metadata: the actual service can use an isolated home and its
data directory is `.pinvelto`, not the mechanically renamed old path.
HTML exports embed only existing local image bytes and now identify Pinvelto
Feedback in their title, heading, count, and blue accent.

Generated Variants instructions now use `.pinvelto-var-…`, `.pinvelto-variant`,
`data-pinvelto-active`, and `pinvelto:scaffold ID`. Both explicit requests and
ordinary comment intent preserve generation, preview, selection, finalization,
and discard semantics. Cleanup instructions target the current Feedback's
scaffold and leave other generated artifacts and upstream markers untouched.

## Test-first evidence

Observed failures before the corresponding implementation:

1. Actual MCP generation responses carried upstream `vibe-annotations:scaffold`
   and `data-vibe-active`; both explicit and comment-intent browser cases failed
   the new independently identified contract.
2. An actual downloaded JSON export had no `product: "pinvelto"` field; the
   public export/reimport test failed before the canonical envelope was added.
3. `window.__pinvelto.exportFeedback()` still returned a different mechanical
   envelope; the real page API check failed before sharing the same formatter.
4. A real extension-origin client received `success:false` for
   `pinvelto:exportFeedback`; changing the runtime handler made JSON, MCP, and
   CSV requests succeed while rejecting the old unprefixed action.

The page API deletion was suspected during exploration but the public test
proved it already worked. Its implementation was not changed; the new test
retains export → page API delete → UI reimport → real MCP restoration proof.

## Real workflow evidence

`pinvelto-exports.spec.js` runs a fresh actual extension and isolated service.
The editor attaches a real PNG, saves Feedback, and exports JSON/Markdown/HTML
through visible controls. The downloaded HTML opens and decodes its embedded
image. Reimport of existing IDs deduplicates; ordinary UI deletion removes the
record and image bytes. Reimport restores its metadata, MCP omits unavailable
attachment paths, HTML omits unavailable images, and the editor visibly marks
the reference missing. An upstream envelope is rejected without adding records.
The actual extension-origin runtime client additionally checks all three
background export formats. This client exists only in `.output-e2e`.

`pinvelto-variants.spec.js` uses the same real-service fixture. A deterministic
coding-agent fixture writes actual HTML/CSS into a temporary project served over
HTTP; MCP supplies instructions and lifecycle updates, not filesystem edits.

- Explicit Variants creation → MCP instructions → real generated source →
  extension preview of option 2 → Choose → MCP chosen status and cleanup
  contract → final chosen project source → resolved Feedback. Reload proves
  the chosen content persists, with no scaffold/pin/unresolved count.
- Ordinary Comment intent → MCP promotion contract → generated source →
  preview option 2 → Discard → original preview restored and discarded cleanup
  contract → original project source restored → resolved Feedback. Reload
  proves original content remains, without a pin or unresolved count.
- Global deletion confirms the snapshot, removes scaffolded metadata through
  the real browser/service/MCP boundary, and leaves generated project source
  byte-identical. This deliberately differs from Variants discard/agent cleanup.
- Every lifecycle leaves a separate upstream-marked project file byte-identical.
  Generated and final source plus terminal MCP records are attached to the
  Playwright results. Temporary project files, profiles, ports, and homes are
  owned by the fixture and cleaned up after each test.

## Verification results — 2026-10-27

- Extension unit regressions: **200 passed**.
- Server Node tests, including real CLI/HTTP/MCP isolation: **18 passed**.
- Relevant browser suite: **19 passed**, covering the four new acceptance cases
  and existing Design/Variants keyboard controls, review continuity, counts,
  scoped/global deletion, and screenshots/attachments.
- The final four acceptance cases were rerun after adding public runtime/page
  API export coverage, missing-reference UI checks, and final counter waits.
- Production extension build passed separately from the isolated E2E build.
- `git diff --check` passed.

Reproduce from `packages/extension` with:

```text
node tests/run-e2e.js tests/e2e/pinvelto-exports.spec.js tests/e2e/pinvelto-variants.spec.js tests/e2e/a14-controls-keyboard.spec.js tests/e2e/toolbar-count-screenshot.spec.js
```

## Visual evidence

The final captures were opened and inspected. Preview displays the alternative;
selection identifies the pending finalization state; final chosen and restored
pages have no unresolved counter; portable HTML displays the embedded image and
Feedback terminology. Global deletion preserves the generated page.

- [Actual alternative preview](issue-26-preview.png)
- [Chosen, awaiting agent finalization](issue-26-chosen.png)
- [Final chosen project](issue-26-final.png)
- [Discarded project restored](issue-26-restored.png)
- [Global deletion preserves generated source](issue-26-global-delete.png)
- [Self-contained exported HTML](issue-26-html.png)
- [Missing imported attachment](issue-26-missing-reference.png)
- [Upstream import rejected](issue-26-legacy-rejected.png)

No remaining #26 acceptance gap is known. Internal installation, website content,
and documentation help conversion remain #28's separate slice. This verification
does not claim legacy compatibility or autonomous AI code generation.
