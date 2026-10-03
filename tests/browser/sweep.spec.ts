import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { componentNames } from "../../site/catalogue";

// Every page is swept once, for accessibility in both themes, and for text that fits its box in
// any typeface. The whole sweep is static, so it runs only in the sweep projects, not once for
// each browser. Each engine does only what it alone can tell us. Axe reads the DOM and computed
// styles, which the engines agree on, with one exception. Base UI renders some of its parts
// differently in Safari. Chromium therefore does the whole sweep, and WebKit checks the page as it
// opens. Dark changes only colours, which are the same CSS in any engine, and the fit check is the
// layout's arithmetic, so neither needs a second engine.

const wcag = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

// Changing theme changes colours and nothing else in the markup, so the dark pass needs only the
// rules that read colours.
const colourRules = ["color-contrast", "link-in-text-block"];

async function ready(page: Page) {
  await expect(page.locator(".preview-example, .landing, .home, .workspace").first()).toBeVisible();
  // Colours ease between themes and text can fade in, such as Streaming text's words, so contrast
  // is checked once every transition and finite animation has finished.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            // Chrome lists a finished transition until the element is next styled. On a scrollbar
            // faded out of sight, that can be seconds, so only those still running count.
            .filter(
              (animation) =>
                animation.playState !== "finished" &&
                (animation instanceof CSSTransition ||
                  (animation instanceof CSSAnimation &&
                    animation.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY)),
            ).length,
      ),
    )
    .toBe(0);
}

async function violations(page: Page, rules?: string[], sidebar = true) {
  let builder = new AxeBuilder({ page })
    // Base UI's focus guards are hidden spans around an open popup. In WebKit, they take the role
    // of a button on purpose, so VoiceOver's cursor triggers the focus trap, and axe asks them for
    // a name. They are Base UI's, never seen, and correct as they are.
    .exclude("[data-base-ui-focus-guard]");
  if (!sidebar) builder = builder.exclude(".workbench-sidebar");
  builder = rules ? builder.withRules(rules) : builder.withTags(wcag);
  return (await builder.analyze()).violations;
}

/**
 * Text in the preview that is cut short by its box, as "selector scrollWidth>clientWidth". A field
 * counts, because a field sized to its value, such as a date's day, must show it whole. Set
 * `fields` to false to skip fields, because a field as wide as a phone scrolls a long value, such
 * as an address, as any field does.
 */
async function clipped(page: Page, { fields = true } = {}) {
  await page.locator(".preview-frame").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate((fields) => {
    // Dials show their longest values, as a date or a time would.
    const fill = (selector: string, value: string) => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      for (const field of document.querySelectorAll<HTMLInputElement>(
        `.preview-frame ${selector}`,
      )) {
        set.call(field, value);
        field.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
    fill("input[id$='-day'], input[id$='-month'], input[id$='-hour'], input[id$='-minute']", "28");
    fill("input[id$='-year']", "2026");
    return new Promise<string[]>((resolve) =>
      requestAnimationFrame(() => {
        const out: string[] = [];
        for (const element of document.querySelectorAll<HTMLElement>(".preview-frame *")) {
          // Text kept only for screen readers is clipped on purpose.
          if (element.clientWidth <= 2 || element.closest(".x-govuk-ui-visually-hidden")) continue;
          const style = getComputedStyle(element);
          const field =
            fields &&
            element instanceof HTMLInputElement &&
            !["checkbox", "radio", "range", "file", "hidden"].includes(element.type);
          const line =
            ["hidden", "clip"].includes(style.overflowX) && style.whiteSpace.includes("nowrap");
          if (!(field || line) || style.textOverflow === "ellipsis") continue;
          // A box with no text, such as the Orb's, has none to cut short.
          if (!field && !element.textContent?.trim()) continue;
          if (element.scrollWidth > element.clientWidth + 1)
            out.push(
              `${element.id || element.className} ${element.scrollWidth}>${element.clientWidth}`,
            );
        }
        resolve(out);
      }),
    );
  }, fields);
}

/**
 * What runs past the preview's edge, and so past the screen. That is the distance the preview
 * scrolls sideways, and the elements past its edge that nothing inside scrolls or clips. A table
 * in its own Scroll area, for example, is scrolled, so it does not count.
 */
async function overflowing(page: Page) {
  await page.locator(".preview-frame").waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const out: string[] = [];
    const preview = document.querySelector<HTMLElement>(
      ".preview-frame > .x-govuk-ui-scroll-area-viewport",
    )!;
    const stage = document.querySelector<HTMLElement>(".preview-stage")!;
    if (preview.scrollWidth > preview.clientWidth + 1)
      out.push(`the preview scrolls ${preview.scrollWidth - preview.clientWidth}px sideways`);
    const edge = stage.getBoundingClientRect().right;
    for (const element of stage.querySelectorAll<Element>("*")) {
      const box = element.getBoundingClientRect();
      if (!box.width || box.right <= edge + 1 || element.closest(".x-govuk-ui-visually-hidden"))
        continue;
      let kept = false;
      for (
        let parent = element.parentElement;
        parent && parent !== stage;
        parent = parent.parentElement
      )
        if (/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowX)) kept = true;
      if (!kept)
        out.push(`${element.className || element.tagName} ${Math.round(box.right - edge)}px past`);
    }
    return out.slice(0, 5);
  });
}

