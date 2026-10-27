import { serviceFetch, getServiceUrl } from '../service-url.js';
// API sync — health checks, bidirectional merge, individual CRUD sync
import { isSupportedUrl } from './url-filter.js';
import { updateAllBadges } from './badge.js';

let connected = false;

// Last status object produced by checkConnection, so callers (content scripts,
// popup) can read the connection state without triggering another /health
// request. The connection monitor keeps it warm; see getCachedStatus.
let lastStatus = null;
let lastStatusTime = 0;

export function isConnected() { return connected; }

// Cached connection status, or null if we have nothing newer than maxAgeMs.
// Content scripts use this so an idle page never causes a /health request —
// the background monitor is the only thing that polls (issue #84).
export function getCachedStatus(maxAgeMs = 60000) {
  if (!lastStatus) return null;
  if (Date.now() - lastStatusTime > maxAgeMs) return null;
  return { ...lastStatus, cached: true };
}

export async function checkConnection() {
  const status = await probeConnection();
  lastStatus = status;
  lastStatusTime = Date.now();
  return status;
}

async function probeConnection() {
  try {
    const response = await serviceFetch(`/health`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (data.product !== 'pinvelto' || data.status !== 'ok') throw new Error('Endpoint is not a Pinvelto service');
      connected = true;
      const extensionVersion = chrome.runtime.getManifest().version;
      let versionCompatible = true;
      let compatibilityMessage = null;
      if (data.minExtensionVersion) {
        const extensionParts = extensionVersion.split('.').map(Number);
        const minParts = data.minExtensionVersion.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if ((extensionParts[i] || 0) < (minParts[i] || 0)) {
            versionCompatible = false;
            compatibilityMessage = `Extension update required. Minimum version: ${data.minExtensionVersion}`;
            break;
          }
          if ((extensionParts[i] || 0) > (minParts[i] || 0)) break;
        }
      }
      return { connected: true, server_url: getServiceUrl(), server_version: data.version, server_status: data.status, version_compatible: versionCompatible, compatibility_message: compatibilityMessage, last_check: new Date().toISOString() };
    } else {
      connected = false;
      return { connected: false, server_url: getServiceUrl(), error: `Server returned ${response.status}`, last_check: new Date().toISOString() };
    }
  } catch (error) {
    connected = false;
    return { connected: false, server_url: getServiceUrl(), error: error.message, last_check: new Date().toISOString() };
  }
}

