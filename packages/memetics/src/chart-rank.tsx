"use client";

/**
 * Size, ranking and change between two times. This covers a lollipop, a waterfall's steps between
 * totals, dots for one or two figures in each category, and a slope from one time to another.
 * @internal
 */
import {
  Bar,
  BarChart,
  ComposedChart,
  LabelList,
  Line,
  LineChart,
  Rectangle,
  ReferenceLine,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  CENTRE,
  type ChartContext,
  type ChartDatum,
  type ChartFigures,
  type ChartKind,
  endFigures,
  FALL,
  highlightedLast,
  labelsAbove,
  RISE,
  ROW,
  roseFellKey,
  STEP,
  TOTAL,
  VALUE,
  valuesExtent,
} from "./chart-context";
import { CellFigure, ChartCard } from "./chart-frame";
import { extentOf, figureOf, lowestOf, type Step, signed, waterfallOf } from "./chart-maths";
import { colour, muted } from "./chart-palette";
import {
  ChartAxes,
  DotLabel,
  LollipopShape,
  ReferenceMarks,
  rectangleOf,
  type ShapeProps,
  SlopeLabel,
} from "./chart-shapes";

/** An end of a line across a plot, as a category and a figure, each on the axis it runs along. */
type End = { x?: string | number; y?: string | number };

/** A dot plot's dots, as the area Recharts sizes them by. */
const DOT_AREA = 120;

export const lollipop: ChartKind = {
  first: true,
  turns: "horizontal",
  key: () => null,
  outside: endFigures,
  labelsAbove,
  extent: valuesExtent,
};

export const dot: ChartKind = {
  turns: "horizontal",
  outside: endFigures,
  labelsAbove,
  extent: valuesExtent,
};

/**
 * A step's colour, which is a rise's, a fall's or a total's. A missing step has no colour, because
 * it is not drawn.
 */
const stepColour = { rise: RISE, fall: FALL, total: TOTAL, missing: TOTAL };

/** A waterfall's steps, one for each row it draws, from the first series and its totals. */
const stepsOf = (chart: ChartFigures): Step[] => {
  const totals = new Set(
    chart.data.flatMap((datum, index) =>
      chart.totals.includes(String(datum[chart.category])) ? [index] : [],
    ),
  );
  return waterfallOf(
    chart.data.map((datum) => figureOf(datum[chart.shown[0]?.key ?? ""])),
    totals,
  );
};
/** A figure in a waterfall's table or card, or the words for a missing one. */
const stepFigure = (chart: ChartFigures, text: string | null) =>
  text ?? <CellFigure value={null} format={chart.figure} missing={chart.words.noFigure} />;

export const waterfall: ChartKind = {
  first: true,
  turns: "vertical",
  cursor: "band",
  key: ({ words }) => [
    { label: words.increase, colour: RISE },
    { label: words.decrease, colour: FALL },
    { label: words.total, colour: TOTAL },
  ],
  outside: (chart) =>
    chart.direct && chart.across
      ? { labels: stepsOf(chart).flatMap((step) => signed(step, chart.figure) ?? []) }
      : null,
  labelsAbove,
  head: (chart) => [chart.categoryLabel, chart.shown[0]?.label, chart.words.runningTotal],
  // A missing change shows as missing, and so does every running total after it until the next
  // total, because none of them can be known.
  rows: (chart) =>
    stepsOf(chart).map((step, index) => ({
      key: `${index}`,
      name: chart.data[index]?.[chart.category] ?? "",
      cells: [
        stepFigure(chart, signed(step, chart.figure)),
        stepFigure(chart, step.running === null ? null : chart.figure(step.running)),
      ],
    })),
  card: (chart, point) => {
    const datum = chart.rowOf(point);
    const step = stepsOf(chart)[Number(point[STEP])];
    if (!datum || !step) return null;
    const running = step.running === null ? null : chart.figure(step.running);
    return (
      <ChartCard
        heading={String(datum[chart.category] ?? "")}
        entries={[
          {
            key: "change",
            name: step.kind === "total" ? chart.words.total : chart.shown[0]?.label,
            value: stepFigure(chart, signed(step, chart.figure)),
            colour: stepColour[step.kind],
          },
          ...(step.kind === "total"
            ? []
            : [
                {
                  key: "running",
                  name: chart.words.runningTotal,
                  value: stepFigure(chart, running),
                },
              ]),
        ]}
      />
    );
  },
  extent: (chart) =>
    extentOf([
      ...stepsOf(chart).flatMap((step) => step.span ?? []),
      ...chart.references.flatMap((reference) =>
        [reference.at, reference.to].filter((at): at is number => typeof at === "number"),
      ),
    ]),
};

