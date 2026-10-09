import { expect, test } from "../fixtures";

test("grid columns share the row in GOV.UK's thirds, and stack in a narrow space", async ({
  page,
  frame,
  open,
}) => {
  await open("width-container");
  const columns = frame.locator(".x-govuk-ui-grid-column");
  const [main, aside] = await Promise.all([
    columns.nth(0).boundingBox(),
    columns.nth(1).boundingBox(),
  ]);
  expect(main && aside && main.width - 2 * aside.width).toBeCloseTo(30, 0);
  await page.setViewportSize({ width: 560, height: 800 });
  await expect
    .poll(async () => {
      const [first, second] = await Promise.all([
        columns.nth(0).boundingBox(),
        columns.nth(1).boundingBox(),
      ]);
      return first && second ? second.y > first.y + first.height && first.x === second.x : false;
    })
    .toBe(true);
});

test("accordion supports keyboard activation, Show all, single panels and reduced motion", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open("accordion");
  const first = frame.getByRole("button", { name: "Before you start" });
  const second = frame.getByRole("button", { name: "What you will need" });
  await first.focus();
  await first.press("Enter");
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(
    frame.getByText("Have your National Insurance number", { exact: false }),
  ).toBeVisible();
  await second.click();
  await expect(first).toHaveAttribute("aria-expanded", "true");
  await expect(second).toHaveAttribute("aria-expanded", "true");
  const showAll = frame.getByRole("button", { name: "Show all sections" });
  await showAll.click();
  await expect(frame.getByRole("button", { name: "What happens next" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await frame.getByRole("button", { name: "Hide all sections" }).click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await playground.set("multiple", false);
  await expect(showAll).toHaveCount(0);
  await first.click();
  await second.click();
  await expect(first).toHaveAttribute("aria-expanded", "false");
  await expect(second).toHaveAttribute("aria-expanded", "true");
  const panel = frame.locator(".x-govuk-ui-accordion-panel").first();
  await expect(panel).toHaveCSS("transition-duration", "0s");
});

test("a scroll area that scrolls is a named stop for Tab", async ({ page, frame, open }) => {
  await open("scroll-area");
  const region = frame.getByRole("region", { name: "Updates to this page" });
  await region.focus();
  await page.keyboard.press("End");
  await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("details open and close from their summary, and keep their text in the page while closed", async ({
  frame,
  open,
}) => {
  await open("details");
  const summary = frame.getByRole("button", { name: "Help with nationality" });
  const panel = frame.locator(".x-govuk-ui-details-panel");
  const text = frame.getByText(/We need to know your nationality/);
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  // Closed, the text stays in the page, hidden until found, so find in page can reach it. Whether
  // Playwright counts such text as visible differs by engine, so the panel's own state is checked.
  await expect(text).toBeAttached();
  await expect(panel).toHaveAttribute("hidden", "until-found");
  await summary.click();
  await expect(summary).toHaveAttribute("aria-expanded", "true");
  await expect(text).toBeVisible();
  await summary.click();
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await expect(panel).toHaveAttribute("hidden", "until-found");
});

test("tiles resize from their dividers, move by a drag or their menus, split, maximise, close and come back", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("tiles");
  const tile = (id: string) => frame.locator(`[data-tile-id="${id}"]`);
  const box = async (id: string) => (await tile(id).boundingBox())!;
  const live = frame.locator('.x-govuk-ui-tiles [aria-live="polite"]');
  // Each divider is a window splitter for the tiles before it, in pixels. The arrow keys move it,
  // and the tile follows. Home and End take it to its limits, and a double-click shares the space
  // evenly.
  const divider = frame.getByRole("separator", { name: "Resize Application and Evidence" });
  const start = Number(await divider.getAttribute("aria-valuenow"));
  await divider.focus();
  await divider.press("ArrowRight");
  await expect(divider).toHaveAttribute("aria-valuenow", String(start + 10));
  await expect.poll(async () => Math.round((await box("application")).width)).toBe(start + 10);
  await divider.press("Home");
  await expect(divider).toHaveAttribute("aria-valuenow", "120");
  await divider.dblclick();
  const max = Number(await divider.getAttribute("aria-valuemax"));
  await expect
    .poll(async () =>
      Math.abs(Number(await divider.getAttribute("aria-valuenow")) - (max + 120) / 2),
    )
    .toBeLessThanOrEqual(1);
  // The tile's menu comes first among its buttons. Split down adds a note below the tile.
  const controls = tile("history").locator(".x-govuk-ui-tile-controls > button");
  await expect(controls.first()).toHaveAccessibleName("Options for History");
  await frame.getByRole("button", { name: "Split History down" }).click();
  await expect(frame.getByRole("heading", { name: "Note 2" })).toBeVisible();
  // Focus moves to the new tile, as it does to an opened tile.
  await expect(tile("note-2").locator(":focus")).toHaveCount(1);
  await expect
    .poll(async () => {
      const [note, history] = await Promise.all([box("note-2"), box("history")]);
      return note.y > history.y && Math.abs(note.x - history.x) < 1;
    })
    .toBe(true);
  // A tile dragged by its bar to another's edge splits that tile there. The band it would fill
  // shows in link blue as it goes.
  const grip = (await tile("evidence").locator(".x-govuk-ui-tile-grip").boundingBox())!;
  const target = await box("notes");
  await page.mouse.move(grip.x + 40, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 60, grip.y + grip.height / 2, { steps: 3 });
  // HTML5's drag events come only as the pointer moves, and the bands show once the tile under it
  // has received one. The pointer therefore moves on a little until its band shows. It keeps clear
  // of the band along the foot of the whole Tiles.
  const over = frame.locator('.mosaic-window:has([data-tile-id="notes"]) .drop-target.bottom');
  let nudge = 0;
  await expect
    .poll(async () => {
      nudge = (nudge + 1) % 4;
      await page.mouse.move(target.x + target.width / 2, target.y + target.height * 0.8 - nudge);
      return over.getAttribute("class");
    })
    .toContain("drop-target-hover");
  await page.mouse.up();
  // A drop says where it landed, as a move from the menu does.
  await expect(live).toHaveText("Evidence moved below Notes");
  await expect
    .poll(async () => {
      const [notes, evidence] = await Promise.all([box("notes"), box("evidence")]);
      return Math.abs(notes.x - evidence.x) < 1 && evidence.y > notes.y;
    })
    .toBe(true);
  // The tile's menu moves it from the keyboard too, announces it, and keeps focus on its button.
  const options = frame.getByRole("button", { name: "Options for Application" });
  await options.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Move" }).click();
  await page.getByRole("menuitem", { name: "To the right edge" }).click();
  await expect(live).toHaveText("Application moved to the right edge");
  await expect(options).toBeFocused();
  await expect
    .poll(async () => {
      const [application, area] = await Promise.all([
        box("application"),
        frame.locator(".x-govuk-ui-tiles-board").boundingBox(),
      ]);
      return area!.x + area!.width - (application.x + application.width);
    })
    // The area's border, and a fraction of a pixel, because engines round percentages differently.
    .toBeLessThan(2.5);
  // Maximised, a tile fills the Tiles, and the rest are out of reach until it is restored.
  const maximise = frame.getByRole("button", { name: "Maximise Application" });
  await maximise.click();
  await expect(maximise).toHaveAttribute("aria-pressed", "true");
  await expect(tile("notes")).toHaveAttribute("inert", "");
  await expect(frame.getByRole("separator")).toHaveCount(0);
  const area = (await frame.locator(".x-govuk-ui-tiles-board").boundingBox())!;
  await expect.poll(async () => Math.round((await box("application")).width)).toBe(area.width - 2);
  await maximise.click();
  await expect(tile("notes")).not.toHaveAttribute("inert");
  // Closed, a tile gives its space to its neighbours and its focus to the tile beside it.
  await frame.getByRole("button", { name: "Options for Note 2" }).click();
  await page.getByRole("menuitem", { name: "Close" }).click();
  await expect(tile("note-2")).toHaveCount(0);
  await expect(live).toHaveText("Note 2 closed");
  await expect(page.locator(":focus")).toHaveAccessibleName(/^Options for /);
  // What was closed waits in the dock, and a press there opens it again.
  await frame.getByRole("button", { name: "Close History" }).click();
  await frame.getByRole("button", { name: "Open History" }).click();
  await expect(tile("history")).toBeVisible();
  // Focus goes to the tile it opened, because the pressed chip has gone.
  await expect(page.locator(":focus")).toHaveAccessibleName("Options for History");
  // With a snap, a dragged divider lands only on steps.
  await playground.set("snap", "40px");
  const line = frame.getByRole("separator").first();
  const edge = (await line.boundingBox())!;
  const vertical = (await line.getAttribute("aria-orientation")) === "vertical";
  await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    edge.x + edge.width / 2 + (vertical ? 37 : 0),
    edge.y + edge.height / 2 + (vertical ? 0 : 37),
    { steps: 6 },
  );
  await page.mouse.up();
  expect(Number(await line.getAttribute("aria-valuenow")) % 40).toBe(0);
});

test("on a small screen the tiles show one at a time, the one in use, with a pager between them", async ({
  frame,
  open,
  playground,
}) => {
  await open("tiles");
  const board = frame.locator(".x-govuk-ui-tiles-board");
  const tile = (id: string) => frame.locator(`[data-tile-id="${id}"]`);
  // The example keeps the tile in use itself, and starts with the history in use.
  await expect(tile("history")).toHaveAttribute("data-active", "true");
  await expect(frame.locator("[data-active]")).toHaveCount(1);
  // The tile that focus enters is the one in use, which the example is told and keeps.
  await tile("application").locator(".x-govuk-ui-tile-controls button").first().focus();
  await expect(tile("application")).toHaveAttribute("data-active", "true");
  await expect(tile("history")).not.toHaveAttribute("data-active");
  await tile("history").locator(".x-govuk-ui-tile-controls button").first().focus();
  await expect(tile("history")).toHaveAttribute("data-active", "true");
  await expect(board).toHaveAttribute("data-several", "true");
  // Small, the board shows only the tile in use, which cannot be maximised.
  await playground.set("mobileBreakpoint", "Every width");
  await expect(board).toHaveAttribute("data-small", "true");
  await expect(tile("history")).toHaveAttribute("data-maximised", "true");
  await expect(tile("application")).toHaveAttribute("inert", "");
  await expect(tile("history").getByRole("button", { name: "Maximise History" })).toHaveCount(0);
  // Its pager says where it is, and goes to the next tile, which takes focus and is in use.
  const pager = tile("history").locator(".x-govuk-ui-tile-pager");
  await expect(pager).toContainText("3 of 4");
  await pager.getByRole("button", { name: "Next tile: Notes" }).click();
  await expect(tile("notes")).toHaveAttribute("data-maximised", "true");
  await expect(tile("notes")).toHaveAttribute("data-active", "true");
  await expect(tile("notes").locator(":focus")).toHaveCount(1);
  await expect(tile("notes").locator(".x-govuk-ui-tile-pager")).toContainText("4 of 4");
});

test("a tile dropped on the dock closes, one dragged from it opens where it lands, and Show here, Make larger, Tidy, the grip and a previewed drag set the tiles out", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("tiles");
  const tile = (id: string) => frame.locator(`[data-tile-id="${id}"]`);
  const box = async (id: string) => (await tile(id).boundingBox())!;
  const board = frame.locator(".x-govuk-ui-tiles-board");
  const dock = frame.getByRole("group", { name: "Closed tiles" });
  const live = frame.locator('.x-govuk-ui-tiles [aria-live="polite"]');
  // HTML5's drag events come only as the pointer moves, and a target shows once it has received
  // one, so the pointer moves on a little over it until it does.
  const dragTo = async (
    from: { x: number; y: number },
    to: () => Promise<{ x: number; y: number }>,
    ready: () => Promise<boolean>,
  ) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + 20, { steps: 3 });
    let nudge = 0;
    await expect
      .poll(async () => {
        nudge = (nudge + 1) % 4;
        const point = await to();
        await page.mouse.move(point.x + nudge, point.y);
        return ready();
      })
      .toBe(true);
    await page.mouse.up();
  };
  // A tile let go where it cannot land goes back, and nothing is left half moved.
  const mosaic = frame.locator(".x-govuk-ui-tiles-mosaic");
  const was = await box("application");
  const handle = (await tile("application").locator(".x-govuk-ui-tile-grip").boundingBox())!;
  await page.mouse.move(handle.x + 40, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + 60, handle.y + 30, { steps: 3 });
  await expect(mosaic).toHaveClass(/-dragging/);
  const away = (await page.locator("#playground").boundingBox())!;
  await page.mouse.move(away.x + away.width / 2, away.y + 40, { steps: 6 });
  await page.mouse.up();
  await expect(mosaic).not.toHaveClass(/-dragging/);
  // Hidden as the drag began, it eases back to its own box, and so does its neighbour.
  const shape = ({ x, y, width, height }: typeof was) =>
    [x, y, width, height].map(Math.round).join();
  await expect.poll(async () => shape(await box("application"))).toBe(shape(was));
  // A tile dragged onto the dock closes, and waits there.
  const grip = (await tile("evidence").locator(".x-govuk-ui-tile-grip").boundingBox())!;
  await dragTo(
    { x: grip.x + 40, y: grip.y + grip.height / 2 },
    async () => {
      const shelf = (await dock.boundingBox())!;
      return { x: shelf.x + shelf.width / 2, y: shelf.y + shelf.height / 2 };
    },
    async () => (await dock.getAttribute("data-over")) !== null,
  );
  await expect(tile("evidence")).toHaveCount(0);
  await expect(live).toHaveText("Evidence closed");
  const chip = dock.getByRole("button", { name: "Open Evidence" });
  await expect(chip).toBeVisible();
  // Dragged from the dock to the left edge of a tile, it opens there.
  const from = (await chip.boundingBox())!;
  const band = frame.locator('.mosaic-window:has([data-tile-id="history"]) .drop-target.left');
  await dragTo(
    { x: from.x + from.width / 2, y: from.y + from.height / 2 },
    async () => {
      const history = await box("history");
      return { x: history.x + 20, y: history.y + history.height / 2 };
    },
    async () => /drop-target-hover/.test((await band.getAttribute("class")) ?? ""),
  );
  await expect(live).toHaveText("Evidence opened");
  await expect
    .poll(async () => {
      const [evidence, history] = await Promise.all([box("evidence"), box("history")]);
      return Math.abs(evidence.y - history.y) < 1 && evidence.x < history.x;
    })
    .toBe(true);
  await expect(chip).toHaveCount(0);
  // Show here puts a closed tile in a tile's place, at its size, and closes the tile it replaces.
  await frame.getByRole("button", { name: "Close History" }).click();
  const place = await box("application");
  await frame.getByRole("button", { name: "Options for Application" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Show here" }).click();
  await page.getByRole("menuitem", { name: "History" }).click();
  await expect(live).toHaveText("History shown in place of Application");
  await expect(tile("application")).toHaveCount(0);
  await expect
    .poll(async () => Math.round((await box("history")).width))
    .toBe(Math.round(place.width));
  await expect(dock.getByRole("button", { name: "Open Application" })).toBeVisible();
  // Make larger gives a tile most of the space at each level.
  const before = (await box("notes")).height;
  await frame.getByRole("button", { name: "Options for Notes" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitem", { name: "Make larger" }).click();
  await expect.poll(async () => (await box("notes")).height).toBeGreaterThan(before + 20);
  // Tidy lays the tiles out evenly. This wide desk gets two rows, the first of two equal tiles.
  await frame.getByRole("button", { name: "Tidy the desk" }).click();
  await expect(live).toHaveText("Tiles set out evenly");
  await expect
    .poll(async () => {
      const boxes = await frame
        .locator(".x-govuk-ui-tile")
        .evaluateAll((tiles) => tiles.map((each) => each.getBoundingClientRect().toJSON()));
      const top = Math.min(...boxes.map((each) => each.y));
      const row = boxes.filter((each) => Math.abs(each.y - top) < 1);
      return row.length === 2 && Math.abs(row[0].width - row[1].width) < 2;
    })
    .toBe(true);
  // The grip shows on every divider.
  await playground.set("grip", true);
  await expect(board.locator(".x-govuk-ui-resizable-grip").first()).toBeVisible();
  // In preview, a drag moves only the line, and moves the tiles once it is let go.
  await playground.set("previewResize", true);
  const divider = frame.getByRole("separator").first();
  const vertical = (await divider.getAttribute("aria-orientation")) === "vertical";
  const sized = (await divider.getAttribute("aria-controls"))!.split(" ")[0]!;
  const sizeOf = async () => {
    const shown = (await frame.locator(`[id="${sized}"]`).boundingBox())!;
    return vertical ? shown.width : shown.height;
  };
  const start = await sizeOf();
  const line = (await divider.boundingBox())!;
  await page.mouse.move(line.x + line.width / 2, line.y + line.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    line.x + line.width / 2 + (vertical ? 60 : 0),
    line.y + line.height / 2 + (vertical ? 0 : 60),
    { steps: 6 },
  );
  await expect(divider).toHaveAttribute("data-preview", "");
  expect(Math.round(await sizeOf())).toBe(Math.round(start));
  await page.mouse.up();
  await expect.poll(sizeOf).toBeGreaterThan(start + 40);
});
