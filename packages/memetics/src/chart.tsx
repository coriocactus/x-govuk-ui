"use client";

import {
  type CSSProperties,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ResponsiveContainer } from "recharts";
import type { FigureProps } from "x-govuk-ui";
import type { BrushState } from "./chart-brush";
import { area, bar, CartesianPlot, line, StreamPlot, stream } from "./chart-cartesian";
import {
  type ChartContext,
  type ChartDatum,
  type ChartFigures,
  type ChartKind,
  type ChartReference,
  type ChartSeries,
  type ChartType,
  colourAt,
  type IndexedDatum,
  inkAt,
  placeOf,
  ROW,
  seriesCard,
  seriesHead,
  seriesKey,
  seriesRows,
} from "./chart-context";
import { CellFigure, type FigureTable, useDrawIn, useWidest } from "./chart-frame";
import { extentOf, figureOf, fingerprint, niceScale } from "./chart-maths";
import { ChartFrame, type ChartKeyEntry, type ChartLayout } from "./chart-parts";
import { RadarPlot, RadialPlot, radar, radial } from "./chart-polar";
import {
  DotPlot,
  dot,
  LollipopPlot,
  lollipop,
  SlopePlot,
  slope,
  WaterfallPlot,
  waterfall,
} from "./chart-rank";
import { AxisTitle, HeatmapTable, heatmap, ScatterPlot, scatter } from "./chart-relation";
import { movesLabels, spreadLabels } from "./chart-shapes";
import {
  BeeswarmPlot,
  beeswarm,
  box,
  candlestick,
  HistogramPlot,
  histogram,
  SpreadPlot,
} from "./chart-spread";
import { DonutCentre, donut, FunnelPlot, funnel, PiePlot, pie } from "./chart-whole";
import { type ChartLabels, capitalise, percentIn, plainIn, wordsOf } from "./chart-words";

export type { ChartDatum, ChartReference, ChartSeries, ChartType } from "./chart-context";

/** What sets each type of chart apart, as its family's file records it. */
const KINDS: Record<ChartType, ChartKind> = {
  line,
  area,
  stream,
  slope,
  bar,
  lollipop,
  waterfall,
  dot,
  histogram,
  beeswarm,
  box,
  candlestick,
  scatter,
  heatmap,
  pie,
  donut,
  funnel,
  radar,
  radial,
};

/**
 * What a chart draws and how, without the frame around it, as a Chart and a set's panels give it.
 */
export type ChartOptions = {
  type: ChartType;
  data: readonly ChartDatum[];
  /**
   * The key of each datum's label. The labels name the points along the bottom, a pie's slices, a
   * scatter's points, a slope's lines, a heat map's rows, or a beeswarm's dots.
   */
  category: string;
  /**
   * What the categories are, heading the table's first column and naming the brush's handles,
   * such as "Month". By default, the category's key, capitalised.
   */
  categoryLabel?: string;
  /**
   * The figures to draw, each in the next colour.
   *
   * - A pie, donut, radial, funnel, lollipop, waterfall and histogram draw only the first. A
   *   histogram counts its figures.
   * - A beeswarm sets each series in a row of its own.
   * - A scatter's series are its axes. The first runs across, the second up, and a third, if given,
   *   sets the size of each point.
   * - A slope's series are the times it joins.
   * - A box plot's series are the lowest figure, the lower quartile, the median, the upper quartile
   *   and the highest, in that order.
   * - A candlestick's series are the opening figure, the highest, the lowest and the closing.
   */
  series: readonly ChartSeries[];
  /**
   * Writes a figure on the axis, in the card and in the table, such as "£1.2m". By default, as
   * the `labels`' language writes numbers.
   */
  format?: (value: number) => string;
  /** Stacks bars or areas on one another, instead of side by side or over one another. */
  stacked?: boolean;
  /**
   * With `stacked`, draws each stack as shares of its whole, to 100%, to compare part-to-whole
   * across the categories. The Analysis Function prefers this to several pies.
   */
  normalise?: boolean;
  /**
   * With `stacked` bars, runs one series the other way from a shared baseline, as a population
   * pyramid sets ages by sex. Give that series negative figures. The axis, the card and the table
   * show sizes without the sign.
   */
  diverging?: boolean;
  /**
   * Which way a bar, lollipop, waterfall, dot or box chart runs. `horizontal` sets the categories
   * down the side with the figures across, as the Analysis Function sets most bar charts. It suits
   * long names and ranking. By default, bars, waterfalls and boxes are vertical, and dots and
   * lollipops are horizontal.
   */
  orientation?: "vertical" | "horizontal";
  /**
   * Names the series on the plot, instead of in a row of squares above it, as the Analysis Function
   * asks for lines and pies. Each line's name goes at its end, each sector's beside it, and each
   * ring's at its start. Each bar's figure goes at its end, and each scatter point is named by its
   * label. A slope and a funnel are always named on the plot, and a heat map always shows its
   * figures.
   */
  direct?: boolean;
  /** The words the chart writes itself, such as Total or No figure, for another language. */
  labels?: Partial<ChartLabels>;
  /** How a line or area runs between its points, which is smoothly, straight, or in steps. */
  curve?: "smooth" | "straight" | "step";
  /**
   * The series to pick out, or in a slope chart or a beeswarm the category. It takes the palette's
   * first colour, and the rest turn grey, as the Analysis Function's focus charts set one line
   * among many. A beeswarm names the dots it picks out.
   */
  highlight?: string;
  /**
   * In a histogram, how many bins to count the figures in, of equal width with round edges, or the
   * edges themselves. By default, there are about as many as the figures need, by Sturges' rule.
   */
  bins?: number | readonly number[];
  /**
   * In a waterfall, the categories that are totals, drawn from zero instead of from the step
   * before, such as the year's start and end.
   */
  totals?: readonly string[];
  /** Lines across the plot at places to mark, such as a target, or bands between two. */
  references?: readonly ChartReference[];
  /**
   * The value axis's range, such as `[0, 100]` for percentages, or to share one scale across
   * charts. By default, it fits the figures. In a ChartSet, it is the set's range, where the type
   * has a value axis. A heat map's shades divide it into five.
   */
  domain?: readonly [number, number];
};

