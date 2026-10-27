// One endpoint source for the worker and content scripts. Acceptance builds use
// a controlled fixture URL; normal builds always default to Pinvelto port 3847.
const DEFAULT_URL =
  import.meta.env?.VITE_PINVELTO_SERVICE_URL || 'http://127.0.0.1:3847';
let serviceUrl = DEFAULT_URL;
export function getServiceUrl() {
  return serviceUrl;
}
export async function loadServiceUrl() {
  const result = await chrome.storage.local.get(['pinveltoServiceUrl']);
  const value = result.pinveltoServiceUrl || DEFAULT_URL;
  const url = new URL(value);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('Pinvelto service URL must be a local HTTP origin');
  }
  serviceUrl = url.origin;
  return serviceUrl;
}
export async function serviceFetch(path, options) {
  const endpoint = await loadServiceUrl();
  if (path !== '/health') {
    const health = await fetch(`${endpoint}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    const identity = health.ok ? await health.json() : null;
    if (identity?.product !== 'pinvelto' || identity.status !== 'ok')
      throw new Error('Endpoint is not a Pinvelto service');
  }
  return fetch(`${endpoint}${path}`, options);
}
