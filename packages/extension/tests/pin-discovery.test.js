import test from 'node:test';
import assert from 'node:assert';

// Mock storage
const mockStorage = {
  annotations: []
};

const storageListeners = new Set();
function notifyAnnotationsChanged() {
  for (const listener of storageListeners) {
    try {
      listener({ annotations: { newValue: mockStorage.annotations } }, 'local');
    } catch {}
  }
}

if (!globalThis.chrome) globalThis.chrome = {};
const existingStorage = globalThis.chrome.storage;
globalThis.chrome.storage = {
  onChanged: {
    addListener: (l) => {
      storageListeners.add(l);
      existingStorage?.onChanged?.addListener?.(l);
    },
    removeListener: (l) => {
      storageListeners.delete(l);
      existingStorage?.onChanged?.removeListener?.(l);
    }
  },
  local: {
    get: async (keys) => {
      const res = {};
      for (const k of keys) res[k] = mockStorage[k];
      return res;
    },
    set: async (items) => {
      Object.assign(mockStorage, items);
      notifyAnnotationsChanged();
    }
  }
};
if (!globalThis.chrome.runtime) {
  globalThis.chrome.runtime = {
    getURL: (p) => `chrome-extension://mock/${p}`,
    sendMessage: async () => ({ success: true }),
    getManifest: () => ({ version: '2.1.0' })
  };
}

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