export async function syncAll(pinveltoFeedback) {
  try {
    const response = await serviceFetch(`/api/annotations/sync`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ annotations: pinveltoFeedback })
    });
    if (!response.ok) throw new Error(`API sync error: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to sync Feedback');
    await chrome.storage.local.set({ pinveltoSyncPending: false, pinveltoLastSync: Date.now(), pinveltoSyncCount: pinveltoFeedback.length });
  } catch (error) {
    console.error('Error syncing Feedback to API:', error);
    await chrome.storage.local.set({ pinveltoSyncPending: true, pinveltoSyncError: error.message, pinveltoLastSync: Date.now() });
    throw error;
  }
}

// Explicit, user-confirmed global purge. Unlike ordinary per-card deletion,
// this removes scaffolded variants metadata without requesting source cleanup.
// Keep the confirmed ID snapshot: pinveltoFeedback created while the dialog was open
// are not authorized for deletion. Tombstones prevent offline resurrection.
export async function deleteAllStoredFeedback(ids, storageLockFn) {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !id)) {
    throw new Error('Feedback ids must be a confirmed array of non-empty strings');
  }
  const confirmedIds = new Set(ids);
  if (!confirmedIds.size) return { count: 0, pendingSync: false };

  return storageLockFn(async () => {
    const { pinveltoFeedback = [], pinveltoDeletedFeedbackIds = [], pinveltoPurgedFeedbackIds = [], pinveltoPendingPurgeFeedbackIds = [] } = await chrome.storage.local.get(['pinveltoFeedback', 'pinveltoDeletedFeedbackIds', 'pinveltoPurgedFeedbackIds', 'pinveltoPendingPurgeFeedbackIds']);
    const remaining = pinveltoFeedback.filter(a => !confirmedIds.has(a.id));
    const count = pinveltoFeedback.length - remaining.length;
    const pending = [...new Set([...pinveltoPendingPurgeFeedbackIds, ...confirmedIds])];
    await chrome.storage.local.set({
      pinveltoFeedback: remaining,
      pinveltoDeletedFeedbackIds: [...new Set([...pinveltoDeletedFeedbackIds, ...confirmedIds])],
      // Retain intent against late in-flight creates; absence in an older GET
      // is never acknowledgement. Explicit re-import can clear this history.
      pinveltoPurgedFeedbackIds: [...new Set([...pinveltoPurgedFeedbackIds, ...confirmedIds])],
      pinveltoPendingPurgeFeedbackIds: pending,
    });
    try {
      await purgeConfirmedFeedback([...confirmedIds]);
      const remainingPending = pending.filter(id => !confirmedIds.has(id));
      await chrome.storage.local.set({ pinveltoPendingPurgeFeedbackIds: remainingPending, pinveltoPurgeError: '', pinveltoSyncPending: remainingPending.length > 0 });
      return { count, pendingSync: remainingPending.length > 0 };
    } catch (error) {
      await chrome.storage.local.set({ pinveltoSyncPending: true, pinveltoPurgeError: error.message });
      return { count, pendingSync: true, syncError: error.message };
    }
  });
}

async function purgeConfirmedFeedback(ids) {
  const response = await serviceFetch(`/api/annotations/purge`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, confirm: true }), signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) throw new Error('Update the MCP server to enable safe global deletion.');
  if (!response.ok) throw new Error(`Server deletion is pending (${response.status}).`);
  const result = await response.json();
  if (result?.success !== true || !Array.isArray(result.purged_ids)) throw new Error('Server did not acknowledge the confirmed deletion.');
  const acknowledged = new Set(result.purged_ids);
  if (acknowledged.size !== ids.length || ids.some(id => !acknowledged.has(id))) throw new Error('Server did not acknowledge the confirmed deletion.');
}

export async function saveOne(annotation) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await serviceFetch(`/api/annotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(annotation), signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`API server error: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to save Feedback to API');
  } catch (error) {
    console.warn('Failed to save to API server, Feedback saved locally:', error.message);
    throw error;
  }
}

// Upload an image attachment as a raw binary blob (no base64). kind is 'capture'
// (the auto element screenshot) or 'user' (paste/upload). The server writes it to
// ~/.pinvelto-feedback/attachments/ and records { id, kind, mime } on the annotation.
// Retries on 404: for a brand-new annotation the attachment can race ahead of the
// server-side create (saveOne is fire-and-forget), so the annotation may not exist
// for a moment. Backs off and retries rather than losing the image.
export async function uploadAttachment(id, blob, kind, mime) {
  const attempts = 5;
  for (let i = 0; i < attempts; i++) {
    const response = await serviceFetch(`/api/annotations/${id}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': mime, 'X-Attachment-Kind': kind },
      body: blob,
    });
    if (response.ok) return await response.json();
    if (response.status === 404 && i < attempts - 1) {
      await new Promise(r => setTimeout(r, 300));
      continue;
    }
    throw new Error(`attachment upload error: ${response.status}`);
  }
}

