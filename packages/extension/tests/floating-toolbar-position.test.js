import test from 'node:test';
import assert from 'node:assert';

// Mock storage
const mockStorage = {};
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
    sendMessage: async () => ({ success: true })
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
    this.offsetWidth = 200;
    this.offsetHeight = 40;
    this._listeners = {};
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
      contains: (cls) => (this.className || '').split(' ').includes(cls)
    };
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

  querySelector(sel) {
    const find = (el) => {
      if (sel.startsWith('.')) {
        const cls = sel.slice(1);
        if (el.classList && el.classList.contains(cls)) return el;
      }
      for (const child of el.children || []) {
        const res = find(child);
        if (res) return res;
      }
      return null;
    };
    const found = find(this);
    if (found) return found;

    // Fallback: lazily create queried button/pill/status element if accessed by toolbar
    const autoEl = new MockElement(sel.startsWith('button') ? 'button' : 'div');
    if (sel.startsWith('.')) {
      autoEl.classList.add(sel.slice(1));
    }
    this.appendChild(autoEl);
    return autoEl;
  }

  querySelectorAll(sel) {
    return [];
  }

  getBoundingClientRect() {
    return {
      left: 100,
      top: 100,
      right: 300,
      bottom: 140,
      width: this.offsetWidth,
      height: this.offsetHeight
    };
  }
}

// Unref all intervals so node test runner exits without hanging
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
const documentListeners = {};

globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  location: { protocol: 'http:', hostname: 'localhost', origin: 'http://localhost:3000' },
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => { cb(); return 1; },
  cancelAnimationFrame: () => {}
};

globalThis.document = {
  createElement: (tag) => new MockElement(tag),
  body: rootElement,
  addEventListener: (type, fn) => {
    if (!documentListeners[type]) documentListeners[type] = [];
    documentListeners[type].push(fn);
  },
  removeEventListener: (type, fn) => {
    if (documentListeners[type]) {
      documentListeners[type] = documentListeners[type].filter(f => f !== fn);
    }
  }
};

globalThis.requestAnimationFrame = (cb) => { cb(); return 1; };
globalThis.cancelAnimationFrame = () => {};

// Mock fetch for health checks
globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });

// Setup VibeShadowHost mock before loading modules
const { default: VibeShadowHost } = await import('../lib/content/shadow-host.js');
VibeShadowHost.getRoot = () => shadowRootMock;

const { default: VibeEvents } = await import('../lib/content/event-bus.js');
const { default: VibeToolbar } = await import('../lib/content/floating-toolbar.js');

test('floating toolbar position lifecycle', async (t) => {
  const getToolbar = () => shadowRootMock.children.find(c => c.classList.contains('vibe-toolbar'));

  t.afterEach(() => {
    // Ensure background polling timers are cleanly stopped after each test
    VibeEvents.emit('overlay:closed');
  });

  await t.test('closing overlay does not wipe saved position and reopening restores it', async () => {
    // Pre-seed storage with a saved position
    mockStorage.vibeToolbarPos = { right: '120px', top: '80px' };

    await VibeToolbar.init();

    const toolbar = getToolbar();
    assert.ok(toolbar, 'Toolbar element should be created');
    assert.strictEqual(toolbar.style.right, '120px');
    assert.strictEqual(toolbar.style.top, '80px');

    // Close the overlay
    VibeEvents.emit('overlay:closed');

    // Acceptance criterion: Closing the overlay does not clear or delete the saved position from storage
    assert.deepStrictEqual(
      mockStorage.vibeToolbarPos,
      { right: '120px', top: '80px' },
      'Saved position in storage must NOT be cleared when overlay is closed'
    );
    assert.strictEqual(toolbar.style.right, '120px', 'Toolbar style.right should not be blanked');
    assert.strictEqual(toolbar.style.top, '80px', 'Toolbar style.top should not be blanked');

    // Change stored coordinates (e.g. from another tab or external update)
    mockStorage.vibeToolbarPos = { right: '200px', top: '150px' };

    // Reopen the overlay
    VibeEvents.emit('overlay:shown');
    // Wait a tick for async restorePosition to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    // Acceptance criterion: Reopening the overlay restores the toolbar to its last saved position
    assert.strictEqual(toolbar.style.right, '200px', 'Reopening overlay restores saved right position');
    assert.strictEqual(toolbar.style.top, '150px', 'Reopening overlay restores saved top position');
  });

  await t.test('moving floating toolbar saves its position to storage', async () => {
    const toolbar = getToolbar();
    assert.ok(toolbar, 'Toolbar element exists');

    // Simulate drag
    toolbar.dispatchEvent({
      type: 'mousedown',
      target: toolbar,
      clientX: 100,
      clientY: 100,
      preventDefault: () => {}
    });

    // Move document
    const mousemove = documentListeners.mousemove?.[0];
    const mouseup = documentListeners.mouseup?.[0];
    assert.ok(mousemove, 'mousemove listener should be attached');
    assert.ok(mouseup, 'mouseup listener should be attached');

    mousemove({
      clientX: 120,
      clientY: 140
    });

    mouseup({});

    // Acceptance criterion: Moving the floating toolbar saves its position.
    assert.ok(mockStorage.vibeToolbarPos, 'Position should be saved to storage');
    assert.strictEqual(toolbar.style.right, mockStorage.vibeToolbarPos.right);
    assert.strictEqual(toolbar.style.top, mockStorage.vibeToolbarPos.top);
  });

  await t.test('refreshing page preserves toolbar position from storage', async () => {
    // Storage retained the position from prior operations
    mockStorage.vibeToolbarPos = { right: '350px', top: '220px' };

    // Fresh DOM on page reload
    shadowRootMock.children = [];

    // Simulate page reload calling init()
    await VibeToolbar.init();

    const toolbar = getToolbar();
    assert.ok(toolbar, 'Toolbar element exists');
    assert.strictEqual(toolbar.style.right, '350px', 'Page reload preserves saved right coordinate');
    assert.strictEqual(toolbar.style.top, '220px', 'Page reload preserves saved top coordinate');
  });
});
