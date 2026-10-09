import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures";

test("the skip link moves focus to the content", async ({ page, frame, open }) => {
  await open("skip-link");
  const skip = frame.getByRole("link", { name: "Skip to main content" });
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(frame.locator("#example-content")).toBeFocused();
});

test("a menubar moves between its menus with the arrow keys", async ({ page, frame, open }) => {
  await open("menubar");
  await frame.getByRole("menuitem", { name: "File" }).click();
  await expect(page.getByRole("menuitem", { name: /^Save/ })).toBeVisible();
  // The arrow key moves to the next menu. Chromium and WebKit open it at once, and Firefox opens it
  // on request, by Base UI's Menubar.
  await page.keyboard.press("ArrowRight");
  await expect(frame.getByRole("menuitem", { name: "Edit" })).toHaveAttribute(
    "aria-haspopup",
    "menu",
  );
  if (!(await page.getByRole("menuitem", { name: /^Undo/ }).isVisible()))
    await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /^Undo/ })).toBeVisible();
  await page.getByRole("menuitem", { name: /^Copy/ }).click();
  await expect(frame.getByRole("status")).toHaveText("You chose Copy.");
});

test("sidebar sub-items fold, and icons open the sidebar and the submenu together", async ({
  frame,
  open,
  playground,
}) => {
  await open("sidebar");
  // On a wide screen, the sidebar is a navigation landmark, named by its label.
  await expect(frame.getByRole("navigation", { name: "Account" })).toBeVisible();
  // One custom property sets the header and the page's bar to one height, padding included, so
  // their lower edges meet. The preview has no box-sizing reset, so the parts must size themselves.
  const layout = frame.locator(".x-govuk-ui-sidebar-layout");
  await layout.evaluate((element) => element.style.setProperty("--x-govuk-ui-bar-height", "64px"));
  for (const bar of [".x-govuk-ui-sidebar-header", ".x-govuk-ui-sidebar-page-bar"]) {
    await expect
      .poll(() => frame.locator(bar).evaluate((element) => element.getBoundingClientRect().height))
      .toBe(64);
  }
  await layout.evaluate((element) => element.style.removeProperty("--x-govuk-ui-bar-height"));
  // Its footer's words keep to one line while it narrows to its icons, and wrap otherwise.
  const footer = frame.locator(".x-govuk-ui-sidebar-footer");
  await expect(footer).toHaveCSS("white-space", "nowrap");
  const applications = frame.getByRole("button", { name: "Applications" });
  await expect(applications).toHaveAttribute("aria-expanded", "false");
  await applications.click();
  // The submenu opens before a sub-item is pressed, as a user waits for it to.
  await expect(applications).toHaveAttribute("aria-expanded", "true");
  await frame.getByRole("button", { name: "Submitted" }).click();
  await expect(frame.getByRole("button", { name: "Submitted" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await frame.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(frame.locator(".x-govuk-ui-sidebar")).toHaveAttribute("data-state", "collapsed");
  await applications.click();
  await expect(frame.locator(".x-govuk-ui-sidebar")).toHaveAttribute("data-state", "expanded");
  await expect(applications).toHaveAttribute("aria-expanded", "true");
  await playground.set("collapsible", "Off the screen");
  await expect(footer).toHaveCSS("white-space", "normal");
  // Beside an inset sidebar, the page is a raised panel.
  const page = frame.locator(".x-govuk-ui-sidebar-inset");
  await expect(page).toHaveCSS("border-top-left-radius", "0px");
  await playground.set("variant", "Inset");
  await expect(page).toHaveCSS("border-top-left-radius", "8px");
});

test("words in the footer of a sidebar that narrows to its icons fit its open width in every variant, keep it as it narrows, and give up their height", async ({
  frame,
  open,
  playground,
}) => {
  await open("sidebar");
  const footer = frame.locator(".x-govuk-ui-sidebar-footer");
  // A service's own words in the footer, such as its department's name, as a SidebarText.
  const text = footer.locator(".x-govuk-ui-sidebar-text");
  const fit = async () => {
    await footer.evaluate((element) => {
      if (element.querySelector(".x-govuk-ui-sidebar-text")) return;
      // SidebarText's markup, with its words in an inner element that clips them as the row eases.
      const words = document.createElement("p");
      words.className = "x-govuk-ui-sidebar-text";
      const inner = document.createElement("span");
      inner.className = "x-govuk-ui-sidebar-text-inner";
      inner.textContent = "Department for Business, Innovation, Science and Trade";
      words.append(inner);
      element.append(words);
    });
    return footer.evaluate((element) => {
      const style = getComputedStyle(element);
      const room =
        element.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight);
      const width = element
        .querySelector(".x-govuk-ui-sidebar-text")!
        .getBoundingClientRect().width;
      return { width, off: Math.abs(width - room) };
    });
  };
  // Open, each variant sets the words at the width its footer gives them, to the pixel.
  for (const variant of ["Floating", "Inset", "Sidebar"]) {
    await playground.set("variant", variant);
    await expect.poll(async () => `${variant}: ${(await fit()).off < 1}`).toBe(`${variant}: true`);
  }
  // Narrowed to its icons, the sidebar hides them, still at that width, so they never reflow.
  const { width } = await fit();
  const height = () => text.evaluate((element) => element.getBoundingClientRect().height);
  const tall = await height();
  const sidebar = frame.locator(".x-govuk-ui-sidebar");
  await frame.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  await expect(text).toHaveCSS("visibility", "hidden");
  expect((await fit()).width).toBeCloseTo(width, 1);
  // Their height eases away with the sidebar's width, on the same timing, so nothing jumps.
  const timing = await sidebar.evaluate((element) => {
    const style = getComputedStyle(element);
    return `${style.transitionDuration} ${style.transitionTimingFunction}`;
  });
  const rows = await text.evaluate((element) => {
    const style = getComputedStyle(element);
    // Lists split at the commas between their items, not those inside cubic-bezier().
    const items = (list: string) => list.split(/,\s*(?![^(]*\))/);
    const at = items(style.transitionProperty).indexOf("grid-template-rows");
    return `${items(style.transitionDuration)[at]} ${items(style.transitionTimingFunction)[at]}`;
  });
  expect(rows).toBe(timing);
  // Once narrow, the words take no space, so the footer's rows sit at its foot.
  await expect.poll(height).toBe(0);
  const withWords = await footer.evaluate((element) => element.getBoundingClientRect().height);
  const withoutWords = await footer.evaluate((element) => {
    const words = element.querySelector(".x-govuk-ui-sidebar-text")!;
    words.remove();
    const room = element.getBoundingClientRect().height;
    element.append(words);
    return room;
  });
  expect(withWords).toBe(withoutWords);
  // Open again, they take their height back, and stop clipping, so a link's focus style shows in
  // full.
  await frame.getByRole("button", { name: "Expand sidebar" }).click();
  await expect.poll(height).toBeCloseTo(tall, 1);
  await expect(text.locator(".x-govuk-ui-sidebar-text-inner")).toHaveCSS("overflow", "visible");
});

test("a sidebar's header on GOV.UK's black, an inverse part of the page, keeps its contrast in either theme", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("sidebar");
  await playground.set("inverse", true);
  const head = frame.locator(".x-govuk-ui-sidebar-header");
  await expect(head).toHaveCSS("background-color", "rgb(11, 12, 12)");
  for (const theme of ["light", "dark"]) {
    await page.evaluate((chosen) => {
      document.documentElement.dataset.theme = chosen;
    }, theme);
    const { violations } = await new AxeBuilder({ page })
      .include(".preview-frame .x-govuk-ui-sidebar-header")
      .withRules(["color-contrast"])
      .analyze();
    expect(`${theme}: ${violations.length}`).toBe(`${theme}: 0`);
  }
});

test("tabs keep their places as another opens", async ({ frame, open }) => {
  await open("tabs");
  const places = () =>
    frame
      .getByRole("tab")
      .evaluateAll((tabs) => tabs.map((tab) => tab.getBoundingClientRect().toJSON()));
  const before = await places();
  await frame.getByRole("tab", { name: "Past month" }).click();
  await expect(frame.getByRole("tab", { name: "Past month" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await places()).toEqual(before);
});

test("pagination changes page in place, fits a narrow page in one row of one width, and block pagination keeps its title still as Previous appears", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("pagination");
  const pagination = frame.locator(".x-govuk-ui-pagination");
  await expect(pagination).toHaveAttribute("data-fit", "words");
  await frame.getByRole("link", { name: "Page 6" }).click();
  await expect(frame.locator('[aria-current="page"]')).toHaveText("6");
  await frame.getByRole("link", { name: "Previous page" }).click();
  await expect(frame.locator('[aria-current="page"]')).toHaveText("5");
  // On a phone, it keeps to one row. Previous and Next become arrows, still named for screen
  // readers, and seven slots become five. It keeps one width from page to page.
  const wide = page.viewportSize()!;
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(pagination).toHaveAttribute("data-fit", "few");
  await expect(pagination.locator("li")).toHaveCount(5);
  const parts = () =>
    pagination.evaluate((nav) =>
      [...nav.querySelectorAll(":scope > div, :scope > ul")].map((part) => {
        const box = part.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }),
    );
  const span = async () => {
    const all = await parts();
    // One row, so every part overlaps the first.
    expect(all.every((part) => part.top < all[0]!.bottom && part.bottom > all[0]!.top)).toBe(true);
    return Math.round(all.at(-1)!.right - all[0]!.left);
  };
  const across = await span();
  await pagination.getByRole("link", { name: "Page 10" }).click();
  await expect(frame.locator('[aria-current="page"]')).toHaveText("10");
  expect(await span()).toBe(across);
  await pagination.getByRole("link", { name: "Previous page" }).click();
  await expect(frame.locator('[aria-current="page"]')).toHaveText("9");
  await page.setViewportSize(wide);
  // Block pagination keeps its page's title still as Previous appears.
  await playground.set("block", true);
  while (await frame.getByRole("link", { name: /^Previous/ }).count()) {
    await frame.getByRole("link", { name: /^Previous/ }).click();
  }
  const title = frame.getByText("Overview", { exact: true });
  const titled = (await title.boundingBox())!.y;
  await frame.getByRole("link", { name: /^Next/ }).click();
  await expect(frame.getByRole("link", { name: /^Previous/ })).toBeVisible();
  expect(
    Math.abs((await frame.getByText("Eligibility", { exact: true }).boundingBox())!.y - titled),
  ).toBeLessThan(1);
});

test("command menu groups commands, opens pages and goes back", async ({ page, frame, open }) => {
  await open("command-menu");
  await frame.getByRole("button", { name: "Open command menu" }).click();
  const popup = page.getByRole("dialog");
  const search = popup.getByRole("combobox");
  await expect(popup.getByRole("group", { name: "Your application" })).toBeVisible();
  await search.fill("lang");
  await expect(popup.getByRole("group", { name: "Your application" })).toBeHidden();
  // The first match is highlighted as the search narrows, so Enter chooses it.
  await expect(popup.getByRole("option", { name: /Change language/ })).toHaveAttribute(
    "data-highlighted",
  );
  await search.press("Enter");
  await expect(popup.getByRole("option")).toHaveText(["English", "Cymraeg"]);
  await expect(search).toHaveAttribute("placeholder", "Search languages…");
  await search.press("Backspace");
  await expect(popup.getByRole("option", { name: /Change language/ })).toBeVisible();
  await search.fill("zzz");
  await expect(popup.getByText("No commands found.")).toBeVisible();
  await search.fill("save");
  await expect(popup.getByRole("option", { name: /Save your progress/ })).toHaveAttribute(
    "data-highlighted",
  );
  await search.press("Enter");
  await expect(popup).toBeHidden();
  await expect(frame.getByRole("status")).toContainText("Simulated save complete");
});

test("a command menu's list, once it scrolls, is a region named for its commands, which keyboards can scroll", async ({
  page,
  frame,
  open,
}) => {
  // A short window leaves the list too little space for every command, so it scrolls.
  await page.setViewportSize({ width: 1024, height: 480 });
  await open("command-menu");
  await frame.getByRole("button", { name: "Open command menu" }).click();
  const list = page.getByRole("region", { name: "Commands" });
  await expect(list).toBeVisible();
  const { violations } = await new AxeBuilder({ page })
    .include(".x-govuk-ui-command-popup")
    .withRules(["scrollable-region-focusable"])
    .analyze();
  expect(violations).toEqual([]);
});

test("a navigation menu opens a panel of links from its trigger, and Escape closes it", async ({
  page,
  frame,
  open,
}) => {
  await open("navigation-menu");
  const services = frame.getByRole("button", { name: "Services" });
  await expect(services).toHaveAttribute("aria-expanded", "false");
  await services.click();
  await expect(services).toHaveAttribute("aria-expanded", "true");
  const benefits = page.getByRole("link", { name: /Benefits/ });
  await expect(benefits).toBeVisible();
  await expect(benefits).toContainText("Find out what support you can get.");
  await page.keyboard.press("Escape");
  await expect(benefits).toBeHidden();
  await expect(services).toHaveAttribute("aria-expanded", "false");
  await expect(services).toBeFocused();
});
