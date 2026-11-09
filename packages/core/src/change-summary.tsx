"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { useLabels } from "./labels";

export type ChangeSummaryProps = ComponentPropsWithRef<"dl"> & {
  /** The changes, as `ChangeSummaryItem` parts, in the order they were made. */
  children: ReactNode;
};

/**
 * What a change to a record changed, each value with what it was and what it is now, such as an
 * owner or a status, together on a tinted panel. Put it in a Timeline's event, so a record's
 * history says who changed what, when, and from what. It sets no space around itself, so put it
 * in a Stack with what comes after it, such as the reason for the change.
 */
export function ChangeSummary({ className = "", ...props }: ChangeSummaryProps) {
  return <dl {...props} className={`x-govuk-ui-change-summary ${className}`.trim()} />;
}

export type ChangeSummaryItemProps = ComponentPropsWithRef<"div"> & {
  /** What changed, such as Owner. */
  label: ReactNode;
  /** What it was. Leave it out for a value that was not set. */
  from?: ReactNode;
  /** What it is now. Leave it out for a value that was removed. */
  to?: ReactNode;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<ChangeSummaryLabels>;
};

/** The words Change summary writes, which a LabelsProvider or its `labels` can change. */
export type ChangeSummaryLabels = {
  /** Comes before what a value was, for screen readers, which do not see the arrow. */
  from: string;
  /** Comes before what a value is now, for screen readers. */
  to: string;
  /** Stands for a value that was not set, or was removed. */
  none: string;
};

export const defaultChangeSummaryLabels: ChangeSummaryLabels = {
  from: "changed from",
  to: "to",
  none: "None",
};

/**
 * One value's change: what changed, then what it was, quieter, an arrow, and what it is now, in
 * bold, so the eye finds the new values first. Screen readers do not see the arrow, so it says, as
 * Owner, changed from Lord Rosebery to William Gladstone. The values are not a document's edits, so
 * they are not `del` and `ins`, which some screen readers call deleted and inserted.
 */
export function ChangeSummaryItem({
  label,
  from,
  to,
  className = "",
  labels: ownLabels,
  ...props
}: ChangeSummaryItemProps) {
  const labels = useLabels("changeSummary", defaultChangeSummaryLabels, ownLabels);
  const value = (words: ReactNode) =>
    words === undefined || words === null || words === "" ? (
      <span className="x-govuk-ui-change-summary-none">{labels.none}</span>
    ) : (
      words
    );
  return (
    <div {...props} className={`x-govuk-ui-change-summary-item ${className}`.trim()}>
      <dt className="x-govuk-ui-change-summary-label">{label}</dt>
      <dd className="x-govuk-ui-change-summary-change">
        <span className="x-govuk-ui-visually-hidden">{labels.from} </span>
        <span className="x-govuk-ui-change-summary-from">{value(from)}</span>
        <svg
          className="x-govuk-ui-change-summary-arrow"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
          aria-hidden="true"
        >
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
        <span className="x-govuk-ui-visually-hidden"> {labels.to} </span>
        <span className="x-govuk-ui-change-summary-to">{value(to)}</span>
      </dd>
    </div>
  );
}
