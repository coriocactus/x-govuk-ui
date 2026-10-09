"use client";

import {
  type ComponentPropsWithRef,
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { directionOf } from "./helpers";
import { Select, SelectItem } from "./select";

export type DateRange = { from: Date | null; to: Date | null };

// The calendar is a section, which takes the rest of the props.
type CalendarBase = Omit<ComponentPropsWithRef<"section">, "defaultValue"> & {
  /** How many months show side by side. */
  months?: 1 | 2;
  /** The earliest and latest dates that can be chosen. */
  min?: Date;
  max?: Date;
  /** Dates that cannot be chosen, such as weekends. */
  isDateDisabled?: (date: Date) => boolean;
  /** The language for the names of months and days, such as "en-GB" or "cy". */
  locale?: string;
  /** The first day of the week, 1 for Monday, as in the UK, or 0 for Sunday. */
  weekStartsOn?: 0 | 1;
  /** The month shown first when it opens. By default, the chosen date's month, or today's. */
  defaultMonth?: Date;
  /** Names the calendar for screen readers. */
  label?: string;
  /**
   * Shows the month and year as Selects, so users can go straight to another month or year, as
   * for a date of birth. With two months, only the first has them.
   */
  monthYearSelects?: boolean;
  /**
   * The years the year's Select offers. By default, from the year of `min`, or a hundred years
   * ago, to the year of `max`, or ten years ahead.
   */
  years?: readonly number[];
};

export type CalendarProps = CalendarBase &
  (
    | {
        /** One date. */
        mode?: "single";
        value?: Date | null;
        defaultValue?: Date | null;
        onValueChange?: (value: Date | null) => void;
      }
    | {
        /** A first and last date, such as the dates of a stay. */
        mode: "range";
        value?: DateRange;
        defaultValue?: DateRange;
        onValueChange?: (value: DateRange) => void;
      }
    | {
        /** Any number of dates. */
        mode: "multiple";
        value?: Date[];
        defaultValue?: Date[];
        onValueChange?: (value: Date[]) => void;
      }
  );

const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const key = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const same = (a: Date | null | undefined, b: Date | null | undefined) =>
  Boolean(a && b && key(a) === key(b));
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
/**
 * The same day in another month, kept within that month, so 31 January plus a month is 28 February.
 */
const addMonths = (date: Date, months: number) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), last));
};
const monthNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth();

/** The six weeks that contain a month, with null for the days outside it. */
function weeksOf(month: Date, weekStartsOn: number) {
  const first = startOfMonth(month);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const length = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = week * 7 + weekday - offset + 1;
      return date >= 1 && date <= length
        ? new Date(month.getFullYear(), month.getMonth(), date)
        : null;
    }),
  );
}

/**
 * A month of dates, from which users choose one date, a range or several dates. The arrow keys
 * move by a day or a week, Page Up and Page Down by a month, and Home and End to the ends of the
 * week. A chosen date's fill grows into place, and a range fills the days between its ends. The
 * month slides in the direction it turns. Date input opens a Calendar from its button.
 */
