"use client";

import { type ComponentPropsWithRef, useSyncExternalStore } from "react";
import { formatDateTime } from "./helpers";
import { useLabels } from "./labels";

export type RelativeTimeProps = Omit<ComponentPropsWithRef<"time">, "dateTime" | "children"> & {
  /** When it happened, or will happen. */
  date: Date;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<RelativeTimeLabels>;
};

/** The words Relative time writes, which a LabelsProvider or its `labels` can change. */
export type RelativeTimeLabels = {
  /** A time from now, such as 3 days ago or in 2 hours. */
  relative: (date: Date, now: Date) => string;
  /** The exact time, shown under the pointer, such as 15 March 2026 at 4:27pm. */
  exact: (date: Date) => string;
  /**
   * The time before the page knows the time where it is shown, such as 15 March 2026. A page
   * rendered on a server shows it until the page is hydrated, so it must read the same on the
   * server and in the browser, whatever the time zone of each.
   */
  unknown: (date: Date) => string;
};

const MINUTE = 60_000;
const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * MINUTE],
  ["month", 30 * 24 * 60 * MINUTE],
  ["week", 7 * 24 * 60 * MINUTE],
  ["day", 24 * 60 * MINUTE],
  ["hour", 60 * MINUTE],
  ["minute", MINUTE],
];
// Always in figures, such as 1 day ago, never yesterday. A gap rounded to days is not a calendar
// day, so a word such as yesterday or tomorrow would sometimes name the wrong one.
const english = new Intl.RelativeTimeFormat("en-GB", { numeric: "always" });

export const defaultRelativeTimeLabels: RelativeTimeLabels = {
  // Under a minute either way is now. Each larger gap is rounded to its largest whole unit, so
  // 36 hours is 2 days ago and 10 days is 1 week ago.
  relative: (date, now) => {
    const gap = date.getTime() - now.getTime();
    for (const [unit, size] of units) {
      if (Math.abs(gap) >= size)
        return english.format(Math.sign(gap) * Math.round(Math.abs(gap) / size), unit);
    }
    return "just now";
  },
  exact: formatDateTime,
  // In UTC, so a server and a browser in different time zones write the same date.
  unknown: (date) =>
    date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
};

// One clock serves every Relative time on the page. It ticks once a minute, on the minute, only
// while one is shown, so a page with hundreds of them still runs a single timer, and each one
// renders again only when the minute changes.
const minute = () => Math.floor(Date.now() / MINUTE);
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
const tick = () => {
  for (const listener of listeners) listener();
  timer = setTimeout(tick, MINUTE - (Date.now() % MINUTE));
};
const subscribe = (listener: () => void) => {
  if (listeners.size === 0) timer = setTimeout(tick, MINUTE - (Date.now() % MINUTE));
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) clearTimeout(timer);
  };
};

/**
 * A time written as its distance from now, such as 3 days ago or in 2 hours, which keeps itself up
 * to date. The exact time shows under the pointer, and the `time` element carries it for machines.
 * Neither reaches users of a keyboard, a touch screen or a screen reader, so where users must know
 * the exact time, such as a deadline, write it too. Rendered on a server, it writes the date
 * instead, because the server cannot know the time where the page is read, and it becomes the
 * distance from now once the page is hydrated.
 */
export function RelativeTime({
  date,
  className = "",
  labels: ownLabels,
  ...props
}: RelativeTimeProps) {
  const labels = useLabels("relativeTime", defaultRelativeTimeLabels, ownLabels);
  const now = useSyncExternalStore(subscribe, minute, () => null);
  return (
    // The exact time is local, so it comes only once the page is in the browser.
    <time
      title={now === null ? undefined : labels.exact(date)}
      {...props}
      dateTime={date.toISOString()}
      className={`x-govuk-ui-relative-time ${className}`.trim()}
    >
      {now === null ? labels.unknown(date) : labels.relative(date, new Date(now * MINUTE))}
    </time>
  );
}
