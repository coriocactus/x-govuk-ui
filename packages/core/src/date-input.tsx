"use client";

import { Popover as Primitive } from "@base-ui/react/popover";
import { type ComponentPropsWithRef, type ReactNode, useId, useRef, useState } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { useControllableState } from "./controllable-state";
import { Dial } from "./dial";
import {
  ErrorMessage,
  Field,
  Hint,
  present,
  useBoundField,
  useFieldSummary,
  useFormDefault,
} from "./field";
import { FieldsetLegend, FieldsetRoot } from "./fieldset";
import { type DateParts, dateFromParts } from "./helpers";
import { useLabels, useLocale } from "./labels";
import { useOverlaySound } from "./overlay";

export type { DateParts };

/** A date as Check your answers shows it, such as 5 January 2026, or as typed if it is no date. */
function dateAnswer(data: FormData, name: string, locale: string) {
  const [day, month, year] = ["day", "month", "year"].map((part) =>
    String(data.get(`${name}-${part}`) ?? "").trim(),
  );
  if (!day && !month && !year) return undefined;
  const date = dateFromParts({ day: day ?? "", month: month ?? "", year: year ?? "" });
  if (!date) return [day, month, year].join("/");
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

const numbers = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
type Part = keyof DateParts;

/** The words Date input writes, which a LabelsProvider or its `labels` can change. */
export type DateInputLabels = {
  day: string;
  month: string;
  year: string;
  /** Names the button that opens the calendar. */
  calendar: string;
  /** Names the calendar that the button opens. */
  chooseDate: string;
};

export const defaultDateInputLabels: DateInputLabels = {
  day: "Day",
  month: "Month",
  year: "Year",
  calendar: "Choose the date from a calendar",
  chooseDate: "Choose the date",
};

export type DateInputProps = Omit<
  ComponentPropsWithRef<"fieldset">,
  "id" | "name" | "defaultValue" | "onValueChange" | "disabled"
> & {
  /** The question, such as "When was your passport issued?". */
  legend: ReactNode;
  legendSize?: "small" | "medium" | "large";
  /** Puts the legend in the page's `h1`, for a page that asks one question. */
  pageHeading?: boolean;
  hint?: ReactNode;
  errorMessage?: ReactNode;
  /** The fields the error is about. By default, all three. */
  errorFields?: Part[];
  /**
   * The group's id. The fields are `{id}-day`, `{id}-month` and `{id}-year`, so an error summary
   * links to the day.
   */
  id?: string;
  /** The fields submit as `{name}-day`, `{name}-month` and `{name}-year`. */
  name?: string;
  /** What has been typed, as text, because a date can be partly entered. */
  value?: DateParts;
  defaultValue?: DateParts;
  onValueChange?: (value: DateParts) => void;
  /** Offers a calendar to pick the date from, beside the fields. */
  calendar?: boolean;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<DateInputLabels>;
  /** The earliest and latest dates the calendar offers. */
  min?: Date;
  max?: Date;
  /** For a date of birth, so browsers can fill it in. */
  autoCompleteBirthday?: boolean;
  disabled?: boolean;
  /** Classes for the row of fields. */
  className?: string;
};

export type DateInputControlProps = Omit<
  ComponentPropsWithRef<"div">,
  "id" | "defaultValue" | "onChange"
> &
  Pick<
    DateInputProps,
    | "name"
    | "value"
    | "defaultValue"
    | "onValueChange"
    | "errorFields"
    | "calendar"
    | "labels"
    | "min"
    | "max"
    | "autoCompleteBirthday"
    | "disabled"
  > & {
    /**
     * The group's id, from which the fields take theirs, `{id}-day`, `{id}-month` and `{id}-year`.
     * In a bound Field, the field's.
     */
    id?: string;
  };

const calendarIcon = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5" />
  </svg>
);

/**
 * GOV.UK's date input. Day, Month and Year are three short numeric fields in a fieldset, so users
 * type a date they know, such as their date of birth, without a picker. For a date users need to
 * find, such as an appointment, a calendar button opens a Calendar beside the fields. Choosing a
 * day fills the fields in. Each field is also a Dial. Drag it up or down, scroll over it, or press
 * the arrow keys, and it turns a step at a time from today's date.
 *
 * It is a bound Field holding a `FieldsetRoot`, with a `FieldsetLegend`, a `Hint`, an
 * `ErrorMessage` and a `DateInputControl`. Compose those parts yourself to put something between
 * them.
 */
