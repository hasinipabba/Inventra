"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Works like useState, but reads/writes the value to localStorage under `key`
 * so it survives a page refresh. Falls back to `initialValue` on the server
 * and on first render (avoids hydration mismatches), then syncs from
 * localStorage right after mount.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);

  // Load from localStorage once, after mount (client-only).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // ignore corrupt/inaccessible storage, keep initialValue
    } finally {
      hydrated.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Persist on every change, but skip the very first render before hydration
  // so we don't overwrite saved data with the seed data.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable — fail silently
    }
  }, [key, value]);

  return [value, setValue] as const;
}
