import { serviceFetch, getServiceUrl, loadServiceUrl } from '../service-url.js';
// Wraps all chrome.runtime.sendMessage and chrome.storage calls
// Single interface for data operations used by all modules

let statusCache = null;
let statusCacheTime = 0;
const CACHE_TTL = 2000;

  function isFileProtocol() {
    return window.location.protocol === 'file:';
  }

  function isLocalOrigin() {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'
      || h.endsWith('.local') || h.endsWith('.test') || h.endsWith('.localhost');
  }

  // --- Server status ---

  // The page never fetches /health itself. The background worker already polls
  // the server (with backoff while it's down) and answers from its cache, so an
  // idle tab produces no localhost requests and no failed-request noise in the
  // page's DevTools — issue #84. Pass { fresh: true } for user-driven checks
  // that must not read a stale cache.
  async function checkServerStatus({ fresh = false } = {}) {
    const now = Date.now();
    if (!fresh && statusCache && (now - statusCacheTime) < CACHE_TTL) return statusCache;

    const status = await _checkViaBg(fresh);
    statusCache = status;
    statusCacheTime = now;
    return status;
  }

  async function _checkViaBg(fresh = false) {
    try {
      const r = await chrome.runtime.sendMessage({ action: 'pinvelto:checkMCPStatus', fresh });
      const s = r && r.success && r.status;
      return { connected: !!(s && s.connected), version: s ? s.server_version : null };
    } catch {
      return { connected: false, version: null };
    }
  }

  function clearStatusCache() {
    statusCache = null;
    statusCacheTime = 0;
  }

  // --- Feedback CRUD ---

  async function loadAllStoredFeedback() {
    await loadServiceUrl();
    if (typeof document !== 'undefined' && document.documentElement?.hasAttribute('data-pinvelto-storage-fail')) {
      throw new Error('[Pinvelto] Controlled storage read failure');
    }
    const result = await chrome.storage.local.get(['pinveltoFeedback']);
    return result.pinveltoFeedback || [];
  }

  async function loadFeedback() {
    const all = await loadAllStoredFeedback();
    return all.filter(a => a.url === window.location.href);
  }

  async function loadProjectFeedback(targetOrigin) {
    const all = await loadAllStoredFeedback();
    const origin = targetOrigin || window.location.origin;
    return all.filter(a => {
      try { return new URL(a.url).origin === origin; } catch { return false; }
    });
  }

  async function saveFeedback(annotation) {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:saveFeedback', annotation });
    if (!r || !r.success) throw new Error(r?.error || 'save failed');
    return true;
  }

  async function updateFeedback(id, updates) {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:updateFeedback', id, updates });
    if (!r || !r.success) throw new Error(r?.error || 'update failed');
    return true;
  }

  // Push local changes to the server now (updates only touch chrome.storage; the
  // periodic sync would otherwise lag). Used e.g. after choosing a variant so the
  // agent can finalize immediately.
  async function forceSync() {
    try { await chrome.runtime.sendMessage({ action: 'pinvelto:forceMCPSync' }); } catch { /* ignore */ }
  }

  async function deleteFeedback(id) {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:deleteFeedback', id });
    if (!r || !r.success) throw new Error(r?.error || 'delete failed');
    return true;
  }

  async function deleteAllFeedback(ids) {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:deleteAllFeedback', ids });
    if (!r || !r.success) throw new Error(r?.error || 'global delete failed');
    return r;
  }

  async function deleteFeedbackByUrl() {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:deleteFeedbackByUrl', url: window.location.href });
    if (!r || !r.success) throw new Error(r?.error || 'bulk delete failed');
    return r.count || 0;
  }

  // Crop+store the already captured pixels after the overlay is restored.
  // `crop` is a device-pixel rect { sx, sy, sw, sh } within the visible viewport.
  async function captureScreenshot(id, crop, dataUrl) {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:captureFeedbackScreenshot', id, crop, dataUrl });
    if (!r || !r.success) throw new Error(r?.error || 'screenshot capture failed');
    return r;
  }

  // --- Image attachments ---

  // Server URL that serves an attachment's bytes (img src on localhost, open-in-tab anywhere).
  function attachmentUrl(annotationId, attId) {
    return `${getServiceUrl()}/api/annotations/${annotationId}/attachments/${attId}`;
  }

  // Upload a user image (paste/drop/file-picker). On local origins we POST the
  // blob straight to the server (no base64); on other origins we can't reach
  // localhost directly (mixed content), so we hand the bytes to the background as
  // a transient data URL and it uploads. Either way the background mirrors the new
  // attachment into chrome.storage so the UI can render it immediately.
  async function uploadUserImage(annotationId, blob, mime, kind = 'user') {
    if (isLocalOrigin()) {
      // Retry on 404: a brand-new annotation's server-side create can lag behind
      // this upload, so the annotation may not exist for a moment.
      let res;
      for (let i = 0; i < 5; i++) {
        res = await serviceFetch(`/api/annotations/${annotationId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': mime, 'X-Attachment-Kind': kind },
          body: blob,
        });
        if (res.ok) break;
        if (res.status === 404 && i < 4) { await new Promise(r => setTimeout(r, 300)); continue; }
        throw new Error(`attachment upload failed: ${res.status}`);
      }
      const { attachment } = await res.json();
      chrome.runtime.sendMessage({ action: 'pinvelto:recordAttachment', id: annotationId, att: attachment }).catch(() => {});
      return attachment;
    }
    const dataUrl = await blobToDataUrl(blob);
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:uploadUserImage', id: annotationId, mime, dataUrl, kind });
    if (!r || !r.success) throw new Error(r?.error || 'attachment upload failed');
    return r.attachment;
  }

  // Grab the full visible tab as a PNG data URL (the caller crops it). Needs the
  // screenshot host permission — request it first via requestScreenshotPermission.
  async function captureVisibleTab() {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:captureVisibleTab' });
    if (!r || !r.success) throw new Error(r?.error || 'capture failed');
    return r.dataUrl;
  }

  async function removeAttachment(annotationId, attId) {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:removeAttachment', id: annotationId, attId });
    if (!r || !r.success) throw new Error(r?.error || 'attachment remove failed');
    return true;
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // --- Storage listeners ---

  function onFeedbackChanged(cb) {
    chrome.storage.onChanged.addListener((changes, ns) => {
      if (ns === 'local' && changes.pinveltoFeedback) {
        cb(changes.pinveltoFeedback.newValue || []);
      }
    });
  }

  async function getPendingPurgeStatus() {
    try {
      const result = await chrome.storage.local.get(['pinveltoPendingPurgeFeedbackIds', 'pinveltoPurgeError']);
      return { pending: (result.pinveltoPendingPurgeFeedbackIds || []).length > 0, error: String(result.pinveltoPurgeError || '') };
    } catch {
      return { pending: false, error: '' };
    }
  }

  function onPurgeStatusChanged(cb) {
    chrome.storage.onChanged.addListener((changes, ns) => {
      if (ns === 'local' && (changes.pinveltoPendingPurgeFeedbackIds || changes.pinveltoPurgeError)) cb();
    });
  }

  // --- Settings ---

  let _screenshotEnabledCache = false; // default OFF (needs all-sites permission for captureVisibleTab)

  async function getScreenshotEnabled() {
    try {
      const r = await chrome.storage.local.get(['pinveltoScreenshotEnabled']);
      _screenshotEnabledCache = r.pinveltoScreenshotEnabled !== undefined ? r.pinveltoScreenshotEnabled : false;
      return _screenshotEnabledCache;
    } catch {
      return false;
    }
  }

  // Screenshots require chrome.tabs.captureVisibleTab, which needs the broad
  // host permission (activeTab is gesture-scoped + revoked on navigation, and the
  // localhost host permission doesn't satisfy it). Request it when the user turns
  // screenshots on. Returns true if granted (or already held).
  async function requestScreenshotPermission() {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:requestScreenshotPermission' });
    return !!(r && r.success && r.granted);
  }

  function isScreenshotEnabled() {
    return _screenshotEnabledCache;
  }

  async function saveScreenshotEnabled(enabled) {
    _screenshotEnabledCache = enabled;
    try {
      await chrome.storage.local.set({ pinveltoScreenshotEnabled: enabled });
    } catch { /* ignore */ }
  }

  async function getToolbarPosition() {
    try {
      const r = await chrome.storage.local.get(['pinveltoToolbarPos']);
      return r.pinveltoToolbarPos || null;
    } catch {
      return null;
    }
  }

  async function saveToolbarPosition(pos) {
    try {
      await chrome.storage.local.set({ pinveltoToolbarPos: pos });
    } catch { /* ignore */ }
  }

  async function getToolbarCollapsed() {
    try {
      const r = await chrome.storage.local.get(['pinveltoToolbarCollapsed']);
      return !!r.pinveltoToolbarCollapsed;
    } catch {
      return false;
    }
  }

  async function saveToolbarCollapsed(collapsed) {
    try {
      await chrome.storage.local.set({ pinveltoToolbarCollapsed: collapsed });
    } catch { /* ignore */ }
  }

  async function getClearOnCopy() {
    try {
      const r = await chrome.storage.local.get(['pinveltoClearOnCopy']);
      return !!r.pinveltoClearOnCopy;
    } catch {
      return false;
    }
  }

  async function saveClearOnCopy(enabled) {
    try {
      await chrome.storage.local.set({ pinveltoClearOnCopy: enabled });
    } catch { /* ignore */ }
  }

  async function getBadgeColor() {
    try {
      const r = await chrome.storage.local.get(['pinveltoBadgeColor']);
      return r.pinveltoBadgeColor || '#0754FF';
    } catch {
      return '#0754FF';
    }
  }

  async function saveBadgeColor(color) {
    try {
      await chrome.storage.local.set({ pinveltoBadgeColor: color });
    } catch { /* ignore */ }
  }

  async function getOverlayHidden() {
    try {
      const r = await chrome.storage.local.get(['pinveltoOverlayHidden']);
      return !!r.pinveltoOverlayHidden;
    } catch {
      return false;
    }
  }

  async function saveOverlayHidden(hidden) {
    try {
      await chrome.storage.local.set({ pinveltoOverlayHidden: !!hidden });
    } catch { /* ignore */ }
  }

  async function getSkipDeleteConfirm() {
    try {
      const r = await chrome.storage.local.get(['pinveltoSkipDeleteConfirm']);
      return !!r.pinveltoSkipDeleteConfirm;
    } catch {
      return false;
    }
  }

  async function saveSkipDeleteConfirm(skip) {
    try {
      await chrome.storage.local.set({ pinveltoSkipDeleteConfirm: skip });
    } catch { /* ignore */ }
  }

  async function getCustomShortcut() {
    try {
      const r = await chrome.storage.local.get(['pinveltoCustomShortcut']);
      return r.pinveltoCustomShortcut || null;
    } catch {
      return null;
    }
  }

  async function saveCustomShortcut(shortcut) {
    try {
      await chrome.storage.local.set({ pinveltoCustomShortcut: shortcut });
    } catch { /* ignore */ }
  }

  // Fetch a shareable export (markdown or self-contained HTML) from the server.
  // A direct fetch only works on local origins: from an https:// page, reaching
  // http://127.0.0.1 is blocked by mixed-content / private-network rules before
  // the request ever leaves the browser. Elsewhere (and if the direct attempt
  // fails) we route through the background worker, which holds the localhost
  // host permission and isn't bound by the page's origin.
  async function getShareExport(urlPattern, format) {
    if (isLocalOrigin() && !isFileProtocol()) {
      try {
        const res = await serviceFetch(
          `/api/export?url=${encodeURIComponent(urlPattern)}&format=${encodeURIComponent(format)}`,
          { signal: AbortSignal.timeout(15000) }
        );
        if (!res.ok) throw new Error(`export failed: ${res.status}`);
        return { content: await res.text(), mime: res.headers.get('Content-Type') || 'text/plain' };
      } catch {
        // fall through to the background route
      }
    }
    return _exportViaBg(urlPattern, format);
  }

  async function _exportViaBg(urlPattern, format) {
    const r = await chrome.runtime.sendMessage({ action: 'pinvelto:fetchExport', urlPattern, format });
    if (!r || !r.success) throw new Error(r?.error || 'export failed');
    return { content: r.content, mime: r.mime || 'text/plain' };
  }

  // Watcher state goes through the background for the same reasons as the health
  // check: the page's own network log stays free of extension requests, and it
  // works on non-local origins, where a direct localhost fetch is blocked.
  async function stopWatchers() {
    try {
      await chrome.runtime.sendMessage({ action: 'pinvelto:stopWatchers' });
    } catch { /* ignore */ }
  }

  async function getWatchers() {
    try {
      const r = await chrome.runtime.sendMessage({ action: 'pinvelto:getWatchers' });
      if (!r || !r.success) return { watchers: [], watching: false };
      return { watchers: r.watchers || [], watching: !!r.watching };
    } catch {
      return { watchers: [], watching: false };
    }
  }

const PinveltoAPI = {
  checkServerStatus,
  clearStatusCache,
  isFileProtocol,
  isLocalOrigin,
  loadFeedback,
  loadAllStoredFeedback,
  loadProjectFeedback,
  saveFeedback,
  updateFeedback,
  forceSync,
  deleteFeedback,
  deleteAllFeedback,
  deleteFeedbackByUrl,
  captureScreenshot,
  captureVisibleTab,
  attachmentUrl,
  uploadUserImage,
  removeAttachment,
  onFeedbackChanged,
  getPendingPurgeStatus,
  onPurgeStatusChanged,
  getScreenshotEnabled,
  isScreenshotEnabled,
  saveScreenshotEnabled,
  requestScreenshotPermission,
  getToolbarPosition,
  saveToolbarPosition,
  getToolbarCollapsed,
  saveToolbarCollapsed,
  getClearOnCopy,
  saveClearOnCopy,
  getBadgeColor,
  saveBadgeColor,
  getOverlayHidden,
  saveOverlayHidden,
  getSkipDeleteConfirm,
  saveSkipDeleteConfirm,
  getCustomShortcut,
  saveCustomShortcut,
  getWatchers,
  stopWatchers,
  getShareExport,
};
export default PinveltoAPI;
