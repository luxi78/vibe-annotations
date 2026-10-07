import test from 'node:test';
import assert from 'node:assert';

// Mock storage
const mockStorage = {
  annotations: []
};

globalThis.chrome = {
  storage: {
    onChanged: { addListener: () => {}, removeListener: () => {} },
    local: {
      get: async (keys) => {
        const res = {};
        for (const k of keys) res[k] = mockStorage[k];
        return res;
      },
      set: async (items) => {
        Object.assign(mockStorage, items);
      }
    }
  },
  runtime: {
    getURL: (p) => `chrome-extension://mock/${p}`,
    sendMessage: async () => ({ success: true }),
    getManifest: () => ({ version: '2.1.0' })
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
    this._listeners = {};
    this._textContent = '';
    this._innerHTML = '';
    this.isConnected = true;
    this.offsetWidth = 100;
    this.offsetHeight = 30;

    this.classList = {
      add: (cls) => {
        const set = new Set((this.className || '').split(' ').filter(Boolean));
        set.add(cls);
        this.className = Array.from(set).join(' ');
      },
      remove: (cls) => {
        const set = new Set((this.className || '').split(' ').filter(Boolean));
        set.delete(cls);
        this.className = Array.from(set).join(' ');
      },
      toggle: (cls, force) => {
        const set = new Set((this.className || '').split(' ').filter(Boolean));
        const shouldAdd = force !== undefined ? !!force : !set.has(cls);
        if (shouldAdd) set.add(cls); else set.delete(cls);
        this.className = Array.from(set).join(' ');
        return shouldAdd;
      },
      contains: (cls) => (this.className || '').split(' ').includes(cls)
    };
  }

  attachShadow() {
    const sr = new MockElement('#shadow-root');
    sr.host = this;
    this.shadowRoot = sr;
    return sr;
  }

  getAttribute(name) {
    if (name === 'class') return this.className;
    if (name === 'id') return this.id;
    if (this.attributes[name] !== undefined) return this.attributes[name];
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (this.dataset[camel] !== undefined) return this.dataset[camel];
    }
    return null;
  }
  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[camel] = String(val);
    }
  }
  hasAttribute(name) {
    if (name in this.attributes) return true;
    if (name.startsWith('data-')) {
      const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return camel in this.dataset;
    }
    return false;
  }
  removeAttribute(name) { delete this.attributes[name]; }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    child.isConnected = this.isConnected;
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
      child.isConnected = false;
    }
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
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(l => l !== fn);
  }

  dispatchEvent(ev) {
    const list = this._listeners[ev.type] || [];
    for (const fn of list) fn(ev);
  }

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all[0] || null;
  }

  querySelectorAll(sel) {
    const results = [];
    const match = (el) => {
      if (sel === '*') return true;
      const parts = sel.split(/(?=[.#[])/);
      return parts.every(part => {
        if (part.startsWith('.')) return el.classList && el.classList.contains(part.slice(1));
        if (part.startsWith('#')) return el.id === part.slice(1);
        if (part.startsWith('[')) {
          const content = part.slice(1, -1);
          const eq = content.indexOf('=');
          if (eq !== -1) {
            const attr = content.slice(0, eq);
            const val = content.slice(eq + 1).replace(/^["']|["']$/g, '');
            return el.getAttribute(attr) === val;
          }
          return el.hasAttribute(content);
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

  get textContent() {
    if (this.children.length === 0) return this._textContent;
    return this.children.map(c => c.textContent).join('');
  }

  set textContent(v) {
    this._textContent = String(v);
    this.children = [];
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
  }

  getBoundingClientRect() {
    return { left: 50, top: 50, width: 100, height: 30, right: 150, bottom: 80 };
  }

  scrollIntoView() {
    this.scrollIntoViewCalls = (this.scrollIntoViewCalls || 0) + 1;
  }
}

// Global DOM mocks
const origSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (...args) => {
  const timer = origSetTimeout(...args);
  if (timer && typeof timer.unref === 'function') timer.unref();
  return timer;
};

const mockHead = new MockElement('head');
const mockBody = new MockElement('body');
const mockDocument = {
  head: mockHead,
  body: mockBody,
  createElement: (tag) => new MockElement(tag),
  querySelectorAll: (sel) => mockBody.querySelectorAll(sel),
  querySelector: (sel) => mockBody.querySelector(sel)
};
globalThis.document = mockDocument;

globalThis.window = {
  scrollX: 0,
  scrollY: 0,
  innerWidth: 1024,
  innerHeight: 768,
  location: {
    origin: 'http://localhost:3000',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    href: 'http://localhost:3000/page1'
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id)
};

globalThis.MutationObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() {}
  disconnect() {}
};

globalThis.ResizeObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() {}
  disconnect() {}
};

// Import modules
const { default: _VibeEvents } = await import('../lib/content/event-bus.js');
const { default: VibeShadowHost } = await import('../lib/content/shadow-host.js');
const { default: _VibeElementContext } = await import('../lib/content/element-context.js');
const { default: _VibeAPI } = await import('../lib/content/api-bridge.js');
const { default: VibeBadgeManager } = await import('../lib/content/badge-manager.js');

test('Badge manager reconciliation - Seam 1 (Core Continuity)', async (t) => {
  t.beforeEach(() => {
    mockHead.children = [];
    mockBody.children = [];
    mockStorage.annotations = [];
    VibeShadowHost.destroy();
    VibeShadowHost.init();
    VibeBadgeManager.clearAll();
    VibeBadgeManager.init();
  });

  await t.test('unchanged annotations retain existing pins and preview styles without clearing or reverting', async () => {
    // 1. Setup host element
    const hostTarget = new MockElement('button');
    hostTarget.id = 'submit-btn';
    hostTarget.style.color = 'rgb(0, 0, 0)';
    mockBody.appendChild(hostTarget);

    // Track style assignments on hostTarget
    const styleHistory = [];
    const origStyle = hostTarget.style;
    hostTarget.style = new Proxy(origStyle, {
      set(target, prop, val) {
        styleHistory.push({ prop, val });
        target[prop] = val;
        return true;
      }
    });

    const annotation1 = {
      id: 'ann-1',
      url: 'http://localhost:3000/page1',
      selector: '#submit-btn',
      comment: 'Change color to red',
      status: 'open',
      created_at: '2026-01-01T00:00:00.000Z',
      pending_changes: {
        color: { value: 'red', original: 'rgb(0, 0, 0)' }
      }
    };

    mockStorage.annotations = [annotation1];

    // Initial render
    await VibeBadgeManager.render([annotation1]);

    const shadowRoot = VibeShadowHost.getRoot();
    const pin1 = shadowRoot.querySelector('.vibe-badge[data-annotation-id="ann-1"]');
    assert.ok(pin1, 'Pin 1 must be rendered in shadow DOM');
    assert.strictEqual(hostTarget.style.color, 'red', 'Style must be applied to host target');

    // Clear history to watch subsequent refresh
    styleHistory.length = 0;

    // Refresh with identical annotations
    await VibeBadgeManager.render([annotation1]);

    const pinAfterRefresh = shadowRoot.querySelector('.vibe-badge[data-annotation-id="ann-1"]');
    assert.strictEqual(
      pinAfterRefresh,
      pin1,
      'Unchanged pin must retain the exact same DOM node instance'
    );

    // Assert that style was not temporarily reverted to original or blank
    const reverted = styleHistory.some(h => h.prop === 'color' && (h.val === 'rgb(0, 0, 0)' || h.val === ''));
    assert.strictEqual(
      reverted,
      false,
      'Style must not briefly revert to original or empty during refresh'
    );
  });

  await t.test('additions, updates, and deletions affect only relevant pins and previews', async () => {
    // Setup two host elements
    const hostEl1 = new MockElement('button');
    hostEl1.id = 'btn-1';
    hostEl1.style.color = 'rgb(0, 0, 0)';
    mockBody.appendChild(hostEl1);

    const hostEl2 = new MockElement('div');
    hostEl2.id = 'card-2';
    hostEl2.style.fontSize = '14px';
    mockBody.appendChild(hostEl2);

    const ann1 = {
      id: 'ann-1',
      url: 'http://localhost:3000/page1',
      selector: '#btn-1',
      comment: 'Button comment',
      status: 'open',
      created_at: '2026-01-01T00:00:00.000Z',
      pending_changes: {
        color: { value: 'red', original: 'rgb(0, 0, 0)' }
      }
    };

    mockStorage.annotations = [ann1];
    await VibeBadgeManager.render([ann1]);

    const shadowRoot = VibeShadowHost.getRoot();
    const pin1 = shadowRoot.querySelector('.vibe-badge[data-annotation-id="ann-1"]');
    assert.ok(pin1, 'Pin 1 exists');
    assert.strictEqual(hostEl1.style.color, 'red');

    // 1. ADDITION: Add ann-2
    const ann2 = {
      id: 'ann-2',
      url: 'http://localhost:3000/page1',
      selector: '#card-2',
      comment: 'Card comment',
      status: 'open',
      created_at: '2026-01-01T01:00:00.000Z',
      pending_changes: {
        fontSize: { value: '18px', original: '14px' }
      }
    };

    mockStorage.annotations = [ann1, ann2];
    await VibeBadgeManager.render([ann1, ann2]);

    const pin1AfterAdd = shadowRoot.querySelector('.vibe-badge[data-annotation-id="ann-1"]');
    const pin2AfterAdd = shadowRoot.querySelector('.vibe-badge[data-annotation-id="ann-2"]');
    assert.strictEqual(pin1AfterAdd, pin1, 'Pin 1 remains the same DOM instance after Pin 2 is added');
    assert.ok(pin2AfterAdd, 'Pin 2 is added');
    assert.strictEqual(hostEl2.style.fontSize, '18px');

    // 2. UPDATE: Update ann-1 comment and pending changes
    const ann1Updated = {
      ...ann1,
      comment: 'Updated button comment',
      pending_changes: {
        color: { value: 'green', original: 'rgb(0, 0, 0)' }
      }
    };

    mockStorage.annotations = [ann1Updated, ann2];
    await VibeBadgeManager.render([ann1Updated, ann2]);

    const pin1AfterUpdate = shadowRoot.querySelector('.vibe-badge[data-annotation-id="ann-1"]');
    assert.strictEqual(pin1AfterUpdate, pin1, 'Pin 1 remains the same DOM instance after update');
    assert.strictEqual(hostEl1.style.color, 'green', 'Host element 1 style updated to green');
    const tooltip1 = pin1AfterUpdate.querySelector('.vibe-badge-tooltip');
    assert.strictEqual(tooltip1?.textContent, 'Updated button comment', 'Tooltip text updated');

    // 3. DELETION: Remove ann-1, keeping only ann-2
    mockStorage.annotations = [ann2];
    await VibeBadgeManager.render([ann2]);

    const pin1AfterDelete = shadowRoot.querySelector('.vibe-badge[data-annotation-id="ann-1"]');
    const pin2AfterDelete = shadowRoot.querySelector('.vibe-badge[data-annotation-id="ann-2"]');
    assert.strictEqual(pin1AfterDelete, null, 'Pin 1 was removed from shadow DOM');
    assert.strictEqual(pin2AfterDelete, pin2AfterAdd, 'Pin 2 remains the exact same DOM instance');
    assert.strictEqual(hostEl1.style.color, 'rgb(0, 0, 0)', 'Host element 1 pending changes reverted to original');
    assert.strictEqual(hostEl2.style.fontSize, '18px', 'Host element 2 styles remain intact');
  });

  await t.test('stylesheet and companion CSS annotations reconcile in place without node replacement', async () => {
    const sheetAnn = {
      id: 'sheet-1',
      type: 'stylesheet',
      url: 'http://localhost:3000/page1',
      css: 'body { background: black; }',
      status: 'open',
      created_at: '2026-01-01T00:00:00.000Z'
    };

    const hostBtn = new MockElement('button');
    hostBtn.id = 'style-btn';
    mockBody.appendChild(hostBtn);

    const compAnn = {
      id: 'comp-1',
      url: 'http://localhost:3000/page1',
      selector: '#style-btn',
      comment: 'Button with companion css',
      css: '#style-btn:hover { opacity: 0.8; }',
      status: 'open',
      created_at: '2026-01-01T01:00:00.000Z'
    };

    mockStorage.annotations = [sheetAnn, compAnn];
    await VibeBadgeManager.render([sheetAnn, compAnn]);

    const sheetStyleEl = mockHead.querySelector('style[data-vibe-style="sheet-1"]');
    const compStyleEl = mockHead.querySelector('style[data-vibe-style="comp-1"]');
    const compPin = VibeShadowHost.getRoot().querySelector('.vibe-badge[data-annotation-id="comp-1"]');

    assert.ok(sheetStyleEl, 'Stylesheet style tag is injected');
    assert.strictEqual(sheetStyleEl.textContent, 'body { background: black; }');
    assert.ok(compStyleEl, 'Companion style tag is injected');
    assert.strictEqual(compStyleEl.textContent, '#style-btn:hover { opacity: 0.8; }');
    assert.ok(compPin, 'Companion pin is rendered');

    // Refresh with identical annotations: assert node continuity
    await VibeBadgeManager.render([sheetAnn, compAnn]);

    const sheetAfterRefresh = mockHead.querySelector('style[data-vibe-style="sheet-1"]');
    const compAfterRefresh = mockHead.querySelector('style[data-vibe-style="comp-1"]');
    const pinAfterRefresh = VibeShadowHost.getRoot().querySelector('.vibe-badge[data-annotation-id="comp-1"]');

    assert.strictEqual(sheetAfterRefresh, sheetStyleEl, 'Stylesheet tag retains exact DOM instance');
    assert.strictEqual(compAfterRefresh, compStyleEl, 'Companion style tag retains exact DOM instance');
    assert.strictEqual(pinAfterRefresh, compPin, 'Pin retains exact DOM instance');

    // Update CSS content in place
    const sheetUpdated = { ...sheetAnn, css: 'body { background: #111; }' };
    mockStorage.annotations = [sheetUpdated, compAnn];
    await VibeBadgeManager.render([sheetUpdated, compAnn]);

    assert.strictEqual(
      mockHead.querySelector('style[data-vibe-style="sheet-1"]'),
      sheetStyleEl,
      'Updated stylesheet tag retains same DOM instance'
    );
    assert.strictEqual(sheetStyleEl.textContent, 'body { background: #111; }');

    // Delete stylesheet annotation, remove companion CSS from comp-1
    const compNoCss = { ...compAnn, css: undefined };
    mockStorage.annotations = [compNoCss];
    await VibeBadgeManager.render([compNoCss]);

    assert.strictEqual(mockHead.querySelector('style[data-vibe-style="sheet-1"]'), null, 'Stylesheet tag was removed');
    assert.strictEqual(mockHead.querySelector('style[data-vibe-style="comp-1"]'), null, 'Companion style tag was removed');
    assert.strictEqual(
      VibeShadowHost.getRoot().querySelector('.vibe-badge[data-annotation-id="comp-1"]'),
      compPin,
      'Pin for comp-1 remains mounted despite companion css removal'
    );
  });

  await t.test('project-wide numbering, watch mode, and status rules update in place', async () => {
    const hostTarget = new MockElement('button');
    hostTarget.id = 'num-btn';
    mockBody.appendChild(hostTarget);

    const pageAnn = {
      id: 'page-1',
      url: 'http://localhost:3000/page1',
      selector: '#num-btn',
      comment: 'Page annotation',
      status: 'open',
      created_at: '2026-01-01T12:00:00.000Z'
    };

    mockStorage.annotations = [pageAnn];
    await VibeBadgeManager.render([pageAnn]);

    const shadowRoot = VibeShadowHost.getRoot();
    const pin = shadowRoot.querySelector('.vibe-badge[data-annotation-id="page-1"]');
    assert.ok(pin, 'Pin rendered');
    const label = pin.querySelector('.vibe-badge-label');
    assert.strictEqual(label.textContent, '1', 'Initial project index is 1');

    // 1. Earlier project annotation inserted: numbering updates in place
    const earlierAnn = {
      id: 'earlier-1',
      url: 'http://localhost:3000/page2',
      selector: '#other-btn',
      comment: 'Earlier page 2 note',
      status: 'open',
      created_at: '2026-01-01T10:00:00.000Z'
    };

    mockStorage.annotations = [earlierAnn, pageAnn];
    await VibeBadgeManager.render([pageAnn]); // render current page only

    const pinAfterRenumber = shadowRoot.querySelector('.vibe-badge[data-annotation-id="page-1"]');
    assert.strictEqual(pinAfterRenumber, pin, 'Pin DOM instance is preserved during renumbering');
    assert.strictEqual(label.textContent, '2', 'Numbering updated in place to 2');

    // 2. Later project annotation added: numbering unaffected, pin unaffected
    const laterAnn = {
      id: 'later-1',
      url: 'http://localhost:3000/page3',
      selector: '#later-btn',
      comment: 'Later page 3 note',
      status: 'open',
      created_at: '2026-01-01T14:00:00.000Z'
    };
    mockStorage.annotations = [earlierAnn, pageAnn, laterAnn];
    await VibeBadgeManager.render([pageAnn]);

    assert.strictEqual(label.textContent, '2', 'Numbering remains 2');
    assert.strictEqual(
      shadowRoot.querySelector('.vibe-badge[data-annotation-id="page-1"]'),
      pin,
      'Pin remains unchanged'
    );

    // 3. Watch mode transition in place
    _VibeEvents.emit('watch:changed', { active: true });
    assert.ok(pin.classList.contains('watching'), 'Badge has watching class');
    assert.strictEqual(pin.querySelector('svg') !== null, true, 'Badge label displays eye SVG in watch mode');
    assert.strictEqual(
      shadowRoot.querySelector('.vibe-badge[data-annotation-id="page-1"]'),
      pin,
      'Pin remains the same DOM instance in watch mode'
    );

    _VibeEvents.emit('watch:changed', { active: false });
    assert.strictEqual(pin.classList.contains('watching'), false, 'Badge no longer has watching class');
    assert.strictEqual(label.textContent, '2', 'Badge restores project index 2');

    // 4. Resolved annotation gets no pin and does not count in project index
    const resolvedAnn = {
      id: 'res-1',
      url: 'http://localhost:3000/page1',
      selector: '#num-btn',
      status: 'resolved',
      created_at: '2026-01-01T08:00:00.000Z'
    };
    mockStorage.annotations = [resolvedAnn, earlierAnn, pageAnn, laterAnn];
    await VibeBadgeManager.render([resolvedAnn, pageAnn]);

    assert.strictEqual(
      shadowRoot.querySelector('.vibe-badge[data-annotation-id="res-1"]'),
      null,
      'Resolved annotation gets no pin'
    );
    assert.strictEqual(label.textContent, '2', 'Resolved annotation does not shift project index');
  });

  await t.test('Seam 2 (Rematching): disconnected elements are rematched without rebuilding unrelated pins', async () => {
    const btn1 = new MockElement('button');
    btn1.id = 'rematch-1';
    mockBody.appendChild(btn1);

    const btn2 = new MockElement('button');
    btn2.id = 'rematch-2';
    mockBody.appendChild(btn2);

    const ann1 = {
      id: 'r-1',
      url: 'http://localhost:3000/page1',
      selector: '#rematch-1',
      comment: 'Button 1',
      status: 'open',
      created_at: '2026-01-01T00:00:00.000Z',
      pending_changes: {
        color: { value: 'red', original: 'black' }
      }
    };
    const ann2 = {
      id: 'r-2',
      url: 'http://localhost:3000/page1',
      selector: '#rematch-2',
      comment: 'Button 2',
      status: 'open',
      created_at: '2026-01-01T01:00:00.000Z',
      pending_changes: {
        color: { value: 'blue', original: 'black' }
      }
    };

    mockStorage.annotations = [ann1, ann2];
    await VibeBadgeManager.render([ann1, ann2]);

    const shadowRoot = VibeShadowHost.getRoot();
    const pin1 = shadowRoot.querySelector('.vibe-badge[data-annotation-id="r-1"]');
    const pin2 = shadowRoot.querySelector('.vibe-badge[data-annotation-id="r-2"]');
    assert.ok(pin1 && pin2);

    // Simulate SPA framework replacing btn1 with a fresh DOM node
    btn1.remove(); // isConnected = false
    const newBtn1 = new MockElement('button');
    newBtn1.id = 'rematch-1';
    newBtn1.style.color = 'black';
    mockBody.appendChild(newBtn1);

    // Re-render: should reconcile r-1 to newBtn1 and leave pin2 completely untouched
    await VibeBadgeManager.render([ann1, ann2]);

    const pin1After = shadowRoot.querySelector('.vibe-badge[data-annotation-id="r-1"]');
    const pin2After = shadowRoot.querySelector('.vibe-badge[data-annotation-id="r-2"]');

    assert.strictEqual(pin1After, pin1, 'Pin 1 preserves DOM identity when target element is replaced');
    assert.strictEqual(pin2After, pin2, 'Pin 2 remains untouched');
    assert.strictEqual(newBtn1.style.color, 'red', 'Pending changes applied to new target element');

    // Test targetBadge functionality with new target
    VibeBadgeManager.targetBadge('r-1');
    assert.strictEqual(newBtn1.scrollIntoViewCalls, 1, 'targetBadge scrolls new target into view');
    assert.ok(pin1.classList.contains('targeted'), 'Pin 1 receives targeted class');
  });

  await t.test('Seam 3 (Async & Failure): failed reads and out-of-order renders do not wipe or corrupt UI', async () => {
    const btn = new MockElement('button');
    btn.id = 'async-btn';
    btn.style.color = 'black';
    mockBody.appendChild(btn);

    const ann = {
      id: 'async-1',
      url: 'http://localhost:3000/page1',
      selector: '#async-btn',
      comment: 'Async button',
      status: 'open',
      created_at: '2026-01-01T00:00:00.000Z',
      pending_changes: {
        color: { value: 'purple', original: 'black' }
      }
    };

    mockStorage.annotations = [ann];
    await VibeBadgeManager.render([ann]);

    const shadowRoot = VibeShadowHost.getRoot();
    const pin = shadowRoot.querySelector('.vibe-badge[data-annotation-id="async-1"]');
    assert.ok(pin, 'Initial pin exists');
    assert.strictEqual(btn.style.color, 'purple');

    // 1. FAILED READ: Storage throws an error during refresh
    const origGet = globalThis.chrome.storage.local.get;
    globalThis.chrome.storage.local.get = async () => {
      throw new Error('Simulated storage failure');
    };

    // Render attempt during error
    await VibeBadgeManager.render([ann]);

    // Pin and styles must NOT be cleared!
    const pinAfterFailure = shadowRoot.querySelector('.vibe-badge[data-annotation-id="async-1"]');
    assert.strictEqual(pinAfterFailure, pin, 'Pin is preserved and NOT wiped on failed read');
    assert.strictEqual(btn.style.color, 'purple', 'Preview styles are preserved on failed read');

    // Restore storage.local.get
    globalThis.chrome.storage.local.get = origGet;

    // 2. OVERLAPPING OUT-OF-ORDER RENDERS:
    // Render A is triggered, but delayed.
    let resolveDelayedA;
    const delayedPromise = new Promise(r => { resolveDelayedA = r; });

    const origLoadProjectAnnotations = _VibeAPI.loadProjectAnnotations;
    let intercept = true;
    _VibeAPI.loadProjectAnnotations = async (...args) => {
      if (intercept) {
        intercept = false;
        await delayedPromise;
        return [ann]; // stale return for Render A
      }
      return origLoadProjectAnnotations.apply(_VibeAPI, args);
    };

    // Trigger Render A (slow)
    const renderPromiseA = VibeBadgeManager.render([ann]);

    // Trigger Render B (fast, with updated comment)
    const annUpdated = { ...ann, comment: 'Updated comment from Render B' };
    mockStorage.annotations = [annUpdated];
    await VibeBadgeManager.render([annUpdated]);

    const pinAfterB = shadowRoot.querySelector('.vibe-badge[data-annotation-id="async-1"]');
    assert.strictEqual(
      pinAfterB.querySelector('.vibe-badge-tooltip')?.textContent,
      'Updated comment from Render B',
      'Render B took effect'
    );

    // Now let Render A finish
    resolveDelayedA();
    await renderPromiseA;

    // Stale Render A must NOT have overwritten Render B's results
    const pinFinal = shadowRoot.querySelector('.vibe-badge[data-annotation-id="async-1"]');
    assert.strictEqual(pinFinal, pin, 'Pin preserves identity');
    assert.strictEqual(
      pinFinal.querySelector('.vibe-badge-tooltip')?.textContent,
      'Updated comment from Render B',
      'Stale Render A was ignored and did not overwrite Render B'
    );

    _VibeAPI.loadProjectAnnotations = origLoadProjectAnnotations;
  });

  await t.test('Seam 4 (Teardown): explicit overlay close and clearAll perform thorough cleanup', async () => {
    const btn = new MockElement('button');
    btn.id = 'td-btn';
    btn.style.padding = '10px';
    mockBody.appendChild(btn);

    const elemAnn = {
      id: 'td-1',
      url: 'http://localhost:3000/page1',
      selector: '#td-btn',
      comment: 'Teardown test',
      status: 'open',
      created_at: '2026-01-01T00:00:00.000Z',
      pending_changes: {
        padding: { value: '30px', original: '10px' }
      },
      css: '#td-btn { color: red; }'
    };

    const sheetAnn = {
      id: 'td-sheet',
      type: 'stylesheet',
      url: 'http://localhost:3000/page1',
      css: 'body { margin: 0; }',
      status: 'open',
      created_at: '2026-01-01T00:00:00.000Z'
    };

    mockStorage.annotations = [elemAnn, sheetAnn];
    await VibeBadgeManager.render([elemAnn, sheetAnn]);

    const shadowRoot = VibeShadowHost.getRoot();
    assert.ok(shadowRoot.querySelector('.vibe-badge[data-annotation-id="td-1"]'));
    assert.strictEqual(btn.style.padding, '30px');
    assert.ok(mockHead.querySelector('style[data-vibe-style="td-1"]'));
    assert.ok(mockHead.querySelector('style[data-vibe-style="td-sheet"]'));

    // Trigger genuine teardown via clearAll
    VibeBadgeManager.clearAll([elemAnn, sheetAnn]);

    assert.strictEqual(
      shadowRoot.querySelector('.vibe-badge'),
      null,
      'All badges removed from shadow root'
    );
    assert.strictEqual(btn.style.padding, '10px', 'Inline pending styles reverted to original');
    assert.strictEqual(
      mockHead.querySelector('style[data-vibe-style="td-1"]'),
      null,
      'Companion style tag removed'
    );
    assert.strictEqual(
      mockHead.querySelector('style[data-vibe-style="td-sheet"]'),
      null,
      'Stylesheet tag removed'
    );
    assert.strictEqual(VibeBadgeManager.getCount(), 0, 'Badge count is 0');
  });
});
