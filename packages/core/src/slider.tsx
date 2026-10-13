"use client";

import { Slider as Primitive } from "@base-ui/react/slider";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import {
  ErrorMessage,
  Field,
  Hint,
  type LabelProps,
  NamingLabel,
  present,
  useBoundField,
  useFieldSummary,
} from "./field";
import { useLocale } from "./labels";
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
  errorMessage?: ReactNode;
  /** The value. Leave it out to let the slider keep track. */
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Called once the user lets go, for work that should not run on every step. */
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

/** What a slider's parts share, from its root. */
type SliderShared = {
  /** The root's id, which a Form's error summary links to. */
  id: string;
  /** The thumb, which settles after a drag or a run of keys. */
  thumb: RefObject<HTMLDivElement | null>;
};

const SliderContext = createContext<SliderShared | null>(null);

function useSlider(part: string) {
  const slider = useContext(SliderContext);
  if (!slider) throw new Error(`${part} must be inside SliderRoot.`);
  return slider;
}

/**
 * Picks a number from a range by dragging, or with the arrow keys. Base UI provides the behaviour,
 * and the Field parts label it. For exact numbers, an Input is easier to use.
 *
 * It is a bound Field holding a `SliderRoot`, with a `SliderLabel` and a `SliderValue` side by
 * side, a `Hint`, an `ErrorMessage` and a `SliderControl`. Compose those parts yourself to put
 * something between them.
 */
export function Slider({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  showValue = true,
  id,
  "aria-describedby": describedBy,
  ...props
}: SliderProps) {
  const generated = useId();
  return (
    <Field
      controlId={id ?? `field-${generated}`}
      name={props.name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <SliderRoot {...props}>
        <div className="x-govuk-ui-slider-header">
          <SliderLabel visuallyHidden={hideLabel}>{label}</SliderLabel>
          {showValue && <SliderValue />}
        </div>
        <Hint>{hint}</Hint>
        <ErrorMessage />
        <SliderControl />
      </SliderRoot>
    </Field>
  );
}

export type SliderRootProps = Omit<
  SliderProps,
  "label" | "hint" | "hideLabel" | "errorMessage" | "showValue"
> & {
  /** The slider's parts, which are a `SliderLabel`, a `SliderValue` and a `SliderControl`. */
  children?: ReactNode;
};

/**
 * A slider of your own. It keeps the value, and holds the slider's parts, which are a
 * `SliderLabel`, a `SliderValue` and a `SliderControl`, with a `Hint` and an `ErrorMessage`
 * between them. In a bound Field, it takes its id and name from the field, so a Form's error
 * summary links to it and focuses the thumb inside. Check your answers shows the value as the
 * slider shows it.
 */
export function SliderRoot({
  value,
  defaultValue,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  format,
  disabled = false,
  name: ownName,
  id: ownId,
  className = "",
  children,
  ...props
}: SliderRootProps) {
  const field = useBoundField();
  const generated = useId();
  const id = ownId ?? field?.id ?? `slider-${generated}`;
  const name = ownName ?? field?.name;
  // The value is written in the page's language, the same on the server and in the browser.
  const locale = useLocale();
  // Check your answers shows the value as the slider shows it.
  useFieldSummary({
    answer: (data) => {
      const sent = name ? data.get(name) : null;
      return typeof sent === "string" && sent !== ""
        ? new Intl.NumberFormat(locale, format).format(Number(sent))
        : undefined;
    },
  });
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
    <SliderContext value={{ id, thumb }}>
      <Primitive.Root
        {...props}
        // A Form's error summary links here, and focuses the thumb inside.
        id={id}
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
        locale={locale}
        disabled={disabled}
        name={name}
      >
        {children}
      </Primitive.Root>
    </SliderContext>
  );
}

/**
 * A slider's label. The thumb is named by its id, because a label cannot be for a slider's thumb.
 * In a bound Field, its words are the question that Check your answers lists.
 */
export function SliderLabel(props: Omit<LabelProps, "htmlFor" | "id">) {
  const { id } = useSlider("SliderLabel");
  return <NamingLabel {...props} id={`${id}-label`} />;
}

/** The slider's value, as it reads, such as 40%, which changes as the thumb moves. */
export function SliderValue({
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"output">, "children">) {
  return <Primitive.Value {...props} className={`x-govuk-ui-slider-value ${className}`.trim()} />;
}

/**
 * The slider's track and thumb. The thumb is named by the `SliderLabel` and, in a bound Field,
 * described by the field's hint and error.
 */
export function SliderControl({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  const { id, thumb } = useSlider("SliderControl");
  const field = useBoundField();
  return (
    <Primitive.Control {...props} className={`x-govuk-ui-slider-control ${className}`.trim()}>
      <Primitive.Track className="x-govuk-ui-slider-track">
        <Primitive.Indicator className="x-govuk-ui-slider-indicator" />
        <Primitive.Thumb
          ref={thumb}
          className="x-govuk-ui-slider-thumb"
          aria-labelledby={`${id}-label`}
          aria-describedby={field?.controlProps["aria-describedby"]}
        />
      </Primitive.Track>
    </Primitive.Control>
  );
}
