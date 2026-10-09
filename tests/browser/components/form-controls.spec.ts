import type { Locator } from "@playwright/test";
import { expect, test } from "../fixtures";

test("an input shows its error, keeps focus with the keyboard and sends", async ({
  page,
  frame,
  open,
  browserName,
}) => {
  await open("input");
  const input = frame.getByRole("textbox", { name: "Email address" });
  await input.fill("wrong");
  await frame.getByRole("button", { name: "Continue" }).click();
  await expect(frame.getByRole("alert")).toContainText(
    "Enter an email address in the correct format.",
  );
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("aria-describedby", "email-hint email-error");
  await input.fill("alex@example.com");
  // Safari's Tab skips buttons unless "Press Tab to highlight each item" is on, so WebKit
  // focuses the button directly.
  if (browserName === "webkit") await frame.getByRole("button", { name: "Continue" }).focus();
  else await input.press("Tab");
  await expect(frame.getByRole("button", { name: "Continue" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(frame.getByRole("status")).toContainText("No information was sent.");
});

test("a password input shows and hides its password, with its strength beneath", async ({
  frame,
  open,
  playground,
}) => {
  await open("input");
  await playground.set("password", "Password with strength");
  const field = frame.getByLabel("Create a password");
  await field.fill("Tr4velling-light");
  await expect(field).toHaveAttribute("type", "password");
  await frame.getByRole("button", { name: "Show password" }).click();
  await expect(field).toHaveAttribute("type", "text");
  await expect(frame.getByText("Password strength: Strong")).toBeVisible();
  await frame.getByRole("button", { name: "Hide password" }).click();
  await expect(field).toHaveAttribute("type", "password");
});

test("a textarea counts its characters", async ({ frame, open }) => {
  await open("textarea");
  await frame.getByRole("textbox").fill("x".repeat(205));
  await expect(frame.locator(".x-govuk-ui-character-count")).toHaveText(
    "You have 5 characters too many",
  );
});

/**
 * A frame, for the browser to tell the editor about a selection just set. WebKit reports it at its
 * next frame, and a key pressed before then would go to the previous selection.
 */
const settled = (document: Locator) =>
  document.evaluate(
    () => new Promise<void>((done) => requestAnimationFrame(() => setTimeout(done, 0))),
  );

/** Selects a run of text inside an element of the document, as a user dragging would. */
async function selectText(document: Locator, selector: string, from: number, to: number, nth = 0) {
  await document.evaluate(
    (element, [selector, from, to, nth]) => {
      const host = element.querySelectorAll(selector as string)[nth as number]!;
      const text = window.document.createTreeWalker(host, NodeFilter.SHOW_TEXT).nextNode()!;
      const range = window.document.createRange();
      range.setStart(text, from as number);
      range.setEnd(text, to as number);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    },
    [selector, from, to, nth] as const,
  );
  await settled(document);
}

/** Selects the whole text of an element of the document, across its formatting. */
async function selectWhole(document: Locator, selector: string, nth = 0) {
  await document.evaluate(
    (element, [selector, nth]) => {
      const host = element.querySelectorAll(selector as string)[nth as number]!;
      const walker = window.document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      const first = walker.nextNode()!;
      let last = first;
      for (let next = walker.nextNode(); next; next = walker.nextNode()) last = next;
      const range = window.document.createRange();
      range.setStart(first, 0);
      range.setEnd(last, last.textContent?.length ?? 0);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    },
    [selector, nth] as const,
  );
  await settled(document);
}

/** Puts the caret at the end of an element of the document. */
async function caretAtEnd(document: Locator, selector: string, nth = 0) {
  await document.evaluate(
    (element, [selector, nth]) => {
      const range = window.document.createRange();
      range.selectNodeContents(element.querySelectorAll(selector as string)[nth as number]!);
      range.collapse(false);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      (element as HTMLElement).focus();
    },
    [selector, nth] as const,
  );
  await settled(document);
}

test("the editor formats as Lexxy's toolbar and Markdown shortcuts say, and writes HTML", async ({
  page,
  frame,
  open,
}) => {
  await open("editor");
  const document = frame.getByRole("textbox", { name: "Notes for the caseworker" });
  const toolbar = frame.getByRole("toolbar", { name: "Formatting" });
  const written = frame.locator('input[name="notes"]');
  await expect(toolbar.getByRole("button", { name: "Undo" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  // Bold from the toolbar, which returns the caret to the document, and a bullet from Markdown.
  await caretAtEnd(document, "p", 1);
  await toolbar.getByRole("button", { name: "Bold" }).click();
  await expect(toolbar.getByRole("button", { name: "Bold" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(document).toBeFocused();
  await page.keyboard.type(" Urgent.");
  await expect(written).toHaveValue(/by Friday\.<(b|strong)> Urgent\.<\/(b|strong)><\/p>$/);
  // What was typed is its own step to undo and redo, and the selection's moves are not part of it.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(written).toHaveValue(/by Friday\.<\/p>$/);
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(written).toHaveValue(/by Friday\.<(b|strong)> Urgent\.<\/(b|strong)><\/p>$/);
  await toolbar.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("- A bullet");
  await expect(written).toHaveValue(/<ul><li>A bullet<\/li><\/ul>$/);
  await expect(toolbar.getByRole("button", { name: "Bulleted list" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(toolbar.getByRole("button", { name: "Undo" })).toBeEnabled();
  // The toolbar is one Tab stop, with the arrow keys moving along it.
  await toolbar.getByRole("button", { name: "Bold" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(toolbar.getByRole("button", { name: "Italic" })).toBeFocused();
  // Bold text made italic too is drawn as both, though Lexical draws it as one strong element.
  await selectText(document, "strong", 0, 9);
  await page.keyboard.press("ControlOrMeta+i");
  await expect(document.locator("strong").first()).toHaveCSS("font-style", "italic");
  await expect(written).toHaveValue(/<i><strong>confirmed<\/strong><\/i>/);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(written).toHaveValue(/applicant <strong>confirmed<\/strong>/);
  // The formatting menu makes the line one of the editor's headings, and returns the caret.
  await caretAtEnd(document, "p", 0);
  await toolbar.getByRole("button", { name: "Text formatting" }).click();
  await page.getByRole("menuitemradio", { name: "Medium heading" }).click();
  await expect(written).toHaveValue(/<h3>The applicant <strong>confirmed<\/strong>/);
  await expect(document).toBeFocused();
  await toolbar.getByRole("button", { name: "Text formatting" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Medium heading" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("menuitemradio", { name: "Normal" }).click();
  await expect(written).toHaveValue(/<p>The applicant <strong>confirmed<\/strong>/);
  // A link takes its address in a popover, and a bare domain is taken as a web page's address.
  await selectText(document, "li", 0, 4, 1);
  await toolbar.getByRole("button", { name: "Link", exact: true }).click();
  await page.getByRole("textbox", { name: "Web address" }).fill("www.gov.uk/notes");
  await page.keyboard.press("Enter");
  await expect(written).toHaveValue(/<a href="https:\/\/www\.gov\.uk\/notes"[^>]*>when<\/a>/);
  // A link shows its address and tools under it while the pointer rests on it, or while the caret
  // is in it, where Alt F10 reaches them.
  const linkTools = frame.getByRole("toolbar", { name: "Link", exact: true });
  await document.locator('a[href="https://www.gov.uk/notes"]').hover();
  await expect(linkTools.getByRole("link")).toHaveText("www.gov.uk/notes (opens in new tab)");
  await linkTools.getByRole("button", { name: "Unlink" }).click();
  await expect(written).toHaveValue(/<li>when a decision will come<\/li>/);
  await expect(linkTools).toHaveCount(0);
  await caretAtEnd(document, "a", 0);
  await expect(linkTools.getByRole("link")).toHaveText("www.gov.uk (opens in new tab)");
  await page.keyboard.press("Alt+F10");
  await expect(linkTools.getByRole("link")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(document).toBeFocused();
  // Colour from GOV.UK's palette, on a mark, written as the hex it was chosen as.
  await selectText(document, "strong", 0, 9);
  await toolbar.getByRole("button", { name: "Colour" }).click();
  await page
    .getByRole("group", { name: "Text colour" })
    .getByRole("button", { name: "Red", exact: true })
    .click();
  await expect(written).toHaveValue(
    /<mark style="color: #ca3535"><strong>confirmed<\/strong><\/mark>/,
  );
  // Code around words on one line is inline, and a quotation wraps the line the caret is in.
  await selectText(document, "li", 0, 3, 0);
  await toolbar.getByRole("button", { name: "Code", exact: true }).click();
  await expect(written).toHaveValue(/<li><code>the<\/code> <a/);
  await caretAtEnd(document, "p", 1);
  await toolbar.getByRole("button", { name: "Quotation" }).click();
  await expect(written).toHaveValue(/<blockquote><p>In order to process/);
  await expect(toolbar.getByRole("button", { name: "Quotation" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Markdown closed around words as it is typed formats them.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Say **this** and `that` ");
  await expect(written).toHaveValue(
    /<p>Say <(b|strong)>this<\/(b|strong)> and <code>that<\/code> <\/p>/,
  );
});

test("the editor holds tables, code coloured by its syntax and dividers, each with its own keys", async ({
  page,
  frame,
  open,
}) => {
  await open("editor");
  const document = frame.getByRole("textbox", { name: "Notes for the caseworker" });
  const toolbar = frame.getByRole("toolbar", { name: "Formatting" });
  const written = frame.locator('input[name="notes"]');
  // A table of three rows and columns, with a header row, and its tools over it.
  await caretAtEnd(document, "p", 1);
  await toolbar.getByRole("button", { name: "Insert a table" }).click();
  await expect(document.locator("table tr")).toHaveCount(3);
  await page.keyboard.type("Name");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Role");
  // Enter goes down the column, and from the last row makes a new one.
  await page.keyboard.press("Enter");
  await page.keyboard.type("Caseworker");
  await expect(written).toHaveValue(
    /<table><tbody><tr><th><p>Name<\/p><\/th><th><p>Role<\/p><\/th><th>[\s\S]*<\/tr><tr><td>[^<]*(<p><br><\/p>)?<\/td><td><p>Caseworker<\/p><\/td>/,
  );
  const tools = frame.getByRole("toolbar", { name: "Table" });
  await expect(tools.getByRole("button", { name: "3 rows" })).toBeVisible();
  await tools.getByRole("button", { name: "Add row" }).click();
  await expect(document.locator("table tr")).toHaveCount(4);
  await expect(tools.getByRole("button", { name: "4 rows" })).toBeVisible();
  await tools.getByRole("button", { name: "3 columns" }).click();
  await page.getByRole("menuitem", { name: "Remove column" }).click();
  await expect(document.locator("table tr").first().locator("th, td")).toHaveCount(2);
  // The header row's item tells screen readers whether the caret's row is a header row, as a
  // checked item. The caret is in a row of the table's body.
  await tools.getByRole("button", { name: "4 rows" }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "Header row" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitemcheckbox", { name: "Header row" })).toHaveCount(0);
  // Deleting the table from the keyboard returns focus to the document, as its tool disappears.
  const remove = tools.getByRole("button", { name: "Delete table" });
  await remove.focus();
  await expect(remove).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(document.locator("table")).toHaveCount(0);
  await expect(document).toBeFocused();
  // Three backticks and a language start a code block, coloured as Code block colours code,
  // with its language in a list at its corner.
  await caretAtEnd(document, "p", 0);
  await page.keyboard.press("Enter");
  await page.keyboard.type("```ts ");
  await page.keyboard.type('const fee = "free";');
  await expect(document.locator(".x-govuk-ui-code-keyword")).toHaveText("const");
  await expect(written).toHaveValue(/<pre data-language="ts">const fee = "free";<\/pre>/);
  const language = frame.getByRole("combobox", { name: "Language" });
  await expect(language).toHaveValue("typescript");
  // Enter on an empty last line leaves the block.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("After the code");
  await expect(written).toHaveValue(/<\/pre><p>After the code<\/p>/);
  await expect(language).toHaveCount(0);
  // Three dashes make a divider, and the divider control makes another.
  await page.keyboard.press("Enter");
  await page.keyboard.type("--- ");
  await expect(written).toHaveValue(/<p>After the code<\/p><hr>/);
  await toolbar.getByRole("button", { name: "Insert a divider" }).click();
  await expect(document.locator("hr")).toHaveCount(2);
  // Typing with a divider selected types after it, and one Undo removes all that was typed.
  await document.locator("hr").last().click();
  await page.keyboard.type("Next");
  await expect(written).toHaveValue(/<hr><p>Next<\/p>/);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(written).not.toHaveValue(/Next/);
  // A list item in a nested list lifts with Shift Tab, and the caret indents with Tab.
  await caretAtEnd(document, "li", 1);
  await page.keyboard.press("Tab");
  await expect(written).toHaveValue(
    /eligibility rules<\/a><ul><li>when a decision will come<\/li><\/ul><\/li><\/ul>/,
  );
  await page.keyboard.press("Shift+Tab");
  await expect(written).toHaveValue(/<li>when a decision will come<\/li><\/ul>/);
});

test("the editor takes images and files: stored as they go in, in a gallery, with captions, descriptions and moves", async ({
  page,
  frame,
  open,
}) => {
  await open("editor");
  const document = frame.getByRole("textbox", { name: "Notes for the caseworker" });
  const toolbar = frame.getByRole("toolbar", { name: "Formatting" });
  const written = frame.locator('input[name="notes"]');
  const square = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=",
    "base64",
  );
  // Two images at once make a gallery, each drawn from its file with a progress bar until it is
  // stored.
  await caretAtEnd(document, "p", 0);
  const chooser = page.waitForEvent("filechooser");
  await toolbar.getByRole("button", { name: "Add an image or video" }).click();
  await (await chooser).setFiles([
    { name: "front.png", mimeType: "image/png", buffer: square },
    { name: "back.png", mimeType: "image/png", buffer: square },
  ]);
  await expect(document.locator(".x-govuk-ui-editor-gallery figure")).toHaveCount(2);
  await expect(document.locator("figure progress")).toHaveCount(0, { timeout: 5000 });
  await expect(written).toHaveValue(
    /<div data-gallery=""><figure data-attachment="" data-content-type="image\/png" data-filename="front\.png"[^>]*><img src="data:image\/png;base64,[^"]+" alt="" width="8" height="8"><\/figure><figure[^>]*data-filename="back\.png"/,
  );
  // A file of another kind goes in as its type, name and size.
  await caretAtEnd(document, "p", 1);
  const files = page.waitForEvent("filechooser");
  await toolbar.getByRole("button", { name: "Attach a file" }).click();
  await (await files).setFiles([
    { name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") },
  ]);
  await expect(document.locator('figure[data-kind="file"]')).toContainText("report.pdf");
  await expect(written).toHaveValue(
    /<figure data-attachment="" data-content-type="application\/pdf" data-filename="report\.pdf" data-filesize="8"><a href="data:application\/pdf;base64,[^"]+">report\.pdf<\/a><\/figure>/,
  );
  // A selected image has its tools, and Tab writes its caption, outside the document.
  await document.locator("figure img").first().click();
  const tools = frame.getByRole("toolbar", { name: "Attachment" });
  await expect(tools.getByRole("button", { name: "Remove" })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(frame.getByRole("textbox", { name: "Image caption" })).toBeFocused();
  await page.keyboard.type("The front of the form");
  await page.keyboard.press("Enter");
  await expect(written).toHaveValue(
    /alt="" width="8" height="8"><figcaption>The front of the form<\/figcaption><\/figure>/,
  );
  // Its description is written in a popover beneath it.
  await document.locator("figure img").first().click();
  await tools.getByRole("button", { name: "Alternative text" }).click();
  await page.getByRole("textbox", { name: "Alternative text" }).fill("A filled-in form");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(written).toHaveValue(
    /alt="A filled-in form" width="8" height="8"><figcaption>The front of the form/,
  );
  // Focus returns to the image, selected, as the popover closes.
  await expect(document).toBeFocused();
  await expect(document.locator("figure[data-selected]")).toHaveCount(1);
  // A press on text puts the caret back in it, where it was pressed.
  await document.getByText("please provide the evidence").click();
  await page.keyboard.type("[seen]");
  await expect(written).toHaveValue(
    /<p>In order to process the claim, [^<]*\[seen\][^<]*by Friday\.<\/p>/,
  );
  // Alt, Shift and the arrows move it along its gallery, then out of it, and screen readers hear
  // the move.
  await document.locator("figure img").first().click();
  await page.keyboard.press("Alt+Shift+ArrowRight");
  await expect(written).toHaveValue(/data-filename="back\.png"[\s\S]*data-filename="front\.png"/);
  await page.keyboard.press("Alt+Shift+ArrowDown");
  await expect(document.locator(".x-govuk-ui-editor-gallery")).toHaveCount(0);
  await expect(written).toHaveValue(/back\.png[\s\S]*<\/figure><figure[^>]*front\.png/);
  // Remove takes it away, and Undo brings it back with its address, not its upload.
  await tools.getByRole("button", { name: "Remove" }).click();
  await expect(document.locator("figure img")).toHaveCount(1);
  await toolbar.getByRole("button", { name: "Undo" }).click();
  await expect(document.locator("figure img")).toHaveCount(2);
  await expect(document.locator("figure progress")).toHaveCount(0);
  // Typing with an image selected types after it, on a line of its own.
  await document.locator("figure img").first().click();
  await page.keyboard.type("Both sides");
  await expect(written).toHaveValue(/<\/figure><p>Both sides<\/p><figure/);
  // A caret put in the text without a press leaves the image selected. Typing therefore still goes
  // after it, and nothing goes in at the document's start, where Lexical would put it.
  await document.locator("figure img").last().click();
  await caretAtEnd(document, "li", 0);
  await page.keyboard.type("!");
  await expect(written).toHaveValue(/^<h2>Visit on 4 October<\/h2>[\s\S]*<\/figure><p>!<\/p>/);
});

test("the editor's tip follows Source behind More as the window narrows, and back, with no resize loop", async ({
  page,
  frame,
  open,
}) => {
  // The browser reports a loop of resize observers as an error event, not a thrown error.
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.assign(window, { seenErrors: seen });
    window.addEventListener("error", (event) => seen.push(event.message));
  });
  await open("editor");
  const tip = page.locator(".x-govuk-ui-callout", { hasText: "See what it submits" });
  const toolbar = frame.getByRole("toolbar", { name: "Formatting" });
  // The tip's arrow points at a control, and the gap between them is the callout's own.
  const near = async (name: string) => {
    const control = (await toolbar.getByRole("button", { name, exact: true }).boundingBox())!;
    const card = (await tip.boundingBox())!;
    const across = Math.abs(card.x + card.width / 2 - (control.x + control.width / 2));
    const between = Math.min(
      Math.abs(card.y - (control.y + control.height)),
      Math.abs(control.y - (card.y + card.height)),
    );
    return across < card.width / 2 && between < 24;
  };
  await expect.poll(() => near("Source")).toBe(true);
  // Narrowed past the workbench's own breakpoint, step by step as a window's edge is dragged,
  // Source moves behind More, and the tip goes with it.
  const { width, height } = page.viewportSize()!;
  for (let step = width; step >= 520; step -= 40)
    await page.setViewportSize({ width: step, height });
  await expect(toolbar.getByRole("button", { name: "Source", exact: true })).toHaveCount(0);
  await expect.poll(() => near("More formatting")).toBe(true);
  for (let step = 520; step <= width; step += 40)
    await page.setViewportSize({ width: step, height });
  await page.setViewportSize({ width, height });
  await expect.poll(() => near("Source")).toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as { seenErrors: string[] }).seenErrors),
  ).toEqual([]);
});

test("the editor takes part in a Form: its popovers send nothing, it waits for files, and Undo brings back an upload", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("editor");
  await playground.set("form", true);
  const document = frame.getByRole("textbox", { name: "Notes for the caseworker" });
  const toolbar = frame.getByRole("toolbar", { name: "Formatting" });
  const written = frame.locator('input[name="notes"]');
  const save = frame.getByRole("button", { name: "Save notes" });
  const saved = frame.locator(".preview-saved");
  // In a Form, the box is the Form's width, as it is on its own, whatever is inside, and keeps it
  // with its source showing.
  const box = frame.locator(".x-govuk-ui-editor");
  const width = (await frame.locator("form").boundingBox())!.width;
  expect((await box.boundingBox())!.width).toBe(width);
  await toolbar.getByRole("button", { name: "Source" }).click();
  await expect(frame.locator(".x-govuk-ui-editor-source")).toBeVisible();
  expect((await box.boundingBox())!.width).toBe(width);
  await toolbar.getByRole("button", { name: "Source" }).click();
  const square = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=",
    "base64",
  );
  const addImage = async (name: string) => {
    const chooser = page.waitForEvent("filechooser");
    await toolbar.getByRole("button", { name: "Add an image or video" }).click();
    await (await chooser).setFiles([{ name, mimeType: "image/png", buffer: square }]);
  };
  // Enter in the link's popover links the words, and submits nothing, though React passes the
  // popover's submit up to the Form around the editor.
  await selectText(document, "p", 4, 13, 0);
  await toolbar.getByRole("button", { name: "Link", exact: true }).click();
  await page.getByRole("textbox", { name: "Web address" }).fill("www.gov.uk");
  await page.keyboard.press("Enter");
  await expect(written).toHaveValue(/<a href="https:\/\/www\.gov\.uk"[^>]*>applicant<\/a>/);
  await expect(saved).toHaveText("");
  // While a file is uploading, the Form waits, and the field says why.
  await caretAtEnd(document, "p", 1);
  await addImage("front.png");
  await expect(document.locator("figure progress")).toHaveCount(1);
  await save.click();
  await expect(frame.getByText("Wait for every file to finish uploading")).toBeVisible();
  await expect(saved).toHaveText("");
  await expect(document.locator("figure progress")).toHaveCount(0, { timeout: 5000 });
  await expect(frame.getByText("Wait for every file to finish uploading")).toHaveCount(0);
  await save.click();
  await expect(saved).toHaveText("Saved");
  // An image removed while uploading stops its upload, and Undo brings it back to start again.
  await caretAtEnd(document, "p", 1);
  await addImage("back.png");
  await document.locator("figure[data-uploading] img").click();
  await frame
    .getByRole("toolbar", { name: "Attachment" })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(document.locator("figure")).toHaveCount(1);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(document.locator("figure")).toHaveCount(2);
  await expect(document.locator("figure progress")).toHaveCount(0, { timeout: 5000 });
  await expect(written).toHaveValue(/data-filename="back\.png"[^>]*><img src="data:image\/png/);
  // Undo past an upload that has since finished brings back the image with the upload's result.
  await caretAtEnd(document, "p", 1);
  await addImage("side.png");
  await page.keyboard.type("Side");
  await expect(document.locator("figure progress")).toHaveCount(0, { timeout: 5000 });
  await page.keyboard.press("ControlOrMeta+z");
  await expect(document.locator("figure img").first()).toHaveAttribute("src", /^data:image\/png/);
  await expect(written).toHaveValue(/data-filename="side\.png"[^>]*><img src="data:image\/png/);
  // The form's data has the current document, though it is written out a frame later.
  const form = frame.locator("form");
  await caretAtEnd(document, "h2", 0);
  await page.keyboard.type(" Fresh");
  expect(
    await form.evaluate((element) => new FormData(element as HTMLFormElement).get("notes")),
  ).toContain("Fresh");
  // A value set from outside replaces the document, however much was typed since it was written.
  // The paragraph is pressed at its end, clear of the scrollbar, because Lexical keeps the
  // attachment selected until it is.
  const last = document.locator("p").nth(1);
  const line = (await last.boundingBox())!;
  await last.click({ position: { x: line.width - 24, y: line.height / 2 } });
  await page.keyboard.type(" Typed.");
  await expect(written).toHaveValue(/Typed\.<\/p>/);
  await frame.getByRole("button", { name: "Start again" }).click();
  await expect(written).toHaveValue(/by Friday\.<\/p>$/);
  await expect(document.locator("figure")).toHaveCount(0);
  await caretAtEnd(document, "p", 1);
  await page.keyboard.type(" Again.");
  await expect(written).toHaveValue(/by Friday\. Again\.<\/p>$/);
  // Disabled, the editor shows none of its floating tools.
  await caretAtEnd(document, "a", 0);
  const linkTools = frame.getByRole("toolbar", { name: "Link", exact: true });
  await expect(linkTools).toBeVisible();
  await playground.set("disabled", true);
  await expect(linkTools).toHaveCount(0);
  await playground.set("disabled", false);
  // The Form checks a blank document, by the editor's name.
  await document.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await expect(written).toHaveValue("");
  await save.click();
  await expect(frame.getByText("Enter notes for the caseworker")).toBeVisible();
});

test("the editor's prompt mentions a member of the team, and pasted Markdown and links are made good", async ({
  browserName,
  page,
  frame,
  open,
  playground,
}) => {
  await open("editor");
  const document = frame.getByRole("textbox", { name: "Notes for the caseworker" });
  const written = frame.locator('input[name="notes"]');
  // @ opens the team, filtered by the start of the typed words, with the first one highlighted.
  await caretAtEnd(document, "p", 0);
  await page.keyboard.type(" Ask @le");
  const team = page.getByRole("listbox", { name: "Team members" });
  await expect(team.getByRole("option")).toHaveText(["Stanley Baldwin team leader"]);
  await expect(document).toHaveAttribute("aria-activedescendant", /.+/);
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect(team.getByRole("option")).toHaveCount(4);
  await page.keyboard.press("ArrowDown");
  await expect(team.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(team).toHaveCount(0);
  await page.keyboard.type("about it.");
  await expect(written).toHaveValue(
    /Ask <span data-mention="person" data-value="baldwin">Stanley Baldwin<\/span> about it\.<\/p>/,
  );
  await expect(document.locator(".x-govuk-ui-editor-mention")).toHaveText("Stanley Baldwin");
  // Typing with a mention selected types after it, in its line.
  await document.locator(".x-govuk-ui-editor-mention").click();
  await page.keyboard.type(",");
  await expect(written).toHaveValue(/Stanley Baldwin<\/span>, about it\./);
  // Escape closes the menu, and the trigger stays as typed.
  await page.keyboard.type(" @");
  await expect(team).toBeVisible();
  // The menu is placed relative to the viewport, as the caret is, whatever order the styles load
  // in.
  await expect(page.locator(".x-govuk-ui-editor-prompt", { has: team })).toHaveCSS(
    "position",
    "fixed",
  );
  await page.keyboard.press("Escape");
  await expect(team).toHaveCount(0);
  // A prompt can put in text, such as an emoji found by its name.
  await page.keyboard.type(" :thu");
  await expect(page.getByRole("listbox", { name: "Emoji" }).getByRole("option")).toHaveText([
    "👍 Thumbs up",
    "👎 Thumbs down",
  ]);
  await page.keyboard.press("Enter");
  await expect(written).toHaveValue(/@ 👍 about it\./);
  // Pasted plain text is read as Markdown, and a bare web address as a link. Firefox gives a paste
  // event made by a script an empty clipboard. In Firefox, the test therefore writes to the
  // clipboard itself and pastes from it.
  const paste = async (data: Record<string, string>) => {
    if (browserName === "firefox") {
      await page.evaluate(async (data) => {
        const parts = Object.entries(data).map(([type, text]) => [
          type,
          new Blob([text], { type }),
        ]);
        await navigator.clipboard.write([new ClipboardItem(Object.fromEntries(parts))]);
      }, data);
      await page.keyboard.press("ControlOrMeta+v");
      return;
    }
    await document.evaluate((element, data) => {
      const transfer = new DataTransfer();
      for (const [type, text] of Object.entries(data)) transfer.setData(type, text);
      element.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }),
      );
    }, data);
  };
  await caretAtEnd(document, "p", 1);
  await page.keyboard.press("Enter");
  await paste({ "text/plain": "## Next steps\n\n- one\n- **two**" });
  await expect(written).toHaveValue(
    /<h2>Next steps<\/h2><ul><li>one<\/li><li><strong>two<\/strong><\/li><\/ul>$/,
  );
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await paste({ "text/plain": "https://www.gov.uk/browse" });
  await expect(written).toHaveValue(
    /<p><a href="https:\/\/www\.gov\.uk\/browse">https:\/\/www\.gov\.uk\/browse<\/a><\/p>$/,
  );
  // Word's paragraphs of bullets become a list again, whether or not the editor takes
  // attachments.
  const word = {
    "text/html":
      "<p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>First</p><p style='mso-list:l0 level1 lfo1'><span style='mso-list:Ignore'>·</span>Second</p>",
    "text/plain": "First\nSecond",
  };
  await page.keyboard.press("Enter");
  await paste(word);
  await expect(written).toHaveValue(/<ul><li>First<\/li><li>Second<\/li><\/ul>$/);
  await playground.set("attachments", false);
  await caretAtEnd(document, "p", 1);
  await page.keyboard.press("Enter");
  await paste(word);
  await expect(written).toHaveValue(/<ul><li>First<\/li><li>Second<\/li><\/ul>$/);
});

test("the editor offers a model's suggestions for selected text, held as it is written", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("editor");
  await playground.set("ai", true);
  const document = frame.getByRole("textbox", { name: "Notes for the caseworker" });
  const written = frame.locator('input[name="notes"]');
  const toolbar = page.getByRole("group", { name: "Suggest an edit" });
  const highlighted = (name: string) =>
    page.evaluate((name) => {
      const ranges = (CSS as unknown as { highlights?: Map<string, Set<Range>> }).highlights?.get(
        name,
      );
      return ranges ? [...ranges].map((range) => range.toString()) : [];
    }, name);
  await expect(toolbar).toHaveCount(0);
  const sentence = "In order to process the claim, please provide the evidence by Friday.";
  // Words the suggestion keeps keep their formatting.
  const evidence = sentence.indexOf("evidence");
  await selectText(document, "p", evidence, evidence + "evidence".length, 1);
  await page.keyboard.press("ControlOrMeta+b");
  await expect(written).toHaveValue(/the <strong>evidence<\/strong> by Friday/);
  await selectWhole(document, "p", 1);
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByText("12 words")).toBeVisible();
  await toolbar.getByRole("button", { name: "Shorten" }).click();
  await expect(toolbar.getByText("Writing a suggestion…")).toBeVisible();
  // The selection is kept while the suggestion is written, and moves with the text as the user
  // keeps typing before it.
  expect(await highlighted("x-govuk-ui-editor-held")).toEqual([sentence]);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.type("Note: ");
  await expect.poll(() => highlighted("x-govuk-ui-editor-held")).toEqual([sentence]);
  await expect(toolbar.locator(".x-govuk-ui-editor-ai-proposal")).toContainText(
    "To process the claim, provide the evidence by Friday.",
    { timeout: 5000 },
  );
  await toolbar.getByRole("button", { name: "Replace" }).click();
  await expect(written).toHaveValue(
    /<p>Note: To process the claim, provide the <strong>evidence<\/strong> by Friday\.<\/p>/,
  );
  expect(await highlighted("x-govuk-ui-editor-inserted")).toEqual([
    "To process the claim, provide the evidence by Friday.",
  ]);
  // An instruction the example cannot follow says so, and Escape closes the toolbar.
  await selectText(document, "p", 0, 12, 0);
  await toolbar.getByRole("button", { name: "Ask AI" }).click();
  await page.getByRole("textbox", { name: "Describe the change" }).fill("Translate to Welsh");
  await page.getByRole("button", { name: "Request suggestion" }).click();
  await expect(toolbar.getByRole("alert")).toContainText("can only shorten text", {
    timeout: 5000,
  });
  await page.keyboard.press("Escape");
  await expect(toolbar).toHaveCount(0);
  await page.waitForTimeout(400);
  await expect(toolbar).toHaveCount(0);
});

test("the editor keeps its toolbar to a row, edits its source, writes Markdown and takes one line", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("editor");
  const toolbar = frame.getByRole("toolbar", { name: "Formatting" });
  const written = frame.locator('input[name="notes"]');
  // The source is an editable Code block of the HTML, one block on each line, in the document's own
  // space. The toolbar stays there, greyed, and the source is read back as the document. Source is
  // in the example's toolbar from the start.
  await expect(
    page
      .getByRole("group", { name: "controls" })
      .getByRole("checkbox", { name: "Source", exact: true }),
  ).toBeChecked();
  const box = frame.locator(".x-govuk-ui-editor");
  const standing = (await box.boundingBox())!;
  const started = await written.inputValue();
  // A tip points at Source until the source is shown.
  const tip = page.locator(".x-govuk-ui-callout", { hasText: "See what it submits" });
  await expect(tip).toBeVisible();
  await toolbar.getByRole("button", { name: "Source" }).click();
  await expect(tip).toHaveCount(0);
  const source = frame.getByRole("textbox", {
    name: "Notes for the caseworker The document's source",
  });
  await expect(source).toBeFocused();
  const showing = (await box.boundingBox())!;
  expect(Math.abs(showing.height - standing.height)).toBeLessThan(2);
  expect(showing.width).toBe(standing.width);
  await expect(source).toHaveValue(
    /^<h2>Visit on 4 October<\/h2>\n<p>The applicant [^\n]*<\/p>\n<ul>\n {2}<li>the <a href/,
  );
  await expect(frame.locator(".x-govuk-ui-editor-source .x-govuk-ui-code-line-number")).toHaveCount(
    7,
  );
  await expect(toolbar.getByRole("button", { name: "Bold" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(toolbar.getByRole("button", { name: "Undo" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  // Typed at the end of the longest line, the text stays aligned with its colours. The region
  // scrolls to the caret, and the text box never scrolls by itself.
  await source.evaluate((element: HTMLTextAreaElement) => {
    const end = element.value.indexOf("</p>");
    element.setSelectionRange(end, end);
  });
  await page.keyboard.type(" They rang back on Tuesday.");
  await expect(
    frame.locator(".x-govuk-ui-editor-source .x-govuk-ui-code-block-code"),
  ).toContainText("rang back on Tuesday.");
  expect(await source.evaluate((element) => [element.scrollLeft, element.scrollTop])).toEqual([
    0, 0,
  ]);
  expect(
    await frame
      .locator(".x-govuk-ui-editor-source .x-govuk-ui-scroll-area-viewport")
      .evaluate((element) => element.scrollLeft),
  ).toBeGreaterThan(0);
  expect((await box.boundingBox())!.width).toBe(standing.width);
  // Laid out to read, the HTML reads back as it was written, except for what was typed.
  await toolbar.getByRole("button", { name: "Source" }).click();
  await expect(written).toHaveValue(
    started.replace("They asked about:</p>", "They asked about: They rang back on Tuesday.</p>"),
  );
  await toolbar.getByRole("button", { name: "Source" }).click();
  await source.fill("<h2>Fresh</h2><p>New <em>words</em></p>");
  await toolbar.getByRole("button", { name: "Source" }).click();
  await expect(
    frame.getByRole("textbox", { name: "Notes for the caseworker" }).locator("h2"),
  ).toHaveText("Fresh");
  await expect(written).toHaveValue("<h2>Fresh</h2><p>New <em>words</em></p>");
  // A long line of code in the document scrolls in its block, and the box keeps its width.
  await frame.getByRole("textbox", { name: "Notes for the caseworker" }).locator("p").click();
  await page.keyboard.type(" ".repeat(2) + "x".repeat(160));
  await toolbar.getByRole("button", { name: "Code", exact: true }).click();
  await expect(frame.locator(".x-govuk-ui-editor-content .x-govuk-ui-editor-code")).toHaveCount(1);
  expect((await box.boundingBox())!.width).toBe(standing.width);
  await toolbar.getByRole("button", { name: "Code", exact: true }).click();
  await expect(frame.locator(".x-govuk-ui-editor-content .x-govuk-ui-editor-code")).toHaveCount(0);
  // Markdown in, Markdown out.
  await playground.set("format", "Markdown");
  const document = frame.getByRole("textbox", { name: "Notes for the caseworker" });
  await expect(document.locator("h2")).toHaveText("Visit on 4 October");
  await caretAtEnd(document, "p", 1);
  await page.keyboard.type(" Done.");
  await expect(written).toHaveValue(
    /^## Visit on 4 October\n\nThe applicant \*\*confirmed\*\*[\s\S]*\n\n- the \[eligibility rules\]\(https:\/\/www\.gov\.uk\/\)\n- when a decision will come\n\nIn order to process the claim, please provide the evidence by Friday\. Done\.$/,
  );
  // One line takes no Enter.
  await playground.set("multiLine", false);
  await expect(document).toHaveAttribute("aria-multiline", "false");
  const before = await written.inputValue();
  await page.keyboard.press("Enter");
  await expect(written).toHaveValue(before);
  // As wide as a phone, the toolbar keeps to one row, and what has no space waits behind More.
  await page.getByRole("button", { name: "Phone preview" }).click();
  const phone = page.frameLocator('iframe[title="Editor, as on a phone"]');
  const narrow = phone.getByRole("toolbar", { name: "Formatting" });
  const more = narrow.getByRole("button", { name: "More formatting" });
  await expect(more).toBeVisible();
  const row = (await narrow.boundingBox())!;
  expect((await more.boundingBox())!.y).toBeLessThan(row.y + 12);
  await more.click();
  const rest = phone.getByRole("toolbar", { name: "More formatting" });
  await expect(rest.getByRole("button", { name: "Undo" })).toBeVisible();
  await rest.getByRole("button", { name: "Insert a divider" }).click();
  const small = phone.getByRole("textbox", { name: "Notes for the caseworker" });
  await expect(small.locator("hr")).toHaveCount(1);
  // Mod K opens the link's popover from the document, though the link control waits behind More.
  await page.keyboard.press("Escape");
  await small.locator("h2").click();
  await selectText(small, "h2", 0, 5, 0);
  await page.keyboard.press("ControlOrMeta+k");
  await phone.getByRole("textbox", { name: "Web address" }).fill("www.gov.uk");
  await page.keyboard.press("Enter");
  await expect(phone.locator('input[name="notes"]')).toHaveValue(
    /\[Visit\]\(https:\/\/www\.gov\.uk\)/,
  );
});

test("the radios' dot shows on the chosen answer, and jumps to follow a new one", async ({
  frame,
  open,
}) => {
  await open("radios");
  const dot = frame.locator(".x-govuk-ui-radio-dot");
  await frame.getByRole("radio", { name: "Email" }).check();
  await expect(dot).toHaveAttribute("data-shown", "");
  await frame.getByRole("radio", { name: "Phone" }).check();
  await expect
    .poll(async () => {
      const box = await frame
        .locator(".x-govuk-ui-choice-input:checked + .x-govuk-ui-choice-box")
        .boundingBox();
      const mark = await dot.boundingBox();
      return box && mark
        ? Math.abs(box.y + box.height / 2 - (mark.y + mark.height / 2)) < 1
        : false;
    })
    .toBe(true);
});

test("checkboxes clear around an exclusive answer and reveal a follow-up question", async ({
  frame,
  open,
}) => {
  await open("checkboxes");
  await frame.getByLabel("Farm or agricultural waste").check();
  await expect(frame.getByRole("textbox", { name: "Farm name" })).toBeVisible();
  await frame.getByLabel("None of these").check();
  await expect(frame.getByLabel("Farm or agricultural waste")).not.toBeChecked();
  await expect(frame.getByRole("textbox", { name: "Farm name" })).toBeHidden();
  await frame.getByLabel("Waste from mines or quarries").check();
  await expect(frame.getByLabel("None of these")).not.toBeChecked();
});

test("choices are chosen by their letter or number, and a last row takes any other answer", async ({
  page,
  frame,
  open,
  playground,
}) => {
  await open("choices");
  await frame.getByRole("radio", { name: "Email" }).focus();
  await page.keyboard.press("c");
  await expect(frame.getByRole("radio", { name: "Phone call" })).toBeChecked();
  await expect(frame.getByRole("radio", { name: "Phone call" })).toBeFocused();
  // The last row's letter goes to its words, and typing chooses it.
  await page.keyboard.press("e");
  const other = frame.getByRole("textbox", { name: "Another way…" });
  await expect(other).toBeFocused();
  await other.fill("Letter to my agent");
  await expect(frame.getByRole("radio", { name: "Phone call" })).not.toBeChecked();
  await expect(other).toHaveAttribute("name", "contact-other");
  // Numbers work the same way.
  await playground.set("markers", "Numbers");
  await frame.getByRole("radio", { name: "Email" }).focus();
  await page.keyboard.press("2");
  await expect(frame.getByRole("radio", { name: /Text message/ })).toBeChecked();
});

test("a date input fills its fields from its calendar, by keyboard", async ({
  page,
  frame,
  open,
}) => {
  await open("date-input");
  await frame.getByRole("button", { name: "Choose the date from a calendar" }).click();
  const calendar = page.getByRole("region", { name: "Choose the date" });
  await expect(calendar.locator('[aria-current="date"]')).toBeFocused();
  await page.keyboard.press("PageDown");
  await page.keyboard.press("Enter");
  await expect(frame.getByLabel("Month")).not.toHaveValue("");
  await expect(frame.getByRole("status")).toContainText("Your licence starts on");
  await expect(
    frame.getByRole("button", { name: "Choose the date from a calendar" }),
  ).toBeFocused();
  // An error wider than the fields wraps within their width, so they keep their horizontal place.
  const day = frame.getByRole("textbox", { name: "Day" });
  const before = (await day.boundingBox())!.x;
  await page
    .getByRole("group", { name: "Examples" })
    .getByRole("button", { name: "With an error" })
    .click();
  await expect(frame.locator(".x-govuk-ui-error")).toBeVisible();
  expect(Math.abs((await day.boundingBox())!.x - before)).toBeLessThan(1);
});

test("a calendar closed while its month list is open raises no resize loop", async ({
  page,
  frame,
  open,
}) => {
  // The browser reports a loop of resize observers as an error event, not a thrown error.
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.assign(window, { seenErrors: seen });
    window.addEventListener("error", (event) => seen.push(event.message));
  });
  await open("date-input");
  await frame.getByRole("button", { name: "Choose the date from a calendar" }).click();
  const calendar = page.getByRole("region", { name: "Choose the date" });
  await calendar.locator(".x-govuk-ui-select-trigger").first().click();
  const list = page.locator(".x-govuk-ui-select-popup");
  await expect(list).toBeVisible();
  await list.hover();
  await page.mouse.wheel(0, 240);
  // A press outside closes the list and the calendar together, which shrinks away.
  await page.mouse.click(40, 860);
  await expect(calendar).toHaveCount(0);
  await expect(list).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { seenErrors: string[] }).seenErrors),
  ).toEqual([]);
});

test("a long list's highlight follows the keys and the wheel, never against them, and keeps to its row while a key is held", async ({
  page,
  frame,
  open,
}) => {
  await open("date-input");
  await frame.getByRole("button", { name: "Choose the date from a calendar" }).click();
  const calendar = page.getByRole("region", { name: "Choose the date" });
  await calendar.locator(".x-govuk-ui-select-trigger").first().click();
  // The keys start at once, while the list is still growing into place.
  await expect(page.locator(".x-govuk-ui-select-popup")).toBeVisible();
  // For each frame, where the highlight and the highlighted row are in the list's box, and how far
  // the list has scrolled.
  type Frame = { mark: number; row: number; scroll: number; phase: string };
  await page.evaluate(() => {
    const mark = document.querySelector(".x-govuk-ui-select-highlight")!;
    let scroller = mark.parentElement;
    while (scroller && !/auto|scroll/.test(getComputedStyle(scroller).overflowY))
      scroller = scroller.parentElement;
    const frames: Frame[] = [];
    Object.assign(window, { frames_: frames, scroller_: scroller, phase_: "down" });
    const tick = () => {
      const row = document.querySelector(".x-govuk-ui-select-item[data-highlighted]");
      if (row && scroller) {
        const top = scroller.getBoundingClientRect().top;
        frames.push({
          mark: mark.getBoundingClientRect().top - top,
          row: row.getBoundingClientRect().top - top,
          scroll: scroller.scrollTop,
          phase: (window as unknown as { phase_: string }).phase_,
        });
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const phase = (name: string) =>
    page.evaluate((name) => Object.assign(window, { phase_: name }), name);
  // Keys pressed one by one down the list, faster than the highlight glides. It chases its row.
  await phase("down");
  for (let press = 0; press < 11; press++) {
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(30);
  }
  await phase("down, at rest");
  await page.waitForTimeout(400);
  // A key held up the list. The first press glides, and each repeat, as the browser marks it, goes
  // to its row at once, as a native menu's does. The highlight is therefore on its row in every
  // frame, including the frames the list scrolls in.
  await phase("up");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(250);
  await phase("up, held");
  for (let repeat = 0; repeat < 10; repeat++) {
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(30);
  }
  await page.keyboard.up("ArrowUp");
  await phase("up, at rest");
  await page.waitForTimeout(400);
  // The wheel, with no key. The highlight rides with its row.
  await phase("wheel");
  for (let turn = 0; turn < 4; turn++) {
    await page.evaluate(() => {
      (window as unknown as { scroller_: HTMLElement }).scroller_.scrollTop += 37;
    });
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(200);
  const frames = await page.evaluate(() => (window as unknown as { frames_: Frame[] }).frames_);
  const against: string[] = [];
  const off: string[] = [];
  frames.forEach((now, index) => {
    const before = frames[index - 1];
    if (!before) return;
    const move = now.mark - before.mark;
    if (
      (now.phase === "down" && move < -0.5) ||
      (now.phase.startsWith("up") && !now.phase.includes("rest") && move > 0.5)
    )
      against.push(`${now.phase} ${move.toFixed(1)}`);
    if (now.phase === "up, held" && Math.abs(now.mark - now.row) > 0.5)
      off.push(`${now.phase} ${(now.mark - now.row).toFixed(1)}`);
    if (now.phase === "wheel" && Math.abs(now.mark - now.row) > 0.5 && now.scroll === before.scroll)
      off.push(`${now.phase} ${(now.mark - now.row).toFixed(1)}`);
  });
  expect(frames.filter((frame) => frame.phase === "wheel").length).toBeGreaterThan(5);
  expect(against).toEqual([]);
  // Once the keys stop and the glide ends, and the whole time the wheel turns, it is on its row.
  const last = (name: string) => frames.filter((frame) => frame.phase === name).at(-1)!;
  for (const name of ["down, at rest", "up, at rest", "wheel"])
    expect(Math.abs(last(name).mark - last(name).row)).toBeLessThan(0.5);
  expect(off).toEqual([]);
  // The held key scrolled the list, so the frames it scrolled in were checked too.
  const held = frames.filter((frame) => frame.phase === "up, held");
  expect(new Set(held.map((frame) => frame.scroll)).size).toBeGreaterThan(1);
});

test("a date input's fields are dials: an empty one starts from today, and a drag ends where it is let go", async ({
  page,
  frame,
  open,
}) => {
  // The drag ends where it is let go, so the pointer passing over later does not change the field.
  await open("date-input");
  const year = frame.getByRole("textbox", { name: "Year" });
  const place = (await year.boundingBox())!;
  const x = place.x + place.width / 2;
  const y = place.y + place.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step++) await page.mouse.move(x, y + step * 8);
  await page.mouse.move(x + 300, y + 64);
  await page.mouse.up();
  const thisYear = new Date().getFullYear();
  await expect(year).toHaveValue(String(thisYear - 2));
  await page.mouse.move(x, y - 20);
  await page.mouse.move(x, y + 20);
  await expect(year).toHaveValue(String(thisYear - 2));
  await expect(frame.locator(".x-govuk-ui-dial[data-showing]")).toHaveCount(0);
});

test("a time input turns like a dial when dragged or stepped, and takes typing", async ({
  page,
  frame,
  open,
}) => {
  await open("time-input");
  const hour = frame.getByRole("textbox", { name: "Hour" });
  const minute = frame.getByRole("textbox", { name: "Minute" });
  // Dragging up advances the values, one for each 28 pixels, and settles on the nearest.
  const box = (await hour.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 10; step++)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - step * 9);
  await page.mouse.up();
  await expect(hour).toHaveValue("03");
  await expect(hour).toBeFocused();
  // The arrow keys step it, by 5 minutes here. Up goes to the value above on the drum, Down to the
  // one below, and the values wrap around. The first press on an empty field shows where it
  // starts.
  await minute.focus();
  for (let press = 0; press < 3; press++) await page.keyboard.press("ArrowDown");
  await expect(minute).toHaveValue("10");
  // The drum centres on its field, not on the wider label above it.
  const drum = minute.locator(
    "xpath=following-sibling::*[contains(@class, 'x-govuk-ui-dial-drum')]",
  );
  const [field, turning] = await Promise.all([minute.boundingBox(), drum.boundingBox()]);
  expect(Math.abs(field!.x + field!.width / 2 - (turning!.x + turning!.width / 2))).toBeLessThan(1);
  for (let press = 0; press < 4; press++) await page.keyboard.press("ArrowUp");
  await expect(minute).toHaveValue("50");
  await expect(frame.getByRole("status")).toHaveText("Your appointment starts at 3:50am.");
  // A press without a drag selects the value, ready to type over.
  await minute.click();
  await expect(minute).toBeFocused();
  expect(await minute.evaluate((field: HTMLInputElement) => field.selectionEnd)).toBe(2);
  // Typing accepts any minute, tidied once the field is left.
  await minute.fill("7");
  await hour.focus();
  await expect(minute).toHaveValue("07");
});

test("a file upload lists and removes files", async ({ frame, open }) => {
  await open("file-upload");
  await frame
    .locator('input[type="file"]')
    .setInputFiles([{ name: "passport.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(2048) }]);
  await expect(frame.locator(".x-govuk-ui-file-upload-name")).toHaveText("passport.jpg");
  await frame.getByRole("button", { name: "Remove passport.jpg" }).click();
  await expect(frame.getByText("No file chosen")).toBeVisible();
});

test("a combobox narrows as people type", async ({ page, frame, open }) => {
  await open("combobox");
  await frame.getByRole("combobox", { name: "Which country do you live in?" }).fill("uni");
  await expect(page.getByRole("option")).toHaveCount(3);
  await page.getByRole("option", { name: "United Kingdom" }).click();
  await expect(frame.getByRole("status")).toHaveText("You chose United Kingdom.");
});

test("a multi-select adds chips, which can be removed", async ({ page, frame, open }) => {
  await open("multi-select");
  const multi = frame.getByRole("combobox", { name: "Which languages do you speak?" });
  await multi.fill("wel");
  await page.getByRole("option", { name: "Welsh" }).click();
  await expect(frame.locator(".x-govuk-ui-chip")).toHaveText(["English", "Welsh"]);
  await frame.getByRole("button", { name: "Remove English" }).click();
  await expect(frame.locator(".x-govuk-ui-chip")).toHaveText(["Welsh"]);
});

test("filter chips filter, keep their width, and share one shape behind chosen neighbours", async ({
  page,
  frame,
  open,
}) => {
  await open("filter-chips");
  const approved = frame.getByRole("button", { name: /^Approved/ });
  const width = (await approved.boundingBox())!.width;
  await approved.click();
  await expect(approved).toHaveAttribute("aria-pressed", "true");
  await expect(frame.getByRole("status")).toHaveText("Showing 31 applications");
  // A chip keeps its width as it turns on.
  expect((await approved.boundingBox())!.width).toBe(width);
  // Chosen neighbours share one shape behind them, and the chips never move.
  const waiting = frame.getByRole("button", { name: /^Waiting for evidence/ });
  const left = (await waiting.boundingBox())!.x;
  const tracks = frame.locator(".x-govuk-ui-filter-chips-track");
  await waiting.click();
  await expect(tracks).toHaveCount(1);
  const review = (await frame.getByRole("button", { name: /^In review/ }).boundingBox())!;
  const end = (await approved.boundingBox())!;
  // The shape comes to rest over the chips from In review to Approved. Its edges are drawn to whole
  // pixels, so they may sit a pixel either way.
  await expect
    .poll(async () => {
      const track = (await tracks.boundingBox())!;
      return (
        Math.abs(track.x - review.x) <= 1 &&
        Math.abs(track.x + track.width - (end.x + end.width)) <= 1
      );
    })
    .toBe(true);
  expect((await waiting.boundingBox())!.x).toBe(left);
  await waiting.click();
  await expect(tracks).toHaveCount(2);
  // A chip left under the pointer removes the colour from its shape at once, so no blue is left
  // beneath it to show through when the pointer moves away.
  await approved.click();
  await expect(tracks).toHaveCount(1);
  await page.mouse.move(0, 0);
  await expect(tracks).toHaveCount(1);
});

test("a slider steps by its step with the arrow keys and says its value in its unit", async ({
  page,
  frame,
  open,
}) => {
  await open("slider");
  const slider = frame.getByRole("slider", { name: "Search radius" });
  await expect(slider).toHaveAttribute("aria-valuenow", "10");
  await expect(frame.getByRole("status")).toHaveText("10 km");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "15");
  await expect(frame.getByRole("status")).toHaveText("15 km");
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", "50");
  await page.keyboard.press("Home");
  await expect(slider).toHaveAttribute("aria-valuenow", "5");
});

test("a one-time code is checked once every slot is filled, clears when wrong and accepts when right", async ({
  frame,
  open,
}) => {
  await open("input-otp");
  const code = frame.getByRole("textbox", { name: "Security code" });
  await code.fill("000000");
  await expect(frame.getByText("The code is incorrect. Check it and try again.")).toBeVisible();
  await expect(code).toHaveValue("");
  // Typing again starts a new attempt, so the error disappears.
  await code.fill("4");
  await expect(frame.getByText("The code is incorrect", { exact: false })).toHaveCount(0);
  await code.fill("482913");
  await expect(frame.getByRole("status")).toHaveText(
    "Code accepted. No verification request was sent.",
  );
});

test("a search box searches on Enter or its button, and asks for something to search for", async ({
  frame,
  open,
}) => {
  await open("search-box");
  const box = frame.getByRole("searchbox", { name: "Search GOV.UK" });
  await box.press("Enter");
  await expect(frame.getByRole("status")).toHaveText("Enter something to search for.");
  await box.fill("passport");
  await frame.getByRole("button", { name: "Search" }).click();
  await expect(frame.getByRole("status")).toHaveText("You searched for “passport”.");
});

test("a switch turns with a press or Space, and says what it did", async ({
  page,
  frame,
  open,
}) => {
  await open("switch");
  const toggle = frame.getByRole("switch", { name: "Email notifications" });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await expect(frame.getByRole("status")).toHaveText("Email notifications are off.");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(toggle).toBeChecked();
  await expect(frame.getByRole("status")).toHaveText("Email notifications are on.");
});

test("a toggle group presses one at a time, or several once told to", async ({
  frame,
  open,
  playground,
}) => {
  await open("toggle-group");
  const week = frame.getByRole("button", { name: "Week" });
  const month = frame.getByRole("button", { name: "Month" });
  await expect(week).toHaveAttribute("aria-pressed", "true");
  await month.click();
  await expect(month).toHaveAttribute("aria-pressed", "true");
  await expect(week).toHaveAttribute("aria-pressed", "false");
  await expect(frame.getByRole("status")).toHaveText("Showing appointments by month.");
  await playground.set("multiple", true);
  await frame.getByRole("button", { name: "Day" }).click();
  await expect(frame.getByRole("button", { name: "Day" })).toHaveAttribute("aria-pressed", "true");
  await expect(month).toHaveAttribute("aria-pressed", "true");
});
