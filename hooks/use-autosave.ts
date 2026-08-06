"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useAutosave<T>(key: string, initialValues: T) {
  const initialValuesRef = useRef(initialValues);

  const [data, setData] = useState<T>(initialValues);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`autosave_${key}`);
      if (saved) {
        setData({ ...initialValues, ...JSON.parse(saved) });
      }
    } catch {
      // ignore
    }
    setIsHydrated(true);
  }, [key]); // We don't include initialValues as it might cause infinite loops if not memoized


  const save = useCallback(
    (newValues: Partial<T>) => {
      setData((prev) => {
        const updated = { ...prev, ...newValues };
        if (JSON.stringify(prev) === JSON.stringify(updated)) {
          return prev;
        }
        try {
          localStorage.setItem(`autosave_${key}`, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [key]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(`autosave_${key}`);
    } catch {
      // ignore
    }
    setData(initialValuesRef.current);
  }, [key]);

  return { data, save, clear, setData, isHydrated };
}
