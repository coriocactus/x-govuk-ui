"use client";

import type { Transition } from "motion/react";
import { useSyncExternalStore } from "react";

type Bezier = readonly [number, number, number, number];

/*
 * The library's motion. These values match the custom properties in `styles/base.css`, so
 * animations in CSS and in Motion move alike. Change both together.
 *
 * Almost every part imports this module, so it imports only Motion's types. Importing it then loads
 * none of Motion's code.
 */

/** @internal Things arriving, settling and gliding into place. `--x-govuk-ui-ease-out` */
export const easeOut: Bezier = [0.22, 1, 0.36, 1];
/** @internal Sheets, sidebars and folds. `--x-govuk-ui-ease-drawer` */
export const easeDrawer: Bezier = [0.32, 0.72, 0, 1];

/** @internal In seconds. `--x-govuk-ui-duration-*` has the same values in milliseconds. */
export const duration = {
  /** Quick fades and presses, such as a tooltip appearing. */
  instant: 0.12,
  /** Colour, hover and focus feedback, and small things leaving. */
  fast: 0.15,
  /** Small movements, such as popups, panels and error messages opening. */
  medium: 0.22,
  /** Larger movements, such as sidebars, glides and messages arriving. */
  slow: 0.3,
} as const;

/**
 * How far along a movement is, from 0 to 1, a share of the way through its time, on a curve that
 * CSS writes as `cubic-bezier()`. The browser draws the same curve for a CSS transition.
 * @internal
 */
export function bezier([x1, y1, x2, y2]: Bezier, share: number) {
  // Where the curve is at a point along it, on one axis, given that axis's two handles.
  const at = (point: number, first: number, second: number) =>
    3 * first * point * (1 - point) ** 2 + 3 * second * point ** 2 * (1 - point) + point ** 3;
  // Time only rises along the curve, so halving the range finds the point that is at this time.
  let low = 0;
  let high = 1;
  for (let step = 0; step < 32; step++) {
    const middle = (low + high) / 2;
    if (at(middle, x1, x2) < share) low = middle;
    else high = middle;
  }
  return at((low + high) / 2, y1, y2);
}

/**
 * Eases a number from one value to another along a curve, one animation frame at a time, for a
 * movement that CSS cannot run, such as one that measures where it lands at each frame. `seconds`
 * is how long it takes, from the call, so the first frame is already part of the way. `onUpdate`
 * is given each value, and `to` itself last. `onComplete` then runs. `running` says whether any
 * values are still to come. It moves whatever the setting of reduced motion, so a part asks
 * `useMotionTiming` first.
 *
 * `stop` first gives `onUpdate` the value the number has reached at that moment, then ends it. A
 * part that starts again at each event, as a Dial does at each step of a drag, stops the last
 * movement first. The events can come faster than the frames. If `stop` gave no value, the number
 * would then never move while they came, and would catch up in one long glide once they stopped.
 * @internal
 */
export function easeNumber(
  from: number,
  to: number,
  {
    seconds,
    curve,
    onUpdate,
    onComplete,
  }: {
    seconds: number;
    curve: Bezier;
    onUpdate: (value: number) => void;
    onComplete?: () => void;
  },
) {
  // Both times are the clock's. The time a frame is given can be earlier than the clock's time at
  // the call.
  const start = performance.now();
  const share = () => (performance.now() - start) / (seconds * 1000);
  const at = (share: number) => (share < 1 ? from + (to - from) * bezier(curve, share) : to);
  const step = () => {
    const now = share();
    if (now < 1) {
      frame = requestAnimationFrame(step);
      onUpdate(at(now));
      return;
    }
    onUpdate(to);
    frame = 0;
    onComplete?.();
  };
  let frame = requestAnimationFrame(step);
  return {
    get running() {
      return frame !== 0;
    },
    stop() {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
      onUpdate(at(share()));
    },
  };
}

/** @internal The library's springs, for movement that follows a hand or settles into place. */
export const springs = {
  /** Follows the pointer closely, such as the Sidebar's highlight and active line. */
  glide: { type: "spring", stiffness: 520, damping: 44, mass: 0.8 },
  /** Settles without overshoot, such as a toast moving in its stack. */
  settle: { type: "spring", duration: 0.3, bounce: 0 },
  /** Overshoots a little, such as the One-time code ring moving between slots. */
  hop: { type: "spring", duration: 0.32, bounce: 0.18 },
} as const satisfies Record<string, Transition>;

/**
 * A spring as a CSS `linear()` easing and the time it takes to settle, in milliseconds, for
 * animations the browser runs itself. Those keep moving while the page is busy, such as while a new
 * page renders.
 * @internal
 */
export function springEasing({
  stiffness,
  damping,
  mass,
}: {
  stiffness: number;
  damping: number;
  mass: number;
}) {
  // The spring is stepped a millisecond at a time, from rest at 0 until it settles at 1.
  const positions = [0];
  let position = 0;
  let velocity = 0;
  while (positions.length < 3000) {
    velocity += ((stiffness * (1 - position) - damping * velocity) / mass) * 0.001;
    position += velocity * 0.001;
    positions.push(position);
    if (Math.abs(1 - position) < 0.0005 && Math.abs(velocity) < 0.01) break;
  }
  const time = positions.length - 1;
  const points = Array.from({ length: 41 }, (_, step) =>
    (positions[Math.round((step / 40) * time)] ?? 1).toFixed(4),
  );
  points[40] = "1";
  return {
    duration: time,
    easing: `linear(${points.join(", ")})`,
    /** How far along the spring is, from 0 to 1, a share of the way through its time. */
    at: (share: number) =>
      share >= 1 ? 1 : (positions[Math.round(Math.max(0, share) * time)] ?? 1),
  };
}

/**
 * @internal The Sidebar's glide, for the browser to run. `--x-govuk-ui-ease-glide` and
 * `--x-govuk-ui-duration-glide` are the same, for CSS.
 */
export const glideEasing = springEasing(springs.glide);

const none = { duration: 0 } as const;

const reducedQuery = "(prefers-reduced-motion: reduce)";
const followReduced = (change: () => void) => {
  const query = matchMedia(reducedQuery);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};

/** The transitions for each setting of reduced motion, made once, so a part can depend on them. */
const timingFor = (reduced: boolean) => ({
  reduced,
  ease: (seconds: number, curve: Bezier = easeOut): Transition =>
    reduced ? none : { duration: seconds, ease: curve },
  spring: (spring: Transition): Transition => (reduced ? none : spring),
});
const moving = timingFor(false);
const still = timingFor(true);

/**
 * Transitions that become instant when the user prefers reduced motion. The setting is followed
 * as it changes. Motion's own useReducedMotion reads it only once, as each component mounts, so a
 * part that stays on the page would keep moving after the setting changed.
 *
 * The timing is the same object until the setting changes, so an effect that depends on it runs
 * only then. A new object at every render would cause work. Filter chips, for example, would
 * observe their size again each time, and each first observation measures the chips and renders
 * them again.
 */
export function useMotionTiming() {
  const reduced = useSyncExternalStore(
    followReduced,
    () => matchMedia(reducedQuery).matches,
    () => false,
  );
  return reduced ? still : moving;
}
