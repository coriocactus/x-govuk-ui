import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";
import { niceScale } from "./chart-maths";
import { type ChartLabels, plainIn, wordsOf } from "./chart-words";

export type BulletChartRange = {
  /** Where the range ends. Each range starts where the one before ended, and the first at `min`. */
  to: number;
  /** What a figure in it means, such as "Below target". */
  label: string;
};

export type BulletChartProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** What the figure measures, such as "Licences sold this week". */
  label: ReactNode;
  /** The figure, which the bar runs to. */
  value: number;
  /** The figure aimed for, marked across the bar and given in words. */
  target?: number;
  /**
   * Bands behind the bar, from the lowest, such as poor, fair and good. Their greys darken evenly
   * as they rise, however many there are. The last band ends the scale.
   */
  ranges?: readonly BulletChartRange[];
  /** The figure at the bar's start. */
  min?: number;
  /**
   * The figure at the bar's end. By default, the last range's end, or a round figure past the value
   * and target.
   */
  max?: number;
  /** Writes the figures, such as "£1.2m". By default, as the `labels`' language writes numbers. */
  format?: (value: number) => string;
  /** A line beneath the label, such as the period it covers. */
  description?: ReactNode;
  /** The words the chart writes itself, such as Target, for another language. */
  labels?: Partial<ChartLabels>;
};

/** The end of the scale a tick is at, if it is at one, so its figure keeps within the bar. */
const endOf = (index: number, count: number) => {
  if (index === 0) return "start";
  if (index === count - 1) return "end";
  return undefined;
};
/** A place along the bar, as a share of its length. */
const along = (value: number, min: number, max: number) =>
  Math.min(1, Math.max(0, (value - min) / (max - min || 1)));
/** The palest band's grey and the darkest band's, as shares of the ink mixed into the paper. */
const PALEST = 8;
const DARKEST = 36;
/** A band's grey, each darker than the one before, from the palest to the darkest. */
const bandOf = (index: number, count: number) =>
  ({
    "--x-govuk-ui-bullet-chart-band": `${PALEST + ((DARKEST - PALEST) * index) / Math.max(1, count - 1)}%`,
  }) as CSSProperties;

/**
 * A figure against its target, as in Stephen Few's bullet graph, drawn in place of a dashboard's
 * dial. A bar shows the figure, a mark across it shows the target, and bands of grey behind show
 * what the figures mean, with a scale beneath. The label, the figure and the target are words
 * beside the bar, so screen readers hear them. The bands are named in a key, so no reader needs
 * the greys. Several, one above another, compare measures in little space. The bar grows from its
 * start as it first shows, unless motion is reduced.
 */
export function BulletChart({
  label,
  value,
  target,
  ranges = [],
  min = 0,
  max: ownMax,
  format: ownFormat,
  description,
  labels,
  className = "",
  ...props
}: BulletChartProps) {
  const words = wordsOf(labels);
  const format = ownFormat ?? plainIn(words.locale);
  const scale = niceScale(min, Math.max(value, target ?? value, min));
  const max = ownMax ?? ranges.at(-1)?.to ?? scale.domain[1];
  const ticks =
    ownMax === undefined && ranges.length === 0
      ? scale.ticks
      : niceScale(min, max).ticks.filter((tick) => tick <= max);
  return (
    <div {...props} className={`x-govuk-ui-bullet-chart ${className}`.trim()}>
      {/* What is measured, and its figure, as a term and its description, so a screen reader
          hears them as a pair. */}
      <dl className="x-govuk-ui-bullet-chart-words">
        <dt className="x-govuk-ui-bullet-chart-label">{label}</dt>
        <dd className="x-govuk-ui-bullet-chart-figures">
          <span className="x-govuk-ui-bullet-chart-value">{format(value)}</span>
          {target !== undefined && (
            <span className="x-govuk-ui-bullet-chart-target-words">
              {words.target(format(target))}
            </span>
          )}
        </dd>
        {description && <dd className="x-govuk-ui-bullet-chart-description">{description}</dd>}
      </dl>
      <div className="x-govuk-ui-bullet-chart-plot" aria-hidden="true">
        <div className="x-govuk-ui-bullet-chart-track">
          {ranges.map((range, index) => {
            const from = along(ranges[index - 1]?.to ?? min, min, max);
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: A band has only its place, as two may share a name.
                key={index}
                className="x-govuk-ui-bullet-chart-range"
                style={{
                  ...bandOf(index, ranges.length),
                  left: `${from * 100}%`,
                  width: `${(along(range.to, min, max) - from) * 100}%`,
                }}
              />
            );
          })}
          <span
            className="x-govuk-ui-bullet-chart-bar"
            style={{ "--x-govuk-ui-bullet-chart-share": along(value, min, max) } as CSSProperties}
          />
          {target !== undefined && (
            <span
              className="x-govuk-ui-bullet-chart-target"
              style={{ left: `${along(target, min, max) * 100}%` }}
            />
          )}
        </div>
        <div className="x-govuk-ui-bullet-chart-scale">
          {ticks.map((tick, index) => (
            <span
              key={tick}
              className="x-govuk-ui-bullet-chart-tick"
              data-end={endOf(index, ticks.length)}
              style={{ left: `${along(tick, min, max) * 100}%` }}
            >
              {format(tick)}
            </span>
          ))}
        </div>
      </div>
      {ranges.length > 0 && (
        <ul className="x-govuk-ui-bullet-chart-key">
          {ranges.map((range, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: A band has only its place, as two may share a name.
            <li key={index}>
              <span
                className="x-govuk-ui-bullet-chart-range"
                style={bandOf(index, ranges.length)}
                aria-hidden="true"
              />
              {range.label}
              <span className="x-govuk-ui-visually-hidden">
                , {words.range(format(ranges[index - 1]?.to ?? min), format(range.to))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
