"use client";

/**
 * What every type of Chart shares. That is the data's types, what a chart's props become once read,
 * the record each type of chart is, and what most types do alike. Each family of types, in a file
 * of its own, draws its plot from these and fills in its records.
 * @internal
 */
import type { ReactNode } from "react";
import { CellFigure, ChartCard, type FigureRow, type useDrawIn } from "./chart-frame";
import { extentOf, figureOf } from "./chart-maths";
import { colour, inkOf, muted } from "./chart-palette";
import type { ChartKeyEntry } from "./chart-parts";
import type { ChartLabels } from "./chart-words";

export type ChartSeries = {
  /** The key of each datum's figure for this series. */
  key: string;
  /** What the series is, in the key, the card and the table, such as "12 months". */
  label: string;
  /**
   * In a line, area or bar chart, draws this series differently from the chart's type. Bars can
   * then have a line over them, such as a total or an average, on the same scale.
   */
  as?: "line" | "area" | "bar";
  /** Draws a line dashed, as for a projection or an estimate. */
  dashed?: boolean;
  /**
   * The key of the series this one continues, such as the figures a projection follows. This series
   * takes that series' colour. A key that names no series leaves this series its own colour.
   */
  continues?: string;
  /**
   * Writes this series' figures in its table column and the card, where they are in different units
   * from the chart's `format`, such as a scatter's third measure, its points' size.
   */
  format?: (value: number) => string;
  /**
   * The keys of the series' lower and upper bounds, such as a confidence interval. It is drawn as a
   * shaded band about a line, or a bar across the end of a bar. The table and the card give them in
   * brackets.
   */
  range?: readonly [low: string, high: string];
};
/**
 * A row of figures, with its category and a figure for each series. A missing figure is `null`, and
 * is never drawn or written as zero. Two rows may share a category, though the key, the card and
 * the table name each row by it. Keys beginning with the null character, `"\u0000"`, are reserved
 * for the chart, for the copies of rows it draws from.
 */
export type ChartDatum = Record<string, string | number | null>;
/**
 * What the chart draws, chosen by what the figures say, as the Analysis Function asks.
 *
 * - For change over time, use `line` or `area`, `slope` for change between two times, or `stream`
 *   for areas stacked about a centre line, read by their thickness instead of a scale.
 * - For size and ranking, use `bar` or `lollipop`, or `waterfall` for the steps from one total to
 *   another.
 * - For comparison within a category, use `dot`, which joins one or two figures in each category.
 * - For distribution, use `histogram` for how many figures fall in each band of a range,
 *   `beeswarm` for every figure as a dot along a scale, `box` for the spread of figures in each
 *   category, or `candlestick` for how a figure opened, ranged and closed in each period.
 * - For relationships, use `scatter`, a bubble chart with a third series, or `heatmap`, a table of
 *   figures shaded by size.
 * - For part to whole, use `pie`, `donut` for a pie with the whole in its middle, or `funnel` for
 *   how many are left at each step.
 * - For several measures of one thing, use `radar`, or `radial` for bars bent around a centre.
 *   Both are hard to read exactly, so users read their figures in the table beneath.
 */
export type ChartType =
  | "line"
  | "area"
  | "stream"
  | "slope"
  | "bar"
  | "lollipop"
  | "waterfall"
  | "dot"
  | "histogram"
  | "beeswarm"
  | "box"
  | "candlestick"
  | "scatter"
  | "heatmap"
  | "pie"
  | "donut"
  | "funnel"
  | "radar"
  | "radial";
/** A line across the plot at a place to mark, such as a target, or a band between two places. */
export type ChartReference = {
  /**
   * Where it sits, as a figure on the value axis, such as a target, or a category, such as the
   * month the rules changed.
   */
  at: number | string;
  /** Where a band ends, such as the last month of a period, or the top of a range of figures. */
  to?: number | string;
  /** What it marks, written beside it. */
  label?: string;
};

/** The colours of a rise, a fall and a total, wherever a chart tells them apart. */
export const RISE = colour(1);
export const FALL = colour(3);
export const TOTAL = colour(0);
/**
 * Keys a chart adds to its own copies of the data. They begin with the null character, which
 * `ChartDatum` reserves for the chart, so a service's keys never clash with them.
 */
