import test from 'node:test';
import assert from 'node:assert';

const mockStorage = {
  clearOnCopy: false,
  screenshotEnabled: false,
  badgeColor: '#e06c75',
  customShortcut: null
};

globalThis.chrome = {
  storage: {
    onChanged: { addListener: () => {}, removeListener: () => {} },
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
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; },
      removeProperty: (k) => { delete this.style[k]; }
    };
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
    this._scrollHeight = 100;
    this._clientHeight = 100;
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

  get scrollTop() { return this._scrollTop || 0; }
  set scrollTop(v) { this._scrollTop = Number(v) || 0; }
  get scrollHeight() { return this._scrollHeight !== undefined ? this._scrollHeight : 100; }
  set scrollHeight(v) { this._scrollHeight = Number(v); }
  get clientHeight() { return this._clientHeight !== undefined ? this._clientHeight : 100; }
  set clientHeight(v) { this._clientHeight = Number(v); }

  focus() {
    if (globalThis.document) globalThis.document.activeElement = this;
    if (typeof shadowRootMock !== 'undefined' && shadowRootMock) shadowRootMock.activeElement = this;
  }

  closest(sel) {
    for (const part of sel.split(',').map(v => v.trim())) {
      if (part.startsWith('.')) {
        const cls = part.slice(1);
        if (this.classList && this.classList.contains(cls)) return this;
      } else if (/^[a-z]+$/i.test(part) && this.tagName === part.toUpperCase()) {
        return this;
      }
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
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  addEventListener(event, listener) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(listener);
  }

  removeEventListener(event, listener) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l !== listener);
  }

  dispatchEvent(event) {
    const listeners = this._listeners[event.type] || [];
    for (const listener of listeners) {
      listener.call(this, event);
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

  getAttribute(attr) {
    if (attr === 'class') return this.className;
    if (attr.startsWith('data-')) return this.dataset[attr.slice(5)];
    return this.attributes[attr];
  }

  setAttribute(attr, val) {
    if (attr === 'class') this.className = val;
    if (attr.startsWith('data-')) this.dataset[attr.slice(5)] = val;
    this.attributes[attr] = String(val);
  }

  hasAttribute(attr) {
    if (attr === 'class') return !!this.className;
    if (attr.startsWith('data-')) return attr.slice(5) in this.dataset;
    return attr in this.attributes;
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
        const textNode = new MockElement('#text');
        textNode.textContent = trimmed;
        currentParent.appendChild(textNode);
      }
      continue;
    }

    if (isClose) {
      if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName.toLowerCase()) {
        stack.pop();
      }
      continue;
    }

    const el = new MockElement(tagName);
    const attrRegex = /([a-zA-Z0-9-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      const name = attrMatch[1];
      const val = attrMatch[2] !== undefined ? attrMatch[2] : (attrMatch[3] !== undefined ? attrMatch[3] : (attrMatch[4] || ''));
      if (name === 'class') {
        el.className = val;
      } else if (name.startsWith('data-')) {
        el.dataset[name.slice(5)] = val;
        el.setAttribute(name, val);
      } else {
        el.setAttribute(name, val);
      }
    }

    if (currentParent) currentParent.appendChild(el);
    if (!isSelfClosing) stack.push(el);
  }
}

const rootElement = new MockElement('div');
rootElement.id = 'vibe-annotations-root';
const shadowRootMock = new MockElement('div');
shadowRootMock.host = rootElement;
rootElement.attachShadow = () => shadowRootMock;

globalThis.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  location: {
    origin: 'http://localhost:3000',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    href: 'http://localhost:3000/page1',
    pathname: '/page1'
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
  querySelector: () => null
};

const { default: VibeShadowHost } = await import('../lib/content/shadow-host.js');
VibeShadowHost.getRoot = () => shadowRootMock;

const { default: VibeEvents } = await import('../lib/content/event-bus.js');
const { default: VibeToolbar } = await import('../lib/content/floating-toolbar.js');

