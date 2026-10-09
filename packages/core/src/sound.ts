"use client";

import { useCallback } from "react";

/**
 * x-govuk-ui's interface sounds. Every cue is synthesised with the Web Audio API from a few short
 * voices, so the library ships no audio files. A voice is a tone or a burst of noise, shaped by an
 * envelope and sometimes a filter, and a cue plays its voices together or one just after another.
 */
type Voice = {
  /** A waveform, or noise. `hiss` is bright white noise, and `rumble` is dark brown noise. */
  wave: "sine" | "triangle" | "square" | "hiss" | "rumble";
  /** The pitch in hertz. Two pitches glide from the first to the second over the voice. */
  pitch?: number | readonly [from: number, to: number];
  /**
   * Wobbles the pitch with another tone, at a ratio of it, by `depth` hertz, for a brighter tap.
   */
  wobble?: { ratio: number; depth: number };
  /**
   * Shapes the tone. `lowpass` keeps what is below `at` hertz, and `bandpass` only what is near it.
   */
  filter?: { kind: "lowpass" | "bandpass"; at: number; q?: number };
  /** Seconds to reach full level. */
  rise?: number;
  /** Seconds to fall away, or to fall to `hold`. */
  fall: number;
  /** The level held after the fall, as a share of the peak, before the release. */
  hold?: number;
  /** Seconds to fade from `hold` to silence. */
  release?: number;
  /** The peak level, from 0 to 1. */
  level: number;
  /** Seconds after the cue starts that the voice joins. */
  after?: number;
};

type Letter = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
/**
 * A note, by its letter and octave, such as C5, the C above middle C, or D#5, a semitone above D5.
 */
