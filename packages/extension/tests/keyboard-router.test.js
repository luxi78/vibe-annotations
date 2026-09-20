import test from 'node:test';
import assert from 'node:assert';

test('VibeKeyboardRouter unit tests', async (t) => {
  // Set up mock window and event system
  const listeners = { capture: {}, bubble: {} };
  globalThis.window = {
    addEventListener: (type, fn, capture = false) => {
      const phase = capture ? 'capture' : 'bubble';
      listeners[phase][type] = listeners[phase][type] || [];
      listeners[phase][type].push(fn);
    },
    removeEventListener: (type, fn, capture = false) => {
      const phase = capture ? 'capture' : 'bubble';
      if (listeners[phase][type]) {
        listeners[phase][type] = listeners[phase][type].filter((f) => f !== fn);
      }
    },
  };

  const { default: VibeEvents } = await import('../lib/content/event-bus.js');
  const { default: VibeInspectionMode } = await import('../lib/content/inspection-mode.js');
  const { default: VibeKeyboardRouter, SessionState } = await import('../lib/content/keyboard-router.js');

  VibeKeyboardRouter.init();

  function createSimulatedEvent({ type = 'keydown', key, code, repeat = false, ctrlKey = false, shiftKey = false, altKey = false, metaKey = false }) {
    let defaultPrevented = false;
    let immediatePropagationStopped = false;
    let propagationStopped = false;

    return {
      type,
      key,
      code: code || key,
      repeat,
      ctrlKey,
      shiftKey,
      altKey,
      metaKey,
      preventDefault: () => { defaultPrevented = true; },
      stopPropagation: () => { propagationStopped = true; },
      stopImmediatePropagation: () => {
        immediatePropagationStopped = true;
        propagationStopped = true;
      },
      get defaultPrevented() { return defaultPrevented; },
      get immediatePropagationStopped() { return immediatePropagationStopped; },
      get propagationStopped() { return propagationStopped; },
    };
  }

  function dispatch(e) {
    if (e.type === 'keydown') VibeKeyboardRouter.onKeyDown(e);
    else if (e.type === 'keyup') VibeKeyboardRouter.onKeyUp(e);
    else if (e.type === 'keypress') VibeKeyboardRouter.onKeyPress(e);
  }

  await t.test('Initial state is IDLE and does not consume ordinary keys', () => {
    VibeKeyboardRouter.resetForTesting();
    assert.strictEqual(VibeKeyboardRouter.getState(), SessionState.IDLE);

    const ev = createSimulatedEvent({ key: 'a', code: 'KeyA' });
    dispatch(ev);

    assert.strictEqual(ev.defaultPrevented, false, 'Ordinary key in IDLE must not be default-prevented');
    assert.strictEqual(ev.immediatePropagationStopped, false, 'Ordinary key in IDLE must not be stopped');
  });

  await t.test('Hotkey in IDLE triggers selection mode and is consumed', () => {
    VibeKeyboardRouter.resetForTesting();
    VibeKeyboardRouter.setCustomShortcutForTesting({ key: ',', ctrlKey: true, shiftKey: true });
    let started = false;
    const onStart = () => { started = true; };
    VibeEvents.on('inspection:start', onStart);

    // Ctrl+Shift+Comma is toggle hotkey
    const ev = createSimulatedEvent({ key: ',', code: 'Comma', ctrlKey: true, shiftKey: true });
    dispatch(ev);

    assert.strictEqual(ev.defaultPrevented, true);
    assert.strictEqual(ev.immediatePropagationStopped, true);
    assert.strictEqual(started, true);
    assert.strictEqual(VibeKeyboardRouter.getState(), SessionState.SELECTION);

    VibeEvents.off('inspection:start', onStart);
  });

  await t.test('SELECTION mode consumes all ordinary keys, characters, and host shortcuts', () => {
    VibeKeyboardRouter.resetForTesting();
    VibeKeyboardRouter.setState(SessionState.SELECTION);

    for (const key of ['a', 'Delete', 'Backspace', 'Tab', 'Enter']) {
      const ev = createSimulatedEvent({ key });
      dispatch(ev);
      assert.strictEqual(ev.defaultPrevented, true, `Key "${key}" must be default-prevented in SELECTION`);
      assert.strictEqual(ev.immediatePropagationStopped, true, `Key "${key}" must be stopped in SELECTION`);
    }

    // Host shortcut combination Ctrl+K
    const ctrlK = createSimulatedEvent({ key: 'k', code: 'KeyK', ctrlKey: true });
    dispatch(ctrlK);
    assert.strictEqual(ctrlK.defaultPrevented, true);
    assert.strictEqual(ctrlK.immediatePropagationStopped, true);
  });

  await t.test('Arrow keys and Enter dispatch to VibeInspectionMode in SELECTION mode', () => {
    VibeKeyboardRouter.resetForTesting();
    VibeKeyboardRouter.setState(SessionState.SELECTION);

    let navKey = null;
    const origHandler = VibeInspectionMode.handleNavigationKey;
    VibeInspectionMode.handleNavigationKey = (e) => { navKey = e.key; return true; };

    const upEv = createSimulatedEvent({ key: 'ArrowUp' });
    dispatch(upEv);
    assert.strictEqual(navKey, 'ArrowUp');
    assert.strictEqual(upEv.defaultPrevented, true);
    assert.strictEqual(upEv.immediatePropagationStopped, true);

    const downEv = createSimulatedEvent({ key: 'ArrowDown' });
    dispatch(downEv);
    assert.strictEqual(navKey, 'ArrowDown');

    const enterEv = createSimulatedEvent({ key: 'Enter' });
    dispatch(enterEv);
    assert.strictEqual(navKey, 'Enter');

    VibeInspectionMode.handleNavigationKey = origHandler;
  });

  await t.test('Escape in SELECTION mode exits and drains held repeats and final keyup', () => {
    VibeKeyboardRouter.resetForTesting();
    VibeKeyboardRouter.setState(SessionState.SELECTION);

    let stopped = false;
    const onStop = () => { stopped = true; };
    VibeEvents.on('inspection:stop', onStop);

    // 1. Initial Escape keydown exits selection
    const esc1 = createSimulatedEvent({ key: 'Escape', code: 'Escape', repeat: false });
    dispatch(esc1);
    assert.strictEqual(esc1.defaultPrevented, true);
    assert.strictEqual(esc1.immediatePropagationStopped, true);
    assert.strictEqual(stopped, true);
    assert.strictEqual(VibeKeyboardRouter.getState(), SessionState.IDLE);

    // 2. Held Escape produces repeated keydown while in IDLE — must be drained!
    const escRepeat = createSimulatedEvent({ key: 'Escape', code: 'Escape', repeat: true });
    dispatch(escRepeat);
    assert.strictEqual(escRepeat.defaultPrevented, true, 'Repeated Escape must be drained');
    assert.strictEqual(escRepeat.immediatePropagationStopped, true);

    // 3. Final keyup of Escape — must be drained and conclude the drain sequence
    const escUp = createSimulatedEvent({ type: 'keyup', key: 'Escape', code: 'Escape' });
    dispatch(escUp);
    assert.strictEqual(escUp.defaultPrevented, true, 'Escape keyup must be drained');
    assert.strictEqual(escUp.immediatePropagationStopped, true);

    // 4. Next fresh Escape keydown reaches host (A2)!
    const freshEsc = createSimulatedEvent({ key: 'Escape', code: 'Escape', repeat: false });
    dispatch(freshEsc);
    assert.strictEqual(freshEsc.defaultPrevented, false, 'Next fresh Escape must not be swallowed');
    assert.strictEqual(freshEsc.immediatePropagationStopped, false);

    VibeEvents.off('inspection:stop', onStop);
  });

  await t.test('Shortcut exit drains modifier releases, and unrelated new keys are immediately usable', () => {
    VibeKeyboardRouter.resetForTesting();
    VibeKeyboardRouter.setCustomShortcutForTesting({ key: ',', ctrlKey: true, shiftKey: true });
    VibeKeyboardRouter.setState(SessionState.SELECTION);

    // Press modifier keys down
    const ctrlDown = createSimulatedEvent({ key: 'Control', code: 'ControlLeft' });
    dispatch(ctrlDown);
    const shiftDown = createSimulatedEvent({ key: 'Shift', code: 'ShiftLeft' });
    dispatch(shiftDown);

    // Trigger toggle shortcut exit
    const commaDown = createSimulatedEvent({ key: ',', code: 'Comma', ctrlKey: true, shiftKey: true });
    dispatch(commaDown);
    assert.strictEqual(VibeKeyboardRouter.getState(), SessionState.IDLE);

    // Release comma
    const commaUp = createSimulatedEvent({ type: 'keyup', key: ',', code: 'Comma' });
    dispatch(commaUp);
    assert.strictEqual(commaUp.defaultPrevented, true, 'Trigger keyup must be drained');

    // Release shift
    const shiftUp = createSimulatedEvent({ type: 'keyup', key: 'Shift', code: 'ShiftLeft' });
    dispatch(shiftUp);
    assert.strictEqual(shiftUp.defaultPrevented, true, 'Modifier keyup must be drained');

    // Release control
    const ctrlUp = createSimulatedEvent({ type: 'keyup', key: 'Control', code: 'ControlLeft' });
    dispatch(ctrlUp);
    assert.strictEqual(ctrlUp.defaultPrevented, true, 'Modifier keyup must be drained');

    // Unrelated new key immediately reaches the page without swallowing!
    const keyA = createSimulatedEvent({ key: 'a', code: 'KeyA' });
    dispatch(keyA);
    assert.strictEqual(keyA.defaultPrevented, false, 'Unrelated key must reach host immediately');
    assert.strictEqual(keyA.immediatePropagationStopped, false);
  });

  await t.test('Window blur resets any active drain state', () => {
    VibeKeyboardRouter.resetForTesting();
    VibeKeyboardRouter.setState(SessionState.SELECTION);

    // Escape down starts drain
    const esc1 = createSimulatedEvent({ key: 'Escape', code: 'Escape' });
    dispatch(esc1);
    assert.strictEqual(VibeKeyboardRouter.getState(), SessionState.IDLE);

    // Window blur occurs (e.g. user Alt+Tabs before releasing Escape)
    VibeKeyboardRouter.onBlur();

    // After blur, a new Escape keydown is not stuck in drain
    const escAfterBlur = createSimulatedEvent({ key: 'Escape', code: 'Escape' });
    dispatch(escAfterBlur);
    assert.strictEqual(escAfterBlur.defaultPrevented, false, 'Keys must not be stuck draining after blur');
  });
});
