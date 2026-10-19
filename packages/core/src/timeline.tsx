"use client";

/*
 * Timeline, with three parts. Timeline draws the list and its rail. Each TimelineItem is one event.
 * TimelineMore is a button at the foot that asks the service for earlier events. Timeline reads its
 * children, as Select reads its items. It takes each TimelineItem's `highlighted` to colour the
 * rail, and it sets TimelineMore apart from the list of events.
 */

import { AnimatePresence, motion } from "motion/react";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  isValidElement,
  type Key,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import { Button, type ButtonProps } from "./button";
import { formatDateTime } from "./helpers";
import { useLabels } from "./labels";
import { duration, useMotionTiming } from "./motion";

const HeadingLevel = createContext<2 | 3 | 4 | 5 | 6>(3);

/** Tells the Timeline that users pressed its TimelineMore. @internal */
const MoreContext = createContext<(() => void) | null>(null);

/**
 * How an event came into the list. The events there at first show at once. An event that arrives
 * above them is new, so its tick grows and it plays a sound. An event added beneath them is older
 * history that users asked for, so it opens quietly. @internal
 */
type Arrival = "first" | "new" | "older";

export type TimelineProps = ComponentPropsWithRef<"ol"> & {
  /**
   * The events, as `TimelineItem` parts, the latest first, each with a stable `key`, such as its
   * id. A `TimelineMore` among them goes at the foot, beneath the list. Timeline reads its children
   * as they are given, so give each part directly, not in a fragment or a component of your own.
   */
  children: ReactNode;
  /** The level of each event's heading. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Names the list for screen readers, such as "History of your application". */
  label?: string;
};

/**
 * The history of a case or a thing, as the Home Office's timeline shows it. Events are in order of
 * time, the latest first, along a rail. A tick branches off the rail to each event's heading.
 *
 * Highlighted events are in brand blue, and so is the rail between highlighted events next to each
 * other. Where they meet an event that is not, blue dashes run on over the grey rail for about half
 * the way. Give `highlighted` to any TimelineItem, and only the events you mark are highlighted.
 * Give it to none, and the latest event is highlighted.
 *
 * An event added above the others while the timeline is on screen opens into place, and its tick
 * grows from the rail. It plays the notification sound. Events added beneath the others are earlier
 * history, so they open quietly.
 *
 * Timeline's `className` and `style` go on its box, around the list and any TimelineMore. Every
 * other prop, including `ref`, goes on the list.
 */
