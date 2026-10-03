import type { ComponentPropsWithRef } from "react";

export type WarningTextProps = ComponentPropsWithRef<"div"> & {
  /** Read before the text by screen readers, in place of the icon. */
  iconFallbackText?: string;
};

/**
 * GOV.UK's warning text, which is bold text beside an exclamation mark in a circle, for something
 * people must know, such as a penalty.
 */
export function WarningText({
  iconFallbackText = "Warning",
  className = "",
  children,
  ...props
}: WarningTextProps) {
  return (
    <div {...props} className={`x-govuk-ui-warning-text ${className}`.trim()}>
      <span className="x-govuk-ui-warning-text-icon" aria-hidden="true">
        !
      </span>
      <strong className="x-govuk-ui-warning-text-text">
        <span className="x-govuk-ui-visually-hidden">{`${iconFallbackText} `}</span>
        {children}
      </strong>
    </div>
  );
}
