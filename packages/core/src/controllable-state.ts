"use client";

import { useCallback, useState } from "react";
import { useLatest } from "./refs";

/**
 * A value that the caller controls, or leaves to the component, as every part of the library
 * takes `value`, `defaultValue` and `onValueChange`. Given a `value`, the component shows it and
 * only reports a change through `onChange`. Left `undefined`, the component keeps its own value,
 * which starts as `defaultValue`. `null` counts as a value, so a caller controls "nothing chosen"
 * with `null`. The setter is stable, so effects and handlers can depend on it. A component of your
 * own uses it to be controlled or uncontrolled in the same way.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T | (() => T),
  onChange?: (next: T) => void,
): [T, (next: T) => void] {
  const [own, setOwn] = useState(defaultValue);
  const controlled = value !== undefined;
  const latest = useLatest({ controlled, onChange });
  const set = useCallback((next: T) => {
    if (!latest.current.controlled) setOwn(() => next);
    latest.current.onChange?.(next);
  }, []);
  return [controlled ? value : own, set];
}