test('Settings and Documentation persistent shell navigation', async (t) => {
  await VibeToolbar.init();
  const toolbar = shadowRootMock.querySelector('.vibe-toolbar');
  assert.ok(toolbar, 'Toolbar mounted');

  t.after(() => {
    VibeEvents.emit('overlay:closed');
  });

  t.afterEach(() => {
    VibeToolbar.closeSettings?.();
    const settingsBtn = toolbar.querySelector('.vibe-tb-settings');
    if (settingsBtn && settingsBtn.classList.contains('active')) {
      settingsBtn.click();
    }
  });

  await t.test('navigating from Settings to Documentation and back keeps the exact same dropdown shell mounted', async () => {
    const settingsBtn = toolbar.querySelector('.vibe-tb-settings');
    assert.ok(settingsBtn, 'Settings button exists');
    settingsBtn.click();

    const dropdown = toolbar.querySelector('.vibe-settings-dropdown');
    assert.ok(dropdown, 'Settings dropdown is open');

    // Verify initial settings view has Documentation button
    const docsBtn = dropdown.querySelector('.vibe-get-started-btn');
    assert.ok(docsBtn, 'Documentation button exists in settings view');

    // Navigate to Documentation
    docsBtn.click();

    // Verify documentation view is displayed inside dropdown
    const backBtn = dropdown.querySelector('.vibe-guide-back-btn');
    assert.ok(backBtn, 'Back button exists in documentation view');
    assert.strictEqual(toolbar.querySelector('.vibe-settings-dropdown'), dropdown, 'Dropdown shell is preserved when navigating forward');

    // Click back button to return to Settings
    backBtn.click();

    // Verify dropdown shell is STILL the exact same DOM node instance (not destroyed and recreated)
    const dropdownAfterBack = toolbar.querySelector('.vibe-settings-dropdown');
    assert.strictEqual(dropdownAfterBack, dropdown, 'Dropdown shell must be the exact same DOM node instance after back navigation');

    // Verify Settings view contents are restored
    assert.ok(dropdown.querySelector('.vibe-get-started-btn'), 'Documentation entry button is restored in Settings view');
    assert.ok(dropdown.querySelector('.vibe-clear-on-copy-toggle'), 'Clear-on-copy toggle is restored in Settings view');
  });

  await t.test('multi-level navigation restores scroll position and entry-button focus at each level', async () => {
    const settingsBtn = toolbar.querySelector('.vibe-tb-settings');
    settingsBtn.click();
    const dropdown = toolbar.querySelector('.vibe-settings-dropdown');
    assert.ok(dropdown);

    const settingsBody = dropdown.querySelector('.vibe-settings-body');
    settingsBody.scrollHeight = 300;
    settingsBody.clientHeight = 100;
    settingsBody.scrollTop = 45;

    const docsBtn = dropdown.querySelector('.vibe-get-started-btn');
    docsBtn.focus();
    docsBtn.click();

    // In Documentation view
    const docsBody = dropdown.querySelector('.vibe-settings-body');
    assert.strictEqual(docsBody.scrollTop, 0, 'New view starts at top scroll position');
    docsBody.scrollHeight = 500;
    docsBody.clientHeight = 100;
    docsBody.scrollTop = 80;

    const mcpBtn = dropdown.querySelector('.vibe-mcp-server-btn');
    assert.ok(mcpBtn, 'MCP Server button exists in documentation view');
    mcpBtn.focus();
    mcpBtn.click();

    // In MCP setup Guide view
    const guideBody = dropdown.querySelector('.vibe-settings-body');
    assert.strictEqual(guideBody.scrollTop, 0, 'Guide view starts at top scroll position');
    assert.ok(dropdown.querySelector('.vibe-guide'), 'Guide view is rendered');
    const guideBackBtn = dropdown.querySelector('.vibe-guide-back-btn');
    assert.ok(guideBackBtn, 'Guide back button exists');

    // Click back to return to Documentation
    guideBackBtn.click();

    // Verify back in Documentation view
    assert.strictEqual(toolbar.querySelector('.vibe-settings-dropdown'), dropdown, 'Shell remained mounted');
    const docsBodyAfter = dropdown.querySelector('.vibe-settings-body');
    assert.strictEqual(docsBodyAfter.scrollTop, 80, 'Documentation scroll position is restored');
    assert.strictEqual(shadowRootMock.activeElement, dropdown.querySelector('.vibe-mcp-server-btn'), 'Focus returned to MCP entry button');

    // Click back to return to Settings root
    const docsBackBtn = dropdown.querySelector('.vibe-guide-back-btn');
    assert.ok(docsBackBtn, 'Docs back button exists');
    docsBackBtn.click();

    // Verify back in Settings view
    assert.strictEqual(toolbar.querySelector('.vibe-settings-dropdown'), dropdown, 'Shell remained mounted');
    const settingsBodyAfter = dropdown.querySelector('.vibe-settings-body');
    assert.strictEqual(settingsBodyAfter.scrollTop, 45, 'Settings scroll position is restored');
    assert.strictEqual(shadowRootMock.activeElement, dropdown.querySelector('.vibe-get-started-btn'), 'Focus returned to Documentation entry button');
  });

  await t.test('server-status shortcut directly opens MCP guide without intermediate views', async () => {
    const statusBtn = toolbar.querySelector('.vibe-tb-status');
    assert.ok(statusBtn, 'Status button exists');

    statusBtn.click();

    const dropdown = toolbar.querySelector('.vibe-settings-dropdown');
    assert.ok(dropdown, 'Settings dropdown shell is opened');

    // Immediately in MCP guide
    const guideHeader = dropdown.querySelector('.vibe-settings-header');
    assert.ok(guideHeader.textContent.includes('MCP Server'), 'MCP guide title rendered directly');
    const guidePanel = dropdown.querySelector('.vibe-guide-panel[data-panel="claude"]');
    assert.ok(guidePanel, 'MCP guide content rendered directly');

    // Back button in MCP guide returns to Documentation
    const guideBackBtn = dropdown.querySelector('.vibe-guide-back-btn');
    assert.ok(guideBackBtn);
    guideBackBtn.click();

    assert.strictEqual(toolbar.querySelector('.vibe-settings-dropdown'), dropdown, 'Shell remained mounted');
    assert.ok(dropdown.querySelector('.vibe-mcp-server-btn'), 'Documentation view rendered on back');
    assert.strictEqual(shadowRootMock.activeElement, dropdown.querySelector('.vibe-mcp-server-btn'), 'Focus returned to MCP entry button');

    // Back button in Documentation returns to Settings root
    const docsBackBtn = dropdown.querySelector('.vibe-guide-back-btn');
    docsBackBtn.click();

    assert.strictEqual(toolbar.querySelector('.vibe-settings-dropdown'), dropdown, 'Shell remained mounted');
    assert.ok(dropdown.querySelector('.vibe-get-started-btn'), 'Settings root view rendered on second back');
    assert.strictEqual(shadowRootMock.activeElement, dropdown.querySelector('.vibe-get-started-btn'), 'Focus returned to Documentation entry button');
  });

  await t.test('closing shell ends session and reopening starts fresh at Settings root', async () => {
    // Open via status shortcut into MCP guide
    const statusBtn = toolbar.querySelector('.vibe-tb-status');
    statusBtn.click();
    let dropdown = toolbar.querySelector('.vibe-settings-dropdown');
    assert.ok(dropdown);
    assert.ok(dropdown.querySelector('.vibe-guide'));

    // Close settings explicitly
    VibeToolbar.closeSettings();
    assert.strictEqual(toolbar.querySelector('.vibe-settings-dropdown'), null, 'Dropdown unmounted on close');

    // Reopen settings via settings button
    const settingsBtn = toolbar.querySelector('.vibe-tb-settings');
    settingsBtn.click();
    dropdown = toolbar.querySelector('.vibe-settings-dropdown');
    assert.ok(dropdown, 'Dropdown mounted on reopen');
    assert.ok(dropdown.querySelector('.vibe-get-started-btn'), 'Reopened at root settings view');
    assert.strictEqual(dropdown.querySelector('.vibe-guide'), null, 'No leftover guide view in fresh session');
  });

  await t.test('settings controls, guide tabs, and copy buttons remain fully functional', async () => {
    // 1. Settings toggles and color selection
    const settingsBtn = toolbar.querySelector('.vibe-tb-settings');
    settingsBtn.click();
    const dropdown = toolbar.querySelector('.vibe-settings-dropdown');

    const clearToggle = dropdown.querySelector('.vibe-clear-on-copy-toggle');
    assert.ok(clearToggle);
    clearToggle.click();
    await new Promise(r => setTimeout(r, 10));
    assert.ok(clearToggle.classList.contains('on'), 'Clear-on-copy toggled on');
    assert.strictEqual(mockStorage.vibeClearOnCopy, true, 'Clear-on-copy saved to storage');

    const colorDot = dropdown.querySelectorAll('.vibe-color-dot').find(d => d.dataset.color === '#3b82f6');
    assert.ok(colorDot);
    colorDot.click();
    await new Promise(r => setTimeout(r, 10));
    assert.ok(colorDot.classList.contains('active'), 'Blue color dot active');
    assert.strictEqual(mockStorage.vibeBadgeColor, '#3b82f6', 'Badge color saved to storage');

    // 2. Guide tab switching and copy buttons
    const docsBtn = dropdown.querySelector('.vibe-get-started-btn');
    docsBtn.click();
    const mcpBtn = dropdown.querySelector('.vibe-mcp-server-btn');
    mcpBtn.click();

    const cursorTab = dropdown.querySelector('.vibe-guide-tab[data-tab="cursor"]');
    assert.ok(cursorTab, 'Cursor guide tab exists');
    cursorTab.click();
    assert.ok(cursorTab.classList.contains('active'), 'Cursor tab activated');
    const cursorPanel = dropdown.querySelector('.vibe-guide-panel[data-panel="cursor"]');
    assert.ok(cursorPanel.classList.contains('active'), 'Cursor panel activated');

    const copyBtn = cursorPanel.querySelector('.vibe-guide-copy');
    assert.ok(copyBtn, 'Guide copy button exists');
    let copiedText = '';
    globalThis.navigator.clipboard = {
      writeText: async (t) => { copiedText = t; }
    };
    copyBtn.click();
    await new Promise(r => setTimeout(r, 10));
    assert.ok(copiedText.includes('vibe-annotations'), 'Copy button copied command text');
  });
});