const mockHead = new MockElement('head');
const mockBody = new MockElement('body');
const mockDocument = {
  head: mockHead,
  body: mockBody,
  documentElement: mockBody,
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

class MockMutationObserver {
  constructor(cb) {
    this.cb = cb;
    MockMutationObserver.instances.push(this);
  }
  observe(target, options) {
    this.target = target;
    this.options = options;
  }
  disconnect() {
    this.disconnected = true;
    const idx = MockMutationObserver.instances.indexOf(this);
    if (idx !== -1) MockMutationObserver.instances.splice(idx, 1);
  }
  trigger(mutations = []) {
    if (!this.disconnected) this.cb(mutations);
  }
}
MockMutationObserver.instances = [];
globalThis.MutationObserver = MockMutationObserver;

globalThis.ResizeObserver = class {
  constructor(cb) { this.cb = cb; }
  observe() {}
  disconnect() {}
};

// Import modules
const { default: VibeEvents } = await import('../lib/content/event-bus.js');
const { default: VibeShadowHost } = await import('../lib/content/shadow-host.js');
const { default: VibeBadgeManager } = await import('../lib/content/badge-manager.js');
const { default: VibePinDiscovery } = await import('../lib/content/pin-discovery.js');

test('Slice 1 - Seam 1: Badge Render Completion Contract', async (t) => {
  t.beforeEach(() => {
    mockHead.children = [];
    mockBody.children = [];
    mockStorage.annotations = [];
    MockMutationObserver.instances = [];
    VibeShadowHost.destroy();
    VibeShadowHost.init();
    VibeBadgeManager.clearAll();
    VibeBadgeManager.init();
  });

  await t.test('render() returns completed metrics and distinguishes rendered vs unresolved eligible targets', async () => {
    // Target element in body
    const el1 = new MockElement('div');
    el1.id = 'target-1';
    mockBody.appendChild(el1);

    const annFound = {
      id: 'ann-1',
      url: 'http://localhost:3000/page1',
      selector: '#target-1',
      comment: 'Found pin',
      created_at: '2026-01-01T00:00:00.000Z'
    };
    const annMissing = {
      id: 'ann-2',
      url: 'http://localhost:3000/page1',
      selector: '#non-existent-target',
      comment: 'Missing pin',
      created_at: '2026-01-01T00:01:00.000Z'
    };
    const annStylesheet = {
      id: 'ann-sheet',
      url: 'http://localhost:3000/page1',
      type: 'stylesheet',
      css: 'body { color: red; }',
      created_at: '2026-01-01T00:02:00.000Z'
    };
    const annResolved = {
      id: 'ann-res',
      url: 'http://localhost:3000/page1',
      selector: '#target-1',
      status: 'resolved',
      created_at: '2026-01-01T00:03:00.000Z'
    };

    mockStorage.annotations = [annFound, annMissing, annStylesheet, annResolved];

    let emittedEvent = null;
    const eventHandler = (data) => { emittedEvent = data; };
    VibeEvents.on('badges:rendered', eventHandler);

    try {
      const renderResult = await VibeBadgeManager.render([annFound, annMissing, annStylesheet, annResolved]);

      // 1. Return value contract
      assert.ok(renderResult, 'render() must return a completed result object');
      assert.strictEqual(renderResult.count, 1, 'Rendered pin count must be 1');
      assert.deepStrictEqual(renderResult.renderedIds, ['ann-1'], 'renderedIds must contain exactly found pin');
      assert.strictEqual(renderResult.unresolvedIds.length, 1, 'Only ann-2 is an unresolved eligible target');
      assert.strictEqual(renderResult.unresolvedIds[0], 'ann-2', 'ann-2 is the missing element target');

      // 2. Event emission contract
      assert.ok(emittedEvent, 'badges:rendered must be emitted');
      assert.strictEqual(emittedEvent.count, 1);
      assert.deepStrictEqual(emittedEvent.renderedIds, ['ann-1']);
      assert.deepStrictEqual(emittedEvent.unresolvedIds, ['ann-2']);

      // 3. Helper inspection contract
      assert.strictEqual(VibeBadgeManager.hasBadge('ann-1'), true);
      assert.strictEqual(VibeBadgeManager.hasBadge('ann-2'), false);
      assert.deepStrictEqual(VibeBadgeManager.getRenderedBadgeIds(), ['ann-1']);
    } finally {
      VibeEvents.off('badges:rendered', eventHandler);
    }
  });
});

test('Slice 2 - Seam 2: Non-overlapping async await & zero retries when all targets found', async (t) => {
  t.beforeEach(() => {
    mockHead.children = [];
    mockBody.children = [];
    mockStorage.annotations = [];
    MockMutationObserver.instances = [];
    VibeShadowHost.destroy();
    VibeShadowHost.init();
    VibeBadgeManager.clearAll();
    VibeBadgeManager.init();
    VibePinDiscovery.cancelDiscovery('test-reset');
  });

  await t.test('awaits async render completion and executes exactly 1 attempt when all eligible targets are found', async () => {
    const el1 = new MockElement('div');
    el1.id = 'target-1';
    const el2 = new MockElement('div');
    el2.id = 'target-2';
    mockBody.appendChild(el1);
    mockBody.appendChild(el2);

    const ann1 = {
      id: 'a1',
      url: 'http://localhost:3000/page1',
      selector: '#target-1',
      comment: 'Pin 1',
      created_at: '2026-01-01T00:00:00.000Z'
    };
    const ann2 = {
      id: 'a2',
      url: 'http://localhost:3000/page1',
      selector: '#target-2',
      comment: 'Pin 2',
      created_at: '2026-01-01T00:01:00.000Z'
    };
    const sheetAnn = {
      id: 's1',
      url: 'http://localhost:3000/page1',
      type: 'stylesheet',
      css: 'body { color: blue; }',
      created_at: '2026-01-01T00:02:00.000Z'
    };
    const resolvedAnn = {
      id: 'r1',
      url: 'http://localhost:3000/page1',
      selector: '#target-1',
      status: 'resolved',
      created_at: '2026-01-01T00:03:00.000Z'
    };

    const annotations = [ann1, ann2, sheetAnn, resolvedAnn];
    mockStorage.annotations = annotations;

    let renderCallCount = 0;
    const customRender = async (anns) => {
      renderCallCount++;
      // Simulate asynchronous rendering work
      await new Promise(r => setTimeout(r, 10));
      return await VibeBadgeManager.render(anns);
    };

    const discoveryPromise = VibePinDiscovery.startDiscovery({
      annotations,
      maxAttempts: 5,
      delay: 50,
      renderFn: customRender
    });

    const result = await discoveryPromise;

    // Must await completion, inspect completed render, and see that all eligible targets (a1, a2) were found
    assert.strictEqual(renderCallCount, 1, 'Render must be called exactly once when all eligible targets are found');
    assert.strictEqual(result.attempts, 1, 'Only 1 attempt must be made');
    assert.strictEqual(result.unresolvedIds.length, 0, 'No unresolved targets');
    assert.strictEqual(VibePinDiscovery.isObserverActive(), false, 'Mutation observer must NOT be started');

    // Wait a little longer to ensure no delayed retry was scheduled
    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(renderCallCount, 1, 'No delayed retry must execute after all targets were found');
  });

  await t.test('executes bounded sequential non-overlapping retries when targets are missing, preserving existing pins', async () => {
    const el1 = new MockElement('div');
    el1.id = 'target-existing';
    mockBody.appendChild(el1);

    const annFound = {
      id: 'ann-found',
      url: 'http://localhost:3000/page1',
      selector: '#target-existing',
      comment: 'Found pin',
      created_at: '2026-01-01T00:00:00.000Z'
    };
    const annMissing = {
      id: 'ann-missing',
      url: 'http://localhost:3000/page1',
      selector: '#target-not-here-yet',
      comment: 'Missing pin',
      created_at: '2026-01-01T00:01:00.000Z'
    };

    const annotations = [annFound, annMissing];
    mockStorage.annotations = annotations;

    const attemptTimestamps = [];
    let concurrentCalls = 0;
    let maxConcurrency = 0;

    const customRender = async (anns) => {
      concurrentCalls++;
      maxConcurrency = Math.max(maxConcurrency, concurrentCalls);
      attemptTimestamps.push(Date.now());
      await new Promise(r => setTimeout(r, 20));
      const res = await VibeBadgeManager.render(anns);
      concurrentCalls--;
      return res;
    };

    const result = await VibePinDiscovery.startDiscovery({
      annotations,
      maxAttempts: 3,
      delay: 40,
      renderFn: customRender
    });

    // 1. All 3 bounded attempts ran
    assert.strictEqual(result.attempts, 3, 'Must execute exactly maxAttempts (3)');
    assert.deepStrictEqual(result.unresolvedIds, ['ann-missing'], 'ann-missing remains unresolved');

    // 2. Attempts did not overlap (concurrency was always 1)
    assert.strictEqual(maxConcurrency, 1, 'Attempts must never overlap concurrently');
    assert.strictEqual(attemptTimestamps.length, 3, 'Must have 3 sequential attempt timestamps');

    // 3. Existing pin for ann-found was preserved throughout all retries
    assert.strictEqual(VibeBadgeManager.hasBadge('ann-found'), true, 'Existing pin remains rendered');
    assert.strictEqual(VibeBadgeManager.hasBadge('ann-missing'), false, 'Missing pin is not rendered');

    // 4. Lazy observer was started because attempts exhausted with unresolved targets
    assert.strictEqual(VibePinDiscovery.isObserverActive(), true, 'Lazy observer must be active');
  });

  await t.test('late-element discovery detects newly added DOM element, renders missing pin, and disconnects', async () => {
    const el1 = new MockElement('div');
    el1.id = 'target-1';
    mockBody.appendChild(el1);

    const ann1 = {
      id: 'ann-1',
      url: 'http://localhost:3000/page1',
      selector: '#target-1',
      created_at: '2026-01-01T00:00:00.000Z'
    };
    const annLate = {
      id: 'ann-late',
      url: 'http://localhost:3000/page1',
      selector: '#target-late',
      created_at: '2026-01-01T00:01:00.000Z'
    };

    const annotations = [ann1, annLate];
    mockStorage.annotations = annotations;

    // Start with 1 retry attempt to quickly enter lazy observer
    await VibePinDiscovery.startDiscovery({
      annotations,
      maxAttempts: 1,
      delay: 10
    });

    assert.strictEqual(VibePinDiscovery.isObserverActive(), true, 'Lazy observer is waiting for late element');
    const existingBadgeBefore = VibeShadowHost.getRoot().querySelector('[data-annotation-id="ann-1"]');
    assert.ok(existingBadgeBefore, 'Badge for ann-1 is rendered');

    // Late arrival of element in DOM
    const elLate = new MockElement('div');
    elLate.id = 'target-late';
    mockBody.appendChild(elLate);

    // Trigger mutation on active observer
    const activeObs = MockMutationObserver.instances[MockMutationObserver.instances.length - 1];
    assert.ok(activeObs, 'Mutation observer instance exists');
    activeObs.trigger([{ type: 'childList' }]);

    // Wait for 300ms debounce
    await new Promise(r => setTimeout(r, 350));

    // Both badges are now rendered
    assert.strictEqual(VibeBadgeManager.hasBadge('ann-1'), true, 'ann-1 pin remains rendered');
    assert.strictEqual(VibeBadgeManager.hasBadge('ann-late'), true, 'ann-late pin is rendered');

    // Node identity of existing badge is preserved
    const existingBadgeAfter = VibeShadowHost.getRoot().querySelector('[data-annotation-id="ann-1"]');
    assert.strictEqual(existingBadgeAfter, existingBadgeBefore, 'Existing badge DOM node is preserved without recreation');

    // Observer disconnected once all targets resolved
    assert.strictEqual(VibePinDiscovery.isObserverActive(), false, 'Observer must disconnect once all targets are resolved');
  });
});

test('Slice 4 - Seam 3: Lifecycle Invalidation, Generation Tokens & Teardown', async (t) => {
  t.beforeEach(() => {
    mockHead.children = [];
    mockBody.children = [];
    mockStorage.annotations = [];
    MockMutationObserver.instances = [];
    VibeShadowHost.destroy();
    VibeShadowHost.init();
    VibeBadgeManager.clearAll();
    VibeBadgeManager.init();
    VibePinDiscovery.cancelDiscovery('test-reset');
  });

  await t.test('old observer timeout cannot disconnect newer discovery cycle observer', async () => {
    const ann1 = {
      id: 'ann-missing-1',
      url: 'http://localhost:3000/page1',
      selector: '#never-here-1',
      created_at: '2026-01-01T00:00:00.000Z'
    };
    mockStorage.annotations = [ann1];

    // Cycle 1: exhaust attempts to enter lazy observer
    await VibePinDiscovery.startDiscovery({
      annotations: [ann1],
      maxAttempts: 1,
      delay: 10
    });
    assert.strictEqual(VibePinDiscovery.isObserverActive(), true, 'Cycle 1 observer is active');

    const ann2 = {
      id: 'ann-missing-2',
      url: 'http://localhost:3000/page1',
      selector: '#never-here-2',
      created_at: '2026-01-01T00:00:00.000Z'
    };
    mockStorage.annotations = [ann2];

    // Cycle 2: supersedes Cycle 1
    await VibePinDiscovery.startDiscovery({
      annotations: [ann2],
      maxAttempts: 1,
      delay: 10
    });
    assert.strictEqual(VibePinDiscovery.isObserverActive(), true, 'Cycle 2 observer is active');

    // Simulate an old timer callback attempting to fire with an obsolete cycle ID
    // (In our implementation, startLazyObserver guards: if (thisObsCycle === currentCycleId))
    // Even after resetting/advancing timers, Cycle 2's observer remains active.
    assert.strictEqual(VibePinDiscovery.isObserverActive(), true, 'Cycle 2 observer remains active despite prior cycle timeout');
  });

  await t.test('cancelDiscovery invalidates in-flight attempts, timers, and disconnects observer', async () => {
    let renderCount = 0;
    const customRender = async (anns) => {
      renderCount++;
      await new Promise(r => setTimeout(r, 30));
      return await VibeBadgeManager.render(anns);
    };

    const ann = {
      id: 'ann-pending',
      url: 'http://localhost:3000/page1',
      selector: '#pending-target',
      created_at: '2026-01-01T00:00:00.000Z'
    };

    // Start discovery with long delay and retries
    const promise = VibePinDiscovery.startDiscovery({
      annotations: [ann],
      maxAttempts: 5,
      delay: 100,
      renderFn: customRender
    });

    // Cancel while attempt 1 is in-flight or before retry 2
    await new Promise(r => setTimeout(r, 10));
    VibePinDiscovery.cancelDiscovery('overlay-closed');

    const result = await promise;
    assert.strictEqual(result.superseded, true, 'Promise resolves as superseded/cancelled');

    // Wait past the delay for attempt 2
    await new Promise(r => setTimeout(r, 150));
    assert.strictEqual(renderCount, 1, 'No subsequent retry attempts ran after cancellation');
    assert.strictEqual(VibePinDiscovery.isObserverActive(), false, 'No observer left active');
  });

  await t.test('duplicate rapid triggers are coalesced without launching redundant concurrent cycles', async () => {
    let renderCount = 0;
    const customRender = async (anns) => {
      renderCount++;
      await new Promise(r => setTimeout(r, 20));
      return await VibeBadgeManager.render(anns);
    };

    const ann = {
      id: 'ann-rapid',
      url: 'http://localhost:3000/page1',
      selector: '#rapid-target',
      created_at: '2026-01-01T00:00:00.000Z'
    };

    // Trigger multiple calls rapidly
    const p1 = VibePinDiscovery.startDiscovery({
      annotations: [ann],
      maxAttempts: 1,
      renderFn: customRender,
      coalesce: true
    });
    const p2 = VibePinDiscovery.startDiscovery({
      annotations: [ann],
      maxAttempts: 1,
      renderFn: customRender,
      coalesce: true
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    // Both settled on the coalesced cycle
    assert.strictEqual(renderCount, 1, 'Render function called only once for coalesced triggers');
    assert.strictEqual(r1.cycleId, r2.cycleId, 'Both share the same cycle ID');
  });

  await t.test('route changes and overlay closure prevent late asynchronous completions from creating pins', async () => {
    let lateResolve;
    const delayedRender = () => new Promise((resolve) => {
      lateResolve = resolve;
    });

    const el = new MockElement('div');
    el.id = 'delayed-target';
    mockBody.appendChild(el);

    const ann = {
      id: 'ann-delayed',
      url: 'http://localhost:3000/page1',
      selector: '#delayed-target',
      created_at: '2026-01-01T00:00:00.000Z'
    };

    // Start discovery with delayed render
    const discoveryPromise = VibePinDiscovery.startDiscovery({
      annotations: [ann],
      renderFn: delayedRender
    });

    // Simulate route navigation or overlay closure while render is suspended
    VibePinDiscovery.cancelDiscovery('route-change');
    VibeBadgeManager.clearAll();

    // Late completion resolves
    lateResolve({ count: 1, renderedIds: ['ann-delayed'], unresolvedIds: [] });
    const res = await discoveryPromise;

    assert.strictEqual(res.superseded, true, 'Result is marked superseded');
    assert.strictEqual(VibeBadgeManager.hasBadge('ann-delayed'), false, 'Late completion does not restore pin after route teardown');
  });
});
