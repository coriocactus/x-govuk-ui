import type { Locator } from "@playwright/test";
import { expect, middleOf, test } from "../fixtures";

test("a conversation reply works through its steps, streams, cites and can be stopped", async ({
  page,
  frame,
  open,
}) => {
  await open("conversation");
  const message = frame.getByRole("textbox", { name: "Message" });
  // Before anything is said, a tip suggests sending something, and the composer waits in the
  // middle of the empty log.
  const tip = page.getByRole("dialog", { name: "Try it" });
  await expect(tip).toBeVisible();
  const composer = frame.locator(".x-govuk-ui-chat-input");
  const conversation = frame.locator(".x-govuk-ui-conversation");
  await expect(frame.locator(".x-govuk-ui-message")).toHaveCount(0);
  expect(Math.abs((await middleOf(composer)) - (await middleOf(conversation)))).toBeLessThan(2);
  // A file attaches as a chip, which can be removed, and is sent with the message.
  const file = { name: "passport.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(1024) };
  await frame.locator('.x-govuk-ui-chat-input input[type="file"]').setInputFiles([file]);
  await frame.getByRole("button", { name: "Remove passport.pdf" }).click();
  await expect(frame.getByRole("list", { name: "Attached files" })).toHaveCount(0);
  await expect(message).toBeFocused();
  await frame.locator('.x-govuk-ui-chat-input input[type="file"]').setInputFiles([file]);
  await expect(frame.getByRole("list", { name: "Attached files" })).toContainText("passport.pdf");
  // Shift with Enter starts a new line, and Enter sends.
  await message.fill("Hello");
  await message.press("Shift+Enter");
  await expect(message).toHaveValue("Hello\n");
  await message.fill("How do I renew my passport?");
  await message.press("Enter");
  await expect(message).toHaveValue("");
  await expect(tip).toHaveCount(0);
  await expect(frame.getByRole("button", { name: "Stop the reply" })).toBeVisible();
  await expect(frame.getByText("Checking GOV.UK guidance")).toBeVisible();
  await expect(frame.getByRole("button", { name: "Checked 3 pages" })).toBeVisible({
    timeout: 8000,
  });
  const citation = frame.getByRole("button", { name: "Sources: GOV.UK and 1 more" });
  await expect(citation).toBeVisible({ timeout: 8000 });
  await expect(frame.getByRole("button", { name: "Send" })).toBeVisible();
  await expect(frame.getByRole("log")).toContainText("nothing was sent to a service");
  await expect(frame.getByRole("log")).toContainText("Attached passport.pdf");
  await expect(frame.getByRole("list", { name: "Attached files" })).toHaveCount(0);
  // Once a message is sent, the composer has glided down to the foot of the log.
  const foot = async () => {
    const [box, log] = await Promise.all([composer.boundingBox(), conversation.boundingBox()]);
    return Math.round(log!.y + log!.height - (box!.y + box!.height));
  };
  await expect.poll(foot).toBeLessThan(30);
  // A reply can be rated, and requested again, which writes it out again.
  const helpful = frame.getByRole("button", { name: "Helpful", exact: true });
  await helpful.click();
  await expect(helpful).toHaveAttribute("aria-pressed", "true");
  await frame.getByRole("button", { name: "Try again" }).click();
  await expect(frame.locator(".x-govuk-ui-streaming-caret")).toHaveCount(1);
  await expect(frame.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 10000 });

  // Stopping during the steps leaves the reply unwritten.
  await message.fill("And a photo?");
  await message.press("Enter");
  await frame.getByRole("button", { name: "Stop the reply" }).click();
  await expect(frame.getByText("You stopped this reply.")).toBeVisible();
  await expect(frame.getByRole("button", { name: "Send" })).toBeVisible();
});

test("an empty conversation's start sits above the composer at its foot, and goes as the first message is sent", async ({
  frame,
  open,
  playground,
}) => {
  await open("conversation");
  await playground.set("start", true);
  const start = frame.locator(".x-govuk-ui-message-scroller-empty");
  await expect(start.getByText("Explain a letter")).toBeVisible();
  const composer = frame.locator(".x-govuk-ui-chat-input");
  const conversation = frame.locator(".x-govuk-ui-conversation");
  // The composer waits at the foot of the log, beneath the start, instead of in its middle.
  await expect
    .poll(async () => {
      const [input, log, offer] = await Promise.all([
        composer.boundingBox(),
        conversation.boundingBox(),
        start.boundingBox(),
      ]);
      return {
        foot: log!.y + log!.height - (input!.y + input!.height) < 40,
        above: offer!.y + offer!.height <= input!.y + 1,
      };
    })
    .toEqual({ foot: true, above: true });
  const message = frame.getByRole("textbox", { name: "Message" });
  await message.fill("Hello");
  await message.press("Enter");
  await expect(start).toHaveCount(0);
});

