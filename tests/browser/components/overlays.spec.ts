import { expect, test } from "../fixtures";

test("a dialog starts on its safe choice, closes with Escape and returns focus", async ({
  page,
  frame,
  open,
}) => {
  await open("dialog");
  const trigger = frame.getByRole("button", { name: "Delete draft" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Delete this draft?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  // A service can give it more space.
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--x-govuk-ui-dialog-width", "640px"),
  );
  await expect(dialog).toHaveCSS("width", "640px");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Delete draft" }).click();
  await expect(frame.getByRole("status")).toHaveText("Your draft has been deleted.");
});

test("a hover card opens on hover and on keyboard focus", async ({ page, frame, open }) => {
  await open("hover-card");
  const link = frame.getByRole("link", { name: "Winston Churchill" });
  const card = page.locator(".x-govuk-ui-hover-card");
  await link.hover();
  await expect(card).toContainText("Caseworker, Licensing team");
  await page.mouse.move(5, 5);
  await expect(card).toHaveCount(0);
  await link.focus();
  await expect(card).toBeVisible();
});

test("a dropdown menu runs actions from its items and submenus", async ({ page, frame, open }) => {
  await open("dropdown-menu");
  await frame.getByRole("button", { name: "Application actions" }).click();
  await page.getByRole("menuitemcheckbox", { name: "Email me about changes" }).click();
  await expect(
    page.getByRole("menuitemcheckbox", { name: "Email me about changes" }),
  ).toHaveAttribute("aria-checked", "false");
  await page.getByRole("menuitem", { name: "Download" }).hover();
  await page.getByRole("menuitem", { name: "Spreadsheet (CSV)" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(frame.getByRole("status")).toHaveText("You chose Download as a spreadsheet.");
});

test("a context menu opens where pressed", async ({ page, frame, open }) => {
  await open("context-menu");
  await frame.getByText("floor-plan.pdf").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await expect(frame.getByRole("status")).toHaveText("You chose Remove floor-plan.pdf.");
});

test("a callout finds clear space, help opens from its question mark, and a notice is read out without taking focus", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("callout");
  // The notice appears by itself, is read out, and leaves focus where it was.
  const notice = page.getByRole("dialog", { name: "New: download your answers" });
  await expect(notice).toBeVisible();
  await expect(frame.getByRole("status")).toContainText("Keep a copy of everything");
  expect(await notice.evaluate((card) => card.contains(document.activeElement))).toBe(false);
  // It takes a side where it covers none of the question, its help or the buttons.
  const help = frame.getByRole("button", { name: "Help with your reference number" });
  await expect
    .poll(async () => {
      const card = (await notice.boundingBox())!;
      const covered = await Promise.all(
        [
          help,
          frame.locator("#callout-reference"),
          frame.getByRole("button", { name: "Continue" }),
        ].map(async (control) => {
          const box = (await control.boundingBox())!;
          return (
            box.x < card.x + card.width &&
            card.x < box.x + box.width &&
            box.y < card.y + card.height &&
            card.y < box.y + box.height
          );
        }),
      );
      return covered.some(Boolean);
    })
    .toBe(false);
  // A press elsewhere leaves it open, and Got it closes it.
  await frame.locator("#callout-reference").click();
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "Got it" }).click();
  await expect(notice).toBeHidden();
  await expect(frame.getByRole("button", { name: "Show the notice again" })).toBeEnabled();
  // Help opens from its question mark and takes focus, and Escape returns focus.
  await help.click();
  const card = page.getByRole("dialog", { name: "Your reference number" });
  await expect(card).toBeVisible();
  await expect(card.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
  await expect(help).toBeFocused();
  // Brand blue by default, or plain on the page's own colours.
  await expect(notice).toHaveCount(0);
  await playground.set("variant", "Plain");
  await help.click();
  await expect(card).toHaveAttribute("data-variant", "plain");
  // With a timeout, the notice closes by itself, as a toast does.
  await page.keyboard.press("Escape");
  await playground.set("timeout", 600);
  await frame.getByRole("button", { name: "Show the notice again" }).click();
  await expect(notice).toBeVisible();
  await expect(notice).toBeHidden({ timeout: 3000 });
});

test("a callout shows the time left, which stops while held, and its closing is the service's choice", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("callout");
  const notice = page.getByRole("dialog", { name: "New: download your answers" });
  // Without a timeout, there is no line, and the playground says the countdown needs one.
  await expect(notice.locator(".x-govuk-ui-countdown")).toHaveCount(0);
  const countdown = playground.switch("countdown");
  await expect(countdown).toBeDisabled();
  await playground.set("timeout", 4000);
  await expect(countdown).toBeEnabled();
  await notice.getByRole("button", { name: "Got it" }).click();
  await frame.getByRole("button", { name: "Show the notice again" }).click();
  const line = notice.locator(".x-govuk-ui-countdown");
  await expect(line).toBeVisible();
  const running = () => line.evaluate((element) => element.getAnimations()[0]?.playState ?? "none");
  await expect.poll(running).toBe("running");
  // The time stops while the pointer is on the notice.
  await notice.hover();
  await expect.poll(running).toBe("paused");
  await page.mouse.move(0, 0);
  await expect.poll(running).toBe("running");
  // The line can be turned off, and so can the close button.
  await playground.set("countdown", false);
  await expect(line).toHaveCount(0);
  await playground.set("closeButton", false);
  await expect(notice.getByRole("button", { name: "Close" })).toHaveCount(0);
  // Help can be kept open when people press outside it.
  await playground.set("closeOnPressOutside", "false: both stay");
  await frame.getByRole("button", { name: "Help with your reference number" }).click();
  const help = page.getByRole("dialog", { name: "Your reference number" });
  await expect(help).toBeVisible();
  await frame.locator("#callout-reference").click();
  await expect(help).toBeVisible();
});