export type ChartProps = Omit<FigureProps, "title" | "children" | "description"> &
  ChartLayout &
  ChartOptions & {
    /**
     * Adds a slider beneath a line, area, bar or stream chart of three categories or more, to show
     * part of them, such as one year of many. It has two handles, one for the first category shown
     * and one for the last, over a small drawing of the whole chart. The table keeps every figure.
     */
    brush?: boolean;
    /**
     * The first and last categories a line, area, bar or stream chart shows, by their places in
     * `data`, with or without a brush. At least two are always shown, so a range that names fewer
     * is widened. Leave it out to let the brush keep track.
     */
    range?: readonly [from: number, to: number];
    /** The categories shown at first, by their places, where the brush keeps track. */
    defaultRange?: readonly [from: number, to: number];
    /** Called as the brush changes the categories shown, with the places of the first and last. */
    onRangeChange?: (range: [from: number, to: number]) => void;
    /** The plot's height, in pixels. */
    height?: number;
    /**
     * The chart's point, in a sentence, for screen readers. The figures are in a table beneath it,
     * which anyone can open.
     */
    description: string;
  };

/** Each array of rows, with each row's place, made once for each array a chart is given. */
const indexed = new WeakMap<readonly ChartDatum[], readonly IndexedDatum[]>();
const indexedOf = (rows: readonly ChartDatum[]) => {
  const known =
    indexed.get(rows) ?? rows.map((datum, index): IndexedDatum => ({ ...datum, [ROW]: index }));
  indexed.set(rows, known);
  return known;
};

/**
 * What a chart's props become. That is the rows and series it draws, which way it runs, how it
 * writes figures, and what colours it gives them. Nothing here needs the page, so a Chart set reads
 * its panels' figures too, for its scale, key and tables. `domain` is a set's shared scale, which a
 * type with a value axis takes where its own `domain` is not given.
 */
