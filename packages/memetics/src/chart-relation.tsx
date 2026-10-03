"use client";

/**
 * How measures relate, as a scatter of two or three, and a heat map, a table of figures shaded by
 * size.
 * @internal
 */
import { CartesianGrid, LabelList, Scatter, ScatterChart, XAxis, YAxis, ZAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "x-govuk-ui";
import {
  type ChartContext,
  type ChartFigures,
  type ChartKind,
  seriesCard,
  VALUE_AXIS_WIDTH,
  valuesExtent,
} from "./chart-context";
import { CellFigure, heatKey } from "./chart-frame";
import { extentOf, figureOf, heatScale, niceScale } from "./chart-maths";
import { colour } from "./chart-palette";
import { ChartTooltip, PointLabel, ReferenceMarks } from "./chart-shapes";

export const scatter: ChartKind = {
  key: () => null,
  floats: (chart) => chart.direct,
  // A scatter's points are told apart by their position, not their colour.
  card: (chart, point) => seriesCard(chart, point, false),
};

/** A heat map's five classes of figures, across its domain or from zero to its highest. */
const heatOf = (chart: ChartFigures) => {
  const domain =
    chart.domain ??
    niceScale(
      ...(extentOf([
        0,
        ...chart.data.flatMap((datum) => chart.shown.map((each) => figureOf(datum[each.key]) ?? 0)),
      ]) ?? [0, 1]),
    ).domain;
  return heatScale(domain, chart.figure, chart.words.range);
};
/** Whether any of a heat map's figures is missing, which its key then names. */
const anyMissing = (chart: ChartFigures) =>
  chart.data.some((datum) => chart.shown.some((each) => figureOf(datum[each.key]) === null));

export const heatmap: ChartKind = {
  key: (chart) => heatKey(heatOf(chart), anyMissing(chart), chart.words.noFigure),
  untabled: true,
  extent: valuesExtent,
};

/**
 * A scatter, with a point for each row. The first series runs across and the second up. The third,
 * if given, sets each point's size. Each axis is named outside the plot, where its name has space.
 * @internal
 */
export function ScatterPlot({ chart }: { chart: ChartContext }) {
  const { shown } = chart;
  const valueAxis = {
    type: "number" as const,
    axisLine: false,
    tickLine: false,
    tick: { className: "x-govuk-ui-chart-tick" },
    tickFormatter: chart.axisFigure,
    domain: chart.domain ? [...chart.domain] : undefined,
    ticks: chart.ticks,
  };
  return (
    <ScatterChart
      accessibilityLayer={false}
      margin={{ top: chart.direct ? 22 : 12, right: 8, bottom: 4, left: 8 }}
      {...chart.sync}
    >
      <CartesianGrid className="x-govuk-ui-chart-grid" />
      <XAxis {...valueAxis} dataKey={shown[0]?.key} name={shown[0]?.label} tickMargin={8} />
      <YAxis
        {...valueAxis}
        dataKey={shown[1]?.key}
        name={shown[1]?.label}
        orientation="right"
        width={VALUE_AXIS_WIDTH}
      />
      {shown[2] && <ZAxis dataKey={shown[2].key} name={shown[2].label} range={[60, 600]} />}
      <ReferenceMarks chart={chart} across={false} />
      <ChartTooltip chart={chart} />
      <Scatter
        data={[...chart.data]}
        fill={colour(0)}
        fillOpacity={shown[2] ? 0.7 : 1}
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth={1.5}
        {...chart.animation}
      >
        {chart.direct && <LabelList dataKey={chart.category} content={<PointLabel />} />}
      </Scatter>
    </ScatterChart>
  );
}

/**
 * The words naming a scatter's axes, with the vertical axis's above the plot, and the horizontal
 * axis's beneath.
 * @internal
 */
export function AxisTitle({ chart, axis }: { chart: ChartFigures; axis: "x" | "y" }) {
  return (
    <p className="x-govuk-ui-chart-axis-title" data-axis={axis === "x" ? "x" : undefined}>
      {chart.shown[axis === "x" ? 0 : 1]?.label}
    </p>
  );
}

/**
 * A heat map, as the table of figures, with each cell shaded by its figure's class, and a missing
 * figure hatched, as the key shows.
 * @internal
 */
export function HeatmapTable({ chart }: { chart: ChartFigures }) {
  const heat = heatOf(chart);
  return (
    <Table className="x-govuk-ui-chart-heatmap">
      <TableHeader>
        <TableRow>
          <TableHead>{chart.categoryLabel}</TableHead>
          {chart.shown.map((each) => (
            <TableHead key={each.key} numeric>
              {each.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {chart.data.map((datum, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: A row has only its place, as two may share a name.
          <TableRow key={index}>
            <TableHead>{datum[chart.category]}</TableHead>
            {chart.shown.map((each) => {
              const value = figureOf(datum[each.key]);
              return (
                <TableCell
                  key={each.key}
                  numeric
                  className="x-govuk-ui-chart-heat"
                  data-step={value === null ? undefined : heat.step(value)}
                  data-missing={value === null ? "" : undefined}
                >
                  <CellFigure
                    value={value}
                    format={each.format ?? chart.figure}
                    missing={chart.words.noFigure}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
