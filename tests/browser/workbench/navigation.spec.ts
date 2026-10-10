import { expect, test } from "../fixtures";

test("the site's front page leads to the workbench and the workspace, with the theme between", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("GOV/UK UI");
  await expect(page.getByRole("heading", { level: 1, name: "GOV/UK UI" })).toBeVisible();
  // GitHub's mark dots the lock-up's I and links to the source. It is centred on the I, and stands
  // just clear of the I's ink, which the font's own measure of the I finds.
  const source = page.getByRole("link", { name: "Source on GitHub" });
  await expect(source).toHaveAttribute("href", "https://github.com/coriocactus/x-govuk-ui");
  const dot = await page.evaluate(async () => {
    await document.fonts.ready;
    const box = (selector: string) =>
      document.querySelector(selector)?.getBoundingClientRect() ?? new DOMRect();
    const letter = document.querySelector(".brand-product-i") ?? document.body;
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("No canvas.");
    context.font = getComputedStyle(letter).font;
    const ink = context.measureText("I").actualBoundingBoxAscent;
    const mark = box(".brand-source");
    const i = box(".brand-product-i");
    // The empty anchor sits on the baseline.
    const top = box(".brand-source-anchor").bottom - ink;
    return { offset: mark.x + mark.width / 2 - (i.x + i.width / 2), gap: top - mark.bottom };
  });
  expect(Math.abs(dot.offset)).toBeLessThan(0.25);
  expect(dot.gap).toBeGreaterThan(3);
  expect(dot.gap).toBeLessThan(12);
  const site = page.getByRole("navigation", { name: "x-govuk-ui" });
  await expect(site.getByRole("link")).toHaveText(["workbench", "workspace"]);
  // The theme switches here, and the workbench keeps it.
  await site.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // The workspace opens on its overview, in the same theme. Signing out, from the caseworker's
  // menu, leads home.
  await site.getByRole("link", { name: "workspace" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Andy Burnham" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("link", { name: "workbench" }).click();
  await expect(page).toHaveURL(/\/workbench$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // The workbench's brand leads back to the front page. It is a link, so its I has no dot.
  await expect(page.getByRole("link", { name: "Source on GitHub" })).toHaveCount(0);
  await page.getByRole("link", { name: "GOV/UK UI" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("an address the site does not have shows a page that says so, with a way home", async ({
  page,
}) => {
  for (const path of ["/not-a-page", "/workbench/not-a-component"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle("Page not found");
    await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
    // A way home, and nothing else. The theme is the front page's to choose.
    const links = page.getByRole("navigation", { name: "x-govuk-ui" });
    await expect(links.getByRole("link")).toHaveText(["home"]);
    await expect(links.getByRole("button")).toHaveCount(0);
  }
  await page.getByRole("link", { name: "home" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("the workbench's own page counts the components, says how to find one and draws each", async ({
  page,
  frame,
}) => {
  await page.goto("/workbench");
  // It counts every component, as the sidebar lists them.
  const listed = await page.locator('.workbench-sidebar nav a[href^="/workbench/"]').count();
  await expect(frame.locator(".landing-number")).toHaveText(String(listed));
  // Each is drawn, under its group, as a link named for it.
  await expect(frame.locator(".landing-tile")).toHaveCount(listed);
  await expect(frame.locator(".landing-tile:has(.landing-art > svg)")).toHaveCount(listed);
  await expect(frame.getByRole("heading", { level: 2 })).toHaveCount(13);
  await expect(
    frame.getByRole("region", { name: "Overlays" }).getByRole("link", { name: "Dialog" }),
  ).toHaveAttribute("href", "/workbench/dialog");
  // The shortcut that finds one is the device's own, ⌘ K on a Mac or Ctrl K elsewhere.
  await expect(frame.locator(".landing-lead kbd").first()).toHaveText(/^(⌘|Ctrl)\s*K$/);
  // There are no props to show, so no playground, and nothing points at one.
  await expect(page.locator("#playground")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // From here, Next is the first component. The toolbar has no Overview, because this page is it.
  await expect(page.getByRole("button", { name: "Next: Button" })).toBeVisible();
  const overview = page.getByRole("button", { name: "Overview", exact: true });
  await expect(overview).toHaveCount(0);
  // A drawing opens its component in place, with its code panel already open, and Back returns.
  await frame.getByRole("link", { name: "Tour" }).click();
  await expect(page).toHaveURL(/\/workbench\/tour$/);
  await expect(page.locator("#playground")).toBeVisible();
  expect(
    await page.locator(".code-section").evaluate((panel) => getComputedStyle(panel).transform),
  ).toBe("none");
  await page.goBack();
  await expect(page).toHaveURL(/\/workbench$/);
  await expect(frame.getByRole("link", { name: "Conversation" })).toBeVisible();
  // Overview, in the command menu, comes back here from any component.
  await frame.getByRole("link", { name: "Tour" }).click();
  await expect(page).toHaveURL(/\/workbench\/tour$/);
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByPlaceholder("Search components and actions…").fill("overview");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/workbench$/);
  await expect(frame.locator(".landing-number")).toBeVisible();
  // The toolbar's Overview does too, after Next, and focus waits at the start of the preview.
  await frame.getByRole("link", { name: "Tour" }).click();
  await overview.click();
  await expect(page).toHaveURL(/\/workbench$/);
  await expect(overview).toHaveCount(0);
  await expect(page.locator(".preview-stage")).toBeFocused();
  // An old component address leads to its new one.
  await page.goto("/components/tag");
  await expect(page).toHaveURL(/\/workbench\/tag$/);
});

test("the brand's Command-K button finds a component, which opens ready for Tab with its entry in view", async ({
  page,
  open,
  browserName,
}) => {
  await open("tag");
  // The sidebar has no search of its own. Command-K, beside the brand, finds any component.
  await expect(page.getByRole("searchbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Open command menu" }).click();
  const menu = page.getByRole("dialog");
  await menu.getByRole("combobox").fill("accordion");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/workbench\/accordion$/);
  await expect(menu).toBeHidden();
  // After a component is chosen, focus rests unseen at the start of its preview, so Tab reaches
  // the example's first control. Its sidebar entry is scrolled to the middle of the list.
  await expect(page.locator(".preview-stage")).toBeFocused();
  // Safari's Tab skips buttons unless "Press Tab to highlight each item" is on. Option-Tab does
  // not.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  // The accordion's first control, Show all sections, takes focus.
  await expect(
    page.locator(".preview-example").getByRole("button", { name: /Show all sections/ }),
  ).toBeFocused();
  await page.keyboard.press("ControlOrMeta+k");
  await menu.getByRole("combobox").fill("popover");
  await page.keyboard.press("Enter");
  await expect(page.locator(".preview-stage")).toBeFocused();
  const popover = page
    .getByRole("navigation", { name: "Components" })
    .getByRole("link", { name: "Popover" });
  // It glides there as the menu fades.
  await expect
    .poll(() =>
      popover.evaluate((link) => {
        const list = link.closest(".x-govuk-ui-scroll-area-viewport")!.getBoundingClientRect();
        const box = link.getBoundingClientRect();
        return Math.abs(box.top + box.height / 2 - (list.top + list.height / 2));
      }),
    )
    .toBeLessThan(2);
});

test("the sidebar opens with the current entry in the middle, and its line only glides after", async ({
  page,
  open,
}) => {
  await open("logo-carousel");
  const entry = page.locator('.workbench-sidebar [aria-current="page"]');
  const list = page.locator(".workbench-sidebar .x-govuk-ui-sidebar-content");
  await expect(entry).toBeVisible();
  const [row, box] = await Promise.all([entry.boundingBox(), list.boundingBox()]);
  expect(Math.abs(row!.y + row!.height / 2 - (box!.y + box!.height / 2))).toBeLessThan(4);
  // The active line sits on the entry from the start, with no glide in from elsewhere.
  const line = page.locator(".workbench-sidebar .x-govuk-ui-sidebar-line");
  expect(await line.evaluate((element) => element.getAnimations().length)).toBe(0);
  const moves = await line.evaluate((element) => getComputedStyle(element).transform);
  expect(moves === "none" || moves === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);

  // Moving to an entry out of sight above, the list scrolls to it as the line glides there. The
  // line keeps to one direction on screen the whole way, never dragged back by the list. The
  // current entry starts low in the list, so the line has somewhere to go.
  await entry.evaluate((link) => {
    const scroller = link.closest(".x-govuk-ui-scroll-area-viewport")!;
    const lift = scroller.getBoundingClientRect().bottom - link.getBoundingClientRect().bottom;
    scroller.scrollTop -= lift - 60;
  });
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("dialog").getByRole("combobox").fill("accordion");
  const trail = page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const tops: number[] = [];
        const start = performance.now();
        const step = () => {
          const mark = document.querySelector(".workbench-sidebar .x-govuk-ui-sidebar-line");
          if (mark) tops.push(mark.getBoundingClientRect().top);
          if (performance.now() - start < 1200) requestAnimationFrame(step);
          else resolve(tops);
        };
        requestAnimationFrame(step);
      }),
  );
  await page.keyboard.press("Enter");
  const tops = await trail;
  const moved = tops.slice(1).map((top, index) => top - tops[index]!);
  expect(moved.some((change) => change < -1)).toBe(true);
  expect(moved.every((change) => change < 0.5)).toBe(true);
});

test("sidebar entries are pinned from their menu, and their dots ride the highlight", async ({
  page,
  open,
}) => {
  await open("form");
  const sidebar = page.locator(".workbench-sidebar");
  const entry = (name: string) =>
    sidebar.locator(`a[href="/workbench/${name.toLowerCase().replaceAll(" ", "-")}"]`);
  // Each entry's dots show under the pointer, and open its menu.
  const dots = sidebar.locator(".x-govuk-ui-sidebar-item-actions", {
    has: page.getByRole("button", { name: "Options for Choices" }),
  });
  await expect(dots).toHaveCSS("opacity", "0");
  await entry("Choices").hover();
  await sidebar.getByRole("button", { name: "Options for Choices" }).click();
  await page.getByRole("menuitem", { name: "Pin to the top" }).click();
  const pinned = sidebar.locator(".x-govuk-ui-sidebar-group").first();
  await expect(pinned).toContainText("Pinned");
  await expect(pinned.getByRole("link", { name: "Choices" })).toBeVisible();
  // The row's action is part of the row. Moving onto it from another row brings the highlight too.
  const highlight = sidebar.locator(".x-govuk-ui-sidebar-highlight");
  const exit = entry("Exit this page");
  const exitBox = (await exit.boundingBox())!;
  const options = sidebar.getByRole("button", { name: "Options for Link" });
  const optionsBox = (await options.boundingBox())!;
  await page.mouse.move(optionsBox.x + optionsBox.width / 2, exitBox.y + exitBox.height / 2);
  // The glides the next move starts are recorded as they start, so they can be measured even if
  // they have finished by the time the test looks.
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    const started: Animation[] = [];
    Object.assign(window, { started, animate });
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element["animate"]>) {
      const glide = animate.apply(this, args);
      started.push(glide);
      return glide;
    };
  });
  await page.mouse.move(optionsBox.x + optionsBox.width / 2, optionsBox.y + optionsBox.height / 2);
  // The dots ride the highlight as it glides, so the two stay level all the way. Both glides move
  // only by transform, which the browser runs off the main thread, so a busy page slows neither.
  // They are paused at the same moments to be measured, because while they run, WebKit may report
  // each from a different frame.
  const glides = await page.evaluate(() => {
    const { started, animate } = window as unknown as {
      started: Animation[];
      animate: Element["animate"];
    };
    Element.prototype.animate = animate;
    const spot = document.querySelector(".workbench-sidebar .x-govuk-ui-sidebar-highlight")!;
    const dots = document.querySelector('.workbench-sidebar [aria-label="Options for Link"]')!;
    // A glide a later hover cancelled is idle.
    const ridden = started.filter((glide) => {
      const target = (glide.effect as KeyframeEffect).target;
      return glide.playState !== "idle" && (target === spot || target === dots);
    });
    if (ridden.length !== 2) return { count: ridden.length };
    const middle = (element: Element) => {
      const box = element.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    const duration = Number(ridden[0]?.effect?.getComputedTiming().duration);
    const gaps = [0, 0.1, 0.25, 0.5, 0.75, 1].map((share) => {
      for (const glide of ridden) {
        glide.pause();
        glide.currentTime = share * duration;
      }
      return Math.abs(middle(spot) - middle(dots));
    });
    for (const glide of ridden) glide.finish();
    const moved = ridden.flatMap((glide) =>
      (glide.effect as KeyframeEffect).getKeyframes().flatMap((frame) => Object.keys(frame)),
    );
    const timings = ridden.map((glide) => {
      const { duration, easing } = glide.effect!.getComputedTiming();
      return `${duration} ${easing}`;
    });
    return {
      count: ridden.length,
      targets: ridden.map((glide) => (glide.effect as KeyframeEffect).target === spot),
      properties: [...new Set(moved)].filter(
        (key) => !["offset", "computedOffset", "easing", "composite"].includes(key),
      ),
      timings: new Set(timings).size,
      widest: Math.max(...gaps),
    };
  });
  expect(glides.count).toBe(2);
  expect(glides.targets?.sort()).toEqual([false, true]);
  expect(glides.properties).toEqual(["transform"]);
  expect(glides.timings).toBe(1);
  expect(glides.widest).toBeLessThan(1);
  // At rest, the highlight covers the row, level with its dots.
  const spot = (await highlight.boundingBox())!;
  const row = (await entry("Link").boundingBox())!;
  const resting = (await options.boundingBox())!;
  expect(Math.abs(spot.y - row.y)).toBeLessThan(1);
  expect(Math.abs(spot.y + spot.height / 2 - (resting.y + resting.height / 2))).toBeLessThan(1);
  // Moving down the actions, the pointer is always over one. Their strips meet, so it is never
  // between them, and the one it is over shows.
  const buttonDots = (await sidebar
    .getByRole("button", { name: "Options for Button" })
    .boundingBox())!;
  for (let step = 0; step <= 8; step++) {
    const y = buttonDots.y + buttonDots.height / 2 + ((optionsBox.y - buttonDots.y) * step) / 8;
    const x = optionsBox.x + optionsBox.width / 2;
    await page.mouse.move(x, y);
    expect(
      await page.evaluate(
        ([px, py]) => {
          const strip = document
            .elementFromPoint(px!, py!)
            ?.closest(".workbench-sidebar .x-govuk-ui-sidebar-item-actions");
          return Boolean(strip) && getComputedStyle(strip!).opacity === "1";
        },
        [x, y],
      ),
    ).toBe(true);
  }
  // A menu closed with a press elsewhere returns focus to its dots, but they hide once the pointer
  // moves away.
  const elsewhere = (await page.locator(".component-title").boundingBox())!;
  await options.click();
  await expect(page.getByRole("menuitem", { name: "Pin to the top" })).toBeVisible();
  await page.mouse.click(elsewhere.x + 10, elsewhere.y + elsewhere.height / 2);
  await expect(page.getByRole("menuitem", { name: "Pin to the top" })).toHaveCount(0);
  await page.mouse.move(exitBox.x + 40, exitBox.y + exitBox.height / 2);
  const linkDots = sidebar.locator(".x-govuk-ui-sidebar-item-actions", {
    has: page.getByRole("button", { name: "Options for Link" }),
  });
  await expect(linkDots).toHaveCSS("opacity", "0");
});

test("Customise the sidebar hides, moves and resets entries, and the arrangement is kept", async ({
  page,
  open,
}) => {
  // An arrangement kept from an earlier visit shows as the page opens, here with Choices pinned.
  await page.addInitScript(() => {
    if (localStorage.getItem("x-govuk-ui-sidebar-layout") === null)
      localStorage.setItem("x-govuk-ui-sidebar-layout", JSON.stringify({ pinned: ["choices"] }));
  });
  await open("form");
  const sidebar = page.locator(".workbench-sidebar");
  // The sheet hides the page from screen readers while it is open, so entries are found by where
  // they go.
  const entry = (name: string) =>
    sidebar.locator(`a[href="/workbench/${name.toLowerCase().replaceAll(" ", "-")}"]`);
  const pinned = sidebar.locator(".x-govuk-ui-sidebar-group").first();
  await expect(pinned).toContainText("Pinned");
  await expect(pinned.getByRole("link", { name: "Choices" })).toBeVisible();
  // Customise the sidebar, in the toolbar, hides, moves and resets entries, and the sidebar follows
  // at once.
  await page.getByRole("button", { name: "Customise the sidebar" }).click();
  const sheet = page.getByRole("dialog", { name: "Customise the sidebar" });
  // Only the row under the pointer makes space for its pin. A row unpinned with the pointer closes
  // once the pointer leaves it.
  const sheetRow = (name: string) =>
    sheet.locator(".x-govuk-ui-sidebar-customise-row", { hasText: name }).last();
  const nameOf = (name: string) => sheetRow(name).locator(".x-govuk-ui-sidebar-customise-name");
  await sheetRow("Exit this page").hover();
  await expect(nameOf("Exit this page")).not.toHaveCSS("translate", "none");
  await expect(nameOf("Button")).toHaveCSS("translate", "none");
  await sheetRow("Exit this page").getByRole("button", { name: "Pin Exit this page" }).click();
  await sheetRow("Exit this page").getByRole("button", { name: "Unpin Exit this page" }).click();
  await sheet.getByRole("heading", { name: "Pinned" }).hover();
  await expect(nameOf("Exit this page")).toHaveCSS("translate", "none");
  await sheet.getByRole("switch", { name: "Show Link" }).uncheck();
  await expect(entry("Link")).toHaveCount(0);
  // The sheet lists hidden entries too, so Button first moves past the hidden Link, then past Exit
  // this page.
  await sheet.getByRole("button", { name: "Move Button down" }).click();
  await sheet.getByRole("button", { name: "Move Button down" }).click();
  const actions = sidebar.locator(".x-govuk-ui-sidebar-group", { hasText: "Actions" });
  await expect(actions.locator("a")).toHaveText(["Exit this page", "Button"]);
  await sheet.getByRole("button", { name: "Move Actions down" }).click();
  await expect(sidebar.locator(".x-govuk-ui-sidebar-group-label").nth(1)).toHaveText(
    "Form controls",
  );
  await sheet.getByRole("button", { name: "Done" }).click();
  // Next follows the sidebar as arranged, so Input comes after the pinned Choices.
  await entry("Choices").click();
  await page.getByRole("button", { name: /^Next: / }).click();
  await expect(page).toHaveURL(/\/workbench\/input$/);
  // The arrangement is kept for the next visit, and Reset restores the sidebar.
  const kept = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("x-govuk-ui-sidebar-layout") ?? "null"),
  );
  expect(kept).toMatchObject({
    pinned: ["choices"],
    hidden: ["link"],
    order: { Actions: ["link", "exit-this-page", "button"] },
  });
  expect(kept.groups.slice(0, 2)).toEqual(["Form controls", "Actions"]);
  await page.getByRole("button", { name: "Customise the sidebar" }).click();
  await sheet.getByRole("button", { name: "Reset to the original" }).click();
  await expect(entry("Link")).toBeVisible();
  await expect(sidebar.getByText("Pinned", { exact: true })).toHaveCount(0);
});

test("the theme picker switches between light and dark at once, everything together", async ({
  page,
  open,
}) => {
  // It starts light, as GOV.UK does, even on a dark device.
  await page.emulateMedia({ colorScheme: "dark" });
  await open("button");
  const html = page.locator("html");
  const toolbar = page.locator(".preview-toolbar");
  const toDark = toolbar.getByRole("button", { name: "Switch to dark theme" });
  const toLight = toolbar.getByRole("button", { name: "Switch to light theme" });
  await expect(html).toHaveAttribute("data-theme", "light");
  // It shows the current theme, a sun while light, and its name says where a press takes it.
  const shown = (icon: string) =>
    toolbar
      .locator(`.x-govuk-ui-theme-picker-${icon}`)
      .evaluate((svg) => getComputedStyle(svg).visibility);
  expect(await shown("sun")).toBe("visible");
  expect(await shown("moon")).toBe("hidden");
  // A press switches it, and the theme is kept in this browser.
  await toDark.click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  expect(await shown("moon")).toBe("visible");
  expect(await page.evaluate(() => localStorage.getItem("x-govuk-ui-theme"))).toBe('"dark"');
  // Buttons, which ease their colours under the pointer, change with the rest of the page. A few
  // frames later, none is still easing to the new theme.
  const easing = await page.evaluate(async () => {
    document.querySelector<HTMLButtonElement>(".preview-toolbar .x-govuk-ui-theme-picker")!.click();
    for (let frame = 0; frame < 3; frame++) {
      await new Promise((done) => requestAnimationFrame(done));
    }
    return [...document.querySelectorAll(".preview-frame .x-govuk-ui-button")]
      .flatMap((button) => button.getAnimations())
      .filter((animation) => animation instanceof CSSTransition).length;
  });
  expect(easing).toBe(0);
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(toDark).toBeVisible();
  await expect(toLight).toHaveCount(0);
  // T is a key like any other, and does not switch the theme.
  await page.locator(".preview-stage").focus();
  await page.keyboard.press("t");
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("the theme picker's example sets its card's theme, light within a dark workbench and dark within a light one", async ({
  page,
  frame,
  open,
}) => {
  await open("theme-picker");
  const card = frame.locator(".preview-theme");
  const tag = card.locator(".x-govuk-ui-tag");
  // The card's colours once they have finished easing to the theme.
  const colours = () =>
    card.evaluate(async (element) => {
      const easing = element
        .getAnimations({ subtree: true })
        .filter((each) => each instanceof CSSTransition);
      await Promise.all(easing.map((each) => each.finished.catch(() => {})));
      const label = element.querySelector(".x-govuk-ui-tag")!;
      return [getComputedStyle(element).backgroundColor, getComputedStyle(label).color].join(" / ");
    });
  // In a light workbench, the card is light, and turns dark by itself.
  const light = await colours();
  await card.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(card).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(colours).not.toBe(light);
  const dark = await colours();
  // In a dark workbench, the card set light is light throughout, including its tag, as in a light
  // one.
  await page
    .locator(".preview-toolbar")
    .getByRole("button", { name: "Switch to dark theme" })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect.poll(colours).toBe(dark);
  await card.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(card).toHaveAttribute("data-theme", "light");
  await expect.poll(colours).toBe(light);
  await expect(tag).toBeVisible();
});
