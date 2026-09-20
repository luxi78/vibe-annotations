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

export { expect };
