# Extension E2E Test Harness & Keyboard Conflict Baselines

This document covers the Playwright E2E test harness for the Vibe Annotations Chrome extension, environment requirements, browser/headless configuration, failure artifact inspection, baseline conflict documentation against extension build `2.0.2`, the automated IME composition coverage for A7, the A12/A13 session-recovery and focus-restoration coverage for ticket #10, and the A16 injection-path coverage (static, dynamic, late) for ticket #11.

---

## 1. Prerequisites and Installation

### One-time Dependency & Browser Setup

1. **Install workspace dependencies**:
   ```bash
   pnpm install
   ```

2. **Install Playwright Chromium browser**:
   ```bash
   pnpm --filter vibe-annotations-extension exec playwright install chromium
   ```

---

## 2. Running E2E Tests

The E2E suite automatically builds the Chrome MV3 extension artifact (`wxt build`) into `packages/extension/.output/chrome-mv3`, starts a local fixture server on `http://127.0.0.1:3005`, launches an isolated Chromium browser profile with the extension loaded, executes assertions, and cleanly tears down temporary resources.

### Standard Commands

From repository root:
```bash
# Run full extension E2E suite
pnpm test:extension:e2e

# Run extension unit tests (existing Node test runner)
pnpm test:extension
```

From `packages/extension/`:
```bash
# Run full E2E suite (builds extension + runs Playwright)
pnpm test:e2e

# Run only keyboard conflict baseline scenarios
pnpm test:baseline

# Run E2E with a visible browser window (all tests)
VIBE_E2E_HEADED=1 pnpm test:e2e            # bash / Git Bash
$env:VIBE_E2E_HEADED=1; pnpm test:e2e      # PowerShell

# Run existing Node unit tests
pnpm test:unit
```

By default the suite runs in Chromium's **new headless mode** (no windows pop up). `VIBE_E2E_HEADED=1` switches every test to a visible window, which is only needed to watch a run or to use OS-level window focus manually.

---

## 3. Supported Environments & Browser Mode

### Extension Architecture in Playwright
Extensions cannot be loaded into the classic headless shell (`--headless`), which Playwright uses by default for `headless: true`. The harness therefore launches the **full Chromium build** (`channel: 'chromium'`) in **new headless mode**, which supports Manifest V3 extensions:
1. Extension-capable Chromium launched via `chromium.launchPersistentContext(userDataDir, ...)`.
2. Chromium arguments: `--disable-extensions-except=<path>`, `--load-extension=<path>`, `--no-sandbox`.
3. Either new headless mode (default) or a real display (headed / `xvfb`).

### Operating Systems
- **Windows / macOS / Linux**: Supported in new headless mode; `VIBE_E2E_HEADED=1` (Linux: X11 or `xvfb`) shows the window.

### CI Display Setup (Linux / GitHub Actions)

New headless mode needs no display server; the `xvfb-run` wrapper is only required for headed runs:

```yaml
- name: Install Playwright Browsers
  run: pnpm --filter vibe-annotations-extension exec playwright install --with-deps chromium

- name: Run Extension E2E Tests
  run: pnpm test:extension:e2e
```

---

## 4. Failure Inspection & Artifact Retention

Playwright is configured (`packages/extension/playwright.config.js`) to retain diagnostic artifacts on test failures:

- **Traces**: Saved to `packages/extension/test-results/<test-folder>/trace.zip`.
  Inspect with:
  ```bash
  pnpm --filter vibe-annotations-extension exec playwright show-trace test-results/<test-folder>/trace.zip
  ```
- **Screenshots**: Saved to `test-results/<test-folder>/test-failed-1.png`.
- **Error Context & Logs**: Saved in `test-results/<test-folder>/error-context.md`.
- **Fixture Event Journal**: Host fixture records all DOM and window event phases (`window-capture`, `document-capture`, `target-capture`, `document-bubble`, `window-bubble`, `window-property`) in `window.__EVENT_LOG` and observable state in `window.__FIXTURE_STATE`.
- **Editor IME Journal**: The A7 spec additionally instruments the extension's editor textarea (`fixtures.js` → `instrumentEditor`) and records its composition/`beforeinput`/`input` events in `window.__IME_LOG`.

