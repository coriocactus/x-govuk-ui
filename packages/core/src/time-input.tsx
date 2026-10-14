"use client";

import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
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
import { useLabels } from "./labels";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

export type TimeParts = { hour: string; minute: string; period?: string };
type Part = keyof TimeParts;

/** The words Time input writes, which a LabelsProvider or its `labels` can change. */
export type TimeInputLabels = {
  hour: string;
  minute: string;
  /** Names the choice of am or pm, on a 12-hour clock. */
  period: string;
  am: string;
  pm: string;
};

export const defaultTimeInputLabels: TimeInputLabels = {
  hour: "Hour",
  minute: "Minute",
  period: "am or pm",
  am: "am",
  pm: "pm",
};

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
  errorMessage?: ReactNode;
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
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<TimeInputLabels>;
  /** What has been typed, as text, because a time can be partly entered. */
  value?: TimeParts;
  defaultValue?: TimeParts;
  onValueChange?: (value: TimeParts) => void;
  disabled?: boolean;
  /** Classes for the row of fields. */
  className?: string;
};

export type TimeInputControlProps = Omit<
  ComponentPropsWithRef<"div">,
  "id" | "defaultValue" | "onChange"
> &
  Pick<
    TimeInputProps,
    | "name"
    | "value"
    | "defaultValue"
    | "onValueChange"
    | "errorFields"
    | "hourCycle"
    | "minuteStep"
    | "labels"
    | "disabled"
  > & {
    /**
     * The group's id, from which the fields take theirs, `{id}-hour`, `{id}-minute` and
     * `{id}-period`. In a bound Field, the field's.
     */
    id?: string;
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
 *
 * It is a bound Field holding a `FieldsetRoot`, with a `FieldsetLegend`, a `Hint`, an
 * `ErrorMessage` and a `TimeInputControl`. Compose those parts yourself to put something between
 * them.
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
  hourCycle,
  minuteStep,
  labels,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className = "",
  "aria-describedby": describedBy,
  ...props
}: TimeInputProps) {
  const generated = useId();
  const groupId = id ?? `time-${generated}`;
  return (
    <Field
      controlId={groupId}
      name={name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <FieldsetRoot
        {...props}
        id={groupId}
        className={`x-govuk-ui-date-input-fieldset ${className}`.trim()}
      >
        <FieldsetLegend size={legendSize} pageHeading={pageHeading}>
          {legend}
        </FieldsetLegend>
        <Hint>{hint}</Hint>
        <ErrorMessage />
        <TimeInputControl
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          errorFields={errorFields}
          hourCycle={hourCycle}
          minuteStep={minuteStep}
          labels={labels}
          disabled={disabled}
        />
      </FieldsetRoot>
    </Field>
  );
}

/**
 * Time input's fields on their own, Hour and Minute, with am or pm on a 12-hour clock, for a time
 * composed from Field's parts. In a bound Field, the fields take their ids and names from the
 * field's, such as `{controlId}-hour` and `{name}-hour`. They show the field's error, and a Form's
 * error summary links to the hour.
 */
export function TimeInputControl({
  id: ownId,
  name: ownName,
  value,
  defaultValue,
  onValueChange,
  errorFields,
  hourCycle = 24,
  minuteStep = 1,
  labels: ownLabels,
  disabled = false,
  className = "",
  ...props
}: TimeInputControlProps) {
  const bound = useBoundField();
  const generated = useId();
  const groupId = ownId ?? bound?.id ?? `time-${generated}`;
  const name = ownName ?? bound?.name;
  const labels = useLabels("timeInput", defaultTimeInputLabels, ownLabels);
  useFieldSummary({
    linkTo: `${groupId}-hour`,
    answer: name
      ? (data) => {
          const [hour, minute, period] = ["hour", "minute", "period"].map((part) =>
            String(data.get(`${name}-${part}`) ?? "").trim(),
          );
          const half = period === "am" || period === "pm" ? labels[period] : "";
          return hour ? `${hour}:${minute || "00"}${half ? ` ${half}` : ""}` : undefined;
        }
      : undefined,
  });
  // A Form can give the fields an answer to start with, such as one kept from an earlier visit.
  const savedHour = useFormDefault(name && `${name}-hour`)?.[0];
  const savedMinute = useFormDefault(name && `${name}-minute`)?.[0];
  const savedPeriod = useFormDefault(name && `${name}-period`)?.[0];
  const [parts, set] = useControllableState<TimeParts>(
    value,
    () =>
      savedHour !== undefined || savedMinute !== undefined || savedPeriod !== undefined
        ? { hour: savedHour ?? "", minute: savedMinute ?? "", period: savedPeriod ?? "" }
        : (defaultValue ?? { hour: "", minute: "", period: "" }),
    onValueChange,
  );
  const invalid = (part: Part) =>
    Boolean(bound?.invalid) && (!errorFields || errorFields.includes(part));
  const twelve = hourCycle === 12;
  const dials: { part: Part; label: string; options: string[]; width: number }[] = [
    {
      part: "hour",
      label: labels.hour,
      options: twelve ? range(1, 12).map(String) : range(0, 23).map(pad),
      width: 2,
    },
    {
      part: "minute",
      label: labels.minute,
      options: range(0, 59, Math.max(1, minuteStep)).map(pad),
      width: 2,
    },
  ];

  return (
    <div {...props} className={`x-govuk-ui-date-input x-govuk-ui-time-input ${className}`.trim()}>
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
            aria-label={labels.period}
            id={`${groupId}-period`}
            disabled={disabled}
            data-invalid={invalid("period") || undefined}
            value={parts.period ? [parts.period] : []}
            onValueChange={([next]) => set({ ...parts, period: next ?? "" })}
          >
            <ToggleGroupItem value="am">{labels.am}</ToggleGroupItem>
            <ToggleGroupItem value="pm">{labels.pm}</ToggleGroupItem>
          </ToggleGroup>
          {name && <input type="hidden" name={`${name}-period`} value={parts.period ?? ""} />}
        </div>
      )}
    </div>
  );
}
