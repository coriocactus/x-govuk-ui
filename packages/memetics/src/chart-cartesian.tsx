"use client";

/**
 * Change over time and size. This covers lines, areas and bars, any mix of them on one scale, and a
 * stream of areas stacked about a centre line.
 * @internal
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
  ErrorBar,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartContext,
  type ChartDatum,
  type ChartFigures,
  type ChartKind,
  type ChartSeries,
  endFigures,
  highlightedLast,
  labelsAbove,
  seriesKey,
} from "./chart-context";
import { extentOf, figureOf, lastFigureOf, stackOf, streamOf } from "./chart-maths";
import {
  barRadius,
  ChartAxes,
  ChartTooltip,
  EndLabel,
  ReferenceMarks,
  type ShapeProps,
  StackShape,
} from "./chart-shapes";

/**
 * The figures a line, area or bar chart's value axis must show. These are each stack, from its foot
 * to its top, each series drawn over the stacks, the bounds of each range, and the references.
 */
const cartesianExtent = (chart: ChartFigures) => {
  const values: number[] = [];
  for (const datum of chart.data) {
    if (chart.stackable.length) {
      const { up, down } = stackOf(
        chart.stackable.map((each) => figureOf(datum[each.key]) ?? 0),
        chart.normalise,
      );
      values.push(up, down);
    }
    for (const each of chart.shown) {
      if (chart.stackable.includes(each)) continue;
      for (const key of [each.key, ...(each.range ?? [])]) {
        const value = figureOf(datum[key]);
        if (value !== null) values.push(value);
      }
    }
  }
  for (const reference of chart.references)
    for (const at of [reference.at, reference.to]) if (typeof at === "number") values.push(at);
  return extentOf(values);
};

/** A line's or an area's key, or none where the plot names each series at its end. */
const lineKey = (chart: ChartFigures) => (chart.direct ? null : seriesKey(chart));
/** The names at the ends of lines, which need space at the plot's right, and are bold. */
const endNames = (chart: ChartFigures) =>
  chart.endLabels ? { labels: chart.shown.map((each) => each.label), bold: true } : null;

export const line: ChartKind = {
  ranges: true,
  key: lineKey,
  outside: endNames,
  floats: (chart) => chart.direct,
  extent: cartesianExtent,
};
export const area: ChartKind = line;
export const bar: ChartKind = {
  turns: "vertical",
  ranges: true,
  cursor: "band",
  extent: cartesianExtent,
  // Horizontal bars have their figures beyond their ends, which need space at the right.
  outside: endFigures,
  labelsAbove,
};
export const stream: ChartKind = { ranges: true };

/**
 * A line, area or bar chart, or a mix of them. A series picked out is drawn last, over the grey
 * ones. Stacks are laid out here, not by Recharts, because Recharts stacks in whatever order its
 * parts happen to register. Here each series is a range from where the one before ended, shares
 * divide by the row's total, and a diverging stack runs its negatives the other way from zero.
 * @internal
 */