export const LOW = "\u0000low";
export const HIGH = "\u0000high";
export const STEP = "\u0000step";
export const CENTRE = "\u0000category";
/** A point's figure, where a plot draws one figure of a row as a point of its own. */
export const VALUE = "\u0000value";
/** A beeswarm dot's place up its row. */
export const UP = "\u0000up";
/**
 * The place of the row a copy of a datum was made from, so the card finds the row, whatever
 * Recharts copies and however many rows share its category.
 */
export const ROW = "\u0000row";
/** The value axis's width beside an upright plot, which the axis titles beneath line up with. */
export const VALUE_AXIS_WIDTH = 56;

/**
 * A series' place in the palette. It is its own place, or that of the series it continues, because
 * a series that continues another takes no place of its own. A series that names a missing series
 * keeps its own place. While another series is picked out, it has no place, and is grey.
 */
export const placeOf = (
  highlight: string | undefined,
  series: readonly ChartSeries[],
  each: ChartSeries,
) => {
  const root = series.find((one) => one.key === each.continues) ?? each;
  if (highlight !== undefined) return root.key === highlight ? 0 : null;
  const roots = series.filter((one) => !series.some((other) => other.key === one.continues));
  return roots.indexOf(root);
};

/** A row of a chart's copy of the data, with the place of the row it was made from. */
export type IndexedDatum = ChartDatum & { [ROW]: number };

/**
 * What a chart's props become, once read. That is the rows and series it draws, how it writes
 * figures, and what colours it gives them. A Chart set reads each panel's figures to make its key
 * and tables, because nothing here needs the page.
 */
export type ChartFigures = {
  /** What the chart draws. */
  type: ChartType;
  /** The rows the plot draws, each with its place. That is every row, or those its range shows. */
  data: readonly IndexedDatum[];
  /** Every row, for the table. */
  everything: readonly ChartDatum[];
  /** The key of each row's category. */
  category: string;
  /** What the categories are, heading the table's first column. */
  categoryLabel: string;
  /** The series the chart draws, which is all of them, or the first for a type that draws one. */
  shown: readonly ChartSeries[];
  /** Whether the plot names its series, instead of a key. */
  direct: boolean;
  /** The series or category picked out. */
  highlight?: string;
  /** A histogram's bins, by count or by their edges. */
  bins?: number | readonly number[];
  /** A waterfall's totals, by category. */
  totals: readonly string[];
  /** The lines and bands across the plot. */
  references: readonly ChartReference[];
  /** The value axis's range, as given, or as the set's, or as a share's. */
  domain?: readonly [number, number];
  /** The value axis's figures, which a set's panels share. */
  ticks?: number[];
  /** Whether bars or areas stack. */
  stacked: boolean;
  /** Whether stacks are shares of their whole. */
  normalise: boolean;
  /** Whether one series runs the other way from zero. */
  diverging: boolean;
  /** Whether the chart can run either way. */
  turns: boolean;
  /** Whether the categories run down the side and the figures across. */
  across: boolean;
  /**
   * Whether the figures run across, as a histogram's and a beeswarm's do, though they never turn.
   */
  figuresAcross: boolean;
  /** How a line runs between its points, as Recharts names it. */
  lineType: "monotone" | "linear" | "stepAfter";
  /** The chart's own words, in its language. */
  words: ChartLabels;
  /** Writes a figure, as the service's `format` does, with a diverging chart's without its sign. */
  figure: (value: number) => string;
  /** Writes a figure on the value axis, as a share where the stacks are shares. */
  axisFigure: (value: number) => string;
  /** Writes a label's figure, or nothing where it has none. */
  labelFigure: (value: unknown) => string;
  /** Writes a share, such as 22%, in the chart's language. */
  share: (value: number) => string;
  /** A series' colour, from its place in the palette, or grey while another is picked out. */
  colourOf: (each: ChartSeries) => string;
  /** A series' colour for words on the paper, which is its ink, or the muted ink while grey. */
  inkFor: (each: ChartSeries) => string;
  /** How a series is drawn, as itself in a mix of lines, areas and bars, or as the chart's type. */
  drawnAs: (each: ChartSeries) => ChartType;
  /**
   * Whether lines, areas and bars mix, or a line has a band, which needs Recharts' composed chart.
   */
  mixed: boolean;
  /** The series that stack, of the chart's own kind. */
  stackable: readonly ChartSeries[];
  /** Whether each line's or area's name sits at its end. */
  endLabels: boolean;
  /** Whether a reference line's label stands above the plot, which needs space there. */
  uprightReference: boolean;
  /** A figure with its range, if it has one, as the table and the card give it. */
  withRange: (datum: ChartDatum | undefined, each: ChartSeries) => ReactNode;
  /** A share, or a missing figure's words where there is no whole to be a share of. */
  shareOf: (value: number | null, whole: number | null) => ReactNode;
  /** The row a point under the pointer stands for. */
  rowOf: (point: Record<string, unknown> | undefined) => ChartDatum | undefined;
};