test("a reply streamed as Markdown is hidden from screen readers until it is done, then added whole", async ({
  frame,
  open,
  playground,
}) => {
  await open("conversation");
  await playground.set("markdown", true);
  await playground.set("reasoning", false);
  const message = frame.getByRole("textbox", { name: "Message" });
  await message.fill("Can I renew online?");
  await message.press("Enter");
  const log = frame.getByRole("log");
  const reply = frame.locator('.x-govuk-ui-message[data-role="assistant"]');
  const content = reply.locator(".x-govuk-ui-message-content");
  // While it streams, the log and the reply are busy, and screen readers do not hear the reply.
  await expect(reply).toHaveAttribute("aria-busy", "true");
  await expect(log).toHaveAttribute("aria-busy", "true");
  await expect(content).toHaveAttribute("aria-hidden", "true");
  // Once it is done, the whole reply is added for them, with its link as the library's Link.
  await expect(reply).not.toHaveAttribute("aria-busy");
  await expect(log).not.toHaveAttribute("aria-busy");
  await expect(content).not.toHaveAttribute("aria-hidden");
  await expect(content.getByRole("link", { name: "GOV.UK Design System" })).toHaveClass(
    /x-govuk-ui-link/,
  );
});

test("a composer that grows and shrinks by a fraction of a pixel never sets the log's observers looping", async ({
  frame,
  open,
}) => {
  await open("conversation");
  // A message longer than the log, so the log follows its end beneath the composer.
  const message = frame.getByRole("textbox", { name: "Message" });
  await message.fill("How do I renew my passport? ".repeat(60));
  await message.press("Enter");
  await expect(frame.locator('.x-govuk-ui-message[data-role="user"]')).toHaveCount(1);
  // A button a fraction of a pixel taller than the bar's own appears and disappears in it, as a
  // menu's trigger can in a service. The composer's height then changes by fractions, frame after
  // frame.
  const loops = await frame.evaluate(async (preview) => {
    const seen: string[] = [];
    addEventListener("error", (event) => seen.push((event as ErrorEvent).message));
    const tools = preview.querySelector(".x-govuk-ui-chat-input-tools")!;
    const extra = document.createElement("button");
    extra.textContent = "Documents";
    for (let round = 0; round < 60; round++) {
      if (round % 3 === 0) extra.remove();
      else tools.append(extra);
      extra.style.height = `${32 + (round % 5) * 0.4}px`;
      await new Promise((next) => requestAnimationFrame(next));
    }
    extra.remove();
    await new Promise((next) => setTimeout(next, 300));
    return seen;
  });
  expect(loops).toEqual([]);
});

test("a conversation's focus ring goes round its log, above the composer floating over its foot", async ({
  frame,
  open,
}) => {
  await open("conversation");
  const log = frame.getByRole("log");
  await log.focus();
  const layers = await frame.locator(".x-govuk-ui-message-scroller").evaluate((scroller) => {
    const ring = getComputedStyle(scroller, "::after");
    const footer = scroller.querySelector(".x-govuk-ui-message-scroller-footer")!;
    return {
      ring: ring.outlineStyle,
      above: Number(ring.zIndex) > Number(getComputedStyle(footer).zIndex),
      through: ring.pointerEvents,
    };
  });
  expect(layers).toEqual({ ring: "solid", above: true, through: "none" });
});

test("a bubble is as wide as its longest line", async ({ page, frame, open }) => {
  await open("conversation");
  await frame
    .getByRole("textbox")
    .first()
    .fill(
      "Can I renew my passport online if it expired more than five years ago, and do I need a new photo?",
    );
  await page.keyboard.press("Enter");
  const bubble = frame
    .locator('.x-govuk-ui-message[data-role="user"] .x-govuk-ui-message-content')
    .last();
  await expect(bubble).toHaveAttribute("style", /width/);
  // The bubble leaves no more than a few pixels beside its longest line, and breaks its lines just
  // where it would at its widest. Browsers differ in whether a space at a line's end counts. It is
  // measured in layout pixels, because the message grows in from a smaller scale. In a fresh WebKit
  // on Linux, it can start a moment late, while the line's box on screen is still scaled.
  const fit = await bubble.evaluate((element: HTMLElement) => {
    const scale = element.getBoundingClientRect().width / element.offsetWidth;
    const lines = () => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = [...range.getClientRects()];
      return { count: new Set(rects.map((line) => Math.round(line.top))).size, rects };
    };
    const shrunk = lines();
    const widest = Math.max(...shrunk.rects.map((line) => line.width)) / scale;
    const style = getComputedStyle(element);
    const inner =
      element.offsetWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight);
    const width = element.style.width;
    element.style.width = "";
    const full = lines();
    element.style.width = width;
    return { gap: Math.abs(inner - widest), same: shrunk.count === full.count };
  });
  expect(fit.same).toBe(true);
  expect(fit.gap).toBeLessThan(6);
});

