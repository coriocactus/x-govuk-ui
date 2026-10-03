"use client";

/**
 * What the Chart draws inside Recharts' plots. That is the shapes it draws instead of Recharts'
 * own, the labels it sets on them, and the lines and bands that mark the plot.
 * @internal
 */
import {
  CartesianGrid,
  Rectangle,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartContext,
  type ChartDatum,
  type ChartReference,
  type ChartSeries,
  FALL,
  RISE,
  VALUE_AXIS_WIDTH,
} from "./chart-context";
import { figureOf, stackOf } from "./chart-maths";

/**
 * The card under the pointer, as every Recharts plot has it, over a band for a bar or a dashed
 * line for a point.
 * @internal
 */
export function ChartTooltip({ chart }: { chart: ChartContext }) {
  return (
    <Tooltip
      content={(given) =>
        given.active && given.payload?.length
          ? chart.card(given.payload[0]?.payload as Record<string, unknown> | undefined)
          : null
      }
      cursor={
        chart.cursor === "band"
          ? { className: "x-govuk-ui-chart-band" }
          : { className: "x-govuk-ui-chart-cursor" }
      }
      isAnimationActive={false}
    />
  );
}

/**
 * The chart's reference lines and bands, each across the plot or up it.
 * @internal
 */
export function ReferenceMarks({ chart, across }: { chart: ChartContext; across: boolean }) {
  return chart.references.map((reference) => (
    <ReferenceMark
      key={`${String(reference.at)}-${String(reference.to)}`}
      {...reference}
      across={across}
    />
  ));
}

/**
 * The grid, the axes, the reference marks and the card of a plot of categories and figures. The
 * figures run along one axis and the categories along the other, depending on which way the chart
 * runs. Gridlines cross only the figures, over a darker baseline. A dot chart's value axis names
 * the key its dots read, as a scatter's axes do.
 * @internal
 */
export function ChartAxes({ chart, valueKey }: { chart: ChartContext; valueKey?: string }) {
  const { across, diverging } = chart;
  const valueAxis = {
    type: "number" as const,
    dataKey: valueKey,
    axisLine: false,
    tickLine: false,
    tick: { className: "x-govuk-ui-chart-tick" },
    tickFormatter: chart.axisFigure,
    domain: chart.domain ? [...chart.domain] : undefined,
    ticks: chart.ticks,
  };
  // A diverging chart's baseline is at zero, in the middle, not at the categories' edge.
  const categoryAxis = {
    type: "category" as const,
    dataKey: chart.category,
    tickLine: false,
    axisLine: diverging ? false : { className: "x-govuk-ui-chart-baseline" },
    tick: { className: "x-govuk-ui-chart-tick" },
    tickMargin: 8,
    interval: across ? 0 : ("preserveStartEnd" as const),
    // A dot chart's series each repeat the categories, as their own points.
    allowDuplicatedCategory: valueKey === undefined,
  };
  return (
    <>
      <CartesianGrid vertical={across} horizontal={!across} className="x-govuk-ui-chart-grid" />
      {across ? (
        <>
          <XAxis {...valueAxis} tickMargin={8} />
          <YAxis {...categoryAxis} width="auto" />
        </>
      ) : (
        <>
          <XAxis {...categoryAxis} padding={{ right: chart.endLabels ? chart.room : 0 }} />
          <YAxis {...valueAxis} orientation="right" width={VALUE_AXIS_WIDTH} />
        </>
      )}
      {diverging && (
        <ReferenceLine {...(across ? { x: 0 } : { y: 0 })} className="x-govuk-ui-chart-baseline" />
      )}
      <ReferenceMarks chart={chart} across={across} />
      <ChartTooltip chart={chart} />
    </>
  );
}

/** The box Recharts gives a bar's shape, and the row it stands for. */
export type ShapeProps = {
  /** The box's left edge. */
  x?: number;
  /** The box's top edge. */
  y?: number;
  /** Its width, negative for a bar that runs left. */
  width?: number;
  /** Its height, negative for a bar that runs down. */
  height?: number;
  /** The row the bar stands for. */
  payload?: ChartDatum;
};

