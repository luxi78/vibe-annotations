import { test, expect, FIXTURE_ORIGIN } from './fixtures.js';

test('installed product identifies Pinvelto and displays its Feedback Window mark', async ({ page, backgroundWorker }, testInfo) => {
  const identity = await backgroundWorker.evaluate(() => {
    const manifest = chrome.runtime.getManifest();
    return { name: manifest.name, title: manifest.action.default_title, icons: manifest.icons };
  });
  expect(identity.name).toBe('Pinvelto — Visual Feedback for AI Coding Agents');
  expect(identity.title).toBe('Pinvelto');
  expect(Object.keys(identity.icons).sort()).toEqual(['128', '16', '32', '48']);
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const logo = page.locator('.pinvelto-toolbar-logo');
  await expect(logo).toBeVisible();
  expect(await logo.evaluate(image => image.complete && image.naturalWidth >= 128)).toBe(true);
  await expect(logo).toHaveAttribute('alt', 'Pinvelto');
  await page.screenshot({ path: testInfo.outputPath('pinvelto-toolbar.png') });
});
