"use client";

/**
 * How figures are spread. This covers a histogram's bins, a beeswarm's every figure, a box plot's
 * quartiles, and a candlestick's open, high, low and close.
 * @internal
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  type ChartContext,
  type ChartDatum,
  type ChartFigures,
  type ChartKind,
  HIGH,
  LOW,
  plainCard,
  ROW,
  roseFellKey,
  seriesKey,
  UP,
  VALUE,
  VALUE_AXIS_WIDTH,
  valuesExtent,
} from "./chart-context";
import { ChartCard } from "./chart-frame";
import { type Bin, binsOf, extentOf, figureOf, niceScale, swarmOf } from "./chart-maths";
import { colour, muted } from "./chart-palette";
import {
  BoxShape,
  CandleShape,
  ChartAxes,
  ChartTooltip,
  PointLabel,
  ReferenceMarks,
  type ShapeProps,
} from "./chart-shapes";
import { plainIn } from "./chart-words";

/** A beeswarm's dot radius, small because there are many dots. */
const SWARM_RADIUS = 4.5;
/** The area Recharts sizes a beeswarm's dots by. */
const SWARM_AREA = Math.PI * SWARM_RADIUS * SWARM_RADIUS;
/** The height of the axis beneath a beeswarm, which its rows share the plot with. */
const SWARM_AXIS_HEIGHT = 30;

/** The figures of the first series, without the missing ones, which a histogram counts. */
const firstFigures = (chart: ChartFigures, data: readonly ChartDatum[]) =>
  data.flatMap((datum) => {
    const value = figureOf(datum[chart.shown[0]?.key ?? ""]);
    return value === null ? [] : [value];
  });

export const histogram: ChartKind = {
  first: true,
  across: true,
  cursor: "band",
  key: () => null,
  // A histogram's table counts the figures in each bin, as its bars do.
  head: (chart) => [chart.shown[0]?.label ?? "", chart.words.number],
  rows: (chart) => {
    const count = plainIn(chart.words.locale);
    return binsOf(firstFigures(chart, chart.everything), chart.bins).map((bin) => ({
      key: String(bin.low),
      name: chart.words.range(chart.figure(bin.low), chart.figure(bin.high)),
      cells: [count(bin.count)],
    }));
  },
  // A histogram's bar is a bin of figures, not a row.
  card: (chart, point) => {
    const bin = point as Partial<Bin>;
    if (bin.low === undefined || bin.high === undefined) return null;
    return (
      <ChartCard
        heading={chart.words.range(chart.figure(bin.low), chart.figure(bin.high))}
        entries={[
          {
            key: "count",
            name: chart.words.number,
            value: plainIn(chart.words.locale)(bin.count ?? 0),
            colour: colour(0),
          },
        ]}
      />
    );
  },
};

export const beeswarm: ChartKind = {
  across: true,
  // A beeswarm picks out a category, not a series, and names its dots itself.
  key: (chart) => (chart.highlight === undefined ? seriesKey(chart) : null),
  // Each row is named down the side, as wide as the widest name.
  outside: (chart) => ({ labels: chart.shown.map((each) => each.label) }),
  floats: (chart) => chart.highlight !== undefined,
  extent: valuesExtent,
};

export const box: ChartKind = {
  turns: "vertical",
  cursor: "band",
  key: () => null,
  card: plainCard,
  extent: valuesExtent,
};

export const candlestick: ChartKind = {
  cursor: "band",
  key: (chart) => roseFellKey(chart, "hollow"),
  card: plainCard,
  extent: valuesExtent,
};

/**
 * A histogram. The bars touch, because a histogram's bins run on from one to the next. The scale's
 * figures sit at their edges.
 * @internal
 */
export function HistogramPlot({ chart }: { chart: ChartContext }) {
  const binned = binsOf(firstFigures(chart, chart.data), chart.bins);
  const edges = [...binned.map((bin) => bin.low), binned.at(-1)?.high ?? 1];
  return (
    <BarChart
      data={binned}
      accessibilityLayer={false}
      margin={chart.margin}
      barCategoryGap={0}
      barGap={0}
      {...chart.sync}
    >
      <CartesianGrid vertical={false} className="x-govuk-ui-chart-grid" />
      <XAxis
        type="number"
        dataKey="middle"
        domain={[edges[0] ?? 0, edges.at(-1) ?? 1]}
        ticks={edges}
        tickFormatter={chart.figure}
        tickLine={false}
        axisLine={{ className: "x-govuk-ui-chart-baseline" }}
        tick={{ className: "x-govuk-ui-chart-tick" }}
        tickMargin={8}
        interval="preserveStartEnd"
      />
      <YAxis
        type="number"
        orientation="right"
        width={VALUE_AXIS_WIDTH}
        allowDecimals={false}
        axisLine={false}
        tickLine={false}
        tick={{ className: "x-govuk-ui-chart-tick" }}
      />
      <ReferenceMarks chart={chart} across={true} />
      <ChartTooltip chart={chart} />
      <Bar
        dataKey="count"
        name={chart.shown[0]?.label}
        fill={colour(0)}
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth={1}
        {...chart.animation}
      />
    </BarChart>
  );
}

/**
 * A beeswarm, with each series a row of dots along one scale. Each dot moves off the row's line
 * just enough to clear the others, so the dots pile up where the figures crowd. A row has space for
 * as many dots as its height allows. Where they crowd beyond that, the dots at its edges overlap.
 * @internal
 */
