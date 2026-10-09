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

test("rich text shows a document from its HTML, or from its Markdown", async ({
  frame,
  open,
  playground,
}) => {
  await open("rich-text");
  const heading = frame.getByRole("heading", { name: "Who can apply" });
  await expect(heading).toBeVisible();
  // The playground lets only the source the example gives be changed.
  await expect(playground.text("markdown")).toBeDisabled();
  await playground.set("format", "Markdown");
  await expect(playground.text("html")).toBeDisabled();
  // The Markdown makes the same document.
  await expect(heading).toBeVisible();
  await expect(frame.getByRole("listitem")).toHaveText([
    "salmon and sea trout, or",
    "trout, coarse fish and eels",
  ]);
  await expect(frame.getByRole("link", { name: "byelaws for your region" })).toHaveAttribute(
    "href",
    "https://www.gov.uk/",
  );
  await playground.text("markdown").fill("## Before you fish\n\nCheck the **byelaws**.");
  await expect(frame.getByRole("heading", { name: "Before you fish" })).toBeVisible();
  await expect(frame.locator("strong")).toHaveText("byelaws");
});
