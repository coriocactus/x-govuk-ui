import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "x-govuk-ui";
import { plain } from "./chart-words";

export type BarListItem = {
  /** What the row counts, such as a region. */
  label: ReactNode;
  /** The row's figure, which sets its bar's length, relative to the largest. */
  value: number;
  /** A key for the row, where its label is not text. */
  id?: string;
};

export type BarListProps = Omit<ComponentPropsWithRef<"table">, "children"> & {
  /** The rows, in the order to show them. Rank them, largest first, to compare their sizes. */
  data: readonly BarListItem[];
  /** The heading over the names, such as "Region". */
  nameLabel: ReactNode;
  /** The heading over the figures, such as "Licences sold". */
  valueLabel: ReactNode;
  /** Names the table, above it. */
  caption?: ReactNode;
  /** Writes each figure, such as "£1.2m". */
  format?: (value: number) => string;
  /** The figure a whole bar stands for. By default, the largest. */
  max?: number;
};

/**
 * A ranked list of figures, each with a bar behind its name as long as its figure, as GOV.UK draws
 * a horizontal bar chart in HTML. It is a table, so screen readers hear each name with its figure.
 * Its text is the page's own, and it needs no picture or description of its own. The bars grow from
 * the start as it first shows, unless motion is reduced.
 */
export function BarList({
  data,
  nameLabel,
  valueLabel,
  caption,
  format = plain,
  max,
  className = "",
  ...props
}: BarListProps) {
  // The longest bar is the largest figure, found without spreading the figures as arguments.
  const whole = max ?? data.reduce((largest, item) => Math.max(largest, item.value), 0);
  return (
    <Table {...props} className={`x-govuk-ui-bar-list ${className}`.trim()}>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          <TableHead>{nameLabel}</TableHead>
          <TableHead numeric>{valueLabel}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow
            key={item.id ?? (typeof item.label === "string" ? item.label : index)}
            style={
              {
                "--x-govuk-ui-bar-list-share": whole > 0 ? Math.max(0, item.value) / whole : 0,
              } as CSSProperties
            }
          >
            <TableHead className="x-govuk-ui-bar-list-name">
              <span className="x-govuk-ui-bar-list-bar" aria-hidden="true" />
              <span className="x-govuk-ui-bar-list-label">{item.label}</span>
            </TableHead>
            <TableCell numeric className="x-govuk-ui-bar-list-value">
              {format(item.value)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