/** Recharts' margin about a plot. */
type Margin = { top: number; right: number; bottom: number; left: number };

/** What a chart's plot is drawn from, which is its figures and what the page tells it. */
export type ChartContext = ChartFigures & {
  /** How Recharts draws the plot in, and moves it to new figures. */
  animation: ReturnType<typeof useDrawIn>;
  /** Recharts' margin about the plot. */
  margin: Margin;
  /** The space beside the plot that labels outside it need, in pixels. */
  room: number;
  /** The plot's size, for a beeswarm, which packs its dots in pixels. */
  box: { width: number; height: number };
  /** The pointer a Chart set's panels share, matched by category. */
  sync: { syncId?: string; syncMethod?: "value" };
  /** The card under the pointer, for a point Recharts gives. */
  card: (point: Record<string, unknown> | undefined) => ReactNode;
  /** The cursor under the pointer, which is a band over a bar, or a line. */
  cursor: "band" | "line";
};

/**
 * One type of chart, as a record of what sets it apart. Its family's plot draws it, and the rest is
 * here. That is which series it draws, which way it runs, what its key, card and table give, and
 * what needs space beside the plot. Where a record leaves out a field, the type does as most types
 * do.
 */
export type ChartKind = {
  /** Draws only the first series, as a pie does. */
  first?: boolean;
  /** Can run either way, and the way it runs by default. */
  turns?: "vertical" | "horizontal";
  /** Its figures run across the plot, though it does not turn. */
  across?: boolean;
  /** Can show part of its categories, by a brush or a `range`. */
  ranges?: boolean;
  /** The cursor under the pointer, which is a band over a bar, or by default a line. */
  cursor?: "band" | "line";
  /** Its key. By default, each series in its colour, where there are two or more. */
  key?: (chart: ChartFigures) => ChartKeyEntry[] | null;
  /** Words set outside the plot, which need space there, and whether they are bold. */
  outside?: (chart: ChartFigures) => { labels: string[]; bold?: boolean } | null;
  /** Whether its labels may sit on one another, and are moved apart once drawn. */
  floats?: (chart: ChartFigures) => boolean;
  /** Whether labels stand above its bars or dots, which needs space above the plot. */
  labelsAbove?: (chart: ChartFigures) => boolean;
  /** Its table's headings. By default, its categories and each series. */
  head?: (chart: ChartFigures) => ReactNode[];
  /** Its table's rows. By default, a row for each category with each series' figure. */
  rows?: (chart: ChartFigures) => FigureRow[];
  /** Its card under the pointer. By default, each series' figure in the row pointed at. */
  card?: (chart: ChartFigures, point: Record<string, unknown>) => ReactNode;
  /** Has no table beneath, because a heat map is its own table. */
  untabled?: boolean;
  /**
   * The lowest and highest figures its value axis must show, as it draws them, from its stacks, its
   * steps, its ranges and its references. A Chart set shares one scale among the panels of types
   * that have one, from the lowest of them to the highest.
   */
  extent?: (chart: ChartFigures) => readonly [number, number] | null;
};

/**
 * The figures a chart's value axis must show, as most types draw them. These are each series'
 * figures, the bounds of its range, and the figures its references mark.
 */
export function valuesExtent(chart: ChartFigures): readonly [number, number] | null {
  const values: number[] = [];
  for (const datum of chart.data)
    for (const each of chart.shown)
      for (const key of [each.key, ...(each.range ?? [])]) {
        const value = figureOf(datum[key]);
        if (value !== null) values.push(value);
      }
  for (const reference of chart.references)
    for (const at of [reference.at, reference.to])
      if (typeof at === "number" && Number.isFinite(at)) values.push(at);
  return extentOf(values);
}

