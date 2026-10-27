import http from 'node:http';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, expect, enterAnnotateMode } from './fixtures.js';

test.use({ realService: true, actionTimeout: 10000 });

// Deterministic coding agent: generated source lives in a real temporary project.
// MCP communicates instructions/state; it does not edit the project's files.
async function project() {
  const directory = await mkdtemp(path.join(tmpdir(), 'pinvelto-variants-project-'));
  const file = path.join(directory, 'index.html');
  const legacy = path.join(directory, 'upstream.html');
  const original = '<article id="target">Original card</article>';
  await writeFile(legacy, '<!-- vibe-annotations:scaffold upstream --><div class="vibe-var-upstream" data-vibe-active="1">untouched</div>');
  async function save(content) {
    await writeFile(file, `<!doctype html><html><head><style>body{padding:100px;font:20px system-ui;background:#f5f7fc}article{width:340px;padding:40px;background:white;border:2px solid #0754ff}</style></head><body>${content}</body></html>`);
  }
  await save(original);
  const server = http.createServer(async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await readFile(file));
  });
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return {
    directory, file, legacy, original, save,
    url: `http://127.0.0.1:${server.address().port}/`,
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
      await rm(directory, { recursive: true, force: true });
    }
  };
}

test('global Feedback deletion removes scaffolded metadata without editing generated project code', async ({ page, pinveltoService }, testInfo) => {
  test.setTimeout(60000);
  const app = await project();
  try {
    const feedback = await createRequest(page, pinveltoService, app.url, true);
    await generate(app, feedback, pinveltoService);
    const generated = await readFile(app.file, 'utf8');
    const upstream = await readFile(app.legacy, 'utf8');
    await page.reload();
    await page.locator('.pinvelto-tb-viewall').click();
    await expect(page.locator('.pinvelto-viewall-panel')).toContainText('Variants ready', { timeout: 25000 });
    await page.locator('.pinvelto-viewall-delete-global').click();
    await expect(page.locator('.pinvelto-confirm-msg')).toContainText('Generated code will not be changed');
    await page.locator('.pinvelto-confirm-yes').click();
    await expect.poll(async () => (await pinveltoService.call('pinvelto_list_feedback', { status: 'all' })).data.length).toBe(0);
    expect(await readFile(app.file, 'utf8')).toBe(generated);
    expect(await readFile(app.legacy, 'utf8')).toBe(upstream);
    await expect(page.locator('.pinvelto-badge')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('#target')).toHaveText('Original card');
    expect(await page.locator('[data-pinvelto-active]').count()).toBe(1);
    await page.locator('.pinvelto-toolbar').hover();
    await page.screenshot({ path: testInfo.outputPath('global-delete-preserved-project.png'), animations: 'disabled' });
  } finally { await app.close(); }
});

async function createRequest(page, service, url, explicit) {
  await page.goto(url);
  await enterAnnotateMode(page);
  await page.locator('#target').click();
  const popover = page.locator('.pinvelto-popover');
  await expect(popover).toBeVisible();
  if (explicit) {
    await expect(popover.locator('[data-mode="variants"]')).toBeEnabled();
    await popover.locator('[data-mode="variants"]').click();
  }
  await popover.locator('.pinvelto-textarea').fill('Show me a few versions of this card');
  await page.keyboard.press('Control+Enter');
  await expect(popover).toBeHidden();
  let feedback;
  await expect.poll(async () => {
    feedback = (await service.call('pinvelto_list_feedback', { url: `${new URL(url).origin}/*` })).data[0];
    return !!feedback;
  }).toBe(true);
  return feedback;
}

async function generate(project, feedback, service, promote = false) {
  const contract = feedback.variant_instructions;
  expect(contract).toContain(`pinvelto:scaffold ${feedback.id}`);
  expect(contract).toContain('data-pinvelto-active');
  expect(contract).toContain('pinvelto_update_feedback');
  expect(contract).not.toMatch(/vibe-|data-vibe/);
  const wrapper = `pinvelto-var-${feedback.id}`;
  await project.save(`<!-- pinvelto:scaffold ${feedback.id} -->
    <style>.${wrapper}>.pinvelto-variant{display:none}.${wrapper}[data-pinvelto-active="1"]>[data-variant="1"],.${wrapper}[data-pinvelto-active="2"]>[data-variant="2"]{display:block}</style>
    <div class="${wrapper}" data-pinvelto-active="1">
      <article id="target" class="pinvelto-variant" data-variant="1">Original card</article>
      <article class="pinvelto-variant" data-variant="2">Alternative card</article>
    </div>`);
  await service.call('pinvelto_update_feedback', {
    id: feedback.id, ...(promote ? { mode: 'variants' } : {}),
    variantsPayload: { container: `.${wrapper}`, attribute: 'data-pinvelto-active',
      variants: [{ value: '1', name: 'Original' }, { value: '2', name: 'Alternative' }], files: [project.file] }
  });
}

