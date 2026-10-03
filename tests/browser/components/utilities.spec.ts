import { expect, test } from "../fixtures";

test("the sound board plays each cue from its card, which acts it out, by pointer, keys and a drag", async ({
  page,
  frame,
  open,
}) => {
  await open("sound");
  // The fixtures send every sound into silence, counting the voices each cue starts.
  const voices = () => page.evaluate(() => (window as unknown as { voices: number }).voices);
  const card = (name: string) => frame.getByRole("button", { name, exact: true });
  const success = card("success, a task done");
  // Pages open muted, and the board plays nothing, though the card still animates.
  await success.click();
  expect(await voices()).toBe(0);
  await expect(success.locator(".preview-sound-glyph")).toHaveAttribute("data-live", "true");
  // With the sounds on, a press plays the cue, which is two notes, and lights its drawing.
  await page.getByRole("button", { name: "Mute sounds" }).click();
  let before = await voices();
  await success.click();
  await expect.poll(voices).toBe(before + 2);
  await expect(success.locator(".preview-sound-lit")).toHaveCount(1);
  // Enter plays it too, once.
  before = await voices();
  await card("error, an answer in error").focus();
  await page.keyboard.press("Enter");
  await expect.poll(voices).toBe(before + 2);
  // A row down a list climbs a step at each press, as in a menu, and its highlight climbs a row.
  const select = card("select, a row in a menu or list");
  const row = select.locator(".preview-glyph-row");
  await select.click();
  await expect(row).toHaveAttribute("style", /--step: 0px/);
  await select.click();
  await expect(row).toHaveAttribute("style", /--step: -5.5px; --was: 0px/);
  // A switch or a menu turns as it is pressed, and after a moment turns back, by its transitions. A
  // menu resting closed opens, showing its panel, and closes again. Pressed again, the same drawing
  // turns on from where it is, and never restarts from the beginning.
  const opening = card("open, a menu, dialog or panel opening");
  const menu = opening.locator(".preview-sound-glyph");
  const panel = opening.locator(".preview-glyph-panel");
  const drawing = await menu.elementHandle();
  await expect(panel).toHaveCSS("opacity", "0");
  await opening.click();
  await expect(menu).toHaveAttribute("data-turned", "true");
  await expect(panel).not.toHaveCSS("opacity", "0");
  await expect(menu).not.toHaveAttribute("data-turned");
  await expect(panel).toHaveCSS("opacity", "0");
  await opening.click();
  expect(await drawing!.evaluate((glyph) => glyph.isConnected)).toBe(true);
  // A drag across the cards plays each card it passes.
  before = await voices();
  const on = (await card("toggleOn, a switch or box turning on").boundingBox())!;
  const off = (await card("toggleOff, a switch or box turning off").boundingBox())!;
  await page.mouse.move(on.x + on.width / 2, on.y + on.height / 2);
  await page.mouse.down();
  await page.mouse.move(off.x + off.width / 2, off.y + off.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect.poll(voices).toBe(before + 2);
});

test("words only screen readers hear, at the end of a line, never widen a box that scrolls", async ({
  frame,
  open,
}) => {
  await open("visually-hidden");
  const widened = await frame.evaluate((preview) => {
    const box = document.createElement("div");
    box.style.cssText = "position: relative; width: 120px; overflow-x: auto; white-space: nowrap";
    box.innerHTML =
      '<span style="display: inline-block; width: 120px">Change</span><span class="x-govuk-ui-visually-hidden"> your name</span>';
    preview.append(box);
    const wider = box.scrollWidth > box.clientWidth;
    box.remove();
    return wider;
  });
  expect(widened).toBe(false);
});
