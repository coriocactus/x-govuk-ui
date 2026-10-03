import { expect, test } from "../fixtures";

test("a page's skip link comes first and goes to the main content, which lines up with the logo", async ({
  page,
  frame,
  open,
  browserName,
}) => {
  await open("page");
  await page.locator(".preview-stage").focus();
  // Safari's Tab skips links unless "Press Tab to highlight each item" is on. Option-Tab does not.
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skip = frame.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("main")).toBeFocused();
  // The content lines up with the header's logo, and the footer closes the page. In the workbench,
  // the page sits inside the workbench's own main, so its footer is not the page's contentinfo.
  const logo = await frame.getByRole("link", { name: "GOV.UK" }).boundingBox();
  const heading = await frame.getByRole("heading", { level: 1 }).boundingBox();
  expect(Math.abs((logo?.x ?? 0) - (heading?.x ?? 1))).toBeLessThan(1);
  await expect(frame.locator("footer")).toContainText("© Crown copyright");
});

test("the cookie banner confirms and hides", async ({ frame, open }) => {
  await open("cookie-banner");
  // The example offers the banner again only once people have chosen.
  await expect(frame.getByRole("button", { name: "Show the banner again" })).toHaveCount(0);
  await frame.getByRole("button", { name: "Reject analytics cookies" }).click();
  const confirmation = frame.getByRole("alert");
  await expect(confirmation).toContainText("You've rejected analytics cookies.");
  await expect(confirmation).toBeFocused();
  await frame.getByRole("button", { name: "Hide cookie message" }).click();
  await expect(frame.getByRole("region", { name: "Cookies on Apply for a licence" })).toHaveCount(
    0,
  );
});

test("feedback folds into its form and into thanks, Cancel brings the question back, and on a phone the report button goes beneath", async ({
  page,
  frame,
  open,
}) => {
  await open("feedback");
  // Once answered, the question gives way to the form, and Cancel brings it back.
  const notUseful = frame.getByRole("button", { name: "No this page is not useful" });
  await notUseful.click();
  await expect(frame.getByRole("textbox", { name: "What were you doing?" })).toBeFocused();
  await expect(frame.getByText("Is this page useful?")).toHaveCount(0);
  await frame.getByRole("button", { name: "Cancel" }).click();
  await expect(notUseful).toBeFocused();
  await notUseful.click();
  await expect(frame.getByRole("textbox", { name: "What were you doing?" })).toBeFocused();
  // The form keeps to a readable measure, as GOV.UK's does, however wide its band.
  expect(
    (await frame.getByRole("textbox", { name: "What were you doing?" }).boundingBox())!.width,
  ).toBeLessThanOrEqual(640);
  await frame.getByRole("textbox", { name: "What went wrong?" }).fill("The fee was missing");
  await frame.getByRole("button", { name: "Send" }).click();
  await expect(frame.getByText("Thank you for your feedback")).toBeFocused();
  await frame.getByRole("button", { name: "Ask again" }).click();
  await expect(frame.getByRole("button", { name: "Yes this page is useful" })).toBeVisible();
  // On a phone, as GOV.UK's does, Yes and No sit on one row, with the report button across the band
  // beneath them.
  await page.setViewportSize({ width: 375, height: 800 });
  const yes = frame.getByRole("button", { name: "Yes this page is useful" });
  const no = frame.getByRole("button", { name: "No this page is not useful" });
  const report = frame.getByRole("button", { name: "Report a problem with this page" });
  await expect
    .poll(async () => {
      const [a, b, r, band] = await Promise.all([
        yes.boundingBox(),
        no.boundingBox(),
        report.boundingBox(),
        frame.locator(".x-govuk-ui-feedback-row").boundingBox(),
      ]);
      return Math.abs(a!.y - b!.y) < 1 && r!.y > a!.y + a!.height && r!.width > band!.width - 40;
    })
    .toBe(true);
  // Its form's buttons take the form's width, one above the other, as GOV.UK's do.
  await no.click();
  const field = frame.getByRole("textbox", { name: "What were you doing?" });
  await expect(field).toBeFocused();
  const across = (await field.boundingBox())!.width;
  for (const name of ["Send", "Cancel"]) {
    expect((await frame.getByRole("button", { name }).boundingBox())!.width).toBeCloseTo(across, 0);
  }
});
