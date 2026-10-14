"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

const STORED = "x-govuk-ui-stored";

/**
 * Where a part keeps what it keeps between visits, such as `localStorage`, `sessionStorage`, or a
 * store of your own with the same three methods. Each answers at once, as the browser's do. A
 * server has no browser storage, so where a page also renders on the server, give the browser's
 * only in the browser, such as `typeof window === "undefined" ? undefined : sessionStorage`.
 */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Local storage, where there is one. The server has none, and a browser that blocks storage throws
 * as the page reads it, so the part keeps what it keeps for this visit alone.
 * @internal
 */
export function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * State kept in storage when there is a key, or else in memory. Every part that uses the key, in
 * this tab or, with local storage, another, follows changes.
 * @internal
 */
export function useStoredState<T>(
  key: string | undefined,
  fallback: T,
  storage?: StorageLike,
): [T, (next: T) => void] {
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
    () => (key ? readStorage(key, storage ?? browserStorage()) : null),
    () => null,
  );
  const set = useCallback(
    (next: T) => {
      setOwn(next);
      if (!key) return;
      try {
        (storage ?? browserStorage())?.setItem(key, JSON.stringify(next));
      } catch {
        // Storage can be full or blocked. The part still works for this visit.
      }
      window.dispatchEvent(new Event(STORED));
    },
    [key, storage],
  );
  // What is kept is read again each render, and parsed only as it changes, so a part keeps one
  // value while it stays the same.
  const kept = useMemo(() => parse<T>(stored), [stored]);
  return [kept ? kept.value : own, set];
}

/** What a stored string holds, or nothing where it holds nothing the part can read. */
function parse<T>(stored: string | null): { value: T } | null {
  if (stored === null) return null;
  try {
    return { value: JSON.parse(stored) as T };
  } catch {
    return null;
  }
}

function readStorage(key: string, storage: StorageLike | null) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}
