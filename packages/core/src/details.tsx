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
 * text and open the details. It is a `DetailsRoot` holding a `DetailsSummary` and a
 * `DetailsPanel` with its `DetailsText`, which compose details of your own.
 */
export function Details({ summary, children, ...props }: DetailsProps) {
  return (
    <DetailsRoot {...props}>
      <DetailsSummary>{summary}</DetailsSummary>
      <DetailsPanel>
        <DetailsText>{children}</DetailsText>
      </DetailsPanel>
    </DetailsRoot>
  );
}

export type DetailsRootProps = Omit<DetailsProps, "summary" | "children"> & {
  children?: ReactNode;
};

/** Details of your own. Put a `DetailsSummary` in it, then a `DetailsPanel`. */
export function DetailsRoot({
  open,
  defaultOpen,
  onOpenChange,
  className = "",
  ...props
}: DetailsRootProps) {
  return (
    <Collapsible.Root
      {...props}
      className={`x-govuk-ui-details ${className}`.trim()}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
    />
  );
}

/** The short question or link text that opens the details, with its arrow. */
export function DetailsSummary({
  className = "",
  children,
  ...props
}: ComponentPropsWithRef<"button">) {
  return (
    <Collapsible.Trigger {...props} className={`x-govuk-ui-details-summary ${className}`.trim()}>
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path d="M3 1.5 9 6l-6 4.5z" fill="currentColor" />
      </svg>
      <span className="x-govuk-ui-details-summary-text">{children}</span>
    </Collapsible.Trigger>
  );
}

/**
 * What the details open. While closed, it stays in the page, so the browser's find in page can
 * reach it. Put a `DetailsText` in it.
 */
export function DetailsPanel({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return (
    <Collapsible.Panel
      {...props}
      className={`x-govuk-ui-details-panel ${className}`.trim()}
      hiddenUntilFound
    />
  );
}

/** The details' text, set beside GOV.UK's bar. */
export function DetailsText({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-details-text ${className}`.trim()} />;
}
