// Centralized keyboard router and event isolation manager.
// Intercepts window capture-phase keyboard events from document_start,
// owns keyboard routing by annotation-session lifecycle, and drains exit-key sequences.

import VibeEvents from './event-bus.js';
import VibeAPI from './api-bridge.js';
import VibeShadowHost from './shadow-host.js';
import VibeInspectionMode from './inspection-mode.js';
import { shouldTriggerHotkey } from './hotkey.js';

export const SessionState = {
  IDLE: 'idle',
  SELECTION: 'selection',
  WAITING: 'waiting',
  EDITING: 'editing',
};

let currentState = SessionState.IDLE;
let customShortcut = null;
let initialized = false;

// Tracking sets for physically pressed keys and drained exit sequences
const pressedCodes = new Set();
const pressedKeys = new Set();
let drainingCodes = new Set();
let drainingKeys = new Set();

function getEventTarget() {
  return typeof window !== 'undefined' ? window : null;
}

function init() {
  if (initialized) return;
  initialized = true;

  const target = getEventTarget();
  if (target && target.addEventListener) {
    target.addEventListener('keydown', onKeyDown, true);
    target.addEventListener('keyup', onKeyUp, true);
    target.addEventListener('keypress', onKeyPress, true);
    target.addEventListener('blur', onBlur);
  }

  // Load shortcut and subscribe to changes
  if (VibeAPI && VibeAPI.getCustomShortcut) {
    VibeAPI.getCustomShortcut().then((s) => { customShortcut = s; }).catch(() => {});
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, ns) => {
      if (ns === 'local' && changes.vibeCustomShortcut) {
        customShortcut = changes.vibeCustomShortcut.newValue || null;
      }
    });
  }

  // Synchronize state with annotation lifecycle events
  VibeEvents.on('inspection:start', () => {
    currentState = SessionState.SELECTION;
  });
  VibeEvents.on('inspection:started', () => {
    currentState = SessionState.SELECTION;
  });
  VibeEvents.on('inspection:stop', () => {
    currentState = SessionState.IDLE;
  });
  VibeEvents.on('inspection:stopped', () => {
    currentState = SessionState.IDLE;
  });
  VibeEvents.on('inspection:elementClicked', () => {
    currentState = SessionState.WAITING;
  });
  VibeEvents.on('annotation:edit', () => {
    currentState = SessionState.WAITING;
  });
  VibeEvents.on('popover:opened', () => {
    currentState = SessionState.EDITING;
  });
  VibeEvents.on('popover:dismissed', ({ reEnableInspection } = {}) => {
    currentState = reEnableInspection ? SessionState.SELECTION : SessionState.IDLE;
  });
  VibeEvents.on('popover:cancelled', () => {
    currentState = VibeInspectionMode.isActive() ? SessionState.SELECTION : SessionState.IDLE;
  });
}

function isOurUI(e) {
  const path = e.composedPath ? e.composedPath() : [];
  const host = VibeShadowHost.getHost?.();
  return !!(host && path.includes(host));
}

function isOurEditable(e) {
  if (!isOurUI(e)) return false;
  const path = e.composedPath ? e.composedPath() : [];
  const target = path[0] || e.target;
  if (!target) return false;
  return target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable;
}

function trackKeyDown(e) {
  if (e.code) pressedCodes.add(e.code);
  if (e.key) pressedKeys.add(e.key);
}

function trackKeyUp(e) {
  if (e.code) pressedCodes.delete(e.code);
  if (e.key) pressedKeys.delete(e.key);
}

function onBlur() {
  pressedCodes.clear();
  pressedKeys.clear();
  drainingCodes.clear();
  drainingKeys.clear();
}

const MODIFIER_MAP = {
  Control: { active: (e) => e.ctrlKey, codes: ['ControlLeft', 'ControlRight'] },
  Shift: { active: (e) => e.shiftKey, codes: ['ShiftLeft', 'ShiftRight'] },
  Alt: { active: (e) => e.altKey, codes: ['AltLeft', 'AltRight'] },
  Meta: { active: (e) => e.metaKey, codes: ['MetaLeft', 'MetaRight'] },
};

function beginDrain(e) {
  // Transfer currently pressed keys/codes to draining sets
  drainingCodes = new Set(pressedCodes);
  drainingKeys = new Set(pressedKeys);
  if (e.code) drainingCodes.add(e.code);
  if (e.key) drainingKeys.add(e.key);

  // Include modifier releases if modifiers were active during exit
  for (const [key, { active, codes }] of Object.entries(MODIFIER_MAP)) {
    if (active(e)) {
      drainingKeys.add(key);
      for (const code of codes) drainingCodes.add(code);
    }
  }
}

function isDraining(e) {
  if (drainingCodes.size === 0 && drainingKeys.size === 0) return false;
  return drainingCodes.has(e.code) || drainingKeys.has(e.key);
}

function handleDrainingEvent(e) {
  if (!isDraining(e)) return false;

  // Consume repeating keydowns, keypress, and keyup belonging to exit sequence
  e.preventDefault();
  e.stopImmediatePropagation();

  if (e.type === 'keyup') {
    if (e.code) drainingCodes.delete(e.code);
    if (e.key) drainingKeys.delete(e.key);

    const mod = MODIFIER_MAP[e.key];
    if (mod) {
      for (const code of mod.codes) drainingCodes.delete(code);
    }
  }

  return true;
}

