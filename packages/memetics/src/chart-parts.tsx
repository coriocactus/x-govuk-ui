"use client";

import { type ComponentPropsWithRef, createContext, type ReactNode, useContext } from "react";
import {
  Figure,
  FigureCaption,
  FigureData,
  type FigureDataProps,
  type FigureProps,
  FigureSource,
} from "x-govuk-ui";
import { BrushControl, type BrushState } from "./chart-brush";
import { type FigureRow, Figures, type FigureTable } from "./chart-frame";
import { chartLabels } from "./chart-words";

/** One entry of a chart's key, with what it names, and its mark. */
export type ChartKeyEntry = {
  /** What the mark stands for, such as a series' name. */
  label: string;
  /** What tells the entry apart from others, where two share a label. By default, its place. */
  id?: string;
  /** The mark's colour. A shade takes its class's colour. */
  colour?: string;
  /**
   * The mark's shape. By default, a square. `hollow` is a hollow square for a candle that rose,
   * `line` a short line for a line, `dashed` a dashed line for a projection, and `shade` a heat
   * map's shade.
   */
  mark?: "square" | "hollow" | "line" | "dashed" | "shade";
  /**
   * A shade's class, from 1, the palest, to 5. A shade without a class is hatched, for no figure.
   */
  step?: number;
};

/** What a chart gives the parts set out inside it. */
type ChartPartsValue = {
  key: readonly ChartKeyEntry[] | null;
  plot: ReactNode;
  brush: BrushState | null;
  tables: readonly FigureTable[];
  /** What opens the tables, such as "Show the figures as a table". */
  summary: string;
};
const ChartPartsContext = createContext<ChartPartsValue | null>(null);

/**
 * How a chart is set out. Its props set it out in the usual order. Its children can instead set out
 * the parts as a service needs, such as the key beneath the plot or the source above it.
 */
export type ChartLayout =
  | {
      /** Says what the chart shows, as a headline, such as "Most anglers buy a yearly licence". */
      title: ReactNode;
      /** What is measured, and in what, such as "Licences sold each month, thousands". */
      subtitle?: ReactNode;
      /** Where the figures come from, at the chart's foot. */
      source?: ReactNode;
      /** No children, so the chart sets out its parts itself. */
      children?: undefined;
    }
  | {
      title?: undefined;
      subtitle?: undefined;
      source?: undefined;
      /**
       * The chart's parts, in the order they are shown. They can be a `FigureCaption` for its
       * headline, which names the chart, `ChartKey`, `ChartPlot`, `ChartBrush`, a `FigureSource`
       * and `ChartTable`, and anything else the figure needs, such as a note.
       */
      children: ReactNode;
    };

export type ChartKeyProps = ComponentPropsWithRef<"ul"> & {
  /** The entries, for a key of a service's own. By default, the chart's own key. */
  entries?: readonly ChartKeyEntry[];
};

/**
 * A chart's key, a row of marks in the series' colours, each with its name. The marks are squares
 * for bars and areas, lines for lines, and shades for a heat map. Screen readers skip it, because
 * the table names every series. Inside a chart, it is the chart's own key, and shows nothing where
 * the chart has none.
 */
