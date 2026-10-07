import { test, expect, FIXTURE_ORIGIN, enterAnnotateMode, openPopover } from './fixtures.js';

// Keep tests isolated from the user's MCP server. The real extension runs; only
// the network boundary is replaced in this test's disposable service worker.
async function isolateServer(worker) {
  await worker.evaluate(() => {
    const originalFetch = self.fetch.bind(self);
    self.fetch = (input, options) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.startsWith('http://127.0.0.1:3846/')) {
        return Promise.resolve(new Response('{}', { status: 503 }));
      }
      return originalFetch(input, options);
    };
  });
}

test('toolbar counts every site across navigation and external storage changes', async ({ page, backgroundWorker }) => {
  await isolateServer(backgroundWorker);
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ annotations: [
      { id: 'local', url: `${origin}/selected-rectangle.html`, selector: '#canvas-rect', status: 'open' },
      { id: 'other-page', url: `${origin}/other-page`, status: 'open' },
      { id: 'other-site', url: 'https://example.com/feedback', status: 'open' },
      { id: 'resolved', url: 'https://example.com/done', status: 'resolved' },
    ] });
  }, FIXTURE_ORIGIN);
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const root = page.locator('#vibe-annotations-root');
  const pill = root.locator('.vibe-tb-viewall .vibe-toolbar-pill');
  await expect(pill).toBeVisible();
  await expect(pill).toHaveText('3');
  await expect(root.locator('.vibe-tb-annotate .vibe-toolbar-pill')).toHaveCount(0);

  // An empty current route must not erase annotations on other routes or sites.
  await page.evaluate(() => {
    history.pushState({}, '', '/empty-route');
    document.title = 'Empty route';
  });
  await expect(pill).toHaveText('3');

  // An update from another tab/server need not render any local page pins.
  await backgroundWorker.evaluate(async () => {
    const { annotations } = await chrome.storage.local.get(['annotations']);
    annotations.push({ id: 'foreign-new', url: 'https://another.example/new', status: 'open' });
    await chrome.storage.local.set({ annotations });
  });
  await expect(pill).toHaveText('4');
  await backgroundWorker.evaluate(async () => {
    const { annotations } = await chrome.storage.local.get(['annotations']);
    await chrome.storage.local.set({ annotations: annotations.filter(a => !a.url.startsWith('http://127.0.0.1:3005')) });
  });
  await expect(pill).toBeVisible();
  await expect(pill).toHaveText('2');
  await backgroundWorker.evaluate(async () => { await chrome.storage.local.set({ annotations: [] }); });
  await expect(pill).toBeHidden();
});