test("a tour steps through its targets, and a service chooses its dimming, memory, resuming, closing and welcome", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("tour");
  const start = frame.getByRole("button", { name: "Take the tour" });
  await start.click();
  const card = page.locator(".x-govuk-ui-tour");
  const next = card.getByRole("button", { name: "Next", exact: true });
  await expect(page.getByRole("dialog", { name: "Find an application" })).toBeVisible();
  await expect(next).toBeFocused();
  await expect(card).toContainText("1 of 4");
  // Next and the arrow keys step through it, and Back appears after the first step. Focus stays on
  // Next, even as Back disappears at the first step.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Carry on where you left off" })).toBeVisible();
  await expect(card).toContainText("2 of 4");
  await page.keyboard.press("ArrowLeft");
  await expect(card).toContainText("1 of 4");
  await expect(card.getByRole("button", { name: "Back" })).toHaveCount(0);
  await expect(next).toBeFocused();
  for (let step = 0; step < 3; step++) await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Get help" })).toBeVisible();
  // Done ends it, and focus goes back to where the tour began.
  await card.getByRole("button", { name: "Done" }).click();
  await expect(card).toHaveCount(0);
  await expect(start).toBeFocused();
  await expect(page.locator(".x-govuk-ui-tour-spotlight")).toHaveCount(0);

  // Dimmed, the page has a gap around each step's target.
  await playground.set("dim", true);
  await start.click();
  const gap = page.locator(".x-govuk-ui-tour-spotlight");
  await expect(gap).toBeVisible();
  await expect
    .poll(async () => {
      const [around, target] = await Promise.all([
        gap.boundingBox(),
        frame.locator(".preview-tour-search").boundingBox(),
      ]);
      return (
        Math.abs(around!.x + 6 - target!.x) < 1.5 &&
        Math.abs(around!.y + 6 - target!.y) < 1.5 &&
        Math.abs(around!.width - 12 - target!.width) < 1.5
      );
    })
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(gap).toHaveCount(0);

  // Remembered, it continues from the step where someone closed it, and closing ends it.
  await playground.set("remember", true);
  await start.click();
  await card.getByRole("button", { name: "Next", exact: true }).click();
  await expect(card).toContainText("2 of 4");
  await card.getByRole("button", { name: "Close the tour" }).click();
  await expect(card).toHaveCount(0);
  const stored = () => page.evaluate(() => localStorage.getItem("x-govuk-ui-example-tour"));
  expect(await stored()).toBe('{"step":1,"ended":"closed"}');
  await start.click();
  const welcomeBack = page.getByRole("dialog", { name: "Carry on where you left off" });
  await expect(welcomeBack).toBeVisible();
  // Set to pause, closing keeps their place without ending it.
  await page.keyboard.press("Escape");
  await expect(welcomeBack).toHaveCount(0);
  await playground.set("closing", "Pauses the tour");
  await start.click();
  await page.keyboard.press("Escape");
  expect(await stored()).toBe('{"step":1,"ended":null}');
  // Without resuming, it starts again from the first step.
  await playground.set("resume", false);
  await start.click();
  await expect(page.getByRole("dialog", { name: "Find an application" })).toBeVisible();
  await page.keyboard.press("Escape");

  // A welcome, with no target, sits in the middle of the screen, with no arrow.
  await playground.set("welcome", true);
  await start.click();
  await expect(page.getByRole("dialog", { name: "Welcome to your applications" })).toBeVisible();
  await expect(card).toContainText("1 of 5");
  await expect(card.locator(".x-govuk-ui-floating-arrow")).toHaveCount(0);
  await expect
    .poll(async () => {
      const box = (await card.boundingBox())!;
      const view = page.viewportSize()!;
      return Math.round(
        Math.abs(box.x + box.width / 2 - view.width / 2) +
          Math.abs(box.y + box.height / 2 - view.height / 2),
      );
    })
    .toBeLessThan(3);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Find an application" })).toBeVisible();
});

