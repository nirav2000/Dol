// Active practice time, not wall time. Holds may overlap without double counting.
export function createActiveClock(now = () => performance.now()) {
  const holds = new Set();
  let since = now(), accumulated = 0;
  function elapsed() { return Math.max(0, accumulated + (holds.size ? 0 : now() - since)); }
  function hold(reason) {
    if (holds.has(reason)) return;
    if (!holds.size) accumulated = elapsed();
    holds.add(reason);
  }
  function release(reason) {
    if (!holds.delete(reason)) return;
    if (!holds.size) since = now();
  }
  function reset() { accumulated = 0; since = now(); }
  return {elapsed, hold, release, reset};
}
