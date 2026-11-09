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

test("a data table's columns share the room their widths leave, and a resized column keeps its own", async ({
  page,
  frame,
  open,
}) => {
  // In a window this wide, the columns' widths leave room over.
  await page.setViewportSize({ width: 1920, height: 1000 });
  await open("data-table");
  const viewport = frame.locator(
    ".x-govuk-ui-data-table-scroll > .x-govuk-ui-scroll-area-viewport",
  );
  const table = frame.locator(".x-govuk-ui-data-table-table");
  // The columns fill the table's width, so none is left empty at the side, and nothing scrolls.
  const fills = () =>
    Promise.all([
      viewport.evaluate((element) => element.clientWidth),
      table.evaluate((element) => Math.round(element.getBoundingClientRect().width)),
      viewport.evaluate((element) => element.scrollWidth - element.clientWidth),
    ]);
  await expect
    .poll(async () => {
      const [room, width, over] = await fills();
      return width === room && over === 0;
    })
    .toBe(true);
  // Each column has a share, in proportion to its width, so Organisation is wider than it starts.
  const edge = frame.getByRole("separator", { name: "Width of Organisation" });
  const shown = Number(await edge.getAttribute("aria-valuenow"));
  expect(shown).toBeGreaterThan(240);
  // Resized, it keeps the width given, and the others share what is left, so the table still fills.
  await edge.focus();
  await page.keyboard.press("ArrowRight");
  await expect(edge).toHaveAttribute("aria-valuenow", String(shown + 10));
  await expect
    .poll(async () => {
      const [room, width, over] = await fills();
      return width === room && over === 0;
    })
    .toBe(true);
  // Double-clicked, it takes its share again.
  await edge.dblclick();
  await expect(edge).toHaveAttribute("aria-valuenow", String(shown));
});

