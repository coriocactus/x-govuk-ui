"use client";

import { type ComponentPropsWithRef, type ReactNode, useId, useState } from "react";
import { Dial } from "./dial";
import { ErrorMessage, Field, Hint, useField, useFormDefault } from "./field";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

export type TimeParts = { hour: string; minute: string; period?: string };
type Part = keyof TimeParts;

export type TimeInputProps = Omit<
  ComponentPropsWithRef<"fieldset">,
  "id" | "name" | "defaultValue" | "onValueChange" | "disabled"
> & {
  /** The question, such as "What time does your appointment start?". */
  legend: ReactNode;
  legendSize?: "small" | "medium" | "large";
  /** Puts the legend in the page's `h1`, for a page that asks one question. */
  pageHeading?: boolean;
  hint?: ReactNode;
  errorMessage?: string;
  /** The fields the error is about. By default, all of them. */
  errorFields?: Part[];
  /**
   * The group's id. The fields are `{id}-hour`, `{id}-minute` and `{id}-period`, so an error
   * summary links to the hour.
   */
  id?: string;
  /** The fields submit as `{name}-hour`, `{name}-minute` and `{name}-period`. */
  name?: string;
  /**
   * 24 asks for an hour from 0 to 23. 12 asks for an hour from 1 to 12, with am or pm beside it.
   */
  hourCycle?: 12 | 24;
  /** The minutes the dial stops at, such as 5 for every five minutes. Typing takes any minute. */
  minuteStep?: number;
  /** What has been typed, as text, because a time can be partly entered. */
  value?: TimeParts;
  defaultValue?: TimeParts;
  onValueChange?: (value: TimeParts) => void;
  disabled?: boolean;
  /** Classes for the row of fields. */
  className?: string;
};

const pad = (value: number) => String(value).padStart(2, "0");
const range = (from: number, to: number, step = 1) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, index) => from + index * step);

/**
 * A time, asked for as GOV.UK asks for a date. Hour and Minute are short fields in a row, each
 * labelled above. On a 12-hour clock, a Toggle group asks for am or pm. Type a time, or turn a
 * field like a dial. Drag it up or down, scroll over it, or press the arrow keys. A drum rises out
 * of the field, and the values click past one step at a time, ticking as each passes. The values go
 * round, so 59 minutes turns to 00. The fields are Dials, as Date input's are.
 */
export function TimeInput({
  legend,
  legendSize = "small",
  pageHeading = false,
  hint,
  errorMessage,
  errorFields,
  id,
  name,
  hourCycle = 24,
  minuteStep = 1,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className = "",
  ...props
}: TimeInputProps) {
  const generated = useId();
  const groupId = id ?? `time-${generated}`;
  const field = useField({ id: groupId, name, linkTo: `${groupId}-hour`, hint, errorMessage });
  // A Form can give the fields an answer to start with, such as one kept from an earlier visit.
  const savedHour = useFormDefault(name && `${name}-hour`)?.[0];
  const savedMinute = useFormDefault(name && `${name}-minute`)?.[0];
  const savedPeriod = useFormDefault(name && `${name}-period`)?.[0];
  const [own, setOwn] = useState<TimeParts>(
    () =>
      defaultValue ?? {
        hour: savedHour ?? "",
        minute: savedMinute ?? "",
        period: savedPeriod ?? "",
      },
  );
  const parts = value ?? own;
  const set = (next: TimeParts) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const invalid = (part: Part) => field.invalid && (!errorFields || errorFields.includes(part));
  const twelve = hourCycle === 12;
  const dials: { part: Part; label: string; options: string[]; width: number }[] = [
    {
      part: "hour",
      label: "Hour",
      options: twelve ? range(1, 12).map(String) : range(0, 23).map(pad),
      width: 2,
    },
    {
      part: "minute",
      label: "Minute",
      options: range(0, 59, Math.max(1, minuteStep)).map(pad),
      width: 2,
    },
  ];

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
        <div className={`x-govuk-ui-date-input x-govuk-ui-time-input ${className}`.trim()}>
          {dials.map(({ part, label, options, width }) => (
            <div className="x-govuk-ui-date-input-item" key={part}>
              <label className="x-govuk-ui-date-input-label" htmlFor={`${groupId}-${part}`}>
                {label}
              </label>
              <Dial
                id={`${groupId}-${part}`}
                name={name ? `${name}-${part}` : undefined}
                options={options}
                width={width}
                value={parts[part] ?? ""}
                invalid={invalid(part)}
                disabled={disabled}
                onChange={(next) => set({ ...parts, [part]: next })}
                tidy={(text) => {
                  const number = Number(text);
                  if (text.trim() === "" || !Number.isInteger(number)) return text;
                  return part === "minute" || !twelve ? pad(number) : String(number);
                }}
              />
            </div>
          ))}
          {twelve && (
            <div className="x-govuk-ui-date-input-item x-govuk-ui-time-input-period">
              <ToggleGroup
                aria-label="am or pm"
                id={`${groupId}-period`}
                disabled={disabled}
                data-invalid={invalid("period") || undefined}
                value={parts.period ? [parts.period] : []}
                onValueChange={([next]) => set({ ...parts, period: next ?? "" })}
              >
                <ToggleGroupItem value="am">am</ToggleGroupItem>
                <ToggleGroupItem value="pm">pm</ToggleGroupItem>
              </ToggleGroup>
              {name && <input type="hidden" name={`${name}-period`} value={parts.period ?? ""} />}
            </div>
          )}
        </div>
      </fieldset>
    </Field>
  );
}
