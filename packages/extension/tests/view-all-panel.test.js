import test from 'node:test';
import assert from 'node:assert';

// Mock storage
const mockStorage = {
  annotations: [],
  skipDeleteConfirm: true // auto-confirm for tests
};

globalThis.chrome = {
  storage: {
    local: {
      get: async (keys) => {
        const result = {};
        for (const k of keys) {
          result[k] = mockStorage[k];
        }
        return result;
      },
      set: async (items) => {
        Object.assign(mockStorage, items);
      }
    }
  },
  runtime: {
    getURL: (path) => `chrome-extension://mock/${path}`,
    sendMessage: async (msg) => {
      if (msg.action === 'deleteAnnotation') {
        const idx = mockStorage.annotations.findIndex(a => a.id === msg.id);
        if (idx !== -1) mockStorage.annotations.splice(idx, 1);
        return { success: true };
      }
      return { success: true };
    },
    getManifest: () => ({ version: '2.0.2' })
  }
};

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.id = '';
    this.className = '';
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.dataset = {};
    this.offsetWidth = 200;
    this.offsetHeight = 40;
    this._listeners = {};
    this._innerHTML = '';
    this._value = '';
    this.scrollIntoViewCalls = 0;
    this.classList = {
      add: (cls) => {
        const classes = new Set((this.className || '').split(' ').filter(Boolean));
        classes.add(cls);
        this.className = Array.from(classes).join(' ');
      },
      remove: (cls) => {
        const classes = new Set((this.className || '').split(' ').filter(Boolean));
        classes.delete(cls);
        this.className = Array.from(classes).join(' ');
      },
      toggle: (cls, force) => {
        const classes = new Set((this.className || '').split(' ').filter(Boolean));
        const shouldAdd = force !== undefined ? !!force : !classes.has(cls);
        if (shouldAdd) classes.add(cls);
        else classes.delete(cls);
        this.className = Array.from(classes).join(' ');
        return shouldAdd;
      },
      contains: (cls) => (this.className || '').split(' ').includes(cls)
    };
  }

  get value() {
    if (this.tagName === 'SELECT') {
      const selected = this.children.find(c => c.tagName === 'OPTION' && (c.selected || c.attributes.selected !== undefined));
      return this._value || (selected ? selected.value : (this.children[0]?.value || ''));
    }
    return this._value;
  }

  set value(val) {
    this._value = val;
    if (this.tagName === 'SELECT') {
      for (const child of this.children) {
        if (child.tagName === 'OPTION') {
          child.selected = (child.value === val);
        }
      }
    }
  }

  get options() {
    return this.children.filter(c => c.tagName === 'OPTION');
  }

  scrollIntoView() {
    this.scrollIntoViewCalls++;
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name === 'class') this.className = String(val);
    if (name === 'id') this.id = String(val);
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[key] = String(val);
    }
  }

  getAttribute(name) {
    if (name === 'class') return this.className;
    if (name === 'id') return this.id;
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  hasAttribute(name) {
    return this.attributes[name] !== undefined;
  }

  closest(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.classList && this.classList.contains(cls)) return this;
    }
    return this.parentNode?.closest ? this.parentNode.closest(sel) : null;
  }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) this.children.splice(idx, 1);
    child.parentNode = null;
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  addEventListener(type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  }

  removeEventListener(type, fn) {
    if (this._listeners[type]) {
      this._listeners[type] = this._listeners[type].filter(f => f !== fn);
    }
  }

  dispatchEvent(event) {
    const fns = this._listeners[event.type] || [];
    for (const fn of fns) {
      fn(event);
    }
  }

  click() {
    this.dispatchEvent({
      type: 'click',
      target: this,
      currentTarget: this,
      stopPropagation: () => {},
      preventDefault: () => {},
      closest: (sel) => this.closest(sel)
    });
  }

  querySelector(sel) {
    const results = this.querySelectorAll(sel);
    return results.length > 0 ? results[0] : null;
  }

  get textContent() {
    if (this.children.length === 0) return this._textContent !== undefined ? this._textContent : (this._innerHTML || '');
    return this.children.map(c => c.textContent).join('');
  }

  set textContent(val) {
    this._textContent = String(val);
    this._innerHTML = String(val);
    this.children = [];
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    parseHTML(html, this);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  querySelectorAll(sel) {
    const results = [];
    const match = (el) => {
      const parts = sel.split(/(?=[.#[])/);
      return parts.every(part => {
        if (part.startsWith('.')) return el.classList && el.classList.contains(part.slice(1));
        if (part.startsWith('#')) return el.id === part.slice(1);
        if (part.startsWith('[')) {
          const attrContent = part.slice(1, -1);
          const eqIdx = attrContent.indexOf('=');
          if (eqIdx !== -1) {
            const attrName = attrContent.slice(0, eqIdx);
            const attrVal = attrContent.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
            return el.getAttribute(attrName) === attrVal;
          }
          return el.hasAttribute(attrContent);
        }
        return el.tagName.toLowerCase() === part.toLowerCase();
      });
    };

    const traverse = (el) => {
      for (const child of el.children || []) {
        if (match(child)) results.push(child);
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  getBoundingClientRect() {
    return { left: 100, top: 100, right: 300, bottom: 140, width: 200, height: 40 };
  }
}

function parseHTML(html, rootParent) {
  const stack = [rootParent];
  const tokenRegex = /<!--[\s\S]*?-->|<(\/)?([a-zA-Z0-9-]+)([^>]*?)(\/)?>|([^<]+)/g;
  let match;
  while ((match = tokenRegex.exec(html)) !== null) {
    if (match[0].startsWith('<!--')) continue;
    const isClose = !!match[1];
    const tagName = match[2];
    const attrsStr = match[3] || '';
    const isSelfClosing = !!match[4] || ['input', 'img', 'br', 'hr'].includes((tagName || '').toLowerCase());
    const text = match[5];

    const currentParent = stack[stack.length - 1];

    if (text) {
      const trimmed = text.trim();
      if (trimmed && currentParent) {
        currentParent.textContent = (currentParent.textContent || '') + trimmed;
      }
      continue;
    }

    if (isClose) {
      if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName.toLowerCase()) {
        const popped = stack.pop();
        if (popped.tagName === 'OPTION' && !popped.value) {
          popped.value = popped.textContent;
        }
      }
      continue;
    }

    if (tagName.toLowerCase() === 'svg') {
      const svgEl = new MockElement('svg');
      parseAttributes(attrsStr, svgEl);
      if (currentParent) currentParent.appendChild(svgEl);
      continue;
    }

    const el = new MockElement(tagName);
    parseAttributes(attrsStr, el);
    if (currentParent) currentParent.appendChild(el);
    if (tagName.toLowerCase() === 'option') {
      el.value = el.getAttribute('value') || '';
      if (attrsStr.includes('selected')) el.selected = true;
    }

    if (!isSelfClosing) {
      stack.push(el);
    }
  }
}

function parseAttributes(attrStr, el) {
  const attrRegex = /([a-zA-Z0-9-]+)(?:="([^"]*)")?/g;
  let m;
  while ((m = attrRegex.exec(attrStr)) !== null) {
    const name = m[1];
    const val = m[2] !== undefined ? m[2] : '';
    el.setAttribute(name, val);
  }
}

// Global mocks
const origSetInterval = globalThis.setInterval;
globalThis.setInterval = (...args) => {
  const timer = origSetInterval(...args);
  if (timer && typeof timer.unref === 'function') timer.unref();
  return timer;
};

const rootElement = new MockElement('div');
rootElement.style.setProperty = () => {};
const shadowRootMock = new MockElement('div');
shadowRootMock.host = rootElement;
const testPageElements = {};

globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  location: {
    origin: 'http://localhost:3000',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    href: 'http://localhost:3000/page1'
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => { cb(); return 1; },
  cancelAnimationFrame: () => {}
};

globalThis.document = {
  createElement: (tag) => new MockElement(tag),
  body: rootElement,
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: (sel) => testPageElements[sel] || null
};

try {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: { writeText: async (t) => { globalThis.__copiedText = t; } },
    configurable: true
  });
} catch (_) {}

const { default: VibeShadowHost } = await import('../lib/content/shadow-host.js');
VibeShadowHost.getRoot = () => shadowRootMock;

const { default: VibeAPI } = await import('../lib/content/api-bridge.js');
const { default: VibeEvents } = await import('../lib/content/event-bus.js');
const { default: VibeToolbar } = await import('../lib/content/floating-toolbar.js');

test('View all cross-site lifecycle and UI', async (t) => {
  await VibeToolbar.init();

  t.beforeEach(() => {
    VibeToolbar.closeViewAll();
    mockStorage.annotations = [];
    globalThis.__copiedText = '';
  });

  await t.test('single site displays simple site heading and no selector', async () => {
    // Only annotations on the current site
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:3000/page1', comment: 'Local note', status: 'open' }
    ];

    await VibeToolbar.openViewAll();
    const panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel, 'View all panel should be open');

    const heading = panel.querySelector('.vibe-viewall-url');
    assert.ok(heading, 'Simple site heading must be present');
    assert.strictEqual(heading.textContent, 'localhost:3000');

    const selector = panel.querySelector('.vibe-viewall-site-select');
    assert.strictEqual(selector, null, 'No site selector when only current site is available');
    assert.strictEqual(panel.querySelector('.vibe-viewall-route-clear'), null, 'A one-item route must not duplicate the card delete action');
    assert.ok(panel.querySelector('.vibe-viewall-card-delete'), 'The annotation keeps its individual delete action');
  });

  await t.test('route clear is available only when a route contains multiple annotations', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:3000/page1', comment: 'First note', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page1', comment: 'Second note', status: 'open' }
    ];

    await VibeToolbar.openViewAll();
    const panel = VibeToolbar.getViewAllPanel();

    assert.ok(panel.querySelector('.vibe-viewall-route-clear'), 'A multi-item route offers one group delete action');
    assert.strictEqual(panel.querySelectorAll('.vibe-viewall-card-delete').length, 2, 'Each annotation remains individually deletable');
  });

  await t.test('multiple sites marks the current site option with a green check and accessible label', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:3000/page1', comment: 'Current site note', status: 'open' },
      { id: '2', url: 'http://localhost:5173/page1', comment: 'Other site note', status: 'open' }
    ];

    await VibeToolbar.openViewAll();
    const panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel);

    const selector = panel.querySelector('.vibe-viewall-site-select');
    assert.ok(selector, 'Site selector must be displayed when multiple sites exist');

    const indicator = panel.querySelector('.vibe-viewall-current-site-indicator');
    assert.strictEqual(indicator, null, 'No separate current-site icon should consume header space');

    // Options check
    const options = selector.options;
    assert.strictEqual(options.length, 2);
    const currentOpt = options.find(o => o.value === 'http://localhost:3000');
    assert.ok(currentOpt, 'Current site option must be present');
    assert.strictEqual(currentOpt.textContent, 'localhost:3000 ✅', 'Current site option uses a compact green check');
    assert.ok(currentOpt.getAttribute('aria-label').includes('current site'), 'Current site option keeps an accessible label');

    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000', 'Current site selected on open');
  });

  await t.test('selector shows even when current site has no annotations', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:5173/page1', comment: 'Other site note', status: 'open' }
    ];

    await VibeToolbar.openViewAll();
    const panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel);

    const selector = panel.querySelector('.vibe-viewall-site-select');
    assert.ok(selector, 'Site selector must be displayed when another site is available even if current site is empty');

    // Default selected is current site, showing empty state
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000');
    const emptyMsg = panel.querySelector('.vibe-viewall-empty');
    assert.ok(emptyMsg, 'Empty message must be displayed for empty current site');
    assert.ok(emptyMsg.textContent.includes('No annotations yet'));
  });

  await t.test('switching sites updates displayed annotations to selected site without navigating', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:3000/page1', comment: 'Current site note', status: 'open' },
      { id: '2', url: 'http://localhost:5173/about', comment: 'Site 5173 note', status: 'open', selector: '.hero' }
    ];

    await VibeToolbar.openViewAll();
    let panel = VibeToolbar.getViewAllPanel();

    // Card 1 is visible, card 2 is not
    assert.ok(panel.querySelector('[data-id="1"]'));
    assert.strictEqual(panel.querySelector('[data-id="2"]'), null);

    // Switch to http://localhost:5173
    const selector = panel.querySelector('.vibe-viewall-site-select');
    selector.value = 'http://localhost:5173';
    selector.dispatchEvent({ type: 'change', target: { value: 'http://localhost:5173' } });
    await new Promise(r => setTimeout(r, 20));

    panel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:5173');
    assert.strictEqual(panel.querySelector('[data-id="1"]'), null);
    assert.ok(panel.querySelector('[data-id="2"]'));
  });

  await t.test('card click only targets badge and scrolls if on current page', async () => {
    const targetEl = new MockElement('div');
    testPageElements['.hero'] = targetEl;

    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:3000/page1', comment: 'Current page', selector: '.hero', status: 'open' },
      { id: '2', url: 'http://localhost:3000/other-page', comment: 'Other page', selector: '.hero', status: 'open' }
    ];

    let targetBadgeEmitted = false;
    VibeEvents.on('badge:target', () => { targetBadgeEmitted = true; });

    await VibeToolbar.openViewAll();
    const panel = VibeToolbar.getViewAllPanel();

    // Click card 2 (other page) -> should NOT scroll or emit
    targetBadgeEmitted = false;
    targetEl.scrollIntoViewCalls = 0;
    const card2 = panel.querySelector('[data-id="2"]');
    card2.click();
    assert.strictEqual(targetEl.scrollIntoViewCalls, 0, 'Must not scroll for other page');
    assert.strictEqual(targetBadgeEmitted, false, 'Must not emit badge:target for other page');

    // Click card 1 (current page) -> should scroll and emit
    const card1 = panel.querySelector('[data-id="1"]');
    card1.click();
    assert.strictEqual(targetEl.scrollIntoViewCalls, 1, 'Must scroll for current page');
    assert.strictEqual(targetBadgeEmitted, true, 'Must emit badge:target for current page');
  });

  await t.test('deleting the last annotation on another site switches back to the current site', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:5173/page1', comment: 'Only note on 5173', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page1', comment: 'Note on 3000', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:5173');
    let panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel.querySelector('[data-id="1"]'));

    // Delete card 1
    const delBtn = panel.querySelector('[data-id="1"].vibe-viewall-card-delete');
    delBtn.click();

    // Wait for card animation and async delete (300ms animation)
    await new Promise(r => setTimeout(r, 450));

    panel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000');
    assert.ok(panel.querySelector('[data-id="2"]'), 'Current site annotations are shown after switching back');
    assert.strictEqual(mockStorage.annotations.length, 1);
    assert.strictEqual(mockStorage.annotations[0].id, '2', 'Other site annotation untouched');
    assert.ok(panel.querySelector('.vibe-viewall-url'), 'Reverts to simple heading when only the current site remains');
  });

  await t.test('whole-site delete requires confirmation identifying site and count; cancelling makes no change', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:5173/p1', comment: 'Site B 1', status: 'open' },
      { id: '2', url: 'http://localhost:5173/p2', comment: 'Site B 2', status: 'open' },
      { id: '3', url: 'http://localhost:3000/p1', comment: 'Site A 1', status: 'open' }
    ];
    delete mockStorage.vibeSkipDeleteConfirm;

    await VibeToolbar.openViewAll('http://localhost:5173');
    let panel = VibeToolbar.getViewAllPanel();

    const deleteAllBtn = panel.querySelector('.vibe-viewall-deleteall');
    deleteAllBtn.click();
    await new Promise(r => setTimeout(r, 10));

    // Confirmation dialog should be rendered
    const confirmModal = shadowRootMock.querySelector('.vibe-confirm-backdrop');
    assert.ok(confirmModal, 'Confirmation modal must appear');
    const msg = confirmModal.querySelector('.vibe-confirm-msg');
    assert.ok(msg, 'Confirmation message must exist');
    assert.ok(msg.textContent.includes('2 annotations'), 'Must identify affected count');
    assert.ok(msg.textContent.includes('localhost:5173'), 'Must identify selected site');

    // 1. Click Cancel -> cancelling makes no change
    const cancelBtn = confirmModal.querySelector('.vibe-confirm-no');
    cancelBtn.click();
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(mockStorage.annotations.length, 3, 'Cancelling must make no change');

    // 2. Click delete all again, then Confirm
    deleteAllBtn.click();
    await new Promise(r => setTimeout(r, 10));
    const confirmModal2 = shadowRootMock.querySelector('.vibe-confirm-backdrop');
    const yesBtn = confirmModal2.querySelector('.vibe-confirm-yes');
    yesBtn.click();

    // Wait for all-cards delete animation (cards * 40 + 300ms)
    await new Promise(r => setTimeout(r, 550));

    // Site B annotations deleted, Site A remains
    assert.strictEqual(mockStorage.annotations.length, 1);
    assert.strictEqual(mockStorage.annotations[0].id, '3', 'Other site annotations remain unchanged');
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000', 'Returns to current site after whole-site deletion');
  });

  await t.test('copy all is scoped to selected site', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:5173/page', comment: 'Site B comment', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page', comment: 'Site A comment', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:5173');
    const panel = VibeToolbar.getViewAllPanel();

    const copyBtn = panel.querySelector('.vibe-viewall-copy');
    copyBtn.click();

    await new Promise(r => setTimeout(r, 10));
    assert.ok(globalThis.__copiedText.includes('Site B comment'), 'Should copy Site B');
    assert.ok(!globalThis.__copiedText.includes('Site A comment'), 'Should NOT copy Site A');
  });

  await t.test('clear on copy clears only selected site annotations and returns to the current site', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:5173/page', comment: 'Site B comment', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page', comment: 'Site A comment', status: 'open' }
    ];

    // Enable Clear on copy via settings toggle
    const settingsBtn = shadowRootMock.querySelector('.vibe-tb-settings');
    settingsBtn.click();
    const clearOnCopyToggle = shadowRootMock.querySelector('.vibe-clear-on-copy-toggle');
    clearOnCopyToggle.click(); // turned ON

    await VibeToolbar.openViewAll('http://localhost:5173');
    let panel = VibeToolbar.getViewAllPanel();

    const copyBtn = panel.querySelector('.vibe-viewall-copy');
    copyBtn.click();

    await new Promise(r => setTimeout(r, 50));

    // Copied text verified
    assert.ok(globalThis.__copiedText.includes('Site B comment'));
    // Site B annotation deleted, Site A untouched
    assert.strictEqual(mockStorage.annotations.length, 1);
    assert.strictEqual(mockStorage.annotations[0].id, '2');
    assert.strictEqual(mockStorage.annotations[0].url, 'http://localhost:3000/page');

    // Panel returns to the current site
    panel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000');
    assert.ok(panel.querySelector('[data-id="2"]'), 'Current site annotation is shown after clear-on-copy');

    // Turn toggle back off
    clearOnCopyToggle.click();
  });

  await t.test('export share menu renders options and downloads selected site', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:5173/page', comment: 'Site B export note', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page', comment: 'Site A export note', status: 'open' }
    ];

    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};

    let downloadedFileName = '';
    const origCreateElement = document.createElement;
    document.createElement = (tag) => {
      const el = origCreateElement(tag);
      if (tag === 'a') {
        el.click = () => {
          downloadedFileName = el.download;
        };
      }
      return el;
    };

    try {
      await VibeToolbar.openViewAll('http://localhost:5173');
      const panel = VibeToolbar.getViewAllPanel();

      const shareBtn = panel.querySelector('.vibe-viewall-export');
      shareBtn.click();

      const menu = shadowRootMock.querySelector('.vibe-viewall-share-menu');
      assert.ok(menu, 'Share menu must be rendered');

      const mdOpt = menu.querySelector('.vibe-share-opt[data-format="md"]');
      const htmlOpt = menu.querySelector('.vibe-share-opt[data-format="html"]');
      const jsonOpt = menu.querySelector('.vibe-share-opt[data-format="json"]');
      assert.ok(mdOpt, '.md option present');
      assert.ok(htmlOpt, '.html option present');
      assert.ok(jsonOpt, '.json option present');

      mdOpt.click();
      await new Promise(r => setTimeout(r, 20));

      assert.ok(downloadedFileName.includes('5173'), 'Export file should target selected origin localhost:5173');
      assert.ok(downloadedFileName.endsWith('.md'));
    } finally {
      document.createElement = origCreateElement;
    }
  });

  await t.test('toolbar View all count pill continues to represent current site during foreign site selection and deletion', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:3000/page1', comment: 'Current site note', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page2', comment: 'Current site note 2', status: 'open' },
      { id: '3', url: 'http://localhost:5173/page1', comment: 'Foreign site note', status: 'open' }
    ];

    // Simulate badges:rendered on current page with 2 annotations
    VibeEvents.emit('badges:rendered', { count: 2, total: 2, styleCount: 0 });
    const pill = shadowRootMock.querySelector('.vibe-toolbar-pill');
    assert.ok(pill, 'Toolbar count pill should exist');
    assert.strictEqual(pill.textContent, '2', 'Toolbar count pill shows current site count of 2');

    // Open View all on foreign site 5173
    await VibeToolbar.openViewAll('http://localhost:5173');
    assert.strictEqual(pill.textContent, '2', 'Toolbar count pill remains 2 when viewing foreign site');

    // Delete foreign site card 3
    const panel = VibeToolbar.getViewAllPanel();
    const cardDeleteBtn = panel.querySelector('[data-id="3"].vibe-viewall-card-delete');
    cardDeleteBtn.click();
    await new Promise(r => setTimeout(r, 450));

    // Toolbar count pill is still 2!
    assert.strictEqual(pill.textContent, '2', 'Toolbar count pill remains 2 after foreign site deletion');

    // Deleting the foreign site's last annotation returns to the current site automatically
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000');

    const updatedPanel = VibeToolbar.getViewAllPanel();
    const currentCardDeleteBtn = updatedPanel.querySelector('[data-id="1"].vibe-viewall-card-delete');
    currentCardDeleteBtn.click();
    await new Promise(r => setTimeout(r, 450));

    // Now toolbar count pill reflects current site update: 1
    assert.strictEqual(pill.textContent, '1', 'Toolbar count pill updates when current site annotation deleted');
  });

  await t.test('stopped site annotations can be viewed, copied, and deleted without network requests', async () => {
    // 9999 is a stopped/offline port
    mockStorage.annotations = [
      { id: 'offline-1', url: 'http://localhost:9999/test', comment: 'Offline note', status: 'open' }
    ];

    // Mock fetch to ensure no network calls happen
    const origFetch = globalThis.fetch;
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('Network call should not occur for storage-backed offline site');
    };

    try {
      await VibeToolbar.openViewAll('http://localhost:9999');
      const panel = VibeToolbar.getViewAllPanel();
      assert.ok(panel, 'Panel opens for offline site');
      assert.ok(panel.querySelector('[data-id="offline-1"]'), 'Offline note is displayed from storage');

      // Copy all
      const copyBtn = panel.querySelector('.vibe-viewall-copy');
      copyBtn.click();
      await new Promise(r => setTimeout(r, 10));
      assert.ok(globalThis.__copiedText.includes('Offline note'));

      // Delete note
      const delBtn = panel.querySelector('[data-id="offline-1"].vibe-viewall-card-delete');
      delBtn.click();
      await new Promise(r => setTimeout(r, 450));

      assert.strictEqual(mockStorage.annotations.length, 0, 'Deleted offline site note');
      assert.strictEqual(fetchCalled, false, 'No network requests were attempted');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  await t.test('failed card deletion does not remove card and restores synchronization', async () => {
    mockStorage.annotations = [
      { id: 'fail-1', url: 'http://localhost:3000/test', comment: 'Will fail', status: 'open' }
    ];

    const origDelete = VibeAPI.deleteAnnotation;
    VibeAPI.deleteAnnotation = async () => {
      throw new Error('Simulated storage delete error');
    };

    try {
      await VibeToolbar.openViewAll('http://localhost:3000');
      let panel = VibeToolbar.getViewAllPanel();
      const card = panel.querySelector('[data-id="fail-1"].vibe-viewall-card');
      const delBtn = card.querySelector('.vibe-viewall-card-delete');

      delBtn.click();
      await new Promise(r => setTimeout(r, 450));

      panel = VibeToolbar.getViewAllPanel();
      const stillThere = panel.querySelector('[data-id="fail-1"].vibe-viewall-card');
      assert.ok(stillThere, 'Card must remain visible in UI if deletion failed');
      assert.ok(!stillThere.classList.contains('deleting'), 'Deleting animation class removed');
      assert.strictEqual(panel._suppressRefresh, false, '_suppressRefresh must be reset to false so sync resumes');
    } finally {
      VibeAPI.deleteAnnotation = origDelete;
    }
  });
});