test("a message scroller anchors turns, loads earlier messages in place, and folds away", async ({
  page,
  frame,
  open,
}) => {
  await open("message-scroller");
  const log = frame.getByRole("log", { name: "Messages with the Passport Office" });
  const viewport = frame.locator(".x-govuk-ui-message-scroller .x-govuk-ui-scroll-area-viewport");
  // It starts folded, with a tip by its one-row message box, which disappears once it is opened.
  const tip = page.getByRole("dialog", { name: "Try it" });
  await expect(tip).toBeVisible();
  await expect(log).toBeHidden();
  await frame.getByRole("button", { name: /messages$/ }).click();
  await expect(tip).toHaveCount(0);
  await expect(log).toContainText("Keep it until then.");
  // A chosen question rises to near the top, with 64 pixels of the last reply peeking above it.
  await frame.getByRole("button", { name: "When will my new passport arrive?" }).click();
  const question = frame.locator('[data-message-id="q0"]');
  const peek = async () => {
    const [row, view] = await Promise.all([question.boundingBox(), viewport.boundingBox()]);
    return Math.round(row!.y - view!.y);
  };
  await expect.poll(async () => Math.abs((await peek()) - 64)).toBeLessThan(3);
  // The reply streams into the space below. The question stays where it is while the reply fits.
  // Once the reply fills the log, the log follows it, so the question only ever moves up. The
  // words still to come are already in the log, unseen, so the reply has arrived when no caret is
  // left.
  const before = await peek();
  await expect(log).toContainText("arrange another delivery");
  await expect(log.locator(".x-govuk-ui-streaming-caret")).toHaveCount(0, { timeout: 10000 });
  expect(await peek()).toBeLessThanOrEqual(before + 1);
  // The pinned question is among the earlier messages, which load above without moving the
  // reader, and it glows once the log reaches it.
  await frame.getByRole("button", { name: /Pinned/ }).click();
  const found = frame.locator('[data-message-id="e3"]');
  await expect(found).toHaveAttribute("data-found", "");
  await expect(found).toBeInViewport();
  // The reply to a question asked here can be requested again. An earlier reply's Try again
  // refuses the press, shaking its head, and leaves the reply unchanged.
  const retries = frame.getByRole("button", { name: "Try again" });
  await expect(retries.last()).not.toHaveAttribute("aria-disabled");
  const earlier = frame
    .locator('[data-message-id="e4"]')
    .getByRole("button", { name: "Try again" });
  await expect(earlier).toHaveAttribute("aria-disabled", "true");
  // Playwright will not press an unavailable button, so it presses with force, as a person can.
  await earlier.click({ force: true });
  await expect(
    frame.locator('[data-message-id="e4"] .x-govuk-ui-message-retry-icon'),
  ).toHaveAttribute("data-refused", "true");
  await expect(frame.locator('[data-message-id="e4"] .x-govuk-ui-streaming-caret')).toHaveCount(0);
  // The chat folds down into its message box, and the line above it, which takes focus, opens it
  // again where the reader was.
  await frame.getByRole("button", { name: "Fold the chat away" }).click();
  await expect(log).toBeHidden();
  const unfold = frame.getByRole("button", { name: /messages$/ });
  await expect(unfold).toBeFocused();
  await unfold.click();
  await expect(log).toBeVisible();
  // Sending from the folded chat opens it, to show the answer.
  await frame.getByRole("button", { name: "Fold the chat away" }).click();
  await frame.getByRole("textbox", { name: "Message the Passport Office" }).fill("Thank you");
  await page.keyboard.press("Enter");
  await expect(log).toBeVisible();
});