---

## 5. Controlled Fixture Design (`tests/fixtures/selected-rectangle.html`)

The test harness uses a host fixture that models real-world canvas and diagram applications (e.g. Figma, Excalidraw, configuration editors):
- **Observable Selection**: `#canvas-rect` has `data-selected="true/false"` and class `.selected`. `window.__FIXTURE_STATE.selected` reflects the logical selection state.
- **Cancellation & Deletion Counters**:
  - `cancelCount`: Incremented on `Escape` keydown when rectangle is selected (causes deselection).
  - `deleteCount`: Incremented on `Backspace` or `Delete` keydown when rectangle is selected (causes element deletion).
- **Earliest Page-Script Listeners**:
  Registered in `<head><script>` before DOM parsing to verify capture-phase interception:
  - Window capture listeners: `window.addEventListener('keydown', ..., true)`
  - Document capture listeners: `document.addEventListener('keydown', ..., true)`
  - Document bubble listeners: `document.addEventListener('keydown', ..., false)`
  - Window property listeners: `window.onkeydown = ...`
- **Later Registrations & Prevention Options**:
  URL parameter `?preventBackspace=true` enables early window capture `e.preventDefault()` on Backspace to test native editing protection against aggressive host listeners.
- **Editable Content**:
  `#host-input` provides an ordinary input to prove typing does not trigger canvas commands.

---

## 6. Keyboard Conflict Baselines (Extension v2.0.2)

The baseline suite (`tests/e2e/keyboard-baseline.spec.js`) establishes reproducible baselines against extension build **2.0.2**.

In accordance with ticket criteria, baselines are executed against the production extension build and driven through real user entry points and browser keyboard input (`down`, `repeat`, `up`).

### How to Run Baselines While Implementation is Pending
Run the dedicated baseline command:
```bash
pnpm --filter vibe-annotations-extension test:baseline
```
Because implementation tickets #6 and #7 are pending, the conflict tests assert the target regression behavior and fail on the existing bugs, generating inspectable traces, screenshots, and event logs in `test-results/`.

### Conflict Summary on v2.0.2

| ID | Scenario | Result on v2.0.2 | Cause / Current Implementation State | Resolving Ticket |
| :--- | :--- | :--- | :--- | :--- |
| **A1 (Canvas Focus)** | Esc in selection mode (canvas focused) | **FAILS (leaks to host)** | When canvas/host has focus, pressing Esc leaks to host document listeners. Host `cancelCount` increments to 1 and the selected rectangle is deselected. | **#6** |
| **A1 (Toolbar Focus)** | Esc in selection mode (toolbar button focused) | **FAILS (trapped)** | When focus remains on the toolbar button inside Shadow DOM, `shadow-host.js` stops propagation, preventing Esc from reaching document listeners; Annotate mode fails to exit. | **#6** |
| **A2** | Consecutive Esc sequence after exit | **FAILS (already deselected)** | Because A1 leaked Esc, the rectangle was already deselected before A2 could deselect it. | **#6** |
| **A3 (Bubble)** | Backspace in popover textarea with host bubble listener | **PASSES** | `shadow-host.js` stops bubble-phase propagation at the Shadow DOM boundary (`hostEl.addEventListener(..., stopPropagation)`), so bubble listeners do not delete the element. | *Working* |
| **A3 (Capture)** | Backspace in popover textarea with host early window capture | **FAILS (intercepted)** | Host early window capture listener receives Backspace before event reaches Shadow DOM. When host calls `preventDefault()`, native textarea deletion is blocked ("abc" remains "abc"). | **#7** |
| **Early Capture** | Window capture receives keystrokes during Annotate | **FAILS (leaks to host)** | Host early window capture listeners receive `ArrowDown` and other navigation keys during Annotate mode because extension does not intercept window capture early. | **#6 & #7** |

