import type { ComponentPropsWithRef, CSSProperties } from "react";
import { extentOf, figureOf, lastFigureOf } from "./chart-maths";

export type SparklineProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
  /** The figures, oldest first. A missing figure, `null`, leaves a gap in the line. */
  data: readonly (number | null)[];
  /**
   * What the line shows, in a sentence, for screen readers, such as "Sales rose through the year
   * to 41 thousand". The line is a picture of its own, so its point must be said.
   */
  description: string;
  /** Shades the area beneath the line. */
  area?: boolean;
  /** How the line runs between its points, which is smoothly, straight, or in steps. */
  curve?: "smooth" | "straight" | "step";
  /**
   * Whether the trend is good news, bad news or neither, as in Stat's change. `good` is GOV.UK's
   * green, `bad` its red, and `neutral` the palette's first colour. The description says which,
   * because colour alone says nothing to some readers.
   */
  sentiment?: "good" | "bad" | "neutral";
  /**
   * The range the line spans, top to bottom. By default, from the lowest figure to the highest.
   */
  domain?: [number, number];
  /** The line's height, in pixels. Its width is its container's. */
  height?: number;
};

/** The plot's width in the drawing's own units. The drawing stretches to the space it has. */
const WIDE = 100;

/**
 * A run of points as a path, which is smooth, straight, or in steps. A smooth path keeps each
 * stretch between two points rising or falling as the figures do, like Recharts' and d3's monotone
 * curve.
 */
function pathOf(points: readonly (readonly [number, number])[], curve: SparklineProps["curve"]) {
  const [first, ...rest] = points;
  if (!first) return "";
  let path = `M${first[0]},${first[1]}`;
  if (curve === "straight") return path + rest.map(([x, y]) => `L${x},${y}`).join("");
  if (curve === "step")
    return (
      path + rest.map(([x, y], index) => `L${x},${points[index]?.[1] ?? y}L${x},${y}`).join("")
    );
  // Each point's slope, which is the gentler of its two sides' slopes, and zero at a peak or a
  // trough, so the curve never overshoots a figure.
  const slopes = points.map(([x, y], index) => {
    const before = points[index - 1];
    const after = points[index + 1];
    const into = before ? (y - before[1]) / (x - before[0]) : null;
    const out = after ? (after[1] - y) / (after[0] - x) : null;
    if (into === null) return out ?? 0;
    if (out === null) return into;
    if (into * out <= 0) return 0;
    return Math.sign(into) * Math.min(Math.abs(into), Math.abs(out), Math.abs(into + out) / 2);
  });
  for (let index = 1; index < points.length; index++) {
    const [x0, y0] = points[index - 1] ?? [0, 0];
    const [x1, y1] = points[index] ?? [0, 0];
    const third = (x1 - x0) / 3;
    path += `C${x0 + third},${y0 + third * (slopes[index - 1] ?? 0)} ${x1 - third},${y1 - third * (slopes[index] ?? 0)} ${x1},${y1}`;
  }
  return path;
}

/**
 * A line of figures as small as a word, for a trend beside a figure or in a table cell, as Tufte
 * drew them. It has no axes and no grid, only the line, shaded beneath, with its latest figure
 * marked. It stretches to its container's width, and draws in from the left as it first shows,
 * unless motion is reduced. Screen readers hear its description, because the line alone tells them
 * nothing. Give the figures themselves beside it.
 */
export function Sparkline({
  data,
  description,
  area = true,
  curve = "smooth",
  sentiment = "neutral",
  domain,
  height = 32,
  className = "",
  style,
  ...props
}: SparklineProps) {
  const figures = data.map(figureOf);
  const extent = extentOf(figures.filter((value): value is number => value !== null));
  const low = domain?.[0] ?? extent?.[0] ?? 0;
  const high = domain?.[1] ?? extent?.[1] ?? 0;
  const span = high - low || 1;
  const step = data.length > 1 ? WIDE / (data.length - 1) : 0;
  const at = (value: number, index: number) =>
    [index * step, height - ((value - low) / span) * height] as const;
  // The line breaks at each missing figure, into runs drawn one after another.
  const runs: (readonly [number, number])[][] = [[]];
  figures.forEach((value, index) => {
    if (value === null) runs.push([]);
    else runs.at(-1)?.push(at(value, index));
  });
  const drawn = runs.filter((run) => run.length > 0);
  const line = drawn.map((run) => pathOf(run, curve)).join("");
  const shade = drawn
    .map((run) => {
      const first = run[0];
      const last = run.at(-1);
      return first && last
        ? `${pathOf(run, curve)}L${last[0]},${height}L${first[0]},${height}Z`
        : "";
    })
    .join("");
  // The latest figure, marked with a dot, or none where every figure is missing.
  const last = lastFigureOf(figures);
  const latest = figures[last] ?? null;
  const end = latest === null ? null : at(latest, last);
  return (
    <span
      {...props}
      className={`x-govuk-ui-sparkline ${className}`.trim()}
      data-sentiment={sentiment}
      role="img"
      aria-label={description}
      style={{ ...style, height }}
    >
      <svg
        className="x-govuk-ui-sparkline-line"
        viewBox={`0 0 ${WIDE} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        {area && <path className="x-govuk-ui-sparkline-area" d={shade} />}
        <path d={line} fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* The latest figure's dot is part of the page, not the drawing, so it stays round however
          the drawing stretches. The drawing leaves space at its ends for half of it. */}
      {end && (
        <span
          className="x-govuk-ui-sparkline-end"
          aria-hidden="true"
          style={
            {
              "--x-govuk-ui-sparkline-x": end[0] / WIDE,
              "--x-govuk-ui-sparkline-y": end[1] / height,
            } as CSSProperties
          }
        />
      )}
    </span>
  );
}
