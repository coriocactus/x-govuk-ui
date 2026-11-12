"use client";

import { motion } from "motion/react";
import { type ComponentPropsWithRef, createElement } from "react";

/*
 * MotionDiv is apart from `motion.ts`, which almost every part imports for its durations. Only a
 * part that renders a MotionDiv imports this module, so only those parts load Motion.
 */

/** The element's own handlers that Motion would take as callbacks of its own. */
type DomHandlers = Pick<
  ComponentPropsWithRef<"div">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
>;

/** A div that gives itself the handlers Motion would take, which it is given under `dom`. */
function DomDiv({ dom, ...props }: ComponentPropsWithRef<"div"> & { dom?: DomHandlers }) {
  return createElement("div", { ...props, ...dom });
}

/**
 * A Motion div that keeps the DOM's meaning of every handler a part takes. Motion takes
 * `onAnimationStart` and the drag handlers as callbacks of its own, even when nothing is dragged.
 * It passes every other prop to a component of its own, so the handlers reach the div under `dom`,
 * through `motionElementProps`. They then run as React's handlers do, in the phase they were given
 * for, so a handler inside the part can stop one on the part from running.
 * @internal
 */
export const MotionDiv = motion.create(DomDiv);

/** A part's element props, for the MotionDiv it renders. */
export function motionElementProps({
  onAnimationStart,
  onDrag,
  onDragStart,
  onDragEnd,
  ...props
}: ComponentPropsWithRef<"div">) {
  return { ...props, dom: { onAnimationStart, onDrag, onDragStart, onDragEnd } };
}
