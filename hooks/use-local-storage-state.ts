"use client";

// This hook deliberately reads and writes a `useRef` cache during render: it
// memoizes `JSON.parse` against the raw localStorage string so `value` keeps a
// stable reference while `localStorage[key]` is unchanged (a plain `useMemo`
// can't, because callers pass a fresh `initialValue` literal each render). The
// cache never changes render output for a given raw string, so the pattern is
// safe; the react-hooks/refs data-flow taint just can't see that.
/* eslint-disable react-hooks/refs -- intentional render-time parse cache; see note above */

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

function readValue<T>(key: string, initialValue: T): T {
  if (typeof window === "undefined") return initialValue;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initialValue;
  } catch {
    return initialValue;
  }
}

function eventName(key: string) {
  return `lt-local-storage:${key}`;
}

/**
 * State synced to localStorage via useSyncExternalStore, so demo interactions
 * (broadcasting a shift, approving a payment) persist across reloads without
 * a backend, and stay in sync across components/tabs without unsafe
 * setState-in-effect hydration.
 *
 * The parsed value is memoized against the raw localStorage string so `value`
 * keeps a stable reference across renders while `localStorage[key]` is
 * unchanged — otherwise every render re-parses and hands consumers a fresh
 * object, churning context values and forcing re-render cascades.
 *
 * `serverValue` (optional) seeds the SSR snapshot for a future server-seeded
 * provider; it is not wired to a caller yet.
 */
export function useLocalStorageState<T>(key: string, initialValue: T, serverValue?: T) {
  const subscribe = useCallback(
    (callback: () => void) => {
      window.addEventListener("storage", callback);
      window.addEventListener(eventName(key), callback);
      return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(eventName(key), callback);
      };
    },
    [key]
  );

  const getSnapshot = useCallback(() => window.localStorage.getItem(key), [key]);
  const getServerSnapshot = useCallback(() => serverValue ?? null, [serverValue]);

  const stored = useSyncExternalStore<string | T | null>(subscribe, getSnapshot, getServerSnapshot);

  const cache = useRef<{ raw: string | T | null; parsed: T }>({ raw: null, parsed: initialValue });
  const value = useMemo(() => {
    if (stored === null) return initialValue;
    if (typeof stored !== "string") return stored as T; // serverValue passthrough
    if (cache.current.raw === stored) return cache.current.parsed;
    const parsed = JSON.parse(stored) as T;
    cache.current = { raw: stored, parsed };
    return parsed;
  }, [stored, initialValue]);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const current = readValue(key, initialValue);
      const next = typeof updater === "function" ? (updater as (prev: T) => T)(current) : updater;
      window.localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event(eventName(key)));
    },
    [key, initialValue]
  );

  const reset = useCallback(() => setValue(initialValue), [setValue, initialValue]);

  return [value, setValue, reset] as const;
}
