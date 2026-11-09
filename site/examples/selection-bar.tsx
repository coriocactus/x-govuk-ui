import { useState } from "react";
import {
  Button,
  DataTable,
  type DataTableColumn,
  DropdownMenu,
  DropdownMenuTrigger,
  MenuContent,
  MenuItem,
  SelectionBar,
  Tag,
  type TagColour,
} from "x-govuk-ui";

type Props = { actions?: boolean };

type Application = { reference: string; licence: string; received: string; status: string };

const start: Application[] = [
  ["RF-2041", "12 months", "14 Oct", "Needs a decision"],
  ["RF-2042", "8 days", "14 Oct", "Needs a decision"],
  ["RF-2043", "1 day", "15 Oct", "Needs a decision"],
  ["RF-2044", "12 months", "15 Oct", "Needs a decision"],
  ["RF-2045", "12 months", "16 Oct", "Needs a decision"],
  ["RF-2046", "8 days", "16 Oct", "Needs a decision"],
  ["RF-2047", "12 months", "17 Oct", "Needs a decision"],
  ["RF-2048", "1 day", "17 Oct", "Needs a decision"],
].map(([reference, licence, received, status]) => ({
  reference: reference!,
  licence: licence!,
  received: received!,
  status: status!,
}));

const colours: Record<string, TagColour> = {
  Approved: "green",
  "Evidence asked for": "blue",
  Refused: "red",
};

const columns: DataTableColumn<Application>[] = [
  { id: "reference", header: "Reference", cell: (row) => row.reference, width: 130 },
  { id: "licence", header: "Licence", cell: (row) => row.licence, width: 130 },
  { id: "received", header: "Received", cell: (row) => row.received, width: 120 },
  {
    id: "status",
    header: "Status",
    cell: (row) => <Tag colour={colours[row.status] ?? "yellow"}>{row.status}</Tag>,
    width: 190,
  },
];

export default function SelectionBarExample({ actions = true }: Props) {
  const [rows, setRows] = useState(start);
  const [selected, setSelected] = useState<string[]>(["RF-2042"]);
  // Each action gives the chosen applications a status, and leaves none chosen.
  const decide = (status: string) => {
    setRows((current) =>
      current.map((row) => (selected.includes(row.reference) ? { ...row, status } : row)),
    );
    setSelected([]);
  };
  return (
    <DataTable
      label="Applications"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.reference}
      rowName={(row) => row.reference}
      selectable
      selected={selected}
      onSelectedChange={setSelected}
      pinned={0}
      maxRows={5}
      count={(count) => `${count} applications`}
      selectionBar={
        <SelectionBar count={selected.length} onClear={() => setSelected([])}>
          <Button size="small" onClick={() => decide("Approved")}>
            Approve
          </Button>
          {actions && (
            <DropdownMenu>
              <DropdownMenuTrigger size="small">More</DropdownMenuTrigger>
              <MenuContent align="end">
                <MenuItem onSelect={() => decide("Evidence asked for")}>Ask for evidence</MenuItem>
                <MenuItem destructive onSelect={() => decide("Refused")}>
                  Refuse
                </MenuItem>
              </MenuContent>
            </DropdownMenu>
          )}
        </SelectionBar>
      }
    />
  );
}
