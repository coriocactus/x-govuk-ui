import { useState } from "react";
import { TimeInput, type TimeParts } from "x-govuk-ui";

type Props = {
  legend?: string;
  hourCycle?: 12 | 24;
  minuteStep?: number;
  errorMessage?: string;
  disabled?: boolean;
};

/** The time as GOV.UK writes it, such as 9:30am, 2pm, midday or midnight. */
function spoken({ hour, minute, period }: TimeParts, hourCycle: 12 | 24) {
  let hours = Number(hour);
  const minutes = Number(minute);
  if (hour === "" || minute === "" || !Number.isInteger(hours) || !Number.isInteger(minutes))
    return "";
  if (minutes < 0 || minutes > 59) return "";
  if (hourCycle === 12) {
    if (hours < 1 || hours > 12 || (period !== "am" && period !== "pm")) return "";
    hours = (hours % 12) + (period === "pm" ? 12 : 0);
  } else if (hours < 0 || hours > 23) return "";
  if (minutes === 0 && hours === 12) return "midday";
  if (minutes === 0 && hours === 0) return "midnight";
  const clock = hours % 12 || 12;
  return `${clock}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}${hours < 12 ? "am" : "pm"}`;
}

export default function TimeInputExample({
  legend = "What time does your appointment start?",
  hourCycle = 24,
  minuteStep = 5,
  errorMessage = "",
  disabled = false,
}: Props) {
  const [time, setTime] = useState<TimeParts>({ hour: "", minute: "", period: "" });
  const said = spoken(time, hourCycle);
  return (
    <div className="preview-date">
      <TimeInput
        key={hourCycle}
        id="start"
        name="start"
        legend={legend}
        hint={hourCycle === 12 ? "For example, 2 30 pm" : "For example, 14 30"}
        hourCycle={hourCycle}
        minuteStep={minuteStep}
        errorMessage={errorMessage || undefined}
        disabled={disabled}
        value={time}
        onValueChange={setTime}
      />
      <p className="preview-message" role="status">
        {said && `Your appointment starts at ${said}.`}
      </p>
    </div>
  );
}
