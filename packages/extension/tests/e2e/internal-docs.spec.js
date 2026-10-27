import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

let server;
let origin;
let logs = '';
test.beforeAll(async () => {
  const port = await new Promise(resolve => {
    const socket = net.createServer().listen(0, '127.0.0.1', () => {
      const port = socket.address().port;
      socket.close(() => resolve(port));
    });
  });
  origin = `http://127.0.0.1:${port}`;
  const website = fileURLToPath(new URL('../../../website/', import.meta.url));
  server = spawn(process.execPath, [fileURLToPath(new URL('../../../website/node_modules/next/dist/bin/next', import.meta.url)), process.env.PINVELTO_DOCS_PRODUCTION ? 'start' : 'dev', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: website, windowsHide: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', data => { logs += data; });
  server.stderr.on('data', data => { logs += data; });
  await expect.poll(async () => {
    try { return (await fetch(`${origin}/docs`, { signal: AbortSignal.timeout(2000) })).status; } catch { return 0; }
  }, { timeout: 60000, message: () => logs }).toBe(200);
});
test.afterAll(async () => {
  if (server && server.exitCode === null) {
    const exited = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    await exited;
  }
});

test('internal documentation leads from a reviewed local installation to daily use and deliberate updates', async ({ page }, testInfo) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto(origin);
  await expect(page.getByRole('heading', { name: 'Pinvelto documentation', exact: true })).toBeVisible();
  await page.screenshot({ path: fileURLToPath(new URL('../../../../docs/verification/issue-28-docs-desktop.png', import.meta.url)), fullPage: true });
  await page.getByRole('link', { name: 'Installation', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Install from a reviewed revision', exact: true })).toBeVisible();
  await expect(page.locator('article')).toContainText('PINVELTO_REF');
  await expect(page.locator('article')).toContainText('.output/chrome-mv3');
  await expect(page.locator('article')).toContainText('npm install --global ./packages/server');
  await page.screenshot({ path: fileURLToPath(new URL('../../../../docs/verification/issue-28-installation.png', import.meta.url)), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: fileURLToPath(new URL('../../../../docs/verification/issue-28-docs-mobile.png', import.meta.url)), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('link', { name: 'MCP setup', exact: true }).first().click();
  await expect(page.locator('article')).toContainText('http://127.0.0.1:3847/mcp');
  await expect(page.locator('article')).toContainText('pinvelto_list_feedback');
  await page.getByRole('link', { name: 'Feedback and review', exact: true }).first().click();
  await expect(page.locator('article')).toContainText('Selected site');
  await page.getByRole('link', { name: 'Local updates', exact: true }).first().click();
  await expect(page.locator('article')).toContainText('pinvelto stop');
  await expect(page.locator('article')).toContainText('PINVELTO_REF');
  const links = await page.locator('a[href]').evaluateAll(nodes => nodes.map(node => node.href));
  expect(links.some(url => url.includes('github.com/luxi78/vibe-annotations'))).toBe(true);
  expect(links.filter(url => /chromewebstore|vibe-annotations\.com|RaphaelRegnier/i.test(url))).toEqual([]);
  for (const url of links.filter(url => url.startsWith(origin))) {
    expect((await page.request.get(url)).status(), url).toBe(200);
  }
  expect((await page.request.get(`${origin}/docs/benchmark`)).status()).toBe(404);
  expect(requests.filter(url => /chromewebstore|registry\.npmjs\.org\/vibe-annotations|api\.github\.com\/repos\/RaphaelRegnier|vibe-annotations\.com/i.test(url))).toEqual([]);
  await testInfo.attach('documentation-network', { body: JSON.stringify(requests, null, 2), contentType: 'application/json' });
  writeFileSync(fileURLToPath(new URL('../../../../docs/verification/issue-28-docs-network.json', import.meta.url)), JSON.stringify(requests, null, 2) + '\n');
});
