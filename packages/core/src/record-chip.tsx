"use client";

import { useRender } from "@base-ui/react/use-render";
import { type ComponentPropsWithRef, createContext, type ReactNode, useContext } from "react";
import { useLabels } from "./labels";

// The anchor's own `media` attribute names a media query, which a chip has no use for.
export type RecordChipProps = Omit<ComponentPropsWithRef<"a">, "media"> & {
  /**
   * Sits before the label, such as an Avatar, whose size the chip sets from its text. It is hidden
   * from screen readers, because the label already names the thing.
   */
  media?: ReactNode;
  /** Renders a router's link in place of the anchor. */
  render?: useRender.RenderProp;
};

/** Whether a chip is in a RecordChipGroup's list, where it is an item of its own. */
const InGroupContext = createContext(false);

/**
 * A reference to one thing, such as a company or a person, as a pill with its avatar or logo and
 * its name. Given `href` or `render`, it is a link to the thing. Otherwise it only names it. Put
 * several in a `RecordChipGroup`.
 *
 * Use it for a thing that another record refers to, such as a card's owner. Give the thing a card
 * or a page is about a title instead, whose words can wrap as a heading's do, because a long name
 * wraps in a chip too, and a pill of two lines reads as a box.
 */
export function RecordChip({ media, render, className = "", children, ...props }: RecordChipProps) {
  const inGroup = useContext(InGroupContext);
  const link = props.href !== undefined || render !== undefined;
  const chip = useRender({
    defaultTagName: link ? "a" : "span",
    render,
    props: {
      ...props,
      className: `x-govuk-ui-record-chip ${className}`.trim(),
      "data-link": link || undefined,
      children: (
        <>
          {media && (
            <span className="x-govuk-ui-record-chip-media" aria-hidden="true">
              {media}
            </span>
          )}
          <span className="x-govuk-ui-record-chip-label">{children}</span>
        </>
      ),
    },
  });
  return inGroup ? <li>{chip}</li> : chip;
}

export type RecordChipGroupProps = ComponentPropsWithRef<"ul"> & {
  /** The chips, as RecordChip parts, which a component of your own may draw. */
  children?: ReactNode;
  /** Things beyond those shown, counted in a last chip, such as +3. */
  more?: number;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<RecordChipGroupLabels>;
};

/** The words RecordChipGroup writes, which a LabelsProvider or its `labels` can change. */
export type RecordChipGroupLabels = {
  /** Says, for screen readers, how many more there are than the group shows. */
  more: (count: number) => string;
};

export const defaultRecordChipGroupLabels: RecordChipGroupLabels = {
  more: (count) => `and ${count} more`,
};

/**
 * Chips in a list, which wraps onto as many lines as it needs, with a count of any more. Each chip
 * is an item of the list, wherever it is drawn, such as in a component of a service's own. The
 * count only counts. Put the rest where users can reach them, such as on the page the chips belong
 * to.
 */
export function RecordChipGroup({
  more = 0,
  className = "",
  children,
  labels: ownLabels,
  ...props
}: RecordChipGroupProps) {
  const labels = useLabels("recordChipGroup", defaultRecordChipGroupLabels, ownLabels);
  return (
    <ul {...props} className={`x-govuk-ui-record-chip-group ${className}`.trim()}>
      <InGroupContext value={true}>{children}</InGroupContext>
      {more > 0 && (
        <li>
          <span className="x-govuk-ui-record-chip x-govuk-ui-record-chip-more">
            <span aria-hidden="true">+{more}</span>
            <span className="x-govuk-ui-visually-hidden">{labels.more(more)}</span>
          </span>
        </li>
      )}
    </ul>
  );
}
