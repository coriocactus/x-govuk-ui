import type { CSSProperties } from "react";

/**
 * A line along the foot of a card that shrinks as its time runs out, for a Callout or a toast that
 * closes by itself. It runs in CSS, and its card pauses it while the timeout is paused. Give it a
 * new `key` when its time starts again.
 * @internal
 */
export function Countdown({ time }: { time: number }) {
  return (
    <span
      className="x-govuk-ui-countdown"
      style={{ "--x-govuk-ui-countdown-time": `${time}ms` } as CSSProperties}
      aria-hidden="true"
    />
  );
}
