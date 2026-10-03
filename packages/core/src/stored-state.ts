"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

const STORED = "x-govuk-ui-stored";

/**
 * State kept in local storage when there is a key, or else in memory. Every part that uses the key,
 * in this tab or another, follows changes.
 * @internal
 */
export function useStoredState<T>(key: string | undefined, fallback: T): [T, (next: T) => void] {
  const [own, setOwn] = useState(fallback);
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!key) return () => {};
      const changed = (event: Event) => {
        if (!(event instanceof StorageEvent) || event.key === key) onChange();
      };
      window.addEventListener("storage", changed);
      window.addEventListener(STORED, changed);
      return () => {
        window.removeEventListener("storage", changed);
        window.removeEventListener(STORED, changed);
      };
    },
    [key],
  );
  const stored = useSyncExternalStore(
    subscribe,
    () => (key ? readStorage(key) : null),
    () => null,
  );
  const set = useCallback(
    (next: T) => {
      setOwn(next);
      if (!key) return;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage can be full or blocked. The part still works for this visit.
      }
      window.dispatchEvent(new Event(STORED));
    },
    [key],
  );
  if (stored === null) return [own, set];
  try {
    return [JSON.parse(stored) as T, set];
  } catch {
    return [own, set];
  }
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
