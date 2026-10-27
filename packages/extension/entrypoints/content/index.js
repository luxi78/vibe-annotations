// Pinvelto content-script entrypoint.
// Orchestrates all modules that used to be IIFEs sharing globals.

import PinveltoAPI from '../../lib/content/api-bridge.js';
import PinveltoEvents from '../../lib/content/event-bus.js';
import PinveltoShadowHost from '../../lib/content/shadow-host.js';
import PinveltoThemeManager from '../../lib/content/theme-manager.js';
import PinveltoBadgeManager from '../../lib/content/badge-manager.js';
import PinveltoInspectionMode from '../../lib/content/inspection-mode.js';
import PinveltoFeedbackPopover from '../../lib/content/annotation-popover.js';
import PinveltoBridgeHandler from '../../lib/content/bridge-handler.js';
import PinveltoToolbar from '../../lib/content/floating-toolbar.js';
import PinveltoScreenshot from '../../lib/content/screenshot.js';
import PinveltoKeyboardRouter from '../../lib/content/keyboard-router.js';
import PinveltoSessionFocus from '../../lib/content/session-focus.js';
import PinveltoPinDiscovery from '../../lib/content/pin-discovery.js';

// --- State ---
let pinveltoFeedback = [];
let localSaveCount = 0;
let badgesShown = false;