// Remove a single attachment (unlinks the file server-side).
export async function deleteAttachment(id, attId) {
  const response = await serviceFetch(`/api/annotations/${id}/attachments/${attId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(`attachment delete error: ${response.status}`);
  return await response.json();
}

export async function deleteOne(id) {
  try {
    const response = await serviceFetch(`/api/annotations/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`API delete error: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete Feedback from API');
  } catch (error) {
    console.error('[Background] Error deleting Feedback from API:', error);
    throw error;
  }
}

export async function smartSync(storageLockFn) {
  let serverFeedback;
  try {
    const response = await serviceFetch(`/api/annotations?limit=0`);
    if (!response.ok) return;
    const serverResult = await response.json();
    if (!Array.isArray(serverResult.annotations)) return;
    serverFeedback = serverResult.annotations;
  } catch { return; }

  return storageLockFn(async () => {
    try {
      const localResult = await chrome.storage.local.get(['pinveltoFeedback', 'pinveltoDeletedFeedbackIds', 'pinveltoPurgedFeedbackIds', 'pinveltoPendingPurgeFeedbackIds']);
      const localFeedback = localResult.pinveltoFeedback || [];
      const purgedIds = new Set(localResult.pinveltoPurgedFeedbackIds || []);
      const deletedIds = new Set([...(localResult.pinveltoDeletedFeedbackIds || []), ...purgedIds]);
      const localMap = new Map(localFeedback.map(a => [a.id, a]));
      const serverMap = new Map(serverFeedback.map(a => [a.id, a]));
      const retryPurgeIds = new Set([...(localResult.pinveltoPendingPurgeFeedbackIds || []), ...[...purgedIds].filter(id => serverMap.has(id))]);
      if (retryPurgeIds.size) {
        try {
          await purgeConfirmedFeedback([...retryPurgeIds]);
          await chrome.storage.local.set({ pinveltoPendingPurgeFeedbackIds: [], pinveltoPurgeError: '', pinveltoSyncPending: false });
        } catch (error) {
          await chrome.storage.local.set({ pinveltoPendingPurgeFeedbackIds: [...retryPurgeIds], pinveltoPurgeError: error.message, pinveltoSyncPending: true });
        }
      }
      const allIds = new Set([...localMap.keys(), ...serverMap.keys()]);
      const merged = [];
      const toPush = [];
      let changed = false, flagsChanged = false;

      for (const id of allIds) {
        if (deletedIds.has(id)) { if (serverMap.has(id)) changed = true; continue; }
        const local = localMap.get(id);
        const server = serverMap.get(id);
        if (local && server) {
          const lt = new Date(local.updated_at || local.created_at || 0).getTime();
          const st = new Date(server.updated_at || server.created_at || 0).getTime();
          if (st > lt) { server._synced = true; merged.push(server); changed = true; }
          else { if (!local._synced) flagsChanged = true; local._synced = true; merged.push(local); if (lt > st) { changed = true; toPush.push(local); } }
        } else if (local && !server) {
          if (local._synced) { changed = true; } else { merged.push(local); toPush.push(local); changed = true; }
        } else if (!local && server) { server._synced = true; merged.push(server); changed = true; }
      }

      if (!changed && !flagsChanged) return;
      await chrome.storage.local.set({ pinveltoFeedback: merged, pinveltoLastServerSync: Date.now() });

      if (changed) {
        try {
          if (purgedIds.size) {
            // A purge retry must never replace a stale server snapshot: only
            // upsert surviving local changes, preserving unconfirmed server IDs.
            for (const annotation of toPush) await saveOne(annotation);
          } else {
            await serviceFetch(`/api/annotations/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ annotations: merged }) });
          }
          let needsUpdate = false;
          for (const a of merged) { if (!a._synced) { a._synced = true; needsUpdate = true; } }
          if (needsUpdate) await chrome.storage.local.set({ pinveltoFeedback: merged });
        } catch (e) { console.warn('Failed to push merged Feedback to server:', e.message); }
      }

      for (const id of deletedIds) { if (serverMap.has(id) && !purgedIds.has(id)) deleteOne(id).catch(() => {}); }
      await chrome.storage.local.set({ pinveltoDeletedFeedbackIds: [...deletedIds].filter(id => serverMap.has(id)) });
      console.log(`[Pinvelto] Sync complete — merged: ${merged.length} Feedback`);
      await updateAllBadges();

      try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (await isSupportedUrl(tab.url)) chrome.tabs.sendMessage(tab.id, { action: 'pinvelto:annotationsUpdated' }).catch(() => {});
        }
      } catch { /* ignore */ }
    } catch (error) { console.error('Error during smart sync:', error); }
  });
}

// Fetch a shareable export on behalf of a content script. Pages on public
// (https) origins can't reach http://127.0.0.1 themselves — mixed content and
// private-network rules block it — but the service worker holds the localhost
// host permission and isn't subject to the page's origin, so it can.
export async function fetchExport(urlPattern, format) {
  const response = await serviceFetch(
    `/api/export?url=${encodeURIComponent(urlPattern)}&format=${encodeURIComponent(format)}`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!response.ok) throw new Error(`export failed: ${response.status}`);
  return {
    content: await response.text(),
    mime: response.headers.get('Content-Type') || 'text/plain',
  };
}

// Watcher state, fetched on behalf of a content script for the same reason as
// fetchExport: keeps the page's own network log free of extension traffic.
export async function fetchWatchers() {
  try {
    const response = await serviceFetch(`/api/watchers`, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) return { watchers: [], watching: false };
    return await response.json();
  } catch {
    return { watchers: [], watching: false };
  }
}

export async function stopWatchers() {
  try {
    await serviceFetch(`/api/watchers/stop`, { method: 'POST', signal: AbortSignal.timeout(2000) });
  } catch { /* ignore */ }
}

export async function fetchFeedback(url) {
  try {
    let apiUrl = `/api/annotations`;
    if (url) apiUrl += `?url=${encodeURIComponent(url)}`;
    const response = await serviceFetch(apiUrl);
    if (!response.ok) throw new Error(`API server error: ${response.status}`);
    const result = await response.json();
    return result.annotations || [];
  } catch (error) {
    console.error('[Background] Error getting Feedback from API:', error);
    const result = await chrome.storage.local.get(['pinveltoFeedback']);
    const pinveltoFeedback = result.pinveltoFeedback || [];
    if (url) return pinveltoFeedback.filter(a => a.url === url);
    return pinveltoFeedback;
  }
}
