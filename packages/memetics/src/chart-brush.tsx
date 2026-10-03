"use client";

import type { ComponentPropsWithRef } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { ChartDatum, ChartSeries } from "./chart-context";
import type { ChartLabels } from "./chart-words";

/** What a brush is drawn from, which is every row of the chart, its series, and the part shown. */
export type BrushState = {
  /** Every row, drawn small. */
  data: readonly ChartDatum[];
  /** The key of each row's category, which the handles name. */
  category: string;
  /** What the categories are, in the handles' names, such as "month". */
  categoryLabel: string;
  /** The series drawn small. */
  series: readonly ChartSeries[];
  /** Each series' colour, in the same order. */
  colours: readonly string[];
  /** The first category shown, by its place. */
  from: number;
  /** The last category shown, by its place. */
  to: number;
  /** Called with the places of the first and last categories a handle moves to. */
  onRangeChange: (range: [from: number, to: number]) => void;
  /** The handles' names and the span's words, in the chart's language. */
  words: ChartLabels;
};

/**
 * The slider beneath a long chart. It draws the whole chart small, with the part shown clear and
 * the rest pale. A handle sits at each end of the part shown, and the first and last categories
 * shown are in words beneath. The handles are native range inputs, one over the other. Each is a
 * slider that the keyboard moves a category at a time, and that screen readers hear as its
 * category.
 * @internal
 */
export function BrushControl({
  data,
  category,
  categoryLabel,
  series,
  colours,
  from,
  to,
  onRangeChange,
  words,
  className = "",
  ...props
}: BrushState & ComponentPropsWithRef<"div">) {
  const last = data.length - 1;
  const name = (index: number) => String(data[index]?.[category] ?? "");
  const place = (index: number) => `${(index / Math.max(1, last)) * 100}%`;
  return (
    <div {...props} className={`x-govuk-ui-chart-brush ${className}`.trim()}>
      <div className="x-govuk-ui-chart-brush-track">
        <div className="x-govuk-ui-chart-brush-overview" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[...data]}
              accessibilityLayer={false}
              margin={{ top: 6, right: 0, bottom: 6, left: 0 }}
            >
              <YAxis hide type="number" domain={["dataMin", "dataMax"]} />
              {series.map((each, index) => (
                <Line
                  key={each.key}
                  dataKey={each.key}
                  type="monotone"
                  stroke={colours[index]}
                  strokeWidth={1.25}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <span className="x-govuk-ui-chart-brush-shade" style={{ left: 0, width: place(from) }} />
          <span className="x-govuk-ui-chart-brush-shade" style={{ left: place(to), right: 0 }} />
          <span
            className="x-govuk-ui-chart-brush-window"
            style={{ left: place(from), width: `calc(${place(to)} - ${place(from)})` }}
          />
        </div>
        <input
          type="range"
          className="x-govuk-ui-chart-brush-handle"
          min={0}
          max={last}
          step={1}
          value={from}
          aria-label={words.firstShown(categoryLabel)}
          aria-valuetext={name(from)}
          onChange={(event) => onRangeChange([Math.min(Number(event.target.value), to - 1), to])}
        />
        <input
          type="range"
          className="x-govuk-ui-chart-brush-handle"
          min={0}
          max={last}
          step={1}
          value={to}
          aria-label={words.lastShown(categoryLabel)}
          aria-valuetext={name(to)}
          onChange={(event) =>
            onRangeChange([from, Math.max(Number(event.target.value), from + 1)])
          }
        />
      </div>
      <p className="x-govuk-ui-chart-brush-range">{words.span(name(from), name(to))}</p>
    </div>
  );
}
