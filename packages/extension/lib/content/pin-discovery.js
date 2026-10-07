// Orchestrates asynchronous pin rendering, retries, and late-loading element discovery.
// Guarantees non-overlapping attempts, completed-result inspection, and lifecycle cancellation.

import VibeBadgeManager from './badge-manager.js';

let currentCycleId = 0;
let activeCycle = null;
let retryTimer = null;
let debounceTimer = null;
let observerTimeoutTimer = null;
let observerCycleId = 0;
let lazyObserver = null;
let inFlightDiscoveryPromise = null;

export function filterEligibleElementAnnotations(annotations) {
  return (annotations || []).filter((a) =>
    a &&
    a.type !== 'stylesheet' &&
    a.status !== 'resolved' &&
    a.status !== 'variants-discarded'
  );
}

function cancelDiscovery(reason = 'cancelled') {
  currentCycleId++;
  inFlightDiscoveryPromise = null;
  try { VibeBadgeManager.cancelPendingRenders?.(); } catch {}
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (observerTimeoutTimer) {
    clearTimeout(observerTimeoutTimer);
    observerTimeoutTimer = null;
  }
  if (lazyObserver) {
    lazyObserver.disconnect();
    lazyObserver = null;
  }
  activeCycle = null;
  return { cycleId: currentCycleId, reason };
}

async function startDiscovery({
  annotations = [],
  maxAttempts = 5,
  delay = 500,
  renderFn = null,
  onCompleted = null,
  coalesce = false
} = {}) {
  if (coalesce && inFlightDiscoveryPromise) {
    return inFlightDiscoveryPromise;
  }

  // Each call begins a new discovery cycle; supersedes any prior cycle
  const cycleId = ++currentCycleId;

  // Clear timers and observer from prior cycles
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  if (observerTimeoutTimer) { clearTimeout(observerTimeoutTimer); observerTimeoutTimer = null; }
  if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }

  const effectiveRender = renderFn || (async (anns) => {
    return await VibeBadgeManager.render(anns);
  });

  const eligibleAnnotations = filterEligibleElementAnnotations(annotations);
  const totalEligibleCount = eligibleAnnotations.length;

  let attempts = 0;
  let cycleResolved = false;

  const cycleInfo = {
    cycleId,
    annotations,
    eligibleAnnotations,
    attempts: 0,
    isCompleted: false,
    unresolvedIds: eligibleAnnotations.map((a) => a.id)
  };
  activeCycle = cycleInfo;

  const cyclePromise = new Promise((resolve) => {
    const finishCycle = (unresolvedIds = []) => {
      if (cycleResolved) return;
      cycleResolved = true;
      cycleInfo.isCompleted = true;
      cycleInfo.unresolvedIds = unresolvedIds;
      if (inFlightDiscoveryPromise === cyclePromise) {
        inFlightDiscoveryPromise = null;
      }
      if (onCompleted) {
        try { onCompleted({ cycleId, attempts, unresolvedIds }); } catch {}
      }
      resolve({ cycleId, attempts, unresolvedIds });
    };

    const runAttempt = async () => {
      // Invalidation check: did a superseding request or cancellation occur?
      if (cycleId !== currentCycleId) {
        if (inFlightDiscoveryPromise === cyclePromise) {
          inFlightDiscoveryPromise = null;
        }
        resolve({ cycleId, attempts, unresolvedIds: cycleInfo.unresolvedIds, superseded: true });
        return;
      }

      attempts++;
      cycleInfo.attempts = attempts;

      let renderResult = null;
      try {
        renderResult = await effectiveRender(annotations);
      } catch (err) {
        renderResult = { error: err, count: VibeBadgeManager.getCount() };
      }

      // Check if cancelled/superseded during await
      if (cycleId !== currentCycleId) {
        if (inFlightDiscoveryPromise === cyclePromise) {
          inFlightDiscoveryPromise = null;
        }
        resolve({ cycleId, attempts, unresolvedIds: cycleInfo.unresolvedIds, superseded: true });
        return;
      }

      // Determine unresolved eligible targets from completed result
      let unresolvedIds = [];
      if (renderResult && Array.isArray(renderResult.unresolvedIds)) {
        unresolvedIds = renderResult.unresolvedIds;
      } else {
        const renderedSet = new Set(VibeBadgeManager.getRenderedBadgeIds?.() || []);
        unresolvedIds = eligibleAnnotations
          .filter((a) => !renderedSet.has(a.id))
          .map((a) => a.id);
      }
      cycleInfo.unresolvedIds = unresolvedIds;

      // If all eligible targets are found, cycle completes immediately! No retry, no observer.
      if (unresolvedIds.length === 0 || totalEligibleCount === 0) {
        finishCycle([]);
        return;
      }

      // If unresolved targets remain and attempts < maxAttempts, schedule sequential next attempt
      if (attempts < maxAttempts) {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          runAttempt();
        }, delay);
        return;
      }

      // If maxAttempts reached and unresolved targets remain, hand off to lazy element observer
      startLazyObserver({
        cycleId,
        annotations,
        eligibleAnnotations,
        effectiveRender,
        onAllFound: () => finishCycle([])
      });

      // Report current state while lazy observer continues in background
      finishCycle(unresolvedIds);
    };

    runAttempt();
  });

  if (coalesce) {
    inFlightDiscoveryPromise = cyclePromise;
  }

  return cyclePromise;
}

