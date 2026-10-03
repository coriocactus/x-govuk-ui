"use client";

import { type HTMLMotionProps, motion } from "motion/react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { duration, useMotionTiming } from "./motion";

/**
 * @internal The box is a motion.div, so Motion types its props. The box sets its own height and
 * the movement to it, so those props are left out.
 */
export type AutoHeightProps = Omit<
  HTMLMotionProps<"div">,
  "children" | "initial" | "animate" | "transition" | "onAnimationStart" | "onAnimationComplete"
> & { children?: ReactNode };

/**
 * A box that eases to the height of its content in one continuous movement, while the content
 * itself changes at once. Cookie banner uses it, so its confirmation replaces its question at once,
 * and the banner eases to the new height.
 * @internal
 */
export function AutoHeight({ className = "", children, ...props }: AutoHeightProps) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const timing = useMotionTiming();
  useLayoutEffect(() => {
    const element = inner.current;
    if (!element) return;
    const measure = () => setHeight(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <motion.div
      {...props}
      className={`x-govuk-ui-auto-height ${className}`.trim()}
      // It clips its content only while its height changes. At rest, anything that reaches outside
      // it, such as a Date input's turning drum or a focus ring, shows in full.
      data-moving={moving || undefined}
      onAnimationStart={() => setMoving(true)}
      onAnimationComplete={() => setMoving(false)}
      initial={false}
      animate={{ height: height ?? "auto" }}
      transition={timing.ease(duration.slow)}
    >
      <div ref={inner}>{children}</div>
    </motion.div>
  );
}
