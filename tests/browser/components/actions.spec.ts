import { expect, test } from "../fixtures";

test("button keeps its width and focus while saving, and takes the width on a phone", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("button");
  const button = frame.getByRole("button", { name: "Save and continue" });
  const before = await button.boundingBox();
  // Pressed from the keyboard, so every browser focuses it. Safari does not focus a clicked button.
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-busy", "true");
  await expect(button).toBeFocused();
  expect((await button.boundingBox())!.width).toBeCloseTo(before!.width, 1);
  await button.click({ force: true });
  await expect(frame.getByRole("status")).toContainText("Progress saved.");
  await expect(button).not.toHaveAttribute("aria-busy");
  await playground.set("loading", true);
  await expect(button).toHaveAttribute("aria-busy", "true");
  await playground.set("loading", false);
  await playground.set("variant", "Secondary");
  await page.mouse.move(0, 0);
  await button.focus();
  // Focus without a keyboard keeps the secondary fill, GOV.UK's black tint 95, not the yellow.
  await expect(button).toHaveCSS("background-color", "rgb(243, 243, 243)");
  // As GOV.UK's does, it takes the full width on a phone, and fits its text on a wider screen. A
  // small button keeps its own width, because it sits in rows.
  const wide = page.viewportSize()!;
  const fits = (await button.boundingBox())!.width;
  await page.setViewportSize({ width: 375, height: 700 });
  const column = await button.evaluate(
    (element) => element.parentElement!.getBoundingClientRect().width,
  );
  await expect.poll(async () => (await button.boundingBox())!.width).toBeCloseTo(column, 0);
  // On a phone, the playground is a sheet, so the size is chosen on the wider screen.
  await page.setViewportSize(wide);
  await playground.set("size", /^Small$/);
  const small = (await button.boundingBox())!.width;
  expect(small).toBeLessThan(column);
  await page.setViewportSize({ width: 375, height: 700 });
  await expect.poll(async () => (await button.boundingBox())!.width).toBeCloseTo(small, 0);
  await page.setViewportSize(wide);
  await playground.set("size", /^Medium$/);
  await expect.poll(async () => (await button.boundingBox())!.width).toBeCloseTo(fits, 0);
  // In a group that does not stack, it keeps its text width and its row on a phone, beside Cancel.
  await playground.set("group", true);
  await playground.set("stack", false);
  await page.setViewportSize({ width: 375, height: 700 });
  await expect.poll(async () => (await button.boundingBox())!.width).toBeCloseTo(fits, 0);
  const [saved, cancel] = await Promise.all([
    button.boundingBox(),
    frame.getByRole("button", { name: "Cancel" }).boundingBox(),
  ]);
  expect(Math.abs(saved!.y + saved!.height / 2 - (cancel!.y + cancel!.height / 2))).toBeLessThan(2);
  await page.setViewportSize(wide);
});

test("an icon beside a button's words sits in their middle, whatever the variant", async ({
  frame,
  open,
  playground,
}) => {
  await open("button");
  await playground.set("icon", true);
  for (const variant of ["Primary", "Secondary", "Warning", "Quiet"]) {
    await playground.set("variant", variant);
    const apart = await frame.locator(".x-govuk-ui-button-label").evaluate((label) => {
      const icon = label.querySelector("svg")!.getBoundingClientRect();
      const words = document.createRange();
      words.selectNodeContents(label.firstChild!);
      const text = words.getBoundingClientRect();
      return Math.abs(icon.top + icon.height / 2 - (text.top + text.height / 2));
    });
    expect(`${variant}: ${apart < 1.5}`).toBe(`${variant}: true`);
  }
});

test("pressing Shift three times exits the page, here to the next component", async ({
  page,
  frame,
  open,
}) => {
  await open("exit-this-page");
  await frame.locator(".preview-hint").click();
  for (let press = 0; press < 3; press++) await page.keyboard.press("Shift");
  await expect(page).toHaveURL(/\/workbench\/checkboxes$/);
  await expect(frame.getByRole("group").first()).toBeVisible();
});

test("a split button's chevron opens its other ways, and focus comes back to it", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("split-button");
  await frame.getByRole("button", { name: "Save as a new view" }).click();
  await expect(frame.getByRole("status")).toHaveText("Saved as a new view.");
  // From the keyboard, the chevron opens its menu, and focus goes back to it once one is chosen.
  const chevron = frame.getByRole("button", { name: "More ways to save" });
  await chevron.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Update Strategic accounts" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("status")).toHaveText("Changes discarded.");
  await expect(chevron).toBeFocused();
  // The two halves meet, with only a hairline between them. An outline button shares its keyline
  // with its chevron, and a quiet one is parted from it by a line of its own.
  const join = () =>
    Promise.all([
      frame.getByRole("button", { name: "Save as a new view" }).boundingBox(),
      chevron.boundingBox(),
    ]).then(([button, trigger]) => Math.round(trigger!.x - (button!.x + button!.width)));
  expect(await join()).toBe(1);
  await playground.set("variant", "Outline");
  expect(await join()).toBe(-1);
  await playground.set("variant", "Quiet");
  // Firefox rounds the meeting to -0, which toBe tells apart from 0.
  expect(await join()).toBeCloseTo(0);
  expect(await chevron.evaluate((element) => getComputedStyle(element).borderLeftWidth)).toBe(
    "1px",
  );
});
