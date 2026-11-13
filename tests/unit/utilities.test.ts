import { expect, test } from "bun:test";
import { soundCues } from "x-govuk-ui";
import { soundFamilies } from "x-govuk-ui/internal";
import { bezier, easeDrawer, easeNumber, easeOut } from "../../packages/core/src/motion";
import { durationOf, ribbonsOf } from "../../site/examples/sound/shape";

test("every sound is in one family, and each draws as a ribbon a voice", () => {
  const listed = Object.values(soundFamilies).flat();
  expect([...listed].sort()).toEqual([...soundCues].sort());
  expect(new Set(listed).size).toBe(listed.length);
  for (const cue of soundCues) {
    expect(durationOf(cue)).toBeGreaterThan(0);
    expect(durationOf(cue)).toBeLessThan(0.5);
    for (const path of ribbonsOf(cue)) expect(path).toMatch(/^M[\d. L-]+Z$/);
  }
});

test("a bezier curve is where CSS's cubic-bezier() is, at every share of its time", () => {
  // How far along each curve is at 5%, 10%, 25%, 50%, 75%, 90% and 99% of its time. The figures are
  // from Cardano's formula, which solves the curve's cubic for the point at a time. Chromium,
  // Firefox and WebKit give the same for cubic-bezier(), as the progress of a paused animation, to
  // six decimal places. The last curve is the jump of Radios' dot.
  const shares = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.99];
  const figures: [readonly [number, number, number, number], number[]][] = [
    [easeOut, [0.2150335, 0.4010969, 0.7648647, 0.9613825, 0.9968942, 0.9998395, 0.9999999]],
    [easeDrawer, [0.1219234, 0.2698207, 0.7791312, 0.9548094, 0.9923487, 0.9989692, 0.9999906]],
    [
      [0.33, 0, 0.25, 1],
      [0.0084089, 0.0370633, 0.28411, 0.7653749, 0.954964, 0.9936308, 0.9999403],
    ],
  ];
  for (const [curve, values] of figures)
    shares.forEach((share, index) => {
      expect(bezier(curve, share)).toBeCloseTo(values[index] ?? Number.NaN, 6);
    });
  // A straight line is its own time, and every curve starts at 0 and ends at 1.
  expect(bezier([0.25, 0.25, 0.75, 0.75], 0.3)).toBeCloseTo(0.3, 8);
  expect(bezier(easeOut, 0)).toBeCloseTo(0, 8);
  expect(bezier(easeOut, 1)).toBeCloseTo(1, 8);
});

test("a number that is stopped first comes up to where it is at that moment", () => {
  // A Dial starts its turn again at each step of a drag, and stops the last turn first. The steps
  // can come faster than the frames. A stop that gave no value would leave the drum still while
  // they came, to catch up in one long glide once they stopped.
  const real = {
    now: performance.now,
    request: globalThis.requestAnimationFrame,
    cancel: globalThis.cancelAnimationFrame,
  };
  let clock = 1000;
  const frames = new Map<number, () => void>();
  performance.now = () => clock;
  globalThis.requestAnimationFrame = (frame) =>
    frames.set(frames.size + 1, () => frame(clock)).size;
  globalThis.cancelAnimationFrame = (id) => void frames.delete(id);
  try {
    const values: number[] = [];
    let completed = 0;
    const turn = easeNumber(10, 20, {
      seconds: 0.16,
      curve: easeOut,
      onUpdate: (value) => values.push(value),
      onComplete: () => completed++,
    });
    // No frame has come by the time it is stopped, 40ms in, a quarter of its time.
    clock += 40;
    turn.stop();
    expect(values).toEqual([10 + 10 * bezier(easeOut, 0.25)]);
    expect(turn.running).toBe(false);
    // Stopped, it asks for no more frames, gives no more values and never completes.
    expect(frames.size).toBe(0);
    turn.stop();
    expect(values.length).toBe(1);
    expect(completed).toBe(0);

    // Left to run, it gives a value at each frame, then the end itself, and completes once.
    const whole = easeNumber(0, 1, {
      seconds: 0.16,
      curve: easeOut,
      onUpdate: (value) => values.push(value),
      onComplete: () => completed++,
    });
    for (const elapsed of [80, 200]) {
      clock += elapsed;
      const [id, frame] = [...frames][0] ?? [];
      frames.delete(id ?? 0);
      frame?.();
    }
    expect(values.slice(1)).toEqual([bezier(easeOut, 0.5), 1]);
    expect(completed).toBe(1);
    expect(whole.running).toBe(false);
  } finally {
    performance.now = real.now;
    globalThis.requestAnimationFrame = real.request;
    globalThis.cancelAnimationFrame = real.cancel;
  }
});
