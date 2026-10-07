import test from 'node:test';
import assert from 'node:assert/strict';

// Setup Mock DOM environment before importing modules
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
    this._innerHTML = '';
    this._value = '';
    this.offsetWidth = 200;
    this.offsetHeight = 40;
    this.scrollHeight = 40;
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

  get src() {
    return this.attributes.src || this._src || '';
  }

  set src(val) {
    this._src = String(val);
    this.setAttribute('src', val);
  }

  get childNodes() {
    return this.children;
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = String(val);
  }

  get textContent() {
    if (this.tagName === '#TEXT') return this._text || '';
    let text = '';
    for (const child of this.children) {
      text += child.textContent;
    }
    return text;
  }

  set textContent(val) {
    if (this.tagName === '#TEXT') {
      this._text = String(val);
      return;
    }
    this.children = [];
    if (val) {
      const textNode = new MockElement('#text');
      textNode.textContent = String(val);
      this.appendChild(textNode);
    }
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
    if (name === 'class') this.className = '';
    if (name === 'id') this.id = '';
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      delete this.dataset[key];
    }
  }

  closest(sel) {
    let curr = this;
    while (curr) {
      if (curr.matches && curr.matches(sel)) return curr;
      curr = curr.parentNode;
    }
    return null;
  }

  matches(sel) {
    const parts = sel.split(/(?=[.#[])/);
    return parts.every(part => {
      if (part.startsWith('.')) return this.classList && this.classList.contains(part.slice(1));
      if (part.startsWith('#')) return this.id === part.slice(1);
      if (part.startsWith('[')) {
        const attrContent = part.slice(1, -1);
        const eqIdx = attrContent.indexOf('=');
        if (eqIdx !== -1) {
          const attrName = attrContent.slice(0, eqIdx);
          const attrVal = attrContent.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
          return this.getAttribute(attrName) === attrVal;
        }
        return this.hasAttribute(attrContent);
      }
      return this.tagName.toLowerCase() === part.toLowerCase();
    });
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(newNode, referenceNode) {
    if (!referenceNode) return this.appendChild(newNode);
    if (newNode.parentNode) newNode.parentNode.removeChild(newNode);
    const idx = this.children.indexOf(referenceNode);
    if (idx !== -1) {
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

  contains(child) {
    let curr = child;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
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
    event.target = event.target || this;
    let stopped = false;
    event.stopPropagation = () => { stopped = true; };
    event.preventDefault = () => {};

    let curr = this;
    while (curr) {
      event.currentTarget = curr;
      const fns = curr._listeners[event.type] || [];
      for (const fn of fns) {
        fn(event);
      }
      if (stopped || !event.bubbles) break;
      curr = curr.parentNode;
    }
  }

  click() {
    this.dispatchEvent({
      type: 'click',
      target: this,
      bubbles: true
    });
  }

  focus() {
    if (globalThis.document) globalThis.document.activeElement = this;
    this.dispatchEvent({
      type: 'focus',
      target: this,
      currentTarget: this,
      bubbles: false,
      stopPropagation: () => {},
      preventDefault: () => {}
    });
  }

  select() {}

  setPointerCapture() {}

  getContext() {
    return {
      drawImage: () => {}
    };
  }

  toBlob(callback) {
    callback({ size: 1200, type: 'image/webp' });
  }

  getBoundingClientRect() {
    return { left: 50, top: 50, right: 250, bottom: 150, width: 200, height: 100 };
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    if (!html) return;
    parseHTML(html, this);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  querySelectorAll(sel) {
    const results = [];
    const match = (el) => el.matches && el.matches(sel);

    const traverse = (el) => {
      for (const child of el.children || []) {
        if (match(child)) results.push(child);
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }
}

globalThis.Element = MockElement;

function parseAttributes(attrStr, element) {
  const attrRegex = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
  let match;
  while ((match = attrRegex.exec(attrStr)) !== null) {
    const name = match[1];
    const val = match[2] !== undefined ? match[2] : (match[3] !== undefined ? match[3] : (match[4] !== undefined ? match[4] : ''));
    element.setAttribute(name, val);
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

    if (tagName.toLowerCase() === 'svg') {
      const svgEl = new MockElement('svg');
      parseAttributes(attrsStr, svgEl);
      if (currentParent) currentParent.appendChild(svgEl);
      continue;
    }

    const elem = new MockElement(tagName);
    parseAttributes(attrsStr, elem);

    if (currentParent) currentParent.appendChild(elem);

    if (!isSelfClosing) {
      stack.push(elem);
    }
  }
}

// Global mocks setup
const createdUrls = new Set();
const revokedUrls = new Set();
let urlIdSeq = 0;

globalThis.URL = {
  createObjectURL: (_blob) => {
    const url = `blob:http://localhost:3000/${++urlIdSeq}`;
    createdUrls.add(url);
    return url;
  },
  revokeObjectURL: (url) => {
    revokedUrls.add(url);
  }
};

globalThis.fetch = async () => ({
  blob: async () => ({ size: 500, type: 'image/png' })
});

globalThis.createImageBitmap = async () => ({
  close: () => {}
});

const docListeners = {};
globalThis.document = {
  activeElement: null,
  head: new MockElement('head'),
  body: new MockElement('body'),
  createElement: (tag) => new MockElement(tag),
  addEventListener: (type, fn) => {
    if (!docListeners[type]) docListeners[type] = [];
    docListeners[type].push(fn);
  },
  removeEventListener: (type, fn) => {
    if (docListeners[type]) docListeners[type] = docListeners[type].filter(f => f !== fn);
  },
  dispatchEvent: (ev) => {
    const fns = docListeners[ev.type] || [];
    for (const fn of fns) fn(ev);
  }
};

globalThis.window = {
  innerWidth: 1200,
  innerHeight: 800,
  devicePixelRatio: 1,
  location: {
    href: 'http://localhost:3000/',
    origin: 'http://localhost:3000',
    host: 'localhost:3000',
    hostname: 'localhost',
    protocol: 'http:'
  },
  getComputedStyle: () => ({}),
  addEventListener: () => {},
  removeEventListener: () => {},
  open: () => {}
};

let rafId = 0;
const rafCallbacks = new Map();
globalThis.requestAnimationFrame = (fn) => {
  const id = ++rafId;
  const timer = setTimeout(() => {
    rafCallbacks.delete(id);
    fn();
  }, 0);
  timer.unref?.();
  rafCallbacks.set(id, timer);
  return id;
};

globalThis.cancelAnimationFrame = (id) => {
  const timer = rafCallbacks.get(id);
  if (timer) {
    clearTimeout(timer);
    rafCallbacks.delete(id);
  }
};

globalThis.chrome = {
  runtime: {
    sendMessage: async () => ({ success: true })
  },
  storage: {
    local: {
      get: async () => ({}),
      set: async () => ({})
    }
  }
};

// Setup VibeShadowHost root
import VibeShadowHost from '../lib/content/shadow-host.js';
import VibeAnnotationPopover from '../lib/content/annotation-popover.js';
import VibeAPI from '../lib/content/api-bridge.js';

const mockShadowRoot = new MockElement('div');
VibeShadowHost.getRoot = () => mockShadowRoot;

test('attachment thumbnails stable identity and in-place updates', async (t) => {
  t.beforeEach(() => {
    mockShadowRoot.children = [];
    createdUrls.clear();
    revokedUrls.clear();
    urlIdSeq = 0;
  });

  t.afterEach(() => {
    VibeAnnotationPopover.dismiss();
  });

  await t.test('Slice 1: adding pending attachments assigns stable identities and preserves unaffected thumbnail DOM nodes', async () => {
    const targetElement = new MockElement('button');
    const context = {
      tag: 'button',
      classes: ['primary-btn'],
      styles: {},
      bounding_box: { left: 50, top: 50, width: 100, height: 40 }
    };

    await VibeAnnotationPopover.show(targetElement, context, null, 100, 70);

    const popover = mockShadowRoot.querySelector('.vibe-popover');
    assert.ok(popover, 'Popover must be rendered');

    const attachInput = popover.querySelector('.vibe-attach-input');
    const attachmentsEl = popover.querySelector('.vibe-attachments');
    assert.ok(attachInput, 'File input must exist');
    assert.ok(attachmentsEl, 'Attachments container must exist');
    assert.ok(attachmentsEl.classList.contains('empty'), 'Attachments container starts empty');

    // 1. Add first image (item A)
    const fileA = { name: 'a.png', type: 'image/png', size: 1000 };
    attachInput.files = [fileA];
    attachInput.dispatchEvent({ type: 'change', target: attachInput });

    const tilesAfterA = attachmentsEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tilesAfterA.length, 1, 'Should have 1 thumbnail');
    const tileA = tilesAfterA[0];
    const pendingIdA = tileA.getAttribute('data-pending-id');
    assert.ok(pendingIdA, 'Item A must have a stable data-pending-id attribute');

    // 2. Add second image (item B)
    const fileB = { name: 'b.png', type: 'image/png', size: 2000 };
    attachInput.files = [fileB];
    attachInput.dispatchEvent({ type: 'change', target: attachInput });

    const tilesAfterB = attachmentsEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tilesAfterB.length, 2, 'Should have 2 thumbnails');
    assert.equal(tilesAfterB[0], tileA, 'Thumbnail A DOM node MUST remain preserved by reference');
    const tileB = tilesAfterB[1];
    const pendingIdB = tileB.getAttribute('data-pending-id');
    assert.ok(pendingIdB, 'Item B must have a stable data-pending-id');
    assert.notEqual(pendingIdA, pendingIdB, 'Item A and B must have distinct IDs');

    // 3. Add third image (item C)
    const fileC = { name: 'c.png', type: 'image/png', size: 3000 };
    attachInput.files = [fileC];
    attachInput.dispatchEvent({ type: 'change', target: attachInput });

    const tilesAfterC = attachmentsEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tilesAfterC.length, 3, 'Should have 3 thumbnails');
    assert.equal(tilesAfterC[0], tileA, 'Thumbnail A DOM node preserved');
    assert.equal(tilesAfterC[1], tileB, 'Thumbnail B DOM node preserved');
    const tileC = tilesAfterC[2];
    const pendingIdC = tileC.getAttribute('data-pending-id');
    assert.ok(pendingIdC, 'Item C must have a stable data-pending-id');

    // 4. Remove middle item B
    const removeBtnB = tileB.querySelector('.vibe-att-remove');
    assert.ok(removeBtnB, 'Remove button B exists');
    removeBtnB.click();

    const tilesAfterRemoveB = attachmentsEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tilesAfterRemoveB.length, 2, 'Should have 2 thumbnails remaining');
    assert.equal(tilesAfterRemoveB[0], tileA, 'Thumbnail A DOM node preserved after removing B');
    assert.equal(tilesAfterRemoveB[1], tileC, 'Thumbnail C DOM node preserved after removing B');
    assert.equal(tilesAfterRemoveB[0].getAttribute('data-pending-id'), pendingIdA, 'A retains its stable ID');
    assert.equal(tilesAfterRemoveB[1].getAttribute('data-pending-id'), pendingIdC, 'C retains its stable ID (not renumbered)');

    // 5. Remove item C (was previously at index 2, now at index 1)
    const removeBtnC = tileC.querySelector('.vibe-att-remove');
    assert.ok(removeBtnC, 'Remove button C exists');
    removeBtnC.click();

    const tilesAfterRemoveC = attachmentsEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tilesAfterRemoveC.length, 1, 'Should have 1 thumbnail remaining');
    assert.equal(tilesAfterRemoveC[0], tileA, 'Only thumbnail A remains and is unchanged');
  });

  await t.test('Slice 2: saved attachments reconciliation and singular capture replacement', async () => {
    const targetElement = new MockElement('div');
    const context = {
      tag: 'div',
      classes: ['hero'],
      styles: {},
      bounding_box: { left: 0, top: 0, width: 200, height: 100 }
    };

    const existingAnnotation = {
      id: 'ann-123',
      comment: 'Initial comment',
      attachments: [
        { id: 'att-user-1', kind: 'user', mime: 'image/png' },
        { id: 'att-cap-1', kind: 'capture', mime: 'image/webp' }
      ]
    };

    await VibeAnnotationPopover.show(targetElement, context, existingAnnotation, 100, 50);

    const popover = mockShadowRoot.querySelector('.vibe-popover');
    const attachmentsEl = popover.querySelector('.vibe-attachments');
    assert.ok(attachmentsEl, 'Attachments container exists');

    const initialTiles = attachmentsEl.querySelectorAll('.vibe-att-tile');
    assert.equal(initialTiles.length, 2, 'Should display 2 saved attachments');
    const tileUser1 = initialTiles[0];
    const tileCap1 = initialTiles[1];
    assert.equal(tileUser1.getAttribute('data-att'), 'att-user-1');
    assert.equal(tileCap1.getAttribute('data-att'), 'att-cap-1');

    // 1. Remove saved capture att-cap-1
    let removedAttId = null;
    VibeAPI.removeAttachment = async (_annId, attId) => {
      removedAttId = attId;
      return { success: true };
    };

    const removeCapBtn = tileCap1.querySelector('.vibe-att-remove');
    removeCapBtn.click();
    await new Promise(r => setTimeout(r, 10));

    const tilesAfterRemove = attachmentsEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tilesAfterRemove.length, 1, 'Only 1 attachment remains');
    assert.equal(tilesAfterRemove[0], tileUser1, 'Surviving saved user attachment DOM node must be preserved');
    assert.equal(removedAttId, 'att-cap-1', 'VibeAPI.removeAttachment must be called with att-cap-1');

    // 2. Singular capture replacement on pending attachments
    VibeAnnotationPopover.dismiss();

    await VibeAnnotationPopover.show(targetElement, context, null, 100, 50);
    const newPopover = mockShadowRoot.querySelector('.vibe-popover');
    const newAttachEl = newPopover.querySelector('.vibe-attachments');
    const newAttachInput = newPopover.querySelector('.vibe-attach-input');
    const shotOpt = newPopover.querySelector('[data-add="shot"]');

    // Setup screenshot mocks
    VibeAPI.requestScreenshotPermission = async () => true;
    VibeAPI.captureVisibleTab = async () => 'data:image/png;base64,mockpixels';

    // Add a regular user image
    const imgFile = { name: 'user.png', type: 'image/png', size: 1000 };
    newAttachInput.files = [imgFile];
    newAttachInput.dispatchEvent({ type: 'change', target: newAttachInput });

    const tiles1 = newAttachEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tiles1.length, 1);
    const userPendingTile = tiles1[0];

    // Take first screenshot
    shotOpt.click();
    await new Promise(r => setTimeout(r, 20));

    const tiles2 = newAttachEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tiles2.length, 2, 'Should have user image + first capture');
    const firstCaptureTile = tiles2[0];
    assert.equal(tiles2[1], userPendingTile, 'User pending thumbnail DOM node preserved');
    const firstCaptureUrl = firstCaptureTile.querySelector('img')?.getAttribute('src');

    // Take second screenshot -> singular capture replacement
    shotOpt.click();
    await new Promise(r => setTimeout(r, 20));

    const tiles3 = newAttachEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tiles3.length, 2, 'Still only 2 thumbnails (capture was replaced, not appended)');
    assert.equal(tiles3[1], userPendingTile, 'User pending thumbnail DOM node still preserved');
    assert.notEqual(tiles3[0], firstCaptureTile, 'Old capture tile replaced with new capture tile');
    assert.ok(revokedUrls.has(firstCaptureUrl), 'Replaced capture object URL must be revoked');
  });

  await t.test('Slice 3: focus continuity and editor input state independence', async () => {
    const targetElement = new MockElement('div');
    const context = {
      tag: 'div',
      classes: ['card'],
      styles: {},
      bounding_box: { left: 0, top: 0, width: 200, height: 100 }
    };

    await VibeAnnotationPopover.show(targetElement, context, null, 100, 50);
    const popover = mockShadowRoot.querySelector('.vibe-popover');
    const attachEl = popover.querySelector('.vibe-attachments');
    const attachInput = popover.querySelector('.vibe-attach-input');
    const textarea = popover.querySelector('.vibe-textarea');
    const addBtn = popover.querySelector('.vibe-add-btn');

    // 1. Unrelated editor input is preserved during attachment operations
    textarea.value = 'Draft comment keeping its value';
    textarea.focus();
    assert.equal(document.activeElement, textarea, 'Textarea is initially focused');

    // Add attachments
    const file1 = { name: '1.png', type: 'image/png', size: 1000 };
    const file2 = { name: '2.png', type: 'image/png', size: 2000 };
    const file3 = { name: '3.png', type: 'image/png', size: 3000 };
    attachInput.files = [file1, file2, file3];
    attachInput.dispatchEvent({ type: 'change', target: attachInput });

    assert.equal(textarea.value, 'Draft comment keeping its value', 'Textarea value preserved after adding attachments');

    const tiles = attachEl.querySelectorAll('.vibe-att-tile');
    assert.equal(tiles.length, 3, 'Should have 3 thumbnails');
    const [tile1, tile2, tile3] = tiles;
    const btn1 = tile1.querySelector('.vibe-att-remove');
    const btn2 = tile2.querySelector('.vibe-att-remove');
    const btn3 = tile3.querySelector('.vibe-att-remove');

    // 2. Focus continuity when removing middle thumbnail (tile2)
    btn2.focus();
    assert.equal(document.activeElement, btn2, 'btn2 is focused before removal');
    btn2.click();

    // After removing tile2, focus must move to surviving next control (btn3)
    assert.equal(document.activeElement, btn3, 'Focus moves to next surviving thumbnail remove button (btn3)');

    // 3. Removing last thumbnail (tile3) when focused moves focus to previous thumbnail (btn1)
    btn3.focus();
    btn3.click();

    assert.equal(document.activeElement, btn1, 'Focus moves to previous surviving thumbnail remove button (btn1)');

    // 4. Removing the final thumbnail moves focus to addBtn
    btn1.focus();
    btn1.click();

    assert.equal(document.activeElement, addBtn, 'Focus moves to addBtn when all thumbnails are removed');

    // 5. Textarea still retains its exact text
    assert.equal(textarea.value, 'Draft comment keeping its value', 'Textarea value unaffected throughout removals');
  });

  await t.test('Slice 4: Object URL lifecycle and boundary cleanup on cancel and save', async () => {
    const targetElement = new MockElement('div');
    const context = {
      tag: 'div',
      classes: ['boundary-test'],
      styles: {},
      bounding_box: { left: 0, top: 0, width: 200, height: 100 }
    };

    // --- Scenario A: Cancel / Dismiss cleans up all pending Object URLs ---
    await VibeAnnotationPopover.show(targetElement, context, null, 100, 50);
    const popover = mockShadowRoot.querySelector('.vibe-popover');
    const attachInput = popover.querySelector('.vibe-attach-input');
    const cancelBtn = popover.querySelector('.vibe-cancel-btn');

    const fileA = { name: 'cancel-1.png', type: 'image/png', size: 1000 };
    const fileB = { name: 'cancel-2.png', type: 'image/png', size: 2000 };
    attachInput.files = [fileA, fileB];
    attachInput.dispatchEvent({ type: 'change', target: attachInput });

    const tiles = popover.querySelectorAll('.vibe-att-tile');
    assert.equal(tiles.length, 2);
    const urlA = tiles[0].querySelector('img')?.getAttribute('src');
    const urlB = tiles[1].querySelector('img')?.getAttribute('src');
    assert.ok(urlA && urlB, 'Object URLs were assigned to thumbnails');
    assert.equal(revokedUrls.has(urlA), false, 'URL A not revoked while popover is open');
    assert.equal(revokedUrls.has(urlB), false, 'URL B not revoked while popover is open');

    // Click Cancel
    cancelBtn.click();

    assert.equal(revokedUrls.has(urlA), true, 'URL A must be revoked on cancel');
    assert.equal(revokedUrls.has(urlB), true, 'URL B must be revoked on cancel');

    // --- Scenario B: Save uploads pending attachments and releases Object URLs ---
    await VibeAnnotationPopover.show(targetElement, context, null, 100, 50);
    const popover2 = mockShadowRoot.querySelector('.vibe-popover');
    const attachInput2 = popover2.querySelector('.vibe-attach-input');
    const textarea2 = popover2.querySelector('.vibe-textarea');
    const saveBtn2 = popover2.querySelector('.vibe-save-btn');

    const fileC = { name: 'save-1.png', type: 'image/png', size: 3000 };
    attachInput2.files = [fileC];
    attachInput2.dispatchEvent({ type: 'change', target: attachInput2 });

    const tiles2 = popover2.querySelectorAll('.vibe-att-tile');
    const urlC = tiles2[0].querySelector('img')?.getAttribute('src');
    assert.ok(urlC);
    assert.equal(revokedUrls.has(urlC), false, 'URL C not revoked while editing');

    textarea2.value = 'Annotation with attachment';

    const uploaded = [];
    VibeAPI.saveAnnotation = async (ann) => {
      ann.id = 'saved-ann-id';
      return { success: true, annotation: ann };
    };
    VibeAPI.uploadUserImage = async (annId, blob, mime, kind) => {
      uploaded.push({ annId, blob, mime, kind });
      return { id: 'remote-att-1', kind, mime };
    };

    saveBtn2.click();
    await new Promise(r => setTimeout(r, 20));

    assert.equal(uploaded.length, 1, 'Pending image must be uploaded on save');
    assert.equal(uploaded[0].annId, 'saved-ann-id', 'Upload targets new annotation id');
    assert.equal(uploaded[0].blob, fileC, 'Upload receives original blob');
    assert.equal(revokedUrls.has(urlC), true, 'URL C must be revoked after save completion');
  });
});
