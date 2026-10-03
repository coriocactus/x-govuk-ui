"use client";

import { Popover as Primitive } from "@base-ui/react/popover";
import { type ComponentPropsWithRef, type ReactNode, useId, useRef, useState } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Dial } from "./dial";
import { ErrorMessage, Field, Hint, useField, useFormDefault } from "./field";
import { type DateParts, dateFromParts } from "./helpers";
import { useOverlaySound } from "./overlay";

export type { DateParts };

const numbers = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => String(from + index));
type Part = keyof DateParts;

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
  errorMessage?: string;
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
  /** The earliest and latest dates the calendar offers. */
  min?: Date;
  max?: Date;
  /** For a date of birth, so browsers can fill it in. */
  autoCompleteBirthday?: boolean;
  disabled?: boolean;
  /** Classes for the row of fields. */
  className?: string;
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
 * GOV.UK's date input. Day, Month and Year are three short numeric fields in a fieldset, so people
 * type a date they know, such as their date of birth, without a picker. For a date people need to
 * find, such as an appointment, a calendar button opens a Calendar beside the fields. Choosing a
 * day fills the fields in. Each field is also a Dial. Drag it up or down, scroll over it, or press
 * the arrow keys, and it turns a step at a time from today's date.
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
  min,
  max,
  autoCompleteBirthday = false,
  disabled = false,
  className = "",
  ...props
}: DateInputProps) {
  const generated = useId();
  const groupId = id ?? `date-${generated}`;
  const field = useField({ id: groupId, name, linkTo: `${groupId}-day`, hint, errorMessage });
  // A Form can give the fields an answer to start with, such as one kept from an earlier visit.
  const savedDay = useFormDefault(name && `${name}-day`)?.[0];
  const savedMonth = useFormDefault(name && `${name}-month`)?.[0];
  const savedYear = useFormDefault(name && `${name}-year`)?.[0];
  const [own, setOwn] = useState(
    () =>
      defaultValue ?? {
        day: savedDay ?? "",
        month: savedMonth ?? "",
        year: savedYear ?? "",
      },
  );
  const parts = value ?? own;
  const [open, setOpen] = useState(false);
  const popup = useRef<HTMLDivElement>(null);
  const sound = useOverlaySound();
  const set = (next: DateParts) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const chosen = dateFromParts(parts);
  const invalid = (part: Part) => field.invalid && (!errorFields || errorFields.includes(part));

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
    <Field invalid={field.invalid}>
      <fieldset
        {...props}
        className="x-govuk-ui-fieldset x-govuk-ui-date-input-fieldset"
        id={groupId}
        aria-describedby={field.controlProps["aria-describedby"]}
      >
        <legend className={`x-govuk-ui-legend x-govuk-ui-legend--${legendSize}`}>
          {pageHeading ? <h1 className="x-govuk-ui-legend-heading">{legend}</h1> : legend}
        </legend>
        <Hint id={field.hintId}>{hint}</Hint>
        <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
        <div className={`x-govuk-ui-date-input ${className}`.trim()}>
          {input("day", "Day")}
          {input("month", "Month")}
          {input("year", "Year")}
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
                    aria-label="Choose the date from a calendar"
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
                      label="Choose the date"
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
      </fieldset>
    </Field>
  );
}