export function BeeswarmPlot({ chart }: { chart: ChartContext }) {
  const { data, shown, highlight, category, box: size } = chart;
  const values = data.flatMap((datum) =>
    shown.flatMap((each) => {
      const value = figureOf(datum[each.key]);
      return value === null ? [] : [value];
    }),
  );
  const extent = extentOf(values);
  const scale = chart.domain
    ? { domain: [...chart.domain] as [number, number], ticks: niceScale(...chart.domain).ticks }
    : niceScale(extent?.[0] ?? Number.NaN, extent?.[1] ?? Number.NaN);
  const margin = { top: chart.uprightReference ? 18 : 8, right: 16, bottom: 5, left: 5 };
  const axisWidth = chart.room || 60;
  const wide = Math.max(1, size.width - margin.left - margin.right - axisWidth);
  const tall = Math.max(1, size.height - margin.top - margin.bottom - SWARM_AXIS_HEIGHT);
  const [low, high] = scale.domain;
  const perFigure = wide / (high - low || 1);
  const band = tall / Math.max(1, shown.length);
  const reach = Math.max(0, band / 2 - SWARM_RADIUS);
  const rows = shown.map((each, row) => {
    const points = data.flatMap((datum) => {
      const value = figureOf(datum[each.key]);
      return value === null ? [] : [{ name: String(datum[category]), value, at: datum[ROW] }];
    });
    const offsets = swarmOf(
      points.map((point) => (point.value - low) * perFigure),
      SWARM_RADIUS,
      reach,
    );
    // The dots picked out are drawn last, over the rest.
    return points
      .map((point, index) => ({ ...point, y: row + 0.5 + (offsets[index] ?? 0) / band }))
      .sort((a, b) => Number(a.name === highlight) - Number(b.name === highlight))
      .map(
        ({ name, value, y, at }): ChartDatum => ({
          [category]: name,
          [VALUE]: value,
          [UP]: y,
          [ROW]: at,
        }),
      );
  });
  return (
    <ScatterChart accessibilityLayer={false} margin={margin} {...chart.sync}>
      <CartesianGrid horizontal={false} className="x-govuk-ui-chart-grid" />
      <XAxis
        type="number"
        dataKey={VALUE}
        domain={scale.domain}
        ticks={scale.ticks}
        tickFormatter={chart.axisFigure}
        axisLine={false}
        tickLine={false}
        tick={{ className: "x-govuk-ui-chart-tick" }}
        tickMargin={8}
      />
      <YAxis
        type="number"
        dataKey={UP}
        domain={[0, Math.max(1, shown.length)]}
        reversed
        ticks={shown.map((_, row) => row + 0.5)}
        tickFormatter={(value: number) => shown[Math.floor(value)]?.label ?? ""}
        width={axisWidth}
        axisLine={false}
        tickLine={false}
        tick={{ className: "x-govuk-ui-chart-tick x-govuk-ui-chart-tick-strong" }}
      />
      <ZAxis range={[SWARM_AREA, SWARM_AREA]} />
      <ReferenceMarks chart={chart} across={true} />
      <ChartTooltip chart={chart} />
      {rows.map((points, row) => {
        const each = shown[row];
        if (!each) return null;
        return (
          <Scatter
            key={each.key}
            name={each.label}
            data={points}
            fill={highlight === undefined ? chart.colourOf(each) : muted}
            stroke="var(--x-govuk-ui-paper)"
            strokeWidth={1}
            {...chart.animation}
          >
            {highlight !== undefined &&
              points.map((point, index) => (
                <Cell
                  // biome-ignore lint/suspicious/noArrayIndexKey: A dot has only its place, as two may share a name.
                  key={index}
                  fill={String(point[category]) === highlight ? colour(0) : muted}
                />
              ))}
            {highlight !== undefined && (
              <LabelList dataKey={category} content={<PointLabel only={highlight} />} />
            )}
          </Scatter>
        );
      })}
    </ScatterChart>
  );
}

/**
 * A box plot or a candlestick. The bar Recharts lays out spans the lowest figure to the highest,
 * and the shape sets the box or the candle's body within it, in proportion.
 * @internal
 */
export function SpreadPlot({ chart }: { chart: ChartContext }) {
  const boxed = chart.type === "box";
  const [first, second, third, fourth, fifth] = chart.shown.map((each) => each.key);
  const lowKey = boxed ? first : third;
  const highKey = boxed ? fifth : second;
  const rows = chart.data.map((datum) => ({
    ...datum,
    [LOW]: figureOf(datum[lowKey ?? ""]),
    [HIGH]: figureOf(datum[highKey ?? ""]),
  }));
  return (
    <BarChart
      data={rows}
      accessibilityLayer={false}
      layout={boxed && chart.across ? "vertical" : "horizontal"}
      margin={chart.margin}
      barCategoryGap={boxed ? "30%" : "25%"}
      {...chart.sync}
    >
      <ChartAxes chart={chart} />
      <Bar
        // A row missing its lowest or highest figure has no bar, instead of one from zero.
        dataKey={(row: ChartDatum) =>
          row[LOW] === null || row[HIGH] === null ? null : [row[LOW], row[HIGH]]
        }
        maxBarSize={boxed ? 48 : 18}
        shape={(given: ShapeProps) =>
          boxed ? (
            <BoxShape
              {...given}
              across={chart.across}
              keys={[first, second, third, fourth, fifth]}
            />
          ) : (
            <CandleShape {...given} keys={[first, second, third, fourth]} />
          )
        }
        {...chart.animation}
      />
    </BarChart>
  );
}
