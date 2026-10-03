import { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "x-govuk-ui";

type Props = {
  size?: "small" | "medium" | "large" | "extra-large";
  /** Makes each heading sort the rows. */
  sortable?: boolean;
};

const regions = [
  { region: "North East", received: 2140, approved: 1987, wait: 12 },
  { region: "North West", received: 5321, approved: 4870, wait: 15 },
  { region: "Yorkshire and the Humber", received: 3904, approved: 3512, wait: 9 },
  { region: "East Midlands", received: 3118, approved: 2954, wait: 11 },
  { region: "West Midlands", received: 4476, approved: 4021, wait: 14 },
  { region: "London", received: 7912, approved: 7140, wait: 21 },
  { region: "South West", received: 3551, approved: 3388, wait: 8 },
];
type Column = keyof (typeof regions)[number];

const columns: { key: Column; label: string; numeric?: boolean }[] = [
  { key: "region", label: "Region" },
  { key: "received", label: "Received", numeric: true },
  { key: "approved", label: "Approved", numeric: true },
  { key: "wait", label: "Wait in days", numeric: true },
];

const total = (key: "received" | "approved") =>
  regions.reduce((sum, row) => sum + row[key], 0).toLocaleString("en-GB");

export default function TableExample({ size = "medium", sortable = true }: Props) {
  const [order, setOrder] = useState<{ column: Column; direction: "ascending" | "descending" }>();
  const rows = order
    ? [...regions].sort((a, b) => {
        const [first, second] = [a[order.column], b[order.column]];
        const compared =
          typeof first === "number"
            ? first - (second as number)
            : first.localeCompare(second as string);
        return order.direction === "ascending" ? compared : -compared;
      })
    : regions;

  return (
    <Table>
      <TableCaption size={size}>Applications by region, April to June</TableCaption>
      <TableHeader>
        <TableRow>
          {columns.map(({ key, label, numeric }) => (
            <TableHead
              key={key}
              numeric={numeric}
              sort={sortable ? (order?.column === key ? order.direction : "none") : undefined}
              // A first press sorts a column in ascending order, and a second reverses it.
              onSort={() =>
                setOrder({
                  column: key,
                  direction:
                    order?.column === key && order.direction === "ascending"
                      ? "descending"
                      : "ascending",
                })
              }
            >
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.region}>
            <TableHead>{row.region}</TableHead>
            <TableCell numeric>{row.received.toLocaleString("en-GB")}</TableCell>
            <TableCell numeric>{row.approved.toLocaleString("en-GB")}</TableCell>
            <TableCell numeric>{row.wait}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableHead>Total</TableHead>
          <TableCell numeric>{total("received")}</TableCell>
          <TableCell numeric>{total("approved")}</TableCell>
          <TableCell numeric />
        </TableRow>
      </TableFooter>
    </Table>
  );
}
