"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a media query matches, following changes. It is false on the server and while the page
 * hydrates, so the first render matches the server's.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(query).matches,
    () => false,
  );
}
