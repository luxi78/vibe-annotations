import { test, expect, FIXTURE_ORIGIN } from './fixtures.js';

test('built-in help installs reviewed local artifacts and links project-owned guidance', async ({ page }, testInfo) => {
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const root = page.locator('#pinvelto-feedback-root');
  await root.locator('.pinvelto-tb-settings').click();
  const dropdown = root.locator('.pinvelto-settings-dropdown');
  await expect(dropdown.locator('.pinvelto-settings-version')).toContainText('v2.1.0');
  await root.locator('.pinvelto-get-started-btn').click();
  const links = await dropdown.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.href));
  expect(links).toContain('https://github.com/luxi78/vibe-annotations/blob/issue/23/README.md');
  expect(links.filter(url => /\/releases\/tag\//.test(url))).toEqual([]);
  await dropdown.locator('.pinvelto-get-started-guide-btn').click();
  await expect(dropdown).toContainText('reviewed Pinvelto revision');
  await expect(dropdown).toContainText('pnpm --filter pinvelto-extension build');
  await expect(dropdown).toContainText('npm install --global ./packages/server');
  await expect(dropdown).not.toContainText('One command does it all');
  await page.screenshot({ path: testInfo.outputPath('extension-help.png') });
  await testInfo.attach('extension-help', { body: await page.screenshot(), contentType: 'image/png' });
});
