"use client";

import { type CSSProperties, type PointerEvent, useCallback, useMemo, useRef } from "react";
import { type FigureProps, ScrollArea } from "x-govuk-ui";
import { CellFigure, FigureCard, heatKey, useHoverCard } from "./chart-frame";
import { extentOf, heatScale, niceScale } from "./chart-maths";
import { ChartFrame, type ChartLayout } from "./chart-parts";
import { type ChartLabels, plainIn, wordsOf } from "./chart-words";

export type CalendarHeatmapProps = Omit<FigureProps, "title" | "children"> &
  ChartLayout & {
    /** Each day's figure, by its date, as "2025-03-14". A day without one is hatched. */
    data: Readonly<Record<string, number>>;
    /** What a day's figure counts, such as "Licences sold", in its card and the table. */
    label: string;
    /** The first day shown, as "2025-01-01". By default, a year before the last. */
    start?: string;
    /**
     * The last day shown. By default, the latest day with a figure, or, with no figures, a year
     * after `start`. The calendar never reads the clock, so the server and the page draw the same
     * days.
     */
    end?: string;
    /** Writes a figure, such as "1.2k". By default, as the `labels`' language writes numbers. */
    format?: (value: number) => string;
    /** The range of figures the five shades divide. By default, it fits the figures. */
    domain?: readonly [number, number];
    /**
     * The calendar's point, in a sentence, for screen readers. Every day's figure is in a table
     * beneath, which anyone can open.
     */
    description: string;
    /**
     * The words the calendar writes itself, for another language. Its `locale` names the months and
     * days and writes the dates, such as "cy" for Welsh.
     */
    labels?: Partial<ChartLabels>;
  };

const DAY = 86_400_000;
/** A date as days since 1970, in UTC, so a change of the clocks never moves a day. */
const dayOf = (iso: string) => {
  const [year = 1970, month = 1, date = 1] = iso.split("-").map(Number);
  return Math.round(Date.UTC(year, month - 1, date) / DAY);
};
const isoOf = (day: number) => new Date(day * DAY).toISOString().slice(0, 10);
/** Monday is 0, as GOV.UK's weeks start on a Monday. */
const weekdayOf = (day: number) => (new Date(day * DAY).getUTCDay() + 6) % 7;
/** A week from a Monday, 1 January 2024, whose days name the days of every week. */
const MONDAY = Math.round(Date.UTC(2024, 0, 1) / DAY);

/**
 * The calendar's names and dates in a language. These are the months' short names, and the days'
 * names, short for the side and in full for the table. They also include a date as GOV.UK writes
 * one, "Friday 15 August 2025", with no comma after the day's name. They are made once for each
 * language.
 */
