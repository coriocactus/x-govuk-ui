"use client";

import { type RefObject, useCallback } from "react";
import { glideEasing, useMotionTiming } from "./motion";

/**
 * A mark's box on the page, which stays the same as the page scrolls. Each group of items that
 * share one mark keeps the last mark's box in a ref, for the next mark to glide from.
 * @internal
 */
export type GlideBox = { left: number; top: number; width: number; height: number };

const boxOf = (mark: HTMLElement): GlideBox => {
  const box = mark.getBoundingClientRect();
  return { left: box.left + scrollX, top: box.top + scrollY, width: box.width, height: box.height };
};

/**
 * A ref for a mark that one item in a group has at a time, such as the bar under Service
 * navigation's current section. The mark is inside its item, so it follows the item as the layout
 * moves. When another item gets the mark, the new mark glides from the last mark's box, by one
 * transform on the glide's curve, which the browser runs. Between items of two sizes, the transform
 * scales the mark, and its corners with it. Under reduced motion, the new mark is in place at once.
 *
 * `from` is the group's. It keeps the last mark's box as the mark was drawn when it left, at rest
 * or part way through a glide.
 *
 * The box is read in the ref's cleanup, which React runs while the mark is still on the page.
 * Where an item before the mark leaves in the same render, React has removed it by then, so the
 * box is the mark's place after that item has gone.
 * @internal
 */
export function useGlide(from: RefObject<GlideBox | null>) {
  const { reduced } = useMotionTiming();
  return useCallback(
    (mark: HTMLElement | null) => {
      if (!mark) return;
      const was = from.current;
      if (was && !reduced) {
        const now = boxOf(mark);
        // The mark scales about its middle, so it moves by as far as the two middles are apart.
        const x = was.left + was.width / 2 - (now.left + now.width / 2);
        const y = was.top + was.height / 2 - (now.top + now.height / 2);
        const scale = `${was.width / now.width}, ${was.height / now.height}`;
        mark.animate(
          [{ transform: `translate(${x}px, ${y}px) scale(${scale})` }, { transform: "none" }],
          glideEasing,
        );
      }
      return () => {
        from.current = boxOf(mark);
      };
    },
    [from, reduced],
  );
}
