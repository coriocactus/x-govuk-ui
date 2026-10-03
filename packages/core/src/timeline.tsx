"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import { formatDateTime } from "./helpers";
import { duration, useMotionTiming } from "./motion";
import { useMergedRef } from "./refs";

const HeadingLevel = createContext<2 | 3 | 4 | 5 | 6>(3);

export type TimelineProps = ComponentPropsWithRef<"ol"> & {
  /** The events, as `TimelineItem` parts, the latest first. */
  children: ReactNode;
  /** The level of each event's heading. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Names the list for screen readers, such as "History of your application". */
  label?: string;
};

/**
 * The history of a case or a thing, as the Home Office's timeline shows it. Events are in order of
 * time, the latest first, along a rail. Each event's heading branches off the rail, the latest in
 * brand blue. An event added while the timeline is on screen opens into place at once, as the
 * others move down, and its branch grows from the rail.
 */
export function Timeline({
  children,
  headingLevel = 3,
  label,
  className = "",
  ref,
  ...props
}: TimelineProps) {
  const timing = useMotionTiming();
  const items = Children.toArray(children).filter(isValidElement);
  // The events present from the start show without animation. Only later events animate in.
  const first = useRef<Set<unknown> | null>(null);
  if (first.current === null) first.current = new Set(items.map((item) => item.key));
  const arrived = (key: unknown) => !first.current?.has(key);
  // The rail is one unbroken bar from the first event's branch to the last's. Its end follows
  // the last event as events arrive and the list changes height.
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const place = () => {
      const last = element.lastElementChild;
      const end = last instanceof HTMLElement ? last.offsetTop : 0;
      element.style.setProperty("--x-govuk-ui-timeline-rail", `${end}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const mergedRef = useMergedRef(list, ref);
  return (
    <HeadingLevel value={headingLevel}>
      <ol
        {...props}
        ref={mergedRef}
        className={`x-govuk-ui-timeline ${className}`.trim()}
        aria-label={label}
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.key}
              className="x-govuk-ui-timeline-item"
              data-entered={arrived(item.key) || undefined}
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={timing.ease(duration.slow)}
              data-sound-enter={arrived(item.key) ? "notification" : undefined}
            >
              {item}
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </HeadingLevel>
  );
}

export type TimelineItemProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  /** What happened, such as Application submitted. */
  title: ReactNode;
  /** Who or what did it, such as the Passport Office. */
  by?: ReactNode;
  /** When it happened. It is written as GOV.UK writes dates and times. */
  date: Date;
  /** More about what happened. */
  children?: ReactNode;
  /** Things to do about it, such as a link to a letter. */
  actions?: ReactNode;
};

/** One event, with its heading, who did it, when, and what it means. */
export function TimelineItem({
  title,
  by,
  date,
  children,
  actions,
  className = "",
  ...props
}: TimelineItemProps) {
  const level = useContext(HeadingLevel);
  const Heading = `h${level}` as const;
  return (
    <div {...props} className={`x-govuk-ui-timeline-event ${className}`.trim()}>
      <Heading className="x-govuk-ui-timeline-title">{title}</Heading>
      {by && <p className="x-govuk-ui-timeline-by">by {by}</p>}
      <p className="x-govuk-ui-timeline-date">
        <time dateTime={date.toISOString()}>{formatDateTime(date)}</time>
      </p>
      {children && <div className="x-govuk-ui-timeline-description">{children}</div>}
      {actions && <div className="x-govuk-ui-timeline-actions">{actions}</div>}
    </div>
  );
}
