import { expect, test } from "../fixtures";

test("the workspace opens on its overview, its sidebar leads to the parts, and the caseworker's menu opens over their name", async ({
  page,
}) => {
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expect(page).toHaveTitle("Overview · Fishing licences");
  const sidebar = page.locator(".x-govuk-ui-sidebar");
  // The parts still to come say so, and lead back.
  await sidebar.getByRole("button", { name: /^Applications/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Applications" })).toBeVisible();
  await expect(page.getByText("Applications is still to come.")).toBeVisible();
  await page.getByRole("button", { name: "Back to the overview" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  // The switcher lists the only workspace so far, in full, with nothing cut short.
  const switcher = page.getByRole("button", { name: "Workspace: Fishing licences" });
  await expect(switcher).toContainText("Fishing licences");
  await switcher.click();
  await expect(page.getByRole("menuitemradio", { name: "Fishing licences" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(page.getByRole("menuitem")).toHaveCount(0);
  await page.keyboard.press("Escape");
  // Collapsed to its icons, the sidebar keeps the crown, which still leads home, and the switcher
  // stays in the bar.
  const brand = page.getByRole("link", { name: "GOV/UK UI" });
  await expect(brand).toHaveAttribute("href", "/");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect(page.locator(".workspace-lockup")).toBeHidden();
  await expect(page.locator(".workspace-crown")).toBeVisible();
  await expect(switcher).toBeVisible();
  await expect(page.getByRole("button", { name: "Mute sounds" })).toBeHidden();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(page.locator(".workspace-lockup")).toBeVisible();
  // The caseworker's row opens their menu above it, where the theme is chosen and Sign out is.
  await page.getByRole("button", { name: "Andy Burnham" }).click();
  // The theme's submenu is a menu too, so the caseworker's menu is found by its class.
  const menu = page.locator(".workspace-user-menu");
  await expect(menu.getByText("Licensing team")).toBeVisible();
  // Their name heads the menu, as the label of the group of their items.
  await expect(menu.getByRole("group", { name: /Andy Burnham/ })).toBeVisible();
  await expect(menu.locator(".x-govuk-ui-menu-header")).toHaveCSS("padding-left", "10px");
  // It opens over their name, just above the row. Once it has grown in, it spans the footer from
  // the row to the sounds and the theme.
  const row = (await page.getByRole("button", { name: "Andy Burnham" }).boundingBox())!;
  const tools = (await page.locator(".workspace-footer-tools").boundingBox())!;
  await expect
    .poll(async () => {
      const over = (await menu.boundingBox())!;
      return (
        over.y + over.height <= row.y + 1 &&
        Math.abs(over.x - row.x) < 1 &&
        Math.abs(over.x + over.width - (tools.x + tools.width)) < 1
      );
    })
    .toBe(true);
  // The theme switches from it, as from the button beside the caseworker.
  await menu.getByRole("menuitem", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(menu).toBeHidden();
  // Sign out is only in the menu, in the colour of a warning, and leaves for the front page.
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCount(0);
  await page.getByRole("button", { name: "Andy Burnham" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("the overview is tiles: the table fills its tile and scrolls in it, the chart follows its tile, and the tiles move, close and come back as left", async ({
  page,
}) => {
  // A window short enough that the applications overflow their tile in any engine's fonts.
  await page.setViewportSize({ width: 1440, height: 900 });
  // A broken arrangement kept in this browser, with a tile twice, gives way to the first one. It is
  // set only before the first visit, so a reload keeps what the test leaves.
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "yes");
    localStorage.setItem(
      "x-govuk-ui-workspace-overview-tiles",
      JSON.stringify({
        version: 1,
        layout: { type: "split", direction: "row", children: ["licences", "licences"] },
      }),
    );
  });
  await page.goto("/workspace");
  const tile = (id: string) => page.locator(`[data-tile-id="${id}"]`);
  await expect(page.locator("[data-tile-id]")).toHaveCount(3);
  // The table reaches its tile's edges.
  const [area, frame] = await Promise.all([
    tile("applications").locator(".x-govuk-ui-tile-content").boundingBox(),
    page.locator(".x-govuk-ui-grouped-table").boundingBox(),
  ]);
  expect(Math.abs(area!.x - frame!.x)).toBeLessThan(1);
  expect(Math.abs(area!.x + area!.width - (frame!.x + frame!.width))).toBeLessThan(1);
  // The first band names the columns, and the last is left for the chevron.
  const table = page.locator(".x-govuk-ui-grouped-table");
  const headings = page.locator(".x-govuk-ui-grouped-table-heading-text");
  await expect(table).toHaveAttribute("data-step", "full");
  await expect(headings).toHaveText(["Reference", "Licence", "Fee", "Received"]);
  // The applications scroll in their tile, in the library's Scroll area, with no scrollbar of the
  // browser's own. While it scrolls, it is a Tab stop named by the tile's heading, and the keys
  // take it to the last row.
  const applications = page.getByRole("region", { name: "Applications 8", exact: true });
  await expect(applications).toHaveClass(/x-govuk-ui-scroll-area-viewport/);
  expect(
    await applications.evaluate(
      (element: HTMLElement) => element.offsetWidth - element.clientWidth,
    ),
  ).toBe(0);
  await applications.focus();
  await page.keyboard.press("End");
  await expect.poll(() => applications.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByText("Grace Whitfield")).toBeInViewport();
  await page.keyboard.press("Home");
  // The chart's plot is as tall as its tile allows. The divider beneath the chart and the activity
  // makes the plot taller, from the keyboard too.
  const plot = page.locator(".x-govuk-ui-chart-plot");
  const divider = page.getByRole("separator", {
    name: "Resize Licences issued and Recent activity",
  });
  const before = (await plot.boundingBox())!.height;
  await divider.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await expect.poll(async () => (await plot.boundingBox())!.height).toBeGreaterThan(before + 10);
  // A band of applications folds its rows away.
  const band = page.getByRole("button", { name: /Needs a decision/ });
  await expect(band).toHaveAttribute("aria-expanded", "true");
  await band.click();
  await expect(band).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByText("Priya Natarajan")).toBeHidden();
  await band.click();
  await expect(page.getByText("Priya Natarajan")).toBeVisible();
  // The chart's figures are there as a table.
  await expect(page.getByRole("img", { name: /Licences for 1 day and 8 days/ })).toBeVisible();
  await page.getByText("Show the figures as a table").click();
  await expect(page.getByRole("row", { name: /w\/c 29 Sep/ })).toContainText("460");
  // The recent activity moves beside the applications from its menu, and stays there in this
  // browser.
  await page.getByRole("button", { name: "Options for Recent activity" }).click();
  await page.getByRole("menuitem", { name: "Move" }).click();
  await page.getByRole("menuitem", { name: "Beside Applications" }).click();
  await page.getByRole("menuitem", { name: "On its right" }).click();
  const beside = async () => {
    const [activity, rows] = await Promise.all([
      tile("activity").boundingBox(),
      tile("applications").boundingBox(),
    ]);
    return Math.abs(activity!.y - rows!.y) < 1 && activity!.x > rows!.x;
  };
  await expect.poll(beside).toBe(true);
  await page.reload();
  await expect.poll(beside).toBe(true);
  // Closing every tile leaves a way to lay out the overview again.
  for (const name of ["Licences issued", "Applications", "Recent activity"])
    await page.getByRole("button", { name: `Close ${name}` }).click();
  await expect(page.getByRole("heading", { name: "Every tile is closed" })).toBeVisible();
  await page.getByRole("button", { name: "Set out the overview" }).click();
  await expect(tile("licences")).toBeVisible();
  await expect(tile("activity")).toBeVisible();
});

test("Piscine Assist copies, resizes, answers, floats its message box, closes with its cross, and comes back with the fish", async ({
  page,
}) => {
  // As on a plain http address other than localhost, there is no Clipboard API. The copy is
  // therefore the browser's own command, which the page records instead, leaving the clipboard
  // untouched.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
    document.execCommand = (command: string) => {
      const field = document.activeElement as HTMLTextAreaElement;
      (window as unknown as { copied: string }).copied = field.value;
      return command === "copy";
    };
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workspace");
  const assist = page.getByRole("complementary", { name: "Piscine Assist" });
  const table = page.locator(".x-govuk-ui-grouped-table");
  const headings = page.locator(".x-govuk-ui-grouped-table-heading-text");
  // A reply copies, even where the browser offers no Clipboard API, as on a plain http address
  // other than localhost.
  // Found by its icons, not its name, which changes as it copies.
  const copy = assist.locator("button:has(.x-govuk-ui-copy-icons)").first();
  await expect(copy).toHaveAccessibleName("Copy");
  await copy.click();
  await expect(copy).toHaveAccessibleName("Copied");
  await expect(copy).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toContain(
    "Refund the second payment",
  );
  // Piscine Assist's handle changes its width, from the keyboard too.
  const handle = page.getByRole("separator", { name: "Resize Piscine Assist" });
  await expect(handle).toHaveAttribute("aria-valuenow", "380");
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  const assistWidth = async () => Number(await handle.getAttribute("aria-valuenow"));
  await expect.poll(assistWidth).toBeGreaterThan(380);
  const widened = await assistWidth();
  await expect.poll(async () => Math.round((await assist.boundingBox())!.width)).toBe(widened);
  // At its widest, Piscine Assist leaves the table only enough space for a narrower step, which
  // leaves the licence out.
  await page.keyboard.press("End");
  await expect(handle).toHaveAttribute("aria-valuenow", "560");
  await expect(table).not.toHaveAttribute("data-step", "full");
  await expect(headings).not.toContainText(["Licence"]);
  await page.keyboard.press("Home");
  // A suggested question is asked and answered, and the answer streams in.
  await assist.getByRole("button", { name: "Which concessions need proof?" }).click();
  await expect(assist.getByRole("button", { name: "Stop the reply" })).toBeVisible();
  // Streaming text is in the page twice, whole for screen readers, and word by word.
  await expect(assist.getByText(/Blue Badge/).first()).toBeVisible({ timeout: 10000 });
  await expect(assist.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 10000 });
  await expect(assist.getByRole("button", { name: "Which concessions need proof?" })).toHaveCount(
    0,
  );
  // Anything else typed gets the demonstration's reply.
  await assist.getByRole("textbox", { name: "Message Piscine Assist" }).fill("Is there a quota?");
  await page.keyboard.press("Enter");
  await expect(assist.getByText(/This is a demonstration/).first()).toBeVisible({ timeout: 10000 });
  // The message box floats over the log, with no band of its own, and the log's end stops above
  // it.
  await expect(assist.locator(".x-govuk-ui-message-scroller-footer")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  const clear = await assist.locator(".x-govuk-ui-message-scroller-scroll").evaluate((scroller) => {
    scroller.scrollTop = scroller.scrollHeight;
    const rows = scroller.querySelectorAll(".x-govuk-ui-message-scroller-item");
    const last = rows[rows.length - 1]!.getBoundingClientRect();
    const box = scroller.closest("aside")!.querySelector(".x-govuk-ui-chat-input")!;
    return box.getBoundingClientRect().top - last.bottom;
  });
  expect(clear).toBeGreaterThan(0);
  // Open, it has its cross, and the bar has no button for it.
  const fish = page.getByRole("button", { name: "Show Piscine Assist" });
  await expect(fish).toHaveCount(0);
  // The cross closes it. It slides away out of reach, gives its space to the overview, and leaves
  // focus on the fish that has appeared in the bar.
  const work = page.locator("#workspace-work");
  const width = (await work.boundingBox())!.width;
  await assist.getByRole("button", { name: "Close Piscine Assist" }).click();
  await expect(page.locator("#workspace-assist")).toHaveAttribute("inert", "");
  await expect(fish).toBeFocused();
  await expect.poll(async () => (await work.boundingBox())!.width).toBeGreaterThan(width + 300);
  // The fish brings it back with its conversation, gives its message box focus, and disappears.
  await fish.click();
  await expect(assist.getByRole("textbox", { name: "Message Piscine Assist" })).toBeFocused();
  await expect(assist.getByText(/This is a demonstration/).first()).toBeInViewport();
  await expect(fish).toHaveCount(0);
  // Closed, it stays closed in this browser.
  await assist.getByRole("button", { name: "Close Piscine Assist" }).click();
  await page.reload();
  await expect(fish).toBeVisible();
  await expect(page.locator("#workspace-assist")).toHaveAttribute("inert", "");
});

test("the sidebar's parts can be pinned and hidden, from their menus or the command menu, and the arrangement lasts", async ({
  page,
}) => {
  await page.goto("/workspace");
  const sidebar = page.locator(".x-govuk-ui-sidebar");
  // A badge rests at its row's edge, and moves aside for the dots while they show.
  const applications = sidebar.locator(".x-govuk-ui-sidebar-menu-item", {
    hasText: "Applications",
  });
  const badge = applications.locator(".x-govuk-ui-sidebar-badge");
  const end = async () => {
    const [row, mark] = await Promise.all([applications.boundingBox(), badge.boundingBox()]);
    return Math.round(row!.x + row!.width - (mark!.x + mark!.width));
  };
  const resting = await end();
  expect(resting).toBeLessThan(14);
  await applications.hover();
  await expect.poll(end).toBeGreaterThan(resting + 20);
  const dots = (await applications.locator(".x-govuk-ui-sidebar-item-actions").boundingBox())!;
  const moved = (await badge.boundingBox())!;
  expect(moved.x + moved.width).toBeLessThanOrEqual(dots.x + 1);
  // Each part's dots open its menu, to pin it to the top.
  await sidebar.getByRole("button", { name: /^Sales/ }).hover();
  await sidebar.getByRole("button", { name: "Options for Sales" }).click();
  await page.getByRole("menuitem", { name: "Pin to the top" }).click();
  const pinned = sidebar.locator(".x-govuk-ui-sidebar-group").first();
  await expect(pinned).toContainText("Pinned");
  await expect(pinned.getByRole("button", { name: /^Sales/ })).toBeVisible();
  // Command-K finds Customise the sidebar, a sheet of switches for every part.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("customise");
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Customise the sidebar" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("switch", { name: "Show Activity" }).uncheck();
  // The sheet hides the page from screen readers while it is open, so the sidebar is read once
  // it has closed.
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
  await expect(sidebar.getByRole("button", { name: /^Activity/ })).toHaveCount(0);
  // The command menu collapses the sidebar too.
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("collapse");
  await page.keyboard.press("Enter");
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  // The arrangement is kept in this browser, and Reset puts it back.
  await page.reload();
  await expect(sidebar.getByRole("button", { name: /^Activity/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(sidebar.locator(".x-govuk-ui-sidebar-group").first()).toContainText("Pinned");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("combobox").fill("customise");
  await page.keyboard.press("Enter");
  await sheet.getByRole("button", { name: "Reset to the original" }).click();
  await sheet.getByRole("button", { name: "Done" }).click();
  await expect(sheet).toBeHidden();
  await expect(sidebar.getByRole("button", { name: /^Activity/ })).toBeVisible();
  await expect(sidebar.getByText("Pinned", { exact: true })).toHaveCount(0);
});

test("in a short window each tile scrolls in its own room, Piscine Assist keeps its message box, and the sounds switch beside the theme, apart from the caseworker", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 560 });
  await page.goto("/workspace");
  const voices = () => page.evaluate(() => (window as unknown as { voices: number }).voices);
  // The switch is beside the theme, and is kept in this browser.
  const sound = page.getByRole("button", { name: "Mute sounds" });
  const theme = page.getByRole("button", { name: "Switch to dark theme" });
  const [switchBox, themeBox] = await Promise.all([sound.boundingBox(), theme.boundingBox()]);
  expect(
    Math.abs(switchBox!.y + switchBox!.height / 2 - (themeBox!.y + themeBox!.height / 2)),
  ).toBeLessThan(2);
  expect(switchBox!.x).toBeLessThan(themeBox!.x);
  // They sit beside the caseworker's row, not in it. A pointer on them is not on the row.
  const caseworker = page.getByRole("button", { name: "Andy Burnham" });
  const rowBox = (await caseworker.boundingBox())!;
  expect(rowBox.x + rowBox.width).toBeLessThanOrEqual(switchBox!.x);
  await sound.hover();
  expect(await caseworker.evaluate((element) => element.matches(":hover"))).toBe(false);
  // Turning the sounds on plays one, so people hear that they are on. The fixtures send it into
  // silence. Turning them off makes no sound, not even the press's own.
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  const before = await voices();
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => localStorage.getItem("x-govuk-ui-muted"))).toBe("false");
  await expect.poll(voices).toBeGreaterThan(before);
  const on = await voices();
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  expect(await voices()).toBe(on);
  // Each tile scrolls in its own space, and the page around them stays still. The wheel over the
  // applications moves only them.
  const applications = page.getByRole("region", { name: "Applications 8", exact: true });
  const overflows = (element: HTMLElement) => element.scrollHeight - element.clientHeight > 1;
  expect(await applications.evaluate(overflows)).toBe(true);
  const rows = (await applications.boundingBox())!;
  await page.mouse.move(rows.x + rows.width / 2, rows.y + rows.height / 2);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => applications.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.locator(".workspace-main").evaluate((element) => element.scrollTop)).toBe(0);
  // Piscine Assist keeps the window's height, with its message box in view.
  await expect(page.getByRole("textbox", { name: "Message Piscine Assist" })).toBeInViewport();
  // Where it is too narrow beside the work, Piscine Assist is put away instead of squeezing the
  // work. The fish opens it as a sheet over the work, with its message box ready. Escape puts it
  // away, and focus returns to the fish.
  await page.setViewportSize({ width: 900, height: 800 });
  const fish = page.getByRole("button", { name: "Show Piscine Assist" });
  await expect(fish).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Piscine Assist" })).toHaveCount(0);
  await fish.click();
  const sheet = page.getByRole("dialog", { name: "Piscine Assist" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("textbox", { name: "Message Piscine Assist" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(fish).toBeFocused();
});
