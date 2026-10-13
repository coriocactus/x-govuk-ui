"use client";

import { type RefObject, useLayoutEffect, useMemo, useState } from "react";

/*
 * Parts that tell their group about themselves, such as a Tour's steps, instead of the group
 * reading its children. A part can then sit inside a wrapper of a service's own.
 *
 * - A part registers after it renders, with what its group reads of it and the element that marks
 *   its place. It tells the group again after each render that changes what it gives, so the group
 *   never reads a render that React threw away.
 * - The group keeps its parts in the page's order. It sorts a part as it arrives, and checks the
 *   order again after each of its own renders, so a part that moves is placed again.
 * - A part that goes takes its entry with it. Only the part that added an entry removes it.
 *
 * The group renders once more after a part changes, before the browser paints, so nothing shows
 * the old state. A group that needs its parts in the first HTML, before any part has registered,
 * reads its direct children until then.
 */

type Entry<T> = { token: object; data: T; place: RefObject<Element | null> };

/**
 * Where a group's parts register.
 * @internal
 */
export type Registry<T> = {
  /** Adds the part, or brings what it gives up to date. */
  set: (token: object, data: T, place: RefObject<Element | null>) => void;
  delete: (token: object) => void;
};

/** Whether `first` comes before `second` in the page. A part without an element comes last. */
function before(first: Element | null, second: Element | null) {
  if (!first) return false;
  if (!second) return true;
  return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function inOrder<T>(entries: readonly Entry<T>[]) {
  return entries.every(
    (entry, index) =>
      index === 0 || !before(entry.place.current, entries[index - 1]?.place.current ?? null),
  );
}

function sorted<T>(entries: readonly Entry<T>[]) {
  return [...entries].sort((a, b) => {
    if (before(a.place.current, b.place.current)) return -1;
    if (before(b.place.current, a.place.current)) return 1;
    return 0;
  });
}

/**
 * A group's registered parts, in the page's order, and the registry to give them.
 * @internal
 */
export function useRegistry<T>(): { items: readonly T[]; registry: Registry<T> } {
  const [entries, setEntries] = useState<readonly Entry<T>[]>([]);
  const registry = useMemo<Registry<T>>(
    () => ({
      set: (token, data, place) =>
        setEntries((all) => {
          const at = all.findIndex((entry) => entry.token === token);
          const existing = all[at];
          if (existing) {
            if (existing.data === data) return all;
            const next = [...all];
            next[at] = { ...existing, data };
            return next;
          }
          const entry = { token, data, place };
          const after = all.findIndex((other) => before(place.current, other.place.current));
          return after < 0 ? [...all, entry] : [...all.slice(0, after), entry, ...all.slice(after)];
        }),
      delete: (token) =>
        setEntries((all) =>
          all.some((entry) => entry.token === token)
            ? all.filter((entry) => entry.token !== token)
            : all,
        ),
    }),
    [],
  );
  // A part that moved, such as a keyed step that a wrapper put first, is placed again.
  useLayoutEffect(() => {
    if (!inOrder(entries)) setEntries((all) => (inOrder(all) ? all : sorted(all)));
  });
  const items = useMemo(() => entries.map((entry) => entry.data), [entries]);
  return { items, registry };
}

/**
 * Registers a part with its group's registry, if it has one, giving `data` and the element that
 * marks its place. Give `data` as the same object until it changes, such as the part's props.
 * @internal
 */
export function useRegister<T>(
  registry: Registry<T> | null | undefined,
  data: T,
  place: RefObject<Element | null>,
) {
  const [token] = useState(() => ({}));
  useLayoutEffect(() => registry?.set(token, data, place), [registry, token, data, place]);
  useLayoutEffect(() => () => registry?.delete(token), [registry, token]);
}
