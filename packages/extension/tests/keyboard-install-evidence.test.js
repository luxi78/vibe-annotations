import test from 'node:test';
import assert from 'node:assert';

// Install evidence tells callers how this script was injected: at document_start
// (static or dynamic registration) the keyboard router can own window capture before
// the page's parse-time listeners; a runtime injection into a running page cannot.
test('keyboard router install evidence', async (t) => {
  globalThis.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  globalThis.document = {
    readyState: 'loading',
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const { default: PinveltoKeyboardRouter } = await import('../lib/content/keyboard-router.js');

  function installWith({ readyState, lateInjection = false }) {
    PinveltoKeyboardRouter.teardown();
    PinveltoKeyboardRouter.resetForTesting();
    globalThis.document.readyState = readyState;
    if (lateInjection) globalThis.window.__PINVELTO_LATE_INJECTION = true;
    else delete globalThis.window.__PINVELTO_LATE_INJECTION;
    PinveltoKeyboardRouter.init();
    return PinveltoKeyboardRouter.getInstallEvidence();
  }

  await t.test('a document_start injection is recorded as early capture', () => {
    const evidence = installWith({ readyState: 'loading' });
    assert.strictEqual(evidence.earlyCapture, true);
    assert.strictEqual(evidence.runAt, 'loading');
    assert.strictEqual(evidence.lateInjection, false);
    assert.strictEqual(evidence.world, 'ISOLATED');
    assert.ok(Number.isFinite(evidence.installedAt), 'install time is recorded');
  });

  await t.test('a runtime injection into a loaded page is not early capture', () => {
    const evidence = installWith({ readyState: 'complete' });
    assert.strictEqual(evidence.earlyCapture, false);
    assert.strictEqual(evidence.runAt, 'complete');
    assert.strictEqual(evidence.lateInjection, false);
  });

  await t.test('the late-injection marker rules out early capture even while loading', () => {
    const evidence = installWith({ readyState: 'loading', lateInjection: true });
    assert.strictEqual(evidence.earlyCapture, false);
    assert.strictEqual(evidence.lateInjection, true);
  });

  await t.test('teardown keeps the recorded injection evidence', () => {
    const before = installWith({ readyState: 'loading' });
    PinveltoKeyboardRouter.teardown();
    assert.deepStrictEqual(PinveltoKeyboardRouter.getInstallEvidence(), before);
  });

  await t.test('resetForTesting clears the evidence for a fresh capture', () => {
    PinveltoKeyboardRouter.resetForTesting();
    assert.strictEqual(PinveltoKeyboardRouter.getInstallEvidence(), null);
  });
});