/** The key most types have, with each series in its colour, where there are two or more. */
export function seriesKey({
  type,
  shown,
  colourOf,
  drawnAs,
}: ChartFigures): ChartKeyEntry[] | null {
  if (shown.length < 2) return null;
  const mixed = shown.some((each) => drawnAs(each) !== type);
  // Squares, as the key always has, but in a mix a line shows as a line, and a dashed line dashed.
  const markOf = (each: ChartSeries): ChartKeyEntry["mark"] => {
    if (each.dashed) return "dashed";
    if (mixed && drawnAs(each) === "line") return "line";
    return "square";
  };
  return shown.map((each) => ({ label: each.label, colour: colourOf(each), mark: markOf(each) }));
}

/**
 * The series in the order they are drawn. The one picked out comes last, over the grey ones, and
 * the rest keep their order.
 */
export const highlightedLast = (shown: readonly ChartSeries[], highlight: string | undefined) =>
  [...shown].sort((a, b) => Number(a.key === highlight) - Number(b.key === highlight));

/** Each row's figures written as labels, beyond the bars' ends in a horizontal chart. */
export const endFigures = (chart: ChartFigures) =>
  chart.direct && chart.across
    ? {
        labels: chart.data.flatMap((datum) =>
          chart.shown.map((each) => chart.labelFigure(datum[each.key])),
        ),
      }
    : null;

/** Whether labels stand above upright bars or dots, which needs space above the plot. */
export const labelsAbove = (chart: ChartFigures) => chart.direct && !chart.across;

/** A key of each category in its colour, as a pie's and a radial's are. */
export const categoryKey = ({ everything, category }: ChartFigures): ChartKeyEntry[] =>
  everything.map((datum, index) => ({ label: String(datum[category]), colour: colour(index) }));

/** A key of the colours of rising and falling, as a candlestick's and a slope's are. */
export const roseFellKey = ({ words }: ChartFigures, mark: "line" | "hollow"): ChartKeyEntry[] => [
  { label: words.rose, colour: RISE, mark },
  { label: words.fell, colour: FALL, mark: mark === "hollow" ? "square" : mark },
];

/** The headings most types have, with what the categories are, then each series. */
export const seriesHead = (chart: ChartFigures): ReactNode[] => [
  chart.categoryLabel,
  ...chart.shown.map((each) => each.label),
];

/** The rows most types have, with each category, and each series' figure and its range. */
export const seriesRows = (chart: ChartFigures): FigureRow[] =>
  chart.everything.map((datum, index) => ({
    key: `${index}`,
    name: datum[chart.category],
    cells: chart.shown.map((each) => chart.withRange(datum, each)),
  }));

/** The card most types have, with the row's category, then each series' figure, in its colour. */
export function seriesCard(
  chart: ChartFigures,
  point: Record<string, unknown>,
  coloured = true,
): ReactNode {
  const datum = chart.rowOf(point);
  if (!datum) return null;
  return (
    <ChartCard
      heading={String(datum[chart.category] ?? "")}
      entries={chart.shown.map((each) => ({
        key: each.key,
        name: each.label,
        value: chart.withRange(datum, each),
        colour: coloured ? chart.colourOf(each) : undefined,
      }))}
    />
  );
}

/** A card of each series' figure as it is, without colours or ranges, as a box's five figures. */
export function plainCard(chart: ChartFigures, point: Record<string, unknown>): ReactNode {
  const datum = chart.rowOf(point);
  if (!datum) return null;
  return (
    <ChartCard
      heading={String(datum[chart.category] ?? "")}
      entries={chart.shown.map((each) => ({
        key: each.key,
        name: each.label,
        value: (
          <CellFigure
            value={datum[each.key]}
            format={each.format ?? chart.figure}
            missing={chart.words.noFigure}
          />
        ),
      }))}
    />
  );
}

/** A series' ink for its name on the plot, which is its colour's ink, or muted ink while grey. */
export const inkAt = (place: number | null) =>
  place === null ? "var(--x-govuk-ui-muted)" : inkOf(place);
/** A series' colour, from its place in the palette, or grey while another is picked out. */
export const colourAt = (place: number | null) => (place === null ? muted : colour(place));
