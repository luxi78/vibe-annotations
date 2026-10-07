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

test('View all maintains continuous panel mount, scroll memory, focus, and avoids replaying entrance animations during site and filter switching', async ({ page, backgroundWorker }) => {
  await isolateServer(backgroundWorker);
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ annotations: [
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `local-${i}`, url: `${origin}/selected-rectangle.html`, comment: `Local note ${i + 1}`, status: 'open',
      })),
      { id: 'local-other-page', url: `${origin}/other-page.html`, comment: 'Other page note', status: 'open' },
      { id: 'site-b-1', url: 'http://localhost:5173/page1', comment: 'Site B note 1', status: 'open' },
      { id: 'site-b-2', url: 'http://localhost:5173/page2', comment: 'Site B note 2', status: 'open' },
    ] });
  }, FIXTURE_ORIGIN);

  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const root = page.locator('#vibe-annotations-root');
  await root.locator('.vibe-tb-viewall').click();

  const panel = root.locator('.vibe-viewall-panel');
  await expect(panel).toBeVisible();

  // Mark the initial mounted panel element and listen for animation starts
  await root.evaluate(el => {
    const p = el.shadowRoot.querySelector('.vibe-viewall-panel');
    p.dataset.mountMarker = 'session-1-panel';
    window.__animationReplayCount = 0;
    p.addEventListener('animationstart', () => { window.__animationReplayCount++; });
  });

  const list = root.locator('.vibe-viewall-routes');
  await expect(list).toBeVisible();

  // Scroll the list down on All filter
  await list.evaluate(el => { el.scrollTop = 80; });
  expect(await list.evaluate(el => el.scrollTop)).toBe(80);

  // 1. Switch filter tab to "This page"
  const currentTab = root.locator('.vibe-viewall-tab[data-filter="current"]');
  await currentTab.click();

  // Panel shell must remain the exact same element (not remounted)
  expect(await panel.evaluate(el => el.dataset.mountMarker)).toBe('session-1-panel');
  // Entrance animation must NOT have replayed
  expect(await page.evaluate(() => window.__animationReplayCount)).toBe(0);
  // Focus should remain on the active filter tab
  expect(await root.evaluate(el => el.shadowRoot.activeElement?.dataset.filter)).toBe('current');
  // First visit to This page starts at scroll 0
  expect(await list.evaluate(el => el.scrollTop)).toBe(0);

  // 2. Switch site to Site B
  const siteSelect = root.locator('.vibe-viewall-site-select');
  await expect(siteSelect).toBeVisible();
  await siteSelect.focus();
  await siteSelect.selectOption('http://localhost:5173');

  // Page URL must NOT have navigated
  expect(page.url()).toBe(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  // Panel shell remains the exact same element
  expect(await panel.evaluate(el => el.dataset.mountMarker)).toBe('session-1-panel');
  // No entrance animation replayed
  expect(await page.evaluate(() => window.__animationReplayCount)).toBe(0);
  // Site select retains focus
  expect(await root.evaluate(el => el.shadowRoot.activeElement?.classList.contains('vibe-viewall-site-select'))).toBe(true);

  // 3. Switch back to current site and back to "All" filter
  await siteSelect.selectOption(FIXTURE_ORIGIN);
  const allTab = root.locator('.vibe-viewall-tab[data-filter="all"]');
  await allTab.click();

  // Returning visit to All filter restores remembered scroll (80)
  expect(await list.evaluate(el => el.scrollTop)).toBe(80);
  expect(await panel.evaluate(el => el.dataset.mountMarker)).toBe('session-1-panel');
  expect(await page.evaluate(() => window.__animationReplayCount)).toBe(0);

  // 4. Rapid filter changes settle on the latest choice
  await currentTab.click();
  await allTab.click();
  await expect(root.locator('.vibe-viewall-tab.active')).toHaveAttribute('data-filter', 'all');
  expect(await list.locator('.vibe-viewall-card').count()).toBeGreaterThan(1);
  expect(await panel.evaluate(el => el.dataset.mountMarker)).toBe('session-1-panel');

  // 5. Explicit close ends the session; pending callbacks cannot reopen it
  await root.locator('.vibe-tb-viewall').click();
  await expect(panel).toBeHidden();
  await page.waitForTimeout(100);
  await expect(panel).toBeHidden();

  // 6. Reopening starts fresh on current site + All with scroll 0
  await root.locator('.vibe-tb-viewall').click();
  await expect(panel).toBeVisible();
  // New panel instance
  expect(await panel.evaluate(el => el.dataset.mountMarker || null)).toBe(null);
  expect(await root.locator('.vibe-viewall-tab.active').getAttribute('data-filter')).toBe('all');
  expect(await list.evaluate(el => el.scrollTop)).toBe(0);
});

