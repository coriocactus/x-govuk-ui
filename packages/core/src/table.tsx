"use client";

import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { duration, easeOut, useMotionTiming } from "./motion";
import { useMergedRef } from "./refs";
import { ScrollArea } from "./scroll-area";

type Section = "head" | "body" | "foot";
const SectionContext = createContext<Section>("body");
const CaptionContext = createContext<(id: string | undefined) => void>(() => {});

export type TableProps = ComponentPropsWithRef<"table">;

/**
 * Rows and columns of data, as GOV.UK sets them. A table wider than its container scrolls
 * sideways inside its own box, and keyboard users reach that box with Tab. Build it from
 * `TableCaption`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead` and
 * `TableCell`.
 */
export function Table({ className = "", ...props }: TableProps) {
  const [captionId, setCaptionId] = useState<string>();
  return (
    <CaptionContext value={setCaptionId}>
      <ScrollArea
        orientation="horizontal"
        labelledBy={captionId}
        className="x-govuk-ui-table-scroll"
      >
        <table {...props} className={`x-govuk-ui-table ${className}`.trim()} />
      </ScrollArea>
    </CaptionContext>
  );
}

export type TableCaptionProps = ComponentPropsWithRef<"caption"> & {
  /** GOV.UK's caption sizes. A caption that names the page's content is often medium. */
  size?: "small" | "medium" | "large" | "extra-large";
};

/** Names the table, and the box a wide table scrolls in. */
export function TableCaption({ size = "small", className = "", id, ...props }: TableCaptionProps) {
  const ownId = useId();
  const captionId = id ?? ownId;
  const register = useContext(CaptionContext);
  useLayoutEffect(() => {
    register(captionId);
    return () => register(undefined);
  }, [register, captionId]);
  return (
    <caption
      {...props}
      id={captionId}
      className={`x-govuk-ui-table-caption x-govuk-ui-table-caption--${size} ${className}`.trim()}
    />
  );
}

/** The heading row, whose `TableHead` cells head the columns. */
export function TableHeader(props: ComponentPropsWithRef<"thead">) {
  return (
    <SectionContext value="head">
      <thead {...props} />
    </SectionContext>
  );
}

/**
 * The table's rows. When rows change places, such as after sorting, each glides from where it
 * was to where it now sits.
 */
export function TableBody({ ref, ...props }: ComponentPropsWithRef<"tbody">) {
  const body = useRef<HTMLTableSectionElement>(null);
  const merged = useMergedRef(body, ref);
  const places = useRef(new WeakMap<HTMLTableRowElement, { index: number; top: number }>());
  const { reduced } = useMotionTiming();
  // Runs after every render, so it catches rows reordered by any change of their data.
  useLayoutEffect(() => {
    const rows = Array.from(body.current?.rows ?? []);
    // Every place is read before any row starts to glide. Starting a glide changes the row's
    // style, so a place read after it would make the browser work out the styles and layout of
    // the whole table again, once for each row. Sorting 1,000 rows would then take seconds.
    const moves = rows.flatMap((row, index) => {
      const top = row.offsetTop;
      const last = places.current.get(row);
      places.current.set(row, { index, top });
      if (reduced || !last || last.index === index || last.top === top) return [];
      // A row still gliding from an earlier change starts from where it shows, not where it sits.
      const gliding = row.getAnimations();
      const seen = gliding.length ? new DOMMatrixReadOnly(getComputedStyle(row).transform).m42 : 0;
      return [{ row, by: last.top + seen - top, gliding }];
    });
    for (const { row, by, gliding } of moves) {
      for (const animation of gliding) animation.cancel();
      row.animate([{ transform: `translateY(${by}px)` }, { transform: "none" }], {
        duration: duration.slow * 1000,
        easing: `cubic-bezier(${easeOut.join(",")})`,
      });
    }
  });
  return (
    <SectionContext value="body">
      <tbody {...props} ref={merged} />
    </SectionContext>
  );
}

/** The foot, for totals or a count. */
export function TableFooter(props: ComponentPropsWithRef<"tfoot">) {
  return (
    <SectionContext value="foot">
      <tfoot {...props} />
    </SectionContext>
  );
}

/** One row, in any section. */
export function TableRow({ className = "", ...props }: ComponentPropsWithRef<"tr">) {
  return <tr {...props} className={`x-govuk-ui-table-row ${className}`.trim()} />;
}

export type TableHeadProps = ComponentPropsWithRef<"th"> & {
  /** Aligns numbers to the right, so their digits line up. */
  numeric?: boolean;
  /**
   * Makes the column sortable. The heading becomes a button, and its arrows show the order.
   * Sort the rows yourself in `onSort`.
   */
  sort?: "ascending" | "descending" | "none";
  onSort?: () => void;
  /** Follows the heading, outside its sort button, such as a handle that resizes the column. */
  after?: ReactNode;
};

/**
 * A heading cell. In `TableHeader` it heads a column, and in `TableBody` it heads its row.
 */
export function TableHead({
  numeric = false,
  sort,
  onSort,
  after,
  className = "",
  children,
  ...props
}: TableHeadProps) {
  const section = useContext(SectionContext);
  return (
    <th
      scope={section === "body" ? "row" : "col"}
      aria-sort={sort}
      {...props}
      className={`x-govuk-ui-table-head ${className}`.trim()}
      data-numeric={numeric || undefined}
    >
      {sort ? (
        <button type="button" className="x-govuk-ui-table-sort" onClick={onSort}>
          {children}
          <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
            <path className="x-govuk-ui-table-sort-up" d="M5 2.5 8.5 7h-7z" />
            <path className="x-govuk-ui-table-sort-down" d="M5 13.5 1.5 9h7z" />
          </svg>
        </button>
      ) : (
        children
      )}
      {after}
    </th>
  );
}

export type TableCellProps = ComponentPropsWithRef<"td"> & {
  /** Aligns numbers to the right, so their digits line up. */
  numeric?: boolean;
};

/** A cell of data. */
export function TableCell({ numeric = false, className = "", ...props }: TableCellProps) {
  return (
    <td
      {...props}
      className={`x-govuk-ui-table-cell ${className}`.trim()}
      data-numeric={numeric || undefined}
    />
  );
}
