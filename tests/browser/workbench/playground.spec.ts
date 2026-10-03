import { expect, test } from "../fixtures";

test("prop controls are labelled with their prop's name, and Reset preview starts the example over", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("input");
  const input = frame.getByRole("textbox", { name: "Email address" });
  await input.fill("wrong");
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(frame.getByRole("alert")).toBeVisible();
  // Each prop's control is labelled with the prop's own name.
  await playground.text("label").fill("Contact email");
  await expect(frame.getByRole("textbox", { name: "Contact email" })).toBeVisible();
  await playground.set("disabled", true);
  await expect(frame.getByRole("textbox")).toBeDisabled();
  await page.getByRole("button", { name: "Reset preview" }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeEnabled();
  await expect(frame.getByRole("alert")).toHaveCount(0);
});

test("an example sets the props for one use, and the example's settings show only while they apply", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("chart");
  const examples = page.getByRole("group", { name: "Examples" });
  const pyramid = examples.getByRole("button", { name: "Population pyramid" });
  const projection = examples.getByRole("button", { name: "Projection" });
  // A prop that does not apply is shown, but cannot be changed. An example setting is hidden.
  await expect(playground.switch("diverging")).toBeDisabled();
  await expect(playground.switch("projection")).toBeVisible();
  // An example sets the props, and the settings that apply to them show beneath.
  await pyramid.click();
  await expect(pyramid).toHaveAttribute("aria-pressed", "true");
  await expect(playground.select("type")).toContainText("Bar");
  await expect(playground.switch("stacked")).toBeChecked();
  await expect(playground.switch("diverging")).toBeChecked();
  await expect(playground.switch("projection")).toHaveCount(0);
  await expect(
    frame.getByText("Most licence holders are men in their forties and fifties"),
  ).toBeVisible();
  // At most one example is chosen, and changing a setting it set deselects it.
  await projection.click();
  await expect(pyramid).toHaveAttribute("aria-pressed", "false");
  await expect(projection).toHaveAttribute("aria-pressed", "true");
  await playground.set("direct", false);
  await expect(projection).toHaveAttribute("aria-pressed", "false");
  // Picked again, an example starts over.
  await pyramid.click();
  await pyramid.click();
  await expect(pyramid).toHaveAttribute("aria-pressed", "false");
  await expect(playground.select("type")).toContainText("Line");
  await expect(playground.switch("projection")).not.toBeChecked();
  // Example settings sit above the props. As they come back, the panel scrolls by the same amount,
  // so the prop just changed stays where it was.
  await playground.set("type", "Pie");
  await expect(playground.switch("projection")).toHaveCount(0);
  const before = (await playground.select("type").boundingBox())!.y;
  await playground.set("type", "Line");
  await expect(playground.switch("projection")).toBeVisible();
  expect(Math.abs((await playground.select("type").boundingBox())!.y - before)).toBeLessThan(1);
});

test("a number can be erased and typed over, the example keeping its default meanwhile", async ({
  page,
  frame,
  open,
}) => {
  await open("textarea");
  const rows = page.getByRole("spinbutton", { name: "rows" });
  const field = frame.getByRole("textbox", { name: "Can you provide more detail?" });
  await expect(rows).toHaveValue("5");
  await rows.fill("");
  // Emptied, the field shows the default where the figure was, and the example keeps it.
  await expect(rows).toHaveAttribute("placeholder", "5");
  await expect(field).toHaveAttribute("rows", "5");
  await rows.pressSequentially("8");
  await expect(field).toHaveAttribute("rows", "8");
});

