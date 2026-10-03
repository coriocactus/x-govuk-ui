import { expect, test } from "../fixtures";

test("a success banner is an alert, and takes focus only with autoFocus", async ({
  frame,
  open,
  playground,
}) => {
  await open("notification-banner");
  await playground.set("type", "Success");
  // A success banner is an alert. Changing the type in the playground leaves focus where it was.
  const success = frame.getByRole("alert");
  await expect(success).toContainText("Your application has been sent");
  await expect(success).not.toBeFocused();
  // With autoFocus, it takes focus as it appears.
  await playground.set("autoFocus", true);
  await expect(success).toBeFocused();
});

test("a toast that times out shows its line, which stops while the stack is held", async ({
  page,
  frame,
  open,
}) => {
  await open("toast");
  await frame.getByRole("button", { name: "Message" }).first().click();
  const toastLine = page.locator(".x-govuk-ui-toast .x-govuk-ui-countdown").first();
  await expect(toastLine).toBeVisible();
  await page.locator(".x-govuk-ui-toast").first().hover();
  await expect
    .poll(() => toastLine.evaluate((element) => element.getAnimations()[0]?.playState))
    .toBe("paused");
});

test("progress completes in green", async ({ frame, open }) => {
  await open("progress");
  await frame.getByRole("button", { name: "Upload" }).click();
  const bar = frame.getByRole("progressbar", { name: "Uploading floor-plan.pdf" });
  await expect(bar).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
  await expect(frame.locator(".x-govuk-ui-progress")).toHaveAttribute("data-success", "true");
});
