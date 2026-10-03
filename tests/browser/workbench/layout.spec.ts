import { expect, settledTop, test } from "../fixtures";

test("panel dividers support pointer and keyboard resizing without page scrolling", async ({
  page,
  frame,
  open,
}) => {
  await open("input");
  const input = frame.getByRole("textbox");
  await input.fill("keep@example.com");
  await expect(page.locator(".site-header")).toHaveCount(0);

  const code = page.getByRole("separator", { name: "Resize code panel" });
  await code.focus();
  await code.press("ArrowUp");
  await expect(code).toHaveAttribute("aria-valuenow", "270");
  await code.press("Home");
  await expect(code).toHaveAttribute("aria-valuenow", "100");
  // Keyboard resizing animates the panel, so the divider settles before it is dragged.
  await expect.poll(() => settledTop(code)).toBe(true);
  let bounds = (await code.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 - 120, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(code).toHaveAttribute("aria-valuenow", "220");
  await expect(page.locator(".code-section")).toHaveCSS("height", "220px");

  const playground = page.getByRole("separator", { name: "Resize playground" });
  bounds = (await playground.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 - 100, bounds.y + bounds.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(playground).toHaveAttribute("aria-valuenow", "420");
  await expect(page.locator(".inspector")).toHaveCSS("width", "420px");
  await playground.press("ArrowRight");
  await expect(playground).toHaveAttribute("aria-valuenow", "410");
  await playground.press("End");
  await expect(playground).toHaveAttribute("aria-valuenow", "600");
  await page.setViewportSize({ width: 1024, height: 768 });
  // The playground shrinks so the preview keeps 326px beside the 256px sidebar.
  await expect(playground).toHaveAttribute("aria-valuenow", "442");
  await expect(input).toHaveValue("keep@example.com");
  await expect(page.locator(".workbench")).not.toHaveAttribute("data-resizing");
  expect(
    await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    })),
  ).toEqual({ width: 1024, height: 768 });
});

test("component list and code scroll independently while their controls stay in place", async ({
  page,
  open,
}) => {
  await open("input");
  const brand = page.getByRole("link", { name: "GOV/UK UI" });
  const brandBefore = await brand.boundingBox();
  const commands = page.getByRole("button", { name: "Open command menu" });
  const commandsBefore = await commands.boundingBox();
  await page.getByRole("navigation", { name: "Components" }).evaluate((nav) => {
    for (let index = 0; index < 60; index++) {
      const link = nav.querySelector("a")!.cloneNode(true) as HTMLAnchorElement;
      link.removeAttribute("aria-current");
      link.textContent = `Example component ${index}`;
      nav.append(link);
    }
  });
  const list = page.locator(
    ".workbench-sidebar .x-govuk-ui-sidebar-content > .x-govuk-ui-scroll-area-viewport",
  );
  await list.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await brand.boundingBox()).toEqual(brandBefore);
  expect(await commands.boundingBox()).toEqual(commandsBefore);

  // The usage code is a Code block, which scrolls in a Scroll area's viewport.
  const panel = page.locator(".code-panel .x-govuk-ui-scroll-area-viewport");
  await expect(panel).toContainText("export default function InputExample");
  const actionsBefore = await page.getByRole("button", { name: "Hide code panel" }).boundingBox();
  await panel.hover();
  await page.mouse.wheel(0, 500);
  await expect.poll(() => panel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await page.getByRole("button", { name: "Hide code panel" }).boundingBox()).toEqual(
    actionsBefore,
  );
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(1100);
});

test("navigation keeps the frame, divider sizes and code-panel visibility", async ({
  page,
  frame,
  open,
}) => {
  await open("input");
  await expect(frame.getByRole("textbox")).toBeVisible();
  const preview = (await frame.elementHandle())!;
  const sidebar = (await page.locator(".workbench-sidebar").elementHandle())!;
  await page.getByRole("separator", { name: "Resize playground" }).press("ArrowLeft");
  await page.getByRole("separator", { name: "Resize code panel" }).press("ArrowUp");
  await page.getByRole("button", { name: "Hide code panel" }).click();
  await expect(page.getByRole("button", { name: "Show code" })).toBeFocused();
  await expect(page.locator("#code-panel")).toBeHidden();

  await page
    .getByRole("navigation", { name: "Components" })
    .getByRole("link", { name: "Button", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workbench\/button$/);
  await expect(page.getByRole("separator", { name: "Resize playground" })).toHaveAttribute(
    "aria-valuenow",
    "330",
  );
  await expect(page.getByRole("button", { name: "Show code" })).toBeVisible();
  expect(
    await preview.evaluate((element) => element === document.querySelector(".preview-frame")),
  ).toBe(true);
  expect(
    await sidebar.evaluate((element) => element === document.querySelector(".workbench-sidebar")),
  ).toBe(true);
  // Next and Previous follow the sidebar's order. Previous wraps from the first component to the
  // last.
  await page.getByRole("button", { name: "Next: Link" }).click();
  await expect(page).toHaveURL(/\/workbench\/link$/);
  await page.getByRole("button", { name: "Previous: Button" }).click();
  await page.getByRole("button", { name: "Previous: Visually hidden" }).click();
  await expect(page).toHaveURL(/\/workbench\/visually-hidden$/);
  for (let step = 0; step < 3; step++) await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/workbench\/input$/);
  await page.getByRole("button", { name: "Show code" }).click();
  await expect(page.locator("#code-panel")).toBeVisible();
  await expect(page.getByRole("separator", { name: "Resize code panel" })).toHaveAttribute(
    "aria-valuenow",
    "270",
  );
});

