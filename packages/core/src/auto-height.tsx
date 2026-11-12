"use client";

import { type ComponentPropsWithRef, useLayoutEffect, useRef, useState } from "react";
import { useMergedRef } from "./refs";

/** @internal The box is a div, which takes every prop. */
export type AutoHeightProps = ComponentPropsWithRef<"div">;

/**
 * A box that eases to the height of its content in one continuous movement, while the content
 * itself changes at once. Cookie banner uses it, so its confirmation replaces its question at once,
 * and the banner eases to the new height. The box sets the height it measures as a style, and its
 * stylesheet eases it. The first height replaces `auto`, which CSS cannot ease from, so the box
 * never eases as it first shows.
 * @internal
 */
export function AutoHeight({ className = "", style, children, ref, ...props }: AutoHeightProps) {
  const box = useRef<HTMLDivElement>(null);
  const merged = useMergedRef(box, ref);
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  useLayoutEffect(() => {
    const element = inner.current;
    if (!element) return;
    const measure = () => setHeight(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only a new height starts a transition.
  useLayoutEffect(() => {
    // To list the box's animations, the browser works out its styles, which starts the transition
    // to a new height. None starts under reduced motion, or while the box is not displayed.
    const running = (box.current?.getAnimations() ?? []).filter(
      (animation) =>
        animation instanceof CSSTransition && animation.transitionProperty === "height",
    );
    setMoving(running.length > 0);
    if (running.length === 0) return;
    let current = true;
    // A transition that is cancelled, as when the box stops being displayed, ends the movement too.
    void Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
      if (current) setMoving(false);
    });
    return () => {
      current = false;
    };
  }, [height]);
  return (
    <div
      {...props}
      ref={merged}
      className={`x-govuk-ui-auto-height ${className}`.trim()}
      // It clips its content only while its height changes. At rest, anything that reaches outside
      // it, such as a Date input's turning drum or a focus ring, shows in full.
      data-moving={moving || undefined}
      style={{ ...style, height: height ?? undefined }}
    >
      <div ref={inner}>{children}</div>
    </div>
  );
}
