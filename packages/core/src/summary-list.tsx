"use client";

import {
  type ComponentPropsWithRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";
import { Anchor, type AnchorProps } from "./anchor";
import { useMotionTiming } from "./motion";

export type SummaryListProps = ComponentPropsWithRef<"dl"> & {
  /** Leaves out the lines between rows, as for a short list inside other content. */
  noBorder?: boolean;
};

/**
 * Pairs of keys and values, such as a user's answers on a check answers page. Compose it from
 * `SummaryListRow` parts. Keys, values and actions line up in columns across every row, and stack
 * when the list is narrow. Put it in a `SummaryCard` to summarise one of several things.
 */
export function SummaryList({ noBorder = false, className = "", ...props }: SummaryListProps) {
  return (
    <dl
      {...props}
      className={`x-govuk-ui-summary-list ${className}`.trim()}
      data-no-border={noBorder || undefined}
    />
  );
}

export type SummaryListRowProps = ComponentPropsWithRef<"div"> & {
  /** The key, such as Name. It is `label` because React keeps `key` for itself. */
  label: ReactNode;
  /** The value. When its text changes, it glows for a moment, so users see what they changed. */
  children: ReactNode;
  /** `SummaryListAction` parts, such as Change. */
  actions?: ReactNode;
};

/** One row. Rows without actions keep the actions column, so the values still line up. */
export function SummaryListRow({
  label,
  children,
  actions,
  className = "",
  ...props
}: SummaryListRowProps) {
  const value = useRef<HTMLElement>(null);
  const previous = useRef<string | null>(null);
  const { reduced } = useMotionTiming();
  // biome-ignore lint/correctness/useExhaustiveDependencies: The value's text is what changes.
  useLayoutEffect(() => {
    const element = value.current;
    if (!element) return;
    const text = element.textContent;
    if (previous.current !== null && previous.current !== text && !reduced)
      element.animate(
        [
          { backgroundColor: "var(--x-govuk-ui-summary-changed)" },
          { backgroundColor: "transparent" },
        ],
        { duration: 1600, easing: "ease-out" },
      );
    previous.current = text;
  }, [children]);
  return (
    <div {...props} className={`x-govuk-ui-summary-list-row ${className}`.trim()}>
      <dt className="x-govuk-ui-summary-list-key">{label}</dt>
      <dd ref={value} className="x-govuk-ui-summary-list-value">
        {children}
      </dd>
      <dd className="x-govuk-ui-summary-list-actions">{actions}</dd>
    </div>
  );
}

// It renders a button or a link, so it takes the attributes they share.
export type SummaryListActionProps = Omit<HTMLAttributes<HTMLElement>, "onClick"> & {
  href?: string;
  /** Without an href, the action is a button, such as one that opens a Dialog to edit the value. */
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  /** What the action does. */
  children?: ReactNode;
  /** Says what it changes, for screen readers, such as "name" for "Change name". */
  hiddenText?: string;
  /** Renders a router's link instead of an anchor. */
  render?: AnchorProps["render"];
};

/** An action for a row or a card, such as Change or Remove. */
export function SummaryListAction({
  href,
  onClick,
  children = "Change",
  hiddenText,
  render,
  className = "",
  ...props
}: SummaryListActionProps) {
  const content = (
    <>
      {children}
      {hiddenText && <span className="x-govuk-ui-visually-hidden"> {hiddenText}</span>}
    </>
  );
  if (href === undefined && !render)
    return (
      <button
        {...props}
        type="button"
        className={`x-govuk-ui-summary-list-action ${className}`.trim()}
        onClick={onClick}
      >
        {content}
      </button>
    );
  return (
    <Anchor
      {...props}
      render={render}
      href={href}
      onClick={onClick}
      className={`x-govuk-ui-summary-list-action ${className}`.trim()}
    >
      {content}
    </Anchor>
  );
}

export type SummaryCardProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  title: ReactNode;
  /** The heading's level, to fit the page's outline. */
  headingLevel?: 2 | 3 | 4;
  /** `SummaryListAction` parts for the whole card, such as Delete. */
  actions?: ReactNode;
  /** A `SummaryList`. */
  children: ReactNode;
};

/**
 * A summary list under a tinted title band, for one of several things, such as each university.
 */
export function SummaryCard({
  title,
  headingLevel = 2,
  actions,
  children,
  className = "",
  ...props
}: SummaryCardProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section {...props} className={`x-govuk-ui-summary-card ${className}`.trim()}>
      <div className="x-govuk-ui-summary-card-title-band">
        <Heading className="x-govuk-ui-summary-card-title">{title}</Heading>
        {actions && <div className="x-govuk-ui-summary-card-actions">{actions}</div>}
      </div>
      <div className="x-govuk-ui-summary-card-content">{children}</div>
    </section>
  );
}