export const slope: ChartKind = {
  extent: valuesExtent,
  key: (chart) => (chart.highlight === undefined ? roseFellKey(chart, "line") : null),
  // Each line's name and figure, at both ends, which need space either side.
  outside: (chart) => ({
    labels: chart.data.flatMap((datum) =>
      [chart.shown[0], chart.shown.at(-1)].map(
        (each) => `${String(datum[chart.category])} ${chart.labelFigure(datum[each?.key ?? ""])}`,
      ),
    ),
  }),
  floats: () => true,
};

/**
 * A lollipop chart, with a thin stem from the baseline to each figure, and a dot at its end.
 * @internal
 */
export function LollipopPlot({ chart }: { chart: ChartContext }) {
  const each = chart.shown[0];
  const fill = each ? chart.colourOf(each) : colour(0);
  return (
    <BarChart
      data={[...chart.data]}
      accessibilityLayer={false}
      layout={chart.across ? "vertical" : "horizontal"}
      margin={chart.margin}
      {...chart.sync}
    >
      <ChartAxes chart={chart} />
      {each && (
        <Bar
          dataKey={each.key}
          name={each.label}
          fill={fill}
          maxBarSize={44}
          shape={(given: ShapeProps) => (
            <LollipopShape {...given} across={chart.across} fill={fill} />
          )}
          {...chart.animation}
        >
          {chart.direct && (
            <LabelList
              dataKey={each.key}
              position={chart.across ? "right" : "top"}
              offset={12}
              formatter={chart.labelFigure}
              className="x-govuk-ui-chart-label"
            />
          )}
        </Bar>
      )}
    </BarChart>
  );
}

/**
 * A waterfall. Each step floats from where the last ended, and a total stands from zero. A thin
 * line runs from each step's end to the next step, beneath the bars.
 * @internal
 */
export function WaterfallPlot({ chart }: { chart: ChartContext }) {
  const { data, across, category } = chart;
  const steps = stepsOf(chart);
  const rows = data.map((datum, index) => ({ ...datum, [STEP]: index }));
  return (
    <BarChart
      data={rows}
      accessibilityLayer={false}
      layout={across ? "vertical" : "horizontal"}
      margin={chart.margin}
      barCategoryGap="18%"
      {...chart.sync}
    >
      <ChartAxes chart={chart} />
      {steps.slice(0, -1).map((step, index) => {
        // A line runs on only from a step whose total is known to a step that is drawn.
        if (step.running === null || !steps[index + 1]?.span) return null;
        const from = String(data[index]?.[category]);
        const to = String(data[index + 1]?.[category]);
        const segment: readonly [End, End] = across
          ? [
              { y: from, x: step.running },
              { y: to, x: step.running },
            ]
          : [
              { x: from, y: step.running },
              { x: to, y: step.running },
            ];
        return (
          <ReferenceLine
            // biome-ignore lint/suspicious/noArrayIndexKey: A step has only its place, as two may share a name.
            key={index}
            segment={segment}
            className="x-govuk-ui-chart-connector"
            zIndex={250}
          />
        );
      })}
      <Bar
        dataKey={(row: ChartDatum) => {
          const span = steps[Number(row[STEP])]?.span;
          return span ? [...span] : null;
        }}
        name={chart.shown[0]?.label}
        maxBarSize={56}
        shape={(given: ShapeProps) => {
          const step = steps[Number(given.payload?.[STEP])];
          return (
            <Rectangle
              {...rectangleOf(given)}
              fill={step ? stepColour[step.kind] : TOTAL}
              radius={2}
            />
          );
        }}
        {...chart.animation}
      >
        {chart.direct && (
          <LabelList
            dataKey={(row: ChartDatum) => {
              const step = steps[Number(row[STEP])];
              return step?.span ? (signed(step, chart.figure) ?? "") : "";
            }}
            position={across ? "right" : "top"}
            className="x-govuk-ui-chart-label"
          />
        )}
      </Bar>
    </BarChart>
  );
}

/**
 * A dot plot, with each series a dot on its category's row. A line joins the dots on a row, from
 * the lowest to the highest.
 * @internal
 */
