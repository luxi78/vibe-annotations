import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';

// Real Express/HTTP and filesystem on an ephemeral port/directory, not a user's
// running server or project. These modules are shared with the production server.
test('confirmed annotation metadata purge endpoint', async t => {
  const moduleUrl = new URL('../lib/annotation-purge.js', import.meta.url);
  assert.ok(existsSync(moduleUrl), 'An atomic confirmed-ID purge endpoint is required');
  const { installAnnotationPurge, serializeAnnotationMutation, removeAnnotationAttachmentFiles } = await import(moduleUrl.href);
  assert.equal(typeof removeAnnotationAttachmentFiles, 'function', 'Attachment cleanup must protect surviving annotation identities');
  const dir = await mkdtemp(path.join(tmpdir(), 'vibe-purge-test-'));
  const dataFile = path.join(dir, 'annotations.json');
  const attachments = path.join(dir, 'attachments');
  const sourceFile = path.join(dir, 'generated.js');
  await mkdir(attachments);
  await writeFile(sourceFile, 'const generatedVariant = 2;');
  const owner = { saveLock: Promise.resolve() };
  let failWrite = false;
  let failCleanup = false;
  let onQueued = () => {};
  const load = async () => JSON.parse(await readFile(dataFile, 'utf8'));
  const save = async annotations => {
    if (failWrite) throw new Error('Read-only store');
    await writeFile(dataFile, JSON.stringify(annotations));
  };
  const app = express();
  app.use(express.json());
  installAnnotationPurge(app, {
    mutateAnnotations: transform => {
      onQueued();
      return serializeAnnotationMutation(owner, load, save, transform);
    },
    removeAttachmentFiles: async (annotation, options) => {
      if (failCleanup) throw new Error('Read-only attachments');
      await removeAnnotationAttachmentFiles(attachments, annotation, { ...options, strict: true });
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}/api/annotations/purge`;
  const purge = (ids, confirm = true) => fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids, confirm }),
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  t.beforeEach(async () => {
    failWrite = false;
    failCleanup = false;
    onQueued = () => {};
    await owner.saveLock;
    await save([
      { id: 'a', status: 'open', attachments: [{ id: 'capture', mime: 'image/png' }] },
      { id: 'variant', status: 'variants-discarded', mode: 'variants', variantsPayload: { sourceFile }, attachments: [{ id: 'capture', mime: 'image/png' }] },
      { id: 'done', status: 'resolved' },
      { id: 'b', status: 'open', attachments: [{ id: 'capture', mime: 'image/png' }] },
    ]);
    for (const id of ['a', 'variant', 'b']) await writeFile(path.join(attachments, `${id}__capture.png`), id);
  });

  await t.test('requires explicit confirmation and valid IDs before mutation', async () => {
    const before = await readFile(dataFile, 'utf8');
    assert.equal((await purge(['a'], false)).status, 400);
    assert.equal((await purge(['a', null])).status, 400);
    assert.equal(await readFile(dataFile, 'utf8'), before);
    assert.ok(existsSync(path.join(attachments, 'a__capture.png')));
  });

  await t.test('removes only confirmed metadata and its attachments, never generated code', async () => {
    const response = await purge(['a', 'variant', 'done']);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(result.purged_ids, ['a', 'variant', 'done']);
    assert.deepEqual((await load()).map(a => a.id), ['b']);
    assert.equal(existsSync(path.join(attachments, 'a__capture.png')), false);
    assert.equal(existsSync(path.join(attachments, 'variant__capture.png')), false);
    assert.equal(await readFile(path.join(attachments, 'b__capture.png'), 'utf8'), 'b');
    assert.equal(await readFile(sourceFile, 'utf8'), 'const generatedVariant = 2;');
  });

  await t.test('loads current state inside the writer queue and preserves concurrent additions', async () => {
    let releaseCreate;
    const gate = new Promise(resolve => { releaseCreate = resolve; });
    const create = serializeAnnotationMutation(owner, load, save, async annotations => {
      await gate;
      return { annotations: [...annotations, { id: 'server-new', status: 'open' }] };
    });
    let markQueued;
    const queued = new Promise(resolve => { markQueued = resolve; });
    onQueued = markQueued;
    const deleting = purge(['a']);
    await queued;
    releaseCreate();
    await create;
    assert.equal((await deleting).status, 200);
    assert.ok((await load()).some(a => a.id === 'server-new'));
    assert.ok((await load()).some(a => a.id === 'b'));
  });

  await t.test('a shared ID prefix cannot delete an unconfirmed annotation attachment', async () => {
    const current = await load();
    await save([...current, { id: 'a__new', status: 'open' }]);
    const protectedFile = path.join(attachments, 'a__new__capture.png');
    await writeFile(protectedFile, 'keep-new');
    assert.equal((await purge(['a'])).status, 200);
    assert.equal(await readFile(protectedFile, 'utf8'), 'keep-new');
    assert.ok((await load()).some(a => a.id === 'a__new'));
  });

  await t.test('Windows filename aliases preserve an unconfirmed case-distinct identity', async () => {
    if (process.platform !== 'win32') return;
    const current = await load();
    await save([...current, { id: 'A', status: 'open' }]);
    const protectedFile = path.join(attachments, 'A__capture.png');
    await writeFile(protectedFile, 'keep-case');
    assert.equal((await purge(['a'])).status, 200);
    assert.ok(existsSync(protectedFile), 'Case-insensitive filenames must not erase a surviving annotation attachment');
    assert.equal(await readFile(protectedFile, 'utf8'), 'keep-case');
  });

  await t.test('attachment cleanup can retry even after the metadata was committed', async () => {
    failCleanup = true;
    assert.equal((await purge(['a'])).status, 500);
    assert.equal((await load()).some(a => a.id === 'a'), false);
    assert.ok(existsSync(path.join(attachments, 'a__capture.png')));
    failCleanup = false;
    assert.equal((await purge(['a'])).status, 200);
    assert.equal(existsSync(path.join(attachments, 'a__capture.png')), false);
    assert.ok(existsSync(path.join(attachments, 'b__capture.png')));
  });

  await t.test('failed persistence keeps attachments and does not poison the writer queue', async () => {
    failWrite = true;
    assert.equal((await purge(['a'])).status, 500);
    assert.ok((await load()).some(a => a.id === 'a'));
    assert.ok(existsSync(path.join(attachments, 'a__capture.png')));
    failWrite = false;
    assert.equal((await purge(['a'])).status, 200);
    assert.equal((await load()).some(a => a.id === 'a'), false);
  });
});
