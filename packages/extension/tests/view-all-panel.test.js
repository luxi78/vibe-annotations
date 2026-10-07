import test from 'node:test';
import assert from 'node:assert';

// Chrome storage is the external boundary; use the real API bridge and toolbar.
const storageListeners = new Set();
function notifyAnnotationsChanged() {
  for (const listener of storageListeners) {
    listener({ annotations: { newValue: mockStorage.annotations } }, 'local');
  }
}

const mockStorage = {
  annotations: [],
  skipDeleteConfirm: true // auto-confirm for tests
};

globalThis.chrome = {
  storage: {
    onChanged: {
      addListener: listener => storageListeners.add(listener),
      removeListener: listener => storageListeners.delete(listener),
    },
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
        if ('annotations' in items) notifyAnnotationsChanged();
      }
    }
  },
  runtime: {
    getURL: (path) => `chrome-extension://mock/${path}`,
    sendMessage: async (msg) => {
      if (msg.action === 'deleteAnnotation') {
        const idx = mockStorage.annotations.findIndex(a => a.id === msg.id);
        if (idx !== -1) mockStorage.annotations.splice(idx, 1);
        notifyAnnotationsChanged();
        return { success: true };
      }
      if (msg.action === 'deleteAllAnnotations') {
        const ids = new Set(msg.ids);
        const before = mockStorage.annotations.length;
        mockStorage.annotations = mockStorage.annotations.filter(a => !ids.has(a.id));
        notifyAnnotationsChanged();
        return { success: true, count: before - mockStorage.annotations.length, pendingSync: false };
      }
      if (msg.action === 'saveAnnotation') {
        mockStorage.annotations.push(msg.annotation);
        notifyAnnotationsChanged();
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
    this._scrollTop = 0;
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

  removeAttribute(name) {
    delete this.attributes[name];
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      delete this.dataset[key];
    }
  }

  get disabled() {
    return this.attributes['disabled'] !== undefined;
  }

  set disabled(val) {
    if (val) {
      this.attributes['disabled'] = '';
    } else {
      delete this.attributes['disabled'];
    }
  }

  closest(sel) {
    if (sel.startsWith('.')) {
      const cls = sel.slice(1);
      if (this.classList && this.classList.contains(cls)) return this;
    }
    return this.parentNode?.closest ? this.parentNode.closest(sel) : null;
  }

  get scrollTop() {
    return this._scrollTop || 0;
  }

  set scrollTop(val) {
    this._scrollTop = Number(val) || 0;
  }

  get scrollHeight() {
    return this._scrollHeight !== undefined ? this._scrollHeight : 1000;
  }

  set scrollHeight(val) {
    this._scrollHeight = Number(val);
  }

  get clientHeight() {
    return this._clientHeight !== undefined ? this._clientHeight : 300;
  }

  set clientHeight(val) {
    this._clientHeight = Number(val);
  }

  focus() {
    if (globalThis.document) globalThis.document.activeElement = this;
    if (typeof shadowRootMock !== 'undefined' && shadowRootMock) shadowRootMock.activeElement = this;
  }

  contains(child) {
    let curr = child;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(newNode, referenceNode) {
    if (!referenceNode) return this.appendChild(newNode);
    const idx = this.children.indexOf(referenceNode);
    if (idx !== -1) {
      if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
      this.children.splice(idx, 0, newNode);
      newNode.parentNode = this;
      return newNode;
    }
    return this.appendChild(newNode);
  }

  replaceChild(newChild, oldChild) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
      this.children.splice(idx, 1, newChild);
      oldChild.parentNode = null;
      newChild.parentNode = this;
      return oldChild;
    }
    return null;
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
    for (const c of this.children) {
      c.parentNode = null;
    }
    this.children = [];
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    parseHTML(html, this);
  }

  get innerHTML() {
    if (this.children.length === 0) return this._innerHTML || '';
    return this.children.map(child => {
      if (child.tagName === '#TEXT') return child.textContent;
      const attrs = Object.entries(child.attributes)
        .map(([k, v]) => v !== '' ? ` ${k}="${v}"` : ` ${k}`)
        .join('');
      const tag = child.tagName.toLowerCase();
      if (['input', 'img', 'br', 'hr'].includes(tag)) {
        return `<${tag}${attrs}>`;
      }
      return `<${tag}${attrs}>${child.innerHTML}</${tag}>`;
    }).join('');
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
        // Real DOM parsing appends text nodes; assigning parent.textContent
        // would erase earlier text/children when a message contains <br>.
        const textNode = new MockElement('#text');
        textNode.textContent = trimmed;
        currentParent.appendChild(textNode);
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

globalThis.requestAnimationFrame = window.requestAnimationFrame;

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
} catch {}

const { default: VibeShadowHost } = await import('../lib/content/shadow-host.js');
VibeShadowHost.getRoot = () => shadowRootMock;

const { default: VibeAPI } = await import('../lib/content/api-bridge.js');
const { default: VibeEvents } = await import('../lib/content/event-bus.js');
const { default: VibeToolbar } = await import('../lib/content/floating-toolbar.js');

test('View all cross-site lifecycle and UI', async (t) => {
  mockStorage.annotations = [
    { id: 'boot-local', url: 'http://localhost:3000/page1', status: 'open' },
    { id: 'boot-foreign', url: 'https://example.com/other', status: 'open' },
    { id: 'boot-resolved', url: 'https://example.com/done', status: 'resolved' },
  ];
  await VibeToolbar.init();

  await t.test('initial toolbar count includes other sites before any page badges render', () => {
    const pill = shadowRootMock.querySelector('.vibe-toolbar-pill');
    assert.strictEqual(pill.textContent, '2');
    assert.notStrictEqual(pill.style.display, 'none');
  });

  t.after(() => {
    VibeEvents.emit('overlay:closed');
  });

  t.beforeEach(() => {
    VibeToolbar.closeViewAll();
    mockStorage.annotations = [];
    delete mockStorage.pendingPurgeAnnotationIds;
    delete mockStorage.annotationPurgeError;
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

  await t.test('deleting the last annotation on another site keeps that site selected and selectable with an empty state without remounting', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:5173/page1', comment: 'Only note on 5173', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page1', comment: 'Note on 3000', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:5173');
    let panel = VibeToolbar.getViewAllPanel();
    const initialPanelNode = panel;
    assert.ok(panel.querySelector('[data-id="1"]'));

    // Delete card 1
    const delBtn = panel.querySelector('[data-id="1"].vibe-viewall-card-delete');
    delBtn.click();

    // Wait for card animation and async delete (300ms animation)
    await new Promise(r => setTimeout(r, 450));

    panel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(panel, initialPanelNode, 'Panel shell must not remount');
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:5173', 'Emptied site must stay selected');
    assert.ok(panel.querySelector('.vibe-viewall-empty'), 'Empty notice must be shown for emptied site');
    assert.strictEqual(panel.querySelectorAll('.vibe-viewall-card').length, 0, 'No cards displayed');
    assert.strictEqual(mockStorage.annotations.length, 1);
    assert.strictEqual(mockStorage.annotations[0].id, '2', 'Other site annotation untouched');

    // Site select still exists and includes 5173 as selectable option
    const siteSelect = panel.querySelector('.vibe-viewall-site-select');
    assert.ok(siteSelect, 'Site select must remain available in the open session');
    assert.strictEqual(siteSelect.value, 'http://localhost:5173');
    const options = Array.from(siteSelect.options || []).map(o => o.value);
    assert.ok(options.includes('http://localhost:5173'), 'Emptied site must remain selectable');
    assert.ok(options.includes('http://localhost:3000'), 'Current site must remain selectable');
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
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:5173', 'Retains selected site after whole-site deletion');
    assert.ok(panel.querySelector('.vibe-viewall-empty'), 'Empty notice shown on emptied site');
    const selectEl = panel.querySelector('.vibe-viewall-site-select');
    assert.ok(selectEl, 'Site selector preserved');
    assert.strictEqual(selectEl.value, 'http://localhost:5173');
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

  await t.test('clear on copy clears only selected site annotations and keeps selected site in place', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:5173/page', comment: 'Site B comment', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page', comment: 'Site A comment', status: 'open' }
    ];

    // Enable Clear on copy via settings toggle
    const settingsBtn = shadowRootMock.querySelector('.vibe-tb-settings');
    settingsBtn.click();
    const clearOnCopyToggle = shadowRootMock.querySelector('.vibe-clear-on-copy-toggle');
    clearOnCopyToggle.click(); // turned ON

    try {
      await VibeToolbar.openViewAll('http://localhost:5173');
      let panel = VibeToolbar.getViewAllPanel();
      const initialPanelNode = panel;

      const copyBtn = panel.querySelector('.vibe-viewall-copy');
      copyBtn.click();

      await new Promise(r => setTimeout(r, 60));

      // Copied text verified
      assert.ok(globalThis.__copiedText.includes('Site B comment'));
      // Site B annotation deleted, Site A untouched
      assert.strictEqual(mockStorage.annotations.length, 1);
      assert.strictEqual(mockStorage.annotations[0].id, '2');
      assert.strictEqual(mockStorage.annotations[0].url, 'http://localhost:3000/page');

      // Panel remains mounted without entrance animation
      panel = VibeToolbar.getViewAllPanel();
      assert.strictEqual(panel, initialPanelNode, 'Panel shell must not remount on clear-after-copy');
      // Panel retains selected site and shows empty state
      assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:5173', 'Selected site remains active');
      assert.ok(panel.querySelector('.vibe-viewall-empty'), 'Empty notice shown');
      const siteSelect = panel.querySelector('.vibe-viewall-site-select');
      assert.ok(siteSelect, 'Site select remains available');
      assert.strictEqual(siteSelect.value, 'http://localhost:5173');
    } finally {
      // Turn toggle back off
      clearOnCopyToggle.click();
    }
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

  await t.test('toolbar count includes all sites during site selection and deletion', async () => {
    mockStorage.annotations = [
      { id: '1', url: 'http://localhost:3000/page1', comment: 'Current site note', status: 'open' },
      { id: '2', url: 'http://localhost:3000/page2', comment: 'Current site note 2', status: 'open' },
      { id: '3', url: 'http://localhost:5173/page1', comment: 'Foreign site note', status: 'open' }
    ];

    notifyAnnotationsChanged();
    VibeEvents.emit('badges:rendered', { count: 2, total: 2, styleCount: 0 });
    await new Promise(resolve => setImmediate(resolve));
    const pill = shadowRootMock.querySelector('.vibe-toolbar-pill');
    assert.ok(pill, 'Toolbar count pill should exist');
    assert.strictEqual(pill.textContent, '3', 'Toolbar counts all sites, not the page badge total');

    // Open View all on foreign site 5173
    await VibeToolbar.openViewAll('http://localhost:5173');
    assert.strictEqual(pill.textContent, '3', 'Changing the selected site does not change the global count');

    // Delete foreign site card 3
    const panel = VibeToolbar.getViewAllPanel();
    const cardDeleteBtn = panel.querySelector('[data-id="3"].vibe-viewall-card-delete');
    cardDeleteBtn.click();
    await new Promise(r => setTimeout(r, 450));

    // Deleting a foreign-site annotation decreases the global count.
    assert.strictEqual(pill.textContent, '2', 'Global count decreases after foreign site deletion');

    // Deleting the foreign site's last annotation leaves that site selected with an empty state
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:5173');
    assert.ok(panel.querySelector('.vibe-viewall-empty'), 'Shows empty state on emptied foreign site');

    // Switch to current site via site selector
    const siteSelect = panel.querySelector('.vibe-viewall-site-select');
    assert.ok(siteSelect, 'Site selector preserved');
    siteSelect.value = 'http://localhost:3000';
    siteSelect.dispatchEvent({ type: 'change', target: { value: 'http://localhost:3000' } });
    await new Promise(r => setTimeout(r, 60));

    const updatedPanel = VibeToolbar.getViewAllPanel();
    const currentCardDeleteBtn = updatedPanel.querySelector('[data-id="1"].vibe-viewall-card-delete');
    currentCardDeleteBtn.click();
    await new Promise(r => setTimeout(r, 450));

    // Deleting a current-site annotation also decreases the global count.
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

  await t.test('toolbar View all pill shows total count while Annotate button has no pill', async () => {
    mockStorage.annotations = [
      { id: 't1', url: 'http://localhost:3000/page1', comment: 'Page 1 note', status: 'open' },
      { id: 't2', url: 'http://localhost:3000/page2', comment: 'Page 2 note', status: 'open' }
    ];

    notifyAnnotationsChanged();
    VibeEvents.emit('badges:rendered', { count: 1, total: 2, styleCount: 0 });
    await new Promise(resolve => setImmediate(resolve));

    const pill = shadowRootMock.querySelector('.vibe-toolbar-pill');
    assert.ok(pill, 'Toolbar count pill exists');
    assert.strictEqual(pill.textContent, '2', 'Toolbar pill reflects total unresolved annotations');

    const annotateBtn = shadowRootMock.querySelector('.vibe-tb-annotate');
    assert.ok(annotateBtn, 'Annotate button exists');
    const annotatePill = annotateBtn.querySelector('.vibe-toolbar-pill');
    assert.strictEqual(annotatePill, null, 'Annotate button must not have any pill counter');
  });

  await t.test('saving on another site updates the global pill without a local badge render', async () => {
    await chrome.storage.local.set({ annotations: [
      { id: 'local', url: window.location.href, status: 'open' },
      { id: 'done', url: 'https://example.com/done', status: 'resolved' },
    ] });
    await VibeAPI.saveAnnotation({ id: 'foreign', url: 'https://example.com/new', status: 'open' });
    const pill = shadowRootMock.querySelector('.vibe-toolbar-pill');
    assert.strictEqual(pill.textContent, '2');
    VibeEvents.emit('badges:rendered', { count: 0, total: 1 });
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(pill.textContent, '2', 'Page rendering must not overwrite the global total');
  });

  await t.test('clearing the current site does not hide counts for other sites', async () => {
    await chrome.storage.local.set({ annotations: [
      { id: 'remaining', url: 'https://example.com/new', status: 'variants-discarded' },
    ] });
    VibeEvents.emit('annotations:cleared', { count: 1 });
    VibeEvents.emit('badges:rendered', { count: 0, total: 0 });
    await new Promise(resolve => setImmediate(resolve));
    const pill = shadowRootMock.querySelector('.vibe-toolbar-pill');
    assert.strictEqual(pill.textContent, '1');
    assert.notStrictEqual(pill.style.display, 'none');
  });

  await t.test('a stale count load cannot overwrite a newer storage change', async () => {
    const originalGet = chrome.storage.local.get;
    let resolveRead;
    chrome.storage.local.get = async keys => {
      if (keys.includes('annotations')) return new Promise(resolve => { resolveRead = resolve; });
      return originalGet(keys);
    };
    try {
      VibeEvents.emit('badges:rendered', { total: 1 });
      await new Promise(resolve => setImmediate(resolve));
      assert.ok(resolveRead, 'The toolbar must read the authoritative global storage');
      await chrome.storage.local.set({ annotations: [
        { id: 'new-1', url: window.location.href, status: 'open' },
        { id: 'new-2', url: 'https://example.com/new', status: 'open' },
      ] });
      resolveRead({ annotations: [] });
      await new Promise(resolve => setImmediate(resolve));
      assert.strictEqual(shadowRootMock.querySelector('.vibe-toolbar-pill').textContent, '2');
    } finally {
      chrome.storage.local.get = originalGet;
    }
  });

  await t.test('View all panel renders All and This page filter tabs with correct counts', async () => {
    mockStorage.annotations = [
      { id: 'p1-1', url: 'http://localhost:3000/page1', comment: 'P1 note 1', status: 'open' },
      { id: 'p1-2', url: 'http://localhost:3000/page1', comment: 'P1 note 2', status: 'open' },
      { id: 'p2-1', url: 'http://localhost:3000/page2', comment: 'P2 note 1', status: 'open' }
    ];

    // Current page is http://localhost:3000/page1
    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel, 'View all panel opens');

    const tabsContainer = panel.querySelector('.vibe-viewall-tabs');
    assert.ok(tabsContainer, 'Tabs container exists');

    const allTab = panel.querySelector('.vibe-viewall-tab[data-filter="all"]');
    const currentTab = panel.querySelector('.vibe-viewall-tab[data-filter="current"]');
    assert.ok(allTab, 'All filter tab exists');
    assert.ok(currentTab, 'Current page filter tab exists');

    assert.ok(allTab.textContent.includes('All (3)'), `All tab should show total 3, got: ${allTab.textContent}`);
    assert.ok(currentTab.textContent.includes('This page (2)'), `Current tab should show 2, got: ${currentTab.textContent}`);
    assert.ok(allTab.classList.contains('active'), 'All tab is active by default');
    assert.ok(!currentTab.classList.contains('active'), 'Current tab is inactive by default');
  });

  await t.test('switching to This page tab filters out other pages and switching back restores them', async () => {
    mockStorage.annotations = [
      { id: 'p1-1', url: 'http://localhost:3000/page1', comment: 'P1 note 1', status: 'open' },
      { id: 'p2-1', url: 'http://localhost:3000/page2', comment: 'P2 note 1', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    let panel = VibeToolbar.getViewAllPanel();

    const currentTab = panel.querySelector('.vibe-viewall-tab[data-filter="current"]');
    currentTab.click();
    await new Promise(r => setTimeout(r, 20));

    panel = VibeToolbar.getViewAllPanel();
    const activeTab = panel.querySelector('.vibe-viewall-tab.active');
    assert.strictEqual(activeTab.dataset.filter, 'current', 'Current tab is active');

    // Only page 1 card should be shown
    const p1Card = panel.querySelector('[data-id="p1-1"].vibe-viewall-card');
    const p2Card = panel.querySelector('[data-id="p2-1"].vibe-viewall-card');
    assert.ok(p1Card, 'Current page card is shown');
    assert.strictEqual(p2Card, null, 'Other page card is filtered out');

    // Switch back to All
    const allTab = panel.querySelector('.vibe-viewall-tab[data-filter="all"]');
    allTab.click();
    await new Promise(r => setTimeout(r, 20));

    panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel.querySelector('[data-id="p1-1"].vibe-viewall-card'), 'P1 card shown in all view');
    assert.ok(panel.querySelector('[data-id="p2-1"].vibe-viewall-card'), 'P2 card shown in all view');
  });

  await t.test('repeated site and filter changes keep panel shell and footer continuously mounted without recreating DOM', async () => {
    mockStorage.annotations = [
      { id: 'p1-1', url: 'http://localhost:3000/page1', comment: 'Site A page 1', status: 'open' },
      { id: 'p2-1', url: 'http://localhost:3000/page2', comment: 'Site A page 2', status: 'open' },
      { id: 'b-1', url: 'http://localhost:5173/page1', comment: 'Site B note', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const initialPanel = VibeToolbar.getViewAllPanel();
    assert.ok(initialPanel, 'Panel is mounted initially');
    const initialHeader = initialPanel.querySelector('.vibe-viewall-header');
    const initialTabs = initialPanel.querySelector('.vibe-viewall-tabs');
    const initialFooter = initialPanel.querySelector('.vibe-viewall-footer');

    // 1. Switch site to localhost:5173 while on "All" filter
    const siteSelect = initialPanel.querySelector('.vibe-viewall-site-select');
    assert.ok(siteSelect, 'Site select is present');
    siteSelect.value = 'http://localhost:5173';
    siteSelect.dispatchEvent({ type: 'change', target: { value: 'http://localhost:5173' } });
    await new Promise(r => setTimeout(r, 20));

    let currentPanel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(currentPanel, initialPanel, 'Panel shell must remain the exact same DOM node after site change');
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:5173');
    assert.ok(currentPanel.querySelector('[data-id="b-1"]'), 'Site B annotations are displayed');
    assert.strictEqual(currentPanel.querySelector('.vibe-viewall-footer'), initialFooter, 'Footer must remain mounted');
    assert.strictEqual(currentPanel.querySelector('.vibe-viewall-tabs'), initialTabs, 'Tabs container must remain mounted');
    assert.strictEqual(currentPanel.querySelector('.vibe-viewall-header'), initialHeader, 'Header container must remain mounted');

    // 2. Switch filter on other site to "This page" (empty list since current page belongs to localhost:3000)
    const tabOnOtherSite = currentPanel.querySelector('.vibe-viewall-tab[data-filter="current"]');
    tabOnOtherSite.click();
    await new Promise(r => setTimeout(r, 20));

    currentPanel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(currentPanel, initialPanel, 'Panel shell must remain mounted even when filter results in empty list');
    assert.ok(currentPanel.querySelector('.vibe-viewall-empty'), 'Empty message is rendered');
    assert.strictEqual(currentPanel.querySelector('.vibe-viewall-footer'), initialFooter, 'Footer remains mounted on empty list');

    // 3. Switch back to All filter
    const allTabOnOtherSite = currentPanel.querySelector('.vibe-viewall-tab[data-filter="all"]');
    allTabOnOtherSite.click();
    await new Promise(r => setTimeout(r, 20));

    currentPanel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(currentPanel, initialPanel, 'Panel shell must remain mounted when switching back to All');
    assert.ok(currentPanel.querySelector('[data-id="b-1"]'), 'Site B annotations restored');

    // 4. Switch back to localhost:3000
    const returnSelect = currentPanel.querySelector('.vibe-viewall-site-select');
    returnSelect.value = 'http://localhost:3000';
    returnSelect.dispatchEvent({ type: 'change', target: { value: 'http://localhost:3000' } });
    await new Promise(r => setTimeout(r, 20));

    currentPanel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(currentPanel, initialPanel, 'Panel shell remains mounted after returning to original site');
    assert.ok(currentPanel.querySelector('[data-id="p1-1"]'), 'Site A page 1 note displayed');
    assert.ok(currentPanel.querySelector('[data-id="p2-1"]'), 'Site A page 2 note displayed');

    // 5. Switch to "This page" filter on localhost:3000
    const currentTab = currentPanel.querySelector('.vibe-viewall-tab[data-filter="current"]');
    currentTab.click();
    await new Promise(r => setTimeout(r, 20));

    currentPanel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(currentPanel, initialPanel, 'Panel shell remains mounted after filter switch to This page');
    assert.ok(currentPanel.querySelector('[data-id="p1-1"]'), 'Current page note shown');
    assert.strictEqual(currentPanel.querySelector('[data-id="p2-1"]'), null, 'Other page note filtered out');
  });

  await t.test('rapid site and filter changes with out-of-order reads settle on the latest choice', async () => {
    mockStorage.annotations = [
      { id: 'a-p1', url: 'http://localhost:3000/page1', comment: 'Site A page 1', status: 'open' },
      { id: 'a-p2', url: 'http://localhost:3000/page2', comment: 'Site A page 2', status: 'open' },
      { id: 'b-p1', url: 'http://localhost:5173/page1', comment: 'Site B note', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();

    const origLoad = VibeAPI.loadAllStoredAnnotations;
    let deferredFirstRead = null;
    let callCount = 0;

    VibeAPI.loadAllStoredAnnotations = async () => {
      callCount++;
      if (callCount === 1) {
        return new Promise(resolve => {
          deferredFirstRead = () => resolve(origLoad.call(VibeAPI));
        });
      }
      return origLoad.call(VibeAPI);
    };

    try {
      // 1. User switches to localhost:5173 (call 1 is delayed)
      const siteSelect = panel.querySelector('.vibe-viewall-site-select');
      siteSelect.value = 'http://localhost:5173';
      siteSelect.dispatchEvent({ type: 'change', target: { value: 'http://localhost:5173' } });

      // 2. Before first read finishes, user quickly switches back to localhost:3000
      siteSelect.value = 'http://localhost:3000';
      siteSelect.dispatchEvent({ type: 'change', target: { value: 'http://localhost:3000' } }); // Call 2 resolves immediately

      await new Promise(r => setTimeout(r, 20));

      // Call 2 has settled on localhost:3000
      assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000');
      assert.ok(panel.querySelector('[data-id="a-p1"]'), 'Site A annotations displayed');
      assert.ok(panel.querySelector('[data-id="a-p2"]'), 'Site A page 2 note displayed');
      assert.strictEqual(panel.querySelector('[data-id="b-p1"]'), null);

      // 3. Now the delayed first read (for Site B) finally finishes
      assert.ok(deferredFirstRead, 'Deferred first read was registered');
      deferredFirstRead();
      await new Promise(r => setTimeout(r, 20));

      // Assert: Late first read did NOT overwrite with stale Site B data
      assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000', 'Latest choice Site A remains selected');
      assert.ok(panel.querySelector('[data-id="a-p1"]'), 'Site A annotations remain displayed');
      assert.ok(panel.querySelector('[data-id="a-p2"]'), 'Site A annotations remain displayed');
      assert.strictEqual(panel.querySelector('[data-id="b-p1"]'), null, 'Stale Site B card does not appear');
    } finally {
      VibeAPI.loadAllStoredAnnotations = origLoad;
    }
  });

  await t.test('pending reads and callbacks cannot reopen a closed panel or overwrite a later session', async () => {
    mockStorage.annotations = [
      { id: 'a-1', url: 'http://localhost:3000/page1', comment: 'Site A', status: 'open' },
      { id: 'b-1', url: 'http://localhost:5173/page1', comment: 'Site B', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel);

    const origLoad = VibeAPI.loadAllStoredAnnotations;
    let resolveDelayed = null;
    VibeAPI.loadAllStoredAnnotations = async () => {
      return new Promise(resolve => {
        resolveDelayed = () => resolve(origLoad.call(VibeAPI));
      });
    };

    try {
      const currentTab = panel.querySelector('.vibe-viewall-tab[data-filter="current"]');
      currentTab.click();

      // Before delayed read finishes, explicitly close the panel
      VibeToolbar.closeViewAll();
      assert.strictEqual(VibeToolbar.getViewAllPanel(), null, 'Panel is closed');

      // Now resolve the delayed read from the closed session
      assert.ok(resolveDelayed);
      resolveDelayed();
      await new Promise(r => setTimeout(r, 20));

      // Assert: The closed panel MUST NOT be reopened
      assert.strictEqual(VibeToolbar.getViewAllPanel(), null, 'Delayed read must not reopen closed panel');

      // Reopen for a new session
      VibeAPI.loadAllStoredAnnotations = origLoad;
      await VibeToolbar.openViewAll();
      const newPanel = VibeToolbar.getViewAllPanel();
      assert.ok(newPanel, 'New session opens fresh panel');
      assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000', 'New session starts at current site');
      assert.strictEqual(newPanel.querySelector('.vibe-viewall-tab.active').dataset.filter, 'all', 'New session starts at All filter');
    } finally {
      VibeAPI.loadAllStoredAnnotations = origLoad;
    }
  });

  await t.test('session scroll position is remembered per site/filter, clamped when content shrinks, and reset on close', async () => {
    mockStorage.annotations = [
      { id: 'a1', url: 'http://localhost:3000/page1', comment: 'Site A P1 note 1', status: 'open' },
      { id: 'a2', url: 'http://localhost:3000/page1', comment: 'Site A P1 note 2', status: 'open' },
      { id: 'a3', url: 'http://localhost:3000/page2', comment: 'Site A P2 note 1', status: 'open' },
      { id: 'a4', url: 'http://localhost:3000/page2', comment: 'Site A P2 note 2', status: 'open' },
      { id: 'b1', url: 'http://localhost:5173/page1', comment: 'Site B note 1', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();
    let routes = panel.querySelector('.vibe-viewall-routes');
    routes.scrollHeight = 500;
    routes.clientHeight = 200;

    // 1. First visit to Site A + All starts at top (scroll 0)
    assert.strictEqual(routes.scrollTop, 0, 'First visit starts at scroll 0');

    // 2. User scrolls down
    routes.scrollTop = 150;

    // 3. Switch to "This page" filter
    const currentTab = panel.querySelector('.vibe-viewall-tab[data-filter="current"]');
    currentTab.click();
    await new Promise(r => setTimeout(r, 20));

    routes = panel.querySelector('.vibe-viewall-routes');
    routes.scrollHeight = 300;
    routes.clientHeight = 200;
    // First visit to Site A + This page starts at scroll 0
    assert.strictEqual(routes.scrollTop, 0, 'First visit to This page starts at scroll 0');

    // User scrolls on This page
    routes.scrollTop = 40;

    // 4. Switch back to "All" filter (All list is longer: scrollHeight = 500)
    routes.scrollHeight = 500;
    const allTab = panel.querySelector('.vibe-viewall-tab[data-filter="all"]');
    allTab.click();
    await new Promise(r => setTimeout(r, 20));

    routes = panel.querySelector('.vibe-viewall-routes');
    // Returning visit to Site A + All restores scroll to 150
    assert.strictEqual(routes.scrollTop, 150, 'Returning visit restores remembered scroll');

    // 5. Test clamping: simulate content becoming shorter
    routes.scrollHeight = 250;
    routes.clientHeight = 200; // maxScroll = 50
    currentTab.click();
    await new Promise(r => setTimeout(r, 20));

    // Now switch back to All where content is shorter than saved 150
    allTab.click();
    await new Promise(r => setTimeout(r, 20));
    routes = panel.querySelector('.vibe-viewall-routes');
    assert.strictEqual(routes.scrollTop, 50, 'Scroll is clamped to maxScroll (50) when content becomes shorter');

    // 6. Switch to Site B
    const siteSelect = panel.querySelector('.vibe-viewall-site-select');
    siteSelect.value = 'http://localhost:5173';
    siteSelect.dispatchEvent({ type: 'change', target: { value: 'http://localhost:5173' } });
    await new Promise(r => setTimeout(r, 20));

    routes = panel.querySelector('.vibe-viewall-routes');
    assert.strictEqual(routes.scrollTop, 0, 'First visit to Site B starts at scroll 0');

    // 7. Explicit close ends the session
    VibeToolbar.closeViewAll();

    // 8. Reopening starts fresh on current site + All at top
    await VibeToolbar.openViewAll();
    const freshPanel = VibeToolbar.getViewAllPanel();
    const freshRoutes = freshPanel.querySelector('.vibe-viewall-routes');
    assert.strictEqual(freshRoutes.scrollTop, 0, 'Reopening after close resets scroll to 0');
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000');
    assert.strictEqual(freshPanel.querySelector('.vibe-viewall-tab.active').dataset.filter, 'all');
  });

  await t.test('surviving controls retain keyboard focus across filter and site changes', async () => {
    mockStorage.annotations = [
      { id: 'a1', url: 'http://localhost:3000/page1', comment: 'Site A note', status: 'open' },
      { id: 'b1', url: 'http://localhost:5173/page1', comment: 'Site B note', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();

    // Focus the "This page" filter tab
    const currentTab = panel.querySelector('.vibe-viewall-tab[data-filter="current"]');
    currentTab.focus();
    currentTab.click();
    await new Promise(r => setTimeout(r, 20));

    // Active tab retains focus
    const activeTab = panel.querySelector('.vibe-viewall-tab.active');
    assert.strictEqual(document.activeElement, activeTab, 'Active filter tab retains focus');

    // Focus site selector and change it
    const siteSelect = panel.querySelector('.vibe-viewall-site-select');
    siteSelect.focus();
    siteSelect.value = 'http://localhost:5173';
    siteSelect.dispatchEvent({ type: 'change', target: { value: 'http://localhost:5173' } });
    await new Promise(r => setTimeout(r, 20));

    const newSelect = panel.querySelector('.vibe-viewall-site-select');
    assert.strictEqual(document.activeElement, newSelect, 'Site selector retains focus after selection');
  });

  await t.test('This page tab shows empty placeholder when current page has no annotations', async () => {
    mockStorage.annotations = [
      { id: 'p2-1', url: 'http://localhost:3000/page2', comment: 'P2 note 1', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    let panel = VibeToolbar.getViewAllPanel();

    const currentTab = panel.querySelector('.vibe-viewall-tab[data-filter="current"]');
    assert.ok(currentTab.textContent.includes('This page (0)'), 'Current tab shows count 0');

    currentTab.click();
    await new Promise(r => setTimeout(r, 20));
    panel = VibeToolbar.getViewAllPanel();

    const emptyNotice = panel.querySelector('.vibe-viewall-empty');
    assert.ok(emptyNotice, 'Empty notice is shown when current page has no annotations');
    assert.ok(emptyNotice.textContent.toLowerCase().includes('no annotations on this page'));
  });

  await t.test('deleting annotation in This page filter keeps filter active and updates counts', async () => {
    mockStorage.annotations = [
      { id: 'del-p1', url: 'http://localhost:3000/page1', comment: 'To delete', status: 'open' },
      { id: 'keep-p1', url: 'http://localhost:3000/page1', comment: 'Keep p1', status: 'open' },
      { id: 'keep-p2', url: 'http://localhost:3000/page2', comment: 'Keep p2', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000', 'current');
    let panel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(panel.querySelector('.vibe-viewall-tab.active').dataset.filter, 'current', 'Filter initialized to current');

    const cardDeleteBtn = panel.querySelector('[data-id="del-p1"].vibe-viewall-card-delete');
    assert.ok(cardDeleteBtn, 'Delete button for del-p1 exists');
    cardDeleteBtn.click();
    await new Promise(r => setTimeout(r, 450));

    panel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(panel.querySelector('.vibe-viewall-tab.active').dataset.filter, 'current', 'Filter remains current after delete');

    const allTab = panel.querySelector('.vibe-viewall-tab[data-filter="all"]');
    const currentTab = panel.querySelector('.vibe-viewall-tab[data-filter="current"]');
    assert.ok(allTab.textContent.includes('All (2)'), 'All tab updated to 2');
    assert.ok(currentTab.textContent.includes('This page (1)'), 'Current tab updated to 1');

    const pill = shadowRootMock.querySelector('.vibe-toolbar-pill');
    assert.strictEqual(pill.textContent, '2', 'Toolbar count pill updated to 2');
  });

  await t.test('exiting before the enter animation swaps layout keeps Annotate visible', testContext => {
    testContext.mock.timers.enable({ apis: ['setTimeout'] });
    const toolbar = shadowRootMock.querySelector('.vibe-toolbar');
    const defaultContent = toolbar.querySelector('.vibe-toolbar-default');
    const middle = toolbar.querySelector('.vibe-toolbar-middle');
    try {
      VibeEvents.emit('inspection:started');
      testContext.mock.timers.tick(100);
      VibeEvents.emit('inspection:stopped');
      testContext.mock.timers.tick(1000);
      assert.strictEqual(toolbar.classList.contains('annotating'), false, 'Stale enter timers must not restore annotating mode');
      assert.notStrictEqual(defaultContent.style.opacity, '0', 'Annotate must not remain faded out');
      assert.strictEqual(middle.style.width, '', 'Interrupted animation width must be cleared');
      assert.strictEqual(middle.style.overflow, '', 'Interrupted content must not remain clipped');
    } finally {
      VibeEvents.emit('inspection:stopped');
      testContext.mock.timers.tick(1000);
      testContext.mock.timers.reset();
    }
  });

  await t.test('re-entering during exit prevents old timers from restoring default mode', testContext => {
    testContext.mock.timers.enable({ apis: ['setTimeout'] });
    const originalFrame = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = callback => { callback(); return 1; };
    const toolbar = shadowRootMock.querySelector('.vibe-toolbar');
    const annotatingContent = toolbar.querySelector('.vibe-toolbar-annotating');
    try {
      VibeEvents.emit('inspection:started');
      testContext.mock.timers.tick(600);
      VibeEvents.emit('inspection:stopped');
      testContext.mock.timers.tick(100);
      VibeEvents.emit('inspection:started');
      testContext.mock.timers.tick(1000);
      assert.strictEqual(toolbar.classList.contains('annotating'), true, 'Stale exit timers must not change the latest mode');
      assert.notStrictEqual(annotatingContent.style.opacity, '0', 'Current instructions must remain visible');
    } finally {
      VibeEvents.emit('inspection:stopped');
      testContext.mock.timers.tick(1000);
      testContext.mock.timers.reset();
      if (originalFrame) globalThis.requestAnimationFrame = originalFrame;
      else delete globalThis.requestAnimationFrame;
    }
  });

  await t.test('an imported annotation ID cannot inject card attributes', async () => {
    mockStorage.annotations = [{
      id: 'note" onclick="alert(1)', url: window.location.href, comment: 'Imported note', status: 'open',
    }];
    await VibeToolbar.openViewAll(window.location.origin, 'all');
    const panel = VibeToolbar.getViewAllPanel();
    for (const element of panel.querySelectorAll('[data-id]')) {
      assert.strictEqual(element.getAttribute('onclick'), null, 'IDs must stay data, not become executable attributes');
    }
    assert.ok(panel.innerHTML.includes('note&quot; onclick=&quot;alert(1)'));
  });

  await t.test('global delete is an icon-only button beside its description in a separate footer', async () => {
    mockStorage.annotations = [{ id: 'one', url: window.location.href, status: 'open' }];
    await VibeToolbar.openViewAll();
    const panel = VibeToolbar.getViewAllPanel();
    const button = panel.querySelector('.vibe-viewall-delete-global');
    assert.ok(button, 'An explicit global deletion button is required');
    assert.ok(button.closest('.vibe-viewall-footer'), 'The new action gets its own footer area');
    assert.strictEqual(panel.querySelector('.vibe-viewall-header').querySelector('.vibe-viewall-delete-global'), null);
    assert.ok(button.querySelector('svg'), 'The action has a trash icon');
    assert.strictEqual(button.textContent.trim(), '', 'The button contains no visible text');
    assert.strictEqual(button.getAttribute('aria-label'), 'Delete all annotations across all sites');
    const description = panel.querySelector('.vibe-viewall-global-caption');
    assert.strictEqual(description.textContent, 'Delete all annotations across all sites');
    const row = button.closest('.vibe-viewall-global-action');
    assert.ok(row, 'Description and icon share one action row');
    assert.strictEqual(description.parentNode, row);
    assert.ok(row.children.indexOf(description) < row.children.indexOf(button), 'Description precedes the icon button');
  });

  await t.test('global delete always asks for confirmation and cancelling keeps all sites intact', async () => {
    mockStorage.vibeSkipDeleteConfirm = true;
    mockStorage.annotations = [
      { id: 'local', url: window.location.href, status: 'open' },
      { id: 'foreign', url: 'https://example.com/a', status: 'open' },
      { id: 'resolved', url: 'http://localhost:5173/done', status: 'resolved' },
    ];
    const before = structuredClone(mockStorage.annotations);
    await VibeToolbar.openViewAll('https://example.com', 'current');
    const button = VibeToolbar.getViewAllPanel().querySelector('.vibe-viewall-delete-global');
    assert.ok(button);
    button.click();
    await new Promise(resolve => setImmediate(resolve));
    const modal = shadowRootMock.querySelector('.vibe-confirm-backdrop');
    assert.ok(modal, 'Global deletion must never bypass confirmation');
    assert.ok(modal.textContent.includes('3 annotations'));
    assert.ok(modal.textContent.includes('all sites'));
    assert.deepStrictEqual(mockStorage.annotations, before, 'Opening confirmation must not delete anything');
    modal.querySelector('.vibe-confirm-no').click();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepStrictEqual(mockStorage.annotations, before);
    delete mockStorage.vibeSkipDeleteConfirm;
  });

  await t.test('repeated global delete clicks open only one confirmation', async () => {
    mockStorage.annotations = [{ id: 'one', url: window.location.href, status: 'open' }];
    await VibeToolbar.openViewAll();
    const button = VibeToolbar.getViewAllPanel().querySelector('.vibe-viewall-delete-global');
    button.click();
    button.click();
    await new Promise(resolve => setImmediate(resolve));
    const modals = shadowRootMock.querySelectorAll('.vibe-confirm-backdrop');
    assert.strictEqual(modals.length, 1);
    assert.strictEqual(mockStorage.annotations.length, 1);
    modals[0].querySelector('.vibe-confirm-no').click();
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(button.disabled, false);
  });

  await t.test('a failed global delete leaves records intact and re-enables the action', async () => {
    mockStorage.annotations = [{ id: 'one', url: window.location.href, status: 'open' }];
    const originalSend = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = async message => message.action === 'deleteAllAnnotations'
      ? { success: false, error: 'Storage unavailable' }
      : originalSend(message);
    try {
      await VibeToolbar.openViewAll();
      const button = VibeToolbar.getViewAllPanel().querySelector('.vibe-viewall-delete-global');
      button.click();
      await new Promise(resolve => setImmediate(resolve));
      shadowRootMock.querySelector('.vibe-confirm-yes').click();
      await new Promise(resolve => setImmediate(resolve));
      assert.strictEqual(mockStorage.annotations.length, 1);
      assert.strictEqual(button.disabled, false);
      assert.strictEqual(VibeToolbar.getViewAllPanel()._suppressRefresh, false);
      const errorModal = shadowRootMock.querySelector('.vibe-confirm-backdrop');
      assert.ok(errorModal.textContent.includes('Storage unavailable'));
      errorModal.querySelector('.vibe-confirm-no').click();
    } finally {
      chrome.runtime.sendMessage = originalSend;
    }
  });

  await t.test('offline global deletion reports pending server sync after clearing local records', async () => {
    mockStorage.annotations = [{ id: 'one', url: window.location.href, status: 'open' }];
    const originalSend = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = async message => {
      const result = await originalSend(message);
      return message.action === 'deleteAllAnnotations' ? { ...result, pendingSync: true } : result;
    };
    try {
      await VibeToolbar.openViewAll();
      VibeToolbar.getViewAllPanel().querySelector('.vibe-viewall-delete-global').click();
      await new Promise(resolve => setImmediate(resolve));
      shadowRootMock.querySelector('.vibe-confirm-yes').click();
      await new Promise(resolve => setTimeout(resolve, 30));
      assert.strictEqual(mockStorage.annotations.length, 0);
      const panel = VibeToolbar.getViewAllPanel();
      assert.ok(panel.querySelector('.vibe-viewall-global-status').textContent.includes('Server sync is pending'));
      assert.strictEqual(panel.querySelector('.vibe-viewall-delete-global').disabled, true);
    } finally {
      chrome.runtime.sendMessage = originalSend;
    }
  });

  await t.test('pending server deletion remains visible after reopening an empty panel', async () => {
    mockStorage.annotations = [];
    mockStorage.pendingPurgeAnnotationIds = ['pending'];
    mockStorage.annotationPurgeError = 'Update the MCP server to enable safe global deletion.';
    await VibeToolbar.openViewAll();
    const status = VibeToolbar.getViewAllPanel().querySelector('.vibe-viewall-global-status');
    assert.ok(status.textContent.includes('Update the MCP server'), 'An empty local list must not hide incomplete remote deletion');
    VibeToolbar.closeViewAll();
    await VibeToolbar.openViewAll();
    assert.ok(VibeToolbar.getViewAllPanel().querySelector('.vibe-viewall-global-status').textContent.includes('Update the MCP server'));
  });

  await t.test('confirmed global deletion includes resolved and variants but preserves later additions', async () => {
    mockStorage.annotations = [
      { id: 'local', url: window.location.href, status: 'open' },
      { id: 'foreign', url: 'https://example.com/a', status: 'open' },
      { id: 'resolved', url: 'http://localhost:5173/done', status: 'resolved' },
      { id: 'variant', url: 'http://localhost:5173/v', mode: 'variants', variantsPayload: {}, status: 'variants-discarded' },
    ];
    await VibeToolbar.openViewAll('https://example.com', 'current');
    const initialPanel = VibeToolbar.getViewAllPanel();
    const button = initialPanel.querySelector('.vibe-viewall-delete-global');
    assert.ok(button);
    button.click();
    await new Promise(resolve => setImmediate(resolve));
    const modal = shadowRootMock.querySelector('.vibe-confirm-backdrop');
    assert.ok(modal);
    assert.ok(modal.textContent.includes('Generated code will not be changed'));
    mockStorage.annotations.push({ id: 'later', url: window.location.href, status: 'open' });
    modal.querySelector('.vibe-confirm-yes').click();
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.deepStrictEqual(mockStorage.annotations.map(a => a.id), ['later']);
    assert.strictEqual(shadowRootMock.querySelector('.vibe-toolbar-pill').textContent, '1');

    // Panel shell preserved, selected site and filter retained
    const panelAfter = VibeToolbar.getViewAllPanel();
    assert.strictEqual(panelAfter, initialPanel, 'Panel shell must not remount on global delete');
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'https://example.com', 'Retains selected site');
    const currentTab = panelAfter.querySelector('.vibe-viewall-tab[data-filter="current"]');
    assert.ok(currentTab.classList.contains('active'), 'Retains active filter current');
    assert.ok(panelAfter.querySelector('.vibe-viewall-empty'), 'Empty notice displayed');
  });

  await t.test('external storage changes trigger coalesced View all refresh and do not rebuild unchanged cards on other-site changes', async () => {
    mockStorage.annotations = [
      { id: 'site-a-1', url: 'http://localhost:3000/page1', comment: 'Site A initial note', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel, 'Panel is open');

    const cardInitial = panel.querySelector('[data-id="site-a-1"]');
    assert.ok(cardInitial, 'Initial card rendered');

    // 1. External change arrives for a different site (Site B)
    // Should update applicable counts/picker but NOT destroy or rebuild Site A's card element
    await chrome.storage.local.set({
      annotations: [
        { id: 'site-a-1', url: 'http://localhost:3000/page1', comment: 'Site A initial note', status: 'open' },
        { id: 'site-b-1', url: 'http://localhost:5173/page1', comment: 'Site B note', status: 'open' }
      ]
    });
    // Also simulate simultaneous badge render trigger
    VibeEvents.emit('badges:rendered', { total: 2 });
    await new Promise(r => setTimeout(r, 50));

    const cardAfterOtherSite = panel.querySelector('[data-id="site-a-1"]');
    assert.strictEqual(cardAfterOtherSite, cardInitial, 'Irrelevant change on other site preserves existing card DOM node');

    // 2. External change adds a card on the currently selected site
    await chrome.storage.local.set({
      annotations: [
        { id: 'site-a-1', url: 'http://localhost:3000/page1', comment: 'Site A initial note', status: 'open' },
        { id: 'site-a-2', url: 'http://localhost:3000/page1', comment: 'Site A second note', status: 'open' },
        { id: 'site-b-1', url: 'http://localhost:5173/page1', comment: 'Site B note', status: 'open' }
      ]
    });
    await new Promise(r => setTimeout(r, 50));

    const cardNew = panel.querySelector('[data-id="site-a-2"]');
    assert.ok(cardNew, 'New card on selected site is rendered following external storage change');
    const cardStillSame = panel.querySelector('[data-id="site-a-1"]');
    assert.strictEqual(cardStillSame, cardInitial, 'Unchanged card on selected site retains its DOM identity');
  });

  await t.test('incremental DOM reconciliation updates modified cards in place, removes deleted cards, and restores focus to active filter button if focused card was externally removed', async () => {
    mockStorage.annotations = [
      { id: 'card-1', url: 'http://localhost:3000/page1', comment: 'Card 1 initial', status: 'open' },
      { id: 'card-2', url: 'http://localhost:3000/page1', comment: 'Card 2 initial', status: 'open' },
      { id: 'card-3', url: 'http://localhost:3000/page2', comment: 'Card 3 initial', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();

    const c1El = panel.querySelector('[data-id="card-1"]');
    const c2El = panel.querySelector('[data-id="card-2"]');
    const c3El = panel.querySelector('[data-id="card-3"]');
    assert.ok(c1El && c2El && c3El);

    // Case A: Focus is on card-2 (which will be removed externally)
    c2El.focus();
    assert.strictEqual(document.activeElement, c2El, 'card-2 currently owns focus');

    // External change: card-1 is modified in-place, card-2 is removed, card-3 is untouched, card-4 is added
    await chrome.storage.local.set({
      annotations: [
        { id: 'card-1', url: 'http://localhost:3000/page1', comment: 'Card 1 MODIFIED', status: 'open' },
        { id: 'card-3', url: 'http://localhost:3000/page2', comment: 'Card 3 initial', status: 'open' },
        { id: 'card-4', url: 'http://localhost:3000/page2', comment: 'Card 4 NEW', status: 'open' }
      ]
    });
    await new Promise(r => setTimeout(r, 50));

    // Assert: card-1 DOM element is preserved and comment updated in place
    const c1After = panel.querySelector('[data-id="card-1"]');
    assert.strictEqual(c1After, c1El, 'card-1 DOM node preserved across update');
    assert.ok(c1After.querySelector('.vibe-viewall-comment').textContent.includes('MODIFIED'), 'card-1 content updated in-place');

    // Assert: card-2 is removed
    assert.strictEqual(panel.querySelector('[data-id="card-2"]'), null, 'card-2 removed from DOM');

    // Assert: card-3 DOM node is preserved untouched
    const c3After = panel.querySelector('[data-id="card-3"]');
    assert.strictEqual(c3After, c3El, 'card-3 DOM node preserved untouched');

    // Assert: card-4 is newly inserted
    const c4After = panel.querySelector('[data-id="card-4"]');
    assert.ok(c4After, 'card-4 newly inserted');

    // Assert: Focus returned to active filter button, NOT an adjacent destructive button
    const activeTab = panel.querySelector('.vibe-viewall-tab.active');
    assert.strictEqual(document.activeElement, activeTab, 'Focus safely returned to active filter button');
    assert.ok(!document.activeElement.classList.contains('vibe-viewall-card-delete'), 'Focus did not land on destructive action');
    assert.ok(!document.activeElement.classList.contains('vibe-viewall-deleteall'), 'Focus did not land on destructive action');
  });

  await t.test('an externally emptied selected site remains selected and selectable for the open session', async () => {
    mockStorage.annotations = [
      { id: 'a-1', url: 'http://localhost:3000/page1', comment: 'Site 3000 note', status: 'open' },
      { id: 'b-1', url: 'http://localhost:5173/page1', comment: 'Site 5173 note', status: 'open' }
    ];

    // User opens View all and chooses localhost:5173
    await VibeToolbar.openViewAll('http://localhost:5173');
    const panel = VibeToolbar.getViewAllPanel();
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:5173');
    assert.ok(panel.querySelector('[data-id="b-1"]'), 'Site 5173 note displayed');

    // External change empties localhost:5173 completely
    await chrome.storage.local.set({
      annotations: [
        { id: 'a-1', url: 'http://localhost:3000/page1', comment: 'Site 3000 note', status: 'open' }
      ]
    });
    await new Promise(r => setTimeout(r, 50));

    // Assert: Session still retains localhost:5173 as selected origin
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:5173', 'Emptied site remains selected origin');

    // Assert: Site selector still contains localhost:5173 as a selectable option
    const siteSelect = panel.querySelector('.vibe-viewall-site-select');
    assert.ok(siteSelect, 'Site selector remains rendered');
    const option5173 = siteSelect.children.find(o => o.value === 'http://localhost:5173');
    assert.ok(option5173, 'Emptied site remains present and selectable in site options');
    assert.strictEqual(siteSelect.value, 'http://localhost:5173');

    // Assert: Panel displays empty state for this site
    const emptyNotice = panel.querySelector('.vibe-viewall-empty');
    assert.ok(emptyNotice, 'Empty placeholder displayed for emptied site');
    assert.strictEqual(emptyNotice.textContent, 'No annotations yet');

    // Explicit close resets the session
    VibeToolbar.closeViewAll();
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), null);
  });

  await t.test('deleting focused card, route, or final card returns focus to active filter tab, and unaffected controls retain focus', async () => {
    mockStorage.annotations = [
      { id: 'focus-1', url: 'http://localhost:3000/route1', comment: 'Card 1', status: 'open' },
      { id: 'focus-2', url: 'http://localhost:3000/route1', comment: 'Card 2', status: 'open' },
      { id: 'focus-3', url: 'http://localhost:3000/route2', comment: 'Card 3', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();
    const activeTab = panel.querySelector('.vibe-viewall-tab.active');

    // Case 1: Focus is on card-1 delete button. Deleting it returns focus to active filter tab, not card-2 delete
    const card1 = panel.querySelector('[data-id="focus-1"]');
    const card1Del = card1.querySelector('.vibe-viewall-card-delete');
    card1Del.focus();
    assert.strictEqual(document.activeElement, card1Del);

    card1Del.click();
    await new Promise(r => setTimeout(r, 450));

    assert.strictEqual(panel.querySelector('[data-id="focus-1"]'), null, 'focus-1 deleted');
    assert.strictEqual(document.activeElement, activeTab, 'Focus moved to active filter tab, not card-2 delete');

    // Case 2: Unaffected control (copy button) retains focus when another card is deleted
    const copyBtn = panel.querySelector('.vibe-viewall-copy');
    copyBtn.focus();
    assert.strictEqual(document.activeElement, copyBtn);

    const card2 = panel.querySelector('[data-id="focus-2"]');
    const card2Del = card2.querySelector('.vibe-viewall-card-delete');
    card2Del.click();
    await new Promise(r => setTimeout(r, 450));

    assert.strictEqual(panel.querySelector('[data-id="focus-2"]'), null, 'focus-2 deleted');
    assert.strictEqual(document.activeElement, copyBtn, 'Copy button retained focus');

    // Case 3: Deleting the final card (focus-3) returns focus to active filter tab
    const card3 = panel.querySelector('[data-id="focus-3"]');
    const card3Del = card3.querySelector('.vibe-viewall-card-delete');
    card3Del.focus();
    assert.strictEqual(document.activeElement, card3Del);

    card3Del.click();
    await new Promise(r => setTimeout(r, 450));

    assert.ok(panel.querySelector('.vibe-viewall-empty'), 'Empty state shown for final card deletion');
    assert.strictEqual(document.activeElement, activeTab, 'Focus returned to active filter tab on final card deletion');
  });

  await t.test('post-mutation read failure does not masquerade as empty result, retains last-good content and recovers in-place via retry without destructive retry', async () => {
    mockStorage.annotations = [
      { id: 'survive-1', url: 'http://localhost:3000/page1', comment: 'Keep this note', status: 'open' },
      { id: 'del-1', url: 'http://localhost:3000/page1', comment: 'Delete this note', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();
    const initialPanelNode = panel;

    let deleteCallCount = 0;
    const origDelete = VibeAPI.deleteAnnotation;
    VibeAPI.deleteAnnotation = async (id) => {
      deleteCallCount++;
      return origDelete(id);
    };

    let failNextRead = false;
    const origLoad = VibeAPI.loadAllStoredAnnotations;
    VibeAPI.loadAllStoredAnnotations = async () => {
      if (failNextRead) {
        throw new Error('Simulated post-mutation read failure');
      }
      return origLoad();
    };

    try {
      // Trigger delete on del-1
      const delBtn = panel.querySelector('[data-id="del-1"].vibe-viewall-card-delete');
      assert.ok(delBtn);

      // Arm read failure specifically for the post-mutation sync
      failNextRead = true;
      delBtn.click();
      await new Promise(r => setTimeout(r, 450));

      // 1. Mutation succeeded in storage
      assert.strictEqual(deleteCallCount, 1, 'Delete was called once');
      assert.strictEqual(mockStorage.annotations.some(a => a.id === 'del-1'), false, 'del-1 deleted in storage');

      // 2. Post-mutation read failure did NOT masquerade as empty result
      assert.strictEqual(panel, initialPanelNode, 'Panel shell not remounted');
      assert.strictEqual(panel.querySelector('.vibe-viewall-empty'), null, 'Must NOT show empty notice on read failure');

      // 3. Last-good content retained and in-place error bar displayed with Retry
      const errorEl = panel.querySelector('.vibe-viewall-error');
      assert.ok(errorEl, 'In-place error bar displayed');
      assert.ok(errorEl.textContent.includes('Failed to load annotations'));
      const retryBtn = errorEl.querySelector('.vibe-viewall-retry');
      assert.ok(retryBtn, 'Retry button available');

      // 4. Disarm read failure and click Retry -> read recovery occurs in same panel without destructive retry
      failNextRead = false;
      retryBtn.click();
      await new Promise(r => setTimeout(r, 50));

      assert.strictEqual(deleteCallCount, 1, 'Retry did NOT execute another destructive delete');
      assert.strictEqual(panel.querySelector('.vibe-viewall-error'), null, 'Error bar cleared upon successful retry');
      assert.strictEqual(panel.querySelector('[data-id="del-1"]'), null, 'del-1 absent');
      assert.ok(panel.querySelector('[data-id="survive-1"]'), 'survive-1 displayed');
    } finally {
      VibeAPI.deleteAnnotation = origDelete;
      VibeAPI.loadAllStoredAnnotations = origLoad;
    }
  });

  await t.test('closing or changing context during an action prevents completion from reopening panel or restoring obsolete selection', async () => {
    mockStorage.annotations = [
      { id: 'site-a-note', url: 'http://localhost:5173/page1', comment: 'Site A note', status: 'open' },
      { id: 'site-b-note', url: 'http://localhost:3000/page1', comment: 'Site B note', status: 'open' }
    ];

    // Scenario 1: Closing panel while card deletion is in flight prevents reopening
    await VibeToolbar.openViewAll('http://localhost:5173');
    let panel = VibeToolbar.getViewAllPanel();
    const cardA = panel.querySelector('[data-id="site-a-note"]');
    const delBtnA = cardA.querySelector('.vibe-viewall-card-delete');

    // Click delete
    delBtnA.click();
    // Mid-action (during the 300ms animation), explicitly close View all
    await new Promise(r => setTimeout(r, 100));
    VibeToolbar.closeViewAll();
    assert.strictEqual(VibeToolbar.getViewAllPanel(), null, 'Panel is closed');

    // Wait for the async deletion and sync to fully finish
    await new Promise(r => setTimeout(r, 450));

    // Assert: Completion did NOT reopen the panel or restore selection
    assert.strictEqual(VibeToolbar.getViewAllPanel(), null, 'Action completion must not reopen a closed panel');
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), null, 'Action completion must not restore obsolete origin on closed session');
    assert.strictEqual(mockStorage.annotations.some(a => a.id === 'site-a-note'), false, 'Deletion still succeeded in storage');

    // Scenario 2: Changing selected site while route/card deletion is in flight retains newer site selection
    mockStorage.annotations = [
      { id: 'site-a-2', url: 'http://localhost:5173/p', comment: 'Site A second note', status: 'open' },
      { id: 'site-b-note', url: 'http://localhost:3000/page1', comment: 'Site B note', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:5173');
    panel = VibeToolbar.getViewAllPanel();
    const cardA2 = panel.querySelector('[data-id="site-a-2"]');
    const delBtnA2 = cardA2.querySelector('.vibe-viewall-card-delete');

    delBtnA2.click();
    // Mid-action, user changes selected site to site B
    await new Promise(r => setTimeout(r, 100));
    const siteSelect = panel.querySelector('.vibe-viewall-site-select');
    assert.ok(siteSelect);
    siteSelect.value = 'http://localhost:3000';
    siteSelect.dispatchEvent({ type: 'change', target: { value: 'http://localhost:3000' } });
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000', 'Switched to site B');

    // Wait for site A's deletion and sync to fully finish
    await new Promise(r => setTimeout(r, 450));

    // Assert: Panel stayed open, but selection was NOT forced back to obsolete site A
    assert.ok(VibeToolbar.getViewAllPanel(), 'Panel remains open');
    assert.strictEqual(VibeToolbar.getSelectedOrigin(), 'http://localhost:3000', 'Must retain newer selection (Site B), not revert to obsolete Site A');
    assert.ok(VibeToolbar.getViewAllPanel().querySelector('[data-id="site-b-note"]'), 'Displays site B content');
  });

  await t.test('failed reads retain last-good content and expose in-place retry, which clears error on recovery', async () => {
    mockStorage.annotations = [
      { id: 'good-1', url: 'http://localhost:3000/page1', comment: 'Last-good note', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel.querySelector('[data-id="good-1"]'));

    const origLoad = VibeAPI.loadAllStoredAnnotations;
    let shouldFail = true;

    VibeAPI.loadAllStoredAnnotations = async () => {
      if (shouldFail) {
        throw new Error('Simulated network/storage read error');
      }
      return origLoad.call(VibeAPI);
    };

    try {
      // Trigger a refresh while read is failing
      await chrome.storage.local.set({
        annotations: [
          { id: 'good-1', url: 'http://localhost:3000/page1', comment: 'Last-good note', status: 'open' },
          { id: 'new-unseen', url: 'http://localhost:3000/page1', comment: 'Should not appear yet', status: 'open' }
        ]
      });
      await new Promise(r => setTimeout(r, 50));

      // 1. Last-good content must be retained!
      assert.ok(panel.querySelector('[data-id="good-1"]'), 'Last-good card is retained on read failure');
      assert.strictEqual(panel.querySelector('[data-id="new-unseen"]'), null);

      // 2. In-place lightweight error with retry button is displayed
      const errorBanner = panel.querySelector('.vibe-viewall-error');
      assert.ok(errorBanner, 'Error banner displayed');
      assert.ok(errorBanner.textContent.includes('Failed to load annotations'));
      const retryBtn = errorBanner.querySelector('.vibe-viewall-retry');
      assert.ok(retryBtn, 'In-place retry button displayed');

      // 3. Destructive confirmations remain uncorrupted and require fresh confirmation
      const deleteAllBtn = panel.querySelector('.vibe-viewall-deleteall');
      assert.ok(deleteAllBtn);

      // 4. In-place retry execution: failure recovers
      shouldFail = false;
      retryBtn.click();
      await new Promise(r => setTimeout(r, 50));

      // 5. Successful retry clears error banner and reconciles new state
      assert.strictEqual(panel.querySelector('.vibe-viewall-error'), null, 'Error banner cleared on recovery');
      assert.ok(panel.querySelector('[data-id="good-1"]'), 'good-1 card present');
      assert.ok(panel.querySelector('[data-id="new-unseen"]'), 'new-unseen card reconciled after recovery');
    } finally {
      VibeAPI.loadAllStoredAnnotations = origLoad;
    }
  });

  await t.test('successful empty result remains distinct from failed read and shows empty notice without error banner', async () => {
    mockStorage.annotations = [
      { id: 'note-1', url: 'http://localhost:3000/page1', comment: 'Note 1', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    const panel = VibeToolbar.getViewAllPanel();
    assert.ok(panel.querySelector('[data-id="note-1"]'));

    // External change clears all annotations (successful empty result)
    await chrome.storage.local.set({ annotations: [] });
    await new Promise(r => setTimeout(r, 50));

    // Assert: No error banner rendered
    assert.strictEqual(panel.querySelector('.vibe-viewall-error'), null, 'Successful empty result must not show error banner');
    assert.strictEqual(panel.querySelector('.vibe-viewall-retry'), null, 'No retry button on successful empty result');

    // Assert: Empty state placeholder rendered
    const emptyNotice = panel.querySelector('.vibe-viewall-empty');
    assert.ok(emptyNotice, 'Empty placeholder rendered');
    assert.strictEqual(emptyNotice.textContent, 'No annotations yet');
  });

  await t.test('stale retry and deferred read completions cannot overwrite newer site choice or reopen closed panel', async () => {
    mockStorage.annotations = [
      { id: 'a-1', url: 'http://localhost:3000/page1', comment: 'Site A', status: 'open' },
      { id: 'b-1', url: 'http://localhost:5173/page1', comment: 'Site B', status: 'open' }
    ];

    await VibeToolbar.openViewAll('http://localhost:3000');
    assert.ok(VibeToolbar.getViewAllPanel());

    const origLoad = VibeAPI.loadAllStoredAnnotations;
    let resolveDelayedRetry = null;

    VibeAPI.loadAllStoredAnnotations = async () => {
      return new Promise(resolve => {
        resolveDelayedRetry = () => resolve(origLoad.call(VibeAPI));
      });
    };

    try {
      // User closes panel before delayed read settles
      VibeToolbar.closeViewAll();
      assert.strictEqual(VibeToolbar.getViewAllPanel(), null, 'Panel closed');

      // Now resolve hanging read
      if (resolveDelayedRetry) resolveDelayedRetry();
      await new Promise(r => setTimeout(r, 50));

      assert.strictEqual(VibeToolbar.getViewAllPanel(), null, 'Superseded read cannot reopen closed panel');
    } finally {
      VibeAPI.loadAllStoredAnnotations = origLoad;
    }
  });

  await t.test('global deletion is enabled for hidden resolved records and disabled when nothing remains', async () => {
    mockStorage.annotations = [{ id: 'done', url: 'https://example.com/done', status: 'resolved' }];
    await VibeToolbar.openViewAll();
    let button = VibeToolbar.getViewAllPanel().querySelector('.vibe-viewall-delete-global');
    assert.ok(button);
    assert.strictEqual(button.hasAttribute('disabled'), false, 'Resolved annotations can still be purged');
    mockStorage.annotations = [];
    await VibeToolbar.openViewAll();
    button = VibeToolbar.getViewAllPanel().querySelector('.vibe-viewall-delete-global');
    assert.strictEqual(button.hasAttribute('disabled'), true, 'Empty global deletion must be disabled');
  });
});