export function ChartKey({ entries, className = "", ...props }: ChartKeyProps) {
  const parts = useContext(ChartPartsContext);
  const shown = entries ?? parts?.key;
  if (!shown?.length) return null;
  return (
    <ul aria-hidden="true" {...props} className={`x-govuk-ui-chart-key ${className}`.trim()}>
      {shown.map((entry, index) => (
        <li key={entry.id ?? index}>
          {entry.mark === "shade" ? (
            <span
              className="x-govuk-ui-chart-heat"
              data-step={entry.step}
              data-missing={entry.step === undefined ? "" : undefined}
            />
          ) : (
            <span
              className="x-govuk-ui-chart-key-mark"
              data-mark={entry.mark ?? "square"}
              style={{ color: entry.colour }}
            />
          )}
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

export type ChartPlotProps = ComponentPropsWithRef<"div">;

/**
 * The chart's drawing, a picture that screen readers hear described in a sentence. For a heat map,
 * it is the table of shaded figures. It takes the width it is given, so a service can set it beside
 * something else.
 */
export function ChartPlot({ className = "", ...props }: ChartPlotProps) {
  const parts = useContext(ChartPartsContext);
  return (
    <div {...props} className={`x-govuk-ui-chart-drawing ${className}`.trim()}>
      {parts?.plot}
    </div>
  );
}

export type ChartBrushProps = ComponentPropsWithRef<"div">;

/**
 * The slider beneath a long chart, given `brush`, that chooses the categories the plot shows. It
 * draws the whole chart small, with a handle at each end of the part shown. Each handle is a
 * slider, which the keyboard moves a category at a time. It shows nothing where the chart has no
 * brush.
 */
export function ChartBrush(props: ChartBrushProps) {
  const parts = useContext(ChartPartsContext);
  if (!parts?.brush) return null;
  return <BrushControl {...props} {...parts.brush} />;
}

export type ChartTableProps = Omit<FigureDataProps, "children" | "summary"> & {
  /** What opens the table. By default, the chart's words, "Show the figures as a table". */
  summary?: ReactNode;
  /**
   * The tables, for a chart of a service's own, each with its headings and rows. By default, the
   * chart's own tables.
   */
  tables?: readonly ChartTableData[];
};

/**
 * The chart's figures as tables, in a Details a reader opens, as GOV.UK asks of every chart. It
 * shows nothing where the chart is its own table, as a heat map is. Given `tables`, it sets out a
 * service's own figures the same way, beside the service's own drawing.
 */
export function ChartTable({ summary, tables, ...props }: ChartTableProps) {
  const parts = useContext(ChartPartsContext);
  const shown = tables ?? parts?.tables;
  if (!shown?.length) return null;
  return (
    <FigureData {...props} summary={summary ?? parts?.summary ?? chartLabels.showTable}>
      {shown.map((table, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: A table has only its place among them.
        <Figures key={index} {...table} />
      ))}
    </FigureData>
  );
}

/** A table of a chart's figures, with any caption, its headings and its rows. */
export type ChartTableData = FigureTable;
/** A row of a chart's table, with its name, a key unique among the rows, and its cells. */
export type ChartTableRow = FigureRow;

type ChartFrameProps = Omit<FigureProps, "title"> &
  ChartLayout & {
    /** What the chart gives its parts. */
    parts: Partial<ChartPartsValue> & Pick<ChartPartsValue, "plot">;
  };

/**
 * A chart set out the same way every time, as The Economist sets its charts. A short rule and a
 * headline sit over a line that says what is measured. Then come the key, the plot, the source at
 * the foot, and the figures in a table beneath, as GOV.UK asks of every chart. Children, if given,
 * set it out instead.
 * @internal
 */
export function ChartFrame({
  parts,
  title,
  subtitle,
  source,
  className = "",
  children,
  ...props
}: ChartFrameProps) {
  const value: ChartPartsValue = {
    key: null,
    brush: null,
    tables: [],
    summary: chartLabels.showTable,
    ...parts,
  };
  return (
    <ChartPartsContext value={value}>
      <Figure {...props} className={`x-govuk-ui-chart ${className}`.trim()}>
        {/* Children set the parts out, even when they render nothing. Only no children at all gives
            the usual order. */}
        {children !== undefined
          ? children
          : [
              <FigureCaption key="caption" title={title} subtitle={subtitle} />,
              <ChartKey key="key" />,
              <ChartPlot key="plot" />,
              <ChartBrush key="brush" />,
              source ? <FigureSource key="source">{source}</FigureSource> : null,
              <ChartTable key="table" />,
            ]}
      </Figure>
    </ChartPartsContext>
  );
}
