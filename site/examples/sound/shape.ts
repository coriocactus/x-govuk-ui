import type { SoundCue } from "x-govuk-ui";
import { type SoundVoice, soundFamilies, voicesOf } from "x-govuk-ui/internal";

// What a cue sounds like, drawn. Each voice is a ribbon, following its pitch as it plays, as thick
// as it is loud. Every cue is drawn on the same scales, so they can be compared at a glance. High
// cues sit high, falling ones fall, and a quick click is a short stroke beside a phrase that rings
// on.

export { soundFamilies };
export type SoundFamily = keyof typeof soundFamilies;

/** The drawing's size, in its own units. */
export const SHAPE = { width: 120, height: 44 };
// The longest cue, notification, rings on for a little under half a second, to the drawing's end.
const SPAN = 0.46;
// From below the lowest voice, blocked's bump, to above the highest, slider's click.
const LOW = 110;
const HIGH = 3600;

/** How long a voice sounds, in seconds, from its start to its silence. */
const lengthOf = (voice: SoundVoice) => (voice.rise ?? 0) + voice.fall + (voice.release ?? 0);

/** How long a cue sounds, in seconds, from its first voice to its last voice's end. */
export function durationOf(cue: SoundCue) {
  return voicesOf(cue).reduce(
    (longest, voice) => Math.max(longest, (voice.after ?? 0) + lengthOf(voice)),
    0,
  );
}

// Time runs on a square-root scale, so a click of a few milliseconds still has space to be seen.
const across = (time: number) => SHAPE.width * Math.sqrt(Math.min(time, SPAN) / SPAN);
// Pitch runs on a logarithmic scale, as the ear hears it, so an octave is the same height
// anywhere.
const up = (pitch: number) => {
  const share = Math.log(pitch / LOW) / Math.log(HIGH / LOW);
  return SHAPE.height * (1 - Math.max(0, Math.min(1, share)));
};

/** How loud a voice is at a time into it, from 0 to 1, as its envelope shapes it. */
function loudness(voice: SoundVoice, time: number) {
  const rise = voice.rise ?? 0;
  const hold = voice.hold ?? 0;
  if (time < rise) return time / rise;
  const falling = Math.exp(-(time - rise) / (voice.fall / 3));
  if (!hold) return falling;
  const held = hold + (1 - hold) * falling;
  const released = time - rise - voice.fall;
  return released > 0 ? held * Math.exp(-released / ((voice.release || 0.01) / 3)) : held;
}

/** A voice's pitch at a time into it, as a glide from one pitch to another, or noise's centre. */
function pitchAt(voice: SoundVoice, time: number) {
  if (voice.wave === "hiss" || voice.wave === "rumble")
    return voice.filter?.at ?? (voice.wave === "hiss" ? 3000 : 300);
  const pitch = voice.pitch ?? 440;
  const [from, to] = typeof pitch === "number" ? [pitch, pitch] : pitch;
  return from * (to / from) ** (time / lengthOf(voice));
}

/** One ribbon's outline, as an SVG path. Noise is drawn ragged, as it sounds. */
function ribbon(voice: SoundVoice, index: number) {
  const start = voice.after ?? 0;
  const length = lengthOf(voice);
  const noise = voice.wave === "hiss" || voice.wave === "rumble";
  const steps = 24;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let step = 0; step <= steps; step++) {
    const time = (length * step) / steps;
    const x = across(start + time);
    const ragged = noise ? Math.sin(step * 2.7 + index * 1.3) * 2.2 : 0;
    const y = up(pitchAt(voice, time)) + ragged;
    const half = 0.6 + voice.level * 20 * loudness(voice, time);
    top.push(`${x.toFixed(2)} ${(y - half).toFixed(2)}`);
    bottom.unshift(`${x.toFixed(2)} ${(y + half).toFixed(2)}`);
  }
  return `M${top.join("L")}L${bottom.join("L")}Z`;
}

/** A cue's ribbons, one for each of its voices, as SVG paths. */
export function ribbonsOf(cue: SoundCue) {
  return voicesOf(cue).map(ribbon);
}
