import { expect, test } from "bun:test";
import { soundCues } from "x-govuk-ui";
import { soundFamilies } from "x-govuk-ui/internal";
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
