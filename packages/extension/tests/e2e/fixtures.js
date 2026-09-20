import { test as base, chromium, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3');
export const FIXTURE_ORIGIN = 'http://127.0.0.1:3005';

function ensureExtensionBuilt() {
  const manifestPath = path.join(EXTENSION_PATH, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.log('[e2e] Built extension not found. Running wxt build...');
    execSync('pnpm --filter vibe-annotations-extension build', {
      cwd: path.resolve(__dirname, '../../..'),
      stdio: 'inherit'
    });
  }
}

export const test = base.extend({
  // Isolated browser context with loaded extension
  context: async ({}, use) => {
    ensureExtensionBuilt();

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-e2e-profile-'));

    const launchArgs = [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-gpu',
    ];

    const context = await chromium.launchPersistentContext(tmpDir, {
      headless: false, // Chrome extensions require headed or xvfb in CI
      args: launchArgs,
    });

    // Stub MCP server requests so extension runs cleanly in standalone mode
    await context.route('http://127.0.0.1:3846/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', annotations: [] }),
      });
    });

    await use(context);

    await context.close();

    // Clean up profile directory with retry for Windows file locks
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (_) {
      // Best-effort cleanup
    }
  },

  page: async ({ context }, use, testInfo) => {
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await use(page);

    // Retain relevant event logs and fixture state on failure
    if (testInfo.status !== testInfo.expectedStatus) {
      try {
        const diagnostics = await page.evaluate(() => ({
          fixtureState: window.__FIXTURE_STATE,
          eventLog: window.__EVENT_LOG,
        }));
        await testInfo.attach('fixture-event-log', {
          body: JSON.stringify(diagnostics, null, 2),
          contentType: 'application/json',
        });
      } catch (_) {
        // Page might be already closed or navigated away
      }
    }
  },

  extensionVersion: async ({}, use) => {
    const manifest = JSON.parse(fs.readFileSync(path.join(EXTENSION_PATH, 'manifest.json'), 'utf-8'));
    await use(manifest.version);
  },

  backgroundWorker: async ({ context }, use) => {
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker');
    }
    await use(worker);
  },
});


// Helper: Enter Annotate mode via toolbar button
export async function enterAnnotateMode(page) {
  const vibeRoot = page.locator('#vibe-annotations-root');
  const annotateBtn = vibeRoot.locator('.vibe-tb-annotate');
  await expect(annotateBtn).toBeVisible({ timeout: 10000 });
  await annotateBtn.click();
  await expect(page.locator('style[data-vibe-cursor]')).toBeAttached({ timeout: 3000 });
  return vibeRoot;
}

// Helper: Open popover by clicking on host target rectangle
export async function openPopover(page) {
  const vibeRoot = page.locator('#vibe-annotations-root');
  const rect = page.locator('#canvas-rect');
  await rect.click();

  const popover = vibeRoot.locator('.vibe-popover');
  await expect(popover).toBeVisible({ timeout: 5000 });

  const textarea = popover.locator('.vibe-textarea');
  await expect(textarea).toBeFocused();
  return { popover, textarea };
}

// Helper: Dispatch keyboard down -> repeat -> up using Chrome DevTools Protocol
export async function dispatchKeyWithRepeat(page, key, code, windowsVirtualKeyCode) {
  const cdp = await page.context().newCDPSession(page);
  // 1. Initial keydown
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key,
    code,
    windowsVirtualKeyCode,
  });
  // 2. Repeat keydown
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key,
    code,
    windowsVirtualKeyCode,
    autoRepeat: true,
  });
  // 3. Keyup
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key,
    code,
    windowsVirtualKeyCode,
  });
}

// Helper: Start browsing an IME composition through the browser's own input
// protocol (CDP), which inserts composition text in the renderer without
// fabricating DOM events. Returns the CDP session for later commit/abort.
export async function startComposition(page, text) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', {
    text,
    selectionStart: text.length,
    selectionEnd: text.length,
  });
  return cdp;
}

// Helper: Update the active composition string (candidate list navigation)
export async function updateComposition(cdp, text) {
  await cdp.send('Input.imeSetComposition', {
    text,
    selectionStart: text.length,
    selectionEnd: text.length,
  });
}

// Helper: Confirm the active composition (candidate window confirmation)
export async function commitComposition(cdp, text) {
  await cdp.send('Input.insertText', { text });
}

// Helper: Record the composition/input pipeline events the annotation editor
// receives into window.__IME_LOG so tests can prove they stay native.
export async function instrumentEditor(page) {
  await page.evaluate(() => {
    const root = document.querySelector('#vibe-annotations-root').shadowRoot;
    const ta = root.querySelector('.vibe-textarea');
    window.__IME_LOG = [];
    const record = (e) => window.__IME_LOG.push({
      type: e.type,
      data: e.data ?? null,
      inputType: e.inputType || null,
      isComposing: e.isComposing ?? null,
      isTrusted: e.isTrusted,
    });
    for (const type of ['compositionstart', 'compositionupdate', 'compositionend', 'beforeinput', 'input']) {
      ta.addEventListener(type, record);
    }
  });
}

export async function readImeLog(page) {
  return page.evaluate(() => window.__IME_LOG);
}

export { expect };