function figuresOf(
  {
    type,
    data: rows,
    category,
    categoryLabel,
    series,
    format,
    stacked = false,
    normalise = false,
    diverging = false,
    orientation,
    direct = false,
    labels,
    curve = "smooth",
    highlight,
    bins,
    totals = [],
    references = [],
    domain: ownDomain,
  }: ChartOptions,
  shared?: { domain: readonly [number, number]; ticks: number[] },
  [from, to]: readonly [number, number] = [0, rows.length - 1],
): ChartFigures {
  const kind = KINDS[type];
  const words = wordsOf(labels);
  const data = indexedOf(rows).slice(from, to + 1);
  const shown = kind.first ? series.slice(0, 1) : series;
  // By default, bars are vertical and dots horizontal, as the Analysis Function sets them.
  const across = kind.turns ? (orientation ?? kind.turns) === "horizontal" : false;
  const figuresAcross = across || Boolean(kind.across);
  const write = format ?? plainIn(words.locale);
  // A diverging chart's figures are sizes, whichever way they run.
  const figure = (value: number) => write(diverging ? Math.abs(value) : value);
  const share = percentIn(words.locale);
  // In a line, area or bar chart, a series can be drawn as another of the three.
  const cartesian = type === "line" || type === "area" || type === "bar";
  const drawnAs = (each: ChartSeries) => (cartesian ? (each.as ?? type) : type);
  const setDomain = kind.extent ? shared : undefined;
  return {
    type,
    data,
    everything: rows,
    category,
    categoryLabel: categoryLabel ?? (category === "" ? "" : capitalise(category)),
    shown,
    direct,
    highlight,
    bins,
    totals,
    references,
    domain: normalise ? [0, 1] : (ownDomain ?? setDomain?.domain),
    ticks: !normalise && !ownDomain ? setDomain?.ticks : undefined,
    stacked,
    normalise,
    diverging,
    turns: Boolean(kind.turns),
    across,
    figuresAcross,
    lineType: ({ smooth: "monotone", straight: "linear", step: "stepAfter" } as const)[curve],
    words,
    figure,
    axisFigure: normalise ? share : figure,
    // Recharts gives a label's formatter its value untyped, and here it is always a figure.
    labelFigure: (value) => {
      const number = figureOf(value);
      return number === null ? "" : figure(number);
    },
    share,
    colourOf: (each) => colourAt(placeOf(highlight, shown, each)),
    // Words in a series' colour take its ink, which reads on the paper, and a grey series' words
    // the page's muted ink.
    inkFor: (each) => inkAt(placeOf(highlight, shown, each)),
    drawnAs,
    // A band about a line is an area, which only Recharts' composed chart draws beside a line.
    mixed:
      cartesian && shown.some((each) => drawnAs(each) !== type || (type === "line" && each.range)),
    // Only the chart's own kind stacks, with bars on bars and areas on areas. A line is drawn over
    // them.
    stackable:
      stacked && (type === "bar" || type === "area")
        ? shown.filter((each) => drawnAs(each) === type)
        : [],
    endLabels: direct && (type === "line" || type === "area"),
    // A reference line's label stands above a plot whose figures run along the line it crosses.
    uprightReference: references.some(
      (reference) =>
        reference.label &&
        reference.to === undefined &&
        (typeof reference.at === "number") === figuresAcross,
    ),
    // A figure with its range, in its series' own format if it has one.
    withRange: (datum, each) => {
      const own = each.format ?? figure;
      const value = figureOf(datum?.[each.key]);
      if (value === null) return <CellFigure value={null} format={own} missing={words.noFigure} />;
      const [lowKey, highKey] = each.range ?? [];
      const low = lowKey ? figureOf(datum?.[lowKey]) : null;
      const high = highKey ? figureOf(datum?.[highKey]) : null;
      if (low === null || high === null) return own(value);
      return `${own(value)} (${words.range(own(low), own(high))})`;
    },
    // A share of nothing, or of an unknown whole, is no figure, instead of one made up.
    shareOf: (value, whole) =>
      value === null || !whole ? (
        <CellFigure value={null} format={share} missing={words.noFigure} />
      ) : (
        share(value / whole)
      ),
    // The row a point stands for, by the place every copy of a row keeps. Two rows may share a
    // category, and Recharts gives some plots' points as copies of their rows.
    rowOf: (point) => {
      const place = point?.[ROW];
      return typeof place === "number" ? rows[place] : undefined;
    },
  };
}

/** A chart's key, which is its type's own, or each series in its colour. */
const keyOf = (figures: ChartFigures): ChartKeyEntry[] | null => {
  const kind = KINDS[figures.type];
  return kind.key ? kind.key(figures) : seriesKey(figures);
};

/** A chart's table, or none where the chart is its own table. */
const tableOf = (figures: ChartFigures, caption?: ReactNode): FigureTable | null => {
  const kind = KINDS[figures.type];
  if (kind.untabled) return null;
  return {
    caption,
    head: (kind.head ?? seriesHead)(figures),
    rows: (kind.rows ?? seriesRows)(figures),
  };
};