/** The box Recharts gives a shape, with its height and width made positive. */
export function rectangleOf({ x = 0, y = 0, width = 0, height = 0 }: ShapeProps) {
  return {
    x: width < 0 ? x + width : x,
    y: height < 0 ? y + height : y,
    width: Math.abs(width),
    height: Math.abs(height),
  };
}

/** The corners of a bar, rounded at its end, or at its start for a bar that runs the other way. */
export function barRadius(reversed: boolean, across: boolean): [number, number, number, number] {
  if (across) return reversed ? [3, 0, 0, 3] : [0, 3, 3, 0];
  return reversed ? [0, 0, 3, 3] : [3, 3, 0, 0];
}

/**
 * A stacked bar, drawn as one shape. The bar Recharts lays out spans the whole stack, and the
 * series' segments are set within it in proportion, each in its colour. The segments that end the
 * stack are rounded. These are the last series' at the top, and in a diverging stack the first's
 * at the foot.
 * @internal
 */
export function StackShape({
  payload,
  across,
  series,
  colours,
  normalise,
  diverging,
  ...given
}: ShapeProps & {
  across: boolean;
  series: readonly ChartSeries[];
  colours: readonly string[];
  normalise: boolean;
  diverging: boolean;
}) {
  const { x, y, width, height } = rectangleOf(given);
  if (!payload || width <= 0 || height <= 0) return null;
  const { ranges, up, down } = stackOf(
    series.map((each) => figureOf(payload[each.key]) ?? 0),
    normalise,
  );
  const span = up - down || 1;
  const pixels = (across ? width : height) / span;
  const positives = ranges.filter(([low, high]) => high > low && low >= 0).length;
  let seenPositive = 0;
  return (
    <g>
      {ranges.map(([low, high], index) => {
        if (high <= low) return null;
        const negative = low < 0;
        if (!negative) seenPositive += 1;
        // The outer ends of the stack are rounded. These are the top of the positives, and the foot
        // of the negatives in a diverging stack.
        const rounded = negative ? diverging && low === down : seenPositive === positives;
        const radius = rounded ? barRadius(negative, across) : 0;
        const from = (low - down) * pixels;
        const size = (high - low) * pixels;
        return (
          <Rectangle
            key={series[index]?.key}
            x={across ? x + from : x}
            y={across ? y : y + height - from - size}
            width={across ? size : width}
            height={across ? height : size}
            fill={colours[index]}
            radius={radius}
          />
        );
      })}
    </g>
  );
}

/**
 * A lollipop, with a thin stem from the baseline to the figure, and a dot at its end.
 * @internal
 */
export function LollipopShape({
  across,
  fill,
  payload,
  ...given
}: ShapeProps & { across: boolean; fill: string }) {
  if (!payload) return null;
  const { x, y, width, height } = rectangleOf(given);
  // Recharts gives a bar that runs left or down a negative width or height.
  const signedWidth = given.width ?? 0;
  const signedHeight = given.height ?? 0;
  // The stem runs from the baseline, along the bar's middle, to the figure's end. That is the bar's
  // far edge, whichever way it runs.
  let startX: number;
  let startY: number;
  let endX: number;
  let endY: number;
  if (across) {
    startY = y + height / 2;
    endY = startY;
    [startX, endX] = signedWidth >= 0 ? [x, x + width] : [x + width, x];
  } else {
    startX = x + width / 2;
    endX = startX;
    [startY, endY] = signedHeight >= 0 ? [y + height, y] : [y, y + height];
  }
  return (
    <g className="x-govuk-ui-chart-lollipop">
      <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={fill} strokeWidth={2} />
      <circle
        cx={endX}
        cy={endY}
        r={6}
        fill={fill}
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth={1.5}
      />
    </g>
  );
}

/**
 * A box plot's box, within the bar Recharts lays out from the lowest figure to the highest. It has
 * a whisker the whole way, capped at each end, a box from the lower quartile to the upper, and a
 * line across it at the median.
 * @internal
 */
