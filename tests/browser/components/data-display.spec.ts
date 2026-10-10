import { expect, test } from "../fixtures";

test("table headings sort the rows both ways", async ({ frame, open }) => {
  await open("table");
  const wait = frame.getByRole("columnheader", { name: "Wait in days" });
  await expect(wait).toHaveAttribute("aria-sort", "none");
  await wait.getByRole("button").click();
  await expect(wait).toHaveAttribute("aria-sort", "ascending");
  await expect(frame.getByRole("rowheader").first()).toHaveText("South West");
  await wait.getByRole("button").click();
  await expect(wait).toHaveAttribute("aria-sort", "descending");
  await expect(frame.getByRole("rowheader").first()).toHaveText("London");
  // The table fits, so its box is not a Tab stop and needs no name.
  await expect(frame.getByRole("region")).toHaveCount(0);
});

test("a summary list edits in a dialog and gives focus back to Change", async ({
  page,
  frame,
  open,
}) => {
  await open("summary-list");
  await frame.getByRole("button", { name: "Change phone number" }).click();
  const dialog = page.getByRole("dialog", { name: "Change phone number" });
  await dialog.getByRole("textbox", { name: "Phone number" }).fill("07700 900982");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(frame.locator(".x-govuk-ui-summary-list-value").nth(2)).toHaveText("07700 900982");
  await expect(frame.getByRole("button", { name: "Change phone number" })).toBeFocused();
});

test("a data table sorts, chooses rows, resizes its columns and sums a column", async ({
  page,
  frame,
  open,
}) => {
  await open("data-table");
  const first = frame.locator("tbody tr").first().locator("th");
  const funding = frame.getByRole("button", { name: "Funding", exact: true });
  await funding.click();
  await expect(first).toContainText("Lowfield Arts Council");
  await funding.click();
  await expect(frame.locator('th[aria-sort="descending"]')).toHaveCount(1);
  await expect(first).toContainText("Northfield Borough Council");
  // Rows are chosen one at a time, or all at once.
  const every = frame.getByRole("checkbox", { name: "Select every row" });
  await frame.getByRole("checkbox", { name: "Select Harbour Water" }).check();
  await expect(every).not.toBeChecked();
  await every.check();
  await expect(frame.getByRole("checkbox", { name: "Select Moorland Fire Service" })).toBeChecked();
  // Each column's edge resizes it, and the foot gives a column's figure on request.
  const edge = frame.getByRole("separator", { name: "Width of Organisation" });
  await edge.focus();
  await page.keyboard.press("ArrowRight");
  await expect(edge).toHaveAttribute("aria-valuenow", "250");
  await frame.getByRole("button", { name: "Show the sum of Funding" }).click();
  await expect(frame.getByRole("button", { name: "Sum of Funding, hide" })).toContainText(
    "£5,852,570",
  );
});

