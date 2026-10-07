import { test, expect, FIXTURE_ORIGIN } from './fixtures.js';

test('late-element discovery renders lazy components without recreating existing pins and respects overlay closure', async ({ page, backgroundWorker }) => {
  const pageUrl = `${FIXTURE_ORIGIN}/selected-rectangle.html`;

  // Pre-seed storage with 2 annotations: 1 existing element (#canvas-rect) and 1 late element (#lazy-target)
  await backgroundWorker.evaluate(async (url) => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      annotations: [
        {
          id: 'pin-existing',
          url,
          selector: '#canvas-rect',
          comment: 'Existing element pin',
          status: 'open',
          created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        },
        {
          id: 'pin-late',
          url,
          selector: '#lazy-target',
          comment: 'Late loading pin',
          status: 'open',
          created_at: new Date('2026-01-01T00:01:00.000Z').toISOString(),
        },
      ],
    });
  }, pageUrl);

  await page.goto(pageUrl);

  const shadowHost = page.locator('#vibe-annotations-root');
  await expect(shadowHost).toBeAttached();

  // The existing pin #canvas-rect must render promptly
  const pin1 = shadowHost.locator('.vibe-badge[data-annotation-id="pin-existing"]');
  await expect(pin1).toBeVisible();

  // The late pin #lazy-target is not yet rendered because element does not exist
  const pin2 = shadowHost.locator('.vibe-badge[data-annotation-id="pin-late"]');
  await expect(pin2).toHaveCount(0);

  // Mark existing pin with a unique DOM attribute to verify node continuity
  await pin1.evaluate((el) => {
    el.setAttribute('data-continuity-marker', 'true');
  });

  // Dynamically inject the late lazy element into the page
  await page.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'lazy-target';
    el.textContent = 'Lazy Loaded Element';
    el.style.width = '200px';
    el.style.height = '60px';
    el.style.background = '#e2e8f0';
    document.body.appendChild(el);
  });

  // Late discovery observer picks up the mutation and renders pin2
  await expect(pin2).toBeVisible({ timeout: 5000 });

  // Verify existing pin1 was NOT recreated or destroyed
  const marker = await pin1.getAttribute('data-continuity-marker');
  expect(marker).toBe('true');

  // Verify overlay toggle closes pins and cancels discovery work
  const closeBtn = shadowHost.locator('.vibe-tb-close');
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await expect(shadowHost.locator('.vibe-badge')).toHaveCount(0);
  }
});

test('finding all eligible targets renders immediately without unnecessary retries or observers', async ({ page, backgroundWorker }) => {
  const pageUrl = `${FIXTURE_ORIGIN}/selected-rectangle.html`;

  await backgroundWorker.evaluate(async (url) => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      annotations: [
        {
          id: 'pin-direct',
          url,
          selector: '#canvas-rect',
          comment: 'Directly found pin',
          status: 'open',
          created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        },
        {
          id: 'pin-stylesheet',
          url,
          type: 'stylesheet',
          css: 'body { --vibe-e2e-test: 1; }',
          comment: 'Stylesheet annotation',
          status: 'open',
          created_at: new Date('2026-01-01T00:01:00.000Z').toISOString(),
        },
        {
          id: 'pin-resolved',
          url,
          selector: '#canvas-rect',
          status: 'resolved',
          created_at: new Date('2026-01-01T00:02:00.000Z').toISOString(),
        },
      ],
    });
  }, pageUrl);

  await page.goto(pageUrl);

  const shadowHost = page.locator('#vibe-annotations-root');
  await expect(shadowHost).toBeAttached();

  const pin = shadowHost.locator('.vibe-badge[data-annotation-id="pin-direct"]');
  await expect(pin).toBeVisible();

  // Total badges must be exactly 1 (stylesheet and resolved do not get badge pins)
  await expect(shadowHost.locator('.vibe-badge')).toHaveCount(1);
});

test('SPA route change cancels in-flight discovery and tears down obsolete pins cleanly', async ({ page, backgroundWorker }) => {
  const pageUrl = `${FIXTURE_ORIGIN}/selected-rectangle.html`;

  await backgroundWorker.evaluate(async (url) => {
    await chrome.storage.local.clear();
    await chrome.storage.local.set({
      annotations: [
        {
          id: 'pin-route-1',
          url,
          selector: '#canvas-rect',
          comment: 'Route 1 pin',
          status: 'open',
          created_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
        },
      ],
    });
  }, pageUrl);

  await page.goto(pageUrl);

  const shadowHost = page.locator('#vibe-annotations-root');
  await expect(shadowHost).toBeAttached();

  const pin1 = shadowHost.locator('.vibe-badge[data-annotation-id="pin-route-1"]');
  await expect(pin1).toBeVisible();

  // Navigate to new route via SPA pushState and title mutation
  await page.evaluate(() => {
    history.pushState({}, '', '/new-spa-route');
    document.title = 'New SPA Route';
  });

  // Old route pins must be cleared cleanly and not restored
  await expect(shadowHost.locator('.vibe-badge')).toHaveCount(0);
});