/** The places of the first and last category shown, kept within the rows, a category apart. */
const within = ([from, to]: readonly [number, number], count: number): [number, number] => {
  const first = Math.min(Math.max(0, Math.round(from) || 0), count - 2);
  return [first, Math.min(Math.max(first + 1, Math.round(to) || 0), count - 1)];
};

/**
 * A chart drawn by Recharts, set out the same way every time, as The Economist sets its charts. A
 * short rule and a headline sit over a line that says what is measured. It has a key in squares,
 * only horizontal gridlines, the figures on the right, and the source at the foot.
 *
 * The colours are the Government Analysis Function's, which users with colour blindness can tell
 * apart. The chart follows its guidance. Bars can run across and rank, a stack can show shares, a
 * line can mark a target, a band can show uncertainty, and the series can be named on the plot
 * itself.
 *
 * The lines draw in, and the bars and slices grow, as the chart first shows, unless motion is
 * reduced. New figures move into place, and a change to the chart itself, such as its type, shows
 * at once. Moving over the plot shows each figure in a card. The figures are also in a table, in a
 * Details beneath, as GOV.UK asks of every chart. A heat map is the table itself, with its cells
 * shaded.
 *
 * Its parts can be set out as a service needs, as its children. They are `FigureCaption`,
 * `ChartKey`, `ChartPlot`, `ChartBrush`, `FigureSource` and `ChartTable`.
 */
export function Chart(props: ChartProps) {
  const {
    type,
    data: rows,
    category,
    categoryLabel,
    series,
    format,
    stacked,
    normalise,
    diverging,
    orientation,
    direct,
    labels,
    curve,
    highlight,
    bins,
    totals,
    references,
    domain,
    brush = false,
    range,
    defaultRange,
    onRangeChange,
    height = 280,
    description,
    className = "",
    ...rest
  } = props;
  const kind = KINDS[type];

  // With a range, the plot draws the categories between its ends, and the table keeps them all.
  const rangeable = Boolean(kind.ranges) && rows.length >= 2;
  const [ownRange, setOwnRange] = useState(defaultRange ?? null);
  const chosen = range ?? ownRange;
  const span: [number, number] =
    rangeable && chosen ? within(chosen, rows.length) : [0, rows.length - 1];
  const changeRange = (next: [number, number]) => {
    setOwnRange(next);
    onRangeChange?.(next);
  };
  // The options are read from the props themselves, and the rest go to the frame.
  const figures = figuresOf(props, undefined, span);
  // Two categories are the fewest shown, so a brush over two would have nothing to choose.
  const brushState: BrushState | null =
    brush && rangeable && rows.length > 2
      ? {
          data: rows,
          category,
          categoryLabel: categoryLabel ?? category,
          series: figures.shown,
          colours: figures.shown.map(figures.colourOf),
          from: span[0],
          to: span[1],
          onRangeChange: changeRange,
          words: figures.words,
        }
      : null;
  const table = tableOf(figures);
  return (
    <ChartFrame
      {...rest}
      className={className}
      description={kind.untabled ? description : undefined}
      parts={{
        key: keyOf(figures),
        // An element, not a drawing. Each ChartPlot that shows it mounts a drawing of its own,
        // which measures and watches itself.
        plot: <ChartDrawing figures={figures} description={description} height={height} />,
        brush: brushState,
        tables: table ? [table] : [],
        summary: figures.words.showTable,
      }}
    />
  );
}

/**
 * What a drawing is given, which is its figures, its point in a sentence, its height and a set's
 * pointer.
 */
type DrawingProps = {
  figures: ChartFigures;
  description: string;
  height: number;
  sync?: ChartContext["sync"];
};

/**
 * A chart's drawing, which is the plot, or for a heat map the table of shaded figures.
 * @internal
 */
function ChartDrawing({ figures, description, height, sync }: DrawingProps) {
  if (KINDS[figures.type].untabled) return <HeatmapTable chart={figures} />;
  return <PlotDrawing figures={figures} description={description} height={height} sync={sync} />;
}

/**
 * The plot Recharts draws, with what the page tells it. That is the space its labels need, measured
 * in the page's font, the labels it moves apart once drawn, and for a beeswarm the plot's size.
 * Each mounted plot measures and watches itself, so a plot shown late, again or twice is drawn
 * correctly.
 * @internal
 */