type Note = `${Letter}${2 | 3 | 4 | 5 | 6 | 7}`;
const letters: readonly Letter[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/**
 * A note's pitch in hertz, in equal temperament, with A4 at 440. Every cue's pitches are notes, so
 * the cues share one tuning, and every level is in whole decibels.
 */
function note(name: Note) {
  const octave = Number(name.slice(-1));
  const semitone = letters.indexOf(name.slice(0, -1) as Letter);
  return 440 * 2 ** ((semitone + 12 * (octave + 1) - 69) / 12);
}

/** A level from decibels below full scale, as loudness is heard. Each 6 decibels halves it. */
function decibels(below: number) {
  return 10 ** (below / 20);
}

type Cue = {
  voices: readonly Voice[];
  /** The most each play is detuned at random, in cents, so repeats never sound mechanical. */
  spread: number;
};

// The cues fall into six families, which `soundFamilies` lists. SoundScope chooses a cue for each
// interaction inside it, and data-sound names one.
const cues = {
  // Any button press, and the sound heard most often. A short, bright click on E6, made brighter by
  // a tone an octave below that wobbles it.
  tap: {
    voices: [
      {
        wave: "sine",
        pitch: note("E6"),
        wobble: { ratio: 0.5, depth: 95 },
        fall: 0.016,
        release: 0.005,
        level: decibels(-14),
      },
    ],
    spread: 24,
  },
  // A menu row or option, pitched up by its place in the list. It dips a tone, from A5 to G5.
  select: {
    voices: [
      {
        wave: "triangle",
        pitch: [note("A5"), note("G5")],
        rise: 0.001,
        fall: 0.052,
        level: decibels(-12),
      },
    ],
    spread: 20,
  },
  // A warning button. It is lower, falling a sixth from D4 to F3, with a little grit, so it feels
  // weightier.
  destructive: {
    voices: [
      {
        wave: "triangle",
        pitch: [note("D4"), note("F3")],
        filter: { kind: "lowpass", at: 1350 },
        rise: 0.002,
        fall: 0.125,
        level: decibels(-10),
      },
      {
        wave: "rumble",
        filter: { kind: "bandpass", at: 680, q: 1.1 },
        fall: 0.05,
        level: decibels(-24),
      },
    ],
    spread: 12,
  },
  // Running a command from the command menu. A fourth falling from C6 to G5, with a glint an octave
  // above.
  command: {
    voices: [
      {
        wave: "triangle",
        pitch: [note("C6"), note("G5")],
        rise: 0.001,
        fall: 0.07,
        level: decibels(-14),
      },
      {
        wave: "sine",
        pitch: note("G6"),
        rise: 0.001,
        fall: 0.045,
        level: decibels(-24),
        after: 0.02,
      },
    ],
    spread: 8,
  },

  // A switch or checkbox turning on. It rises a sixth, from C5 to A5.
  toggleOn: {
    voices: [
      {
        wave: "sine",
        pitch: [note("C5"), note("A5")],
        rise: 0.002,
        fall: 0.08,
        level: decibels(-10),
      },
    ],
    spread: 14,
  },
  // The same control turning off. It falls from G5 to G#4, a little quieter.
  toggleOff: {
    voices: [
      {
        wave: "sine",
        pitch: [note("G5"), note("G#4")],
        rise: 0.002,
        fall: 0.08,
        level: decibels(-11),
      },
    ],
    spread: 14,
  },

  // A menu, dialog or panel appearing. A soft rise, from E4 to D#5.
  open: {
    voices: [
      {
        wave: "triangle",
        pitch: [note("E4"), note("D#5")],
        filter: { kind: "lowpass", at: 2500 },
        rise: 0.006,
        fall: 0.125,
        level: decibels(-12),
      },
    ],
    spread: 10,
  },
  // The same surface going away. A soft fall, from C#5 to D4.
  close: {
    voices: [
      {
        wave: "triangle",
        pitch: [note("C#5"), note("D4")],
        filter: { kind: "lowpass", at: 2150 },
        rise: 0.004,
        fall: 0.105,
        level: decibels(-13),
      },
    ],
    spread: 10,
  },
  // A request starting, or sound coming back on. A quick sweep up from D4 to B6.
  swoosh: {
    voices: [
      {
        wave: "sine",
        pitch: [note("D4"), note("B6")],
        rise: 0.008,
        fall: 0.12,
        release: 0.04,
        level: decibels(-18),
      },
    ],
    spread: 14,
  },

  // Stepping a value, such as a Dial passing a number. A dry tick on F6.
  tick: {
    voices: [
      {
        wave: "square",
        pitch: note("F6"),
        filter: { kind: "lowpass", at: 2900 },
        fall: 0.013,
        level: decibels(-20),
      },
    ],
    spread: 18,
  },
  // Each step of a slider being dragged. A dry click, with F5 beneath it.
  sliderTick: {
    voices: [
      {
        wave: "hiss",
        filter: { kind: "bandpass", at: 3050, q: 3.8 },
        fall: 0.019,
        release: 0.006,
        level: decibels(-14),
      },
      { wave: "sine", pitch: note("F5"), fall: 0.012, release: 0.004, level: decibels(-21) },
    ],
    spread: 10,
  },
  // Each character of a one-time code. A key press, with B5 dipping to A5.
  key: {
    voices: [
      {
        wave: "sine",
        pitch: [note("B5"), note("A5")],
        rise: 0.001,
        fall: 0.028,
        level: decibels(-17),
      },
      {
        wave: "hiss",
        filter: { kind: "bandpass", at: 3300, q: 2 },
        fall: 0.01,
        level: decibels(-29),
      },
    ],
    spread: 20,
  },

  // It is done. Two notes rising a fifth, G5 then D6.
  success: {
    voices: [
      { wave: "triangle", pitch: note("G5"), rise: 0.004, fall: 0.15, level: decibels(-13) },
      {
        wave: "triangle",
        pitch: note("D6"),
        rise: 0.004,
        fall: 0.23,
        level: decibels(-15),
        after: 0.07,
      },
    ],
    spread: 5,
  },
  // It did not work. Two low notes falling a fourth, D4 then A3.
  error: {
    voices: [
      {
        wave: "triangle",
        pitch: note("D4"),
        filter: { kind: "lowpass", at: 1150 },
        rise: 0.003,
        fall: 0.13,
        level: decibels(-12),
      },
      {
        wave: "triangle",
        pitch: note("A3"),
        filter: { kind: "lowpass", at: 980 },
        rise: 0.003,
        fall: 0.21,
        level: decibels(-12),
        after: 0.085,
      },
    ],
    spread: 5,
  },
  // Take care. One note, D#5, played twice.
  warning: {
    voices: [
      {
        wave: "triangle",
        pitch: note("D#5"),
        filter: { kind: "lowpass", at: 2800 },
        rise: 0.003,
        fall: 0.14,
        level: decibels(-14),
      },
      {
        wave: "triangle",
        pitch: note("D#5"),
        filter: { kind: "lowpass", at: 2700 },
        rise: 0.003,
        fall: 0.17,
        level: decibels(-15),
        after: 0.09,
      },
    ],
    spread: 5,
  },
  // A message arriving. Two gentle notes a fifth apart, C5 then G5, that ring on a little.
  notification: {
    voices: [
      {
        wave: "triangle",
        pitch: note("C5"),
        rise: 0.008,
        fall: 0.28,
        hold: 0.03,
        release: 0.12,
        level: decibels(-17),
      },
      {
        wave: "triangle",
        pitch: note("G5"),
        rise: 0.008,
        fall: 0.24,
        hold: 0.02,
        release: 0.1,
        level: decibels(-18),
        after: 0.11,
      },
    ],
    spread: 3,
  },

  // Something copied. Two quick high blips, D6 then F6.
  copy: {
    voices: [
      { wave: "sine", pitch: note("D6"), fall: 0.015, release: 0.006, level: decibels(-16) },
      {
        wave: "sine",
        pitch: note("F6"),
        fall: 0.015,
        release: 0.006,
        level: decibels(-17),
        after: 0.04,
      },
    ],
    spread: 6,
  },
  // Clearing or removing something. A tiny upward chirp, from D6 to F#6.
  chirp: {
    voices: [
      {
        wave: "sine",
        pitch: [note("D6"), note("F#6")],
        fall: 0.03,
        release: 0.01,
        level: decibels(-22),
      },
    ],
    spread: 24,
  },
  // A disabled control refusing a press. A low, muffled bump on F#3.
  blocked: {
    voices: [
      {
        wave: "sine",
        pitch: note("F#3"),
        filter: { kind: "lowpass", at: 660 },
        rise: 0.004,
        fall: 0.065,
        level: decibels(-16),
      },
    ],
    spread: 30,
  },
} as const satisfies Record<string, Cue>;

export type SoundCue = keyof typeof cues;
/** Every cue's name, for a picker or a test to run through. */
export const soundCues = Object.keys(cues) as SoundCue[];

/**
 * The cues in their six families. Each cue is in one family.
 *
 * - Presses are for something pressed.
 * - Toggles say the new state by their direction.
 * - Surfaces are slower, because the view changes.
 * - Values are very quiet, because they repeat.
 * - Outcomes are short phrases for results.
 * - Moments are brief confirmations and refusals.
 *
 * @internal
 */
export const soundFamilies = {
  presses: ["tap", "select", "destructive", "command"],
  toggles: ["toggleOn", "toggleOff"],
  surfaces: ["open", "close", "swoosh"],
  values: ["tick", "sliderTick", "key"],
  outcomes: ["success", "error", "warning", "notification"],
  moments: ["copy", "chirp", "blocked"],
} as const satisfies Record<string, readonly SoundCue[]>;

/** A voice of a cue, as it plays, for drawing what a cue sounds like. @internal */
export type SoundVoice = Voice;

/** A cue's voices, as they play, for drawing what it sounds like. @internal */
export function voicesOf(cue: SoundCue): readonly SoundVoice[] {
  return cues[cue].voices;
}
/** `muted` silences every cue. `volume` is the level from 0 to 1. */
export type SoundOptions = { muted?: boolean; volume?: number };
/** `detune` is in cents. `velocity` scales loudness from 0 to 1. */
export type PlayOptions = { detune?: number; velocity?: number };
export type PlaySound = (cue: SoundCue, options?: PlayOptions) => Promise<void>;

/** @internal Whether a value, such as a `data-sound` attribute, names a cue. */
export function isSoundCue(value: unknown): value is SoundCue {
  return typeof value === "string" && Object.hasOwn(cues, value);
}

/** The quietest level an exponential fade can reach. Web Audio cannot fade to exactly zero. */
const QUIET = 0.0001;

// One AudioContext for the page, made on the first play, after a user has interacted with it.
let context: AudioContext | null = null;
function audio() {
  if (!context || context.state === "closed") context = new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

// A second of each noise, made once and played from a random point, so each burst differs.
const noises = new Map<"hiss" | "rumble", AudioBuffer>();
function noise(ctx: AudioContext, colour: "hiss" | "rumble") {
  const cached = noises.get(colour);
  if (cached && cached.sampleRate === ctx.sampleRate) return cached;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    // Brown noise is white noise that drifts, which keeps its low end and loses its hiss.
    last = (last + 0.02 * white) / 1.02;
    data[i] = colour === "hiss" ? white : last * 3.5;
  }
  noises.set(colour, buffer);
  return buffer;
}

/** Schedules one voice, from its source, through its filter and envelope, to the speakers. */
function sound(
  ctx: AudioContext,
  voice: Voice,
  start: number,
  { level, detune, velocity }: { level: number; detune: number; velocity: number },
) {
  const at = start + (voice.after ?? 0);
  const rise = voice.rise ?? 0;
  const hold = voice.hold ?? 0;
  const release = voice.release ?? 0;
  const length = rise + voice.fall + release;
  const peak = voice.level * level;

  // The envelope rises in a straight line. It then either falls away exponentially, to about a
  // third of its level in each third of its time, or settles at its hold level and then fades.
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(QUIET, at);
  if (rise > 0) envelope.gain.linearRampToValueAtTime(peak, at + rise);
  else envelope.gain.setValueAtTime(peak, at);
  if (hold > 0) {
    envelope.gain.setTargetAtTime(Math.max(hold * peak, QUIET), at + rise, voice.fall / 3);
    if (release > 0) envelope.gain.setTargetAtTime(QUIET, at + voice.fall + rise, release / 3);
  } else {
    envelope.gain.setTargetAtTime(QUIET, at + rise, voice.fall / 3);
  }

  let source: AudioScheduledSourceNode;
  const nodes: AudioNode[] = [envelope];
  if (voice.wave === "hiss" || voice.wave === "rumble") {
    const buffer = ctx.createBufferSource();
    buffer.buffer = noise(ctx, voice.wave);
    buffer.start(at, Math.random() * Math.max(0, buffer.buffer.duration - length - 0.1));
    source = buffer;
  } else {
    const oscillator = ctx.createOscillator();
    oscillator.type = voice.wave;
    const [from, to] = Array.isArray(voice.pitch)
      ? voice.pitch
      : [voice.pitch ?? 440, voice.pitch ?? 440];
    oscillator.frequency.setValueAtTime(from, at);
    if (to !== from)
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(to, 1), at + length);
    oscillator.detune.value = detune;
    if (voice.wobble) {
      const wobble = ctx.createOscillator();
      const depth = ctx.createGain();
      wobble.frequency.value = from * voice.wobble.ratio;
      depth.gain.value = voice.wobble.depth;
      wobble.connect(depth).connect(oscillator.frequency);
      wobble.start(at);
      wobble.stop(at + length + 0.1);
      nodes.push(wobble, depth);
    }
    oscillator.start(at);
    source = oscillator;
  }
  source.stop(at + length + 0.1);
  nodes.push(source);

  let tail: AudioNode = source;
  if (voice.filter) {
    const filter = ctx.createBiquadFilter();
    filter.type = voice.filter.kind;
    // A softer play is also a duller one.
    filter.frequency.setValueAtTime(voice.filter.at * (0.5 + 0.5 * velocity), at);
    filter.Q.value = voice.filter.q ?? 1;
    tail = tail.connect(filter);
    nodes.push(filter);
  }
  tail.connect(envelope).connect(ctx.destination);
  // Once the voice has played, its nodes are disconnected from each other.
  source.onended = () => {
    for (const node of nodes) node.disconnect();
  };
}