test("on a phone the playground is a sheet whose selects work, and hiding code keeps it closed", async ({
  page,
  frame,
  open,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open("select");
  await page.getByRole("button", { name: "Hide code panel" }).click();
  await expect(page.getByRole("dialog", { name: "Component settings" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open playground" })).toBeFocused();
  await page.getByRole("button", { name: "Open playground" }).click();
  const sheet = page.getByRole("dialog", { name: "Component settings" });
  await sheet.getByRole("combobox").first().click();
  // The list opens above the sheet, where a press reaches it.
  const option = page.getByRole("option", { name: "Small" });
  const box = (await option.boundingBox())!;
  expect(
    await page.evaluate(
      ([x, y]) => document.elementFromPoint(x, y)?.closest('[role="option"]')?.textContent,
      [box.x + box.width / 2, box.y + box.height / 2],
    ),
  ).toBe("Small");
  await option.click();
  await expect(frame.locator(".x-govuk-ui-select-trigger")).toHaveAttribute("data-size", "small");
  await sheet.getByRole("button", { name: "Show code" }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator("#code-panel")).toBeVisible();
});

test("the usage code is the example's file, and copies, and the server answers for missing files", async ({
  page,
  context,
  open,
  browserName,
}) => {
  // Only Chromium lets a test grant clipboard access. Elsewhere the copy is checked by its label.
  const clipboard = browserName === "chromium";
  if (clipboard) await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open("input");
  // The usage code is the example file that renders the preview.
  await expect(page.locator(".code-panel")).toContainText('from "x-govuk-ui"');
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  if (clipboard) {
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      "export default function InputExample",
    );
  } else {
    await expect(page.getByRole("button", { name: /^(Copied|Could not copy)$/ })).toBeVisible();
  }
  expect((await page.request.get("/source/not-a-file")).status()).toBe(404);
  expect((await page.request.get("/not-a-route")).status()).toBe(404);
  const notices = await page.request.get("/THIRD_PARTY_NOTICES.txt");
  expect(notices.ok()).toBe(true);
  expect(await notices.text()).toContain("Government Digital Service");
  expect(await notices.text()).toContain("react-dom");
});

test("the Styling tab lists a component's classes, data attributes and custom properties, and language models read the same", async ({
  page,
  open,
}) => {
  await open("button");
  await page.getByRole("tab", { name: "Styling" }).click();
  const styling = page.getByRole("tabpanel", { name: "Styling" });
  await expect(styling.getByRole("heading", { name: "Classes" })).toBeVisible();
  await expect(styling).toContainText(".x-govuk-ui-button--{variant}");
  await expect(styling).toContainText("data-loading");
  await expect(styling).toContainText("--x-govuk-ui-button-fill");
  // The tab stays as chosen from one component to the next, and shows the next one's.
  await page.locator('.workbench-sidebar a[href="/workbench/link"]').click();
  await expect(styling).toContainText(".x-govuk-ui-link");
  await expect(styling).not.toContainText(".x-govuk-ui-button--{variant}");
  // Language models read each component's page as Markdown, listed in /llms.txt.
  expect(await (await page.request.get("/llms.txt")).text()).toContain("(/llms/button.md)");
  const markdown = await page.request.get("/llms/button.md");
  expect(markdown.headers()["content-type"]).toContain("text/markdown");
  expect(await markdown.text()).toContain("`data-loading`");
  expect((await page.request.get("/llms/not-a-component.md")).status()).toBe(404);
  expect((await page.request.get("/styling/not-a-component.json")).status()).toBe(404);
});

test("the usage code can be loaded again when it failed to come", async ({ page, open }) => {
  let fail = true;
  await page.route("**/source/**", (route) => (fail ? route.abort() : route.continue()));
  await open("tag");
  await expect(page.getByText("The usage code could not be loaded")).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".code-panel")).toContainText('from "x-govuk-ui"');
});

test("the usage code's skeleton shows only when the code is slow to come", async ({
  page,
  open,
}) => {
  let delay = 0;
  await page.route("**/source/**", async (route) => {
    await new Promise((done) => setTimeout(done, delay));
    await route.continue();
  });
  await open("tag");
  await expect(page.locator(".code-panel")).toContainText('from "x-govuk-ui"');
  // A quick load keeps the last code until the new code arrives, with no skeleton between.
  const skeleton = page.locator(".source-skeleton");
  let flashed = false;
  await page.exposeFunction("sawSkeleton", () => {
    flashed = true;
  });
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.querySelector(".source-skeleton"))
        (window as unknown as { sawSkeleton: () => void }).sawSkeleton();
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: /^Next: / }).click();
  await expect(page.locator(".code-panel")).toContainText("Progress");
  expect(flashed).toBe(false);
  // A slow one shows the skeleton once it has waited a moment.
  delay = 1500;
  await page.getByRole("button", { name: /^Next: / }).click();
  await expect(skeleton).toBeVisible();
  await expect(skeleton).toHaveCount(0, { timeout: 5000 });
});