// The site's pages, the workbench's own page and every component's page.
const pages = [
  ["the front page", "/"],
  ["the workspace", "/workspace"],
  ["the not-found page", "/not-a-page"],
  ["the workbench", "/workbench"],
  ...componentNames.map((name) => [name, `/workbench/${name}`]),
] as const;

for (const [name, path] of pages) {
  const example = path.startsWith("/workbench/");
  // The workbench's sidebar is the same on every component's page except for which entry is
  // current, and it is most of what axe reads there. Axe therefore reads it on the workbench's own
  // page, with none current, and on the first component's, with one, and leaves it out of the rest.
  const sidebar = !example || name === componentNames[0];
  test(`${name} is accessible in both themes${example ? ", and its text fits any typeface" : ""}`, async ({
    page,
    browserName,
  }) => {
    await page.addInitScript(() => localStorage.setItem("x-govuk-ui-theme", '"light"'));
    await page.goto(path);
    await ready(page);
    await test.step("accessible in light", async () => {
      expect(await violations(page, undefined, sidebar)).toEqual([]);
    });
    if (browserName !== "chromium") return;
    await test.step("colours contrast in dark", async () => {
      // The theme is kept in the browser. A component's page follows it as it changes, such as when
      // it is chosen in another tab. The page therefore turns dark where it is, with nothing
      // pressed that would close what it has open. A page with no switch opens in the theme.
      await page.evaluate(() => localStorage.setItem("x-govuk-ui-theme", '"dark"'));
      if (example) {
        await page.evaluate(() =>
          window.dispatchEvent(new StorageEvent("storage", { key: "x-govuk-ui-theme" })),
        );
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      } else await page.reload();
      await ready(page);
      expect(await violations(page, colourRules, sidebar)).toEqual([]);
    });
    // The fit check fills the dials, so it comes after axe has seen the page as it opens, in both
    // themes. It is the layout's arithmetic, which the theme does not change.
    if (example)
      await test.step("text fits in Roboto", async () => {
        expect(await clipped(page)).toEqual([]);
      });
    // The build's Roboto has narrow figures. A wide typeface stands in for whichever a service
    // chooses, so no box is sized to one font. It is set before the page loads, as a service's
    // stylesheet would be, so anything that measures text at mount measures it in that face.
    if (example)
      await test.step("text fits in a wide typeface", async () => {
        const wide = await page.context().newPage();
        await wide.addInitScript(() =>
          document.addEventListener("DOMContentLoaded", () => {
            const style = document.createElement("style");
            style.textContent =
              ':root { --x-govuk-ui-font: Verdana, "DejaVu Sans", sans-serif !important; }';
            document.head.append(style);
          }),
        );
        await wide.goto(path);
        expect(await clipped(wide)).toEqual([]);
        await wide.close();
      });
    // On the narrowest screen WCAG asks a page to work on, which is 320 pixels, nothing runs past
    // the screen and no line is cut short.
    if (example)
      await test.step("fits a phone 320 pixels wide", async () => {
        const phone = await page.context().newPage();
        await phone.setViewportSize({ width: 320, height: 800 });
        await phone.goto(path);
        await ready(phone);
        expect(await overflowing(phone)).toEqual([]);
        expect(await clipped(phone, { fields: false })).toEqual([]);
        await phone.close();
      });
    // What a page shows only once it is used is checked as it shows, where the page alone would
    // never show it. That is the Editor's attachment and its suggestions' toolbar.
    if (name === "editor")
      await test.step("an attachment and the suggestions' toolbar are accessible and fit", async () => {
        const used = await page.context().newPage();
        await used.addInitScript(() => localStorage.setItem("x-govuk-ui-theme", '"light"'));
        await used.goto(path);
        await ready(used);
        await used.getByRole("switch", { name: "ai", exact: true }).setChecked(true);
        const frame = used.locator(".preview-frame");
        const document = frame.getByRole("textbox").first();
        await document.evaluate((element) => {
          const range = window.document.createRange();
          range.selectNodeContents(element.querySelectorAll("p")[1]!);
          range.collapse(false);
          window.getSelection()!.removeAllRanges();
          window.getSelection()!.addRange(range);
          (element as HTMLElement).focus();
        });
        const chooser = used.waitForEvent("filechooser");
        await frame.getByRole("button", { name: "Add an image or video" }).click();
        await (await chooser).setFiles([
          {
            name: "form.png",
            mimeType: "image/png",
            buffer: Buffer.from(
              "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=",
              "base64",
            ),
          },
        ]);
        await expect(document.locator("figure progress")).toHaveCount(0, { timeout: 5000 });
        await document.evaluate((element) => {
          const range = window.document.createRange();
          range.selectNodeContents(element.querySelectorAll("p")[0]!);
          window.getSelection()!.removeAllRanges();
          window.getSelection()!.addRange(range);
        });
        await expect(used.getByRole("group", { name: "Suggest an edit" })).toBeVisible();
        await ready(used);
        expect(await violations(used)).toEqual([]);
        expect(await clipped(used)).toEqual([]);
        await used.close();
      });
  });
}
