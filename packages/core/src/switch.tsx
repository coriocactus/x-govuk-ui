"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { Hint, useField } from "./field";

export type SwitchProps = Omit<ComponentPropsWithRef<"input">, "type" | "role" | "size"> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  /** Called with the new state when the user turns it on or off. */
  onCheckedChange?: (checked: boolean) => void;
  /** `small` suits a dense list, such as a row of settings beside other controls. */
  size?: "medium" | "small";
};

/**
 * Turns a setting on or off at once, such as notifications. The label sits on the left and the
 * switch on the right. It is a native checkbox, so it works in a form with `name` and `value`.
 * Use Checkboxes for answers that are submitted later.
 */
export function Switch({
  label,
  hint,
  hideLabel = false,
  onCheckedChange,
  onChange,
  size = "medium",
  id,
  className = "",
  "aria-describedby": describedBy,
  ...props
}: SwitchProps) {
  const field = useField({ id, hint, "aria-describedby": describedBy });
  return (
    <div
      className={`x-govuk-ui-switch ${className}`.trim()}
      data-size={size === "small" ? "small" : undefined}
    >
      <span className={`x-govuk-ui-switch-text${hideLabel ? " x-govuk-ui-visually-hidden" : ""}`}>
        <label className="x-govuk-ui-switch-label" htmlFor={field.id}>
          {label}
        </label>
        <Hint id={field.hintId}>{hint}</Hint>
      </span>
      <input
        type="checkbox"
        // biome-ignore lint/a11y/useAriaPropsForRole: A native checkbox reports its own checked state.
        role="switch"
        {...props}
        {...field.controlProps}
        className="x-govuk-ui-switch-control"
        onChange={(event) => {
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
        }}
      />
    </div>
  );
}
