import test from 'node:test';
import assert from 'node:assert';

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
    this._value = '';
    this.title = '';

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
    return this._value;
  }

  set value(v) {
    this._value = String(v);
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name === 'class') {
      this.className = String(val);
    }
    if (name.startsWith('data-')) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[key] = String(val);
    }
    if (name === 'title') {
      this.title = String(val);
    }
  }

  getAttribute(name) {
    if (name === 'title' && this.title) return this.title;
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

  addEventListener(type, fn) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(fn);
  }

  removeEventListener(type, fn) {
    if (this._listeners[type]) {
      this._listeners[type] = this._listeners[type].filter(f => f !== fn);
    }
  }

  dispatchEvent(evt) {
    const type = typeof evt === 'string' ? evt : evt.type;
    const eventObj = typeof evt === 'string' ? { type: evt, target: this, defaultPrevented: false } : evt;
    if (!eventObj.target) eventObj.target = this;
    const fns = [...(this._listeners[type] || [])];
    for (const fn of fns) {
      fn.call(this, eventObj);
    }
    return !eventObj.defaultPrevented;
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  focus() {
    if (globalThis.document) globalThis.document.activeElement = this;
  }

  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }

  querySelectorAll(sel) {
    if (sel.includes(',')) {
      const parts = sel.split(',').map(s => s.trim());
      const set = new Set();
      for (const p of parts) {
        for (const el of this.querySelectorAll(p)) set.add(el);
      }
      return Array.from(set);
    }
    const tokens = sel.trim().split(/\s+/);
    if (tokens.length > 1) {
      let current = [this];
      for (const token of tokens) {
        const next = [];
        for (const ancestor of current) {
          next.push(...ancestor._findDirectMatches(token));
        }
        current = next;
      }
      return current;
    }
    return this._findDirectMatches(tokens[0]);
  }

  _findDirectMatches(compoundSel) {
    const results = [];
    const traverse = (el) => {
      for (const child of el.children || []) {
        if (child.matchesSelector(compoundSel)) results.push(child);
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  matchesSelector(sel) {
    const parts = sel.split(/(?=[.#[])/);
    return parts.every(part => {
      if (part.startsWith('.')) {
        return this.classList.contains(part.slice(1));
      }
      if (part.startsWith('#')) {
        return this.id === part.slice(1);
      }
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

  get innerHTML() {
    return this._innerHTML || '';
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.children = [];
    parseHTMLInto(html, this);
  }
}

function parseHTMLInto(html, rootParent) {
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

    const el = new MockElement(tagName);
    parseAttributes(attrsStr, el);
    if (currentParent) currentParent.appendChild(el);

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

// Global document mock
globalThis.document = {
  createElement: (tag) => new MockElement(tag),
  activeElement: null
};

const { default: VibePopoverPanels } = await import('../lib/content/popover-panels.js');

test('Design alignment controls: direction changes preserve matrix controls and keyboard focus in place', async (t) => {
  await t.test('switching layout direction updates dataset, aria-label, title, and active class without recreating matrix cell DOM nodes', () => {
    const s = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'stretch'
    };
    const pc = null;

    const popover = new MockElement('div');
    const targetElement = {
      style: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'stretch'
      }
    };
    const resetBtn = new MockElement('button');

    const html = VibePopoverPanels.buildContainerToolbarHTML(pc, s);
    popover.innerHTML = html.layout;

    VibePopoverPanels.wireContainerToolbar(popover, targetElement, pc, s, resetBtn);

    const matrixContainer = popover.querySelector('.vibe-align-matrix');
    assert.ok(matrixContainer, 'Matrix container exists');
    assert.strictEqual(matrixContainer.dataset.direction, 'hflex');

    const initialCells = Array.from(popover.querySelectorAll('.vibe-matrix-cell'));
    assert.strictEqual(initialCells.length, 9, 'Initial matrix renders 9 cells');

    // Give keyboard focus to the center cell (index 4: center, center)
    const centerCell = initialCells[4];
    centerCell.focus();
    assert.strictEqual(globalThis.document.activeElement, centerCell, 'Center cell is focused');

    // Switch to vertical flex (vflex)
    const vflexBtn = popover.querySelector('.vibe-flow-group [data-mode="vflex"]');
    assert.ok(vflexBtn, 'vflex button exists');
    vflexBtn.click();

    // After mode switch:
    const afterCells = Array.from(popover.querySelectorAll('.vibe-matrix-cell'));
    assert.strictEqual(afterCells.length, 9);

    // CRITICAL: Every cell DOM node must be strictly identical (in-place update, not rebuilt innerHTML)
    for (let i = 0; i < 9; i++) {
      assert.strictEqual(
        afterCells[i],
        initialCells[i],
        `Cell at index ${i} must preserve the exact same DOM node instance across direction changes`
      );
    }

    // Keyboard focus must be preserved on the focused cell
    assert.strictEqual(
      globalThis.document.activeElement,
      centerCell,
      'Keyboard focus on matrix cell must be preserved during direction change'
    );

    // Matrix container direction updated
    assert.strictEqual(matrixContainer.dataset.direction, 'vflex');

    // In vflex:
    // Row 0, Col 0: jc='flex-start', ai='flex-start' (Top Left)
    // Row 0, Col 2: jc='flex-start', ai='flex-end' (Top Right)
    // Row 2, Col 0: jc='flex-end', ai='flex-start' (Bottom Left)
    // In hflex:
    // Row 0, Col 2: jc='flex-end', ai='flex-start' (Top Right: col 2 gives jc='flex-end', row 0 gives ai='flex-start')
    // Row 2, Col 0: jc='flex-start', ai='flex-end' (Bottom Left: col 0 gives jc='flex-start', row 2 gives ai='flex-end')
    // Verify top-right cell (row 0, col 2 -> index 2):
    // In hflex: jc='flex-end', ai='flex-start'
    // In vflex: jc='flex-start', ai='flex-end'
    const topRightCell = afterCells[2];
    assert.strictEqual(topRightCell.dataset.jc, 'flex-start', 'vflex row 0 maps jc to flex-start');
    assert.strictEqual(topRightCell.dataset.ai, 'flex-end', 'vflex col 2 maps ai to flex-end');
    assert.strictEqual(topRightCell.getAttribute('aria-label'), 'Align top right');
    assert.strictEqual(topRightCell.title, 'Align top right');
  });

  await t.test('activating matrix controls after direction changes applies the correct design change and live preview', () => {
    const s = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start'
    };
    const pc = null;

    const popover = new MockElement('div');
    const targetElement = {
      style: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
      }
    };
    const resetBtn = new MockElement('button');

    const html = VibePopoverPanels.buildContainerToolbarHTML(pc, s);
    popover.innerHTML = html.layout;

    const buildPendingChanges = VibePopoverPanels.wireContainerToolbar(popover, targetElement, pc, s, resetBtn);

    const cells = Array.from(popover.querySelectorAll('.vibe-matrix-cell'));

    // Switch to vflex
    const vflexBtn = popover.querySelector('.vibe-flow-group [data-mode="vflex"]');
    vflexBtn.click();

    // Click cell at row 0, col 2 (top right in vflex: jc='flex-start', ai='flex-end')
    cells[2].click();

    assert.strictEqual(targetElement.style.justifyContent, 'flex-start', 'Live preview justifyContent set to flex-start');
    assert.strictEqual(targetElement.style.alignItems, 'flex-end', 'Live preview alignItems set to flex-end');
    assert.ok(cells[2].classList.contains('active'), 'Clicked cell receives active class');
    assert.ok(!cells[0].classList.contains('active'), 'Other cell is not active');

    const pending1 = buildPendingChanges();
    assert.ok(pending1, 'Pending changes returned');
    assert.strictEqual(pending1.alignItems?.value, 'flex-end', 'Pending alignItems recorded');

    // Switch back to hflex
    const hflexBtn = popover.querySelector('.vibe-flow-group [data-mode="hflex"]');
    hflexBtn.click();

    // In hflex, row 2, col 1 (bottom center): jc='center', ai='flex-end'
    const bottomCenterIndex = 2 * 3 + 1; // 7
    cells[bottomCenterIndex].click();

    assert.strictEqual(targetElement.style.justifyContent, 'center', 'Live preview justifyContent updated in hflex');
    assert.strictEqual(targetElement.style.alignItems, 'flex-end', 'Live preview alignItems updated in hflex');
    assert.ok(cells[bottomCenterIndex].classList.contains('active'), 'Bottom center is active');
    assert.ok(!cells[2].classList.contains('active'), 'Previous cell loses active');

    const pending2 = buildPendingChanges();
    assert.strictEqual(pending2.justifyContent?.value, 'center', 'Pending justifyContent recorded');
    assert.strictEqual(pending2.alignItems?.value, 'flex-end', 'Pending alignItems recorded');
  });

  await t.test('repeated direction changes do not duplicate handlers or event effects; handlers bind once per control lifecycle', () => {
    const s = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start'
    };
    const pc = null;

    const popover = new MockElement('div');
    let saveNotifyCount = 0;
    popover._updateSave = () => { saveNotifyCount++; };
    popover._updateResetVisibility = () => {};

    const targetElement = {
      style: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
      }
    };
    const resetBtn = new MockElement('button');

    const html = VibePopoverPanels.buildContainerToolbarHTML(pc, s);
    popover.innerHTML = html.layout;

    VibePopoverPanels.wireContainerToolbar(popover, targetElement, pc, s, resetBtn);

    const vflexBtn = popover.querySelector('.vibe-flow-group [data-mode="vflex"]');
    const hflexBtn = popover.querySelector('.vibe-flow-group [data-mode="hflex"]');

    // Repeatedly toggle direction 10 times
    for (let i = 0; i < 5; i++) {
      vflexBtn.click();
      hflexBtn.click();
    }

    const cells = Array.from(popover.querySelectorAll('.vibe-matrix-cell'));

    // Check each cell has exactly 1 click listener
    for (let i = 0; i < 9; i++) {
      const clickListeners = cells[i]._listeners['click'] || [];
      assert.strictEqual(
        clickListeners.length,
        1,
        `Cell ${i} must have exactly one click listener bound throughout control lifecycle`
      );
    }

    // Reset save notification counter
    saveNotifyCount = 0;

    // Click a cell once
    cells[4].click();

    // Verify notify effect ran exactly once, not once per direction toggle
    assert.strictEqual(saveNotifyCount, 1, 'Activating cell after repeated toggles dispatches notification exactly once');
  });

  await t.test('space-auto toggle and reset preserve matrix controls in place and restore original values', () => {
    const s = {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'stretch'
    };
    const pc = {
      justifyContent: { original: 'flex-start', value: 'center' },
      alignItems: { original: 'stretch', value: 'center' }
    };

    const popover = new MockElement('div');
    const targetElement = {
      style: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
      }
    };
    const resetBtn = new MockElement('button');

    const html = VibePopoverPanels.buildContainerToolbarHTML(pc, s);
    popover.innerHTML = html.layout;

    const buildPendingChanges = VibePopoverPanels.wireContainerToolbar(popover, targetElement, pc, s, resetBtn);

    const initialCells = Array.from(popover.querySelectorAll('.vibe-matrix-cell'));

    // Initial state: center cell (index 4) is active
    assert.ok(initialCells[4].classList.contains('active'), 'Initial state reflects existing pending changes');

    // 1. Toggle Space Auto
    const spaceAutoCheck = popover.querySelector('.vibe-space-auto-check');
    assert.ok(spaceAutoCheck, 'Space auto checkbox exists');

    spaceAutoCheck.checked = true;
    spaceAutoCheck.dispatchEvent({ type: 'change', target: spaceAutoCheck });

    // Assert: space-between clears active class on matrix cells, but preserves DOM nodes
    const cellsAfterSpaceAuto = Array.from(popover.querySelectorAll('.vibe-matrix-cell'));
    for (let i = 0; i < 9; i++) {
      assert.strictEqual(cellsAfterSpaceAuto[i], initialCells[i], 'Cells preserved during space-auto toggle');
      assert.ok(!cellsAfterSpaceAuto[i].classList.contains('active'), `Cell ${i} not active when space-auto is enabled`);
    }
    assert.strictEqual(targetElement.style.justifyContent, 'space-between');

    // 2. Click a matrix cell while Space Auto was checked
    // Cell at row 0, col 0 (top-left: flex-start, flex-start)
    initialCells[0].click();

    assert.strictEqual(spaceAutoCheck.checked, false, 'Clicking a matrix cell clears Space Auto');
    assert.ok(initialCells[0].classList.contains('active'), 'Top-left cell is now active');
    assert.strictEqual(targetElement.style.justifyContent, 'flex-start');
    assert.strictEqual(targetElement.style.alignItems, 'flex-start');

    // 3. Click Reset button
    resetBtn.click();

    // Assert: reset restores origJC ('flex-start') and origAI ('stretch')
    const cellsAfterReset = Array.from(popover.querySelectorAll('.vibe-matrix-cell'));
    for (let i = 0; i < 9; i++) {
      assert.strictEqual(cellsAfterReset[i], initialCells[i], 'Cells preserved across reset');
    }
    // Since origJC='flex-start' and origAI='stretch', None of the 3x3 cells (which have ai: flex-start, center, flex-end) matches stretch
    assert.strictEqual(targetElement.style.justifyContent, '', 'Target justifyContent cleared by reset');
    assert.strictEqual(targetElement.style.alignItems, '', 'Target alignItems cleared by reset');

    const pendingAfterReset = buildPendingChanges();
    assert.strictEqual(pendingAfterReset, null, 'Pending changes cleared after reset');
  });
});
