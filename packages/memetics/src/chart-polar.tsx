"use client";

/**
 * Several measures of one thing, around a centre, as a radar or radial bars. Both are hard to read
 * exactly, so people read their figures in the table beneath.
 * @internal
 */
import {
  Cell,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
} from "recharts";
import {
  CENTRE,
  type ChartContext,
  type ChartKind,
  categoryKey,
  highlightedLast,
  ROW,
  valuesExtent,
} from "./chart-context";
import { extentOf, figureOf, niceScale } from "./chart-maths";
import { colour } from "./chart-palette";
import { ChartTooltip, RadarTick, RingLabel } from "./chart-shapes";
import { shareCard, wholeOf } from "./chart-whole";

export const radar: ChartKind = { extent: valuesExtent };

export const radial: ChartKind = {
  first: true,
  key: (chart) => (chart.direct ? null : categoryKey(chart)),
  card: (chart, point) => shareCard(chart, point, wholeOf(chart)),
  extent: valuesExtent,
};

/** The highest of the figures a chart draws, or none. */
const highestOf = (chart: ChartContext) =>
  extentOf(
    chart.data.flatMap((datum) =>
      chart.shown.flatMap((each) => {
        const value = figureOf(datum[each.key]);
        return value === null ? [] : [value];
      }),
    ),
  )?.[1];

/**
 * A radar, with each category a spoke, and each series a shape joining its figures on the spokes.
 * Series are picked out or set back as a line chart's are.
 * @internal
 */
export function RadarPlot({ chart }: { chart: ChartContext }) {
  const { shown, highlight } = chart;
  const scale = niceScale(chart.domain?.[0] ?? 0, chart.domain?.[1] ?? highestOf(chart) ?? 1);
  const order = highlightedLast(shown, highlight);
  return (
    <RadarChart
      data={[...chart.data]}
      accessibilityLayer={false}
      outerRadius="78%"
      margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
      {...chart.sync}
    >
      <PolarGrid className="x-govuk-ui-chart-grid" />
      <PolarAngleAxis dataKey={chart.category} tick={{ className: "x-govuk-ui-chart-tick" }} />
      {/* The figures run up between the first two spokes, where no category's name is. */}
      <PolarRadiusAxis
        angle={90 - 180 / Math.max(3, chart.data.length)}
        domain={scale.domain}
        ticks={scale.ticks.slice(1)}
        tick={(given: {
          x?: number | string;
          y?: number | string;
          payload?: { value?: unknown };
        }) => <RadarTick {...given} figure={chart.axisFigure} />}
        axisLine={false}
      />
      <ChartTooltip chart={chart} />
      {order.map((each) => (
        <Radar
          key={each.key}
          dataKey={each.key}
          name={each.label}
          stroke={chart.colourOf(each)}
          strokeWidth={2}
          strokeDasharray={each.dashed ? "6 4" : undefined}
          fill={chart.colourOf(each)}
          fillOpacity={
            shown.length > 1 && (highlight === undefined || each.key !== highlight) ? 0.04 : 0.16
          }
          dot={{ r: 3, fillOpacity: 1, strokeWidth: 0 }}
          activeDot={{ r: 4, strokeWidth: 2, className: "x-govuk-ui-chart-dot" }}
          {...chart.animation}
        />
      ))}
    </RadarChart>
  );
}

/**
 * Radial bars. The rings run clockwise from the top for three quarters of a turn, so the free
 * quarter has each ring's name at its start. The first category is the outermost ring.
 * @internal
 */
export function RadialPlot({ chart }: { chart: ChartContext }) {
  const each = chart.shown[0];
  const max = chart.domain?.[1] ?? highestOf(chart) ?? 0;
  const rings = [...chart.data].reverse().map((datum) => ({
    ...datum,
    [CENTRE]: String(datum[chart.category]),
  }));
  return (
    <RadialBarChart
      data={rings}
      accessibilityLayer={false}
      innerRadius="22%"
      outerRadius="98%"
      startAngle={90}
      endAngle={-180}
      barCategoryGap="22%"
      {...chart.sync}
    >
      <PolarAngleAxis type="number" domain={[0, max > 0 ? max : 1]} tick={false} axisLine={false} />
      <ChartTooltip chart={chart} />
      <RadialBar
        dataKey={each?.key ?? ""}
        name={each?.label}
        background={{ className: "x-govuk-ui-chart-track" }}
        cornerRadius={4}
        {...chart.animation}
      >
        {rings.map((ring) => (
          <Cell key={ring[ROW]} fill={colour(ring[ROW])} />
        ))}
        {chart.direct && (
          <LabelList
            dataKey={each?.key ?? ""}
            content={
              <RingLabel
                figure={chart.labelFigure}
                names={rings.map((ring) => String(ring[CENTRE]))}
              />
            }
          />
        )}
      </RadialBar>
    </RadialBarChart>
  );
}
