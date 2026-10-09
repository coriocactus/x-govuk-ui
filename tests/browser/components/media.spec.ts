import { expect, test } from "../fixtures";

test("carousel buttons move between slides and stop at either end", async ({ frame, open }) => {
  await open("carousel");
  const previous = frame.getByRole("button", { name: "Previous slide" });
  const next = frame.getByRole("button", { name: "Next slide" });
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(frame.getByText("2 of 3")).toBeVisible();
  await next.click();
  await expect(frame.getByText("3 of 3")).toBeVisible();
  await expect(next).toBeDisabled();
});

test("a logo carousel lists each logo once, shows as many as have room, and pauses", async ({
  page,
  frame,
  open,
}) => {
  await open("logo-carousel");
  await expect(frame.getByRole("listitem").filter({ hasText: "Wales Office" })).toHaveCount(1);
  // A name without a logo is GOV.UK's organisation logo, in the regular weight, kept small enough
  // for a logo's place.
  const name = frame.locator(".x-govuk-ui-logo-carousel-name").first();
  await expect(name).toHaveCSS("font-weight", "400");
  await expect(name).toHaveCSS("font-size", "15px");
  // On a phone, fewer logos show, each with space for its name.
  const places = frame.locator(".x-govuk-ui-logo-carousel-place");
  const wide = await places.count();
  const wideView = page.viewportSize()!;
  await page.setViewportSize({ width: 375, height: 800 });
  await expect.poll(() => places.count()).toBeLessThan(wide);
  for (const place of await places.all()) {
    expect((await place.boundingBox())!.width).toBeGreaterThanOrEqual(9 * 16 - 1);
  }
  await page.setViewportSize(wideView);
  await frame.getByRole("button", { name: "Pause the logos" }).click();
  await expect(frame.getByRole("button", { name: "Play the logos" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("an organisation's name is set as GOV.UK's organisation logo sets it, in the regular weight beside a thin bar, or small", async ({
  frame,
  open,
  playground,
}) => {
  await open("organisation-name");
  const name = frame.locator(".x-govuk-ui-organisation-name");
  const crest = () =>
    name.evaluate((element) => {
      const style = getComputedStyle(element, "::before");
      return [style.width, style.height];
    });
  await expect(name).toHaveCSS("font-weight", "400");
  await expect(name).toHaveCSS("font-size", "19px");
  await expect(name).toHaveCSS("border-left-width", "2px");
  await expect(name).toHaveCSS("border-left-color", "rgb(255, 67, 40)");
  expect(await crest()).toEqual(["33px", "27px"]);
  // Small, for a sidebar or a footer, the name and the Royal Arms are smaller.
  await playground.set("size", "Small");
  await expect(name).toHaveCSS("font-size", "15px");
  await expect.poll(crest).toEqual(["26px", "21px"]);
});

test("a QR code redraws for a new address", async ({ frame, open }) => {
  await open("qr-code");
  const code = frame.getByRole("img", { name: "QR code for the fishing licence service" });
  const dots = await code.locator("circle").count();
  await frame
    .getByRole("textbox", { name: "Web address" })
    .fill("https://www.gov.uk/fishing-licences/buy-a-fishing-licence");
  await expect.poll(() => code.locator("circle").count()).not.toBe(dots);
});

test("a lightbox opens, moves between photos with the keys and buttons, and returns focus", async ({
  page,
  frame,
  open,
}) => {
  await open("lightbox");
  await frame.getByRole("button", { name: /^The Elizabeth Tower/ }).click();
  const viewer = page.getByRole("dialog", { name: "Photos of London" });
  await expect(viewer.locator(".x-govuk-ui-lightbox-count")).toHaveText("2 of 20");
  // Focus is on Close as the viewer appears, so the arrow keys work at once.
  await page.keyboard.press("ArrowRight");
  await expect(viewer.locator(".x-govuk-ui-lightbox-count")).toHaveText("3 of 20");
  // The next photo slides in as the previous one slides away.
  await expect(
    viewer.getByRole("img", { name: "The London Eye on the South Bank of the Thames" }),
  ).toBeVisible();
  await expect(viewer.getByRole("img")).toHaveCount(1);
  await viewer.getByRole("button", { name: "Previous photo" }).click();
  await viewer.getByRole("button", { name: "Previous photo" }).click();
  await expect(viewer.locator(".x-govuk-ui-lightbox-count")).toHaveText("1 of 20");
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(frame.getByRole("button", { name: /^Tower Bridge over the Thames/ })).toBeFocused();
  // A press anywhere outside the photo closes the viewer too.
  await frame.getByRole("button", { name: /^Tower Bridge over the Thames/ }).click();
  await expect(viewer).toBeVisible();
  await page.mouse.click(40, 450);
  await expect(viewer).toBeHidden();
  // Moving to a photo whose place is out of sight brings the gallery behind to it, so the photo
  // has somewhere to go back to.
  await frame.getByRole("button", { name: /^Tower Bridge over the Thames/ }).click();
  // Opened again, the viewer has focus, and the arrow keys work.
  await expect(page.locator(".x-govuk-ui-lightbox-viewer:focus-within")).toHaveCount(1);
  await page.keyboard.press("ArrowLeft");
  await expect(viewer.locator(".x-govuk-ui-lightbox-count")).toHaveText("20 of 20");
  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  const last = frame.getByRole("button", { name: /^Alexandra Palace/ });
  await expect(last).toBeFocused();
  await expect(last).toBeInViewport();
});