test('global footer deletion confirms all sites, hard-clears variants and leaves generated content alone', async ({ page, backgroundWorker, context }) => {
  await isolateServer(backgroundWorker);
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.clear();
    const annotations = [
      { id: 'local', url: `${origin}/selected-rectangle.html`, selector: '#canvas-rect', status: 'open' },
      { id: 'other', url: 'https://example.com/a', status: 'open' },
      { id: 'resolved', url: 'https://example.com/done', status: 'resolved' },
      { id: 'variant', url: 'http://localhost:5173/v', mode: 'variants', variantsPayload: {}, status: 'variants-discarded' },
    ];
    await chrome.storage.local.set({ annotations, vibeSkipDeleteConfirm: true });
    self.__clearRequests = [];
    self.__serverAnnotations = annotations;
    const originalFetch = self.fetch.bind(self);
    self.fetch = (input, options) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === 'http://127.0.0.1:3846/api/annotations/purge' && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        self.__clearRequests.push(body);
        self.__serverAnnotations = self.__serverAnnotations.filter(annotation => !body.ids.includes(annotation.id));
        return Promise.resolve(Response.json({ success: true, purged_ids: body.ids }));
      }
      if (url === 'http://127.0.0.1:3846/api/annotations/sync' && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        self.__serverAnnotations = body.annotations;
        return Promise.resolve(Response.json({ success: true, count: body.annotations.length }));
      }
      return originalFetch(input, options);
    };
  }, FIXTURE_ORIGIN);
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const otherPage = await context.newPage();
  await otherPage.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html?other-tab`);
  const root = page.locator('#vibe-annotations-root');
  await root.locator('.vibe-tb-viewall').click();
  const panel = root.locator('.vibe-viewall-panel');
  const footer = panel.locator('.vibe-viewall-footer');
  const button = footer.getByRole('button', { name: 'Delete all annotations across all sites', exact: true });
  await expect(button).toBeVisible();
  await expect(button).toHaveText('');
  await expect(footer.locator('.vibe-viewall-global-caption')).toHaveText('Delete all annotations across all sites');
  await expect(panel.locator('.vibe-viewall-header .vibe-viewall-delete-global')).toHaveCount(0);
  await expect(button.locator('svg')).toHaveCount(1);
  await panel.locator('.vibe-viewall-tab[data-filter="current"]').click();
  await page.locator('#canvas-rect').evaluate(el => { el.dataset.generatedCode = 'keep-me'; });
  const before = await page.locator('#canvas-rect').textContent();

  await button.click();
  const confirm = root.locator('.vibe-confirm-backdrop');
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText('4 annotations');
  await expect(confirm).toContainText('all sites');
  expect(await backgroundWorker.evaluate(() => self.__clearRequests.length)).toBe(0);
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await backgroundWorker.evaluate(async () => (await chrome.storage.local.get(['annotations'])).annotations.length)).toBe(4);

  await button.click();
  await expect(confirm).toContainText('Generated code will not be changed');
  await confirm.getByRole('button', { name: 'Delete All', exact: true }).click();
  await expect.poll(() => backgroundWorker.evaluate(async () => (await chrome.storage.local.get(['annotations'])).annotations.length)).toBe(0);
  await expect(button).toBeDisabled();
  await expect(root.locator('.vibe-toolbar-pill')).toBeHidden();
  await expect(otherPage.locator('#vibe-annotations-root').locator('.vibe-toolbar-pill')).toBeHidden();
  await expect(root.locator('.vibe-badge')).toHaveCount(0);
  await expect.poll(() => backgroundWorker.evaluate(() => self.__serverAnnotations.length)).toBe(0);
  expect(await backgroundWorker.evaluate(() => self.__clearRequests)).toEqual([{ ids: ['local', 'other', 'resolved', 'variant'], confirm: true }]);
  await expect(page.locator('#canvas-rect')).toHaveAttribute('data-generated-code', 'keep-me');
  expect(await page.locator('#canvas-rect').textContent()).toBe(before);

  // A deliberate import is a restore, unlike an old in-flight server write.
  await backgroundWorker.evaluate(async origin => {
    const [tab] = await chrome.tabs.query({ url: `${origin}/selected-rectangle.html` });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id }, args: [origin],
      func: async restoredOrigin => chrome.runtime.sendMessage({ action: 'importAnnotations', annotations: [
        { id: 'local', url: `${restoredOrigin}/selected-rectangle.html`, selector: '#canvas-rect', status: 'open' },
      ] }),
    });
  }, FIXTURE_ORIGIN);
  const history = await backgroundWorker.evaluate(async () => (await chrome.storage.local.get(['purgedAnnotationIds'])).purgedAnnotationIds);
  expect(history).not.toContain('local');
  expect(history).toContain('variant');
});

test('the global footer remains visible while a long annotation list scrolls', async ({ page, backgroundWorker }, testInfo) => {
  await isolateServer(backgroundWorker);
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ annotations: Array.from({ length: 30 }, (_, i) => ({
      id: `long-${i}`, url: `${origin}/notes`, comment: `Annotation ${i + 1}`, status: 'open',
    })) });
  }, FIXTURE_ORIGIN);
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const root = page.locator('#vibe-annotations-root');
  await root.locator('.vibe-tb-viewall').click();
  const footer = root.locator('.vibe-viewall-footer');
  const button = footer.getByRole('button', { name: 'Delete all annotations across all sites', exact: true });
  await expect(button).toBeVisible();
  expect(await button.evaluate(el => ({ width: el.offsetWidth, height: el.offsetHeight, text: el.textContent.trim() })))
    .toEqual({ width: 28, height: 28, text: '' });
  const layout = await footer.locator('.vibe-viewall-global-action').evaluate(el => {
    const label = el.querySelector('.vibe-viewall-global-caption').getBoundingClientRect();
    const icon = el.querySelector('.vibe-viewall-delete-global').getBoundingClientRect();
    return { labelRight: label.right, iconLeft: icon.left };
  });
  expect(layout.labelRight).toBeLessThanOrEqual(layout.iconLeft);
  // Compare layout coordinates, not viewport Y while the panel's entrance
  // transform is still animating. Scrolling the list must not move the footer.
  const before = await footer.evaluate(el => el.offsetTop);
  const list = root.locator('.vibe-viewall-routes');
  expect(await list.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await list.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect(button).toBeVisible();
  expect(await footer.evaluate(el => el.offsetTop)).toBe(before);
  const after = await footer.boundingBox();
  expect(after.y + after.height).toBeLessThanOrEqual(page.viewportSize().height);
  const screenshot = testInfo.outputPath('global-delete-footer.png');
  await root.locator('.vibe-viewall-panel').screenshot({ path: screenshot });
  await testInfo.attach('global-delete-footer', { path: screenshot, contentType: 'image/png' });
});

test('screenshot processing rejects an external URL instead of fetching it', async ({ page, backgroundWorker }) => {
  await isolateServer(backgroundWorker);
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  await expect(page.locator('.vibe-toolbar')).toBeVisible();
  await backgroundWorker.evaluate(() => {
    self.fetch = async () => { throw new Error('Unexpected URL fetch'); };
  });
  const response = await backgroundWorker.evaluate(async origin => {
    const [tab] = await chrome.tabs.query({ url: `${origin}/*` });
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => chrome.runtime.sendMessage({
        action: 'captureAnnotationScreenshot', id: 'invalid',
        crop: { sx: 0, sy: 0, sw: 1, sh: 1 }, dataUrl: 'https://example.com/not-a-screenshot',
      }),
    });
    return result.result;
  }, FIXTURE_ORIGIN);
  expect(response.success).toBe(false);
  expect(response.error).toBe('Invalid screenshot data');
});

test('automatic capture restores the toolbar before a delayed upload finishes', async ({ page, backgroundWorker }) => {
  await isolateServer(backgroundWorker);
  await backgroundWorker.evaluate(async () => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ screenshotEnabled: true });

    // Native capture permission/UI is outside this test. Supply a real PNG at
    // that boundary, retaining the actual crop, webp conversion and upload path.
    const canvas = new OffscreenCanvas(1920, 1080);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#123456';
    ctx.fillRect(0, 0, 1920, 1080);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const dataUrl = `data:image/png;base64,${btoa(binary)}`;
    self.__captureStarted = false;
    self.__uploadStarted = false;
    chrome.tabs.captureVisibleTab = () => {
      self.__captureStarted = true;
      return new Promise(resolve => { self.__releaseCapture = () => resolve(dataUrl); });
    };
    const originalFetch = self.fetch.bind(self);
    self.fetch = (input, options) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.startsWith('http://127.0.0.1:3846/') && url.endsWith('/attachments')) {
        self.__uploadStarted = true;
        self.__uploadMime = options.body.type;
        self.__uploadBytes = options.body.size;
        return new Promise(resolve => {
          self.__releaseUpload = () => resolve(Response.json({
            attachment: { id: 'captured', kind: 'capture', mime: 'image/webp' },
          }));
        });
      }
      return originalFetch(input, options);
    };
  });
  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  await enterAnnotateMode(page);
  const { textarea } = await openPopover(page);
  await textarea.fill('Capture this rectangle');
  await page.keyboard.press('Control+Enter');
  const toolbar = page.locator('#vibe-annotations-root').locator('.vibe-toolbar');
  await expect.poll(() => backgroundWorker.evaluate(() => self.__captureStarted)).toBe(true);
  await expect(toolbar).toBeHidden();
  try {
    await backgroundWorker.evaluate(() => self.__releaseCapture());
    await expect.poll(() => backgroundWorker.evaluate(() => self.__uploadStarted)).toBe(true);
    await expect(toolbar).toBeVisible();
    const upload = await backgroundWorker.evaluate(() => ({ mime: self.__uploadMime, size: self.__uploadBytes }));
    expect(upload.mime).toBe('image/webp');
    expect(upload.size).toBeGreaterThan(0);
  } finally {
    await backgroundWorker.evaluate(() => self.__releaseUpload?.());
  }
  await expect.poll(() => backgroundWorker.evaluate(async () => {
    const { annotations = [] } = await chrome.storage.local.get(['annotations']);
    return annotations[0]?.attachments?.[0]?.id;
  })).toBe('captured');
  await expect(toolbar).toBeVisible();
});
