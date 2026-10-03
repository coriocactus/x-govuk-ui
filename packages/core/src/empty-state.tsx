import type { ComponentPropsWithRef } from "react";
import { ButtonGroup } from "./button";

export type EmptyStateProps = ComponentPropsWithRef<"div"> & {
  /** `small` suits a panel or a list, such as search results in a sidebar. */
  size?: "medium" | "small";
};

/**
 * What to show where there is nothing yet, such as no results or no saved applications, with a
 * way forward. Compose it from `EmptyStateMedia`, `EmptyStateTitle`, `EmptyStateDescription` and
 * `EmptyStateActions`. It rises gently into place.
 */
export function EmptyState({ size = "medium", className = "", ...props }: EmptyStateProps) {
  return (
    <div {...props} className={`x-govuk-ui-empty-state ${className}`.trim()} data-size={size} />
  );
}

/** An icon in a soft circle above the title. */
export function EmptyStateMedia({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return (
    <div
      aria-hidden="true"
      {...props}
      className={`x-govuk-ui-empty-state-media ${className}`.trim()}
    />
  );
}

export type EmptyStateTitleProps = ComponentPropsWithRef<"h2"> & {
  /**
   * The heading level, so it fits the page's outline. Use 1 when the empty state is the whole page,
   * such as for a service that is not answering.
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
};

/** Says what there is none of, such as "No saved applications". */
export function EmptyStateTitle({ level = 2, className = "", ...props }: EmptyStateTitleProps) {
  const Heading = `h${level}` as const;
  return <Heading {...props} className={`x-govuk-ui-empty-state-title ${className}`.trim()} />;
}

/** A sentence on why, or what to do about it. */
export function EmptyStateDescription({ className = "", ...props }: ComponentPropsWithRef<"p">) {
  return <p {...props} className={`x-govuk-ui-empty-state-description ${className}`.trim()} />;
}

/** The ways forward, as buttons or links, in a ButtonGroup. */
export function EmptyStateActions({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return (
    <ButtonGroup {...props} className={`x-govuk-ui-empty-state-actions ${className}`.trim()} />
  );
}
