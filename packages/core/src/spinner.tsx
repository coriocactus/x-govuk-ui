import type { ComponentPropsWithRef } from "react";

export type SpinnerProps = ComponentPropsWithRef<"span"> & {
  size?: "small" | "medium" | "large";
  /**
   * What is loading, for screen readers, such as "Loading results". With a label, the spinner is a
   * status. Leave it out when text beside the spinner already says what is happening.
   */
  label?: string;
};

/**
 * Shows that something is happening without saying how long it will take. The arc turns, and
 * lengthens and shortens as it goes. When people prefer reduced motion, it turns slowly at an even
 * pace, because it is the only sign that work is going on. Button and Toast use it.
 */
export function Spinner({ size = "medium", label, className = "", ...props }: SpinnerProps) {
  return (
    <span
      role={label ? "status" : undefined}
      {...props}
      className={`x-govuk-ui-spinner ${className}`.trim()}
      data-size={size}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle className="x-govuk-ui-spinner-track" cx="12" cy="12" r="9" />
        <circle className="x-govuk-ui-spinner-arc" cx="12" cy="12" r="9" pathLength="100" />
      </svg>
      {label && <span className="x-govuk-ui-visually-hidden">{label}</span>}
    </span>
  );
}
