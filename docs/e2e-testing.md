# Extension E2E Test Harness & Keyboard Conflict Baselines

This document covers the Playwright E2E test harness for the Vibe Annotations Chrome extension, environment requirements, CI display configuration, failure artifact inspection, and baseline conflict documentation against extension build `2.0.2`.

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

# Run E2E in headed mode with visible browser window
pnpm test:e2e:headed

# Run existing Node unit tests
pnpm test:unit
```

---

## 3. Supported Environments & Headed-Mode Requirements

### Extension Architecture in Playwright
Chrome Manifest V3 extensions cannot be loaded into traditional headless Chrome (`--headless`). Chrome extensions require:
1. Extension-capable Chromium launched via `chromium.launchPersistentContext(userDataDir, ...)`.
2. Chromium arguments: `--disable-extensions-except=<path>`, `--load-extension=<path>`, `--no-sandbox`.
3. A GUI display environment.

### Operating Systems
- **Windows**: Supported natively (headed mode launches Chromium window).
- **macOS**: Supported natively (headed mode launches Chromium window).
- **Linux (Local & CI)**: Supported via X11 or virtual display server (`xvfb`).

### CI Display Setup (Linux / GitHub Actions)

In Linux CI environments, run the tests wrapped with `xvfb-run` to provide a virtual display server:

```yaml
- name: Install Playwright Browsers
  run: pnpm --filter vibe-annotations-extension exec playwright install --with-deps chromium

- name: Run Extension E2E Tests
  run: xvfb-run --auto-servernum -- pnpm test:extension:e2e
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