/** Plays a cue now, at a level from 0 to 1, a little detuned at random. */
function play(cue: SoundCue, volume: number, detune: number, velocity: number) {
  const ctx = audio();
  const { voices, spread }: Cue = cues[cue];
  const drift = (Math.random() * 2 - 1) * spread;
  const start = ctx.currentTime;
  for (const voice of voices)
    sound(ctx, voice, start, { level: volume * velocity, detune: detune + drift, velocity });
}

/**
 * A function that plays a cue, for a SoundScope to respond to presses with, or for you to play a
 * cue yourself. It waits until the user has interacted with the page, as browsers require, and
 * never throws for a cue that cannot play.
 */
export function useSound({ muted = false, volume = 0.5 }: SoundOptions = {}): PlaySound {
  return useCallback(
    async (cue, { detune = 0, velocity = 1 } = {}) => {
      if (muted || !(volume > 0)) return;
      if (typeof AudioContext === "undefined")
        throw new Error("Audio is not supported in this browser.");
      // Browsers keep audio suspended until a user interacts with the page. Skip until then,
      // so cues cannot queue up and play together on the first press.
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
      // A little variation in level also stops repeated presses sounding mechanical.
      const level = Math.max(0, Math.min(1, velocity)) * (0.9 + Math.random() * 0.1);
      play(cue, Math.min(1, volume), detune, level);
    },
    [muted, volume],
  );
}