function startLazyObserver({
  cycleId,
  annotations,
  eligibleAnnotations,
  effectiveRender,
  onAllFound
}) {
  if (lazyObserver) {
    lazyObserver.disconnect();
    lazyObserver = null;
  }
  if (observerTimeoutTimer) {
    clearTimeout(observerTimeoutTimer);
    observerTimeoutTimer = null;
  }

  observerCycleId = cycleId;

  lazyObserver = new MutationObserver(() => {
    if (cycleId !== currentCycleId) {
      if (lazyObserver) { lazyObserver.disconnect(); lazyObserver = null; }
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      debounceTimer = null;
      if (cycleId !== currentCycleId) return;

      const result = await effectiveRender(annotations);
      if (cycleId !== currentCycleId) return;

      const unresolved = (result && Array.isArray(result.unresolvedIds))
        ? result.unresolvedIds
        : eligibleAnnotations.filter((a) => !(VibeBadgeManager.getRenderedBadgeIds?.() || []).includes(a.id)).map(a => a.id);

      if (unresolved.length === 0) {
        if (lazyObserver) {
          lazyObserver.disconnect();
          lazyObserver = null;
        }
        if (observerTimeoutTimer) {
          clearTimeout(observerTimeoutTimer);
          observerTimeoutTimer = null;
        }
        if (onAllFound) onAllFound();
      }
    }, 300);
  });

  if (document.body) {
    lazyObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Bounded observer lifetime (30s). Tied strictly to this observerCycleId.
  const thisObsCycle = observerCycleId;
  observerTimeoutTimer = setTimeout(() => {
    observerTimeoutTimer = null;
    // Only disconnect if this observer belongs to the same cycle!
    if (thisObsCycle === currentCycleId && lazyObserver) {
      lazyObserver.disconnect();
      lazyObserver = null;
    }
  }, 30000);
  if (observerTimeoutTimer && typeof observerTimeoutTimer.unref === 'function') {
    observerTimeoutTimer.unref();
  }
}

function isObserverActive() {
  return lazyObserver !== null;
}

function getActiveCycle() {
  return activeCycle;
}

function teardown() {
  cancelDiscovery('teardown');
}

const VibePinDiscovery = {
  startDiscovery,
  cancelDiscovery,
  filterEligibleElementAnnotations,
  isObserverActive,
  getActiveCycle,
  teardown
};

export default VibePinDiscovery;
