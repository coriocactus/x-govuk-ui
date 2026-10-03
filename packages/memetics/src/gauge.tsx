"use client";

import { type ComponentPropsWithRef, type CSSProperties, type ReactNode, useId } from "react";
import { type ChartLabels, plainIn, wordsOf } from "./chart-words";

export type GaugeProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** What the figure measures, beneath the dial, such as "Applications decided within 10 days". */
  label: ReactNode;
  /** The figure, which the dial fills to. */
  value: number;
  /** The figure at the dial's start. */
  min?: number;
  /** The figure at the dial's end. */
  max?: number;
  /**
   * Writes the figure in the dial's middle and for screen readers, such as "82%". By default, as
   * the `labels`' language writes numbers.
   */
  format?: (value: number) => string;
  /** A mark across the dial at the figure aimed for. */
  target?: number;
  /** A line beneath the label, such as the period it covers. */
  description?: ReactNode;
  /** Whether the figure is good news, bad news or neither, in GOV.UK's green, red or brand blue. */
  sentiment?: "good" | "bad" | "neutral";
  /** The dial's width, in pixels. */
  size?: number;
  /** The words the gauge says to screen readers, with its figures, for another language. */
  labels?: Partial<ChartLabels>;
};

/** The dial runs two thirds of a turn, from the lower left around to the lower right. */
const SWEEP = 240;
const RADIUS = 42;
/** A point on the dial, `turned` degrees clockwise from its start. */
const point = (turned: number, radius = RADIUS) => {
  const angle = ((turned - SWEEP / 2) * Math.PI) / 180;
  return [50 + radius * Math.sin(angle), 50 - radius * Math.cos(angle)] as const;
};
const [startX, startY] = point(0);
const [endX, endY] = point(SWEEP);
const ARC = `M${startX},${startY}A${RADIUS},${RADIUS} 0 1 1 ${endX},${endY}`;

/**
 * One figure on a dial between two others, such as a share of applications decided in time. The
 * figure is large in its middle, with what it measures beneath. The dial fills from its start as it
 * first shows, and moves as the figure changes, unless motion is reduced. Screen readers hear it as
 * a meter, named by its label, with the figure, the range and any target in words. A dial is read
 * less exactly than a bar, so use it for one figure that matters, not to compare several.
 */
export function Gauge({
  label,
  value,
  min: ownMin = 0,
  max: ownMax = 100,
  format: ownFormat,
  target,
  description,
  sentiment = "neutral",
  size = 180,
  labels,
  className = "",
  style,
  ...props
}: GaugeProps) {
  const labelId = useId();
  // A meter needs a range that runs upwards, so bounds that do not are read as zero to a hundred.
  // The figure screen readers are given is kept within them. The meter's words, and the figure in
  // the dial, show the figure as it is, even beyond the range.
  const ordered = Number.isFinite(ownMin) && Number.isFinite(ownMax) && ownMax > ownMin;
  const [min, max] = ordered ? [ownMin, ownMax] : [0, 100];
  const span = max - min;
  const share = Number.isFinite(value) ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
  const aim = target === undefined ? null : Math.min(1, Math.max(0, (target - min) / span));
  const [innerX, innerY] = aim === null ? [0, 0] : point(aim * SWEEP, RADIUS - 9);
  const [outerX, outerY] = aim === null ? [0, 0] : point(aim * SWEEP, RADIUS + 9);
  const language = wordsOf(labels);
  const format = ownFormat ?? plainIn(language.locale);
  const words = language.meter({
    value: format(value),
    min: format(min),
    max: format(max),
    target: target === undefined ? undefined : format(target),
  });
  return (
    <div
      {...props}
      className={`x-govuk-ui-gauge ${className}`.trim()}
      data-sentiment={sentiment}
      style={{ "--x-govuk-ui-gauge-size": `${size}px`, ...style } as CSSProperties}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: A native meter is a replaced element, which cannot contain the dial's drawing and its figure. */}
      <div
        className="x-govuk-ui-gauge-dial"
        role="meter"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={min + share * span}
        aria-valuetext={words}
        aria-labelledby={labelId}
      >
        <svg viewBox="0 0 100 78" aria-hidden="true" focusable="false">
          <path className="x-govuk-ui-gauge-track" d={ARC} />
          <path
            className="x-govuk-ui-gauge-value"
            d={ARC}
            pathLength={1}
            style={{ strokeDasharray: `${share} 1` }}
          />
          {aim !== null && (
            <line
              className="x-govuk-ui-gauge-target"
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
            />
          )}
        </svg>
        <span className="x-govuk-ui-gauge-figure">{format(value)}</span>
      </div>
      <span id={labelId} className="x-govuk-ui-gauge-label">
        {label}
      </span>
      {description && <span className="x-govuk-ui-gauge-description">{description}</span>}
    </div>
  );
}