// --- Font injection (on main document — fonts cascade into shadow DOM) ---
function injectFontFace() {
  if (document.querySelector('[data-pinvelto-font]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-pinvelto-font', 'true');
  const fontUrl = chrome.runtime.getURL('assets/fonts/InterVariable.woff2');
  style.textContent = `
    @font-face {
      font-family: 'Inter';
      src: url('${fontUrl}') format('woff2-variations');
      font-weight: 100 900;
      font-display: swap;
    }
  `;
    const target = document.head || document.documentElement;
    if (target) target.appendChild(style);
  }

// --- Injection evidence ---
// The shadow host is the one DOM node both the content-script world and the page
// world can read, so the router's install evidence is published there for the E2E
// suite and for anyone inspecting why keyboard protection is limited.
function publishKeyboardEvidence() {
  const host = PinveltoShadowHost.getHost();
  const evidence = PinveltoKeyboardRouter.getInstallEvidence();
  if (!host || !evidence) return;

  host.setAttribute('data-pinvelto-keyboard-world', evidence.world);
  host.setAttribute('data-pinvelto-keyboard-run-at', evidence.runAt);
  host.setAttribute('data-pinvelto-keyboard-installed-at', String(evidence.installedAt));
  host.setAttribute('data-pinvelto-keyboard-early-capture', String(evidence.earlyCapture));
  host.setAttribute('data-pinvelto-keyboard-late-injection', String(evidence.lateInjection));
}

// --- Initialize all modules ---
async function init() {
  // Controlled fault injection for the E2E suite (tests/fixtures/selected-rectangle.html
  // sets this attribute). Absent on real pages, so the boot path is unchanged.
  if (document.documentElement?.hasAttribute('data-pinvelto-boot-fail')) {
    throw new Error('[Pinvelto] Controlled initialization failure');
  }

  injectFontFace();
  PinveltoShadowHost.init();
  publishKeyboardEvidence();

  // Boot intent set by the background when it injected us for a one-off reason
  // (currently: permission prompt on a non-auto-enabled site). Consumed and cleared.
  const bootIntent = window.__PINVELTO_BOOT_INTENT;
  const bootData = window.__PINVELTO_BOOT_DATA;
  delete window.__PINVELTO_BOOT_INTENT;
  delete window.__PINVELTO_BOOT_DATA;

  if (bootIntent === 'show-permission-prompt') {
    PinveltoShadowHost.show();
    showPermissionOverlay(bootData || {});
    return;
  }

  await bootNormal();
}

let normalBooted = false;
async function bootNormal() {
  if (normalBooted) return;
  normalBooted = true;

  const overlayClosed = await PinveltoAPI.getOverlayHidden();
  if (!overlayClosed) PinveltoShadowHost.show();

  await PinveltoThemeManager.init();
  pinveltoFeedback = await PinveltoAPI.loadFeedback();

  PinveltoBadgeManager.init();
  PinveltoInspectionMode.init();
  PinveltoSessionFocus.init();
  PinveltoFeedbackPopover.init();
  PinveltoBridgeHandler.init(() => pinveltoFeedback);
  PinveltoScreenshot.init();
  await PinveltoToolbar.init();

  setupMessageListener();
  setupStorageListener();
  setupRouteChangeDetection();
  setupFeedbackEvents();

  // The router mirrors the tab's Annotate session from document_start, before any
  // of this UI existed. Now that it does, a mirrored session can drive the local
  // overlay (cursor, hover, click-to-annotate) instead of only owning the keyboard.
  PinveltoKeyboardRouter.onUiReady();

  if (!overlayClosed) {
    waitForHydrationAndShowFeedback();
  }
}

// --- Permission modal (non-localhost sites before the user grants access) ---
function showPermissionOverlay({ originPattern, hostname } = {}) {
  const root = PinveltoShadowHost.getRoot();
  if (!root) return;
  const logoUrl = chrome.runtime.getURL('assets/icons/icon-hq.png');

  const backdrop = document.createElement('div');
  backdrop.className = 'pinvelto-permission-backdrop';
  backdrop.innerHTML = `
    <div class="pinvelto-permission-modal">
      <img class="pinvelto-permission-logo" src="${logoUrl}" alt="">
      <h2 class="pinvelto-permission-title">Enable Pinvelto?</h2>
      <p class="pinvelto-permission-body">Grant access to <strong>${escapeForModal(hostname || 'this site')}</strong> so the Feedback toolbar can load here.</p>
      <div class="pinvelto-permission-actions">
        <button class="pinvelto-permission-btn pinvelto-permission-primary" data-scope="site" type="button">Enable on this site</button>
        <button class="pinvelto-permission-btn pinvelto-permission-secondary" data-scope="all" type="button">Enable on all sites</button>
        <button class="pinvelto-permission-btn pinvelto-permission-cancel" type="button">Cancel</button>
      </div>
      <div class="pinvelto-permission-status" aria-live="polite"></div>
    </div>
  `;
  root.appendChild(backdrop);

  const statusEl = backdrop.querySelector('.pinvelto-permission-status');
  const dismiss = () => { backdrop.remove(); };

  backdrop.querySelector('.pinvelto-permission-cancel').addEventListener('click', dismiss);

  async function request(allSites) {
    setBusy(true);
    statusEl.textContent = 'Requesting permission…';
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'pinvelto:requestSitePermission',
        originPattern,
        allSites,
      });
      if (response?.success && response.granted) {
        statusEl.textContent = 'Granted — loading toolbar…';
        backdrop.remove();
        await bootNormal();
      } else if (response?.success && response.granted === false) {
        statusEl.textContent = 'Permission was not granted.';
        setBusy(false);
      } else {
        statusEl.textContent = response?.error || 'Something went wrong.';
        setBusy(false);
      }
    } catch (err) {
      statusEl.textContent = err?.message || 'Request failed.';
      setBusy(false);
    }
  }

  function setBusy(busy) {
    backdrop.querySelectorAll('.pinvelto-permission-btn').forEach(b => { b.disabled = busy; });
    backdrop.classList.toggle('pinvelto-permission-busy', busy);
  }

  backdrop.querySelectorAll('[data-scope]').forEach(btn => {
    btn.addEventListener('click', () => request(btn.dataset.scope === 'all'));
  });
}

function escapeForModal(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// --- Message listener (popup communication) ---
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'startFeedbackMode':
        PinveltoEvents.emit('inspection:start');
        sendResponse({ success: true });
        break;

      case 'stopFeedbackMode':
        PinveltoEvents.emit('inspection:stop');
        sendResponse({ success: true });
        break;

      case 'getFeedbackModeStatus':
        sendResponse({ success: true, isFeedbackMode: PinveltoInspectionMode.isActive() });
        break;

      case 'pinvelto:toggleOverlay':
        if (PinveltoShadowHost.isVisible()) {
          // Animate out — toolbar handles the actual hide via animateToolbarOut
          PinveltoToolbar.animateOut();
          sendResponse({ success: true, visible: false });
        } else {
          PinveltoShadowHost.show();
          // Badges were cleared on close (overlay:closed) — re-render so they
          // re-anchor to their elements at the current scroll/layout position.
          PinveltoEvents.emit('overlay:opened');
          sendResponse({ success: true, visible: true });
        }
        break;

      case 'getOverlayState':
        sendResponse({ success: true, visible: PinveltoShadowHost.isVisible() });
        break;

      case 'pinvelto:toggleAnnotate':
        if (PinveltoInspectionMode.isActive()) {
          PinveltoEvents.emit('inspection:stop');
        } else {
          PinveltoEvents.emit('inspection:start');
        }
        sendResponse({ success: true });
        break;

      case 'highlightFeedback':
        PinveltoBadgeManager.highlightElement(request.annotation);
        sendResponse({ success: true });
        break;

      case 'targetFeedbackElement':
        PinveltoBadgeManager.targetBadge(request.annotation?.id);
        sendResponse({ success: true });
        break;

      case 'pinvelto:annotationsUpdated':
        // Server sync detected changes (e.g. MCP deletion) — reload from storage
        PinveltoAPI.loadFeedback().then((fresh) => {
          pinveltoFeedback = fresh;
          if (PinveltoShadowHost.isVisible()) {
            PinveltoEvents.emit('Feedback:render', pinveltoFeedback);
          }
        }).catch(() => {});
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
    return true;
  });
}

