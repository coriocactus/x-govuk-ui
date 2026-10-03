import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import {
  type PlaySound,
  type SoundCue,
  SoundScope,
  Tooltip,
  useScopeSound,
  useSound,
} from "x-govuk-ui";
import { Glyph } from "./sound/glyphs";
import { durationOf, ribbonsOf, SHAPE, type SoundFamily, soundFamilies } from "./sound/shape";

type Props = {
  volume?: number;
  detune?: number;
  velocity?: number;
  /** The workbench's mute, which silences the board too. */
  muted?: boolean;
};

// Each family's colour, as a Tag's, which tells its cues apart from the others'.
const colours: Record<SoundFamily, string> = {
  presses: "blue",
  toggles: "green",
  surfaces: "purple",
  values: "teal",
  outcomes: "orange",
  moments: "magenta",
};

// What plays each cue, for its name. A cue that steps, as a row down a list sounds a step higher,
// climbs a step at each press, as it does in the components, and wraps around. A switch or a menu
// `turns`. Pressed, it turns quickly from how it rests, and after a moment turns slowly back.
const cues: Record<
  SoundCue,
  { plays: string; steps?: number; detune?: (step: number) => number; turns?: boolean }
> = {
  tap: { plays: "any button" },
  select: { plays: "a row in a menu or list", steps: 4, detune: (step) => step * 55 },
  destructive: { plays: "a warning button" },
  command: { plays: "a command from the Command menu" },
  toggleOn: { plays: "a switch or box turning on", turns: true },
  toggleOff: { plays: "a switch or box turning off", turns: true },
  open: { plays: "a menu, dialog or panel opening", turns: true },
  close: { plays: "a menu, dialog or panel closing", turns: true },
  swoosh: { plays: "a request setting off" },
  tick: { plays: "a value stepping", steps: 8 },
  sliderTick: {
    plays: "a slider dragged",
    steps: 5,
    detune: (step) => (step / 4) * 900,
  },
  key: { plays: "a one-time code typed", steps: 4, detune: (step) => (step + 1) * 45 },
  success: { plays: "a task done" },
  error: { plays: "an answer in error" },
  warning: { plays: "something to take care over" },
  notification: { plays: "a message arriving" },
  copy: { plays: "something copied" },
  chirp: { plays: "something cleared" },
  blocked: { plays: "a control that is off, pressed" },
};

const order = (Object.keys(soundFamilies) as SoundFamily[]).flatMap((family) =>
  soundFamilies[family].map((cue) => ({ cue, colour: colours[family] })),
);

/**
 * The board has a SoundScope of its own, which plays every cue at the playground's volume, pitch
 * and softness. Each card plays through it with useScopeSound, as any part of a service can.
 */
export default function SoundExample({
  volume = 0.5,
  detune = 0,
  velocity = 1,
  muted = false,
}: Props) {
  const sound = useSound({ muted, volume });
  const tuned = useCallback<PlaySound>(
    (cue, options) =>
      sound(cue, {
        detune: detune + (options?.detune ?? 0),
        velocity: velocity * (options?.velocity ?? 1),
      }),
    [sound, detune, velocity],
  );
  return (
    <SoundScope play={tuned}>
      <SoundBoard />
    </SoundScope>
  );
}

/**
 * A play, with when it began, and the step it played, and the step before, for its icon to move on
 * from.
 */
type Played = { at: number; step: number; was: number };

// How long a switch or a menu stays turned before it turns slowly back. That is its quick turn, 260
// milliseconds in preview.css, and a moment to be seen.
const TURNED = 560;

