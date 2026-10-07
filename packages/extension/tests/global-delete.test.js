import test from 'node:test';
import assert from 'node:assert/strict';
import * as sync from '../lib/background/api-sync.js';

// Keep production bulk deletion, storage locking and server sync real. Replace
// only Chrome storage and the HTTP boundary; never contact a user's MCP server.
test('confirmed cross-site deletion', async t => {
  let stored;
  let server;
  let requests;
  let offline;
  let lockHeld;
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.chrome = {
    tabs: { query: async () => [] },
    storage: { local: {
      get: async () => structuredClone(stored),
      set: async values => {
        assert.equal(lockHeld, true, 'Mutations must run under the background storage lock');
        Object.assign(stored, structuredClone(values));
      },
    } },
  };
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (offline) throw new Error('Server offline');
    if (url === 'http://127.0.0.1:3846/api/annotations?limit=0') {
      return Response.json({ annotations: server });
    }
    if (url === 'http://127.0.0.1:3846/api/annotations/purge') {
      const { ids, confirm } = JSON.parse(options.body);
      assert.equal(confirm, true);
      const selected = new Set(ids);
      server = server.filter(a => !selected.has(a.id));
      return Response.json({ success: true, purged_ids: ids });
    }
    if (url === 'http://127.0.0.1:3846/api/annotations' && options?.method === 'POST') {
      const incoming = JSON.parse(options.body);
      const index = server.findIndex(a => a.id === incoming.id);
      if (index < 0) server.push(incoming); else server[index] = incoming;
      return Response.json({ success: true });
    }
    if (options?.method === 'DELETE') {
      const id = decodeURIComponent(url.split('/').pop());
      const annotation = server.find(a => a.id === id);
      if (!annotation) return Response.json({ error: 'Annotation not found' }, { status: 404 });
      if (annotation.mode === 'variants' && annotation.variantsPayload && annotation.status !== 'resolved') {
        annotation.status = 'variants-discarded';
        return Response.json({ success: true, deleted: false, discarded: true });
      }
      server = server.filter(a => a.id !== id);
      return Response.json({ success: true, deleted: true });
    }
    assert.equal(url, 'http://127.0.0.1:3846/api/annotations/sync');
    assert.equal(options.method, 'POST');
    server = JSON.parse(options.body).annotations;
    return Response.json({ success: true, count: server.length });
  };
  const withLock = async operation => {
    lockHeld = true;
    try { return await operation(); } finally { lockHeld = false; }
  };
  t.beforeEach(() => {
    stored = { annotations: [
      { id: 'local', url: 'http://localhost:3000/a', status: 'open' },
      { id: 'foreign', url: 'https://example.com/b', status: 'open' },
      { id: 'resolved', url: 'http://localhost:5173/done', status: 'resolved' },
      { id: 'variant', url: 'http://localhost:5173/v', mode: 'variants', variantsPayload: { generated: true }, status: 'variants-discarded' },
    ], deletedAnnotationIds: ['old'] };
    server = structuredClone(stored.annotations);
    requests = [];
    offline = false;
    lockHeld = false;
  });

  await t.test('removes every confirmed annotation, including resolved and scaffolded variants, from storage and server', async () => {
    assert.equal(typeof sync.deleteAllStoredAnnotations, 'function', 'A distinct global delete operation is required');
    const result = await sync.deleteAllStoredAnnotations(stored.annotations.map(a => a.id), withLock);
    assert.equal(result.count, 4);
    assert.equal(result.pendingSync, false);
    assert.deepEqual(stored.annotations, []);
    assert.deepEqual(server, []);
    assert.deepEqual(new Set(stored.deletedAnnotationIds), new Set(['old', 'local', 'foreign', 'resolved', 'variant']));
    assert.equal(requests.length, 1, 'One confirmed-ID purge removes metadata without invoking variants cleanup');
  });

  await t.test('preserves annotations added after the confirmation snapshot', async () => {
    assert.equal(typeof sync.deleteAllStoredAnnotations, 'function');
    const ids = stored.annotations.map(a => a.id);
    const later = { id: 'later', url: 'https://later.example/new', status: 'open' };
    stored.annotations.push(later);
    server.push(structuredClone(later));
    const result = await sync.deleteAllStoredAnnotations(ids, withLock);
    assert.equal(result.count, 4);
    assert.deepEqual(stored.annotations.map(a => a.id), ['later']);
    assert.deepEqual(server.map(a => a.id), ['later']);
  });

  await t.test('server-only additions and their attachments outside the snapshot survive deletion', async () => {
    const ids = stored.annotations.map(a => a.id);
    server.push({ id: 'server-later', url: 'https://later.example/a', attachments: [{ id: 'keep-file', kind: 'user' }] });
    await sync.deleteAllStoredAnnotations(ids, withLock);
    assert.deepEqual(server.map(a => a.id), ['server-later']);
    assert.deepEqual(server[0].attachments, [{ id: 'keep-file', kind: 'user' }]);
  });

  await t.test('an older GET snapshot cannot acknowledge a later failed purge', async testContext => {
    testContext.mock.method(console, 'error', () => {});
    let resolveGet;
    const original = globalThis.fetch;
    globalThis.fetch = (url, options) => url.endsWith('/api/annotations?limit=0')
      ? new Promise(resolve => { resolveGet = resolve; })
      : original(url, options);
    const syncing = sync.smartSync(withLock);
    const ids = stored.annotations.map(a => a.id);
    offline = true;
    await sync.deleteAllStoredAnnotations(ids, withLock);
    offline = false;
    resolveGet(Response.json({ annotations: [] }));
    await syncing;
    globalThis.fetch = original;
    assert.ok(stored.deletedAnnotationIds.includes('local') || stored.purgedAnnotationIds?.includes('local'), 'An older absence is not acknowledgement of a newer purge');
    await sync.smartSync(withLock);
    assert.deepEqual(stored.annotations, [], 'Late server records must not resurrect the purge');
    assert.deepEqual(server, []);
  });

  await t.test('records tombstones and pending sync when the server is offline', async testContext => {
    assert.equal(typeof sync.deleteAllStoredAnnotations, 'function');
    offline = true;
    testContext.mock.method(console, 'error', () => {});
    const result = await sync.deleteAllStoredAnnotations(stored.annotations.map(a => a.id), withLock);
    assert.equal(result.pendingSync, true);
    assert.deepEqual(stored.annotations, []);
    assert.equal(stored.apiSyncPending, true);
    assert.equal(stored.deletedAnnotationIds.includes('variant'), true, 'Variants must not reappear when syncing resumes');
  });

  await t.test('reconnecting smart sync does not resurrect a global purge, including variants', async testContext => {
    offline = true;
    testContext.mock.method(console, 'error', () => {});
    testContext.mock.method(console, 'log', () => {});
    await sync.deleteAllStoredAnnotations(stored.annotations.map(a => a.id), withLock);
    assert.equal(server.length, 4, 'Offline server still has its old records');
    offline = false;
    await sync.smartSync(withLock);
    assert.deepEqual(stored.annotations, []);
    assert.deepEqual(server, [], 'Confirmed-ID retry must remove scaffolded variants rather than soft-discard them');
    await sync.smartSync(withLock);
    assert.deepEqual(stored.annotations, []);
    assert.ok(stored.purgedAnnotationIds?.includes('variant'), 'Retain explicit purge intent against late server writes');
  });

  await t.test('an older server cannot falsely acknowledge safe global deletion', async () => {
    const original = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ error: 'Not found' }, { status: 404 });
    try {
      const result = await sync.deleteAllStoredAnnotations(stored.annotations.map(a => a.id), withLock);
      assert.equal(result.pendingSync, true);
      assert.match(result.syncError, /Update the MCP server/);
      assert.equal(stored.pendingPurgeAnnotationIds.length, 4);
      assert.equal(server.length, 4);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test('malformed purge acknowledgement cannot clear the retry queue', async () => {
    stored.annotations = [{ id: 'a', url: 'http://localhost:3000/a', status: 'open' }];
    const original = globalThis.fetch;
    globalThis.fetch = async () => Response.json({ success: true, purged_ids: 'a' });
    try {
      const result = await sync.deleteAllStoredAnnotations(['a'], withLock);
      assert.equal(result.pendingSync, true);
      assert.deepEqual(stored.pendingPurgeAnnotationIds, ['a']);
    } finally {
      globalThis.fetch = original;
    }
  });

  await t.test('late server writes are purged without wiping unrelated remote records on retry', async () => {
    const ids = stored.annotations.map(a => a.id);
    await sync.deleteAllStoredAnnotations(ids, withLock);
    server.push({ id: 'local', url: 'http://localhost:3000/a', status: 'open' });
    server.push({ id: 'remote-new', url: 'https://new.example/a', attachments: [{ id: 'keep-file' }] });
    await sync.smartSync(withLock);
    assert.deepEqual(server.map(a => a.id), ['remote-new']);
    assert.deepEqual(server[0].attachments, [{ id: 'keep-file' }]);
    assert.deepEqual(stored.annotations.map(a => a.id), ['remote-new']);
    assert.equal(requests.some(request => request.url.endsWith('/annotations/sync')), false, 'A purge-aware retry must never replace the server snapshot');
  });

  await t.test('rejects a missing or invalid confirmation snapshot without mutation', async () => {
    assert.equal(typeof sync.deleteAllStoredAnnotations, 'function');
    const before = structuredClone(stored);
    await assert.rejects(sync.deleteAllStoredAnnotations(undefined, withLock), /ids/i);
    await assert.rejects(sync.deleteAllStoredAnnotations(['local', null], withLock), /ids/i);
    assert.deepEqual(stored, before);
    assert.equal(requests.length, 0);
  });

  await t.test('an empty snapshot performs no deletion or server replacement', async () => {
    assert.equal(typeof sync.deleteAllStoredAnnotations, 'function');
    const before = structuredClone(stored);
    const result = await sync.deleteAllStoredAnnotations([], withLock);
    assert.equal(result.count, 0);
    assert.deepEqual(stored, before);
    assert.equal(requests.length, 0);
  });
});
