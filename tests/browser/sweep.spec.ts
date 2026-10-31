import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { componentNames } from "../../site/catalogue";
import { spaced as spacedParts } from "../types/exceptions";

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

// The computed properties that make up how a part looks, as a style snapshot records them. Layout's
// own sizes, transforms and opacity are left out, because they follow the content and the motion.
const looks = [
  "display",
  "font-size",
  "font-weight",
  "font-style",
  "line-height",
  "letter-spacing",
  "text-transform",
  "text-decoration-line",
  "text-decoration-thickness",
  "text-underline-offset",
  "color",
  "background-color",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "row-gap",
  "column-gap",
  "min-width",
  "min-height",
  "max-width",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "box-shadow",
];

/**
 * How each part of a component looks in its example, as the computed styles of the first element
 * with each class in its styling contract. They are CSS's computed values, not the sizes the layout
 * resolves them to, so an `auto` margin stays `auto` on every platform. Values that say nothing is
 * set, such as 0px or none, are left out, and a border is recorded only on a side that has one. The
 * text is a style snapshot. A change to it is a change to how a part looks, which the changelog
 * lists under Visual.
 */
async function styles(page: Page, name: string) {
  const contract = JSON.parse(readFileSync(`dist/docs/${name}.json`, "utf8")).styling as {
    parts: { classes: string[]; inner: string[] }[];
  };
  const classes = [
    ...new Set(contract.parts.flatMap((part) => [...part.classes, ...part.inner])),
  ].filter((name) => !name.includes("{"));
  return page.evaluate(
    ({ classes, looks }) => {
      const empty = new Set(["0px", "none", "normal", "auto", "rgba(0, 0, 0, 0)"]);
      const lines: string[] = [];
      for (const name of [...classes].sort()) {
        const element = document.querySelector(`.preview-stage .${name}`);
        if (!element) continue;
        const style = element.computedStyleMap();
        const value = (property: string) => style.get(property)?.toString() ?? "";
        lines.push(`.${name}`);
        for (const property of looks)
          if (!empty.has(value(property))) lines.push(`  ${property}: ${value(property)}`);
        for (const side of ["top", "right", "bottom", "left"]) {
          const kind = value(`border-${side}-style`);
          if (kind === "none") continue;
          lines.push(
            `  border-${side}: ${value(`border-${side}-width`)} ${kind} ${value(`border-${side}-color`)}`,
          );
        }
      }
      return `${lines.join("\n")}\n`;
    },
    { classes, looks },
  );
}

/**
 * What the styling contracts say about classes. Each part has its own classes, which every element
 * it renders carries, and a component may put classes on elements inside its parts. A class written
 * with a placeholder, such as `x-govuk-ui-button--{variant}`, is a pattern.
 */
const contractClasses = (() => {
  const parts: { name: string; component: string; classes: string[] }[] = [];
  const inner: Record<string, string[]> = {};
  const patterns: string[] = [];
  for (const component of componentNames) {
    const contract = JSON.parse(readFileSync(`dist/docs/${component}.json`, "utf8")).styling as {
      parts: { name: string; classes: string[]; inner: string[] }[];
    };
    for (const part of contract.parts) {
      const own = part.classes.filter((name) => !name.includes("{"));
      if (own.length > 0) parts.push({ name: part.name, component, classes: own });
      for (const name of part.inner) inner[name] = [...(inner[name] ?? []), component];
      for (const name of [...part.classes, ...part.inner])
        if (name.includes("{")) patterns.push(`^${name.replace(/\{\w+\}/g, "[a-z0-9-]+")}$`);
    }
  }
  return { parts, inner, patterns };
})();

/**
 * Parts that set space outside their own box, as "class margin-top margin-bottom". The box a part
 * sits in sets the space around it, as a Stack does, so a part has no margin above or below of its
 * own.
 *
 * Each part's element in the example is drawn again alone, at the end of the page, with its tag,
 * its classes from the contracts and its data attributes. Its margins there are its own,
 * from the library's rules or the browser's. A box that spaces it, such as a Page around its Back
 * link, is not there to do so.
 *
 * A component lays out its own parts, as a Figure spaces its key, so a part inside a part of its
 * own component is left out. An element is a component's part when it carries all of the own
 * classes of one of the component's parts. Matching all of a part's classes, not one, keeps a
 * shared class apart from its part, such as the stack's class on a GridColumn from a
 * DialogContent's. A part also belongs to a component that puts a class of its own on it, as Date
 * input does on its Button. A wrapper with only such a class is no part, so a Table inside its own
 * scroll box is still checked. The search stops at the example's edge.
 */