/** Every cue on a card, with a drawing of what plays it, acting it out, and of the sound. */
function SoundBoard() {
  const play = useScopeSound();
  const [played, setPlayed] = useState<Partial<Record<SoundCue, Played>>>({});
  // Dragging across the board plays each card the pointer passes, as on a harp. This is the card it
  // is on, while a press lasts, or none.
  const sweeping = useRef<SoundCue | null>(null);
  const timers = useRef<number[]>([]);
  // The switches and menus turned, each until its timer turns it back.
  const [turned, setTurned] = useState<Partial<Record<SoundCue, boolean>>>({});
  const turning = useRef(new Map<SoundCue, number>());
  useEffect(() => {
    const stop = () => {
      sweeping.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      for (const timer of timers.current) clearTimeout(timer);
      for (const timer of turning.current.values()) clearTimeout(timer);
    };
  }, []);

  const sound = (cue: SoundCue) => {
    const { steps = 1, detune, turns } = cues[cue];
    const last = played[cue];
    const step = last ? (last.step + 1) % steps : 0;
    play(cue, { detune: detune?.(step) ?? 0 });
    const at = performance.now();
    // Pressed again while it turns back, it turns again from where it is, by its transitions.
    if (turns) {
      setTurned((all) => ({ ...all, [cue]: true }));
      clearTimeout(turning.current.get(cue));
      turning.current.set(
        cue,
        window.setTimeout(() => setTurned((all) => ({ ...all, [cue]: false })), TURNED),
      );
    }
    setPlayed((all) => ({ ...all, [cue]: { at, step, was: last?.step ?? step } }));
    // Once its drawing has faded, the card is still again, though it keeps its step.
    timers.current.push(
      window.setTimeout(
        () =>
          setPlayed((all) => {
            const now = all[cue];
            return now?.at === at ? { ...all, [cue]: { ...now, at: 0 } } : all;
          }),
        durationOf(cue) * 1000 + 800,
      ),
    );
  };

  return (
    <div className="preview-sound">
      {order.map(({ cue, colour }) => {
        const now = played[cue];
        const live = Boolean(now?.at);
        const ribbons = ribbonsOf(cue);
        return (
          <Tooltip key={cue} content={cue}>
            <button
              type="button"
              className="preview-sound-pad"
              data-colour={colour}
              data-cue={cue}
              aria-label={`${cue}, ${cues[cue].plays}`}
              // The card plays its cue itself, through the board's SoundScope, so neither scope
              // plays a press of its own as well.
              data-sound="off"
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                // A touch keeps its first card unless released, so a drag can pass on.
                if (event.pointerType !== "mouse")
                  event.currentTarget.releasePointerCapture(event.pointerId);
                sweeping.current = cue;
                sound(cue);
              }}
              // Safari can report that the pointer entered the card it was pressed on, as the press
              // releases the pointer. That is not a new card.
              onPointerEnter={() => {
                if (!sweeping.current || sweeping.current === cue) return;
                sweeping.current = cue;
                sound(cue);
              }}
              // Enter and Space, which a pointer's press has already sounded.
              onClick={(event) => {
                if (event.detail === 0) sound(cue);
              }}
            >
              <span
                className="preview-sound-glyph"
                // An act starts again with each press, except a turn, which continues from where it
                // is.
                key={cues[cue].turns ? cue : now?.at}
                data-live={live || undefined}
                data-turned={turned[cue] || undefined}
              >
                <Glyph cue={cue} step={now?.step} was={live ? now?.was : now?.step} />
              </span>
              <span className="preview-sound-shape">
                <svg
                  viewBox={`0 0 ${SHAPE.width} ${SHAPE.height}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {ribbons.map((path) => (
                    <path key={path} d={path} />
                  ))}
                </svg>
                {live && (
                  <svg
                    key={now?.at}
                    className="preview-sound-lit"
                    viewBox={`0 0 ${SHAPE.width} ${SHAPE.height}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    style={
                      {
                        "--preview-sound-length": `${Math.max(160, durationOf(cue) * 1000)}ms`,
                      } as CSSProperties
                    }
                  >
                    {ribbons.map((path) => (
                      <path key={path} d={path} />
                    ))}
                  </svg>
                )}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
