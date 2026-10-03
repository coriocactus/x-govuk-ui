import { useState } from "react";
import { FilterChip, FilterChips } from "x-govuk-ui";

type Props = { counts?: boolean; multiple?: boolean };

const statuses = [
  { value: "received", label: "Received", count: 12 },
  { value: "review", label: "In review", count: 7 },
  { value: "evidence", label: "Waiting for evidence", count: 3 },
  { value: "approved", label: "Approved", count: 24 },
];

export default function FilterChipsExample({ counts = true, multiple = true }: Props) {
  const [chosen, setChosen] = useState<string[]>(["review"]);
  const shown = statuses
    .filter((status) => chosen.length === 0 || chosen.includes(status.value))
    .reduce((sum, status) => sum + status.count, 0);
  return (
    <div className="preview-filters">
      <FilterChips
        label="Filter by status"
        multiple={multiple}
        value={multiple ? chosen : chosen.slice(0, 1)}
        onValueChange={setChosen}
      >
        {statuses.map((status) => (
          <FilterChip
            key={status.value}
            value={status.value}
            count={counts ? status.count : undefined}
          >
            {status.label}
          </FilterChip>
        ))}
      </FilterChips>
      <p className="preview-message" role="status">
        Showing {shown} applications
      </p>
    </div>
  );
}
