import { expect, test } from "bun:test";
import type { ComponentPropsWithRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button,
  CommandMenu,
  ContextMenu,
  ContextMenuTrigger,
  Dialog,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardTrigger,
  Kbd,
  Menubar,
  MenubarTrigger,
  Popover,
  PopoverTrigger,
  Sheet,
  SheetTrigger,
  Tooltip,
} from "x-govuk-ui";
import { roomiestSide } from "../../packages/core/src/callout";

test("overlay triggers say what they open", () => {
  const dialog = renderToStaticMarkup(
    <Dialog>
      <DialogTrigger>Delete draft</DialogTrigger>
    </Dialog>,
  );
  expect(dialog).toContain('aria-haspopup="dialog"');
  expect(dialog).toContain('aria-expanded="false"');
  expect(dialog).toContain("x-govuk-ui-button--secondary");
  expect(
    renderToStaticMarkup(
      <Sheet>
        <SheetTrigger>Filter</SheetTrigger>
      </Sheet>,
    ),
  ).toContain('aria-haspopup="dialog"');
  expect(
    renderToStaticMarkup(
      <Popover>
        <PopoverTrigger>Help</PopoverTrigger>
      </Popover>,
    ),
  ).toContain('aria-expanded="false"');
  const menu = renderToStaticMarkup(
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
    </DropdownMenu>,
  );
  expect(menu).toContain('aria-haspopup="menu"');
  expect(menu).toContain("x-govuk-ui-chevron");
  const card = renderToStaticMarkup(
    <HoverCard>
      <HoverCardTrigger href="#winston">Winston Churchill</HoverCardTrigger>
    </HoverCard>,
  );
  expect(card).toMatch(/<a [^>]*href="#winston"/);
});

test("shortcuts show each key, and tooltips leave the trigger's own name in place", () => {
  expect(renderToStaticMarkup(<Kbd>⌘ K</Kbd>)).toBe(
    '<kbd class="x-govuk-ui-kbd"><kbd class="x-govuk-ui-kbd-key" data-single="true">⌘</kbd><kbd class="x-govuk-ui-kbd-key" data-single="true">K</kbd></kbd>',
  );
  expect(renderToStaticMarkup(<Kbd>Esc</Kbd>)).toBe('<kbd class="x-govuk-ui-kbd">Esc</kbd>');
  // A shortcut shows the device's modifier once it is in the browser, and nothing on the server.
  expect(renderToStaticMarkup(<Kbd shortcut="K" />)).toBe('<kbd class="x-govuk-ui-kbd"></kbd>');
  const trigger = renderToStaticMarkup(
    <Tooltip content="Print this page" shortcut="⌘ P">
      <Button aria-label="Print this page">Print</Button>
    </Tooltip>,
  );
  expect(trigger).toContain('aria-label="Print this page"');
  expect(trigger).toContain("<button");
});

test("a callout takes the side where it fits and covers least, then the one with most room", () => {
  const box = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
  const screen = { left: 0, top: 0, right: 1000, bottom: 800 };
  const card = { width: 300, height: 150 };
  // Near the top of the screen, below has the most space.
  expect(roomiestSide(box(400, 60, 120, 40), screen, card, null)).toBe("bottom");
  // Near the foot, above does.
  expect(roomiestSide(box(400, 700, 120, 40), screen, card, null)).toBe("top");
  // Below has the most space, but a button there would be covered, so it goes above.
  expect(
    roomiestSide(box(400, 300, 120, 40), screen, card, null, [], [box(380, 360, 160, 40)]),
  ).toBe("top");
  // Another callout counts for more than a button.
  expect(
    roomiestSide(
      box(400, 300, 120, 40),
      screen,
      card,
      null,
      [box(300, 100, 320, 180)],
      [box(380, 360, 160, 40)],
    ),
  ).toBe("bottom");
  // It keeps the side it has while that still fits and covers nothing.
  expect(roomiestSide(box(400, 60, 120, 40), screen, card, "right")).toBe("right");
  // Squeezed beside a tall anchor in a narrow box, it takes the side with the most space for it.
  expect(
    roomiestSide(box(60, 20, 80, 760), { left: 0, top: 0, right: 420, bottom: 800 }, card, null),
  ).toBe("right");
});

test("a trigger given another element opens its overlay from it, with none of the Button's look", () => {
  const row = <button type="button" className="row" />;
  const triggers = {
    DialogTrigger: (
      <Dialog>
        <DialogTrigger render={row}>Open</DialogTrigger>
      </Dialog>
    ),
    PopoverTrigger: (
      <Popover>
        <PopoverTrigger render={row}>Open</PopoverTrigger>
      </Popover>
    ),
    SheetTrigger: (
      <Sheet>
        <SheetTrigger render={row}>Open</SheetTrigger>
      </Sheet>
    ),
    DropdownMenuTrigger: (
      <DropdownMenu>
        <DropdownMenuTrigger render={row}>Open</DropdownMenuTrigger>
      </DropdownMenu>
    ),
    CommandMenu: (
      <CommandMenu
        trigger={
          <button type="button" className="row">
            Open
          </button>
        }
      >
        {null}
      </CommandMenu>
    ),
  };
  for (const [name, element] of Object.entries(triggers)) {
    const html = renderToStaticMarkup(element);
    const plain =
      /<button[^>]*class="row"[^>]*>Open<\/button>/.test(html) &&
      !/x-govuk-ui-(button|chevron|dropdown-trigger|command-trigger)/.test(html);
    expect(`${name}: ${plain}`).toBe(`${name}: true`);
  }
  // Without one, each is the library's Button.
  const button = renderToStaticMarkup(
    <DropdownMenu>
      <DropdownMenuTrigger>Open</DropdownMenuTrigger>
    </DropdownMenu>,
  );
  expect(button).toContain("x-govuk-ui-button");
  expect(button).toContain("x-govuk-ui-chevron");
});

test("a link or an area given another element keeps its own class on it", () => {
  // A router's link, which takes the link's props and adds its own.
  const RouterLink = (props: ComponentPropsWithRef<"a">) => <a {...props} data-router="" />;
  const html = renderToStaticMarkup(
    <>
      <HoverCard>
        <HoverCardTrigger href="/guidance" render={<RouterLink />}>
          Guidance
        </HoverCardTrigger>
      </HoverCard>
      <ContextMenu>
        <ContextMenuTrigger render={<section data-area="" />}>Files</ContextMenuTrigger>
      </ContextMenu>
      <Menubar>
        <DropdownMenu>
          <MenubarTrigger render={<button type="button" data-name="" />}>File</MenubarTrigger>
        </DropdownMenu>
      </Menubar>
    </>,
  );
  expect(html).toMatch(/<a [^>]*class="x-govuk-ui-hover-card-trigger"[^>]*data-router=""/);
  expect(html).toMatch(/<section [^>]*x-govuk-ui-context-menu-trigger/);
  expect(html).toMatch(/<button [^>]*x-govuk-ui-menubar-trigger/);
});