function PlotDrawing({ figures, description, height, sync = {} }: DrawingProps) {
  const kind = KINDS[figures.type];
  const { type, shown, data, category } = figures;
  const keys = [category, ...shown.flatMap((each) => [each.key, ...(each.range ?? [])])];
  const structure = [
    type,
    figures.across,
    figures.stacked,
    figures.normalise,
    figures.diverging,
    figures.lineType,
    figures.highlight,
    JSON.stringify(figures.bins),
    ...shown.map((each) => `${each.key}:${each.as ?? ""}`),
    fingerprint(data, [category]),
  ].join("\u0000");
  const animation = useDrawIn(structure, fingerprint(data, keys));

  // Labels past the plot's edge need space there, as wide as the widest, measured in the page's
  // font. These are the names at the ends of lines, the figures beyond horizontal bars, a slope's
  // names and figures at both ends, a funnel's stages and a beeswarm's rows.
  const plot = useRef<HTMLDivElement>(null);
  const outside = kind.outside?.(figures);
  const labelRoom = useWidest(plot, outside?.labels ?? [], outside?.bold ? 700 : 400);
  const room = labelRoom ? labelRoom + 10 : 0;

  // Labels that Recharts sets on top of one another, such as the names of lines ending close
  // together, are moved apart once they are drawn, and again as the plot changes.
  const floating = Boolean(kind.floats?.(figures));
  useLayoutEffect(() => {
    const element = plot.current;
    if (!floating || !element) return;
    // Recharts sets each label's place again as its animation ends, so their places are observed
    // as well as their arrival. The card under the pointer changes as it moves, and moves no label,
    // so its changes are ignored. A pass that moves nothing sets nothing, so the observer sees no
    // change and the passes stop.
    let frame = 0;
    const spread = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => spreadLabels(element));
    };
    const changes = new MutationObserver((records) => {
      if (movesLabels(records)) spread();
    });
    changes.observe(element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["y"],
    });
    const sizes = new ResizeObserver(spread);
    sizes.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      changes.disconnect();
      sizes.disconnect();
    };
  }, [floating]);

  // A beeswarm packs its dots in pixels, so it follows the plot's size.
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = plot.current;
    if (type !== "beeswarm" || !element) return;
    const sizes = new ResizeObserver(() =>
      setBox({ width: element.clientWidth, height: element.clientHeight }),
    );
    sizes.observe(element);
    return () => sizes.disconnect();
  }, [type]);

  const chart: ChartContext = {
    ...figures,
    animation,
    room,
    box,
    sync,
    // Labels above upright bars and dots need space at the top. The label of an upright reference
    // line needs it too, because it sits above the plot, where no bar can be under it.
    margin: {
      top: kind.labelsAbove?.(figures) || figures.uprightReference ? 18 : 5,
      right: figures.direct && figures.across ? Math.max(5, room) : 5,
      bottom: 5,
      left: 5,
    },
    card: (point) => (point ? (kind.card ?? seriesCard)(figures, point) : null),
    cursor: kind.cursor ?? "line",
  };
  return (
    <>
      {type === "scatter" && <AxisTitle chart={figures} axis="y" />}
      {/* The plot is a picture for screen readers, described in a sentence. The table has its
          figures. */}
      <div
        ref={plot}
        className="x-govuk-ui-chart-plot"
        role="img"
        aria-label={description}
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PlotOf chart={chart} />
        </ResponsiveContainer>
        {type === "donut" && <DonutCentre chart={figures} />}
      </div>
      {type === "scatter" && <AxisTitle chart={figures} axis="x" />}
    </>
  );
}

/**
 * The plot of the chart's type, drawn by its family.
 * @internal
 */
function PlotOf({ chart }: { chart: ChartContext }) {
  switch (chart.type) {
    case "line":
    case "area":
    case "bar":
      return <CartesianPlot chart={chart} />;
    case "stream":
      return <StreamPlot chart={chart} />;
    case "slope":
      return <SlopePlot chart={chart} />;
    case "lollipop":
      return <LollipopPlot chart={chart} />;
    case "waterfall":
      return <WaterfallPlot chart={chart} />;
    case "dot":
      return <DotPlot chart={chart} />;
    case "histogram":
      return <HistogramPlot chart={chart} />;
    case "beeswarm":
      return <BeeswarmPlot chart={chart} />;
    case "box":
    case "candlestick":
      return <SpreadPlot chart={chart} />;
    case "scatter":
      return <ScatterPlot chart={chart} />;
    case "pie":
    case "donut":
      return <PiePlot chart={chart} />;
    case "funnel":
      return <FunnelPlot chart={chart} />;
    case "radar":
      return <RadarPlot chart={chart} />;
    case "radial":
      return <RadialPlot chart={chart} />;
    case "heatmap":
      return null;
  }
}