test("an overlay opened during a tour covers its step, as the one opened last is on top", async ({
  page,
  frame,
  open,
}) => {
  await open("tour");
  await frame.getByRole("button", { name: "Take the tour" }).click();
  const step = page.getByRole("dialog", { name: "Find an application" });
  await expect(step).toBeVisible();
  // What is on top at the step's middle, which is the step, until the command menu opens over it.
  const above = () =>
    step.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return element.contains(top)
        ? "step"
        : (top?.closest("[class*=x-govuk-ui-command]")?.className ?? "other");
    });
  expect(await above()).toBe("step");
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByPlaceholder("Search components and actions…")).toBeFocused();
  await expect.poll(above).toMatch(/x-govuk-ui-command/);
});

test("a tour set to close on a press outside closes on the first one, and not when focus moves on", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("tour");
  await playground.set("closeOnPressOutside", true);
  await frame.getByRole("button", { name: "Take the tour" }).click();
  const tour = page.locator(".x-govuk-ui-tour");
  await expect(tour).toBeVisible();
  await frame.getByRole("heading", { name: "Your applications" }).click();
  await expect(tour).toHaveCount(0);
});

test("a sheet holds a draft of its filters, which Apply keeps and Cancel throws away", async ({
  page,
  frame,
  open,
}) => {
  await open("sheet");
  const trigger = frame.getByRole("button", { name: "Filter licences" });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Filter licences" });
  await expect(sheet).toBeVisible();
  // A service can give a sheet at the side more space.
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--x-govuk-ui-sheet-width", "420px"),
  );
  await expect(sheet).toHaveCSS("width", "420px");
  await sheet.getByRole("checkbox", { name: "Premises licence" }).check();
  await sheet.getByRole("button", { name: "Apply filters" }).click();
  await expect(sheet).toBeHidden();
  await expect(frame.getByRole("status")).toHaveText("Showing 1 of 4 licence types.");
  await expect(trigger).toBeFocused();
  // Cancelled changes are not kept. The sheet reopens with what was applied.
  await trigger.click();
  await expect(sheet.getByRole("checkbox", { name: "Premises licence" })).toBeChecked();
  await sheet.getByRole("checkbox", { name: "Premises licence" }).uncheck();
  await sheet.getByRole("button", { name: "Cancel" }).click();
  await expect(sheet).toBeHidden();
  await expect(frame.getByRole("status")).toHaveText("Showing 1 of 4 licence types.");
  await trigger.click();
  await expect(sheet.getByRole("checkbox", { name: "Premises licence" })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});

test("a popover opens from its link, closes from Got it or Escape, and gives focus back", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("popover");
  const trigger = frame.getByRole("button", { name: "Where do I find my reference number?" });
  await trigger.click();
  const popover = page.getByRole("dialog", { name: "Your reference number" });
  await expect(popover).toBeVisible();
  await popover.getByRole("button", { name: "Got it" }).click();
  await expect(popover).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(popover).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(popover).toBeHidden();
  // A service can add a close button in the corner.
  await expect(popover.getByRole("button", { name: "Close" })).toHaveCount(0);
  await playground.set("closeButton", true);
  await trigger.click();
  await expect(popover.getByRole("button", { name: "Close" })).toBeVisible();
  // A service can give it more space, such as for a card of questions.
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--x-govuk-ui-popover-width", "420px"),
  );
  await expect(popover).toHaveCSS("max-width", "420px");
});

test("one tooltip names each button in turn, under the pointer or with focus, with its shortcut", async ({
  page,
  frame,
  open,
}) => {
  await open("tooltip");
  // Base UI's tooltip is a visual hint with no role, so each button has its own name.
  const tooltip = page.locator(".x-govuk-ui-tooltip");
  await frame.getByRole("button", { name: "Print this page" }).hover();
  await expect(tooltip).toContainText("Print this page");
  await expect(tooltip).toContainText(/⌘\s*P/);
  // In a group, the one tooltip moves to the next button instead of a second one opening.
  await frame.getByRole("button", { name: "Download as a PDF" }).hover();
  await expect(tooltip).toContainText("Download as a PDF");
  await expect(tooltip).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  await frame.getByRole("button", { name: "Share by email" }).focus();
  await expect(tooltip).toContainText("Share by email");
});
