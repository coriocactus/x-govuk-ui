"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { ErrorMessage, Field, Hint, useField } from "./field";

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

/** Groups related fields under one legend, such as the parts of an address. */
export function Fieldset({
  legend,
  legendSize = "small",
  pageHeading = false,
  hint,
  errorMessage,
  id,
  name,
  className = "",
  children,
  "aria-describedby": describedBy,
  ...props
}: FieldsetProps) {
  const field = useField({ id, name, hint, errorMessage, "aria-describedby": describedBy });
  return (
    <Field invalid={field.invalid}>
      <fieldset
        {...props}
        className={`x-govuk-ui-fieldset ${className}`.trim()}
        aria-describedby={field.controlProps["aria-describedby"]}
      >
        <legend className={`x-govuk-ui-legend x-govuk-ui-legend--${legendSize}`}>
          {pageHeading ? <h1 className="x-govuk-ui-legend-heading">{legend}</h1> : legend}
        </legend>
        <Hint id={field.hintId}>{hint}</Hint>
        <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
        {children}
      </fieldset>
    </Field>
  );
}
