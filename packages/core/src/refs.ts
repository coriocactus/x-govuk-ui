import { type Ref, type RefCallback, useCallback } from "react";

/**
 * One ref that sets both refs given. One is a component's own, for an element it measures or
 * focuses. The other is the caller's, passed in as a prop. A callback ref may return a cleanup, as
 * one that starts observing the element does. The merged ref gives React one cleanup that runs it,
 * so whatever the callback started stops when the element goes. React then never calls the merged
 * ref with null. Instead, the cleanup empties an object ref, and calls a callback that returned no
 * cleanup with null, as React would have called it.
 * @internal
 */
export function useMergedRef<T>(own: Ref<T>, theirs: Ref<T> | undefined): RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      const cleanups: (() => void)[] = [];
      for (const ref of [own, theirs]) {
        if (!ref) continue;
        if (typeof ref === "function") {
          const cleanup = ref(node);
          cleanups.push(typeof cleanup === "function" ? cleanup : () => ref(null));
        } else {
          ref.current = node;
          cleanups.push(() => {
            ref.current = null;
          });
        }
      }
      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    },
    [own, theirs],
  );
}
