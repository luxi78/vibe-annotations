import { test, expect, FIXTURE_ORIGIN } from './fixtures.js';

test.describe('Extension Loading and Real User Entry Points', () => {
  test('loads extension, injects shadow root, and displays floating toolbar', async ({ page, extensionVersion }) => {
    expect(extensionVersion).toBeTruthy();

    await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);

    // Extension injects #pinvelto-feedback-root on 127.0.0.1
    const pinveltoRoot = page.locator('#pinvelto-feedback-root');
    await expect(pinveltoRoot).toBeAttached({ timeout: 10000 });

    // Floating toolbar lives inside shadow root
    const toolbar = pinveltoRoot.locator('.pinvelto-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 5000 });

    // Annotate button is available
    const annotateBtn = pinveltoRoot.locator('.pinvelto-tb-annotate');
    await expect(annotateBtn).toBeVisible();
    await expect(annotateBtn).toBeEnabled();
  });

  test('enters and exits Annotate mode via toolbar Annotate button click', async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);

    const pinveltoRoot = page.locator('#pinvelto-feedback-root');
    const toolbar = pinveltoRoot.locator('.pinvelto-toolbar');
    const annotateBtn = pinveltoRoot.locator('.pinvelto-tb-annotate');
    await expect(annotateBtn).toBeVisible({ timeout: 10000 });

    // 1. Click Annotate button to start inspection mode
    await annotateBtn.click();

    // Verify inspection mode active: crosshair cursor injected and toolbar morphed to annotating
    await expect(page.locator('style[data-pinvelto-cursor]')).toBeAttached({ timeout: 3000 });
    await expect(toolbar).toHaveClass(/annotating/, { timeout: 3000 });

    // 2. Exit inspection mode via Esc or stop
    await page.keyboard.press('Escape');

    // Verify inspection mode stopped: cursor style removed and toolbar restored
    await expect(page.locator('style[data-pinvelto-cursor]')).not.toBeAttached({ timeout: 3000 });
    await expect(toolbar).not.toHaveClass(/annotating/, { timeout: 3000 });
  });
});