export function BoxShape({
  across,
  keys,
  payload,
  ...given
}: ShapeProps & { across: boolean; keys: readonly (string | undefined)[] }) {
  const { x, y, width, height } = rectangleOf(given);
  if (!payload) return null;
  const figures = keys.map((key) => figureOf(payload[key ?? ""]));
  // A box missing any of its five figures is not drawn, because it would need a made-up figure.
  if (figures.some((figure) => figure === null)) return null;
  const [low = 0, q1 = 0, median = 0, q3 = 0, high = 0] = figures as number[];
  const span = high - low || 1;
  // A figure's place along the bar, from the lowest figure's end.
  const along = (value: number) =>
    across ? x + ((value - low) / span) * width : y + height - ((value - low) / span) * height;
  const middle = across ? y + height / 2 : x + width / 2;
  const breadth = across ? height : width;
  const cap = breadth / 4;
  const line = (a: number, b: number, c: number, d: number, name: string) =>
    across ? (
      <line key={name} x1={a} y1={b} x2={c} y2={d} />
    ) : (
      <line key={name} x1={b} y1={a} x2={d} y2={c} />
    );
  const boxFrom = Math.min(along(q1), along(q3));
  const boxSize = Math.abs(along(q3) - along(q1));
  return (
    <g className="x-govuk-ui-chart-box">
      {line(along(low), middle, along(high), middle, "whisker")}
      {line(along(low), middle - cap, along(low), middle + cap, "low")}
      {line(along(high), middle - cap, along(high), middle + cap, "high")}
      <rect
        className="x-govuk-ui-chart-box-body"
        x={across ? boxFrom : x}
        y={across ? y : boxFrom}
        width={across ? boxSize : width}
        height={across ? height : boxSize}
        rx={2}
      />
      <g className="x-govuk-ui-chart-box-median">
        {line(along(median), middle - breadth / 2, along(median), middle + breadth / 2, "median")}
      </g>
    </g>
  );
}

/**
 * A candle, within the bar Recharts lays out from the lowest figure to the highest. It has a wick
 * the whole way, and a body from the opening figure to the closing. A candle that rose is hollow,
 * and one that fell is filled, so the two differ in more than colour.
 * @internal
 */
export function CandleShape({
  keys,
  payload,
  ...given
}: ShapeProps & { keys: readonly (string | undefined)[] }) {
  const { x, y, width, height } = rectangleOf(given);
  if (!payload) return null;
  const figures = keys.map((key) => figureOf(payload[key ?? ""]));
  // A candle missing any of its four figures is not drawn, like a box.
  if (figures.some((figure) => figure === null)) return null;
  const [open = 0, high = 0, low = 0, close = 0] = figures as number[];
  const span = high - low || 1;
  const at = (value: number) => y + ((high - value) / span) * height;
  const rose = close >= open;
  const top = at(Math.max(open, close));
  const bottom = at(Math.min(open, close));
  const stroke = rose ? RISE : FALL;
  return (
    <g className="x-govuk-ui-chart-candle" data-rose={rose || undefined}>
      <line
        x1={x + width / 2}
        y1={y}
        x2={x + width / 2}
        y2={y + height}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <rect
        x={x + 0.75}
        y={top}
        width={Math.max(0, width - 1.5)}
        height={Math.max(1.5, bottom - top)}
        fill={rose ? "var(--x-govuk-ui-paper)" : stroke}
        stroke={stroke}
        strokeWidth={1.5}
        rx={1}
      />
    </g>
  );
}

/** What Recharts gives a label it sets, with the point's place, its figure and its row's place. */
type LabelProps = {
  /** The place of the row the point stands for. */
  index?: number;
  /** The figure or the name the label writes. */
  value?: unknown;
  /** Where the point is across the plot. */
  x?: number | string;
  /** Where the point is down the plot. */
  y?: number | string;
};

/**
 * A dot's figure beside it. On a row of several dots, the lowest series' is labelled before its
 * dot and the others after, so two dots close together never share a label's place. Where two
 * share the lowest figure, only the first is labelled before.
 * @internal
 */
