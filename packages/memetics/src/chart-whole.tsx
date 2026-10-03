"use client";

/**
 * Parts of a whole, as a pie, a donut with the whole in its middle, and a funnel of how many are
 * left at each step.
 * @internal
 */
import { Cell, Funnel, FunnelChart, LabelList, Pie, PieChart } from "recharts";
import {
  type ChartContext,
  type ChartDatum,
  type ChartFigures,
  type ChartKind,
  categoryKey,
  seriesHead,
  seriesRows,
} from "./chart-context";
import { CellFigure, ChartCard } from "./chart-frame";
import { figureOf } from "./chart-maths";
import { colour } from "./chart-palette";
import { ChartTooltip, FunnelLabel, sectorLabel } from "./chart-shapes";

/** The first series' figure in a row, or null for none. */
const firstOf = (chart: ChartFigures, datum: ChartDatum | undefined) =>
  figureOf(datum?.[chart.shown[0]?.key ?? ""]);

/** The first series' total, which a pie's shares are of, or null where it has no figures. */
export const wholeOf = (chart: ChartFigures) => {
  let whole: number | null = null;
  for (const datum of chart.data) {
    const value = firstOf(chart, datum);
    if (value !== null) whole = (whole ?? 0) + value;
  }
  return whole;
};
/** The first stage of a funnel, which each stage's share is of, or null where it has no figure. */
const firstStageOf = (chart: ChartFigures) => firstOf(chart, chart.data[0]);

/** A card of a part's figure and its share, of the whole or of the first stage. */
export const shareCard = (
  chart: ChartFigures,
  point: Record<string, unknown>,
  of: number | null,
) => {
  const datum = chart.rowOf(point);
  if (!datum) return null;
  const value = firstOf(chart, datum);
  return (
    <ChartCard
      heading={String(datum[chart.category] ?? "")}
      entries={[
        {
          key: "value",
          name: chart.shown[0]?.label,
          value:
            value === null ? (
              <CellFigure value={null} format={chart.figure} missing={chart.words.noFigure} />
            ) : (
              <>
                {chart.figure(value)} ({chart.shareOf(value, of)})
              </>
            ),
          colour: chart.type === "funnel" ? colour(0) : colour(chart.everything.indexOf(datum)),
        },
      ]}
    />
  );
};

/** A table's rows with a share of `of` after each row's figures. */
const withShares = (chart: ChartFigures, of: number | null) =>
  seriesRows(chart).map((row, index) => ({
    ...row,
    cells: [...row.cells, chart.shareOf(firstOf(chart, chart.everything[index]), of)],
  }));

export const pie: ChartKind = {
  first: true,
  key: (chart) => (chart.direct ? null : categoryKey(chart)),
  head: (chart) => [...seriesHead(chart), chart.words.share],
  rows: (chart) => withShares(chart, wholeOf(chart)),
  card: (chart, point) => shareCard(chart, point, wholeOf(chart)),
};
export const donut: ChartKind = pie;

/**
 * A funnel stage's label, with its name, its figure and its share of the first stage, or its name
 * and the words for no figure.
 */
const stageLabel = (chart: ChartFigures, datum: ChartDatum | undefined) => {
  const name = String(datum?.[chart.category] ?? "");
  const value = firstOf(chart, datum);
  if (value === null) return `${name}  ${chart.words.noFigure}`;
  const first = firstStageOf(chart);
  return first
    ? `${name}  ${chart.figure(value)} (${chart.share(value / first)})`
    : `${name}  ${chart.figure(value)}`;
};

export const funnel: ChartKind = {
  first: true,
  key: () => null,
  // Each stage's name, figure and share sit to the funnel's right, which needs space there.
  outside: (chart) => ({ labels: chart.data.map((datum) => stageLabel(chart, datum)) }),
  head: (chart) => [
    ...seriesHead(chart),
    chart.words.shareOf(String(chart.everything[0]?.[chart.category] ?? "")),
  ],
  rows: (chart) => withShares(chart, firstStageOf(chart)),
  card: (chart, point) => shareCard(chart, point, firstStageOf(chart)),
};

/**
 * A pie, or a donut with the whole in its middle. When named on the plot, each sector's name sits
 * beside it, with a line to it.
 * @internal
 */
export function PiePlot({ chart }: { chart: ChartContext }) {
  const donut = chart.type === "donut";
  return (
    <PieChart accessibilityLayer={false} {...chart.sync}>
      <ChartTooltip chart={chart} />
      <Pie
        data={[...chart.data]}
        dataKey={chart.shown[0]?.key ?? ""}
        nameKey={chart.category}
        innerRadius={donut ? "62%" : 0}
        outerRadius={chart.direct ? "76%" : "92%"}
        paddingAngle={donut ? 1.5 : 0}
        cornerRadius={donut ? 3 : 0}
        stroke={donut ? "none" : "var(--x-govuk-ui-paper)"}
        strokeWidth={donut ? 0 : 1.5}
        label={chart.direct ? sectorLabel : false}
        labelLine={chart.direct ? { className: "x-govuk-ui-chart-label-line" } : false}
        {...chart.animation}
      >
        {chart.data.map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: A sector has only its place, as two may share a name.
          <Cell key={index} fill={colour(index)} />
        ))}
      </Pie>
    </PieChart>
  );
}

/**
 * The middle of a donut, with the whole and what it is.
 * @internal
 */
export function DonutCentre({ chart }: { chart: ChartFigures }) {
  return (
    <span className="x-govuk-ui-chart-centre" aria-hidden="true">
      <span className="x-govuk-ui-chart-centre-figure">
        <CellFigure value={wholeOf(chart)} format={chart.figure} missing={chart.words.noFigure} />
      </span>
      <span className="x-govuk-ui-chart-centre-label">{chart.words.total}</span>
    </span>
  );
}

/**
 * A funnel, with each stage as wide as its figure, under the one before. Each is named with its
 * figure and its share of the first stage, in a column to its right.
 * @internal
 */
export function FunnelPlot({ chart }: { chart: ChartContext }) {
  const { animation } = chart;
  return (
    <FunnelChart
      accessibilityLayer={false}
      margin={{ top: 5, right: chart.room, bottom: 5, left: 5 }}
    >
      <ChartTooltip chart={chart} />
      <Funnel
        data={[...chart.data]}
        dataKey={chart.shown[0]?.key ?? ""}
        nameKey={chart.category}
        isAnimationActive={animation.isAnimationActive}
        animationDuration={animation.animationDuration}
        onAnimationEnd={animation.onAnimationEnd}
        lastShapeType="rectangle"
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth={2}
      >
        {chart.data.map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: A stage has only its place, as two may share a name.
          <Cell key={index} fill={colour(0)} />
        ))}
        <LabelList
          dataKey={chart.category}
          content={<FunnelLabel labelOf={(index) => stageLabel(chart, chart.data[index])} />}
        />
      </Funnel>
    </FunnelChart>
  );
}