test('View all refreshes incrementally on external storage changes, preserves unchanged card DOM, safely returns focus, and recovers from read failure in place', async ({ page, backgroundWorker }) => {
  await isolateServer(backgroundWorker);
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ annotations: [
      { id: 'card-a', url: `${origin}/selected-rectangle.html`, comment: 'Card A initial note', status: 'open' },
      { id: 'card-b', url: `${origin}/selected-rectangle.html`, comment: 'Card B initial note', status: 'open' },
      { id: 'card-other-site', url: 'http://localhost:5173/page1', comment: 'Other site note', status: 'open' },
    ] });
  }, FIXTURE_ORIGIN);

  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const root = page.locator('#vibe-annotations-root');
  await root.locator('.vibe-tb-viewall').click();

  const panel = root.locator('.vibe-viewall-panel');
  await expect(panel).toBeVisible();

  const cardA = panel.locator('.vibe-viewall-card[data-id="card-a"]');
  const cardB = panel.locator('.vibe-viewall-card[data-id="card-b"]');
  await expect(cardA).toBeVisible();
  await expect(cardB).toBeVisible();

  // Mark card-a DOM node to verify identity preservation
  await cardA.evaluate(el => { el.dataset.stableNode = 'true'; });

  // Focus card-b delete button (which will be removed externally)
  const cardBDelete = cardB.locator('.vibe-viewall-card-delete');
  await cardBDelete.focus();
  expect(await root.evaluate(el => el.shadowRoot.activeElement?.getAttribute('data-id'))).toBe('card-b');

  // External update: card-a remains, card-b is removed, card-c is added
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.set({ annotations: [
      { id: 'card-a', url: `${origin}/selected-rectangle.html`, comment: 'Card A initial note', status: 'open' },
      { id: 'card-c', url: `${origin}/selected-rectangle.html`, comment: 'Card C new note', status: 'open' },
      { id: 'card-other-site', url: 'http://localhost:5173/page1', comment: 'Other site note', status: 'open' },
    ] });
  }, FIXTURE_ORIGIN);

  // Card A must keep its exact DOM node
  await expect(panel.locator('.vibe-viewall-card[data-id="card-c"]')).toBeVisible();
  await expect(cardB).toHaveCount(0);
  expect(await cardA.evaluate(el => el.dataset.stableNode)).toBe('true');

  // Focus must have safely returned to active filter button, not a destructive button
  await expect.poll(async () => {
    return await root.evaluate(el => {
      const active = el.shadowRoot.activeElement;
      return active?.classList.contains('vibe-viewall-tab') && active?.classList.contains('active');
    });
  }).toBe(true);

  // In-place recoverable read failure: inject controlled failure attribute
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-vibe-storage-fail', 'true');
  });

  // External update while read is failing
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.set({ annotations: [
      { id: 'card-a', url: `${origin}/selected-rectangle.html`, comment: 'Card A initial note', status: 'open' },
      { id: 'card-d', url: `${origin}/selected-rectangle.html`, comment: 'Card D unseen', status: 'open' },
    ] });
  }, FIXTURE_ORIGIN);

  // Panel must retain last-good content and display error banner with retry button
  const errorBanner = panel.locator('.vibe-viewall-error');
  await expect(errorBanner).toBeVisible();
  await expect(cardA).toBeVisible();
  const retryBtn = errorBanner.locator('.vibe-viewall-retry');
  await expect(retryBtn).toBeVisible();

  // Remove failure attribute and click retry
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-vibe-storage-fail');
  });
  await retryBtn.click();

  // Error banner must disappear and new content must be rendered
  await expect(errorBanner).toHaveCount(0);
  await expect(panel.locator('.vibe-viewall-card[data-id="card-d"]')).toBeVisible();
});

