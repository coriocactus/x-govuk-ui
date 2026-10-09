"use client";

import type { Transition } from "motion/react";
import { useSyncExternalStore } from "react";

type Bezier = readonly [number, number, number, number];

/*
 * The library's motion. These values match the custom properties in `styles/base.css`, so
 * animations in CSS and in Motion move alike. Change both together.
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

/** @internal The Sidebar's glide, for the browser to run. */
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
