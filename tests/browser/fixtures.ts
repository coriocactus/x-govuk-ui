import { test as base, expect, type Locator, type Page } from "@playwright/test";
import type { ComponentName } from "../../site/catalogue";

/** The playground's controls, each labelled with its prop's own name. */
export class Playground {
  constructor(private readonly page: Page) {}

  switch(name: string) {
    return this.page.getByRole("switch", { name, exact: true });
  }

  select(name: string) {
    return this.page.getByRole("combobox", { name, exact: true });
  }

  number(name: string) {
    return this.page.getByRole("spinbutton", { name, exact: true });
  }

  text(name: string) {
    return this.page.getByRole("textbox", { name, exact: true });
  }

  /**
   * Sets a prop. A boolean turns its switch, a number fills its field, and a string or pattern
   * picks its option.
   */
  async set(name: string, value: boolean | number | string | RegExp) {
    if (typeof value === "boolean") await this.switch(name).setChecked(value);
    else if (typeof value === "number") await this.number(name).fill(String(value));
    else {
      await this.select(name).click();
      await this.page.getByRole("option", { name: value }).click();
      // The list is gone before the next setting is touched, so its options are not found again.
      await expect(this.page.getByRole("listbox")).toHaveCount(0);
    }
  }
}

type Fixtures = {
  /** The preview frame, where the example renders. */
  frame: Locator;
  /** Opens a component's page in the workbench. */
  open: (name: ComponentName) => Promise<void>;
  /** The playground beside the preview. */
  playground: Playground;
  /** Errors the page threw. Every test ends by checking there were none. */
  pageErrors: string[];
};

export const test = base.extend<Fixtures>({
  // A headless browser plays sounds through the speakers. Every page's Web Audio plays into
  // silence instead. Its destination is a gain of zero on the way to the speakers, and each voice
  // is counted in window.voices. A test can then turn the sounds on and see that one played
  // without anyone hearing it. Pages still open with the sounds off, because most tests do not
  // listen.
  //
  // Anything the server's security policy blocks is thrown as the page's error, so the test that
  // met it fails. The policy must allow everything the site does.
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        setTimeout(() => {
          throw new Error(
            `The security policy's ${event.effectiveDirective} blocked ${event.blockedURI || "an inline part"}`,
          );
        });
      });
      localStorage.setItem("x-govuk-ui-muted", "true");
      const Audio = window.AudioContext;
      if (!Audio) return;
      const counted = window as unknown as { voices: number };
      counted.voices = 0;
      class SilentAudio extends Audio {
        private silence: GainNode;
        constructor(options?: AudioContextOptions) {
          super(options);
          this.silence = super.createGain();
          this.silence.gain.value = 0;
          this.silence.connect(super.destination);
        }
        get destination() {
          return this.silence as unknown as AudioDestinationNode;
        }
        createOscillator() {
          counted.voices++;
          return super.createOscillator();
        }
        createBufferSource() {
          counted.voices++;
          return super.createBufferSource();
        }
      }
      window.AudioContext = SilentAudio;
    });
    await use(context);
  },
  frame: async ({ page }, use) => {
    await use(page.locator(".preview-frame"));
  },
  open: async ({ page }, use) => {
    await use(async (name) => {
      await page.goto(`/workbench/${name}`);
    });
  },
  playground: async ({ page }, use) => {
    await use(new Playground(page));
  },
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await use(errors);
      expect(errors, "the page threw an error").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** True once the element has stopped moving vertically, measured across two animation frames. */
export async function settledTop(locator: Locator) {
  return locator.evaluate(
    (element) =>
      new Promise<boolean>((resolve) => {
        const top = element.getBoundingClientRect().top;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve(element.getBoundingClientRect().top === top)),
        );
      }),
  );
}

/** The vertical middle of an element, in page pixels. */
export async function middleOf(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return box.y + box.height / 2;
}
