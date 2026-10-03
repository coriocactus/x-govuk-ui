import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "x-govuk-ui";

type Props = { multiple?: boolean; size?: "medium" | "small"; disabled?: boolean };

const periods = [
  ["day", "Day"],
  ["week", "Week"],
  ["month", "Month"],
] as const;

export default function ToggleGroupExample({
  multiple = false,
  size = "medium",
  disabled = false,
}: Props) {
  const [shown, setShown] = useState<string[]>(["week"]);
  return (
    <>
      <ToggleGroup
        aria-label="Show appointments by"
        multiple={multiple}
        size={size}
        disabled={disabled}
        value={shown}
        onValueChange={setShown}
      >
        {periods.map(([value, label]) => (
          <ToggleGroupItem key={value} value={value}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="preview-message" role="status">
        {shown.length ? `Showing appointments by ${shown.join(" and ")}.` : "Nothing chosen."}
      </p>
    </>
  );
}