// --- SPA route change detection ---
function setupRouteChangeDetection() {
  let currentURL = window.location.href;

  function onRouteChange() {
    const newURL = window.location.href;
    if (newURL === currentURL) return;
    currentURL = newURL;
    reloadFeedbackForCurrentRoute();
  }

  window.addEventListener('popstate', onRouteChange);
  window.addEventListener('hashchange', onRouteChange);

  // SPAs update the URL via pushState/replaceState without firing popstate, but they
  // almost always mutate <title> or other head elements on navigation.
  // A MutationObserver on <head> catches these changes without polling.
  const headObserver = new MutationObserver(() => onRouteChange());
  if (document.head) {
    headObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
  }
  if (typeof navigation !== 'undefined') {
    navigation.addEventListener('navigatesuccess', onRouteChange);
  }
}

async function reloadFeedbackForCurrentRoute() {
  cancelStabilityWait();
  PinveltoPinDiscovery.cancelDiscovery('route-change');
  pinveltoFeedback = await PinveltoAPI.loadFeedback();
  badgesShown = false;
  if (PinveltoShadowHost.isVisible()) {
    PinveltoBadgeManager.clearAll();
    PinveltoEvents.emit('badges:rendered', { count: 0, total: pinveltoFeedback.length });

    waitForDOMStability(() => {
      badgesShown = true;
      showFeedbackWithRetry();
    });
  }
}

// --- Storage listener ---
function setupStorageListener() {
  PinveltoAPI.onFeedbackChanged((allFeedback) => {
    if (localSaveCount > 0) {
      localSaveCount--;
      return;
    }
    pinveltoFeedback = (allFeedback || []).filter((a) => a.url === window.location.href);
    if (PinveltoShadowHost.isVisible()) {
      PinveltoEvents.emit('Feedback:render', pinveltoFeedback);
    }
  });
}

// --- Feedback lifecycle ---
function setupFeedbackEvents() {
  PinveltoEvents.on('Feedback:saved', ({ annotation }) => {
    localSaveCount++;
    if (!pinveltoFeedback.some((a) => a.id === annotation.id)) {
      pinveltoFeedback.push(annotation);
    }
    PinveltoEvents.emit('Feedback:render', pinveltoFeedback);
  });

  PinveltoEvents.on('Feedback:updated', ({ id, comment, pending_changes, css }) => {
    localSaveCount++;
    const idx = pinveltoFeedback.findIndex((a) => a.id === id);
    if (idx !== -1) {
      const updates = { comment, updated_at: new Date().toISOString() };
      if (pending_changes !== undefined) updates.pending_changes = pending_changes;
      if (css !== undefined) updates.css = css;
      pinveltoFeedback[idx] = { ...pinveltoFeedback[idx], ...updates };
    }
  });

  PinveltoEvents.on('Feedback:deleted', ({ id }) => {
    localSaveCount++;
    pinveltoFeedback = pinveltoFeedback.filter((a) => a.id !== id);
    PinveltoEvents.emit('Feedback:render', pinveltoFeedback);
  });

  PinveltoEvents.on('overlay:closed', () => {
    cancelStabilityWait();
    PinveltoPinDiscovery.cancelDiscovery('overlay-closed');
    PinveltoBadgeManager.clearAll(pinveltoFeedback);
  });

  PinveltoEvents.on('overlay:opened', () => {
    badgesShown = false;
    showFeedbackWithRetry();
  });

  PinveltoEvents.on('Feedback:cleared', ({ count } = {}) => {
    localSaveCount += count || pinveltoFeedback.length || 1;
    cancelStabilityWait();
    PinveltoPinDiscovery.cancelDiscovery('Feedback-cleared');
    PinveltoBadgeManager.clearAll(pinveltoFeedback);
    pinveltoFeedback = [];
    PinveltoEvents.emit('badges:rendered', { count: 0, total: 0 });
  });
}

