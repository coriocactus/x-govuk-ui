"use client";

import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
import { ErrorMessage, Field, Hint, present, useBoundField, useFieldSummary } from "./field";

export type FieldsetProps = Omit<ComponentPropsWithRef<"fieldset">, "id"> & {
  /** The question or heading for the fields inside. */
  legend: ReactNode;
  /**
   * `small` suits a question among others. `large` suits a question that is the page's only one.
   */
  legendSize?: "small" | "medium" | "large";
  /** Puts the legend in the page's `h1`, for a page that asks one question. */
  pageHeading?: boolean;
  hint?: ReactNode;
  errorMessage?: ReactNode;
  /**
   * The group's id. Its hint is `{id}-hint` and its error `{id}-error`. Radios and Checkboxes give
   * their first item this id, so an error summary can link to it.
   */
  id?: string;
  /** The name its answers submit under. In a Form, the group finds its error by it. */
  name?: string;
};

/**
 * Groups related fields under one legend, such as the parts of an address. It is a bound Field
 * holding a `FieldsetRoot`, with a `FieldsetLegend`, a `Hint` and an `ErrorMessage` before the
 * fields. Compose those parts yourself for a fieldset of your own.
 */
export function Fieldset({
  legend,
  legendSize = "small",
  pageHeading = false,
  hint,
  errorMessage,
  id,
  name,
  children,
  "aria-describedby": describedBy,
  ...props
}: FieldsetProps) {
  const generated = useId();
  return (
    <Field
      controlId={id ?? `field-${generated}`}
      name={name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <FieldsetRoot {...props}>
        <FieldsetLegend size={legendSize} pageHeading={pageHeading}>
          {legend}
        </FieldsetLegend>
        <Hint>{hint}</Hint>
        <ErrorMessage />
        {children}
      </FieldsetRoot>
    </Field>
  );
}

/**
 * A fieldset of your own. Put a `FieldsetLegend` first in it, then its hint, its error and its
 * fields. In a bound Field, it is described by the field's hint and error, after its own
 * `aria-describedby`.
 */
export function FieldsetRoot({
  className = "",
  "aria-describedby": describedBy,
  ...props
}: ComponentPropsWithRef<"fieldset">) {
  const field = useBoundField();
  const described = [describedBy, field?.controlProps["aria-describedby"]].join(" ").split(" ");
  return (
    <fieldset
      {...props}
      className={`x-govuk-ui-fieldset ${className}`.trim()}
      aria-describedby={[...new Set(described.filter(Boolean))].join(" ") || undefined}
    />
  );
}

export type FieldsetLegendProps = ComponentPropsWithRef<"legend"> & {
  /**
   * `small` suits a question among others. `large` suits a question that is the page's only one.
   */
  size?: "small" | "medium" | "large";
  /** Puts the legend in the page's `h1`, for a page that asks one question. */
  pageHeading?: boolean;
};

/**
 * A fieldset's legend, which is its question. It comes first in a `FieldsetRoot`. In a bound Field,
 * its words are the question that Check your answers lists.
 */
export function FieldsetLegend({
  size = "small",
  pageHeading = false,
  className = "",
  children,
  ...props
}: FieldsetLegendProps) {
  useFieldSummary({ label: children });
  return (
    <legend
      {...props}
      className={`x-govuk-ui-legend x-govuk-ui-legend--${size} ${className}`.trim()}
    >
      {pageHeading ? <h1 className="x-govuk-ui-legend-heading">{children}</h1> : children}
    </legend>
  );
}
