import test from 'node:test';
import assert from 'node:assert/strict';
import VibeAPI from '../lib/content/api-bridge.js';
import VibeEvents from '../lib/content/event-bus.js';
import VibeShadowHost from '../lib/content/shadow-host.js';
import VibeScreenshot from '../lib/content/screenshot.js';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const element = { getBoundingClientRect: () => ({ left: 50, top: 40, right: 250, bottom: 140 }) };

// Fake only Chrome's message boundary, keeping capture orchestration and the API bridge real.
test('automatic screenshot visibility lifecycle', async t => {
  globalThis.window = { innerWidth: 1000, innerHeight: 800, devicePixelRatio: 2 };
  globalThis.requestAnimationFrame = callback => { queueMicrotask(callback); return 1; };
  const host = { style: { visibility: '' } };
  const originalGetHost = VibeShadowHost.getHost;
  VibeShadowHost.getHost = () => host;
  globalThis.chrome = { storage: { local: { get: async () => ({ screenshotEnabled: true }) } }, runtime: {} };
  await VibeAPI.getScreenshotEnabled();
  VibeScreenshot.init();
  t.after(() => { VibeShadowHost.getHost = originalGetHost; });
  t.beforeEach(() => { host.style.visibility = ''; });

  await t.test('restores the overlay once pixels are captured while upload is still pending', async () => {
    const pixels = deferred();
    const upload = deferred();
    const messages = [];
    chrome.runtime.sendMessage = message => {
      messages.push(message);
      if (message.action === 'captureVisibleTab') return pixels.promise;
      if (message.action === 'captureAnnotationScreenshot') return upload.promise;
      throw new Error(`Unexpected action: ${message.action}`);
    };
    VibeEvents.emit('annotation:saved', { annotation: { id: 'new' }, element });
    await flush();
    assert.equal(host.style.visibility, 'hidden', 'Overlay must be excluded from the captured frame');
    try {
      assert.equal(messages[0].action, 'captureVisibleTab', 'Capture and upload must be separate operations');
      pixels.resolve({ success: true, dataUrl: 'data:image/png;base64,captured-pixels' });
      await flush();
      assert.equal(host.style.visibility, '', 'Toolbar must be back before upload completes');
      assert.deepEqual(messages[1], {
        action: 'captureAnnotationScreenshot', id: 'new',
        crop: { sx: 68, sy: 48, sw: 464, sh: 264 },
        dataUrl: 'data:image/png;base64,captured-pixels',
      });
    } finally {
      pixels.resolve({ success: true, dataUrl: 'data:image/png;base64,captured-pixels' });
      upload.resolve({ success: true });
      await flush();
    }
  });

  await t.test('restores the previous visibility when capture fails', async () => {
    host.style.visibility = 'visible';
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args);
    chrome.runtime.sendMessage = async () => ({ success: false, error: 'Capture denied' });
    try {
      VibeEvents.emit('annotation:saved', { annotation: { id: 'failed' }, element });
      await flush();
      assert.equal(host.style.visibility, 'visible');
      assert.equal(warnings.length, 1);
    } finally {
      console.warn = originalWarn;
    }
  });

  await t.test('an upload failure does not hide the already-restored toolbar', async () => {
    const upload = deferred();
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (...args) => warnings.push(args);
    chrome.runtime.sendMessage = message => message.action === 'captureVisibleTab'
      ? Promise.resolve({ success: true, dataUrl: 'data:image/png;base64,pixels' })
      : upload.promise;
    try {
      VibeEvents.emit('annotation:saved', { annotation: { id: 'upload-failed' }, element });
      await flush();
      assert.equal(host.style.visibility, '', 'A pending upload must not hide the toolbar');
      upload.resolve({ success: false, error: 'Upload failed' });
      await flush();
      assert.equal(host.style.visibility, '');
      assert.equal(warnings.length, 1);
    } finally {
      upload.resolve({ success: false, error: 'Upload failed' });
      await flush();
      console.warn = originalWarn;
    }
  });

  await t.test('overlapping saves serialize capture without waiting for uploads', async () => {
    const captures = [];
    const uploads = [];
    chrome.runtime.sendMessage = message => {
      if (message.action === 'captureVisibleTab') {
        const pixels = deferred();
        captures.push(pixels);
        return pixels.promise;
      }
      const upload = deferred();
      uploads.push(upload);
      return upload.promise;
    };
    VibeEvents.emit('annotation:saved', { annotation: { id: 'first' }, element });
    VibeEvents.emit('annotation:saved', { annotation: { id: 'second' }, element });
    await flush();
    try {
      assert.equal(captures.length, 1, 'Only one hidden-frame capture may run at a time');
      captures[0].resolve({ success: true, dataUrl: 'data:image/png;base64,first' });
      await flush();
      assert.equal(uploads.length, 1, 'The first upload is still pending');
      assert.equal(captures.length, 2, 'The next capture must not wait for the first upload');
      assert.equal(host.style.visibility, 'hidden');
      captures[1].resolve({ success: true, dataUrl: 'data:image/png;base64,second' });
      await flush();
      assert.equal(host.style.visibility, '', 'No capture may leave the toolbar hidden');
      assert.equal(uploads.length, 2);
    } finally {
      for (const pixels of captures) pixels.resolve({ success: true, dataUrl: 'data:image/png;base64,cleanup' });
      await flush();
      for (const pixels of captures) pixels.resolve({ success: true, dataUrl: 'data:image/png;base64,cleanup' });
      await flush();
      for (const upload of uploads) upload.resolve({ success: true });
      await flush();
    }
  });

  await t.test('does not capture an off-screen element', async () => {
    const messages = [];
    chrome.runtime.sendMessage = async message => { messages.push(message); return { success: true }; };
    VibeEvents.emit('annotation:saved', {
      annotation: { id: 'offscreen' },
      element: { getBoundingClientRect: () => ({ left: 1100, top: 900, right: 1200, bottom: 1000 }) },
    });
    await flush();
    assert.equal(messages.length, 0);
    assert.equal(host.style.visibility, '');
  });
});
