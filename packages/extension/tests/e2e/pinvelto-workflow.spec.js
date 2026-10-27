import http from 'node:http';
import {
  test,
  expect,
  FIXTURE_ORIGIN,
  enterAnnotateMode,
  openPopover
} from './fixtures.js';
import { PINVELTO_TOOLS } from './pinvelto-service.js';
import { readFile } from 'node:fs/promises';
test.use({ realService: true });
test('fresh extension creates visual Feedback that MCP reads and updates visibly', async ({
  page,
  backgroundWorker,
  pinveltoService
}, testInfo) => {
  test.setTimeout(60000);
  const legacy = {
    annotations: [
      {
        id: 'upstream-feedback',
        url: `${FIXTURE_ORIGIN}/selected-rectangle.html`,
        comment: 'Old upstream record',
        status: 'pending'
      }
    ],
    settings: { legacy: true },
    vibeToolbarCollapsed: true,
    screenshotEnabled: true
  };
  await backgroundWorker.evaluate(
    (values) => chrome.storage.local.set(values),
    legacy
  );
  expect(pinveltoService.client.getServerVersion().name).toBe('pinvelto');
  const { tools } = await pinveltoService.client.listTools();
  expect(tools.map((tool) => tool.name).sort()).toEqual(PINVELTO_TOOLS);
  await expect(
    pinveltoService.client.callTool({ name: 'read_annotations', arguments: {} })
  ).rejects.toThrow(/Unknown tool/);
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const png = await page.locator('#canvas-rect').screenshot();
  await enterAnnotateMode(page);
  const { popover, textarea } = await openPopover(page);
  await textarea.fill('Give this rectangle two design options');
  await popover
    .locator('.pinvelto-attach-input')
    .setInputFiles({
      name: 'reference.png',
      mimeType: 'image/png',
      buffer: png
    });
  await expect(popover.locator('.pinvelto-att-img')).toHaveCount(1);
  await expect
    .poll(() =>
      popover
        .locator('.pinvelto-att-img')
        .evaluate((image) => image.naturalWidth)
    )
    .toBeGreaterThan(1);
  await page.keyboard.press('Control+Enter');
  await expect(popover).toBeHidden();
  let feedback;
  await expect
    .poll(async () => {
      const result = await pinveltoService.call('pinvelto_list_feedback', {
        url: `${FIXTURE_ORIGIN}/*`
      });
      feedback = result.data[0];
      return feedback?.attachments?.length || 0;
    })
    .toBeGreaterThan(0);
  expect(feedback.comment).toBe('Give this rectangle two design options');
  expect(await readFile(feedback.attachments[0].path)).toEqual(png);
  const persisted = await (
    await fetch(`${pinveltoService.url}/api/annotations`)
  ).json();
  const attachmentId = persisted.annotations[0].attachments[0].id;
  const assetUrl = `${pinveltoService.url}/api/annotations/${feedback.id}/attachments/${attachmentId}`;
  expect(Buffer.from(await (await fetch(assetUrl)).arrayBuffer())).toEqual(png);
  await pinveltoService.call('pinvelto_update_feedback', {
    id: feedback.id,
    variantsPayload: {
      container: '#canvas-rect',
      attribute: 'data-pinvelto-active',
      variants: [
        { value: '1', name: 'Original' },
        { value: '2', name: 'Blue' }
      ],
      files: []
    }
  });
  await page.keyboard.press('Escape');
  const root = page.locator('#pinvelto-feedback-root');
  await root.locator('.pinvelto-tb-viewall').click();
  await expect(root.locator('.pinvelto-viewall-panel')).toContainText(
    'Variants ready',
    { timeout: 25000 }
  );
  await expect(root.locator('.pinvelto-viewall-panel')).toContainText(
    'Give this rectangle two design options'
  );
  const retained = await backgroundWorker.evaluate(
    (keys) => chrome.storage.local.get(keys),
    Object.keys(legacy)
  );
  expect(retained).toEqual(legacy);
  expect(
    await page.evaluate(() => ({
      old: typeof window.__vibeAnnotations,
      current: typeof window.__pinvelto?.getFeedback
    }))
  ).toEqual({ old: 'undefined', current: 'function' });
  await page.screenshot({
    path: testInfo.outputPath('browser-mcp-feedback.png')
  });
});

test.describe('Foreign-service isolation', () => {
  test.use({ realService: false });
  test('a healthy foreign endpoint stays offline and receives no Feedback mutation', async ({
    page,
    backgroundWorker
  }) => {
    const requests = [];
    const foreign = http.createServer((req, res) => {
      requests.push({ method: req.method, path: req.url });
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'ok',
          product: 'vibe-annotations',
          version: '99.0.0'
        })
      );
    });
    foreign.listen(0, '127.0.0.1');
    await new Promise((resolve) => foreign.once('listening', resolve));
    try {
      const url = `http://127.0.0.1:${foreign.address().port}`;
      await backgroundWorker.evaluate(
        (url) => chrome.storage.local.set({ pinveltoServiceUrl: url }),
        url
      );
      await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
      await enterAnnotateMode(page);
      const { popover, textarea } = await openPopover(page);
      await expect(popover.locator('[data-mode="variants"]')).toBeDisabled();
      await textarea.fill(
        'Local Feedback while foreign service occupies the endpoint'
      );
      await page.keyboard.press('Control+Enter');
      await page.keyboard.press('Escape');
      const root = page.locator('#pinvelto-feedback-root');
      await expect(root.locator('.pinvelto-tb-status')).toHaveAttribute(
        'title',
        'MCP Server offline'
      );
      await root.locator('.pinvelto-tb-viewall').click();
      await expect(root.locator('.pinvelto-viewall-panel')).toContainText(
        'Local Feedback while foreign service occupies the endpoint'
      );
      expect(requests.length).toBeGreaterThan(0);
      expect(
        requests.every(
          (request) => request.method === 'GET' && request.path === '/health'
        )
      ).toBe(true);
    } finally {
      foreign.closeAllConnections();
      await new Promise((resolve) => foreign.close(resolve));
    }
  });
});