export function Calendar(props: CalendarProps) {
  const {
    months = 1,
    min,
    max,
    isDateDisabled,
    locale = "en-GB",
    weekStartsOn = 1,
    defaultMonth,
    label = "Choose a date",
    monthYearSelects = true,
    years: ownYears,
    className = "",
    mode: _mode,
    value: _value,
    defaultValue: _defaultValue,
    onValueChange: _onValueChange,
    ...rest
  } = props;
  const mode = props.mode ?? "single";
  const today = day(new Date());

  // Every mode is kept as a list of dates, with one date, the two ends of a range, or many dates.
  const listOf = (key: "value" | "defaultValue"): (Date | null)[] => {
    switch (props.mode) {
      case "range": {
        const range = props[key];
        return [range?.from ?? null, range?.to ?? null];
      }
      case "multiple":
        return props[key] ?? [];
      default: {
        const date = props[key];
        return date ? [date] : [];
      }
    }
  };
  const [own, setOwn] = useState(() => listOf("defaultValue"));
  const selected = props.value === undefined ? own : listOf("value");
  const anchor = selected.find(Boolean) ?? null;

  const [month, setMonth] = useState(() => startOfMonth(defaultMonth ?? anchor ?? today));
  const [focused, setFocused] = useState<Date>(() => anchor ?? today);
  const [direction, setDirection] = useState(0);
  const [hovered, setHovered] = useState<Date | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const keyboardMoved = useRef(false);
  const id = useId();

  const visible = Array.from({ length: months }, (_, index) => addMonths(month, index));
  const isDisabled = (date: Date) =>
    Boolean((min && date < day(min)) || (max && date > day(max)) || isDateDisabled?.(date));

  const turn = (by: number) => {
    setDirection(Math.sign(by));
    setMonth((current) => addMonths(current, by));
  };
  // A month or year chosen from the Selects, kept between the earliest and latest months.
  const jump = (target: Date) => {
    let to = target;
    if (min && to < startOfMonth(min)) to = startOfMonth(min);
    if (max && to > startOfMonth(max)) to = startOfMonth(max);
    const by = monthsBetween(month, to);
    if (by) turn(by);
  };
  const thisYear = today.getFullYear();
  const years = useMemo(() => {
    if (ownYears) return ownYears;
    const first = min?.getFullYear() ?? thisYear - 100;
    const last = max?.getFullYear() ?? thisYear + 10;
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  }, [ownYears, min, max, thisYear]);

  const commit = (list: (Date | null)[]) => {
    if (props.value === undefined) setOwn(list);
    switch (props.mode) {
      case "range":
        props.onValueChange?.({ from: list[0] ?? null, to: list[1] ?? null });
        break;
      case "multiple":
        props.onValueChange?.(list.filter((date): date is Date => Boolean(date)));
        break;
      default:
        props.onValueChange?.(list[0] ?? null);
    }
  };

  const choose = (date: Date) => {
    if (isDisabled(date)) return;
    setFocused(date);
    if (mode === "multiple") {
      const has = selected.some((each) => same(each, date));
      return commit(has ? selected.filter((each) => !same(each, date)) : [...selected, date]);
    }
    if (mode === "range") {
      const [from, to] = selected;
      // A first press starts a range, and a second ends it. A press before the start starts again.
      if (!from || to || date < from) return commit([date, null]);
      return commit([from, date]);
    }
    commit(same(selected[0], date) ? [] : [date]);
  };

  // A keyboard move can go outside the months on show. The months then turn to follow it, and
  // focus follows.
  const move = (date: Date) => {
    keyboardMoved.current = true;
    setFocused(date);
    const first = visible[0]!;
    const offset = monthsBetween(first, date);
    if (offset < 0 || offset >= months) turn(offset < 0 ? offset : offset - months + 1);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: Focus follows the focused date after it moves.
  useEffect(() => {
    if (!keyboardMoved.current) return;
    keyboardMoved.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${key(focused)}"]`)?.focus();
  }, [focused, month]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    const weekday = (date.getDay() - weekStartsOn + 7) % 7;
    const next = {
      ArrowLeft: addDays(date, -1),
      ArrowRight: addDays(date, 1),
      ArrowUp: addDays(date, -7),
      ArrowDown: addDays(date, 7),
      Home: addDays(date, -weekday),
      End: addDays(date, 6 - weekday),
      PageUp: addMonths(date, event.shiftKey ? -12 : -1),
      PageDown: addMonths(date, event.shiftKey ? 12 : 1),
    }[event.key];
    if (!next) return;
    event.preventDefault();
    move(next);
  };

  const [from, to] = selected;
  const rangeEnd = mode === "range" && from && !to && hovered && hovered > from ? hovered : to;
  const inRange = (date: Date) =>
    mode === "range" && Boolean(from && rangeEnd && date > from && date < rangeEnd);

  const format = useMemo(
    () => ({
      caption: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
      month: new Intl.DateTimeFormat(locale, { month: "long" }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short" }),
      weekdayLong: new Intl.DateTimeFormat(locale, { weekday: "long" }),
      full: new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    }),
    [locale],
  );
  // Any week will do for the names of the days, so long as it starts on the right day.
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    addDays(new Date(2024, 0, 7 + weekStartsOn), index),
  );
  // The date that Tab reaches. It is the focused date if it is on show, or else the first of the
  // month.
  const tabbable = visible.some((shown) => monthsBetween(shown, focused) === 0)
    ? focused
    : visible[0]!;

  return (
    <section
      {...rest}
      className={`x-govuk-ui-calendar ${className}`.trim()}
      aria-label={label}
      data-months={months}
    >
      <div className="x-govuk-ui-calendar-nav">
        <Button
          variant="quiet"
          size="small-icon"
          className="x-govuk-ui-calendar-turn"
          aria-label="Previous month"
          disabled={Boolean(min && monthsBetween(startOfMonth(min), month) <= 0)}
          onClick={() => turn(-1)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="m10 3-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </Button>
        {/* The Selects stay in place as the month turns beneath them, so they keep focus. */}
        {monthYearSelects && (
          <div className="x-govuk-ui-calendar-selects">
            <div className="x-govuk-ui-calendar-select" data-part="month">
              <Select
                label="Month"
                hideLabel
                size="small"
                value={String(month.getMonth())}
                onValueChange={(chosen) => jump(new Date(month.getFullYear(), Number(chosen), 1))}
              >
                {monthNumbers.map((index) => {
                  const first = new Date(month.getFullYear(), index, 1);
                  const outside =
                    (min && first < startOfMonth(min)) || (max && first > startOfMonth(max));
                  return (
                    <SelectItem key={index} value={String(index)} disabled={Boolean(outside)}>
                      {format.month.format(first)}
                    </SelectItem>
                  );
                })}
              </Select>
            </div>
            <div className="x-govuk-ui-calendar-select" data-part="year">
              <Select
                label="Year"
                hideLabel
                size="small"
                value={String(month.getFullYear())}
                onValueChange={(chosen) => jump(new Date(Number(chosen), month.getMonth(), 1))}
              >
                {(years.includes(month.getFullYear())
                  ? years
                  : [...years, month.getFullYear()].sort((a, b) => a - b)
                ).map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        )}
        <Button
          variant="quiet"
          size="small-icon"
          className="x-govuk-ui-calendar-turn"
          aria-label="Next month"
          disabled={Boolean(max && monthsBetween(visible.at(-1)!, startOfMonth(max)) <= 0)}
          onClick={() => turn(1)}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </Button>
      </div>
      <div
        ref={grid}
        className="x-govuk-ui-calendar-months"
        onPointerLeave={() => setHovered(null)}
      >
        {visible.map((shown, index) => {
          const captionId = `${id}-${key(shown)}`;
          return (
            <div
              key={key(shown)}
              className="x-govuk-ui-calendar-month"
              data-direction={directionOf(direction)}
            >
              {/* Where the Selects show the month and year, its name is for screen readers. */}
              <h2
                id={captionId}
                className="x-govuk-ui-calendar-caption"
                data-hidden={(monthYearSelects && index === 0) || undefined}
                aria-live="polite"
              >
                {format.caption.format(shown)}
              </h2>
              {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA's date picker is a table with the grid role, so the arrow keys move by day and week. */}
              <table role="grid" aria-labelledby={captionId} className="x-govuk-ui-calendar-grid">
                <thead>
                  <tr>
                    {weekdays.map((weekday) => (
                      <th
                        key={weekday.getDay()}
                        scope="col"
                        abbr={format.weekdayLong.format(weekday)}
                      >
                        {format.weekday.format(weekday)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeksOf(shown, weekStartsOn).map((week, row) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: A week has only its place in the month.
                    <tr key={row}>
                      {week.map((date, column) => {
                        // biome-ignore lint/suspicious/noArrayIndexKey: A blank day has only its place in the week.
                        if (!date) return <td key={`blank-${column}`} />;
                        const chosen = selected.some((each) => same(each, date));
                        const disabled = isDisabled(date);
                        const start = mode === "range" && same(from, date);
                        const end = mode === "range" && same(rangeEnd, date);
                        // In a table with the grid role, each cell is a grid cell, which can be
                        // selected. Its button takes focus.
                        return (
                          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: A grid cell supports aria-selected.
                          <td
                            key={key(date)}
                            aria-selected={chosen || undefined}
                            className="x-govuk-ui-calendar-cell"
                            data-in-range={inRange(date) || undefined}
                            data-range-start={
                              (start && rangeEnd && !same(from, rangeEnd)) || undefined
                            }
                            data-range-end={(end && from && !same(from, rangeEnd)) || undefined}
                          >
                            <button
                              type="button"
                              className="x-govuk-ui-calendar-day"
                              data-date={key(date)}
                              data-selected={chosen || end || undefined}
                              data-today={same(date, today) || undefined}
                              aria-label={format.full.format(date)}
                              aria-current={same(date, today) ? "date" : undefined}
                              aria-disabled={disabled || undefined}
                              tabIndex={same(date, tabbable) ? 0 : -1}
                              data-sound={disabled ? undefined : "select"}
                              onClick={() => choose(date)}
                              onFocus={() => setFocused(date)}
                              onPointerEnter={() => setHovered(date)}
                              onKeyDown={(event) => onKeyDown(event, date)}
                            >
                              {date.getDate()}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </section>
  );
}
