// Creates and manages the shadow DOM host for all Pinvelto UI.

import { PINVELTO_STYLES } from './styles.js';
import PinveltoAPI from './api-bridge.js';
import PinveltoEvents from './event-bus.js';

let hostEl = null;
let shadowRoot = null;

function init() {
  if (hostEl) return shadowRoot;

  hostEl = document.createElement('div');
  hostEl.id = 'pinvelto-feedback-root';
  hostEl.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
    overflow: visible !important;
  `;

  shadowRoot = hostEl.attachShadow({ mode: 'open' });

  // Inject styles synchronously
  const styleEl = document.createElement('style');
  styleEl.textContent = PINVELTO_STYLES;
  shadowRoot.appendChild(styleEl);

  // Hidden state is checked async in content.js after init
  // Start hidden to avoid flash, content.js will show if not hidden
  hostEl.style.display = 'none';

  document.body.appendChild(hostEl);

  // Contain composed events at shadow boundary — prevents frameworks
  // from interpreting shadow DOM interactions as "outside clicks", and
  // stops keystrokes inside extension UI from leaking to host pages
  // (e.g. host delete/backspace shortcuts hijacking typing).
  for (const type of ['pointerdown', 'mousedown', 'click', 'focusin', 'focusout', 'keydown', 'keyup', 'keypress']) {
    hostEl.addEventListener(type, (e) => e.stopPropagation());
  }

  return shadowRoot;
}

function getRoot() {
  return shadowRoot;
}

function getHost() {
  return hostEl;
}

function destroy() {
  if (hostEl && hostEl.parentNode) {
    hostEl.parentNode.removeChild(hostEl);
  }
  hostEl = null;
  shadowRoot = null;
}

function hide() {
  if (hostEl) hostEl.style.display = 'none';
  PinveltoAPI.saveOverlayHidden(true);
}

function show() {
  if (hostEl) hostEl.style.display = '';
  PinveltoAPI.saveOverlayHidden(false);
  PinveltoEvents.emit('overlay:shown');
}

function isVisible() {
  return hostEl && hostEl.style.display !== 'none';
}

function toggle() {
  if (isVisible()) { hide(); } else { show(); }
}

const PinveltoShadowHost = { init, getRoot, getHost, destroy, hide, show, isVisible, toggle };
export default PinveltoShadowHost;