for (const explicit of [true, false]) {
  test(`${explicit ? 'explicit Variants choice finalizes' : 'comment intent discard restores'} real generated project code`, async ({ page, pinveltoService }, testInfo) => {
    test.setTimeout(90000);
    const app = await project();
    try {
      const upstream = await readFile(app.legacy, 'utf8');
      const feedback = await createRequest(page, pinveltoService, app.url, explicit);
      if (explicit) expect(feedback.mode).toBe('variants');
      else expect(feedback.variant_intent_detected).toBe(true);
      await generate(app, feedback, pinveltoService, !explicit);
      await testInfo.attach('generated-project.html', { body: await readFile(app.file), contentType: 'text/html' });
      await page.reload();
      const pin = page.locator(`.pinvelto-badge[data-annotation-id="${feedback.id}"]`);
      await expect(pin).toBeVisible({ timeout: 25000 });
      await page.locator('.pinvelto-tb-viewall').click();
      await expect(page.locator('.pinvelto-viewall-panel')).toContainText('Variants ready', { timeout: 25000 });
      await page.locator('.pinvelto-tb-viewall').click();
      await pin.click();
      await page.locator('input[name="pinvelto-variant"][value="2"]').check();
      await expect(page.getByText('Alternative card', { exact: true })).toBeVisible();
      await expect(page.getByText('Original card', { exact: true })).toBeHidden();
      await page.screenshot({ path: testInfo.outputPath('preview-alternative.png') });
      if (explicit) {
        await page.locator('.pinvelto-variants-choose').click();
        await expect(page.locator('.pinvelto-variants-choose')).toHaveText('Chosen ✓');
        await page.screenshot({ path: testInfo.outputPath('chosen-awaiting-finalize.png') });
      } else {
        await page.locator('.pinvelto-variants-delete').click();
        await expect(page.getByText('Original card', { exact: true })).toBeVisible();
        await expect(pin).toBeHidden();
      }
      let pending;
      await expect.poll(async () => {
        pending = (await pinveltoService.call('pinvelto_list_feedback', { url: `${new URL(app.url).origin}/*`, include_variants: explicit })).data[0];
        return pending?.status;
      }).toBe(explicit ? 'variant-chosen' : 'variants-discarded');
      expect(pending.variant_instructions).toContain(`pinvelto:scaffold ${feedback.id}`);
      expect(pending.variant_instructions).not.toMatch(/vibe-|data-vibe/);
      if (explicit) expect(pending.chosenVariant).toBe('2');
      // Apply the returned cleanup contract to actual code, then acknowledge MCP.
      await app.save(explicit ? '<article id="target">Alternative card</article>' : app.original);
      await pinveltoService.call('pinvelto_update_feedback', { id: feedback.id, status: 'resolved' });
      await page.reload();
      await expect(page.locator('#target')).toHaveText(explicit ? 'Alternative card' : 'Original card');
      await expect(pin).toHaveCount(0, { timeout: 25000 });
      expect(await readFile(app.file, 'utf8')).not.toContain('pinvelto:scaffold');
      expect(await readFile(app.file, 'utf8')).not.toContain('data-pinvelto-active');
      expect(await readFile(app.legacy, 'utf8')).toBe(upstream);
      await expect(page.locator('.pinvelto-toolbar-pill')).toBeHidden({ timeout: 25000 });
      const final = await pinveltoService.call('pinvelto_list_feedback', { status: 'all' });
      await testInfo.attach('final-project.html', { body: await readFile(app.file), contentType: 'text/html' });
      await testInfo.attach('mcp-terminal-feedback.json', { body: JSON.stringify(final), contentType: 'application/json' });
      expect(final.data.find(item => item.id === feedback.id).status).toBe('resolved');
      await page.screenshot({ path: testInfo.outputPath(explicit ? 'final-chosen.png' : 'discarded-restored.png') });
    } finally { await app.close(); }
  });
}
