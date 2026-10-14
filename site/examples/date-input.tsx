import { useState } from "react";
import { DateInput, type DateParts, dateFromParts } from "x-govuk-ui";

type Props = {
  legend?: string;
  hint?: string;
  errorMessage?: string;
  calendar?: boolean;
  disabled?: boolean;
  /** Dates the calendar will not offer, which are none, those after today, or those before it. */
  disabledDates?: "none" | "future" | "past";
};

const long = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

export default function DateInputExample({
  legend = "When do you want your licence to start?",
  hint = "For example, 27 3 2026",
  errorMessage = "",
  calendar = true,
  disabled = false,
  disabledDates = "none",
}: Props) {
  const [parts, setParts] = useState<DateParts>({ day: "", month: "", year: "" });
  // Today, taken once, so the calendar is not given a new date to compare against on every render.
  const [today] = useState(() => new Date());
  const date = dateFromParts(parts);
  return (
    // The date input sits centred at its own width, with its message beneath it.
    <div className="preview-date">
      <DateInput
        id="start"
        name="start"
        legend={legend}
        hint={hint || undefined}
        errorMessage={errorMessage || undefined}
        calendar={calendar}
        // Past dates are left out by a minimum of today, and future dates by a maximum of today.
        min={disabledDates === "past" ? today : undefined}
        max={disabledDates === "future" ? today : undefined}
        disabled={disabled}
        value={parts}
        onValueChange={setParts}
      />
      <p className="preview-message" role="status">
        {date ? `Your licence starts on ${long.format(date)} ${date.getFullYear()}.` : ""}
      </p>
    </div>
  );
}