export function CartesianPlot({ chart }: { chart: ChartContext }) {
  const { type, shown, stackable, across, highlight, animation, normalise, diverging, lineType } =
    chart;
  const stack = (datum: ChartDatum) =>
    stackOf(
      stackable.map((each) => figureOf(datum[each.key]) ?? 0),
      normalise,
    );
  const stackSpan = (datum: ChartDatum): [number, number] => {
    let low = 0;
    let high = 0;
    for (const [from, to] of stack(datum).ranges) {
      low = Math.min(low, from);
      high = Math.max(high, to);
    }
    return [low, high];
  };
  // A series as it is drawn, as a line or an area with its band, or as a bar with its range's bar.
  const seriesOf = (each: ChartSeries) => {
    const fill = chart.colourOf(each);
    const dash = each.dashed ? "6 4" : undefined;
    const band = each.range && (
      <Area
        key={`${each.key}-range`}
        dataKey={(datum: ChartDatum) => {
          const [lowKey = "", highKey = ""] = each.range ?? [];
          const low = figureOf(datum[lowKey]);
          const high = figureOf(datum[highKey]);
          return low === null || high === null ? null : [low, high];
        }}
        type={lineType}
        stroke="none"
        fill={fill}
        fillOpacity={0.18}
        tooltipType="none"
        legendType="none"
        activeDot={false}
        className="x-govuk-ui-chart-range"
        {...animation}
      />
    );
    const endLabel = chart.endLabels && (
      <LabelList
        dataKey={each.key}
        content={
          <EndLabel
            name={each.label}
            last={lastFigureOf(chart.data.map((datum) => figureOf(datum[each.key])))}
            colour={chart.inkFor(each)}
          />
        }
      />
    );
    switch (chart.drawnAs(each)) {
      case "line":
        return [
          band,
          <Line
            key={each.key}
            dataKey={each.key}
            name={each.label}
            type={lineType}
            stroke={fill}
            strokeWidth={2.5}
            strokeDasharray={dash}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, className: "x-govuk-ui-chart-dot" }}
            {...animation}
          >
            {endLabel}
          </Line>,
        ];
      case "area": {
        const stackIndex = stackable.indexOf(each);
        return [
          band,
          <Area
            key={each.key}
            dataKey={
              stackIndex >= 0 ? (datum: ChartDatum) => stack(datum).ranges[stackIndex] : each.key
            }
            name={each.label}
            type={lineType}
            stroke={fill}
            strokeWidth={2}
            strokeDasharray={dash}
            fill={fill}
            fillOpacity={stackIndex >= 0 ? 0.85 : 0.16}
            activeDot={{ r: 4, strokeWidth: 2, className: "x-govuk-ui-chart-dot" }}
            {...animation}
          >
            {endLabel}
          </Area>,
        ];
      }
      default:
        return [
          <Bar
            key={each.key}
            dataKey={each.key}
            name={each.label}
            fill={fill}
            radius={barRadius(false, across)}
            maxBarSize={44}
            {...animation}
          >
            {each.range && (
              <ErrorBar
                dataKey={(datum: ChartDatum) => {
                  const value = figureOf(datum[each.key]) ?? 0;
                  const low = figureOf(datum[each.range?.[0] ?? ""]);
                  const high = figureOf(datum[each.range?.[1] ?? ""]);
                  return low === null || high === null ? [0, 0] : [value - low, high - value];
                }}
                width={8}
                strokeWidth={1.5}
                stroke="var(--x-govuk-ui-text)"
                direction={across ? "x" : "y"}
              />
            )}
            {chart.direct && (
              <LabelList
                dataKey={each.key}
                position={across ? "right" : "top"}
                offset={each.range ? 14 : 5}
                formatter={chart.labelFigure}
                className="x-govuk-ui-chart-label"
              />
            )}
          </Bar>,
        ];
    }
  };
  // A stack is one bar, drawn in its series' colours, so Recharts has nothing to order.
  const stackedBars = type === "bar" && stackable.length > 0 && (
    <Bar
      key="stack"
      dataKey={stackSpan}
      maxBarSize={36}
      shape={(given: ShapeProps) => (
        <StackShape
          {...given}
          across={across}
          series={stackable}
          colours={stackable.map(chart.colourOf)}
          normalise={normalise}
          diverging={diverging}
        />
      )}
      {...animation}
    />
  );
  // Bars keep their series' order, because that order is their place in each group.
  const order = type === "bar" ? shown : highlightedLast(shown, highlight);
  const drawn = order.flatMap((each) =>
    stackedBars && stackable.includes(each) ? [] : seriesOf(each),
  );
  const children = [<ChartAxes key="axes" chart={chart} />, stackedBars, ...drawn];
  const common = {
    data: [...chart.data],
    accessibilityLayer: false,
    margin: chart.margin,
    ...chart.sync,
  };
  const layout = across ? "vertical" : "horizontal";
  if (chart.mixed)
    return (
      <ComposedChart {...common} layout={layout} barGap={1} barCategoryGap="10%">
        {children}
      </ComposedChart>
    );
  if (type === "bar")
    return (
      <BarChart {...common} layout={layout} barGap={1} barCategoryGap="10%">
        {children}
      </BarChart>
    );
  if (type === "area") return <AreaChart {...common}>{children}</AreaChart>;
  return <LineChart {...common}>{children}</LineChart>;
}

/**
 * A stream, with areas stacked about a centre line, so the whole and each part are read by their
 * thickness. A scale would mean nothing, so there is none, and the table has the figures.
 * @internal
 */
export function StreamPlot({ chart }: { chart: ChartContext }) {
  const { shown } = chart;
  return (
    <AreaChart
      data={[...chart.data]}
      accessibilityLayer={false}
      margin={chart.margin}
      {...chart.sync}
    >
      <XAxis
        dataKey={chart.category}
        type="category"
        tickLine={false}
        axisLine={false}
        tick={{ className: "x-govuk-ui-chart-tick" }}
        tickMargin={8}
        interval="preserveStartEnd"
      />
      <YAxis hide type="number" domain={["dataMin", "dataMax"]} />
      <ReferenceMarks chart={chart} across={false} />
      <ChartTooltip chart={chart} />
      {shown.map((each, index) => (
        <Area
          key={each.key}
          dataKey={(datum: ChartDatum) =>
            streamOf(shown.map((one) => figureOf(datum[one.key]) ?? 0))[index]
          }
          name={each.label}
          type={chart.lineType}
          stroke="var(--x-govuk-ui-paper)"
          strokeWidth={1}
          fill={chart.colourOf(each)}
          fillOpacity={0.9}
          activeDot={false}
          {...chart.animation}
        />
      ))}
    </AreaChart>
  );
}
