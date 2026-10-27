import { readFile } from 'node:fs/promises';
import { test, expect, FIXTURE_ORIGIN, enterAnnotateMode, openPopover } from './fixtures.js';

test.use({ realService: true, actionTimeout: 10000 });

async function download(page, format) {
  await page.locator('.pinvelto-viewall-export').click();
  const pending = page.waitForEvent('download');
  await page.locator(`.pinvelto-share-opt[data-format="${format}"]`).click();
  const result = await pending;
  expect(result.suggestedFilename()).toMatch(new RegExp(`^pinvelto-feedback-.+\\.${format}$`));
  return { content: await readFile(await result.path(), 'utf8'), path: await result.path() };
}

async function importFile(page, file) {
  if (!await page.locator('.pinvelto-import-btn').isVisible()) await page.locator('.pinvelto-tb-settings').click();
  const pending = page.waitForEvent('filechooser');
  await page.locator('.pinvelto-import-btn').click();
  await (await pending).setFiles(file);
}

test('new Pinvelto exports roundtrip while unavailable references and legacy files stay truthful', async ({ page, context, backgroundWorker, pinveltoService }, testInfo) => {
  test.setTimeout(90000);
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const png = await page.locator('#canvas-rect').screenshot();
  await enterAnnotateMode(page);
  const { popover, textarea } = await openPopover(page);
  await textarea.fill('Export this visual Feedback');
  await popover.locator('.pinvelto-attach-input').setInputFiles({ name: 'reference.png', mimeType: 'image/png', buffer: png });
  await expect(popover.locator('.pinvelto-att-img')).toHaveCount(1);
  await page.keyboard.press('Control+Enter');
  await expect(popover).toBeHidden();
  let record;
  await expect.poll(async () => {
    record = (await pinveltoService.call('pinvelto_list_feedback', {})).data[0];
    return record?.attachments?.length || 0;
  }).toBe(1);
  await page.keyboard.press('Escape');
  const runtimeClient = await context.newPage();
  await runtimeClient.goto(new URL('acceptance.html', backgroundWorker.url()).href);
  const runtimeExport = await runtimeClient.evaluate(() => chrome.runtime.sendMessage({ action: 'pinvelto:exportFeedback', format: 'json' }));
  expect(runtimeExport.success).toBe(true);
  expect(JSON.parse(runtimeExport.data).product).toBe('pinvelto');
  const runtimeMcp = await runtimeClient.evaluate(() => chrome.runtime.sendMessage({ action: 'pinvelto:exportFeedback', format: 'mcp' }));
  expect(runtimeMcp.data.product).toBe('pinvelto');
  expect(runtimeMcp.data.feedback[0].mcp_ready).toBe(true);
  const runtimeCsv = await runtimeClient.evaluate(() => chrome.runtime.sendMessage({ action: 'pinvelto:exportFeedback', format: 'csv' }));
  expect(runtimeCsv.data).toContain('pinvelto,');
  const oldRuntime = await runtimeClient.evaluate(() => chrome.runtime.sendMessage({ action: 'exportFeedback', format: 'json' }));
  expect(oldRuntime.success).toBe(false);
  await runtimeClient.close();
  const bridgeExport = await page.evaluate(() => window.__pinvelto.exportFeedback());
  expect(bridgeExport.product).toBe('pinvelto');
  expect(bridgeExport.pinvelto_feedback_export).toBe(true);
  expect(bridgeExport.feedback).toHaveLength(1);
  await page.locator('.pinvelto-tb-viewall').click();
  const json = await download(page, 'json');
  const envelope = JSON.parse(json.content);
  expect(envelope.product).toBe('pinvelto');
  expect(envelope.pinvelto_feedback_export).toBe(true);
  expect(envelope.feedback).toHaveLength(1);
  expect(envelope.attachments).toBe('references-only');
  const md = await download(page, 'md');
  expect(md.content).toContain('# Pinvelto');
  expect(md.content).toContain('pinvelto_list_feedback');
  expect(md.content).toContain('not embedded');
  expect(md.content).not.toContain('.pinvelto-feedback/');
  const html = await download(page, 'html');
  expect(html.content).toContain('<title>Pinvelto');
  const document = await context.newPage();
  await document.setContent(html.content);
  expect(await document.locator('img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  await document.screenshot({ path: testInfo.outputPath('portable-html.png'), animations: 'disabled' });
  await document.close();
  await page.locator('.pinvelto-tb-viewall').click();
  await importFile(page, json.path);
  await expect(page.locator('.pinvelto-confirm-title')).toHaveText('Nothing to import');
  await page.locator('.pinvelto-confirm-no').click();
  // Ordinary UI deletion removes its attachment bytes; importing JSON only restores metadata.
  await page.locator('.pinvelto-tb-viewall').click();
  await page.locator('.pinvelto-viewall-card-delete').click();
  await expect.poll(async () => (await pinveltoService.call('pinvelto_list_feedback', { status: 'all' })).data.length).toBe(0);
  await page.locator('.pinvelto-tb-viewall').click();
  await importFile(page, json.path);
  await expect(page.locator('.pinvelto-confirm-title')).toHaveText('Import Feedback');
  await page.locator('.pinvelto-confirm-yes').click();
  let restored;
  await expect.poll(async () => {
    restored = (await pinveltoService.call('pinvelto_list_feedback', { status: 'all' })).data[0];
    return restored?.comment;
  }).toBe('Export this visual Feedback');
  expect(restored.attachments).toBeUndefined();
  await page.locator('.pinvelto-tb-viewall').click();
  const restoredHtml = await download(page, 'html');
  expect(restoredHtml.content).not.toContain('<img');
  await page.locator('.pinvelto-tb-viewall').click();
  await page.locator(`.pinvelto-badge[data-annotation-id="${record.id}"]`).click();
  await expect(page.locator('.pinvelto-att-unavailable')).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('missing-imported-reference.png'), animations: 'disabled' });
  await page.keyboard.press('Escape');
  await importFile(page, { name: 'upstream.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ vibe_annotations_export: true, annotations: [{id:'old',comment:'old'}] })) });
  await expect(page.locator('.pinvelto-confirm-title')).toHaveText('Invalid format');
  expect((await pinveltoService.call('pinvelto_list_feedback', {status:'all'})).data.map(item => item.id)).toEqual([record.id]);
  await page.screenshot({ path: testInfo.outputPath('legacy-import-rejected.png'), animations: 'disabled' });
  await page.locator('.pinvelto-confirm-no').click();
  const removed = await page.evaluate(id => window.__pinvelto.deleteFeedback(id), record.id);
  expect(removed.success).toBe(true);
  await expect.poll(async () => (await pinveltoService.call('pinvelto_list_feedback', { status: 'all' })).data.length).toBe(0);
  await importFile(page, json.path);
  await page.locator('.pinvelto-confirm-yes').click();
  await expect.poll(async () => (await pinveltoService.call('pinvelto_list_feedback', { status: 'all' })).data[0]?.id).toBe(record.id);
});

