"use client";

import { type ComponentPropsWithRef, type ReactNode, type Ref, useEffect, useRef } from "react";

export type ErrorSummaryProps = Omit<
  ComponentPropsWithRef<"div">,
  "title" | "autoFocus" | "ref"
> & {
  /** The errors, as `ErrorSummaryItem` parts, in the order of the fields. */
  children: ReactNode;
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

/** GOV.UK's summary of the errors on a page, above the form. Each error links to its field. */
export function ErrorSummary({
  children,
  title = "There is a problem",
  description,
  autoFocus = true,
  className = "",
  ref,
  ...props
}: ErrorSummaryProps) {
  const element = useRef<HTMLDivElement>(null);
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
        <h2 className="x-govuk-ui-error-summary-title">{title}</h2>
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
 * field's label or legend into view and focuses the field.
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
        onClick={(event) => {
          onClick?.(event);
          const id = decodeURIComponent(event.currentTarget.hash.slice(1));
          const field = id && event.currentTarget.ownerDocument.getElementById(id);
          if (event.defaultPrevented || !field) return;
          event.preventDefault();
          captionFor(field).scrollIntoView({ block: "start" });
          field.focus({ preventScroll: true });
        }}
      />
    </li>
  );
}
