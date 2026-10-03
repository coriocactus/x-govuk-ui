import type { CSSProperties, ReactNode } from "react";
import type { SoundCue } from "x-govuk-ui";

// A drawing of what plays each cue, in the stroke of the library's icons, which acts it out as the
// cue plays. A button goes down, a switch slides, a panel opens and a bell rings. The parts that
// move are named for the stylesheet. A cue that steps, such as a row down a list, shows its step,
// and moves on from the one before.

const rows = [4.5, 10, 15.5, 21];

/** A part's step, and the step before, for it to move on from. */
const stepped = (now: number, was: number, unit: string) =>
  ({ "--step": `${now}${unit}`, "--was": `${was}${unit}` }) as CSSProperties;

/**
 * A menu's button over its panel, drawn open, with the dashed outline of where the panel goes. The
 * stylesheet closes it.
 */
const menu = (
  <>
    <rect x="4" y="2.5" width="24" height="7" rx="2" />
    <path d="M7.5 6h7" />
    <path className="preview-glyph-chevron" d="M20.5 7l2.5-2.5 2.5 2.5" />
    <rect
      className="preview-glyph-place"
      x="4"
      y="12"
      width="24"
      height="9.5"
      rx="2"
      strokeDasharray="2 2.5"
    />
    <g className="preview-glyph-panel">
      <rect x="4" y="12" width="24" height="9.5" rx="2" />
      <path d="M8 15.5h12M8 18.5h8" />
    </g>
  </>
);

/** A switch, resting on or off, with its knob at that side and its fill and knob shaded for it. */
const toggle = (on: boolean) => (
  <>
    <rect
      className="preview-glyph-fill"
      x="4"
      y="6"
      width="24"
      height="12"
      rx="6"
      fill="currentColor"
      fillOpacity={on ? 0.3 : 0}
    />
    <circle
      className="preview-glyph-knob"
      cx={on ? 22 : 10}
      cy="12"
      r="3.6"
      fill="currentColor"
      fillOpacity={on ? 1 : 0}
    />
  </>
);

const glyphs: Record<SoundCue, (step: number, was: number) => ReactNode> = {
  // A button, with GOV.UK's edge beneath it, pressed down onto it.
  tap: () => (
    <>
      <rect className="preview-glyph-press" x="5" y="4" width="22" height="12" rx="3" />
      <path d="M8 20.5h16" />
    </>
  ),
  // A list, whose highlight climbs a row from the foot at each press, as the cue climbs a step.
  select: (step, was) => (
    <>
      <rect
        className="preview-glyph-row"
        x="4"
        y={rows[3]! - 2.6}
        width="24"
        height="5.2"
        rx="1.5"
        fill="currentColor"
        stroke="none"
        opacity="0.3"
        style={stepped(-step * 5.5, -was * 5.5, "px")}
      />
      {rows.map((y) => (
        <path key={y} d={`M8 ${y}h16`} />
      ))}
    </>
  ),
  // A bin whose lid lifts.
  destructive: () => (
    <>
      <path className="preview-glyph-lid" d="M8 7h16M13 7V5h6v2" />
      <path d="M10.5 7l1 14h9l1-14M14.5 11v6M17.5 11v6" />
    </>
  ),
  // A command line's prompt, with its cursor blinking.
  command: () => (
    <>
      <path className="preview-glyph-nudge" d="M6 7l5 5-5 5" />
      <path className="preview-glyph-blink" d="M14 18h11" />
    </>
  ),
  // A switch, resting as its cue finds it. Pressed, it turns, with its knob filling as it slides,
  // and after a moment turns slowly back.
  toggleOn: () => toggle(false),
  toggleOff: () => toggle(true),
  // A menu's button and its panel, resting as its cue finds them, closed for Open and open for
  // Close. Pressed, the panel unfolds or folds away as the chevron turns, and after a moment turns
  // slowly back, as a switch does.
  open: () => menu,
  close: () => menu,
  // A sweep upwards, drawn as it plays.
  swoosh: () => (
    <path className="preview-glyph-draw" d="M4 20c7 0 13-4 18-13M16 6h7v7" pathLength={1} />
  ),
  // A dial, with its hand moving on a notch.
  tick: (step, was) => (
    <>
      <circle cx="16" cy="13" r="8.5" />
      <path d="M16 2.5v1.5" />
      <path
        className="preview-glyph-hand"
        d="M16 13v-5.5"
        style={stepped(step * 45, was * 45, "deg")}
      />
    </>
  ),
  // A slider, with its thumb moving along to the step it is on.
  sliderTick: (step, was) => (
    <>
      <path d="M4 12h24" />
      <circle
        className="preview-glyph-slide"
        cx="6"
        cy="12"
        r="3.6"
        fill="currentColor"
        style={stepped(step * 5, was * 5, "px")}
      />
    </>
  ),
  // A code's boxes, filling to the character typed.
  key: (step) => (
    <>
      {[3, 10, 17, 24].map((x, index) => (
        <rect
          key={x}
          className={index === step ? "preview-glyph-pop" : undefined}
          x={x}
          y="6"
          width="5.5"
          height="12"
          rx="1.2"
          fill={index <= step ? "currentColor" : "none"}
          fillOpacity={index <= step ? 0.45 : 0}
        />
      ))}
    </>
  ),
  // A tick, drawn.
  success: () => <path className="preview-glyph-draw" d="M6 12.5l6 6 14-13" pathLength={1} />,
  // A cross, shaking its head.
  error: () => <path className="preview-glyph-shake" d="M8 5l16 14M24 5L8 19" />,
  // A warning, twice.
  warning: () => <path className="preview-glyph-twice" d="M16 3.5l11 18H5zM16 10v5M16 18.2v.1" />,
  // A bell, ringing.
  notification: () => (
    <path
      className="preview-glyph-ring"
      d="M9.5 17v-5.5a6.5 6.5 0 0 1 13 0V17l2 2h-17zM14 21.5h4"
    />
  ),
  // A copy, coming off its sheet.
  copy: () => (
    <>
      <rect className="preview-glyph-lift" x="12" y="8" width="13" height="13" rx="2" />
      <path d="M8 16V4h12" />
    </>
  ),
  // A chip, with its cross turning as it clears.
  chirp: () => (
    <>
      <rect x="3" y="6" width="26" height="12" rx="6" />
      <path d="M8 12h7" />
      <path className="preview-glyph-turn" d="M20 9.5l5 5M25 9.5l-5 5" />
    </>
  ),
  // A control that will not be pressed, refusing.
  blocked: () => (
    <g className="preview-glyph-shake">
      <circle cx="16" cy="12" r="8.5" />
      <path d="M10 6l12 12" />
    </g>
  ),
};

/**
 * What plays a cue, drawn, at the step it is on, moving on from the one it `was` on. It is
 * decorative, because the card is named in words.
 */
export function Glyph({
  cue,
  step = 0,
  was = step,
}: {
  cue: SoundCue;
  step?: number;
  was?: number;
}) {
  return (
    <svg
      viewBox="0 0 32 24"
      width="40"
      height="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyphs[cue](step, was)}
    </svg>
  );
}
