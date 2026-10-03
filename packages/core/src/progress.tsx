"use client";

import { Progress as Primitive } from "@base-ui/react/progress";
import type { ComponentPropsWithRef, ReactNode } from "react";

export type ProgressProps = ComponentPropsWithRef<"div"> & {
  label: ReactNode;
  /** How far the task has got. Null means it is under way, but how far is not known. */
  value: number | null;
  min?: number;
  max?: number;
  /** How the value reads, such as `{ style: "percent" }`. */
  format?: Intl.NumberFormatOptions;
  /** Shows the value beside the label. */
  showValue?: boolean;
};

/**
 * How far a task has got, such as an upload. The bar eases forward as the value changes. Without a
 * value, it sweeps along the track. When complete, it turns green and plays the success sound. Base
 * UI provides the behaviour, so screen readers hear the label and the value.
 */
export function Progress({
  label,
  value,
  min = 0,
  max = 100,
  format,
  showValue = true,
  className = "",
  ...props
}: ProgressProps) {
  const complete = value !== null && value >= max;
  return (
    <Primitive.Root
      {...props}
      className={`x-govuk-ui-progress ${className}`.trim()}
      value={value}
      min={min}
      max={max}
      format={format}
      // SoundScope plays the success sound when this appears.
      data-success={complete || undefined}
    >
      <div className="x-govuk-ui-progress-header">
        <Primitive.Label className="x-govuk-ui-progress-label">{label}</Primitive.Label>
        {showValue && value !== null && <Primitive.Value className="x-govuk-ui-progress-value" />}
      </div>
      <Primitive.Track className="x-govuk-ui-progress-track">
        <Primitive.Indicator className="x-govuk-ui-progress-indicator" />
      </Primitive.Track>
    </Primitive.Root>
  );
}
