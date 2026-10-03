"use client";

import { Slider as Primitive } from "@base-ui/react/slider";
import { type ComponentPropsWithRef, type ReactNode, useEffect, useRef } from "react";
import { Field, Hint, Label, useField } from "./field";
import { useMotionTiming } from "./motion";
import { useScopeSound } from "./sound-scope";

export type SliderProps = Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onValueChange" | "onValueCommitted" | "id"
> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  /** The value. Leave it out to let the slider keep track. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Called once the person lets go, for work that should not run on every step. */
  onValueCommitted?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** How the value reads, such as `{ style: "percent" }` for 0.4 as 40%. */
  format?: Intl.NumberFormatOptions;
  /** Shows the value beside the label. */
  showValue?: boolean;
  disabled?: boolean;
  /** The name the value submits under in a form. */
  name?: string;
  id?: string;
};

/** How long the thumb waits before it settles, in milliseconds, keyed by how the value changed. */
const SETTLE_AFTER: Partial<Record<string, number>> = { drag: 130, keyboard: 160 };

/**
 * Picks a number from a range by dragging, or with the arrow keys. Base UI provides the behaviour,
 * and the Field parts label it. For exact numbers, an Input is easier to use.
 */
export function Slider({
  label,
  hint,
  hideLabel = false,
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  format,
  showValue = true,
  disabled = false,
  name,
  id,
  className = "",
  ...props
}: SliderProps) {
  const field = useField({ id, hint });
  const labelId = `${field.id}-label`;
  const play = useScopeSound();
  const { reduced } = useMotionTiming();
  const lastTick = useRef(0);
  const thumb = useRef<HTMLDivElement>(null);
  const travel = useRef({ value: value ?? defaultValue ?? min, direction: 0 });
  const rest = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(rest.current), []);
  // When the thumb comes to rest, it continues a little in the direction it was going, and comes
  // back to its value in one smooth motion, squeezing a little from side to side as it turns. It
  // waits until a drag or a run of key presses has paused, and until the glide to the last step has
  // almost finished.
  const settle = (next: number, wait: number) => {
    const direction = Math.sign(next - travel.current.value) || travel.current.direction;
    travel.current = { value: next, direction };
    clearTimeout(rest.current);
    if (reduced || !direction) return;
    rest.current = setTimeout(() => {
      const sway = (distance: number) => `translateX(${distance * direction}px)`;
      thumb.current?.animate(
        [
          { transform: sway(0), scale: "1 1", easing: "cubic-bezier(0.2, 0.6, 0.35, 1)" },
          {
            transform: sway(3),
            scale: "0.86 1.06",
            offset: 0.35,
            easing: "cubic-bezier(0.45, 0, 0.25, 1)",
          },
          { transform: sway(0), scale: "1 1" },
        ],
        { duration: 380 },
      );
    }, wait);
  };
  // Each step ticks, higher in pitch towards the top of the range. Fast drags are thinned to one
  // tick in about 30 milliseconds, as SoundScope does for native range inputs.
  const tick = (next: number) => {
    const now = performance.now();
    if (now - lastTick.current < 28) return;
    lastTick.current = now;
    play("sliderTick", { detune: ((next - min) / (max - min || 1)) * 900 });
  };
  return (
    <Field>
      <Primitive.Root
        {...props}
        className={`x-govuk-ui-slider ${className}`.trim()}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next, details) => {
          tick(next as number);
          settle(next as number, SETTLE_AFTER[details.reason] ?? 140);
          onValueChange?.(next as number);
        }}
        onValueCommitted={(next) => onValueCommitted?.(next as number)}
        min={min}
        max={max}
        step={step}
        format={format}
        disabled={disabled}
        name={name}
      >
        <div className="x-govuk-ui-slider-header">
          <Label id={labelId} visuallyHidden={hideLabel}>
            {label}
          </Label>
          {showValue && <Primitive.Value className="x-govuk-ui-slider-value" />}
        </div>
        <Hint id={field.hintId}>{hint}</Hint>
        <Primitive.Control className="x-govuk-ui-slider-control">
          <Primitive.Track className="x-govuk-ui-slider-track">
            <Primitive.Indicator className="x-govuk-ui-slider-indicator" />
            <Primitive.Thumb
              ref={thumb}
              className="x-govuk-ui-slider-thumb"
              aria-labelledby={labelId}
              aria-describedby={field.controlProps["aria-describedby"]}
            />
          </Primitive.Track>
        </Primitive.Control>
      </Primitive.Root>
    </Field>
  );
}