test("the phone preview shows the example in a frame as wide as a phone, which follows the playground and resizes from its edge", async ({
  page,
  open,
}) => {
  await open("button");
  const toggle = page.getByRole("button", { name: "Phone preview" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  // The frame loads as the pointer reaches the button, and shows only once it has drawn the
  // example, so the preview is never blank between the two.
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const frame = page.locator("#phone-preview");
  const phone = page.frameLocator("#phone-preview");
  await expect(page.locator(".preview-phone")).not.toHaveAttribute("data-waiting");
  expect(
    await frame.evaluate((element: HTMLIFrameElement) =>
      Boolean(element.contentDocument?.querySelector(".preview-stage > *")),
    ),
  ).toBe(true);
  await expect(page.locator(".preview-phone-width")).toHaveText("375 px");
  expect(Math.round((await frame.boundingBox())!.width)).toBe(375);
  // The frame is a page of its own, so the window the example sees is the phone's. The button
  // takes the full width, as GOV.UK's do on a phone.
  const button = phone.getByRole("button", { name: "Save and continue" });
  await expect(button).toBeVisible();
  expect((await button.boundingBox())!.width).toBeGreaterThan(300);
  // It follows the playground and the theme.
  await page.getByRole("textbox", { name: "children", exact: true }).fill("Continue to payment");
  await expect(phone.getByRole("button", { name: "Continue to payment" })).toBeVisible();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect
    .poll(() =>
      frame.evaluate(
        (element: HTMLIFrameElement) => element.contentDocument?.documentElement.dataset.theme,
      ),
    )
    .toBe("dark");
  // Its edge widens it with the keys, as far as the preview allows. A double-click returns it to a
  // phone's width.
  const edge = page.getByRole("separator", { name: "Resize the phone preview" });
  await edge.focus();
  await page.keyboard.press("ArrowRight");
  await expect(edge).toHaveAttribute("aria-valuenow", "385");
  await expect.poll(async () => Math.round((await frame.boundingBox())!.width)).toBe(385);
  await page.keyboard.press("End");
  await expect
    .poll(async () => Number(await edge.getAttribute("aria-valuenow")))
    .toBeGreaterThan(641);
  // Wider than a phone, the button fits its text again.
  await expect
    .poll(
      async () =>
        (await phone.getByRole("button", { name: "Continue to payment" }).boundingBox())!.width,
    )
    .toBeLessThan(300);
  await edge.dblclick();
  await expect(edge).toHaveAttribute("aria-valuenow", "375");
  // Off, the example is back in the page, and the frame waits out of sight with nothing in it.
  await frame.evaluate((element: HTMLIFrameElement) =>
    Object.assign(element.contentWindow!, { kept: true }),
  );
  await toggle.click();
  await expect(
    page.locator(".preview-frame").getByRole("button", { name: "Continue to payment" }),
  ).toBeVisible();
  await expect(page.locator(".preview-phone")).toHaveAttribute("data-waiting");
  await expect(phone.locator(".preview-stage")).toHaveCount(0);
  // On again, and on to the next component, it is the same page, told what to show next.
  await toggle.click();
  await expect(phone.getByRole("button", { name: "Continue to payment" })).toBeVisible();
  await page.getByRole("button", { name: /^Next: / }).click();
  await expect(page).toHaveURL(/\/workbench\/link$/);
  await expect(phone.locator(".preview-stage")).toHaveAttribute("data-component", "link");
  expect(
    await frame.evaluate(
      (element: HTMLIFrameElement) => (element.contentWindow as unknown as { kept?: boolean }).kept,
    ),
  ).toBe(true);
});