test("a data table's rows scroll between its headings and its foot, with the scrollbar beside them", async ({
  frame,
  open,
  playground,
}) => {
  await open("data-table");
  const scroll = frame.locator(".x-govuk-ui-data-table-scroll");
  const viewport = scroll.locator("> .x-govuk-ui-scroll-area-viewport");
  // Eight rows of data show, under the headings and above the foot, each 44 pixels tall.
  const height = () => viewport.evaluate((element) => element.clientHeight);
  expect(await height()).toBe((8 + 2) * 44);
  // The scrollbar runs from the foot of the headings to the top of the foot.
  const edges = await scroll.evaluate((element) => {
    const bar = element
      .querySelector('.x-govuk-ui-scroll-area-scrollbar[data-orientation="vertical"]')!
      .getBoundingClientRect();
    // The cells stick, not their rows, so the cells say where the headings and the foot show.
    const head = element.querySelector("thead th")!.getBoundingClientRect();
    const foot = element.querySelector("tfoot td")!.getBoundingClientRect();
    return [Math.round(bar.top - head.bottom), Math.round(foot.top - bar.bottom)];
  });
  expect(edges).toEqual([0, 0]);
  // The rows stop at either end without a bounce, which would move the headings and the foot.
  expect(await viewport.evaluate((element) => getComputedStyle(element).overscrollBehaviorY)).toBe(
    "none",
  );
  // A thousand rows scroll in the same box.
  await playground.set("long", true);
  await expect(frame.getByText("1008 organisations")).toBeVisible();
  expect(await height()).toBe((8 + 2) * 44);
  await viewport.evaluate((element) => element.scrollBy(0, 20000));
  expect(await viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("a grouped table folds its bands, and gives way step by step as it narrows", async ({
  page,
  frame,
  open,
}) => {
  await open("grouped-table");
  // The first band heads the columns, each heading over its column.
  const headings = () =>
    frame
      .locator(".x-govuk-ui-grouped-table-heading")
      .evaluateAll((all) => all.map((heading) => Math.round(heading.getBoundingClientRect().left)));
  await expect(frame.locator(".x-govuk-ui-grouped-table")).toHaveAttribute("data-step", "full");
  const placed = await headings();
  expect(placed.length).toBeGreaterThan(1);
  // To do starts folded, and a band folds its rows away.
  await expect(frame.getByRole("button", { name: /To do/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  const band = frame.getByRole("button", { name: /In review/ });
  await band.click();
  await expect(band).toHaveAttribute("aria-expanded", "false");
  await expect(frame.getByText("Show the licence price before payment")).toBeHidden();
  await band.click();
  await expect(frame.getByText("Show the licence price before payment")).toBeVisible();
  // Narrowed with every band folded, then widened, a band opens with its columns lined up again.
  const narrow = frame.getByRole("separator", { name: "Width of the table" });
  const bands = [/In review/, /In progress/, /To do/].map((name) =>
    frame.getByRole("button", { name }),
  );
  await narrow.focus();
  await page.keyboard.press("Home");
  await expect(frame.locator(".x-govuk-ui-grouped-table")).toHaveAttribute("data-step", "tight");
  for (const each of bands.slice(0, 2)) await each.click();
  await expect(frame.locator(".x-govuk-ui-grouped-table-row")).toHaveCount(0);
  await narrow.focus();
  await page.keyboard.press("End");
  await expect(frame.locator(".x-govuk-ui-grouped-table")).toHaveAttribute("data-step", "full");
  // With nothing to measure, the headings still stand over their columns, as they did at the start.
  await expect.poll(headings).toEqual(placed);
  await bands[0]!.click();
  const row = frame.locator(".x-govuk-ui-grouped-table-row").first();
  await expect
    .poll(() =>
      row.evaluate((element) => {
        const title = element.querySelector<HTMLElement>(".x-govuk-ui-grouped-table-title")!;
        const cell = element.querySelector('[data-place="track"]')!.getBoundingClientRect();
        const box = title.getBoundingClientRect();
        // The title is shown in full, and ends before the first cell.
        return title.scrollWidth <= title.clientWidth + 1 && box.right <= cell.left + 1;
      }),
    )
    .toBe(true);
  for (const each of bands.slice(1)) await each.click();
  // Narrowing the table leaves the area out, then the changes join each title, the dates join the
  // people, and past the last step the groups scroll. No title is ever cut short or wrapped.
  const table = frame.locator(".x-govuk-ui-grouped-table");
  await expect(frame.getByText("Payments", { exact: true })).toBeVisible();
  await expect(table).toHaveAttribute("data-step", "full");
  const handle = frame.getByRole("separator", { name: "Width of the table" });
  await handle.focus();
  for (let press = 0; press < 2; press++) await page.keyboard.press("Shift+ArrowLeft");
  await expect(table).toHaveAttribute("data-step", "drop");
  await expect(frame.getByText("Payments", { exact: true })).toHaveCount(0);
  for (let press = 0; press < 6; press++) await page.keyboard.press("Shift+ArrowLeft");
  await expect(table).toHaveAttribute("data-step", "tight");
  await expect(
    frame.locator('.x-govuk-ui-grouped-table-cell[data-place="inline"]').first(),
  ).toBeVisible();
  // Once the step has settled, no title is cut short or wrapped.
  await expect
    .poll(() =>
      table.evaluate(
        (element) =>
          [...element.querySelectorAll<HTMLElement>(".x-govuk-ui-grouped-table-title")].filter(
            (title) => title.scrollWidth > title.clientWidth + 1 || title.offsetHeight > 30,
          ).length,
      ),
    )
    .toBe(0);
  await page.keyboard.press("End");
  await expect(table).toHaveAttribute("data-step", "full");
  // Dragging the handle through every step reports no resize loop to the page.
  const loops = await page.evaluate(() => {
    const seen: string[] = [];
    window.addEventListener("error", (event) => seen.push(event.message));
    (window as unknown as { loops: string[] }).loops = seen;
    return seen.length;
  });
  const grip = (await handle.boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 30; step++)
    await page.mouse.move(grip.x + grip.width / 2 - step * 12, grip.y + grip.height / 2);
  await page.mouse.up();
  await expect(table).toHaveAttribute("data-step", "tight");
  expect(await page.evaluate(() => (window as unknown as { loops: string[] }).loops.length)).toBe(
    loops,
  );
});

test("an editable code block colours what is typed, keeps the text on its colours, and lets Tab go", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("code-block");
  await playground.set("editable", true);
  const input = frame.getByRole("textbox", { name: "national-insurance.tsx" });
  const code = frame.locator(".x-govuk-ui-code-block-code");
  await expect(code).toHaveAttribute("aria-hidden", "true");
  // The region is not a Tab stop of its own. The text box is.
  await expect(frame.getByRole("region")).toHaveCount(0);
  await input.focus();
  await input.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, 0));
  await page.keyboard.type("const service = 'Apply';\n");
  await expect(code.locator(".x-govuk-ui-code-line").first()).toContainText("const service");
  await expect(code.locator(".x-govuk-ui-code-keyword").first()).toHaveText("const");
  await expect(code.locator(".x-govuk-ui-code-line-number")).toHaveCount(
    (await input.inputValue()).split("\n").length,
  );
  // The text box is exactly as big as the code, and never scrolls by itself, even when typing at
  // the end of the longest line, past the region's edge.
  const end = await input.evaluate((element: HTMLTextAreaElement) => {
    const at = element.value.indexOf(' name="nino"');
    element.setSelectionRange(at, at);
    return at;
  });
  expect(end).toBeGreaterThan(0);
  await page.keyboard.type(' autoComplete="off" spellCheck={false}');
  const sizes = await input.evaluate((element) => {
    const pre = element.previousElementSibling!.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return {
      scrolled: element.scrollLeft + element.scrollTop,
      overflows:
        element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
      width: Math.abs(pre.width - box.width),
      height: Math.abs(pre.height - box.height),
    };
  });
  expect(sizes).toEqual({ scrolled: 0, overflows: false, width: 0, height: 0 });
  // Tab moves on to the next control, as it does from any text box.
  await page.keyboard.press("Tab");
  await expect(input).not.toBeFocused();
  // Read-only again, the block shows the code as it was typed.
  await playground.set("editable", false);
  await expect(code).not.toHaveAttribute("aria-hidden");
  await expect(code).toContainText("spellCheck={false}");
});

test("a code block wraps its lines where its text box does, and scrolls inside at its most rows", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("code-block");
  await playground.set("language", "HTML");
  await playground.set("editable", true);
  await playground.set("wrap", true);
  const input = frame.getByRole("textbox", { name: "national-insurance.html" });
  const viewport = frame.locator(".x-govuk-ui-code-block .x-govuk-ui-scroll-area-viewport");
  // The lines the text box breaks its text into are the lines of coloured code. Its text is as
  // tall as the code, whatever is typed, even a word too long for a line.
  // The text box's height is a whole number of pixels, so the two may differ by less than one. A
  // line broken in another place would make them differ by a line, 23 pixels.
  const lines = () =>
    input.evaluate((element: HTMLTextAreaElement) => {
      const code = element.previousElementSibling!.getBoundingClientRect().height;
      element.style.height = "0px";
      const text = element.scrollHeight;
      element.style.height = "";
      return { apart: Math.abs(text - code) < 1.5, code };
    });
  const wrapped = await lines();
  expect(wrapped.apart).toBe(true);
  await input.evaluate((element: HTMLTextAreaElement) => {
    const at = element.value.indexOf("spellcheck");
    element.setSelectionRange(at, at);
    element.focus();
  });
  await page.keyboard.type(`${"x".repeat(130)} `);
  const typed = await lines();
  expect(typed.apart).toBe(true);
  expect(typed.code).toBeGreaterThan(wrapped.code);
  // Nothing runs past the side, so the block never scrolls sideways.
  expect(await viewport.evaluate((element) => element.scrollWidth - element.clientWidth)).toBe(0);
  // With as many rows as its most rows, the block is that many lines tall, and scrolls inside.
  await playground.set("long", true);
  await playground.set("rows", 10);
  await playground.set("maxRows", 10);
  await expect
    .poll(() => viewport.evaluate((element) => Math.round(element.clientHeight)))
    .toBe(Math.round(10 * 13 * 1.75 + 30));
  await viewport.evaluate((element) => element.scrollBy(0, 4000));
  expect(await viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("a file diff wraps its lines at its width, and scrolls inside at its most rows", async ({
  frame,
  open,
  playground,
}) => {
  await open("file-diff");
  // Narrower than its longest line in any typeface, so it runs past the side until it wraps. At
  // the frame's width, Linux's monospace font fits every line.
  await frame.locator(".x-govuk-ui-file-diff").evaluate((element: HTMLElement) => {
    element.style.width = "320px";
  });
  const viewport = frame.locator(".x-govuk-ui-file-diff .x-govuk-ui-scroll-area-viewport");
  const beyond = () => viewport.evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(await beyond()).toBeGreaterThan(0);
  await playground.set("wrap", true);
  await expect.poll(beyond).toBe(0);
  // A wrapped line's code starts beside its numbers and sign on every line it takes.
  const code = frame.locator(".x-govuk-ui-diff-line[data-kind='add'] .x-govuk-ui-diff-code");
  const rects = await code
    .first()
    .evaluate((element) => [...element.getClientRects()].map((rect) => Math.round(rect.left)));
  expect(new Set(rects).size).toBe(1);
  await playground.set("long", true);
  await playground.set("maxRows", 12);
  await expect
    .poll(() => viewport.evaluate((element) => Math.round(element.clientHeight)))
    .toBe(Math.round(12 * 13 * 1.75 + 12));
  await viewport.evaluate((element) => element.scrollBy(0, 4000));
  expect(await viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("a timeline takes a new event at its head, dated as GOV.UK does", async ({ frame, open }) => {
  await open("timeline");
  await frame.getByRole("button", { name: "Add the next update" }).click();
  await expect(frame.getByRole("heading", { level: 3 }).first()).toHaveText("Passport sent");
  await expect(frame.locator("time").first()).toHaveText("14 March 2026 at 9am");
});

test("an avatar group lifts the avatar under the pointer most, and its neighbours less", async ({
  page,
  frame,
  open,
}) => {
  await open("avatar");
  const avatars = frame.locator(".x-govuk-ui-avatar-group > .x-govuk-ui-avatar");
  await avatars.nth(1).hover();
  const lifts = () =>
    avatars.evaluateAll((elements) =>
      elements.map((element) => {
        const matrix = new DOMMatrix(getComputedStyle(element).transform);
        return { y: Math.round(matrix.f * 100) / 100, scale: Math.round(matrix.a * 100) / 100 };
      }),
    );
  await expect.poll(lifts).toEqual([
    { y: -1.8, scale: 1 },
    { y: -4, scale: 1.05 },
    { y: -1.8, scale: 1 },
    { y: -0.81, scale: 1 },
    { y: -0.36, scale: 1 },
  ]);
  // As the pointer leaves, they settle back into line.
  await page.mouse.move(0, 0);
  await expect
    .poll(async () => (await lifts()).every(({ y, scale }) => y === 0 && scale === 1))
    .toBe(true);
});