test("the wheel scrolls the preview over a table that fits", async ({ page, frame, open }) => {
  await page.setViewportSize({ width: 1280, height: 520 });
  await open("table");
  const preview = frame.locator(":scope > .x-govuk-ui-scroll-area-viewport");
  await frame.locator("table").hover();
  await page.mouse.wheel(0, 200);
  await expect.poll(() => preview.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test("an example that fits the preview leaves it still, in every browser", async ({
  page,
  frame,
  open,
}) => {
  // In a window of this size, Safari can keep the stage at the height it first took, a little
  // taller than the preview, so only the Editor's page scrolls there.
  await page.setViewportSize({ width: 1726, height: 1029 });
  await open("editor");
  const preview = frame.locator(":scope > .x-govuk-ui-scroll-area-viewport");
  await expect(frame.locator(".x-govuk-ui-editor")).toBeVisible();
  await expect
    .poll(() => preview.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeLessThanOrEqual(0);
});

test("a page sits from the preview's top, and its errors open above answers that stay still", async ({
  page,
  frame,
  open,
  playground,
}) => {
  // The survey in stages needs a preview tall enough for its errors to open above it.
  await page.setViewportSize({ width: 1440, height: 1100 });
  const viewport = frame.locator(".x-govuk-ui-scroll-area-viewport").first();
  // One page of questions is a service's page, starting at the preview's top left.
  await open("form");
  // The preview is a section, so the header has no banner role here.
  const banner = frame.locator(".x-govuk-ui-header");
  const top = (await viewport.boundingBox())!;
  await expect.poll(async () => (await banner.boundingBox())!.y - top.y).toBeLessThan(1);
  await expect(frame.getByRole("heading", { name: "Your details", level: 1 })).toBeVisible();
  // In stages, a page of questions opens its error summary and message above its answers, which
  // stay still with the button.
  await playground.set("example", /In stages/);
  await playground.set("layout", "Page");
  const answer = frame.getByRole("radio", { name: "Very satisfied" });
  await expect(answer).toBeVisible();
  const before = (await answer.boundingBox())!.y;
  await frame.getByRole("button", { name: /Submit and continue/ }).click();
  await expect(frame.locator(".x-govuk-ui-error-summary")).toBeFocused();
  await expect(frame.getByText("Error: Select a rating to continue")).toBeVisible();
  expect(Math.abs((await answer.boundingBox())!.y - before)).toBeLessThan(1);
});

test("the foot of a page sits at the preview's foot, and its links stay in the workbench", async ({
  page,
  frame,
  open,
}) => {
  await open("feedback");
  const viewport = frame.locator(".x-govuk-ui-scroll-area-viewport").first();
  // Feedback is the foot of a page, as the band on the footer, at the preview's foot.
  const footer = frame.locator(".x-govuk-ui-footer");
  const band = (await frame.locator(".x-govuk-ui-feedback").boundingBox())!;
  expect(Math.abs(band.y + band.height - (await footer.boundingBox())!.y)).toBeLessThan(1);
  await expect
    .poll(async () => {
      const box = (await footer.boundingBox())!;
      const edge = (await viewport.boundingBox())!;
      return Math.abs(box.y + box.height - (edge.y + edge.height));
    })
    .toBeLessThan(2);
  // A link to another site, such as the footer's licence, does not leave the workbench.
  await footer.getByRole("link", { name: /Open Government Licence/ }).click();
  await expect(page).toHaveURL(/\/workbench\/feedback$/);
});

test("the message scroller's chat stays at the foot of the preview however much the code takes", async ({
  page,
  frame,
  open,
}) => {
  await open("message-scroller");
  const handle = page.getByRole("separator", { name: "Resize code panel" });
  await handle.focus();
  for (let press = 0; press < 8; press++) await page.keyboard.press("ArrowUp");
  const box = frame.getByRole("textbox", { name: "Message the Passport Office" });
  await expect(box).toBeInViewport();
  const [field, view] = await Promise.all([box.boundingBox(), frame.boundingBox()]);
  expect(field!.y + field!.height).toBeLessThanOrEqual(view!.y + view!.height);
  // The message scrolls with the library's thin scrollbar, not the browser's.
  await box.fill("one\ntwo\nthree\nfour\nfive\nsix");
  expect(await box.evaluate((area: HTMLElement) => area.offsetWidth - area.clientWidth)).toBe(0);
  await expect(
    frame.locator(".x-govuk-ui-chat-input-scroll .x-govuk-ui-scroll-area-scrollbar"),
  ).toHaveCount(1);
});

test("workbench and component fit a narrow screen", async ({ page, frame, open }, testInfo) => {
  await open("input");
  await expect(frame.getByRole("textbox")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(
    true,
  );
  expect(await frame.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
  await page.getByRole("button", { name: "Open playground" }).click();
  // On a small screen, the playground is a Sheet.
  await expect(page.getByRole("dialog", { name: "Component settings" })).toBeVisible();
  await page.getByRole("textbox", { name: "label", exact: true }).fill("Contact email");
  await page.getByRole("button", { name: "Close playground" }).click();
  await expect(frame.getByRole("textbox", { name: "Contact email" })).toBeVisible();
  await page.getByRole("button", { name: "Open sidebar" }).click();
  await expect(page.getByRole("navigation", { name: "Components" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Components" })).toBeHidden();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});
