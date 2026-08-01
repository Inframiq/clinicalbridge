"use client";

import { useCallback, useSyncExternalStore } from "react";

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
 */
export function useLocalStorageState<T>(key: string, initialValue: T) {
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
  const getServerSnapshot = useCallback(() => null, []);

  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = stored !== null ? (JSON.parse(stored) as T) : initialValue;

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