// --- Hydration waiting (framework support) ---
let activeStabilityObserver = null;
let activeStabilityTimer = null;
let hydrationTimeout = null;

function cancelStabilityWait() {
  if (activeStabilityObserver) {
    activeStabilityObserver.disconnect();
    activeStabilityObserver = null;
  }
  if (activeStabilityTimer) {
    clearTimeout(activeStabilityTimer);
    activeStabilityTimer = null;
  }
  if (hydrationTimeout) {
    clearTimeout(hydrationTimeout);
    hydrationTimeout = null;
  }
}

function waitForHydrationAndShowFeedback() {
  const showBadges = () => {
    if (badgesShown) return;
    badgesShown = true;
    showFeedbackWithRetry();
  };

  if (document.readyState === 'complete') {
    waitForDOMStability(showBadges);
  } else {
    window.addEventListener('load', () => waitForDOMStability(showBadges), { once: true });
  }

  hydrationTimeout = setTimeout(showBadges, 8000);
}

function waitForDOMStability(callback) {
  cancelStabilityWait();

  let mutationCount = 0;
  const maxMutations = 10;
  const stabilityDelay = 1500;

  activeStabilityObserver = new MutationObserver(() => {
    mutationCount++;
    clearTimeout(activeStabilityTimer);
    if (mutationCount > maxMutations) {
      if (activeStabilityObserver) {
        activeStabilityObserver.disconnect();
        activeStabilityObserver = null;
      }
      activeStabilityTimer = setTimeout(() => {
        activeStabilityTimer = null;
        callback();
      }, 500);
      return;
    }
    activeStabilityTimer = setTimeout(() => {
      if (activeStabilityObserver) {
        activeStabilityObserver.disconnect();
        activeStabilityObserver = null;
      }
      activeStabilityTimer = null;
      callback();
    }, stabilityDelay);
  });

  if (document.body) {
    activeStabilityObserver.observe(document.body, { childList: true, subtree: true });
  }
  activeStabilityTimer = setTimeout(() => {
    if (activeStabilityObserver) {
      activeStabilityObserver.disconnect();
      activeStabilityObserver = null;
    }
    activeStabilityTimer = null;
    callback();
  }, stabilityDelay);
}

function showFeedbackWithRetry(maxAttempts = 5, delay = 500) {
  if (!PinveltoShadowHost.isVisible()) return;

  PinveltoPinDiscovery.startDiscovery({
    pinveltoFeedback,
    maxAttempts,
    delay,
    coalesce: true,
  });
}

function onDOMReady(callback) {
  if (document.body) {
    callback();
    return;
  }

  const onReady = () => {
    if (document.body) {
      callback();
    } else {
      const observer = new MutationObserver(() => {
        if (document.body) {
          observer.disconnect();
          callback();
        }
      });
      observer.observe(document.documentElement || document, { childList: true, subtree: true });
    }
  };

  document.addEventListener('DOMContentLoaded', onReady, { once: true });
}

export default defineContentScript({
  matches: [
    'http://localhost/*',
    'https://localhost/*',
    'http://127.0.0.1/*',
    'https://127.0.0.1/*',
    'http://0.0.0.0/*',
    'https://0.0.0.0/*',
    'http://*.local/*',
    'https://*.local/*',
    'http://*.test/*',
    'https://*.test/*',
    'http://*.localhost/*',
    'https://*.localhost/*',
    'file:///*',
  ],
  allFrames: true,
  runAt: 'document_start',
  cssInjectionMode: 'manual',
  main() {
    // Install lightweight early synchronous capture router immediately
    PinveltoKeyboardRouter.init();

    // Initialize body-dependent UI when DOM is ready
    onDOMReady(() => {
      init().catch((err) => {
        console.error('[Pinvelto] Init failed:', err);
        // A failed boot must leave the page untouched: no UI, no keyboard ownership.
        PinveltoKeyboardRouter.teardown();
      });
    });
  },
});