function onKeyDown(e) {
  trackKeyDown(e);
  dispatchKeyboardEvent(e);
}

function onKeyUp(e) {
  trackKeyUp(e);
  dispatchKeyboardEvent(e);
}

function onKeyPress(e) {
  dispatchKeyboardEvent(e);
}

function dispatchKeyboardEvent(e) {
  // 1. Drain exit/confirmation key sequence if active
  if (handleDrainingEvent(e)) {
    return;
  }

  // 2. Route event according to annotation session state
  switch (currentState) {
    case SessionState.IDLE:
      handleIdle(e);
      break;

    case SessionState.SELECTION:
      handleSelection(e);
      break;

    case SessionState.WAITING:
      handleWaiting(e);
      break;

    case SessionState.EDITING:
      handleEditing(e);
      break;
  }
}

function handleIdle(e) {
  // Preserve UI event protection for independent edit entry points without assigning them unsupported whole-page session semantics
  if (isOurUI(e)) {
    e.stopImmediatePropagation();
    return;
  }

  if (e.type !== 'keydown') return;

  // Check for global toggle shortcut
  if (shouldTriggerHotkey(e, customShortcut)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    currentState = SessionState.SELECTION;
    VibeEvents.emit('inspection:start');
  }
}

function exitSelectionMode(e) {
  currentState = SessionState.IDLE;
  beginDrain(e);

  // Blur any focused element inside extension Shadow DOM so focus doesn't stay trapped
  const root = VibeShadowHost.getRoot?.();
  if (root && root.activeElement) {
    root.activeElement.blur();
  }

  VibeEvents.emit('inspection:stop');
}

function handleSelection(e) {
  // Selection mode owns all keyboard events exclusively!
  e.preventDefault();
  e.stopImmediatePropagation();

  if (e.type !== 'keydown') {
    return;
  }

  // 1. Escape exits Annotate selection mode
  if (e.key === 'Escape') {
    exitSelectionMode(e);
    return;
  }

  // 2. Toggle hotkey exits Annotate selection mode
  if (shouldTriggerHotkey(e, customShortcut)) {
    exitSelectionMode(e);
    return;
  }

  // 3. Arrow navigation and Enter confirmation
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
    const handled = VibeInspectionMode.handleNavigationKey(e);
    if (e.key === 'Enter' && handled) {
      beginDrain(e);
    }
    return;
  }

  // All other keys (characters, Delete, Backspace, shortcuts) are consumed above
}

function handleWaiting(e) {
  // Waiting state during async context generation
  e.preventDefault();
  e.stopImmediatePropagation();

  if (e.type === 'keydown') {
    if (e.key === 'Escape' || shouldTriggerHotkey(e, customShortcut)) {
      exitSelectionMode(e);
    }
  }
}

function handleEditing(e) {
  if (e.type !== 'keydown') {
    // For keyup / keypress while editing in our UI:
    if (isOurUI(e)) {
      e.stopImmediatePropagation();
    } else {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    return;
  }

  // 1. Toggle hotkey exits Annotate mode completely
  if (shouldTriggerHotkey(e, customShortcut)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    VibeAnnotationPopover.dismiss?.(false);
    exitSelectionMode(e);
    return;
  }

  // 2. Escape: editor-Esc close / continue-selection
  // Dismisses popover and returns to SELECTION mode. Event must NOT execute again in SELECTION mode!
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopImmediatePropagation();
    beginDrain(e);
    VibeEvents.emit('popover:requestDismiss', { reEnableInspection: true });
    return;
  }

  // 3. Save shortcut: Cmd/Ctrl + Enter
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    beginDrain(e);
    VibeEvents.emit('popover:requestSave');
    return;
  }

  // 4. Target is an editable element inside extension UI (e.g. comment textarea, raw css, css rules)
  if (isOurEditable(e)) {
    // Separate propagation blocking from default cancellation!
    // Block host listeners by stopping immediate propagation, but allow native editing by NOT preventing default.
    e.stopImmediatePropagation();
    return;
  }

  // 6. Target is other extension UI element
  if (isOurUI(e)) {
    e.stopImmediatePropagation();
    return;
  }

  // 7. Any key pressed outside our UI while editing is owned by the session
  e.preventDefault();
  e.stopImmediatePropagation();
}

function getState() {
  return currentState;
}

function setState(state) {
  currentState = state;
}

function setCustomShortcutForTesting(shortcut) {
  customShortcut = shortcut;
}

function resetForTesting() {
  currentState = SessionState.IDLE;
  pressedCodes.clear();
  pressedKeys.clear();
  drainingCodes.clear();
  drainingKeys.clear();
  customShortcut = null;
}

const VibeKeyboardRouter = {
  init,
  getState,
  setState,
  setCustomShortcutForTesting,
  resetForTesting,
  onKeyDown,
  onKeyUp,
  onKeyPress,
  onBlur,
  SessionState,
};

export default VibeKeyboardRouter;