/** One panel of a ChartSet, with a chart's figures, how it draws them, and its own title. */
export type ChartSetPanel = ChartOptions & {
  /** The panel's title, above its plot, such as a region's name. */
  title: ReactNode;
  /** The panel's point, in a sentence, for screen readers, because its plot is a picture. */
  description: string;
};

export type ChartSetProps = Omit<FigureProps, "title" | "children" | "description"> &
  ChartLayout & {
    /**
     * The panels, each a chart's figures with its title, in the order they are read. They share
     * the set's key, source and tables, and the panels of types with a value axis share one scale.
     */
    panels: readonly ChartSetPanel[];
    /** How many panels sit side by side before they wrap. On a phone they stack. */
    columns?: number;
    /** The height of each panel's plot, in pixels. */
    height?: number;
    /**
     * The set's point, in a sentence, for screen readers. Each panel describes itself as well, and
     * every panel's figures are in the tables beneath.
     */
    description: string;
    /**
     * The words the set and its panels write themselves, such as its Details' summary, for another
     * language. A panel's own `labels` override them.
     */
    labels?: Partial<ChartLabels>;
  };

/**
 * Small multiples, which are several charts of one kind, side by side. Each shows one slice of the
 * figures on one shared scale, so the eye compares them without reading the axes. The Analysis
 * Function suggests this instead of a crowded chart. The set has one headline, one key and one
 * source, and each panel keeps its own title.
 *
 * Moving over one panel shows the same category in every panel's card. The figures for every panel
 * are in tables beneath. The panels are given as data, so the scale is known before any is drawn.
 * The set's parts can be set out as its children, as a Chart's can, with `ChartPlot` as the
 * panels.
 */
export function ChartSet({
  panels,
  columns = 3,
  height = 160,
  description,
  labels,
  className = "",
  style,
  ...props
}: ChartSetProps) {
  const syncId = useId();
  const words = wordsOf(labels);
  // A panel's words are the set's, overridden by its own.
  const options = panels.map((panel) => ({ ...panel, labels: { ...labels, ...panel.labels } }));
  // One scale for the panels of types with a value axis, from the lowest figure they draw to the
  // highest, including zero, because bars stand on it.
  const extents = options.flatMap((panel) => KINDS[panel.type].extent?.(figuresOf(panel)) ?? []);
  const [low, high] = extentOf([0, ...extents]) ?? [0, 1];
  const shared = niceScale(low, high);
  const figures = options.map((panel) => figuresOf(panel, shared));
  const first = figures[0];
  return (
    <ChartFrame
      {...props}
      className={`x-govuk-ui-chart-set ${className}`.trim()}
      style={{ "--x-govuk-ui-chart-set-columns": columns, ...style } as CSSProperties}
      description={description}
      parts={{
        key: first ? keyOf(first) : null,
        summary: words.showTables,
        tables: figures.flatMap((each, index) => tableOf(each, panels[index]?.title) ?? []),
        // The set's point is read with its title. Each panel's plot is a picture of its own.
        plot: (
          <div className="x-govuk-ui-chart-set-panels">
            {figures.map((each, index) => (
              <ChartPanel
                // biome-ignore lint/suspicious/noArrayIndexKey: A panel has only its place in the set.
                key={index}
                title={panels[index]?.title}
                drawing={
                  <ChartDrawing
                    figures={each}
                    description={panels[index]?.description ?? ""}
                    height={height}
                    sync={{ syncId, syncMethod: "value" }}
                  />
                }
              />
            ))}
          </div>
        ),
      }}
    />
  );
}

/**
 * A panel of a ChartSet, with only its title over its plot, because the set has the key, source and
 * table. The panels share one pointer, matched by category. Moving over March in one panel shows
 * March in each, wherever it falls among that panel's categories.
 * @internal
 */
function ChartPanel({ title, drawing }: { title: ReactNode; drawing: ReactNode }) {
  const titleId = useId();
  return (
    <figure className="x-govuk-ui-chart x-govuk-ui-chart-panel" aria-labelledby={titleId}>
      <figcaption id={titleId} className="x-govuk-ui-chart-panel-title">
        {title}
      </figcaption>
      {drawing}
    </figure>
  );
}