export function DateInput({
  legend,
  legendSize = "small",
  pageHeading = false,
  hint,
  errorMessage,
  errorFields,
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  calendar = false,
  labels,
  min,
  max,
  autoCompleteBirthday = false,
  disabled = false,
  className,
  "aria-describedby": describedBy,
  ...props
}: DateInputProps) {
  const generated = useId();
  const groupId = id ?? `date-${generated}`;
  return (
    <Field
      controlId={groupId}
      name={name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <FieldsetRoot {...props} id={groupId} className="x-govuk-ui-date-input-fieldset">
        <FieldsetLegend size={legendSize} pageHeading={pageHeading}>
          {legend}
        </FieldsetLegend>
        <Hint>{hint}</Hint>
        <ErrorMessage />
        <DateInputControl
          className={className}
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          errorFields={errorFields}
          calendar={calendar}
          labels={labels}
          min={min}
          max={max}
          autoCompleteBirthday={autoCompleteBirthday}
          disabled={disabled}
        />
      </FieldsetRoot>
    </Field>
  );
}

/**
 * Date input's fields on their own, Day, Month and Year, with the calendar button when asked for,
 * for a date composed from Field's parts. In a bound Field, the fields take their ids and names
 * from the field's, such as `{controlId}-day` and `{name}-day`. They show the field's error, and a
 * Form's error summary links to the day. Check your answers shows the date as a date, such as 5
 * January 2026.
 */
export function DateInputControl({
  id: ownId,
  name: ownName,
  value,
  defaultValue,
  onValueChange,
  errorFields,
  calendar = false,
  labels: ownLabels,
  min,
  max,
  autoCompleteBirthday = false,
  disabled = false,
  className = "",
  ...props
}: DateInputControlProps) {
  const bound = useBoundField();
  const generated = useId();
  const groupId = ownId ?? bound?.id ?? `date-${generated}`;
  const name = ownName ?? bound?.name;
  const labels = useLabels("dateInput", defaultDateInputLabels, ownLabels);
  const locale = useLocale();
  useFieldSummary({
    linkTo: `${groupId}-day`,
    answer: name ? (data) => dateAnswer(data, name, locale) : undefined,
  });
  // A Form can give the fields an answer to start with, such as one kept from an earlier visit.
  const savedDay = useFormDefault(name && `${name}-day`)?.[0];
  const savedMonth = useFormDefault(name && `${name}-month`)?.[0];
  const savedYear = useFormDefault(name && `${name}-year`)?.[0];
  const [parts, set] = useControllableState(
    value,
    () =>
      savedDay !== undefined || savedMonth !== undefined || savedYear !== undefined
        ? { day: savedDay ?? "", month: savedMonth ?? "", year: savedYear ?? "" }
        : (defaultValue ?? { day: "", month: "", year: "" }),
    onValueChange,
  );
  const [open, setOpen] = useState(false);
  const popup = useRef<HTMLDivElement>(null);
  const sound = useOverlaySound();
  const chosen = dateFromParts(parts);
  const invalid = (part: Part) =>
    Boolean(bound?.invalid) && (!errorFields || errorFields.includes(part));

  // Each field turns like a dial, from today's date when it is empty. Days and months go round.
  const today = new Date();
  const firstYear = min?.getFullYear() ?? today.getFullYear() - 120;
  const lastYear = max?.getFullYear() ?? today.getFullYear() + 20;
  const dials = {
    day: { options: numbers(1, 31), start: today.getDate(), width: 2 },
    month: { options: numbers(1, 12), start: today.getMonth() + 1, width: 2 },
    year: { options: numbers(firstYear, lastYear), start: today.getFullYear(), width: 4 },
  };
  const input = (part: Part, label: string) => (
    <div className="x-govuk-ui-date-input-item" key={part}>
      <label className="x-govuk-ui-date-input-label" htmlFor={`${groupId}-${part}`}>
        {label}
      </label>
      <Dial
        id={`${groupId}-${part}`}
        name={name ? `${name}-${part}` : undefined}
        options={dials[part].options}
        cyclic={part !== "year"}
        startAt={String(dials[part].start)}
        width={dials[part].width}
        maxLength={part === "year" ? 4 : 2}
        autoComplete={autoCompleteBirthday ? `bday-${part}` : "off"}
        invalid={invalid(part)}
        disabled={disabled}
        value={parts[part]}
        onChange={(next) => set({ ...parts, [part]: next })}
      />
    </div>
  );

  return (
    <div {...props} className={`x-govuk-ui-date-input ${className}`.trim()}>
      {input("day", labels.day)}
      {input("month", labels.month)}
      {input("year", labels.year)}
      {calendar && (
        <Primitive.Root
          open={open}
          onOpenChange={(next, details) => {
            sound(next, details.reason);
            setOpen(next);
          }}
        >
          <Primitive.Trigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="x-govuk-ui-date-input-picker"
                aria-label={labels.calendar}
                disabled={disabled}
              >
                {calendarIcon}
              </Button>
            }
          />
          <Primitive.Portal>
            <Primitive.Positioner
              className="x-govuk-ui-floating-positioner"
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={8}
            >
              <Primitive.Popup
                ref={popup}
                className="x-govuk-ui-floating x-govuk-ui-date-input-popup"
                // Focus starts on the chosen day, or today, so the arrow keys move from there.
                initialFocus={() =>
                  popup.current?.querySelector<HTMLElement>(
                    '.x-govuk-ui-calendar-day[tabindex="0"]',
                  ) ?? true
                }
              >
                <Calendar
                  value={chosen}
                  min={min}
                  max={max}
                  label={labels.chooseDate}
                  onValueChange={(date) => {
                    if (!date) return;
                    set({
                      day: String(date.getDate()),
                      month: String(date.getMonth() + 1),
                      year: String(date.getFullYear()),
                    });
                    setOpen(false);
                  }}
                />
              </Primitive.Popup>
            </Primitive.Positioner>
          </Primitive.Portal>
        </Primitive.Root>
      )}
    </div>
  );
}
