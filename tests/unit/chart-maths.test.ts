import { expect, test } from "bun:test";
import {
  acyclic,
  binsOf,
  extentOf,
  figureOf,
  fingerprint,
  heatScale,
  lastFigureOf,
  lowestOf,
  niceScale,
  signed,
  stackOf,
  streamOf,
  swarmOf,
  waterfallOf,
} from "../../packages/memetics/src/chart-maths";

test("a figure is a finite number, and anything else is missing", () => {
  expect(figureOf(4)).toBe(4);
  expect(figureOf("4.5")).toBe(4.5);
  for (const missing of [null, undefined, "", "n/a", Number.NaN, Number.POSITIVE_INFINITY])
    expect(figureOf(missing)).toBeNull();
});

test("an extent is found without spreading, and is null for no figures", () => {
  expect(extentOf([])).toBeNull();
  expect(extentOf([3, -2, Number.NaN, 9])).toEqual([-2, 9]);
  // More points than any engine takes as arguments, as a map's boundaries can have.
  const many = Array.from({ length: 500_000 }, (_, index) => index % 1000);
  expect(extentOf(many)).toEqual([0, 999]);
});

test("a scale runs between round figures, and falls back for none or one", () => {
  expect(niceScale(1e-10, 4e-10).ticks).toEqual([1e-10, 2e-10, 3e-10, 4e-10]);
  expect(niceScale(0, 41)).toEqual({ domain: [0, 50], ticks: [0, 10, 20, 30, 40, 50] });
  expect(niceScale(-48, 31).domain).toEqual([-60, 40]);
  // No figures, as an empty chart has, and all figures the same.
  expect(niceScale(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)).toEqual({
    domain: [0, 1],
    ticks: [0, 1],
  });
  const flat = niceScale(5, 5);
  expect(flat.domain[0]).toBeLessThanOrEqual(5);
  expect(flat.domain[1]).toBeGreaterThan(5);
  const nothing = niceScale(0, 0);
  expect(nothing.domain[0]).toBe(0);
  expect(nothing.domain[1]).toBeGreaterThan(0);
});

test("a heat scale puts each figure in one of five classes, named for the key", () => {
  const heat = heatScale([0, 10], String, (from, to) => `${from}–${to}`);
  expect([0, 1.9, 2, 9.9, 10, 99].map(heat.step)).toEqual([1, 1, 2, 5, 5, 5]);
  expect(heat.classes.map((each) => each.label)).toEqual(["0–2", "2–4", "4–6", "6–8", "8–10"]);
});

