import { useState } from "react";
import { Calendar, DateInput, type DateParts, type DateRange, dateFromParts } from "x-govuk-ui";

type Props = {
  legend?: string;
  hint?: string;
  errorMessage?: string;
  calendar?: boolean;
  disabled?: boolean;
  /** Shows the date input, or the calendar on its own, choosing one date, a range or several. */
  show?: "input" | "single" | "range" | "multiple";
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
  show = "input",
  disabledDates = "none",
}: Props) {
  const [parts, setParts] = useState<DateParts>({ day: "", month: "", year: "" });
  const [one, setOne] = useState<Date | null>(null);
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [several, setSeveral] = useState<Date[]>([]);
  // Today, taken once, so the calendar is not given a new date to compare against on every render.
  const [today] = useState(() => new Date());
  // Past dates are left out by a minimum of today, and future dates by a maximum of today.
  const limits = {
    min: disabledDates === "past" ? today : undefined,
    max: disabledDates === "future" ? today : undefined,
  };

  if (show === "input") {
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
          {...limits}
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

  // What has been chosen so far, in a sentence.
  const summarise = () => {
    if (show === "range") {
      if (range.from && range.to)
        return `From ${long.format(range.from)} to ${long.format(range.to)}.`;
      return range.from ? "Now choose the last day." : "";
    }
    if (show === "multiple") {
      if (!several.length) return "";
      return `${several.length} ${several.length === 1 ? "day" : "days"} chosen.`;
    }
    return one ? `You chose ${long.format(one)}.` : "";
  };
  const calendars = {
    single: <Calendar value={one} onValueChange={setOne} label="Choose a date" {...limits} />,
    range: (
      <Calendar
        mode="range"
        months={2}
        value={range}
        onValueChange={setRange}
        label="Dates of your event"
        {...limits}
      />
    ),
    multiple: (
      <Calendar
        mode="multiple"
        value={several}
        onValueChange={setSeveral}
        label="Days you can attend"
        {...limits}
      />
    ),
  };
  return (
    <div className="preview-calendar">
      {calendars[show]}
      <p className="preview-message" role="status">
        {summarise()}
      </p>
    </div>
  );
}