async function spaced(page: Page) {
  return page.evaluate(
    ({ parts, inner, patterns, allowed }) => {
      const matchers = patterns.map((pattern) => new RegExp(pattern));
      const named = new Set([...parts.flatMap(({ classes }) => classes), ...Object.keys(inner)]);
      const known = (element: Element) =>
        [...element.classList].filter(
          (name) => named.has(name) || matchers.some((matcher) => matcher.test(name)),
        );
      const partsOf = (element: Element) =>
        parts.filter(({ classes }) => classes.every((name) => element.classList.contains(name)));
      const componentsOf = (element: Element) =>
        new Set([
          ...partsOf(element).map(({ component }) => component),
          ...[...element.classList].flatMap((name) => inner[name] ?? []),
        ]);
      const out = new Set<string>();
      const example = document.querySelector(".preview-example");
      for (const element of example?.querySelectorAll("[class*='x-govuk-ui-']") ?? []) {
        // An element inside a part that is no part itself is placed by its component.
        const classes = known(element);
        if (partsOf(element).length === 0 || classes.some((name) => allowed.includes(name)))
          continue;
        const mine = componentsOf(element);
        let inside = false;
        for (
          let around = element.parentElement;
          around && around !== example && !inside;
          around = around.parentElement
        )
          inside = partsOf(around).some(({ component }) => mine.has(component));
        if (inside) continue;
        const alone = document.createElement(element.tagName);
        alone.className = classes.join(" ");
        for (const { name, value } of element.attributes)
          if (name.startsWith("data-")) alone.setAttribute(name, value);
        document.body.append(alone);
        const { marginTop, marginBottom } = getComputedStyle(alone);
        alone.remove();
        if (marginTop !== "0px" || marginBottom !== "0px")
          out.add(`.${classes[0]} ${marginTop} ${marginBottom}`);
      }
      return [...out];
    },
    {
      ...contractClasses,
      allowed: contractClasses.parts
        .filter(({ name }) => name in spacedParts)
        .flatMap(({ classes }) => classes),
    },
  );
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

/**
 * The parts in the preview that keep rounded corners with every token for corners at 0, as
 * "class corner". GOV.UK Frontend's corners are square, and the tokens promise a service can have
 * them. Circles and pills keep their shape, as a box rounded by half its height or more. Small
 * marks of 3px or less keep theirs, and so do chat bubbles, which take a token of their own.
 */
async function rounded(page: Page) {
  return page.evaluate(() => {
    const square = document.createElement("style");
    square.textContent = `:root {
      --x-govuk-ui-radius-small: 0px;
      --x-govuk-ui-radius-control: 0px;
      --x-govuk-ui-radius-surface: 0px;
      --x-govuk-ui-radius-large: 0px;
    }`;
    document.head.append(square);
    const corners = [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomRightRadius",
      "borderBottomLeftRadius",
    ] as const;
    const out = new Set<string>();
    for (const element of document.querySelectorAll<HTMLElement>(
      ".preview-stage [class*='x-govuk-ui-']",
    )) {
      if (element.closest(".x-govuk-ui-bubble-content")) continue;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      for (const corner of corners) {
        const value = style[corner];
        if (value.includes("%")) continue;
        const radius = Number.parseFloat(value);
        if (!radius || radius <= 3 || radius >= Math.min(box.width, box.height) / 2 - 0.5) continue;
        const name = [...element.classList].find((each) => each.startsWith("x-govuk-ui-"));
        out.add(`${name} ${value}`);
      }
    }
    square.remove();
    return [...out];
  });
}

test("the check for margins finds a Table's margin inside its own scroll box", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Engines compute margins alike, so Chromium checks.");
  await page.goto("/workbench/table");
  await ready(page);
  await page.addStyleTag({ content: ".x-govuk-ui-table { margin-bottom: 30px; }" });
  expect(await spaced(page)).toContain(".x-govuk-ui-table 0px 30px");
});

test("the check for margins finds a part's own margin, and leaves a box's space alone", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Engines compute margins alike, so Chromium checks.");
  await page.goto("/workbench/page");
  await ready(page);
  // The Back link has 15 pixels above and below it from the Page, which is the Page's space.
  expect(await spaced(page)).toEqual([]);
  // A Button in the Form in a GridColumn is a part of another component inside a box that stacks,
  // and a margin of its own is found.
  await page.addStyleTag({ content: ".x-govuk-ui-button { margin-bottom: 22px; }" });
  expect(await spaced(page)).toContain(".x-govuk-ui-button 0px 22px");
});

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
    // Every check on this page sees the example as it starts, on a fast machine or a slow one. An
    // example that changes by itself, such as Task list working through its tasks or Logo carousel
    // turning over, paces itself with intervals and long timeouts, which do nothing here. Axe would
    // otherwise read a logo's colours part way through its fade. Stopping the clock instead would
    // also stop CSS's transitions, which never finish.
    await page.addInitScript(() => {
      const timeout = window.setTimeout;
      window.setInterval = (() => 0) as unknown as typeof window.setInterval;
      window.setTimeout = ((handler: TimerHandler, delay?: number, ...rest: unknown[]) =>
        (delay ?? 0) >= 500 ? 0 : timeout(handler, delay, ...rest)) as typeof window.setTimeout;
    });
    await page.goto(path);
    await ready(page);
    await test.step("accessible in light", async () => {
      expect(await violations(page, undefined, sidebar)).toEqual([]);
    });
    if (browserName !== "chromium") return;
    // Engines compute styles alike, so Chromium alone records them, in light.
    if (example)
      await test.step("looks as its style snapshot records", async () => {
        expect(await styles(page, name)).toMatchSnapshot(`${name}.txt`);
        expect(await rounded(page), "rounded with the corners' tokens at 0").toEqual([]);
        expect(await spaced(page), "spaced by margins of their own").toEqual([]);
      });
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
      await test.step("text fits in Noto Sans", async () => {
        expect(await clipped(page)).toEqual([]);
      });
    // The build is set in Noto Sans. A wide typeface stands in for whichever a service chooses, so
    // no box is sized to one font. It is set before the page loads, as a service's
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
        expect(await spaced(phone), "spaced by margins of their own").toEqual([]);
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
