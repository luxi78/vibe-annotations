import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { checkConnection } from '../lib/background/api-sync.js';

test('connection discovery rejects another product rather than accepting a healthy endpoint', async (t) => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'ok',
        product: 'vibe-annotations',
        version: '99.0.0'
      })
    );
  });
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const nativeFetch = globalThis.fetch;
  // Redirect only at the network boundary so the old implementation cannot
  // accidentally probe a maintainer service while demonstrating its failure.
  globalThis.fetch = (input, options) =>
    nativeFetch(endpoint + new URL(input).pathname, options);
  globalThis.chrome = {
    runtime: { getManifest: () => ({ version: '2.1.0' }) },
    storage: { local: { get: async () => ({ pinveltoServiceUrl: endpoint }) } }
  };
  t.after(async () => {
    globalThis.fetch = nativeFetch;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  const status = await checkConnection();
  assert.equal(status.connected, false);
  assert.match(status.error, /Pinvelto/);
});
import API from '../lib/content/api-bridge.js';
test('new Pinvelto storage ignores upstream Feedback and settings', async () => {
  const legacy = {
    annotations: [{ id: 'old-feedback' }],
    vibeToolbarCollapsed: true,
    screenshotEnabled: true
  };
  globalThis.chrome = {
    storage: {
      local: {
        get: async (keys) =>
          Object.fromEntries(
            keys.filter((key) => key in legacy).map((key) => [key, legacy[key]])
          )
      }
    }
  };
  assert.deepEqual(await API.loadAllStoredFeedback(), []);
  assert.equal(await API.getToolbarCollapsed(), false);
});
