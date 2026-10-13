"use client";

import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
import {
  ErrorMessage,
  FieldBinding,
  Hint,
  present,
  useBoundField,
  useControlProps,
  useFieldSummary,
  useFormDefault,
} from "./field";
import { useLabels } from "./labels";

/** The words Switch writes in Check your answers, which a LabelsProvider can change. */
export type SwitchLabels = { on: string; off: string };

export const defaultSwitchLabels: SwitchLabels = { on: "On", off: "Off" };

export type SwitchProps = Omit<ComponentPropsWithRef<"input">, "type" | "role" | "size"> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: ReactNode;
  /** Called with the new state when the user turns it on or off. */
  onCheckedChange?: (checked: boolean) => void;
  /** `small` suits a dense list, such as a row of settings beside other controls. */
  size?: "medium" | "small";
};

/**
 * Turns a setting on or off at once, such as notifications. The label sits on the left and the
 * switch on the right. It is a native checkbox, so it works in a form with `name` and `value`.
 * Use Checkboxes for answers that are submitted later.
 *
 * Its row holds its label, a `Hint`, an `ErrorMessage` and a `SwitchControl`, bound to the control
 * as a Field binds its parts. Compose a Field of your own around a SwitchControl for another
 * layout.
 */
export function Switch({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  size = "medium",
  id,
  className = "",
  "aria-describedby": describedBy,
  ...props
}: SwitchProps) {
  const generated = useId();
  return (
    <FieldBinding
      controlId={id ?? `field-${generated}`}
      name={props.name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
      label={label}
    >
      <SwitchRow label={label} hint={hint} hideLabel={hideLabel} size={size} className={className}>
        <SwitchControl {...props} size={size} />
      </SwitchRow>
    </FieldBinding>
  );
}

/** Switch's row, with its words on the left and its control on the right. @internal */
function SwitchRow({
  label,
  hint,
  hideLabel,
  size,
  className,
  children,
}: Pick<SwitchProps, "label" | "hint" | "hideLabel" | "size" | "className"> & {
  children: ReactNode;
}) {
  const field = useBoundField();
  return (
    <div
      className={`x-govuk-ui-switch ${className}`.trim()}
      data-size={size === "small" ? "small" : undefined}
      data-invalid={field?.invalid || undefined}
    >
      <span className={`x-govuk-ui-switch-text${hideLabel ? " x-govuk-ui-visually-hidden" : ""}`}>
        <label className="x-govuk-ui-switch-label" htmlFor={field?.id}>
          {label}
        </label>
        <Hint>{hint}</Hint>
        <ErrorMessage />
      </span>
      {children}
    </div>
  );
}

export type SwitchControlProps = Omit<SwitchProps, "label" | "hint" | "hideLabel" | "errorMessage">;

/**
 * Switch's control on its own, the native checkbox drawn as a switch, for a field composed from
 * Field's parts. In a bound Field, it takes its id, name and descriptions from the field, and Check
 * your answers says whether it is on. It takes `size` itself, so it is small in a field of your own
 * too.
 */
export function SwitchControl(given: SwitchControlProps) {
  const {
    onCheckedChange,
    onChange,
    size = "medium",
    className = "",
    defaultChecked,
    ...props
  } = useControlProps(given);
  // A Form can give the switch an answer to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(props.name);
  const labels = useLabels("switch", defaultSwitchLabels);
  const { name } = props;
  // Check your answers says whether the setting is on.
  useFieldSummary({ answer: (data) => (name && data.has(name) ? labels.on : labels.off) });
  return (
    <input
      type="checkbox"
      // biome-ignore lint/a11y/useAriaPropsForRole: A native checkbox reports its own checked state.
      role="switch"
      {...props}
      defaultChecked={props.checked === undefined && saved !== undefined ? true : defaultChecked}
      className={`x-govuk-ui-switch-control ${className}`.trim()}
      data-size={size === "small" ? "small" : undefined}
      onChange={(event) => {
        onChange?.(event);
        onCheckedChange?.(event.target.checked);
      }}
    />
  );
}