export function DotPlot({ chart }: { chart: ChartContext }) {
  const { data, shown, highlight, category } = chart;
  const order = highlightedLast(shown, highlight);
  // For each row, the series whose label goes the other way, or none for a single dot.
  const lowest =
    shown.length > 1
      ? data.map((datum) => lowestOf(shown.map((each) => figureOf(datum[each.key]))))
      : [];
  return (
    <ComposedChart
      data={[...data]}
      accessibilityLayer={false}
      layout={chart.across ? "vertical" : "horizontal"}
      margin={chart.margin}
      {...chart.sync}
    >
      <ChartAxes chart={chart} valueKey={VALUE} />
      {shown.length > 1 && (
        <Bar
          dataKey={(datum: ChartDatum) => {
            let low = Number.POSITIVE_INFINITY;
            let high = Number.NEGATIVE_INFINITY;
            for (const each of shown) {
              const value = figureOf(datum[each.key]);
              if (value === null) continue;
              low = Math.min(low, value);
              high = Math.max(high, value);
            }
            return low <= high ? [low, high] : [0, 0];
          }}
          barSize={2}
          fill="var(--x-govuk-ui-muted)"
          fillOpacity={0.45}
          className="x-govuk-ui-chart-join"
          isAnimationActive={false}
          tooltipType="none"
          legendType="none"
        />
      )}
      <ZAxis range={[DOT_AREA, DOT_AREA]} />
      {order.map((each) => (
        <Scatter
          key={each.key}
          name={each.label}
          data={data.map((datum) => ({
            [category]: datum[category],
            [VALUE]: figureOf(datum[each.key]),
            [ROW]: datum[ROW],
          }))}
          dataKey={VALUE}
          fill={chart.colourOf(each)}
          stroke="var(--x-govuk-ui-paper)"
          strokeWidth={1.5}
          {...chart.animation}
        >
          {chart.direct && (
            <LabelList
              dataKey={VALUE}
              content={
                <DotLabel
                  figure={chart.figure}
                  across={chart.across}
                  series={shown.indexOf(each)}
                  lowest={lowest}
                />
              }
            />
          )}
        </Scatter>
      ))}
    </ComposedChart>
  );
}

/**
 * A slope, with each category a line from the first series to the last, named with its figure at
 * both ends. A line is coloured by whether it rose or fell, or grey beside the one picked out.
 * @internal
 */
export function SlopePlot({ chart }: { chart: ChartContext }) {
  const { data, shown, highlight, category } = chart;
  const points = shown.map((each) => ({
    [CENTRE]: each.label,
    ...Object.fromEntries(data.map((datum, index) => [`${index}`, figureOf(datum[each.key])])),
  }));
  const order = [...data.keys()].sort(
    (a, b) =>
      Number(String(data[a]?.[category]) === highlight) -
      Number(String(data[b]?.[category]) === highlight),
  );
  return (
    <LineChart
      data={points}
      accessibilityLayer={false}
      margin={{ top: 12, right: chart.room, bottom: 5, left: chart.room }}
    >
      <XAxis
        dataKey={CENTRE}
        type="category"
        tickLine={false}
        axisLine={false}
        tick={{ className: "x-govuk-ui-chart-tick x-govuk-ui-chart-tick-strong" }}
        tickMargin={8}
        interval={0}
        padding={{ left: 0, right: 0 }}
        orientation="top"
      />
      <YAxis
        hide
        domain={chart.domain ? [...chart.domain] : ["dataMin", "dataMax"]}
        type="number"
      />
      <ReferenceMarks chart={chart} across={false} />
      {order.map((index) => {
        const datum = data[index];
        const name = String(datum?.[category]);
        const from = figureOf(datum?.[shown[0]?.key ?? ""]) ?? 0;
        const to = figureOf(datum?.[shown.at(-1)?.key ?? ""]) ?? 0;
        const quiet = highlight !== undefined && name !== highlight;
        let stroke = to >= from ? RISE : FALL;
        if (highlight !== undefined) stroke = quiet ? muted : colour(0);
        return (
          <Line
            key={index}
            dataKey={`${index}`}
            name={name}
            type="linear"
            stroke={stroke}
            strokeWidth={quiet ? 1.5 : 2.5}
            dot={{ r: 3.5, fill: stroke, stroke: "var(--x-govuk-ui-paper)", strokeWidth: 1.5 }}
            activeDot={false}
            {...chart.animation}
          >
            <LabelList
              dataKey={`${index}`}
              content={
                <SlopeLabel
                  name={name}
                  figure={chart.labelFigure}
                  last={shown.length - 1}
                  quiet={quiet}
                />
              }
            />
          </Line>
        );
      })}
    </LineChart>
  );
}
