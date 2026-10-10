"use client";

import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { ResizableHandle } from "./resizable";
import { ScrollArea } from "./scroll-area";
import { TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./table";

export type DataTableColumn<Row> = {
  id: string;
  /** The column's heading. */
  header: string;
  /** Sits before the heading, such as a small icon for the column's contents. */
  icon?: ReactNode;
  cell: (row: Row) => ReactNode;
  /** The value the column sorts by. With it, the heading sorts the rows. */
  sortBy?: (row: Row) => string | number;
  /** Aligns numbers to the right, so their digits line up. */
  numeric?: boolean;
  /** The column's starting width, in pixels. */
  width: number;
  /** The narrowest the column can be dragged, in pixels. */
  minWidth?: number;
  /** A figure for the foot of the column, such as a sum, shown once asked for. */
  summary?: { label: string; value: (rows: readonly Row[]) => ReactNode };
};

// The box around the table takes the rest of the props.
export type DataTableProps<Row> = ComponentPropsWithRef<"div"> & {
  /** Names the table and the box it scrolls in. */
  label: string;
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  /** A key for each row that stays the same as rows are sorted. */
  rowKey: (row: Row) => string;
  /** Names a row, as in "Select Leeds City Council". */
  rowName: (row: Row) => string;
  /** How many of the first columns stay in place as the table scrolls sideways. */
  pinned?: number;
  /** Gives each row a checkbox, and the heading a checkbox for every row. */
  selectable?: boolean;
  /** The chosen rows' keys. Leave it out to let the table keep track. */
  selected?: readonly string[];
  onSelectedChange?: (selected: string[]) => void;
  /** Says how many rows there are, at the foot of the first column. */
  count?: (rows: number) => ReactNode;
  /** The table's least height, in rows of data. `rows` is the data itself. */
  minRows?: number;
  /**
   * The most rows of data the table shows before they scroll, between the headings and the foot.
   * By default, 8. Every row is 44 pixels tall, as the headings and the foot are.
   */
  maxRows?: number;
};

type Sort = { id: string; direction: "ascending" | "descending" } | null;

/** The width of the checkboxes' column, in pixels. */
const CHECKS = 44;

/**
 * A dense table for working through many records, as in a CRM. It is built from Table's parts in a
 * Scroll area. As it scrolls, the headings stay at the top and the first columns stay at the side.
 * A shadow runs along their edge once the rest has moved under them.
 *
 * Each column's edge is a Resizable handle, dragged or moved with the arrow keys. Double-clicking
 * it returns the column to its starting width. Sortable headings sort the rows, which glide to
 * their new places. Rows can be chosen with checkboxes. The foot counts the rows, and offers each
 * column's figure, such as a sum, on a button.
 */
export function DataTable<Row>({
  label,
  columns,
  rows,
  rowKey,
  rowName,
  pinned = 1,
  selectable = false,
  selected: controlled,
  onSelectedChange,
  count,
  minRows,
  maxRows = 8,
  className = "",
  style,
  ...props
}: DataTableProps<Row>) {
  const [widths, setWidths] = useState(() =>
    Object.fromEntries(columns.map((column) => [column.id, column.width])),
  );
  const [sort, setSort] = useState<Sort>(null);
  const [own, setOwn] = useState<string[]>([]);
  const [summed, setSummed] = useState<string[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const chosen = controlled ?? own;
  const choose = (next: string[]) => {
    if (controlled === undefined) setOwn(next);
    onSelectedChange?.(next);
  };

  // The pinned columns cast a shadow once the rest has scrolled under them.
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const watch = () => setScrolled(element.scrollLeft > 0);
    element.addEventListener("scroll", watch, { passive: true });
    return () => element.removeEventListener("scroll", watch);
  }, []);

  const ordered = useMemo(() => {
    const by = sort && columns.find((column) => column.id === sort.id)?.sortBy;
    if (!sort || !by) return rows;
    return [...rows].sort((a, b) => {
      const [x, y] = [by(a), by(b)];
      const order =
        typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.direction === "ascending" ? order : -order;
    });
  }, [rows, sort, columns]);
  const keys = rows.map(rowKey);
  // Looked up once for each row, so a set keeps a table of thousands of rows quick to render.
  const chosenKeys = useMemo(() => new Set(chosen), [chosen]);
  const all = keys.length > 0 && keys.every((key) => chosenKeys.has(key));
  const some = !all && keys.some((key) => chosenKeys.has(key));

  // Where each pinned column sits from the left, past the checkboxes and the columns before it.
  // The places are custom properties on the table, so resizing a column changes them without
  // rendering the rows again.
  const lefts: Record<string, string> = {};
  let edge = selectable ? CHECKS : 0;
  columns.slice(0, pinned).forEach((column, index) => {
    lefts[`--x-govuk-ui-pin-${index}`] = `${edge}px`;
    edge += widths[column.id] ?? column.width;
  });
  const total =
    (selectable ? CHECKS : 0) +
    columns.reduce((sum, column) => sum + (widths[column.id] ?? column.width), 0);
  const pin = (index: number) => {
    if (index >= pinned) return {};
    return {
      "data-pinned": index === pinned - 1 ? "last" : "",
      style: { left: `var(--x-govuk-ui-pin-${index})` },
    };
  };
  /**
   * How a heading sorts. It is the sort's direction while the column sorts, "none" while it can,
   * and undefined if it cannot.
   */
  const sortOf = (column: DataTableColumn<Row>) => {
    if (!column.sortBy) return undefined;
    return sort?.id === column.id ? sort.direction : "none";
  };
  /**
   * The foot of a column. The first column's foot has the count, and each other column's foot has
   * its figure, once asked for.
   */
  const footOf = (column: DataTableColumn<Row>, index: number) => {
    if (index === 0) return count?.(rows.length);
    const { summary } = column;
    if (!summary) return null;
    if (summed.includes(column.id))
      return (
        <button
          type="button"
          className="x-govuk-ui-data-table-figure"
          aria-label={`${summary.label} of ${column.header}, hide`}
          onClick={() => setSummed(summed.filter((id) => id !== column.id))}
        >
          <span aria-hidden="true">{summary.label}</span>
          {summary.value(rows)}
        </button>
      );
    return (
      <Button
        variant="quiet"
        size="small"
        className="x-govuk-ui-data-table-add"
        aria-label={`Show the ${summary.label.toLowerCase()} of ${column.header}`}
        onClick={() => setSummed([...summed, column.id])}
      >
        + {summary.label}
      </Button>
    );
  };

  // The rows are rendered again only when they change, not as a column is resized.
  const chosenChange = useRef(choose);
  chosenChange.current = choose;
  // biome-ignore lint/correctness/useExhaustiveDependencies: The pin function reads only the pinned count.
  const body = useMemo(
    () => (
      <TableBody>
        {ordered.map((row) => {
          const key = rowKey(row);
          const on = chosenKeys.has(key);
          return (
            <TableRow key={key} data-selected={on || undefined}>
              {selectable && (
                <td className="x-govuk-ui-data-table-check" data-pinned="" style={{ left: 0 }}>
                  <input
                    type="checkbox"
                    className="x-govuk-ui-data-table-checkbox"
                    aria-label={`Select ${rowName(row)}`}
                    checked={on}
                    onChange={() =>
                      chosenChange.current(
                        on ? chosen.filter((each) => each !== key) : [...chosen, key],
                      )
                    }
                  />
                </td>
              )}
              {columns.map((column, index) =>
                index === 0 ? (
                  <TableHead key={column.id} numeric={column.numeric} {...pin(index)}>
                    {column.cell(row)}
                  </TableHead>
                ) : (
                  <TableCell key={column.id} numeric={column.numeric} {...pin(index)}>
                    {column.cell(row)}
                  </TableCell>
                ),
              )}
            </TableRow>
          );
        })}
      </TableBody>
    ),
    [ordered, chosen, chosenKeys, columns, pinned, selectable, rowKey, rowName],
  );

  return (
    <div
      {...props}
      className={`x-govuk-ui-data-table ${className}`.trim()}
      data-scrolled={scrolled || undefined}
      data-min-rows={minRows ? "" : undefined}
      style={
        {
          ...style,
          "--x-govuk-ui-data-table-min-rows": minRows || undefined,
          "--x-govuk-ui-data-table-max-rows": maxRows,
        } as CSSProperties
      }
    >
      <ScrollArea
        orientation="both"
        label={label}
        className="x-govuk-ui-data-table-scroll"
        viewportRef={viewport}
      >
        <table
          className="x-govuk-ui-table x-govuk-ui-data-table-table"
          style={{ width: total, ...lefts } as CSSProperties}
        >
          <caption className="x-govuk-ui-visually-hidden">{label}</caption>
          <colgroup>
            {selectable && <col style={{ width: CHECKS }} />}
            {columns.map((column) => (
              <col key={column.id} style={{ width: widths[column.id] }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow>
              {selectable && (
                <th
                  scope="col"
                  className="x-govuk-ui-data-table-check"
                  data-pinned=""
                  style={{ left: 0 }}
                >
                  <input
                    type="checkbox"
                    className="x-govuk-ui-data-table-checkbox"
                    aria-label="Select every row"
                    checked={all}
                    ref={(element) => {
                      if (element) element.indeterminate = some;
                    }}
                    onChange={() => choose(all ? [] : keys)}
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <TableHead
                  key={column.id}
                  numeric={column.numeric}
                  className="x-govuk-ui-data-table-head"
                  {...pin(index)}
                  sort={sortOf(column)}
                  onSort={() =>
                    setSort(
                      sort?.id === column.id && sort.direction === "ascending"
                        ? { id: column.id, direction: "descending" }
                        : { id: column.id, direction: "ascending" },
                    )
                  }
                  after={
                    <ResizableHandle
                      label={`Width of ${column.header}`}
                      panel="before"
                      value={widths[column.id] ?? column.width}
                      min={column.minWidth ?? 72}
                      max={640}
                      defaultValue={column.width}
                      onValueChange={(next) =>
                        setWidths((current) => ({ ...current, [column.id]: next }))
                      }
                      className="x-govuk-ui-data-table-resize"
                    />
                  }
                >
                  <span className="x-govuk-ui-data-table-heading">
                    {column.icon && (
                      <span className="x-govuk-ui-data-table-icon" aria-hidden="true">
                        {column.icon}
                      </span>
                    )}
                    {column.header}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          {body}
          <TableFooter>
            <TableRow>
              {selectable && (
                <td className="x-govuk-ui-data-table-check" data-pinned="" style={{ left: 0 }} />
              )}
              {columns.map((column, index) => (
                <TableCell key={column.id} numeric={column.numeric} {...pin(index)}>
                  {footOf(column, index)}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        </table>
      </ScrollArea>
    </div>
  );
}
