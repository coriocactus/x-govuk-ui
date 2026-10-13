"use client";

import { type ComponentPropsWithRef, type ReactNode, type Ref, useEffect, useRef } from "react";
import { chain } from "./events";
import { useLabels } from "./labels";

/** The words about errors, which a LabelsProvider can change, as GOV.UK's Welsh pages do. */
export type ErrorLabels = {
  /** The error summary's title. */
  summaryTitle: string;
  /**
   * Starts each error message for screen readers, and the page's title while a Form has errors,
   * followed by a colon.
   */
  prefix: string;
};

export const defaultErrorLabels: ErrorLabels = {
  summaryTitle: "There is a problem",
  prefix: "Error",
};

export type ErrorSummaryProps = Omit<
  ComponentPropsWithRef<"div">,
  "title" | "autoFocus" | "ref"
> & {
  /** The errors, as `ErrorSummaryItem` parts, in the order of the fields. */
  children: ReactNode;
  /** The title. By default, its `errors` label, "There is a problem". */
  title?: ReactNode;
  /** Text between the title and the list, for a problem that is not about one field. */
  description?: ReactNode;
  /**
   * Moves focus to the summary when it appears, as GOV.UK does, so screen readers announce it.
   * After another submission with errors, give the summary a new `key` to move focus again.
   */
  autoFocus?: boolean;
  ref?: Ref<HTMLDivElement>;
};

/** The label or legend that names a field, so it shows when the field is scrolled to. */
function captionFor(field: HTMLElement) {
  const legend = field.closest("fieldset")?.querySelector("legend");
  if (legend && field.matches("input[type=checkbox], input[type=radio]")) return legend;
  return (
    (field.id &&
      field.ownerDocument.querySelector<HTMLElement>(`label[for="${CSS.escape(field.id)}"]`)) ||
    field.closest("label") ||
    field
  );
}

/** What can take focus, for a field whose link goes to an element around its control. */
const FOCUSABLE =
  'input:not([type="hidden"]), select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])';

/** GOV.UK's summary of the errors on a page, above the form. Each error links to its field. */
export function ErrorSummary({
  children,
  title,
  description,
  autoFocus = true,
  className = "",
  ref,
  ...props
}: ErrorSummaryProps) {
  const element = useRef<HTMLDivElement>(null);
  const labels = useLabels("error", defaultErrorLabels);
  useEffect(() => {
    if (autoFocus) element.current?.focus();
  }, [autoFocus]);
  return (
    <div
      {...props}
      ref={(node) => {
        element.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={`x-govuk-ui-error-summary ${className}`.trim()}
      tabIndex={-1}
    >
      <div role="alert">
        <h2 className="x-govuk-ui-error-summary-title">{title ?? labels.summaryTitle}</h2>
        {description && <div className="x-govuk-ui-error-summary-description">{description}</div>}
        <ul className="x-govuk-ui-error-summary-list">{children}</ul>
      </div>
    </div>
  );
}

export type ErrorSummaryItemProps = ComponentPropsWithRef<"a"> & {
  /** The field's id as a fragment, such as "#email". */
  href: string;
};

/**
 * One error. Use the same words as the error message beside the field. Pressing it scrolls the
 * field's label or legend into view and focuses the field. When the link goes to an element around
 * the field's control, such as a group, the first control inside takes focus.
 */
export function ErrorSummaryItem({
  href,
  className = "",
  onClick,
  ...props
}: ErrorSummaryItemProps) {
  return (
    <li>
      <a
        {...props}
        href={href}
        className={`x-govuk-ui-error-summary-link ${className}`.trim()}
        onClick={chain(onClick, (event) => {
          const id = decodeURIComponent(event.currentTarget.hash.slice(1));
          const field = id && event.currentTarget.ownerDocument.getElementById(id);
          if (!field) return;
          event.preventDefault();
          const control = field.matches(FOCUSABLE)
            ? field
            : (field.querySelector<HTMLElement>(FOCUSABLE) ?? field);
          captionFor(control).scrollIntoView({ block: "start" });
          control.focus({ preventScroll: true });
        })}
      />
    </li>
  );
}
