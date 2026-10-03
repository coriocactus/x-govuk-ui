"use client";

import { type AnimationPlaybackControls, animate } from "motion/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { easeOut, useMotionTiming } from "./motion";
import { useScopeSound } from "./sound-scope";

/** The height of one value on the drum, and the angle between values as it turns. */
const ROW = 28;
const TURN = 0.42;
const RADIUS = ROW / TURN;
const nearby = [-3, -2, -1, 0, 1, 2, 3];

export type DialProps = {
  id: string;
  name?: string;
  /** The values the dial stops at, as numbers in order, such as "0" to "23". */
  options: readonly string[];
  /**
   * Goes round from the last value to the first, as hours and minutes do. Years stop at the ends.
   */
  cyclic?: boolean;
  /** Where an empty field starts turning from, such as this year. By default, the first value. */
  startAt?: string;
  /**
   * The most characters the field takes, such as 2 for a day or 4 for a year. The field is as wide
   * as that many figures in the page's font, with its padding and border around them, so it fits
   * in any typeface.
   */
  width: number;
  maxLength?: number;
  autoComplete?: string;
  value: string;
  invalid?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  /** Tidies what was typed once the field loses focus, such as 5 minutes to 05. */
  tidy?: (value: string) => string;
};

/**
 * A short numeric field that can be typed into, or turned like a dial a step at a time. Date input
 * and Time input are made of Dials. A faint shade at its top and bottom, and the grab cursor,
 * invite a drag.
 *
 * Dragging up or down, scrolling over it once it has focus, or the arrow keys turn it. A drum rises
 * out of the field, behind it, and the values click past one step at a time, ticking as each
 * passes. The drum then fades. Up takes the value above on the drum, which is the one before. Down
 * takes the one below. A press without a drag selects the value, ready to type over. The Dial stays
 * a text field, as GOV.UK's date fields are, so screen readers hear what is typed.
 * @internal
 */
