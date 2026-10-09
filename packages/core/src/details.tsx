"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import type { ComponentPropsWithRef, ReactNode } from "react";

export type DetailsProps = ComponentPropsWithRef<"div"> & {
  /** The short question or link text that opens the details, such as "Help with nationality". */
  summary: ReactNode;
  children: ReactNode;
  /** Whether the details are open. Leave it out to let them keep track. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * GOV.UK's details, a short link that opens help most users do not need. It opens and closes
 * smoothly. When closed, its text stays in the page, so the browser's find in page can reach the
 * text and open the details.
 */
export function Details({
  summary,
  children,
  open,
  defaultOpen,
  onOpenChange,
  className = "",
  ...props
}: DetailsProps) {
  return (
    <Collapsible.Root
      {...props}
      className={`x-govuk-ui-details ${className}`.trim()}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    >
      <Collapsible.Trigger className="x-govuk-ui-details-summary">
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
          <path d="M3 1.5 9 6l-6 4.5z" fill="currentColor" />
        </svg>
        <span className="x-govuk-ui-details-summary-text">{summary}</span>
      </Collapsible.Trigger>
      <Collapsible.Panel className="x-govuk-ui-details-panel" hiddenUntilFound>
        <div className="x-govuk-ui-details-text">{children}</div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