const calendars = new Map<string, ReturnType<typeof calendarIn>>();
function calendarIn(locale: string) {
  const options = { timeZone: "UTC" } as const;
  const month = new Intl.DateTimeFormat(locale, { ...options, month: "short" });
  const weekday = new Intl.DateTimeFormat(locale, { ...options, weekday: "long" });
  const short = new Intl.DateTimeFormat(locale, { ...options, weekday: "short" });
  const date = new Intl.DateTimeFormat(locale, {
    ...options,
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const week = Array.from({ length: 7 }, (_, index) => (MONDAY + index) * DAY);
  return {
    month: (time: number) => month.format(time),
    date: (time: number) => date.format(time),
    dateWithDay: (time: number) => `${weekday.format(time)} ${date.format(time)}`,
    weekdays: week.map((time) => weekday.format(time)),
    // Every other day is named down the side, because there is no space for more. These are Monday,
    // Wednesday and Friday.
    side: week.map((time, index) => (index % 2 === 0 && index < 6 ? short.format(time) : "")),
  };
}
const calendarFor = (locale: string) => {
  const known = calendars.get(locale) ?? calendarIn(locale);
  calendars.set(locale, known);
  return known;
};

/**
 * A figure for each day, as a year of weeks side by side, each day shaded by its figure. The
 * Analysis Function suggests this for a time series with a pattern by the day of the week. Months
 * are named along the top and days of the week down the side. The five shades are named in a key.
 *
 * Moving over a day shows its date and figure in a card. Screen readers hear the calendar's point
 * in a sentence. Every day's figure is in a table beneath, set out as the calendar is, with a row
 * for each week. On a narrow screen, the weeks scroll sideways.
 */
export function CalendarHeatmap({
  data,
  label,
  start,
  end,
  format: ownFormat,
  domain,
  description,
  labels,
  className = "",
  ...props
}: CalendarHeatmapProps) {
  const words = wordsOf(labels);
  const format = ownFormat ?? plainIn(words.locale);
  const names = calendarFor(words.locale);
  const dates = Object.keys(data).sort();
  // The days shown, up to the end given, or the latest figure, or a year from the start. With none
  // of these, there are no days to show.
  const latest = dates.at(-1);
  let last = Number.NaN;
  if (end) last = dayOf(end);
  else if (latest) last = dayOf(latest);
  else if (start) last = dayOf(start) + 364;
  const first = start ? dayOf(start) : last - 364;
  const counted = Number.isFinite(last) && last >= first;
  const monday = counted ? first - weekdayOf(first) : 0;
  const weeks = counted ? Math.floor((last - monday) / 7) + 1 : 0;
  const days = counted ? Array.from({ length: last - first + 1 }, (_, index) => first + index) : [];
  const [low, high] =
    domain ??
    niceScale(
      ...(extentOf([
        0,
        ...dates
          .filter((date) => dayOf(date) >= first && dayOf(date) <= last)
          .map((date) => data[date] ?? 0),
      ]) ?? [0, 1]),
    ).domain;
  const heat = heatScale([low, high], format, words.range);

  // Each month is named over the week its first day falls in, unless the next month is too close.
  const months = days
    .filter((day, index) => index === 0 || new Date(day * DAY).getUTCDate() === 1)
    .map((day) => ({ day, week: Math.floor((day - monday) / 7) }))
    .map((month, index, all) => ({ ...month, until: all[index + 1]?.week ?? weeks }))
    .filter((month) => month.until - month.week >= 3);

  const missing = days.some((day) => data[isoOf(day)] === undefined);

  return (
    <ChartFrame
      {...props}
      className={`x-govuk-ui-calendar-heatmap ${className}`.trim()}
      description={description}
      parts={{
        summary: words.showTable,
        key: heatKey(heat, missing, words.noFigure),
        // The table is set out as the calendar is, with a row for each week and a column for each
        // day.
        tables: [
          {
            head: [words.weekBeginning, ...names.weekdays],
            rows: Array.from({ length: weeks }, (_, week) => {
              const from = monday + week * 7;
              return {
                key: String(from),
                name: names.date(from * DAY),
                cells: names.weekdays.map((_, weekday) => {
                  const day = from + weekday;
                  if (day < first || day > last) return "";
                  return (
                    <CellFigure
                      key={day}
                      value={data[isoOf(day)]}
                      format={format}
                      missing={words.noFigure}
                    />
                  );
                }),
              };
            }),
          },
        ],
        // An element, so each ChartPlot that shows it has a drawing, and a card, of its own.
        plot: (
          <CalendarDrawing
            data={data}
            label={label}
            first={first}
            last={last}
            monday={monday}
            weeks={weeks}
            months={months}
            domain={[low, high]}
            format={format}
            words={words}
            description={description}
            scrollLabel={typeof props.title === "string" ? props.title : description}
          />
        ),
      }}
    />
  );
}

/**
 * The calendar's weeks of days, and the card for the day under the pointer. The days are made once
 * for their figures, not again as the pointer moves over them. The stylesheet outlines the day
 * under the pointer, and only the card follows the pointer. Between days, such as in the gaps of
 * the grid, the card stays, so the pointer can reach it.
 * @internal
 */
function CalendarDrawing({
  data,
  label,
  first,
  last,
  monday,
  weeks,
  months,
  domain: [low, high],
  format,
  words,
  description,
  scrollLabel,
}: {
  data: Readonly<Record<string, number>>;
  label: string;
  first: number;
  last: number;
  monday: number;
  weeks: number;
  months: readonly { day: number; week: number; until: number }[];
  domain: readonly [number, number];
  format: (value: number) => string;
  words: ChartLabels;
  description: string;
  scrollLabel: string;
}) {
  const names = calendarFor(words.locale);
  const plot = useRef<HTMLDivElement>(null);
  const { shown, show, hide, card } = useHoverCard(
    useCallback(() => plot.current?.clientWidth ?? 0, []),
  );
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const cell = (event.target as Element).closest<HTMLElement>("[data-date]");
    const box = plot.current?.getBoundingClientRect();
    if (!cell || !box) return;
    const at = cell.getBoundingClientRect();
    show(cell.dataset.date ?? "", at.left + at.width / 2 - box.left, at.top - box.top);
  };
  const cells = useMemo(() => {
    const step = heatScale([low, high], String, String).step;
    const made = [];
    for (let day = first; day <= last; day++) {
      const iso = isoOf(day);
      const value = data[iso];
      made.push(
        <span
          key={day}
          className="x-govuk-ui-calendar-heatmap-day x-govuk-ui-chart-heat"
          data-date={iso}
          data-step={value === undefined ? undefined : step(value)}
          style={{
            gridColumn: Math.floor((day - monday) / 7) + 2,
            gridRow: weekdayOf(day) + 2,
          }}
        />,
      );
    }
    return made;
  }, [first, last, monday, data, low, high]);
  return (
    <div className="x-govuk-ui-calendar-heatmap-plot" ref={plot} onPointerLeave={hide}>
      <ScrollArea
        orientation="horizontal"
        label={scrollLabel}
        className="x-govuk-ui-calendar-heatmap-scroll"
      >
        {/* The days are a picture for screen readers, described in a sentence. The table has
            every figure. */}
        <div
          className="x-govuk-ui-calendar-heatmap-grid"
          role="img"
          aria-label={description}
          style={{ "--x-govuk-ui-calendar-heatmap-weeks": weeks } as CSSProperties}
          onPointerMove={point}
        >
          {months.map((month) => (
            <span
              key={month.day}
              className="x-govuk-ui-calendar-heatmap-month"
              style={{ gridColumn: `${month.week + 2} / ${month.until + 2}` }}
            >
              {names.month(month.day * DAY)}
            </span>
          ))}
          {names.side.map((name, index) =>
            name ? (
              <span
                key={name}
                className="x-govuk-ui-calendar-heatmap-weekday"
                style={{ gridRow: index + 2 }}
              >
                {name}
              </span>
            ) : null,
          )}
          {cells}
        </div>
      </ScrollArea>
      {shown && (
        <FigureCard
          place={shown}
          card={card}
          heading={names.dateWithDay(dayOf(shown.id) * DAY)}
          label={label}
          value={data[shown.id]}
          format={format}
          missing={words.noFigure}
        />
      )}
    </div>
  );
}
