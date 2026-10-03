"use client";

import { Button, type ButtonProps } from "./button";
import { useScopeSound } from "./sound-scope";

/** Ways an overlay closes without a press of its own, so it plays its own sound. */
const UNPRESSED = new Set(["escape-key", "outside-press", "swipe", "focus-out"]);

/**
 * Plays the close sound when an overlay closes without a press, such as Escape, a press outside
 * or a swipe. A press on a trigger or a close button already plays a sound through SoundScope.
 * @internal
 */
export function useOverlaySound() {
  const play = useScopeSound();
  return (open: boolean, reason: string) => {
    if (!open && UNPRESSED.has(reason)) play("close");
  };
}

const closeIcon = (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

/**
 * The quiet × button in an overlay's corner. Its name starts with Close, so it plays the close
 * sound.
 * @internal
 */
export function CloseIconButton({ label = "Close", ...props }: ButtonProps & { label?: string }) {
  return (
    <Button variant="quiet" size="small-icon" aria-label={label} {...props}>
      {closeIcon}
    </Button>
  );
}

/**
 * The arrow's shape, with a fill in the surface's colour and an edge in its keyline.
 * @internal
 */
export function ArrowShape() {
  return (
    <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden="true">
      <path
        className="x-govuk-ui-floating-arrow-fill"
        d="M9.66 2.6 4.81 6.97A4 4 0 0 1 2.13 8H0v2h20V8h-1.47a4 4 0 0 1-2.67-1.03L11 2.6a1 1 0 0 0-1.34 0Z"
      />
      <path
        className="x-govuk-ui-floating-arrow-edge"
        d="M9 1.86a2 2 0 0 1 2.67 0l4.86 4.37A3 3 0 0 0 18.53 7H15.9L11 2.6a1 1 0 0 0-1.34 0L4.78 7H2.13a3 3 0 0 0 2-.77Z"
      />
    </svg>
  );
}
