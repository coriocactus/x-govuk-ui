import { useState } from "react";
import { Calendar, type DateRange } from "x-govuk-ui";

type Props = {
  /** One date, a first and last date, or any number of dates. */
  mode?: "single" | "range" | "multiple";
  months?: 1 | 2;
  monthYearSelects?: boolean;
  weekStartsOn?: 0 | 1;
  /** Dates the calendar will not offer, which are none, those after today, or those before it. */
  disabledDates?: "none" | "future" | "past";
};

const long = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

export default function CalendarExample({
  mode = "single",
  months = 1,
  monthYearSelects = true,
  weekStartsOn = 1,
  disabledDates = "none",
}: Props) {
  const [one, setOne] = useState<Date | null>(null);
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const [several, setSeveral] = useState<Date[]>([]);
  // Today, taken once, so the calendar is not given a new date to compare against on every render.
  const [today] = useState(() => new Date());
  const shared = {
    months,
    monthYearSelects,
    weekStartsOn,
    // Past dates are left out by a minimum of today, and future dates by a maximum of today.
    min: disabledDates === "past" ? today : undefined,
    max: disabledDates === "future" ? today : undefined,
  };

  // What has been chosen so far, in a sentence.
  const summary = () => {
    if (mode === "range") {
      if (range.from && range.to)
        return `From ${long.format(range.from)} to ${long.format(range.to)}.`;
      return range.from ? "Now choose the last day." : "";
    }
    if (mode === "multiple") {
      if (!several.length) return "";
      return `${several.length} ${several.length === 1 ? "day" : "days"} chosen.`;
    }
    return one ? `You chose ${long.format(one)}.` : "";
  };

  return (
    <div className="preview-calendar">
      {mode === "range" ? (
        <Calendar
          mode="range"
          value={range}
          onValueChange={setRange}
          label="Dates of your event"
          {...shared}
        />
      ) : mode === "multiple" ? (
        <Calendar
          mode="multiple"
          value={several}
          onValueChange={setSeveral}
          label="Days you can attend"
          {...shared}
        />
      ) : (
        <Calendar value={one} onValueChange={setOne} label="Choose a date" {...shared} />
      )}
      <p className="preview-message" role="status">
        {summary()}
      </p>
    </div>
  );
}