When subsequent implementation tickets are completed (e.g. #6, #7), these baseline tests will pass without modification, serving as regression assertions.

---

## 7. A7 IME Composition Coverage (Ticket #9)

Spec file: `packages/extension/tests/e2e/ime-composition.spec.js` (part of the standard `pnpm test:extension:e2e` command).

### 7.1 What is automated

Composition is driven through the browser's own input protocol via CDP (`Input.imeSetComposition`, `Input.insertText`), which performs real composition insertion in the renderer. The tests assert visible editor text, composition/input event records, host counters and host event logs:

| Test | Asserted behavior |
| :--- | :--- |
| Composition text stays native and commits | The uncommitted composition string appears in the editor; `compositionstart`/`compositionupdate` and `beforeinput`/`input` with `inputType: 'insertCompositionText'` are trusted native events; the browser-protocol commit ends the composition once, keeps the committed text, and native editing continues afterwards; host receives zero keyboard events. |
| Enter/Esc during composition | Candidate confirmation (Enter, including a held down/repeat/up sequence) and cancellation (Escape) while a composition is active do not save, close the editor, or exit Annotate; focus stays in the editor; the composition stays active (`compositionend` count 0, text unchanged) and further composition updates still flow through the editor afterwards; the host receives zero keyboard events and host commands/counters do not run. After the browser-protocol commit, Esc closes the editor, the next Esc exits Annotate, and a fresh Esc reaches the host again (A1/A2 contract). |
| Aborted composition and save | An empty candidate string ends the composition without committing text; the editor stays open; afterwards the save shortcut saves exactly once (one annotation, one badge, still in selection mode) with zero host leakage. |
| Standalone badge editor | The same composition protection holds for the editor opened from a badge in IDLE: Enter/Esc during composition do not dismiss it, committing keeps the composed text, Esc closes it without entering Annotate mode, and the host is reachable again afterwards. |

Implemented contract (production `lib/content/keyboard-router.js`): while a composition is active in an extension editor, unmodified keys (candidate confirm/cancel/navigate) are isolated from the host, run no session command, and their default action is consumed so they cannot alter the editor text. Explicit modifier commands (save shortcut, mode toggle hotkey) still run. Ownership ends on `compositionend` or window blur, after which normal commands resume.

Consuming the default action is deliberate and load-bearing: the automated path delivers candidate keys as regular DOM key events whose only default action would be a stray text edit (Enter inserts a newline), whereas with a real IME the candidate window consumes those keys before the page sees them and the composition is driven by the IME, not by the key event. Leaving the default intact makes the editor text diverge from the real-IME outcome (`にほん\n` instead of `にほん`).

### 7.2 Coverage boundary versus a real operating-system candidate window

- With a real OS IME, candidate confirm/cancel keystrokes are normally consumed by the IME before the page ever sees them, so the browser never dispatches a DOM key event for them. The automated path cannot reproduce that: Chromium delivers the `Enter`/`Escape` we send as regular trusted DOM key events that carry `isComposing: true` while the composition is active. The tests therefore prove the extension's handling of composition-tagged key events, not the OS-level candidate-window interaction.
- The automated commits/cancellations are browser-protocol operations, not real candidate-window selections: no candidate list is built, no transliteration is performed, and `Input.insertText` commits text directly. The spec asserts that the composition stays active after the guarded keys (no `compositionend`, text unchanged) *and* that further composition updates still flow through the editor afterwards; whether the extension's key handling interferes with a real IME's candidate handling can only be confirmed by the supplemental manual check in 7.3.
- Keyboard-event isolation is what A7 asserts. Composition, `beforeinput` and `input` events are deliberately left unblocked so the browser text pipeline stays native; they are not keyboard events and are outside the isolation contract.
- Composition in host-page fields while Annotate selection mode is active keeps the existing selection semantics (all keys consumed, host editable content not modified). The composition paths protected and covered here are the extension's editors: the Annotate editor and the standalone badge editor.

### 7.3 Supplemental manual check (real OS candidate window)

Status: **not executed / untested.** No operating-system IME or candidate window was driven while implementing this ticket (environment: Windows 10.0.26200, Chromium 153.0.8010.12 launched by Playwright 1.63.0, extension build 2.0.2 + this change). Automated evidence covers only the browser-protocol path described above.

Reproducible steps for a human with a system IME (e.g. Microsoft Pinyin, Japanese IME, Korean IME):

1. `pnpm test:extension:e2e` prerequisites are not required for this check; build and load the extension with `pnpm --filter vibe-annotations-extension build` and load `packages/extension/.output/chrome-mv3` as an unpacked extension in desktop Chrome.
2. Open the fixture page (`node packages/extension/tests/fixtures/server.js`, then `http://127.0.0.1:3005/selected-rectangle.html`).
3. Enable the system IME, click **Annotate**, click the rectangle to open the editor.
4. Type a pinyin/kana/hangul sequence so the composition string appears in the annotation textarea, and leave the candidate window open. Check that the underlined composition keeps updating as you type (the extension's key handling must not freeze the IME).
5. Candidate confirmation: press `Enter` (or `Space`, depending on the IME) to confirm the candidate. Expected: the confirmed text appears in the editor, the editor stays open, Annotate stays active, nothing is saved, and the host rectangle stays selected with its counters unchanged.
6. Candidate cancellation: repeat step 4, then press `Esc` to cancel the candidate window. Expected: the composition is discarded, the editor stays open, Annotate stays active, and the host rectangle stays selected.
7. After the composition ends, verify normal commands resumed: `Esc` closes the editor back to selection, `Ctrl/Cmd+Enter` saves exactly once.
8. Observe the host page: no host shortcut should fire while the IME is composing in the extension editor.

Report the OS/browser/IME versions, the confirmed/cancelled candidate results, and any deviation from the expectations above.

### 7.4 Failure-to-pass evidence (Ticket #9)

Environment: Windows 10.0.26200, Chromium 153.0.8010.12 (Playwright 1.63.0, headed), extension built from `packages/extension` source.

- Before the fix. Production router without composition handling, extension rebuilt from unmodified source (the fix is confined to `lib/content/keyboard-router.js`, so reverting that one file reproduces the baseline):
  ```bash
  git stash push -- packages/extension/lib/content/keyboard-router.js
  npx wxt build && npx playwright test tests/e2e/ime-composition.spec.js
  git stash pop
  ```
  Result: `1 passed, 3 failed`. Escape during an active composition closed the editor — in the two Annotate-editor tests the popover is gone right after Enter/Esc (`expect(popover).toBeAttached()` fails, and the follow-up textarea assertion fails because the editor was already detached), and the standalone badge editor was dismissed the same way. The native composition/commit test passed before and after, and remains a regression assertion. Traces, screenshots, error context and the fixture journals from those failures are kept by the Playwright config in `packages/extension/test-results/` (gitignored).
- Consuming the default action of composition keys was verified to be load-bearing: with `preventDefault()` removed from the router guard and everything else unchanged, the same spec fails on the editor text (`にほん\n` instead of `にほん` after candidate confirmation).
- After the fix (current source):
  ```bash
  pnpm test:extension:e2e          # 30 passed, includes the 4 A7 tests and A1-A6, A8-A11, A14 regressions
  pnpm --filter vibe-annotations-extension test:baseline   # 6 passed
  pnpm test:extension              # 41 passed (unit)
  ```

---

## 8. A12/A13 Recovery and Focus Restoration Coverage (Ticket #10)

Specs: `tests/e2e/session-recovery.spec.js` (A12, A13) and `tests/e2e/focus-restore.spec.js` (DOM focus), both part of the standard `pnpm test:extension:e2e` command. Node state tests: `tests/keyboard-router.test.js` (blur/page-hide/overlay/teardown) and `tests/session-focus.test.js`.

Production contract under test (`lib/content/keyboard-router.js`, `lib/content/session-focus.js`): a consumed keydown whose keyup is lost to a blur keeps its release owned (a stray keyup never reaches the host) while a new full press supersedes it; page hide and navigation terminate the session and clear held keys; explicit overlay closure ends the session, closes an open editor, releases DOM focus and stops inspection; initialization failure tears the router down; teardown is idempotent and re-init does not duplicate listeners or commands; exiting restores the host element that had DOM focus before entry (connected + focusable only, `preventScroll`, no clicks).

### 8.1 Automated scenarios

| Test | Asserted behavior |
| :--- | :--- |
| A12 consumed key + blur | `ArrowDown` consumed by selection, keyup lost to a blur. The session survives, a fresh full press of the same key is still routed as a new keystroke, the host receives no navigation keys, exiting hands the keyboard back, and only a fresh `Esc` reaches the host. |
| A12 held exit key + blur | `Esc` exits with its keyup lost to a blur. The stray release stays owned (zero host keydowns/keyups, rectangle stays selected) while a fresh full `Esc` is delivered end to end. |
| A12 re-entry after blur | After a lost release, re-entering Annotate isolates keys and exits exactly once; a fresh key is delivered afterwards. |
| A13 repeated entry/exit | Four entry/exit cycles through the toolbar: exactly one fresh `Esc` press reaches the host afterwards, one save produces exactly one badge, no duplicate commands. |
| A13 overlay closure | Closing with the toolbar `×` ends the session, removes the cursor/ownership, hands the keyboard back, and reopening the overlay (background-worker toggle, the popup's own message) + entering again isolates exactly once. |
| A13 closure with open editor | Closing the overlay with an unsaved editor open discards it without saving or duplicating; the host keeps its state and keyboard. |
| A13 navigation | A real navigation away and back (`page.goto` + `goBack`) leaves no crosshair or ownership on the restored page; the restored page owns its keyboard again. |
| A13 initialization failure | `?bootFail=true` (controlled injection): no extension UI, the toggle hotkey cannot acquire ownership, and `Esc`/`Backspace` are handled by the host. |
| Focus restoration | Starting focus on a page input, on the canvas (`tabindex=0`) and on the toolbar only: the original element is re-focused on exit, no clicks/mousedown are simulated, host logical selection is untouched, the page is not scrolled (`preventScroll`), and focus moved by the host during the session is not stolen. |

### 8.2 Controlled failure/blur conditions

- **Blur**: Chromium re-focuses a renderer as soon as it has received synthetic input, so a real OS-level window blur cannot be produced once a test has clicked or typed. The committed specs deliver the blur as a **controlled `window` blur event**; all key input stays real browser/CDP input. The production listener was separately observed receiving a real Chromium blur (headed run with `Emulation.setFocusEmulationEnabled(false)` plus a second tab), which is why the handler path is considered covered — the delivery mechanism in CI is controlled, not synthetic key input.
- **Page hidden**: Playwright's persistent context reports pages as visible and focused, so `visibilitychange → hidden` cannot be reproduced; the hidden transition runs the same held-key cleanup (`onFocusLoss`) as the blur case that is covered, and is additionally asserted in the Node state test for `onVisibilityChange`.
- **Initialization failure**: the fixture sets `data-vibe-boot-fail` on `<html>` (`?bootFail=true`), which makes `init()` throw before any UI is created. The attribute is absent on real pages; the production path under test is the `catch` → `VibeKeyboardRouter.teardown()` cleanup.
- **Destruction**: there is no user-reachable "destroy the extension" path to drive from a page, so destruction is covered by Node state tests (`teardown()` from an active session, idempotent double teardown, re-init without duplicate listeners/commands) while the E2E init-failure case exercises the same teardown in production code.

### 8.3 Failure-to-pass evidence (Ticket #10)

Environment: Windows 10.0.26200, Chromium 153.0.8010.12 (Playwright 1.63.0, new headless mode), extension built from `packages/extension` source.

- Before the fix (source changes reverted, tests kept):
  ```bash
  git stash push -u -- packages/extension/lib/content/keyboard-router.js packages/extension/lib/content/session-focus.js packages/extension/entrypoints/content/index.js
  cd packages/extension && npx wxt build
  npx playwright test tests/e2e/session-recovery.spec.js tests/e2e/focus-restore.spec.js --reporter=list
  git stash pop
  ```
  Result: `6 failed, 6 passed` — input focus restore, canvas focus restore, A12 held-exit release, A13 overlay closure, A13 closure-with-editor and A13 initialization failure all fail on unfixed behavior; the remaining cases are regression guards that already held. Raw output: `.scratch/annotate-keyboard-isolation/a10-before-fix.txt`.
- After the fix (current source):
  ```bash
  pnpm test:extension:e2e                                    # 42 passed
  npx playwright test tests/e2e/session-recovery.spec.js tests/e2e/focus-restore.spec.js   # 12 passed
  pnpm --filter vibe-annotations-extension test:baseline      # 6 passed
  pnpm test:extension                                        # 55 passed (unit)
  ```
  Raw output: `.scratch/annotate-keyboard-isolation/a10-after-fix.txt`.

### 8.4 Harness changes

- The suites now run in Chromium's **new headless mode** (`channel: 'chromium'`), so no browser windows pop up during a run; `VIBE_E2E_HEADED=1` restores a visible window for the whole suite.
- `A14 Design keyboard actions` asserted the live preview on `.rect-title`; headless font metrics put the click point in the 1–2px gap between the rectangle's two text lines, so the annotated element can be `#canvas-rect` itself. The assertion now checks whichever host element the preview actually styled.

---

## 9. A16 Injection-Path Coverage (Ticket #11)

Spec file: `tests/e2e/injection-paths.spec.js` (part of the standard `pnpm test:extension:e2e` command). Unit coverage for the evidence record: `tests/keyboard-install-evidence.test.js`.

### 9.1 Production contract under test

- `entrypoints/content/index.js` installs the keyboard router synchronously at `document_start`, i.e. before the page's own scripts run. `lib/content/keyboard-router.js` records **install evidence** once per page: world, `document.readyState` at install (`runAt`), install time (`installedAt`), whether the background marked a runtime injection, and the derived `earlyCapture` flag (`runAt === 'loading'` and no late marker).
- `entrypoints/background.js` registers a dynamically enabled site with `runAt: 'document_start'` — the same early timing as the manifest content script — and marks every runtime injection (`chrome.scripting.executeScript` into a page that is already running) with `__VIBE_LATE_INJECTION` before injecting.
- `entrypoints/content/index.js` publishes the evidence as `data-vibe-keyboard-*` attributes on the shadow host, the one DOM node both the content-script world and the page world can read.
- `lib/content/floating-toolbar.js` shows a persistent **refresh banner** (`.vibe-refresh-banner`, never dismissed, only cleared by a reload) whenever `earlyCapture` is false: the page must be reloaded before full keyboard isolation can be claimed. Annotate stays usable in that state — host commands stay blocked by the session — but the page's parse-time listeners still receive the keys first, which is what the guidance states.

### 9.2 Automated scenarios

| Test | Asserted behavior |
| :--- | :--- |
| A16 static | The built manifest declares the keyboard content script as `document_start`, ISOLATED, `all_frames`, and no site permissions changed for this work. On the fixture origin the evidence says `world: ISOLATED`, `runAt: loading`, `earlyCapture: true`, `lateInjection: false`, and `installedAt` is **before** the fixture's parse-time listener registration. No refresh banner is shown. Early window capture, document capture/bubble and property listeners receive zero events during Annotate, the exit Esc stays inside the session, and a fresh Esc reaches the preserved host listeners. |
| A16 late injection | A runtime injection into a page without live protection: the evidence says `runAt: complete` (not `loading`), `lateInjection: true`, `earlyCapture: false`, and `installedAt` is **after** the fixture's parse-time registration. The refresh banner is visible and names the reload requirement. During Annotate the key demonstrably reaches the host's parse-time listener — the honest reason for the notice — while host commands stay blocked (`cancelCount` 0) and the session exits cleanly. |
| A16 dynamic | The production site-enable flow (permission modal → grant handling → `enableSite`) creates a **real dynamic registration** for the controlled origin: `runAt: document_start`, `world: ISOLATED`, `persistAcrossSessions: true`, and the origin is stored in `vibeEnabledSites`. The instance that just arrived is late-injected, so it shows the refresh banner. After the reload the same page passes the full early-capture checks: evidence says `runAt: loading` / `earlyCapture: true`, the banner is gone, host listeners receive zero events during Annotate, the exit Esc keeps host selection, a fresh Esc reaches the host, and a save produces exactly one badge. |

### 9.3 Timing/world evidence

- The fixture records `window.__FIXTURE_STATE.earlyListenersRegisteredAt = performance.now()` at its earliest parse-time listener registration (`tests/fixtures/selected-rectangle.html`). Both the router's `installedAt` and this timestamp are `performance.now()` values on the same document timeline, so the tests assert the ordering per path (early: router first; late: fixture first) instead of only observing that isolation works.
- World evidence comes from two independent sources: the router's recorded world, and the registration configuration read back from Chrome (`chrome.scripting.getRegisteredContentScripts()` for the dynamic path, `manifest.json` for the static path).
- Registrations and storage are read through the Playwright service-worker handle, so the assertions observe the browser's registration state, not a page-side simulation.

### 9.4 Controlled origin and coverage boundaries

The controlled origin is `http://vibe-injection.test:3005`, route-fulfilled by the test runner (no DNS, no shared server state) inside a per-test browser profile. The boundaries below are deliberate and were verified in this environment (Windows 10.0.26200, Chromium 153.0.8010.12, Playwright 1.63.0, new headless mode):

- **The native host-permission bubble cannot be answered by the runner.** `chrome.permissions.request` for an origin outside the declared `host_permissions` opens a browser prompt; in headless mode it never resolves (verified: the modal stays on "Requesting permission…"), and `chrome.permissions.contains({ origins: ['*://*/*'] })` is false in a freshly loaded unpacked profile. A *fresh* origin therefore cannot be enabled, injected into, or protected automatically at all — reaching one requires the user to answer that prompt. The dynamic-registration test therefore enables a controlled origin the profile already permits and drives the extension's own grant handling, registration and persistence; the browser-side grant is the documented gap.
- **The toolbar-icon click is browser UI.** Tests perform the injection that `chrome.action.onClicked` performs — seed the boot intent, mark the runtime injection, inject the production content scripts, then let the production modal and message handlers run. The extension's keyboard command does not fire from synthetic key input in this harness (verified), so `activeTab` cannot be obtained either; this is why the tests inject explicitly rather than clicking the icon.
- **The late-injection scenario starts from the controlled `?bootFail=true` page** (an existing harness condition, §8.2): the manifest script runs but the instance stays inert, leaving no UI, no ownership and host listeners already registered — exactly what a runtime injection finds on a page the extension could not protect at load. An update-style variant built on `chrome.runtime.reload()` is not reproducible here: Chromium kept the previous content script instance alive across the reload in this harness (its toolbar stayed functional), so it cannot produce a page that genuinely lost its extension instance.
- **Double injection is avoided by construction.** The dynamic-registration test enables an origin the manifest already matches, which production only does for non-localhost granted sites; in this test the dynamically injected copy is removed by the reload before isolation is asserted, so no page runs two live instances while isolation is measured.

### 9.5 Failure-to-pass evidence (Ticket #11)

Environment: Windows 10.0.26200, Chromium 153.0.8010.12 (Playwright 1.63.0, new headless mode), extension built from `packages/extension` source.

- Before the fix (production source reverted, tests kept):
  ```bash
  git stash push -- packages/extension/lib/content/keyboard-router.js packages/extension/entrypoints/background.js packages/extension/entrypoints/content/index.js packages/extension/lib/content/floating-toolbar.js packages/extension/lib/content/styles.js
  cd packages/extension && npx wxt build && npx playwright test tests/e2e/injection-paths.spec.js --reporter=list
  git stash pop
  ```
  Result: `3 failed` — the static test finds no install evidence (`data-vibe-keyboard-world` absent), the late-injection test finds no refresh banner, and the dynamic test reads back `runAt: "document_idle"` from the production registration. Raw output: `.scratch/annotate-keyboard-isolation/a11-before-fix.txt`.
- After the fix (current source):
  ```bash
  pnpm test:extension:e2e                              # 45 passed, includes the 3 A16 tests and A1-A14 regressions
  pnpm --filter vibe-annotations-extension test:baseline   # 6 passed
  pnpm test:extension                                  # 61 passed (unit)
  ```
  Raw output: `.scratch/annotate-keyboard-isolation/a11-after-fix.txt`.