test("a histogram counts each figure once, the last bin taking its upper edge", () => {
  const bins = binsOf([1, 2, 2, 3, 7, 9, 10], [0, 5, 10]);
  expect(bins.map((bin) => bin.count)).toEqual([4, 3]);
  expect(binsOf([], 5)).toEqual([]);
  // Sturges' rule, with round edges around the figures.
  const auto = binsOf(Array.from({ length: 100 }, (_, index) => index));
  expect(auto.reduce((sum, bin) => sum + bin.count, 0)).toBe(100);
  expect(auto[0]?.low).toBe(0);
  expect(auto.at(-1)?.high).toBeGreaterThanOrEqual(99);
  // One figure, or all the same, still makes a bin to count them in.
  expect(binsOf([4, 4, 4]).reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
  // Figures too large for a bin's width to move, and too small for fixed decimals, still end in
  // distinct bins that count each figure once.
  expect(binsOf([1e16]).map((bin) => bin.count)).toEqual([1]);
  const tiny = binsOf([1e-10, 2e-10, 3e-10]);
  expect(tiny.map((bin) => bin.low)).toEqual([1e-10, 2e-10]);
  expect(tiny.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
  expect(binsOf([1, 2, 3], Number.NaN).length).toBeGreaterThan(0);
  expect(binsOf([1, 2, 3], [Number.NaN, 0, 2, 2, 4]).map((bin) => [bin.low, bin.high])).toEqual([
    [0, 2],
    [2, 4],
  ]);
});

test("a beeswarm's dots never overlap, in near-linear time, and keep to their row", () => {
  const radius = 4.5;
  const at = Array.from({ length: 2000 }, (_, index) => (index * 7919) % 600);
  const started = performance.now();
  const offsets = swarmOf(at, radius);
  expect(performance.now() - started).toBeLessThan(500);
  const dots = at.map((x, index) => [x, offsets[index] ?? 0] as const);
  // Neighbours along the scale are all a dot could touch.
  const sorted = [...dots].sort((a, b) => a[0] - b[0]);
  for (let index = 0; index < sorted.length; index++)
    for (let other = index + 1; other < sorted.length; other++) {
      const [x, y] = sorted[index] ?? [0, 0];
      const [x2, y2] = sorted[other] ?? [0, 0];
      if (x2 - x > radius * 2 + 1) break;
      expect(Math.hypot(x2 - x, y2 - y)).toBeGreaterThanOrEqual(radius * 2 + 0.999);
    }
  // Limited to a row's half-height, crowded dots stay inside it.
  const held = swarmOf(new Array(200).fill(50), radius, 20);
  expect(Math.max(...held.map(Math.abs))).toBeLessThanOrEqual(20);
  // With no space, the dots take the row's edges in turn, instead of all taking its line.
  const crowded = swarmOf([4, 4, 4], radius, 8);
  expect(crowded).toEqual([0, -8, 8]);
  // Figures all alike fill their row and then take its edges, without looking at every dot.
  const alike = performance.now();
  const many = swarmOf(new Array(20_000).fill(300), radius, 30);
  expect(performance.now() - alike).toBeLessThan(500);
  expect(Math.max(...many.map(Math.abs))).toBeLessThanOrEqual(30);
});

test("stacks run up from nought and down from it, and streams sit about the centre", () => {
  expect(stackOf([2, -1, 3], false)).toEqual({
    ranges: [
      [0, 2],
      [-1, 0],
      [2, 5],
    ],
    up: 5,
    down: -1,
  });
  expect(stackOf([1, 3], true).up).toBe(1);
  expect(stackOf([0, 0], true).up).toBe(0);
  expect(streamOf([2, 2])).toEqual([
    [-2, 0],
    [0, 2],
  ]);
});

test("a waterfall's steps follow on from each other, and a missing one is never nought", () => {
  const steps = waterfallOf([40, 3, -1, null, 2, 42], new Set([0, 5]));
  expect(steps.map((step) => [step.kind, step.span, step.running])).toEqual([
    ["total", [0, 40], 40],
    ["rise", [40, 43], 43],
    ["fall", [42, 43], 42],
    // A missing change is missing, and the total after it is unknown, until the next total.
    ["missing", null, null],
    ["rise", null, null],
    ["total", [0, 42], 42],
  ]);
  expect(signed({ kind: "rise", value: 3 }, String)).toBe("+3");
  expect(signed({ kind: "fall", value: -1 }, String)).toBe("−1");
  expect(signed({ kind: "total", value: 42 }, String)).toBe("42");
  expect(signed({ kind: "missing", value: null }, String)).toBeNull();
});

test("a line is named at its last figure, and a row's lowest label goes the other way", () => {
  expect(lastFigureOf([1, 2, null])).toBe(1);
  expect(lastFigureOf([null, null])).toBe(1);
  expect(lowestOf([5, 3, 3])).toBe(1);
  expect(lowestOf([2, 2])).toBe(0);
  expect(lowestOf([null, null])).toBe(-1);
});

test("a flow keeps no loops and no link from a stage to itself", () => {
  const links = [
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "C", to: "A" },
    { from: "C", to: "C" },
    { from: "A", to: "C" },
  ];
  expect(acyclic(links)).toEqual([
    { from: "A", to: "B" },
    { from: "B", to: "C" },
    { from: "A", to: "C" },
  ]);
});

test("a fingerprint differs when any figure does, and not for the same figures in a new array", () => {
  const rows = [
    { month: "Jan", sold: 4 },
    { month: "Feb", sold: null },
  ];
  const keys = ["month", "sold"];
  expect(
    fingerprint(
      rows.map((row) => ({ ...row })),
      keys,
    ),
  ).toBe(fingerprint(rows, keys));
  expect(fingerprint([{ month: "Jan", sold: 5 }, rows[1] ?? {}], keys)).not.toBe(
    fingerprint(rows, keys),
  );
  expect(fingerprint([{ month: "Feb", sold: null }, rows[0] ?? {}], keys)).not.toBe(
    fingerprint(rows, keys),
  );
});