test('View all preserves mount, selected site, and focus across individual deletion, route clear, site delete with confirmation, and clear-after-copy', async ({ page, backgroundWorker }) => {
  await isolateServer(backgroundWorker);
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      annotations: [
        { id: 'card-1', url: `${origin}/selected-rectangle.html`, comment: 'Route 1 Note 1', status: 'open' },
        { id: 'card-2', url: `${origin}/selected-rectangle.html`, comment: 'Route 1 Note 2', status: 'open' },
        { id: 'card-3', url: `${origin}/other-route`, comment: 'Route 2 Note', status: 'open' },
        { id: 'foreign-1', url: 'http://localhost:5173/page1', comment: 'Foreign Note 1', status: 'open' },
        { id: 'foreign-2', url: 'http://localhost:5173/page2', comment: 'Foreign Note 2', status: 'open' },
      ]
    });
  }, FIXTURE_ORIGIN);

  await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
  const root = page.locator('#vibe-annotations-root');
  await root.locator('.vibe-tb-viewall').click();

  const panel = root.locator('.vibe-viewall-panel');
  await expect(panel).toBeVisible();

  // Mark panel DOM node to assert no remounting or entrance animations
  await panel.evaluate(el => { el.dataset.stablePanel = 'true'; });

  // 1. Route clear on multi-annotation route (/selected-rectangle.html)
  const routeEl = panel.locator('.vibe-viewall-route[data-path="/selected-rectangle.html"]');
  await expect(routeEl).toBeVisible();
  const routeClearBtn = routeEl.locator('.vibe-viewall-route-clear');
  await expect(routeClearBtn).toBeVisible();
  await routeClearBtn.click();

  // Route 1 cards deleted in place, route 2 remains, panel shell stable
  await expect(routeEl).toHaveCount(0);
  await expect(panel.locator('.vibe-viewall-card[data-id="card-3"]')).toBeVisible();
  expect(await panel.evaluate(el => el.dataset.stablePanel)).toBe('true');

  // 2. Individual card deletion with keyboard focus safety on card-3
  const card3 = panel.locator('.vibe-viewall-card[data-id="card-3"]');
  const card3Delete = card3.locator('.vibe-viewall-card-delete');
  await card3Delete.focus();
  await card3Delete.click();

  // Focus safely returns to active filter tab, not an adjacent delete button
  await expect.poll(async () => {
    return await root.evaluate(el => {
      const active = el.shadowRoot.activeElement;
      return active?.classList.contains('vibe-viewall-tab') && active?.classList.contains('active');
    });
  }).toBe(true);

  // Current site is now emptied -> displays empty notice, panel remains mounted
  await expect(card3).toHaveCount(0);
  await expect(panel.locator('.vibe-viewall-empty')).toBeVisible();
  expect(await panel.evaluate(el => el.dataset.stablePanel)).toBe('true');

  // 3. Switch to foreign site via dropdown
  const siteSelect = panel.locator('.vibe-viewall-site-select');
  await expect(siteSelect).toBeVisible();
  await siteSelect.selectOption('http://localhost:5173');
  await expect(panel.locator('.vibe-viewall-card[data-id="foreign-1"]')).toBeVisible();
  await expect(panel.locator('.vibe-viewall-card[data-id="foreign-2"]')).toBeVisible();

  // Whole-site delete with confirmation dialogue (.vibe-viewall-deleteall)
  const deleteAllBtn = panel.locator('.vibe-viewall-deleteall');
  await deleteAllBtn.click();

  const confirmModal = root.locator('.vibe-confirm-backdrop');
  await expect(confirmModal).toBeVisible();
  await expect(confirmModal.locator('.vibe-confirm-msg')).toContainText('2 annotations');

  // Cancel keeps foreign annotations intact
  await confirmModal.locator('.vibe-confirm-no').click();
  await expect(confirmModal).toBeHidden();
  await expect(panel.locator('.vibe-viewall-card[data-id="foreign-1"]')).toBeVisible();

  // Click delete all again, then confirm
  await deleteAllBtn.click();
  await expect(confirmModal).toBeVisible();
  await confirmModal.locator('.vibe-confirm-yes').click();
  await expect(confirmModal).toBeHidden();

  // Foreign site annotations deleted, foreign site remains selected with empty state
  await expect(panel.locator('.vibe-viewall-empty')).toBeVisible();
  expect(await panel.evaluate(el => el.dataset.stablePanel)).toBe('true');
  expect(await siteSelect.evaluate(el => el.value)).toBe('http://localhost:5173');

  // Both sites remain present and selectable in site select
  const options = await siteSelect.evaluate(el => Array.from(el.options).map(o => o.value));
  expect(options).toContain('http://localhost:5173');
  expect(options).toContain(FIXTURE_ORIGIN);

  // 4. Test clear-after-copy: inject fresh annotation into current site
  await backgroundWorker.evaluate(async origin => {
    await chrome.storage.local.set({
      annotations: [{ id: 'copy-target', url: `${origin}/selected-rectangle.html`, comment: 'Copy target note', status: 'open' }],
      vibeClearOnCopy: true
    });
  }, FIXTURE_ORIGIN);

  // Switch to current site
  await siteSelect.selectOption(FIXTURE_ORIGIN);
  await expect(panel.locator('.vibe-viewall-card[data-id="copy-target"]')).toBeVisible();

  // Click Copy all
  const copyBtn = panel.locator('.vibe-viewall-copy');
  await copyBtn.focus();
  await copyBtn.click();

  // Card cleared, empty notice shown, panel shell continuously mounted
  await expect(panel.locator('.vibe-viewall-empty')).toBeVisible();
  expect(await panel.evaluate(el => el.dataset.stablePanel)).toBe('true');
  // Copy button retained focus
  expect(await root.evaluate(el => el.shadowRoot.activeElement?.classList.contains('vibe-viewall-copy'))).toBe(true);
});
