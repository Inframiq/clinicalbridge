"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

/**
 * True only after the client has hydrated. Implemented via
 * useSyncExternalStore (not a setState-in-effect) so React's own
 * post-hydration resync flips it, avoiding an extra render-then-mutate
 * pass and the "set-state-in-effect" pitfall for this exact pattern.
 */
export function useHasMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
