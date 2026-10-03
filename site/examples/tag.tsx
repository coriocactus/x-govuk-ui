import { useState } from "react";
import { Button, Tag, type TagColour } from "x-govuk-ui";

const stages: [string, TagColour][] = [
  ["Received", "blue"],
  ["In review", "purple"],
  ["Waiting for evidence", "yellow"],
  ["Approved", "green"],
];

const others: [string, string, TagColour][] = [
  ["Boris Johnson", "Rejected", "red"],
  ["Theresa May", "Withdrawn", "grey"],
  ["David Cameron", "Approved", "green"],
];

export default function TagExample({ outline = false }: { outline?: boolean }) {
  const variant = outline ? "outline" : "solid";
  const [stage, setStage] = useState(0);
  const [status, colour] = stages[stage]!;
  return (
    <div className="preview-statuses">
      <ul className="preview-pairs-list">
        <li>
          <span>Liz Truss</span>
          <Tag colour={colour} variant={variant}>
            {status}
          </Tag>
        </li>
        {others.map(([name, label, tone]) => (
          <li key={name}>
            <span>{name}</span>
            <Tag colour={tone} variant={variant}>
              {label}
            </Tag>
          </li>
        ))}
      </ul>
      <Button
        variant="secondary"
        size="small"
        onClick={() => setStage((stage + 1) % stages.length)}
      >
        Move Liz’s application on
      </Button>
    </div>
  );
}