export function Timeline({
  children,
  headingLevel = 3,
  label,
  className = "",
  style,
  ...props
}: TimelineProps) {
  const timing = useMotionTiming();
  const parts = Children.toArray(children).filter(isValidElement);
  const items = parts.filter((part) => part.type !== TimelineMore);
  const more = parts.filter((part) => part.type === TimelineMore);
  const loading = more.some((part) => (part.props as TimelineMoreProps).loading === true);
  const { arrivals, firstEarlier } = useArrivals(items);
  // With no event marked, the latest is highlighted, as the place the history has reached.
  const marks = items.map((item) => (item.props as { highlighted?: boolean }).highlighted);
  const marked = marks.some((mark) => mark !== undefined);
  const foot = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<Key | null, HTMLLIElement>());
  // Set when users press TimelineMore. The first commit after the press that is not loading
  // answers it, with earlier events or, if the load failed or found none, without them.
  const wanted = useRef(false);
  const want = useCallback(() => {
    wanted.current = true;
  }, []);
  useLayoutEffect(() => {
    if (!wanted.current) return;
    if (firstEarlier === undefined) {
      if (!loading) wanted.current = false;
      return;
    }
    wanted.current = false;
    const title = nodes.current
      .get(firstEarlier)
      ?.querySelector<HTMLElement>(".x-govuk-ui-timeline-title");
    if (!title) return;
    // Focus moves only from the button, or from nowhere once the last earlier events take the
    // button away. Users who moved on while the events loaded stay where they are.
    const page = title.ownerDocument;
    const active = page.activeElement;
    if (active && active !== page.body && !foot.current?.contains(active)) return;
    title.tabIndex = -1;
    // The event is still opening, and its item clips it. Scrolling to the heading would scroll the
    // item itself.
    title.focus({ preventScroll: true });
  });
  return (
    <HeadingLevel value={headingLevel}>
      <MoreContext value={want}>
        <div className={`x-govuk-ui-timeline ${className}`.trim()} style={style}>
          <ol aria-label={label} {...props} className="x-govuk-ui-timeline-list">
            <AnimatePresence initial={false}>
              {items.map((item, index) => {
                const arrival = arrivals[index];
                const highlighted = marked ? marks[index] === true : index === 0;
                return (
                  <motion.li
                    key={item.key}
                    ref={(node: HTMLLIElement | null) => {
                      if (node) nodes.current.set(item.key, node);
                      else nodes.current.delete(item.key);
                    }}
                    className="x-govuk-ui-timeline-item"
                    data-highlighted={highlighted || undefined}
                    data-entered={arrival === "new" || undefined}
                    data-sound-enter={arrival === "new" ? "notification" : undefined}
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={timing.ease(duration.slow)}
                  >
                    {item}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ol>
          {more.length > 0 && (
            <div ref={foot} className="x-govuk-ui-timeline-foot">
              {more}
            </div>
          )}
        </div>
      </MoreContext>
    </HeadingLevel>
  );
}

/**
 * How each event came into the list, and the key of the first earlier event this render adds, if
 * any. An event keeps how it arrived while it stays in the list. A new event is one with an event
 * already shown beneath it.
 *
 * Each render reads what the last commit showed, and writes nothing. Only a commit records what it
 * showed. A render that React throws away therefore leaves no trace. @internal
 */
function useArrivals(items: ReactElement[]) {
  const shown = useRef<Map<Key | null, Arrival> | null>(null);
  const before = shown.current;
  let lowest = -1;
  items.forEach((item, index) => {
    if (before?.has(item.key)) lowest = index;
  });
  const arrivals = items.map(
    (item, index): Arrival =>
      before === null ? "first" : (before.get(item.key) ?? (index < lowest ? "new" : "older")),
  );
  const firstEarlier = items.find(
    (item, index) => arrivals[index] === "older" && before?.has(item.key) === false,
  )?.key;
  useLayoutEffect(() => {
    shown.current = new Map(items.map((item, index) => [item.key, arrivals[index] ?? "first"]));
  });
  return { arrivals, firstEarlier };
}

/** The words a Timeline's parts write, which a LabelsProvider or their `labels` can change. */
export type TimelineLabels = {
  /** Says who or what did it, after the date. */
  by: (who: ReactNode) => ReactNode;
  /** Writes when it happened. By default, as GOV.UK writes dates and times. */
  date: (date: Date) => string;
  /**
   * Tells screen readers that an event is highlighted, before its title, as the brand blue tells
   * sighted users. Say what the highlight means in your service, such as New.
   */
  highlighted: string;
  /** Names TimelineMore's button, when it is given no words of its own. */
  more: string;
};

export const defaultTimelineLabels: TimelineLabels = {
  by: (who) => <>by {who}</>,
  date: formatDateTime,
  highlighted: "New",
  more: "Show earlier events",
};

export type TimelineItemProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  /** What happened, such as Application submitted. */
  title: ReactNode;
  /** Who or what did it, such as the Passport Office. */
  by?: ReactNode;
  /** When it happened, written by its `date` label. */
  date: Date;
  /**
   * Highlights the event in brand blue, such as one that is new since users last looked. Screen
   * readers hear the `highlighted` label before its title. The Timeline reads this prop, so give it
   * to the TimelineItem itself, not to a component of your own around it.
   */
  highlighted?: boolean;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<TimelineLabels>;
  /** More about what happened. */
  children?: ReactNode;
  /** Things to do about it, such as a link to a letter. */
  actions?: ReactNode;
};

/** One event, with its heading, when it happened and who did it, and what it means. */
export function TimelineItem({
  title,
  by,
  date,
  highlighted,
  children,
  actions,
  className = "",
  labels: ownLabels,
  ...props
}: TimelineItemProps) {
  const labels = useLabels("timeline", defaultTimelineLabels, ownLabels);
  const level = useContext(HeadingLevel);
  const Heading = `h${level}` as const;
  return (
    <div {...props} className={`x-govuk-ui-timeline-event ${className}`.trim()}>
      <Heading className="x-govuk-ui-timeline-title">
        {highlighted && <span className="x-govuk-ui-visually-hidden">{labels.highlighted}: </span>}
        {title}
      </Heading>
      <p className="x-govuk-ui-timeline-meta">
        <time className="x-govuk-ui-timeline-date" dateTime={date.toISOString()}>
          {labels.date(date)}
        </time>
        {by && (
          <>
            {" "}
            <span className="x-govuk-ui-timeline-by">{labels.by(by)}</span>
          </>
        )}
      </p>
      {children && <div className="x-govuk-ui-timeline-description">{children}</div>}
      {actions && <div className="x-govuk-ui-timeline-actions">{actions}</div>}
    </div>
  );
}

export type TimelineMoreProps = Omit<ButtonProps, "variant" | "size" | "render"> & {
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<TimelineLabels>;
};

/**
 * A button at the foot of a Timeline, for earlier events. Give it to the Timeline directly, among
 * its events. In its `onClick`, add the earlier events beneath the others, such as by showing more
 * of a list already loaded, or by asking a server. Set `loading` while they load, and clear it in
 * the update that adds them. The button keeps focus while they load. Focus then moves to the first
 * earlier event, unless users have moved it elsewhere. Leave the button out when there are no
 * earlier events.
 */
export function TimelineMore({
  children,
  labels: ownLabels,
  className = "",
  onClick,
  ...props
}: TimelineMoreProps) {
  const labels = useLabels("timeline", defaultTimelineLabels, ownLabels);
  const want = useContext(MoreContext);
  return (
    <Button
      {...props}
      variant="secondary"
      size="small"
      className={`x-govuk-ui-timeline-more ${className}`.trim()}
      onClick={(event) => {
        want?.();
        onClick?.(event);
      }}
    >
      {children ?? labels.more}
    </Button>
  );
}