test("bubbles take reactions when held, and a failed message sends again", async ({
  page,
  frame,
  open,
}) => {
  await open("bubble");
  // Holding a message opens the reactions, and choosing one pops it onto the message.
  const message = frame.getByText("We will write to you within 3 weeks.");
  const box = (await message.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await expect(page.getByRole("menuitemcheckbox", { name: "heart" })).toBeVisible();
  await page.mouse.up();
  await page.getByRole("menuitemcheckbox", { name: "heart" }).click();
  await expect(page.getByRole("menuitemcheckbox")).toHaveCount(0);
  await expect(frame.getByRole("img", { name: "Reactions: heart" })).toBeVisible();
  // Keyboard users reach the reactions by a button after the message.
  await frame.getByRole("button", { name: "React to this message" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitemcheckbox", { name: "thumbs up" })).toBeVisible();
  await page.keyboard.press("Escape");
  // The message that failed sends again when pressed, focus moves to its status, and it can then
  // take reactions too.
  await frame.getByRole("button", { name: "Here is my boarding pass." }).click();
  await expect(frame.getByRole("status")).toHaveText("Delivered");
  await expect(frame.getByRole("status")).toBeFocused();
  await expect(frame.getByRole("button", { name: "React to this message" })).toHaveCount(6);
});

test("streaming text keeps its height as it arrives", async ({ frame, open }) => {
  await open("streaming-text");
  const text = frame.locator(".preview-streaming-text");
  const start = (await text.boundingBox())!.height;
  await expect(frame.getByRole("button", { name: "Replay" })).toHaveAttribute("data-shown", "true");
  expect((await text.boundingBox())!.height).toBe(start);
});

test("reasoning steps open while active, fold away after without moving, and replay", async ({
  frame,
  open,
}) => {
  await open("reasoning-steps");
  // The example runs its steps open, folds them away once done, and replays.
  const replay = frame.getByRole("button", { name: "Replay" });
  await expect(frame.getByText("In progress:", { exact: false })).toBeAttached();
  await expect(frame.getByRole("button", { name: "Checking GOV.UK" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  // Replay shows only once the steps are done.
  await expect(replay).toBeHidden();
  const top = async () =>
    (await frame.locator(".x-govuk-ui-reasoning-trigger").last().boundingBox())!.y;
  const running = await top();
  await expect(frame.getByRole("button", { name: "Checked 3 pages" })).toHaveAttribute(
    "aria-expanded",
    "false",
    { timeout: 10000 },
  );
  // The steps fold away without the example moving. Layout can land a fraction of a pixel off.
  expect(Math.abs((await top()) - running)).toBeLessThan(1);
  await replay.click();
  await expect(replay).toBeHidden();
  await expect(frame.getByRole("button", { name: "Checking GOV.UK" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

test("a citation stack opens from the keyboard, takes focus, and steps through its sources", async ({
  page,
  frame,
  open,
}) => {
  await open("inline-citation");
  const stack = frame.getByRole("button", { name: "Sources: GOV.UK and 2 more" });
  await stack.focus();
  await page.keyboard.press("Enter");
  const card = page.getByRole("dialog", { name: "Sources" });
  await expect(card.getByRole("link", { name: "Get a passport photo" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Previous source" })).toBeFocused();
  await card.getByRole("button", { name: "Next source" }).click();
  await expect(card.getByRole("link", { name: "Passport photo checker" })).toBeVisible();
  await expect(card.locator(".x-govuk-ui-citation-count")).toHaveText("Source 2/ of 3");
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();
  await expect(stack).toBeFocused();
});

test("a citation of a document with no address names where it is, and its title is no link", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("inline-citation");
  await playground.set("document", true);
  await frame.getByRole("button", { name: "Source: Your documents" }).click();
  const card = page.getByRole("dialog", { name: "Source" });
  await expect(card.getByText("Your passport renewal letter")).toBeVisible();
  await expect(card.getByRole("link")).toHaveCount(0);
  await expect(card.locator(".x-govuk-ui-citation-detail")).toHaveText("Page 2");
});

test("a plan runs its steps without changing height", async ({ frame, open }) => {
  await open("plan-card");
  const card = frame.locator(".x-govuk-ui-plan-card");
  const height = (await card.boundingBox())!.height;
  await frame.getByRole("button", { name: "Approve" }).click();
  await expect(frame.getByRole("status")).toContainText("Running step 1 of 3");
  expect((await card.boundingBox())!.height).toBe(height);
  await expect(frame.getByText("Done", { exact: true })).toBeVisible({ timeout: 8000 });
  expect((await card.boundingBox())!.height).toBe(height);
});

test("a question card asks in turn, takes letters and dates, skips, and lets an answer be changed", async ({
  page,
  frame,
  open,
}) => {
  await open("question-card");
  // One question at a time. Next without an answer shows GOV.UK's error message.
  const footer = frame.locator(".x-govuk-ui-question-card .x-govuk-ui-form-steps-footer");
  const foot = (await footer.boundingBox())!.y;
  await frame.getByRole("button", { name: /^Next/ }).click();
  await expect(frame.locator(".x-govuk-ui-question-card .x-govuk-ui-error")).toHaveText(
    "Error: Select an answer",
  );
  // Each answer's letter chooses it, and Command with Enter moves on.
  await frame.getByRole("radio", { name: /12 High Street/ }).focus();
  await page.keyboard.press("b");
  await expect(frame.getByRole("radio", { name: /PO Box 34/ })).toBeChecked();
  await page.keyboard.press("ControlOrMeta+Enter");
  // A question can ask for a date. One that need not be answered can be skipped.
  await expect(frame.getByRole("group", { name: /When did you move/ })).toBeVisible();
  // The card keeps its foot still as it changes height, so the buttons stay under the pointer.
  await expect.poll(async () => Math.abs((await footer.boundingBox())!.y - foot)).toBeLessThan(1);
  // A move has already happened, so the calendar offers no future day, and a typed one is an
  // error.
  await frame.getByRole("button", { name: "Choose the date from a calendar" }).click();
  const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const later = page.getByRole("region", { name: "Choose the date" }).getByRole("button", {
    name: tomorrow,
  });
  if (await later.count()) await expect(later).toBeDisabled();
  await page.keyboard.press("Escape");
  await frame.getByRole("textbox", { name: "Day" }).fill("1");
  await frame.getByRole("textbox", { name: "Month" }).fill("1");
  await frame.getByRole("textbox", { name: "Year" }).fill("2099");
  await frame.getByRole("button", { name: /^Next/ }).click();
  await expect(frame.getByText("Error: The date must be today or in the past")).toBeVisible();
  await frame.getByRole("button", { name: "Skip" }).click();
  await expect(frame.getByRole("group", { name: "Which of these can you send me?" })).toBeVisible();
  await frame.getByRole("checkbox", { name: "Passport" }).check();
  await frame.getByRole("checkbox", { name: "Driving licence" }).check();
  await frame.getByRole("button", { name: /^Next/ }).click();
  await frame.getByRole("button", { name: "Skip" }).click();
  // The card waits for the agent to receive the answers, its button busy, before it lists them.
  const summary = frame.locator(".x-govuk-ui-form-steps-summary");
  await expect(frame.locator('.x-govuk-ui-question-card button[aria-busy="true"]')).toHaveCount(1);
  await expect(summary).toHaveCount(0);
  // Once done, the card lists the answers, and Change asks a question again with its answer.
  await expect(summary).toBeFocused();
  await expect(summary.locator(".x-govuk-ui-summary-list-value")).toHaveText([
    "PO Box 34, Leeds",
    "Skipped",
    "PassportDriving licence",
    "Skipped",
  ]);
  await expect(frame.getByRole("status")).toHaveText("The agent carries on with your answers.");
  await summary
    .getByRole("button", {
      name: "Change your answer to Which address should I send your licence to?",
    })
    .click();
  await expect(frame.getByRole("radio", { name: /PO Box 34/ })).toBeFocused();
  await expect(frame.getByRole("radio", { name: /PO Box 34/ })).toBeChecked();
});

test("a card's choices answer to their keys as soon as it shows, but not while someone types", async ({
  page,
  frame,
  open,
}) => {
  await open("question-card");
  // Nothing is focused yet, and the card is the only set of choices on show.
  await page.keyboard.press("b");
  await expect(frame.getByRole("radio", { name: /PO Box 34/ })).toBeChecked();
  // Typing in the other answer's field enters text, and does not choose.
  const other = frame.getByRole("textbox", { name: "A different address…" });
  await other.focus();
  await page.keyboard.type("a");
  await expect(other).toHaveValue("a");
  await expect(frame.getByRole("radio", { name: /12 High Street/ })).not.toBeChecked();
  // Escape leaves the field, so the letters choose again.
  await page.keyboard.press("Escape");
  await expect(other).not.toBeFocused();
  await page.keyboard.press("a");
  await expect(frame.getByRole("radio", { name: /12 High Street/ })).toBeChecked();
});

test("a file diff opens its folded lines, and can be accepted", async ({ frame, open }) => {
  await open("file-diff");
  const lines = frame.locator(".x-govuk-ui-diff-line");
  const before = await lines.count();
  await frame.getByRole("button", { name: "Show 8 unchanged lines" }).click();
  await expect(lines).toHaveCount(before + 8);
  await frame.getByRole("button", { name: "Accept" }).click();
  await expect(frame.getByText("Accepted")).toBeVisible();
});

test("an image being made shows a mosaic until it arrives, then forms out of it", async ({
  frame,
  open,
}) => {
  // Making another breaks it back into the mosaic.
  await open("image-generation");
  const figure = frame.locator(".x-govuk-ui-image-generation");
  await frame.getByRole("button", { name: "Create the poster" }).click();
  await expect(frame.getByRole("progressbar", { name: "Creating the poster" })).toBeVisible();
  await expect(frame.getByRole("img")).toHaveCount(0);
  await expect(figure).toHaveAttribute("data-phase", "forming", { timeout: 15000 });
  await expect(figure).toHaveAttribute("data-phase", "made");
  await expect(frame.getByRole("img", { name: /Battersea Power Station/ })).toBeVisible();
  await frame.getByRole("button", { name: "Create it again" }).click();
  await expect(figure).toHaveAttribute("data-phase", "breaking");
  await expect(figure).toHaveAttribute("data-phase", "making");
  await expect(frame.getByRole("img")).toHaveCount(0);
});

test("a chat input dictates through a service's own recogniser, as well as the browser's", async ({
  frame,
  open,
  playground,
}) => {
  await open("chat-input");
  await playground.set("transcriber", true);
  const dictate = frame.getByRole("button", { name: "Dictate" });
  await dictate.click();
  await expect(frame.getByRole("button", { name: "Stop dictating" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // The phrase it hears joins the message, and it stops listening once it ends.
  await expect(frame.getByRole("textbox", { name: "Message" })).toHaveValue(
    "Can I renew my licence online?",
  );
  await expect(dictate).toHaveAttribute("aria-pressed", "false");
});

/**
 * How a File chip's name shows, as the browser lays it out. That is whether it is cut, what its
 * start and end show, and whether its end stays inside its box and its chip inside its list. For a
 * cut name, it is also whether one more letter would not fit, so no more could show. A name not
 * cut is `whole` when it shows every letter. The name's parts are worked out as FileChip works
 * them out.
 */
function cutOf(name: Locator) {
  return name.evaluate((element) => {
    const start = element.querySelector<HTMLElement>(".x-govuk-ui-file-chip-start")!;
    const end = element.querySelector<HTMLElement>(".x-govuk-ui-file-chip-end")!;
    const whole = element.querySelector(".x-govuk-ui-file-chip-whole")!.textContent!;
    const dot = whole.lastIndexOf(".");
    const extension = dot > 0 && whole.length - dot <= 6 ? whole.slice(dot) : "";
    const stem = whole.slice(0, whole.length - extension.length);
    const fullEnd = (/[\s_-]([^\s_-]{1,10})$/.exec(stem)?.[1] ?? stem.slice(-8)) + extension;
    const fullStart = whole.slice(0, whole.length - fullEnd.length);
    const inside = () =>
      end.getBoundingClientRect().right <= element.getBoundingClientRect().right + 1 / 64;
    const shownStart = start.textContent ?? "";
    const shownEnd = end.textContent ?? "";
    const cut = shownStart.endsWith("…");
    // The next wider way to show the name. That is one more letter of the start, after any spaces,
    // or of the end, from its start, where the end is cut too.
    let wider: [string, string] | undefined;
    if (cut && shownEnd === fullEnd) {
      const kept = shownStart.slice(0, -1);
      const more = /^\s*\S/u.exec(fullStart.slice(kept.length))?.[0] ?? "";
      wider =
        kept.length + more.length >= fullStart.length
          ? [fullStart, fullEnd]
          : [`${kept}${more}…`, fullEnd];
    } else if (cut) {
      wider = ["…", fullEnd.slice(fullEnd.length - shownEnd.length - 1)];
    }
    let tight = true;
    if (wider) {
      const startText = start.firstChild as Text;
      const endText = end.firstChild as Text;
      startText.data = wider[0];
      endText.data = wider[1];
      tight = !inside();
      startText.data = shownStart;
      endText.data = shownEnd;
    }
    const chip = element.closest("li")!;
    const list = chip.parentElement!;
    return {
      cut,
      whole: !cut && shownStart === fullStart && shownEnd === fullEnd,
      start: shownStart,
      end: shownEnd,
      tight,
      fits:
        inside() && chip.getBoundingClientRect().right <= list.getBoundingClientRect().right + 0.5,
    };
  });
}

test("a chat input sends a service's chosen documents beside its files, in one list", async ({
  frame,
  open,
  playground,
}) => {
  await open("chat-input");
  await playground.set("documents", true);
  const list = frame.getByRole("list", { name: "Sent with the message" });
  await expect(list.getByRole("listitem")).toHaveText([
    /Rod fishing byelaws.*Document/,
    /Fishing licence guidance.*Document/,
  ]);
  // Taking one off puts focus back in the message.
  const message = frame.getByRole("textbox", { name: "Message" });
  await list.getByRole("button", { name: "Remove Fishing licence guidance" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(message).toBeFocused();
  // An attached file joins the same list, and is removed once the message is sent. The document
  // stays.
  const file = {
    name: "Rod licence application with proof of age and address, 2026.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(512),
  };
  await frame.locator('.x-govuk-ui-chat-input input[type="file"]').setInputFiles([file]);
  await expect(list.getByRole("listitem")).toHaveText([/Rod fishing byelaws/, /2026\.pdf.*File/]);
  // Its long name is cut as its chip pops in from smaller, and the cut is right once it has.
  const name = list.getByRole("listitem").nth(1).locator(".x-govuk-ui-file-chip-name");
  await expect(name).toHaveAttribute("data-cut", "");
  await name.evaluate((element) =>
    Promise.all(
      element
        .closest("li")!
        .getAnimations()
        .map((animation) => animation.finished),
    ),
  );
  expect(await cutOf(name)).toMatchObject({ end: "2026.pdf", tight: true, fits: true });
  await message.fill("Can I fish here?");
  await message.press("Enter");
  await expect(frame.getByRole("status")).toContainText("with 1 file");
  await expect(list.getByRole("listitem")).toHaveText([/Rod fishing byelaws/]);
});

test("in a narrow box, the chat input's model picker takes a line of its own beneath Send", async ({
  frame,
  open,
}) => {
  await open("chat-input");
  const input = frame.locator(".x-govuk-ui-chat-input");
  const model = frame.getByRole("button", { name: /Atlas 2/ });
  const send = frame.getByRole("button", { name: "Send" });
  const places = async () => {
    const [picker, sent, box] = await Promise.all([
      model.boundingBox(),
      send.boundingBox(),
      input.boundingBox(),
    ]);
    return {
      beneath: picker!.y >= sent!.y + sent!.height,
      inside: picker!.x + picker!.width <= box!.x + box!.width,
    };
  };
  expect(await places()).toEqual({ beneath: false, inside: true });
  await input.evaluate((element) => {
    element.style.width = "280px";
  });
  await expect.poll(places).toEqual({ beneath: true, inside: true });
});

test("pressing the chat input's box, anywhere that is not a control or a chip's name, focuses the message", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("chat-input");
  await playground.set("documents", true);
  const message = frame.getByRole("textbox", { name: "Message" });
  await expect(message).not.toBeFocused();
  // The bar beneath the message has space between its tools and Send.
  const bar = frame.locator(".x-govuk-ui-chat-input-bar");
  const box = (await bar.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(message).toBeFocused();
  // A file chip's name is selected by a drag or a double-click, as outside a chat input, and the
  // message is left alone.
  const name = frame
    .getByRole("list", { name: "Sent with the message" })
    .getByRole("listitem")
    .first()
    .locator(".x-govuk-ui-file-chip-name");
  const selected = () => name.evaluate(() => getSelection()?.toString());
  // The name is cut short in this box, so it shows as its start and end.
  const shown = await name.evaluate((element) =>
    [".x-govuk-ui-file-chip-start", ".x-govuk-ui-file-chip-end"]
      .map((part) => element.querySelector(part)?.textContent ?? "")
      .join(""),
  );
  const words = (await name.boundingBox())!;
  await page.mouse.move(words.x + 2, words.y + words.height / 2);
  await page.mouse.down();
  await page.mouse.move(words.x + words.width - 2, words.y + words.height / 2, { steps: 4 });
  await page.mouse.up();
  await expect.poll(selected).toMatch(/^Rod fi/);
  await expect(message).not.toBeFocused();
  await name.evaluate(() => getSelection()?.removeAllRanges());
  await name.dblclick();
  await expect.poll(selected).toBe(shown);
  await expect(message).not.toBeFocused();
  // The controls in the box keep their own presses.
  await frame.getByRole("button", { name: /Atlas 2/ }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(message).not.toBeFocused();
});

test("file chips list documents outside a chat input, link their names, and pass focus on as one goes", async ({
  frame,
  open,
  playground,
}) => {
  await open("file-chips");
  const list = frame.getByRole("list", { name: "Documents with this question" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  // A long name is cut short in its middle. Its start gives way, and its last word and extension
  // show in full. It shows in full in its title.
  const long = list.locator(".x-govuk-ui-file-chip").nth(2);
  const name = long.locator(".x-govuk-ui-file-chip-name");
  await expect(name).toHaveAttribute(
    "title",
    "Catch returns by river and by month, 2021 to 2025.xlsx",
  );
  const cut = () => cutOf(name);
  // Every name is either whole, with none of its letters hidden, or cut with no gap.
  const names = list.locator(".x-govuk-ui-file-chip-name");
  const settled = async () => {
    const all = await Promise.all((await names.all()).map(cutOf));
    return all.map((one) => (one.cut ? one.tight && one.fits : one.whole && one.fits));
  };
  await expect.poll(settled).toEqual([true, true, true]);
  const first = await cut();
  expect(first).toMatchObject({ cut: true, end: "2025.xlsx", tight: true, fits: true });
  expect(first.start.length).toBeGreaterThan(4);
  // The ellipsis follows a letter, never a space.
  expect(first.start).toMatch(/\S…$/);
  await expect(name).toHaveAttribute("data-cut", "");
  // A double or triple click on either part selects the whole name as shown, and copying all of it
  // copies the full name, not the cut.
  const selected = () => name.evaluate(() => getSelection()?.toString());
  for (const [part, clickCount] of [
    [".x-govuk-ui-file-chip-start", 2],
    [".x-govuk-ui-file-chip-end", 2],
    [".x-govuk-ui-file-chip-start", 3],
  ] as const) {
    await name.evaluate(() => getSelection()?.removeAllRanges());
    await long.locator(part).click({ clickCount });
    expect(await selected()).toBe(`${first.start}${first.end}`);
  }
  const copied = await name.evaluate((element) => {
    // Firefox gives the event a copy of the data it is made with, so the event's own is read.
    const event = new ClipboardEvent("copy", {
      clipboardData: new DataTransfer(),
      bubbles: true,
      cancelable: true,
    });
    element.querySelector(".x-govuk-ui-file-chip-start")!.dispatchEvent(event);
    getSelection()?.removeAllRanges();
    return event.clipboardData?.getData("text/plain");
  });
  expect(copied).toBe("Catch returns by river and by month, 2021 to 2025.xlsx");
  // In a list narrower than a chip, the chip narrows and its name is cut again, with no gap.
  await list.evaluate((element) => {
    element.style.width = "150px";
  });
  await expect
    .poll(async () => {
      const narrow = await cut();
      return narrow.tight && narrow.fits && narrow.start.length < first.start.length;
    })
    .toBe(true);
  await list.evaluate((element) => {
    element.style.width = "";
  });
  await expect.poll(async () => (await cut()).start).toBe(first.start);
  // A name a fraction of a pixel too long for its space is cut, with no gap, as one far too long
  // is, and one with just enough space is whole.
  const short = names.first();
  const wholeWidth = await short.evaluate(
    (element) => element.closest("li")!.getBoundingClientRect().width,
  );
  const room = async (spare: number) => {
    await short.evaluate((element, width) => {
      const chip = element.closest("li")!;
      chip.style.maxWidth = `${width}px`;
      // The list is nudged, as a change to its space would be, so the name is measured again.
      const list = chip.parentElement!;
      list.style.paddingRight = list.style.paddingRight ? "" : "1px";
    }, wholeWidth + spare);
  };
  await room(-0.3);
  await expect
    .poll(async () => {
      const tooLong = await cutOf(short);
      return tooLong.cut && tooLong.tight && tooLong.fits;
    })
    .toBe(true);
  await room(0);
  await expect
    .poll(async () => {
      const justRoom = await cutOf(short);
      return !justRoom.cut && justRoom.whole && justRoom.fits;
    })
    .toBe(true);
  // In another typeface, once it is set, the name is cut again for its letters.
  await list.evaluate((element) => {
    element.style.setProperty("--x-govuk-ui-font", "Georgia, serif");
  });
  await expect
    .poll(async () => {
      const other = await cut();
      return other.tight && other.fits && other.end === "2025.xlsx" && other.start !== first.start;
    })
    .toBe(true);
  await expect.poll(settled).toEqual([true, true, true]);
  await list.evaluate((element) => {
    element.style.removeProperty("--x-govuk-ui-font");
  });
  await expect.poll(async () => (await cut()).start).toBe(first.start);
  await playground.set("links", true);
  // As links, the names are measured again, and each is whole or cut with no gap.
  await expect.poll(settled).toEqual([true, true, true]);
  expect(await cut()).toMatchObject({ cut: true, end: "2025.xlsx", tight: true, fits: true });
  // The link's name is the whole name, once.
  await expect(
    list.getByRole("link", { name: "River Wye byelaws.docx", exact: true }),
  ).toHaveAttribute("href", "#documents");
  await playground.set("removable", true);
  await list.getByRole("button", { name: "Remove River Wye byelaws.docx" }).press("Enter");
  await expect(list.getByRole("listitem")).toHaveCount(2);
  // The chip's button has gone, so focus goes to the next chip's, not to the page.
  await expect(
    list.getByRole("button", {
      name: "Remove Catch returns by river and by month, 2021 to 2025.xlsx",
    }),
  ).toBeFocused();
  // The last chip passes it back to the one before.
  await list
    .getByRole("button", { name: "Remove Catch returns by river and by month, 2021 to 2025.xlsx" })
    .press("Enter");
  await expect(list.getByRole("button", { name: "Remove Licence fees.pdf" })).toBeFocused();
});
