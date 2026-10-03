"use client";

import {
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMergedRef } from "./refs";
import { useScopeSound } from "./sound-scope";

type Orientation = "horizontal" | "vertical";

export type ResizableHandleProps = Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange"
> & {
  /** Names the handle for screen readers. */
  label?: string;
  /** Shows a grip on the line, so the handle is easier to find. */
  grip?: boolean;
  /**
   * The way the line runs. A vertical line resizes something beside it, and a horizontal line
   * something below.
   */
  orientation?: Orientation;
  value?: number;
  min?: number;
  max?: number;
  /** Double-clicking the handle returns the size to this. */
  defaultValue?: number;
  /** Called with each size the handle reaches, at every step of a drag. */
  onValueChange?: (value: number) => void;
  /**
   * Called once a size is chosen, which is as a drag ends, if it moved, and with each key and
   * double-click. Save the size here, such as in storage, not at every step of a drag.
   */
  onValueCommit?: (value: number) => void;
  /** Which side of the handle the resized panel is on. */
  panel?: "before" | "after";
  /** The id of the resized panel. */
  controls?: string;
  /** How far each arrow key moves the handle, in pixels. By default, the snap, or else 10. */
  step?: number;
  /** Snaps the size to steps of this many pixels as the handle is dragged. */
  snap?: number;
  /** Called as a drag starts and ends, for example to pause transitions while it lasts. */
  onDraggingChange?: (dragging: boolean) => void;
  /**
   * Keeps the size where it is, while there is nothing to resize, such as a panel folded away. The
   * line stays, but takes no pointer and no focus.
   */
  disabled?: boolean;
};

/**
 * A line that resizes the panels on either side when it is dragged, or focused and moved with the
 * arrow keys, as WAI-ARIA's window splitter does. Shift moves it four steps at a time, and Home and
 * End take the panel to its smallest and largest sizes. The line darkens to link blue under the
 * pointer, and takes GOV.UK's focus colours with the keyboard. A step plays a tick that rises in
 * pitch with the size. Pushing against a limit plays a single tick. With a snap, a drag moves in
 * steps, each gliding into place with its own tick.
 */
export function ResizableHandle({
  label = "Resize",
  grip = false,
  orientation = "vertical",
  value: controlled,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  defaultValue,
  onValueChange,
  onValueCommit,
  panel = "after",
  controls,
  step: ownStep,
  snap,
  onDraggingChange,
  disabled = false,
  className = "",
  ref,
  ...props
}: ResizableHandleProps) {
  const play = useScopeSound();
  const handle = useRef<HTMLDivElement>(null);
  const merged = useMergedRef(handle, ref);
  const [dragging, setDragging] = useState(false);
  // During a drag, the handle shows the size it has reached itself. The page that owns the size can
  // then follow the drag without rendering again, and take the size once the drag ends.
  const [live, setLive] = useState<number | null>(null);
  const drag = useRef<{ position: number; value: number; reached?: number } | null>(null);
  const limited = useRef(false);

  const value = live ?? controlled ?? 0;
  const step = ownStep ?? snap ?? 10;
  // The handle can size the panel on either side of it.
  const sign = panel === "before" ? 1 : -1;
  const across = orientation === "vertical";
  // A step's tick rises in pitch with the size, across a range that has both ends.
  const pitch = (size: number) => {
    const span = max - min;
    return span > 0 && span < Infinity ? ((size - min) / span) * 900 : 0;
  };

  const apply = (next: number) => {
    const size = Math.round(Math.min(max, Math.max(min, next)));
    if (drag.current) {
      drag.current.reached = size;
      setLive(size);
    }
    onValueChange?.(size);
    return size;
  };
  // A size chosen at once, by a key or a double-click, is applied and committed together. It is
  // applied first, because an optional call skips evaluating its arguments when there is nothing to
  // call.
  const choose = (next: number) => {
    const size = apply(next);
    onValueCommit?.(size);
  };
  const finish = () => {
    if (!drag.current) return;
    const { reached } = drag.current;
    drag.current = null;
    setLive(null);
    setDragging(false);
    onDraggingChange?.(false);
    if (reached !== undefined) onValueCommit?.(reached);
  };

  // If the handle is disabled mid-drag, the drag ends where it is.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only a change to disabled ends it.
  useEffect(() => {
    if (disabled) finish();
  }, [disabled]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { position: across ? event.clientX : event.clientY, value };
    limited.current = false;
    setDragging(true);
    onDraggingChange?.(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const moved = (across ? event.clientX : event.clientY) - start.position;
    const free = start.value + moved * sign;
    // Pushing past a limit ticks once, until the handle comes away from it.
    const against = free < min || free > max;
    if (against && !limited.current) play("tick", { velocity: 0.6 });
    limited.current = against;
    if (!snap) return apply(free);
    // With a snap, the handle moves only to the nearest step. It glides there with a tick that
    // rises in pitch with the size.
    const wanted = Math.min(max, Math.max(min, Math.round(free / snap) * snap));
    if (wanted === value) return;
    play("sliderTick", { detune: pitch(wanted) });
    apply(wanted);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const amount = (event.shiftKey ? 4 : 1) * step * sign;
    const forward = across ? "ArrowRight" : "ArrowDown";
    const back = across ? "ArrowLeft" : "ArrowUp";
    let next: number;
    switch (event.key) {
      case forward:
        next = value + amount;
        break;
      case back:
        next = value - amount;
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    const clamped = Math.min(max, Math.max(min, next));
    if (clamped === value) return play("tick", { velocity: 0.6 });
    play("sliderTick", { detune: pitch(clamped) });
    choose(clamped);
  };

  const rounded = Math.round(value);
  return (
    // biome-ignore lint/a11y/useSemanticElements: A focusable separator with a value is WAI-ARIA's window splitter, and an hr cannot hold the grip.
    <div
      {...props}
      ref={merged}
      role="separator"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={label}
      aria-controls={controls}
      aria-orientation={orientation}
      aria-valuemin={Number.isFinite(min) ? Math.round(min) : undefined}
      aria-valuemax={Number.isFinite(max) ? Math.round(max) : undefined}
      aria-valuenow={rounded}
      aria-valuetext={`${rounded} pixels`}
      className={`x-govuk-ui-resizable-handle ${className}`.trim()}
      data-dragging={dragging || undefined}
      data-grip={grip || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
        finish();
      }}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onDoubleClick={() => {
        if (disabled || defaultValue === undefined) return;
        choose(defaultValue);
        play("tap", { velocity: 0.7 });
      }}
      onKeyDown={onKeyDown}
    >
      {grip && <span className="x-govuk-ui-resizable-grip" />}
    </div>
  );
}