export function DotLabel({
  figure,
  across,
  series,
  lowest,
  index,
  value,
  x,
  y,
}: LabelProps & {
  figure: (value: number) => string;
  across: boolean;
  /** The series' place among those shown. */
  series: number;
  /**
   * For each row, the place of the series with its lowest figure, or minus one for a single dot.
   */
  lowest: readonly number[];
}) {
  const number = figureOf(value);
  if (index === undefined || x === undefined || y === undefined || number === null) return null;
  const low = lowest[index] === series;
  const gap = 11;
  if (across)
    return (
      <text
        x={Number(x) + (low ? -gap : gap)}
        y={Number(y)}
        dy={4}
        textAnchor={low ? "end" : "start"}
        className="x-govuk-ui-chart-label"
      >
        {figure(number)}
      </text>
    );
  return (
    <text
      x={Number(x)}
      y={Number(y) + (low ? gap + 4 : -gap)}
      dy={low ? 4 : 0}
      textAnchor="middle"
      className="x-govuk-ui-chart-label"
    >
      {figure(number)}
    </text>
  );
}

/**
 * A scatter point's name above it, on one line, or only the one name given.
 * @internal
 */
export function PointLabel({ only, value, x, y }: LabelProps & { only?: string }) {
  if (x === undefined || y === undefined) return null;
  if (only !== undefined && String(value) !== only) return null;
  return (
    <text
      x={Number(x)}
      y={Number(y) - 12}
      textAnchor="middle"
      className="x-govuk-ui-chart-label"
      data-floating={Number(y) - 12}
    >
      {String(value ?? "")}
    </text>
  );
}

/**
 * A slope's name and figure at each end, before the first point, ending at it, and after the last,
 * starting from it. The quiet labels beside the line picked out are in the muted ink.
 * @internal
 */
export function SlopeLabel({
  name,
  figure,
  last,
  quiet,
  index,
  value,
  x,
  y,
}: LabelProps & {
  name: string;
  figure: (value: unknown) => string;
  last: number;
  quiet: boolean;
}) {
  if (x === undefined || y === undefined || figureOf(value) === null) return null;
  if (index !== 0 && index !== last) return null;
  const start = index === 0;
  return (
    <text
      x={Number(x) + (start ? -10 : 10)}
      y={Number(y)}
      dy={4}
      textAnchor={start ? "end" : "start"}
      className="x-govuk-ui-chart-label x-govuk-ui-chart-slope-label"
      data-quiet={quiet || undefined}
      data-floating={Number(y)}
    >
      {start ? `${name} ${figure(value)}` : `${figure(value)} ${name}`}
    </text>
  );
}

/**
 * A funnel stage's name, figure and share, in a column to the right of the funnel. It is found by
 * the stage's place, because two stages may share a name.
 * @internal
 */
export function FunnelLabel({
  labelOf,
  index,
  parentViewBox,
  viewBox,
}: {
  labelOf: (index: number) => string;
  index?: number;
  parentViewBox?: { x?: number; width?: number };
  viewBox?: { y?: number; height?: number };
}) {
  if (!parentViewBox || !viewBox || index === undefined) return null;
  return (
    <text
      x={(parentViewBox.x ?? 0) + (parentViewBox.width ?? 0) + 10}
      y={(viewBox.y ?? 0) + (viewBox.height ?? 0) / 2}
      dy={4}
      className="x-govuk-ui-chart-label"
    >
      {labelOf(index)}
    </text>
  );
}

/**
 * A figure on a radar's scale, upright, with a halo where it crosses a line.
 * @internal
 */
export function RadarTick({
  x,
  y,
  payload,
  figure,
}: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: unknown };
  figure: (value: number) => string;
}) {
  if (x === undefined || y === undefined) return null;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="middle"
      className="x-govuk-ui-chart-label x-govuk-ui-chart-tick"
    >
      {figure(Number(payload?.value))}
    </text>
  );
}

/**
 * A radial bar's name and figure at its start, in the quarter its ring leaves free.
 * @internal
 */
export function RingLabel({
  figure,
  names,
  index,
  value,
  viewBox,
}: {
  figure: (value: unknown) => string;
  names: readonly string[];
  index?: number;
  value?: unknown;
  viewBox?: { cx?: number; cy?: number; innerRadius?: number; outerRadius?: number };
}) {
  if (!viewBox || index === undefined) return null;
  const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0 } = viewBox;
  return (
    <text
      x={cx - 8}
      y={cy - (innerRadius + outerRadius) / 2}
      dy={4}
      textAnchor="end"
      className="x-govuk-ui-chart-label"
    >
      {`${names[index] ?? ""} ${figure(value)}`}
    </text>
  );
}