test("a data table's rows scroll between its headings and its foot, with the scrollbar beside them", async ({
  page,
  frame,
  open,
  playground,
  browserName,
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
  // A row that takes focus from the keyboard scrolls clear of the foot, and back up, clear of the
  // headings, never resting beneath either. The ninth row starts under the foot.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  const rows = viewport.locator("tbody tr");
  const clear = () =>
    page.evaluate(() => {
      const focused = document.activeElement!.closest("tr")!.getBoundingClientRect();
      const head = document.querySelector(".x-govuk-ui-data-table thead th")!;
      const foot = document.querySelector(".x-govuk-ui-data-table tfoot td")!;
      return (
        focused.top >= head.getBoundingClientRect().bottom - 1 &&
        focused.bottom <= foot.getBoundingClientRect().top + 1
      );
    });
  await rows.nth(7).getByRole("checkbox").focus();
  await page.keyboard.press(tab);
  await expect(rows.nth(8).getByRole("checkbox")).toBeFocused();
  await expect.poll(clear).toBe(true);
  for (let step = 0; step < 8; step++) await page.keyboard.press(`Shift+${tab}`);
  await expect(rows.nth(0).getByRole("checkbox")).toBeFocused();
  await expect.poll(clear).toBe(true);
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

test("a timeline highlights a run of events, loads earlier ones beneath and takes new ones above", async ({
  page,
  frame,
  open,
}) => {
  await open("timeline");
  const items = frame.locator(".x-govuk-ui-timeline-item");
  /**
   * For each event, whether it is highlighted, and the colours of the rail above and below its
   * tick. Also how long its dashes are, and how long the way is to the next tick.
   */
  const rail = () =>
    items.evaluateAll((all) =>
      all.map((item) => {
        const event = item.querySelector(".x-govuk-ui-timeline-event");
        const dashes = event && getComputedStyle(event, "::before");
        // Without dashes, the event's `::before` has no content. Engines write that as none or normal.
        const drawn = dashes && !/^(none|normal)$/.test(dashes.content);
        const length = drawn ? Number.parseFloat(dashes.height) : 0;
        return {
          highlighted: item.hasAttribute("data-highlighted"),
          above: getComputedStyle(item, "::before").backgroundColor,
          aboveDashed: getComputedStyle(item, "::before").backgroundImage.includes("gradient"),
          below: getComputedStyle(item, "::after").backgroundColor,
          dashes: length,
          way: item.getBoundingClientRect().height,
        };
      }),
    );
  // The two events since users last looked are highlighted, and screen readers hear that they are
  // new. The rail is blue between them. Below them, blue dashes run over the grey the whole way to
  // the next tick: the highlighted event draws them from its tick to its foot, and the 13 pixels
  // of rail above the next tick draw the rest.
  const [first, second, third] = await rail();
  expect([first?.highlighted, second?.highlighted, third?.highlighted]).toEqual([
    true,
    true,
    false,
  ]);
  expect(second?.above).toBe(first?.below);
  expect(second?.below).not.toBe(second?.above);
  expect(third?.above).toBe(second?.below);
  expect([first?.dashes, third?.dashes]).toEqual([0, 0]);
  expect(Math.abs((second?.dashes ?? 0) + 13 - (second?.way ?? 0))).toBeLessThanOrEqual(1);
  expect([first?.aboveDashed, second?.aboveDashed, third?.aboveDashed]).toEqual([
    false,
    false,
    true,
  ]);
  await expect(frame.getByRole("heading", { level: 3 }).first()).toHaveAccessibleName(
    "New: Application approved",
  );
  // The button keeps focus while the earlier events load. Focus then moves to the first of them,
  // with the button still beneath for more. They open quietly, as history users asked for.
  const more = frame.getByRole("button", { name: "Show earlier events" });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(more).toHaveAttribute("aria-busy", "true");
  await expect(more).toBeFocused();
  await expect(frame.getByRole("heading", { name: "Documents posted" })).toBeFocused();
  await expect(items).toHaveCount(6);
  await expect(frame.locator("[data-sound-enter]")).toHaveCount(0);
  // The last earlier event takes the button away, and focus still moves to it.
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("heading", { name: "Eligibility checked" })).toBeFocused();
  await expect(items).toHaveCount(7);
  await expect(more).toHaveCount(0);
  // A new event arrives above the others, highlighted with them, and plays its sound.
  await frame.getByRole("button", { name: "Add the next update" }).click();
  await expect(frame.getByRole("heading", { level: 3 }).first()).toHaveAccessibleName(
    "New: Passport sent",
  );
  await expect(frame.locator("time").first()).toHaveText("14 March 2026 at 9am");
  await expect(items.first()).toHaveAttribute("data-sound-enter", "notification");
  const [arrived, latest] = await rail();
  expect(arrived?.highlighted).toBe(true);
  expect(arrived?.below).toBe(latest?.above);
  expect(latest?.above).toBe(first?.below);
  // Above a highlighted event beneath a plain one, the dashes count down from the plain tick, the
  // whole way to the foot of the plain event. The rail above the highlighted tick is blue, and the
  // last dash runs into it. The test highlights the fifth event alone, as a service may.
  await items.evaluateAll((all) => {
    for (const [index, item] of all.entries())
      item.toggleAttribute("data-highlighted", index === 4);
  });
  const join = await items.evaluateAll((all) => {
    const [plain, highlighted] = [all[3], all[4]];
    const event = plain?.querySelector(".x-govuk-ui-timeline-event");
    const dashes = event && getComputedStyle(event, "::before");
    const above = highlighted && getComputedStyle(highlighted, "::before");
    const rail = highlighted && getComputedStyle(highlighted, "::after");
    return {
      dashes: Number.parseFloat(dashes?.height ?? "0"),
      top: dashes?.top,
      way: plain?.getBoundingClientRect().height ?? 0,
      above: above && [above.backgroundColor, above.backgroundImage],
      tick:
        highlighted &&
        getComputedStyle(highlighted.querySelector(".x-govuk-ui-timeline-event")!, "::after")
          .backgroundColor,
      rail: rail?.backgroundColor,
    };
  });
  expect(join.top).toBe("13px");
  expect(Math.abs(join.dashes + 13 - join.way)).toBeLessThanOrEqual(1);
  expect(join.above).toEqual([join.tick, "none"]);
  expect(join.above?.[0]).not.toBe(join.rail);
});

test("a relative time writes the time from now and keeps itself up to date", async ({
  page,
  frame,
  open,
}) => {
  await page.clock.install();
  await open("relative-time");
  const times = frame.locator("time");
  await expect(times).toHaveText(["3 hours ago", "1 week ago", "in 5 days"]);
  await expect(times.first()).toHaveAttribute("title", / at \d/);
  // An hour on, the clock has ticked, and the first time has moved on with it.
  await page.clock.runFor("01:00:00");
  await expect(times.first()).toHaveText("4 hours ago");
});

test("chips link to their pages, named once, and the count of the rest is not a stop", async ({
  page,
  frame,
  open,
  browserName,
}) => {
  // WebKit on a Mac reaches links with Alt and Tab, as Safari does.
  const tab = browserName === "webkit" ? "Alt+Tab" : "Tab";
  await open("record-chip");
  const company = frame.getByRole("link", { name: "Tamar Valley Foundry", exact: true });
  await expect(company).toHaveAttribute("href", "#tamar-valley-foundry");
  const contacts = frame.getByRole("list", { name: "Contacts at Tamar Valley Foundry" });
  await expect(contacts.getByRole("listitem")).toHaveCount(4);
  await expect(contacts.getByRole("listitem").last()).toHaveText(/^\+2\s*and 2 more$/);
  // Tab goes from the company through each contact, and past the count, which is not a link.
  await company.focus();
  await expect(company).toHaveCSS("outline-style", "solid");
  for (const name of ["Henry Campbell-Bannerman", "Arthur Balfour", "Lord Salisbury"]) {
    await page.keyboard.press(tab);
    await expect(frame.getByRole("link", { name, exact: true })).toBeFocused();
  }
  await page.keyboard.press(tab);
  await expect(contacts.locator(":focus")).toHaveCount(0);
});

test("a selection bar floats over a table's rows, which make room for it, and gives focus back", async ({
  page,
  frame,
  open,
  browserName,
}) => {
  await open("selection-bar");
  const table = frame.locator(".x-govuk-ui-data-table");
  const viewport = table.locator(".x-govuk-ui-scroll-area-viewport");
  const bar = frame.getByRole("region", { name: "Selection" });
  await expect(bar).toContainText("1 selected");
  // The bar floats over the rows, 8px above the foot, whose count stays in view. The table keeps
  // its height as the bar comes and goes, so nothing moves.
  const box = await table.boundingBox();
  await bar.evaluate((element) =>
    Promise.all(element.getAnimations().map((each) => each.finished)),
  );
  const [barBox, footBox] = await Promise.all([
    bar.boundingBox(),
    table.locator("tfoot td").first().boundingBox(),
  ]);
  expect(barBox!.y + barBox!.height).toBeCloseTo(footBox!.y - 8, 0);
  await expect(table.locator("tfoot")).toContainText("8 applications");
  // A row that takes focus from the keyboard scrolls clear of the bar. RF-2045, the fifth of the
  // five rows in view, is beneath it until then. It is chosen from the keyboard, because WebKit
  // on a Mac does not focus a checkbox that is clicked, as Safari does not.
  const fifth = frame.getByRole("checkbox", { name: "Select RF-2045" });
  const clear = async (row: string) => {
    const [rowBox, above] = await Promise.all([
      frame.getByRole("row", { name: new RegExp(row) }).boundingBox(),
      bar.boundingBox(),
    ]);
    return rowBox!.y + rowBox!.height <= above!.y;
  };
  expect(await clear("RF-2045")).toBe(false);
  await frame.getByRole("checkbox", { name: "Select RF-2044" }).focus();
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  await expect(fifth).toBeFocused();
  await expect.poll(() => clear("RF-2045")).toBe(true);
  // Choosing it counts it, for screen readers too.
  await page.keyboard.press("Space");
  await expect(frame.getByRole("status").filter({ hasText: "selected" })).toHaveText("2 selected");
  // The last row scrolls clear of the bar too, into the room the rows leave beneath them.
  await viewport.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect.poll(() => clear("RF-2048")).toBe(true);
  // An action that clears the selection takes the bar away, and focus goes back to the row. The
  // table is as it was.
  await bar.getByRole("button", { name: "Approve" }).focus();
  await page.keyboard.press("Enter");
  await expect(bar).toBeHidden();
  await expect(fifth).toBeFocused();
  await expect(frame.getByRole("row", { name: /RF-2045/ })).toContainText("Approved");
  expect(await table.boundingBox()).toEqual(box);
  await expect(table.locator(".x-govuk-ui-data-table-room")).toHaveCount(0);
  // The × clears it too.
  await page.keyboard.press("Space");
  await expect(bar).toBeVisible();
  expect(await table.boundingBox()).toEqual(box);
  await bar.getByRole("button", { name: "Clear selection" }).focus();
  await page.keyboard.press("Enter");
  await expect(bar).toBeHidden();
  await expect(fifth).toBeFocused();
  await expect(fifth).not.toBeChecked();
  // An action from the bar's menu takes the bar away too, and focus still goes back to the row,
  // not to the page, as the menu gives it back to its button, which has gone from view.
  await page.keyboard.press("Space");
  await bar.getByRole("button", { name: "More" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Ask for evidence" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(bar).toBeHidden();
  await expect(frame.getByRole("row", { name: /RF-2045/ })).toContainText("Evidence asked for");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(fifth).toBeFocused();
});

test("a board's card moves up, down or to another stage from its menu, keeps focus, and says where", async ({
  page,
  frame,
  open,
}) => {
  await open("board");
  const meeting = frame.getByRole("group", { name: /^Meeting held/ });
  const agreement = frame.getByRole("group", { name: /^Agreement drafted/ });
  await expect(meeting.getByRole("listitem")).toHaveCount(2);
  // From the keyboard, the card's menu moves it down its stage, as the first, or to another.
  const menu = meeting.getByRole("button", { name: "Move Tamar Valley Foundry" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem")).toHaveText([
    "Move down",
    "Move to Introduced",
    "Move to Checks done",
    "Move to Agreement drafted",
    "Move to Live",
  ]);
  await page.getByRole("menuitem", { name: "Move down" }).click();
  // Moved down, it is second, its menu keeps focus, and screen readers hear its place.
  await expect(meeting.locator(".x-govuk-ui-board-card strong")).toHaveText([
    "Cotswold Glassworks",
    "Tamar Valley Foundry",
  ]);
  await expect(menu).toBeFocused();
  await expect(frame.getByRole("status")).toHaveText(
    "Tamar Valley Foundry moved to Meeting held, 2 of 2",
  );
  // As the last, it moves up, and not down.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem").first()).toHaveText("Move up");
  await expect(page.getByRole("menuitem", { name: "Move down" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Move to Agreement drafted" }).click();
  // In another stage, it goes to the foot, its menu has focus, and screen readers hear where.
  await expect(meeting.getByRole("listitem")).toHaveCount(1);
  await expect(agreement.locator(".x-govuk-ui-board-card strong")).toHaveText([
    "Pennine Oat Mills",
    "Tamar Valley Foundry",
  ]);
  await expect(agreement.getByRole("button", { name: "Move Tamar Valley Foundry" })).toBeFocused();
  await expect(frame.getByRole("status")).toHaveText(
    "Tamar Valley Foundry moved to Agreement drafted, 2 of 2",
  );
  // A stage's name says how many cards it has.
  await expect(agreement).toHaveAccessibleName("Agreement drafted 2 cards");
  // The stages scroll sideways in a Scroll area, and a card's menu that takes focus comes into
  // view.
  const viewport = frame.locator(".x-govuk-ui-board-scroll > .x-govuk-ui-scroll-area-viewport");
  expect(await viewport.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  await frame.getByRole("button", { name: "Move Mersey Tool Hire" }).focus();
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test("a board fills the preview, and its cards drag between others, in a stage or another, back with Escape, and past its edge", async ({
  page,
  frame,
  open,
}) => {
  await open("board");
  const board = frame.locator(".x-govuk-ui-board");
  const viewport = frame.locator(".x-govuk-ui-board-scroll > .x-govuk-ui-scroll-area-viewport");
  const introduced = frame.getByRole("group", { name: /^Introduced/ });
  const meeting = frame.getByRole("group", { name: /^Meeting held/ });
  const checks = frame.getByRole("group", { name: /^Checks done/ });
  // Given the preview's height, the stages reach the board's foot, whatever their cards.
  const foot = async (locator: typeof board) =>
    locator.evaluate((element) => Math.round(element.getBoundingClientRect().bottom));
  expect((await foot(board)) - (await foot(meeting))).toBeLessThan(24);
  expect(await foot(introduced)).toBe(await foot(meeting));
  const centre = async (locator: typeof board) => {
    const box = (await locator.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const grab = async (name: string) => {
    // A card drags by its words, not its menu.
    const words = frame.locator(".x-govuk-ui-board-card", { hasText: name }).locator("strong");
    const from = await centre(words);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 10, from.y + 4, { steps: 3 });
  };
  // The copy is above the page, outside the preview.
  const ghost = page.locator(".x-govuk-ui-board-ghost");
  // How far each card of a stage is moving aside, by the transform it glides to, to a tenth of a
  // pixel, as engines lay out to fractions of one.
  const aside = (stage: typeof board) =>
    stage.locator(".x-govuk-ui-board-card").evaluateAll((all) =>
      all.map((each) => {
        const { transform } = (each as HTMLElement).style;
        return transform ? Math.round(new DOMMatrix(transform).f * 10) / 10 : 0;
      }),
    );
  const names = (stage: typeof board) => stage.locator(".x-govuk-ui-board-card strong");
  // Dragged, a copy follows the pointer. Over another stage, between two cards, the stage is
  // outlined, the card below makes way, and in the stage it left, the cards after it close its
  // space. Dropped there, it takes that place, and screen readers hear where it went, with focus
  // left where the pointer had it. The cards are then at rest.
  await grab("Kittiwake Software");
  const card = introduced.locator(".x-govuk-ui-board-card", { hasText: "Kittiwake Software" });
  await expect(card).toHaveAttribute("data-dragging", "");
  await expect(ghost).toHaveCount(1);
  const tamar = (await meeting.locator(".x-govuk-ui-board-card").first().boundingBox())!;
  await page.mouse.move(tamar.x + tamar.width / 2, tamar.y + tamar.height - 4, { steps: 8 });
  await expect(meeting).toHaveAttribute("data-over", "");
  await expect.poll(() => aside(meeting)).toEqual([0, expect.any(Number)]);
  const [, room] = await aside(meeting);
  expect(room).toBeGreaterThan(40);
  await expect.poll(() => aside(introduced)).toEqual([0, -room!, -room!]);
  await page.mouse.up();
  await expect(names(meeting)).toHaveText([
    "Tamar Valley Foundry",
    "Kittiwake Software",
    "Cotswold Glassworks",
  ]);
  await expect(ghost).toHaveCount(0);
  await expect(meeting).not.toHaveAttribute("data-over");
  await expect(frame.getByRole("status")).toHaveText(
    "Kittiwake Software moved to Meeting held, 2 of 3",
  );
  await expect(meeting.getByRole("button", { name: "Move Kittiwake Software" })).not.toBeFocused();
  expect([...(await aside(meeting)), ...(await aside(introduced))]).toEqual([0, 0, 0, 0, 0]);
  // In its own stage, the faded card goes to the place it would take, as the cards it passes
  // make way. Dropped, it takes that place.
  await grab("Cotswold Glassworks");
  const top = (await meeting.locator(".x-govuk-ui-board-card").first().boundingBox())!;
  await page.mouse.move(top.x + top.width / 2, top.y + 6, { steps: 8 });
  await expect(meeting).not.toHaveAttribute("data-over");
  await expect
    .poll(async () =>
      (await aside(meeting)).map((each, index) => each - [1, 1, -2][index]! * room!),
    )
    .toEqual([0, 0, expect.closeTo(0, 0)]);
  await page.mouse.up();
  await expect(names(meeting)).toHaveText([
    "Cotswold Glassworks",
    "Tamar Valley Foundry",
    "Kittiwake Software",
  ]);
  await expect(frame.getByRole("status")).toHaveText(
    "Cotswold Glassworks moved to Meeting held, 1 of 3",
  );
  // Where a card would drop follows the card, not the pointer. Held by its foot, it passes the
  // card below once it is more than half over it, and goes back once it is less, as it would
  // held anywhere.
  const held = (await meeting.locator(".x-govuk-ui-board-card").first().boundingBox())!;
  const by = { x: held.x + held.width / 3, y: held.y + held.height - 6 };
  await page.mouse.move(by.x, by.y);
  await page.mouse.down();
  await page.mouse.move(by.x, by.y + 6, { steps: 3 });
  await page.mouse.move(by.x, by.y + room! * 0.4, { steps: 4 });
  await expect.poll(() => aside(meeting)).toEqual([0, 0, 0]);
  await page.mouse.move(by.x, by.y + room! * 0.6, { steps: 4 });
  await expect.poll(() => aside(meeting)).toEqual([room, -room!, 0]);
  await page.mouse.move(by.x, by.y + room! * 0.4, { steps: 4 });
  await expect.poll(() => aside(meeting)).toEqual([0, 0, 0]);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  // Escape puts a dragged card back, as the cards that made way go back, and the drop that
  // follows moves nothing.
  await grab("Fenland Seed Company");
  const over = await centre(checks);
  await page.mouse.move(over.x, over.y, { steps: 8 });
  await expect(checks).toHaveAttribute("data-over", "");
  await page.keyboard.press("Escape");
  await expect(checks).not.toHaveAttribute("data-over");
  await expect(ghost).toHaveCount(0);
  await page.mouse.up();
  await expect(introduced).toContainText("Fenland Seed Company");
  await expect(checks.getByRole("listitem")).toHaveCount(2);
  await expect
    .poll(async () => [...(await aside(introduced)), ...(await aside(checks))])
    .toEqual([0, 0, 0, 0]);
  // Held near the board's right edge, a card scrolls the stages to the last, and drops there.
  await grab("Solway Wind Services");
  const area = (await viewport.boundingBox())!;
  await page.mouse.move(area.x + area.width - 8, area.y + area.height / 2, { steps: 10 });
  await expect
    .poll(() =>
      viewport.evaluate(
        (element) => element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
      ),
    )
    .toBe(true);
  const live = frame.getByRole("group", { name: /^Live/ });
  await expect(live).toHaveAttribute("data-over", "");
  await page.mouse.up();
  await expect(live).toContainText("Solway Wind Services");
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