export function Dial({
  id,
  name,
  options,
  cyclic = true,
  startAt,
  width,
  maxLength = 2,
  autoComplete = "off",
  value,
  invalid = false,
  disabled = false,
  onChange,
  tidy,
}: DialProps) {
  const play = useScopeSound();
  const { reduced } = useMotionTiming();
  const count = options.length;
  const hold = (index: number) =>
    cyclic ? index : Math.min(count - 1, Math.max(0, Math.round(index)));
  const wrap = (index: number) =>
    cyclic ? ((Math.round(index) % count) + count) % count : hold(index);
  // The stop nearest a number, on a dial that may stop only every few values.
  const nearest = (number: number) =>
    options.reduce(
      (best, option, index) =>
        Math.abs(Number(option) - number) < Math.abs(Number(options[best]) - number) ? index : best,
      0,
    );
  const number = Number(value);
  const typed = value.trim() !== "" && !Number.isNaN(number);
  const current = typed ? nearest(number) : -1;
  const home = startAt === undefined ? 0 : nearest(Number(startAt));
  const start = () => (current === -1 ? home : current);

  // The drum's turn, in steps. It shows while the dial turns, and fades once it has settled.
  const [turn, setTurn] = useState(start);
  const [showing, setShowing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const turning = useRef(turn);
  // The step the dial is heading for, so presses in quick succession each count.
  const aim = useRef(turn);
  const motion = useRef<AnimationPlaybackControls | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ y: number; from: number; moved: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Each step the drum passes ticks, higher towards the end of the range, and becomes the value.
  const place = (position: number, quiet = false) => {
    const before = wrap(turning.current);
    turning.current = position;
    setTurn(position);
    const after = wrap(position);
    if (after === before && !quiet) return;
    if (!quiet) play("sliderTick", { detune: (after / Math.max(1, count - 1)) * 900 });
    onChange(options[after]!);
  };
  const settle = (delay = 700) => {
    if (hide.current) clearTimeout(hide.current);
    if (drag.current?.moved) return;
    hide.current = setTimeout(() => setShowing(false), delay);
  };
  // Turns a step or more, clicking through each step between, and settles on the last.
  const roll = (wanted: number, quick = false) => {
    const to = hold(wanted);
    aim.current = to;
    if (hide.current) clearTimeout(hide.current);
    setShowing(true);
    motion.current?.stop();
    if (reduced) {
      place(to);
      return settle();
    }
    motion.current = animate(turning.current, to, {
      duration: quick ? 0.16 : 0.28,
      ease: easeOut,
      onUpdate: (position) => place(position),
      onComplete: () => settle(),
    });
  };
  // An empty field first takes its starting value, then turns from there.
  const from = () => {
    if (showing) return aim.current;
    if (current === -1) {
      turning.current = home;
      aim.current = home;
      place(home, true);
    }
    return start();
  };
  // At rest, the drum stands at the field's value, ready to turn from there.
  useEffect(() => {
    if (showing || current === -1) return;
    turning.current = current;
    aim.current = current;
    setTurn(current);
  }, [current, showing]);

  // Scrolling over a focused field turns it, a step at a time. The listener is the browser's own,
  // so it can keep the page from scrolling instead.
  const gathered = useRef(0);
  const onWheel = useRef<(event: WheelEvent) => void>(() => {});
  onWheel.current = (event) => {
    if (document.activeElement !== input.current || disabled) return;
    event.preventDefault();
    gathered.current += event.deltaY;
    const steps = Math.trunc(gathered.current / 40);
    if (!steps) return;
    gathered.current -= steps * 40;
    roll(from() + steps);
  };

  // A drag ends however the press ends. It may be let go over the field or anywhere else, or
  // cancelled, or found to be over when the pointer next moves with no button held.
  const finish = useRef<() => void>(() => {});
  finish.current = () => {
    const held = drag.current;
    if (!held) return;
    drag.current = null;
    setDragging(false);
    input.current?.focus();
    if (held.moved) settle();
    else input.current?.select();
  };
  useEffect(() => {
    const element = input.current;
    const wheel = (event: WheelEvent) => onWheel.current(event);
    const up = () => finish.current();
    element?.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      element?.removeEventListener("wheel", wheel);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      motion.current?.stop();
      if (hide.current) clearTimeout(hide.current);
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Up moves to the value above on the drum, as in a list, and Down to the one below.
    const by = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }[event.key];
    if (!by && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (event.key === "Home") return roll(0);
    if (event.key === "End") return roll(count - 1);
    // A first press on an empty field shows where it starts, such as this year.
    const empty = current === -1 && !showing;
    const at = from();
    roll(empty ? at : at + (by ?? 0));
  };

  // Dragging up turns the values on, as a dial's do, a step for every 28 pixels. A press without a
  // drag focuses the field and selects its value, ready to type over. The press's default is
  // prevented, so a drag never selects the text instead.
  const onPointerDown = (event: PointerEvent<HTMLInputElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, from: 0, moved: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLInputElement>) => {
    const held = drag.current;
    if (!held) return;
    if (event.buttons === 0) return finish.current();
    const moved = event.clientY - held.y;
    if (!held.moved) {
      if (Math.abs(moved) < 4) return;
      held.moved = true;
      held.from = Math.round(from());
      setDragging(true);
      setShowing(true);
    }
    const step = hold(held.from - Math.round(moved / ROW));
    if (step !== aim.current) roll(step, true);
  };

  const centre = Math.round(turn);
  return (
    <div
      className="x-govuk-ui-dial"
      data-showing={showing || undefined}
      data-dragging={dragging || undefined}
    >
      <input
        ref={input}
        id={id}
        name={name}
        type="text"
        className="x-govuk-ui-input x-govuk-ui-date-input-field x-govuk-ui-dial-input"
        style={{ "--x-govuk-ui-dial-chars": width } as CSSProperties}
        inputMode="numeric"
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          const tidied = tidy?.(event.target.value) ?? event.target.value;
          if (tidied !== event.target.value) onChange(tidied);
        }}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onLostPointerCapture={() => finish.current()}
      />
      {/* The drum the values roll past on. Screen readers hear the field's value instead. */}
      <div className="x-govuk-ui-dial-drum" aria-hidden="true">
        <div className="x-govuk-ui-dial-values">
          {nearby.map((offset) => {
            const at = centre + offset;
            const angle = (at - turn) * TURN;
            if (Math.abs(angle) >= 1.45 || (!cyclic && (at < 0 || at >= count))) return null;
            return (
              <span
                key={at}
                className="x-govuk-ui-dial-value"
                data-current={at === centre || undefined}
                style={{
                  transform: `translateY(${RADIUS * Math.sin(angle)}px) scaleY(${Math.cos(angle)})`,
                  opacity: Math.max(0, Math.cos(angle) * 1.25 - 0.25),
                }}
              >
                {options[wrap(at)]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