/**
 * A series' name at the end of its line, in its colour's ink.
 * @internal
 */
export function EndLabel({
  name,
  last,
  colour: fill,
  index,
  x,
  y,
}: LabelProps & { name: string; last: number; colour: string }) {
  if (index !== last || x === undefined || y === undefined) return null;
  return (
    <text
      x={Number(x) + 8}
      y={y}
      dy={4}
      className="x-govuk-ui-chart-line-label"
      data-floating={Number(y)}
      fill={fill}
    >
      {name}
    </text>
  );
}

/**
 * A line across the plot, at a figure or a category, or a band between two. On an upright line, the
 * label sits above the plot, where nothing is drawn under it. On a horizontal line, the label sits
 * at the end where the bars are shortest. That is the right in a horizontal chart, and the left in
 * an upright one. A band's label sits inside its top corner.
 * @internal
 */
function ReferenceMark({ at, to, label, across }: ChartReference & { across: boolean }) {
  // A figure crosses the value axis, and a category the category axis, whichever way they run.
  const onValueAxis = typeof at === "number";
  const vertical = onValueAxis === across;
  if (to !== undefined)
    return (
      <ReferenceArea
        {...(vertical ? { x1: at, x2: to } : { y1: at, y2: to })}
        className="x-govuk-ui-chart-reference-area"
        ifOverflow="extendDomain"
        zIndex={-60}
        label={
          label
            ? {
                value: label,
                position: "insideTopLeft",
                className: "x-govuk-ui-chart-reference-label",
              }
            : undefined
        }
      />
    );
  let position: "top" | "insideTopRight" | "insideTopLeft" = "insideTopLeft";
  if (vertical) position = "top";
  else if (across) position = "insideTopRight";
  return (
    <ReferenceLine
      {...(vertical ? { x: at } : { y: at })}
      className="x-govuk-ui-chart-reference"
      ifOverflow="extendDomain"
      label={
        label
          ? { value: label, position, className: "x-govuk-ui-chart-reference-label" }
          : undefined
      }
    />
  );
}

/**
 * Moves overlapping labels apart, down the plot, keeping the order of their own places. Recharts
 * places each label by its own point, so two lines ending close together, or two points near each
 * other, are labelled in the same place. Each label keeps its own place in `data-floating`, so
 * every pass starts from where Recharts put it and reaches the same answer. A pass sets only what
 * it moves, so once a pass moves nothing, the observer sees no change and the passes stop.
 */
export function spreadLabels(plot: HTMLElement) {
  const labels = [...plot.querySelectorAll<SVGTextElement>("text[data-floating]")];
  if (labels.length < 2) return;
  const boxes = labels.map((label) => {
    const box = label.getBBox();
    const own = Number(label.dataset.floating);
    const moved = Number(label.getAttribute("y") ?? own) - own;
    return { label, own, x: box.x, width: box.width, height: box.height, y: box.y - moved };
  });
  boxes.sort((a, b) => a.y - b.y);
  const placed: typeof boxes = [];
  for (const here of boxes) {
    // The lowest placed label that shares its columns, because a slope's two ends are apart.
    let bottom = Number.NEGATIVE_INFINITY;
    for (const one of placed)
      if (here.x < one.x + one.width && one.x < here.x + here.width)
        bottom = Math.max(bottom, one.y + one.height + 2);
    const shift = Math.max(0, bottom - here.y);
    here.y += shift;
    const y = String(here.own + shift);
    if (here.label.getAttribute("y") !== y) here.label.setAttribute("y", y);
    placed.push(here);
  }
}

/**
 * Whether a change Recharts made to a plot can move a floating label. A change to the drawing
 * itself can. A change to the card under the pointer cannot, because it changes with every move and
 * moves no label.
 */
export function movesLabels(changes: readonly MutationRecord[]) {
  return changes.some(
    (change) =>
      !(change.target instanceof Element ? change.target : change.target.parentElement)?.closest(
        ".recharts-tooltip-wrapper",
      ),
  );
}

/** A pie sector's name, beside it. */
export const sectorLabel = ({ name }: { name?: string | number }) => String(name ?? "");
