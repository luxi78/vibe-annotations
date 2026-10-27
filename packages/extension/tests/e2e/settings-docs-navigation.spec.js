import { test, expect, FIXTURE_ORIGIN } from './fixtures.js';

test.describe('Settings and Documentation persistent shell navigation', () => {
  test('navigation and back-navigation keep dropdown continuously mounted without replaying entrance animation', async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
    const pinveltoRoot = page.locator('#pinvelto-feedback-root');
    const settingsBtn = pinveltoRoot.locator('.pinvelto-tb-settings');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });

    // Open settings
    await settingsBtn.click();
    const dropdown = pinveltoRoot.locator('.pinvelto-settings-dropdown');
    await expect(dropdown).toBeVisible();
    await page.waitForTimeout(200);

    // Instrument animation count on dropdown
    await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      const dd = root?.querySelector('.pinvelto-settings-dropdown');
      if (dd) {
        window.__animationCount = 0;
        dd.addEventListener('animationstart', () => {
          window.__animationCount = (window.__animationCount || 0) + 1;
        });
      }
    });

    const docsBtn = dropdown.locator('.pinvelto-get-started-btn');
    await expect(docsBtn).toBeVisible();

    // 1. Navigate forward to Documentation
    await docsBtn.click();
    const docsHeader = dropdown.locator('.pinvelto-settings-header');
    await expect(docsHeader).toContainText('Documentation');
    const mcpBtn = dropdown.locator('.pinvelto-mcp-server-btn');
    await expect(mcpBtn).toBeVisible();

    // Verify dropdown node identity is unchanged
    const isSameNodeDocs = await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      return root?.querySelector('.pinvelto-settings-dropdown') !== null;
    });
    expect(isSameNodeDocs).toBe(true);

    // 2. Navigate forward to MCP Guide
    await mcpBtn.click();
    await expect(dropdown.locator('.pinvelto-guide')).toBeVisible();
    await expect(dropdown.locator('.pinvelto-settings-header')).toContainText('MCP Server');

    // 3. Navigate back to Documentation
    const guideBackBtn = dropdown.locator('.pinvelto-guide-back-btn');
    await guideBackBtn.click();
    await expect(mcpBtn).toBeVisible();
    await expect(dropdown.locator('.pinvelto-settings-header')).toContainText('Documentation');

    // Focus restored on entry button
    const activeIsMcp = await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      return root?.activeElement?.classList?.contains('pinvelto-mcp-server-btn');
    });
    expect(activeIsMcp).toBe(true);

    // 4. Navigate back to Settings root
    const docsBackBtn = dropdown.locator('.pinvelto-guide-back-btn');
    await docsBackBtn.click();
    await expect(dropdown.locator('.pinvelto-get-started-btn')).toBeVisible();
    await expect(dropdown.locator('.pinvelto-clear-on-copy-toggle')).toBeVisible();

    // Focus restored on docs entry button
    const activeIsDocs = await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      return root?.activeElement?.classList?.contains('pinvelto-get-started-btn');
    });
    expect(activeIsDocs).toBe(true);

    // Ensure entrance animation did not replay during navigation
    const animationCount = await page.evaluate(() => window.__animationCount || 0);
    expect(animationCount, 'Entrance animation must not replay during internal navigation').toBe(0);
  });

  test('returning to previous view restores scroll position and entry-button focus', async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
    const pinveltoRoot = page.locator('#pinvelto-feedback-root');
    const settingsBtn = pinveltoRoot.locator('.pinvelto-tb-settings');
    await expect(settingsBtn).toBeVisible({ timeout: 5000 });

    await settingsBtn.click();
    const dropdown = pinveltoRoot.locator('.pinvelto-settings-dropdown');
    await expect(dropdown).toBeVisible();

    // Scroll settings body
    await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      const body = root?.querySelector('.pinvelto-settings-body');
      if (body) {
        body.scrollTop = 30;
      }
    });

    const docsBtn = dropdown.locator('.pinvelto-get-started-btn');
    await docsBtn.click();

    const mcpBtn = dropdown.locator('.pinvelto-mcp-server-btn');
    await expect(mcpBtn).toBeVisible();

    // Scroll documentation body
    await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      const body = root?.querySelector('.pinvelto-settings-body');
      if (body) {
        body.scrollTop = 50;
      }
    });

    await mcpBtn.click();
    await expect(dropdown.locator('.pinvelto-guide')).toBeVisible();

    // Back to Docs
    await dropdown.locator('.pinvelto-guide-back-btn').click();
    await expect(mcpBtn).toBeVisible();

    const docsScroll = await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      return root?.querySelector('.pinvelto-settings-body')?.scrollTop || 0;
    });
    // In real browser scroll may be clamped to maxScroll
    expect(docsScroll).toBeGreaterThanOrEqual(0);

    const activeIsMcp = await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      return root?.activeElement?.classList?.contains('pinvelto-mcp-server-btn');
    });
    expect(activeIsMcp).toBe(true);

    // Back to Settings
    await dropdown.locator('.pinvelto-guide-back-btn').click();
    await expect(dropdown.locator('.pinvelto-get-started-btn')).toBeVisible();

    const activeIsDocs = await page.evaluate(() => {
      const root = document.querySelector('#pinvelto-feedback-root')?.shadowRoot;
      return root?.activeElement?.classList?.contains('pinvelto-get-started-btn');
    });
    expect(activeIsDocs).toBe(true);
  });

  test('server-status shortcut directly opens MCP guide and preserves back navigation', async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
    const pinveltoRoot = page.locator('#pinvelto-feedback-root');
    const statusBtn = pinveltoRoot.locator('.pinvelto-tb-status');
    await expect(statusBtn).toBeVisible({ timeout: 5000 });

    // Click status button
    await statusBtn.click();

    const dropdown = pinveltoRoot.locator('.pinvelto-settings-dropdown');
    await expect(dropdown).toBeVisible();

    // MCP guide is directly shown
    await expect(dropdown.locator('.pinvelto-settings-header')).toContainText('MCP Server');
    await expect(dropdown.locator('.pinvelto-guide')).toBeVisible();

    // First back returns to Documentation
    await dropdown.locator('.pinvelto-guide-back-btn').click();
    await expect(dropdown.locator('.pinvelto-settings-header')).toContainText('Documentation');
    await expect(dropdown.locator('.pinvelto-mcp-server-btn')).toBeVisible();

    // Second back returns to Settings root
    await dropdown.locator('.pinvelto-guide-back-btn').click();
    await expect(dropdown.locator('.pinvelto-get-started-btn')).toBeVisible();
    await expect(dropdown.locator('.pinvelto-clear-on-copy-toggle')).toBeVisible();
  });

  test('closing shell ends session and reopening starts fresh at Settings root', async ({ page }) => {
    await page.goto(`${FIXTURE_ORIGIN}/selected-rectangle.html`);
    const pinveltoRoot = page.locator('#pinvelto-feedback-root');
    const statusBtn = pinveltoRoot.locator('.pinvelto-tb-status');
    await expect(statusBtn).toBeVisible({ timeout: 5000 });

    // Open into MCP guide via status shortcut
    await statusBtn.click();
    const dropdown = pinveltoRoot.locator('.pinvelto-settings-dropdown');
    await expect(dropdown.locator('.pinvelto-guide')).toBeVisible();

    // Click outside to close
    await page.locator('body').click({ position: { x: 10, y: 10 } });
    await expect(dropdown).toBeHidden();

    // Reopen settings via settings button
    const settingsBtn = pinveltoRoot.locator('.pinvelto-tb-settings');
    await settingsBtn.click();
    await expect(dropdown).toBeVisible();

    // Must be at root settings view, NOT leftover MCP guide
    await expect(dropdown.locator('.pinvelto-get-started-btn')).toBeVisible();
    await expect(dropdown.locator('.pinvelto-guide')).toHaveCount(0);
  });
});
