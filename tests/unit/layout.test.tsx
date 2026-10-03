import { expect, test } from "bun:test";
import { dirname, resolve } from "node:path";
import {
  balanceTiles,
  expandTile,
  isTilesLayout,
  keepTiles,
  normaliseLayout,
  placeTile,
  removeTile,
  replaceTile,
  swapTiles,
  Tile,
  TileContent,
  Tiles,
  TilesDock,
  type TilesLayout,
  tileIds,
} from "@x-govuk-ui/belsize";
import type { RefCallback } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionShowAll,
  AccordionTrigger,
  Details,
  ResizableHandle,
  ScrollArea,
  Separator,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
} from "x-govuk-ui";
import { useMergedRef } from "x-govuk-ui/internal";
import {
  dividerPixels,
  dividersOf,
  hideTile,
  resizeTiles,
  shapeOf,
  tileAt,
} from "../../packages/belsize/src/layout";

const accordionItems = [
  { value: "before", title: "Before you start", content: "Have your details ready." },
  { value: "next", title: "What happens next", content: "We will email you." },
];

test("accordion parts render headings, summaries and Show all on the server", () => {
  const html = renderToStaticMarkup(
    <Accordion multiple headingLevel={2} defaultValue={["next"]}>
      <AccordionShowAll />
      {accordionItems.map((item) => (
        <AccordionItem key={item.value} value={item.value}>
          <AccordionTrigger summary={`About ${item.value}`}>{item.title}</AccordionTrigger>
          <AccordionPanel>{item.content}</AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>,
  );
  for (const item of accordionItems) expect(html).toContain(item.title);
  expect(html.match(/<h2 /g)).toHaveLength(2);
  expect(html).toContain('class="x-govuk-ui-accordion-summary">About before</span>');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('aria-expanded="true"');
  // A closed panel stays in the page. Base UI marks it hidden="until-found" once it loads.
  expect(html).toContain("Have your details ready.");
  expect(html).toContain("Show all sections");
});

test("details, tabs and separator render their roles on the server", () => {
  const details = renderToStaticMarkup(<Details summary="Help with nationality">Help</Details>);
  expect(details).toContain('aria-expanded="false"');
  expect(details).toContain("Help with nationality");
  const tabs = renderToStaticMarkup(
    <Tabs defaultValue="day">
      <TabsList aria-label="Cases closed">
        <TabsTrigger value="day">Past day</TabsTrigger>
        <TabsTrigger value="week">Past week</TabsTrigger>
      </TabsList>
      <TabsPanel value="day">Three</TabsPanel>
      <TabsPanel value="week">Twenty</TabsPanel>
    </Tabs>,
  );
  expect(tabs).toContain('role="tablist"');
  expect(tabs).toContain('aria-label="Cases closed"');
  expect(tabs).toMatch(/aria-selected="true"[^>]*>(<span[^>]*>)+Past day</);
  // The hidden bold copy that keeps each tab's width is left out of the tab's name.
  expect(tabs).toContain(
    '<span class="x-govuk-ui-tabs-label-room" aria-hidden="true">Past day</span>',
  );
  expect(tabs).toContain('role="tabpanel"');
  expect(renderToStaticMarkup(<Separator orientation="vertical" />)).toContain(
    'aria-orientation="vertical"',
  );
});

test("a merged ref gives React one cleanup that stops what each ref started", () => {
  // React's Strict Mode attaches each ref, detaches it and attaches it again in development. A
  // cleanup dropped there would leave two highlight trackers fighting over one indicator.
  const log: string[] = [];
  const theirs = { current: null as string | null };
  let merged: RefCallback<string> | undefined;
  function Probe() {
    merged = useMergedRef<string>((node) => {
      log.push(`start ${node}`);
      return () => {
        log.push(`stop ${node}`);
      };
    }, theirs);
    return null;
  }
  renderToStaticMarkup(<Probe />);
  const cleanup = merged?.("row");
  expect(theirs.current).toBe("row");
  expect(typeof cleanup).toBe("function");
  if (typeof cleanup === "function") cleanup();
  expect(log).toEqual(["start row", "stop row"]);
  expect(theirs.current).toBeNull();
  // A callback that gives no cleanup is called with null, as React would call it.
  const calls: (string | null)[] = [];
  function Plain() {
    merged = useMergedRef<string>((node) => {
      calls.push(node);
    }, undefined);
    return null;
  }
  renderToStaticMarkup(<Plain />);
  const done = merged?.("row");
  if (typeof done === "function") done();
  expect(calls).toEqual(["row", null]);
});

test("scroll areas and resizable handles render their parts on the server", () => {
  const scroll = renderToStaticMarkup(
    <ScrollArea orientation="horizontal" label="Updates">
      Text
    </ScrollArea>,
  );
  expect(scroll).toContain("x-govuk-ui-scroll-area-viewport");
  expect(scroll).toContain('data-orientation="horizontal"');
  const handle = renderToStaticMarkup(
    <ResizableHandle label="Resize playground" value={320} min={240} max={600} />,
  );
  expect(handle).toContain('role="separator"');
  expect(handle).toContain('aria-valuenow="320"');
  expect(handle).toContain('aria-valuetext="320 pixels"');
});

const desk: TilesLayout = {
  type: "split",
  direction: "row",
  splitPercentages: [40, 60],
  children: ["case", { type: "split", direction: "column", children: ["history", "notes"] }],
};

test("tiles render react-mosaic's board on the server, each tile a bar with its heading and controls", () => {
  const html = renderToStaticMarkup(
    <Tiles
      defaultValue={desk}
      renderTile={(id) => (
        <Tile title={id === "case" ? "Case" : id} headingLevel={3}>
          <TileContent scroll>{id}</TileContent>
        </Tile>
      )}
    />,
  );
  expect(html).toContain("x-govuk-ui-tiles");
  // react-mosaic places each tile by percentages of the board from each edge.
  expect(html).toContain('style="top:0%;right:60%;bottom:0%;left:0%"');
  expect(html).toContain('data-tile-id="notes"');
  expect(html).toMatch(/<h3 id="[^"]+" class="x-govuk-ui-tile-heading">Case<\/h3>/);
  expect(html).toContain('aria-label="Options for Case"');
  expect(html).toContain('aria-label="Maximise Case"');
  expect(html).toContain('aria-pressed="false"');
  expect(html).toContain('aria-label="Close Case"');
  // react-mosaic's picture of a dragged window is left empty and hidden. The Tiles draws its own.
  expect(html).toContain('<div class="mosaic-preview" hidden=""></div>');
  // The dividers need the board's size, so they come once it is measured in the browser.
  expect(html).not.toContain('role="separator"');
  // With no tiles, the Tiles shows what it was given for that.
  const empty = renderToStaticMarkup(
    <Tiles defaultValue={null} empty={<p>No tiles</p>} renderTile={() => <span />} />,
  );
  expect(empty).toContain(
    '<div class="mosaic-zero-state x-govuk-ui-tiles-empty"><p>No tiles</p></div>',
  );
});

test("an arrangement lists its tiles in reading order, and is checked before it is used", () => {
  expect(tileIds(desk)).toEqual(["case", "history", "notes"]);
  expect(tileIds(null)).toEqual([]);
  expect(isTilesLayout(desk)).toBe(true);
  expect(isTilesLayout("case")).toBe(true);
  // A tile twice, a split of one, or a missing share make no arrangement.
  expect(isTilesLayout({ type: "split", direction: "row", children: ["a", "a"] })).toBe(false);
  expect(isTilesLayout({ type: "split", direction: "row", children: ["a"] })).toBe(false);
  expect(
    isTilesLayout({
      type: "split",
      direction: "row",
      children: ["a", "b"],
      splitPercentages: [100],
    }),
  ).toBe(false);
  expect(isTilesLayout({ version: 1, sizes: {} })).toBe(false);
});

test("a tile is placed beside another or at an edge, taken out with its room shared, or swapped", () => {
  // Beside a tile in a split in the same direction, it joins the split, sharing that tile's space.
  expect(placeTile(desk, "map", { beside: "history", side: "bottom" })).toEqual({
    type: "split",
    direction: "row",
    splitPercentages: [40, 60],
    children: [
      "case",
      {
        type: "split",
        direction: "column",
        splitPercentages: [25, 25, 50],
        children: ["history", "map", "notes"],
      },
    ],
  });
  // At an edge along a split in the same direction, it takes as much as each of the split's
  // children.
  const edge = placeTile(desk, "map", { side: "left" });
  expect(tileIds(edge)).toEqual(["map", "case", "history", "notes"]);
  const shares = typeof edge === "string" ? [] : (edge.splitPercentages ?? []);
  expect(shares.map((share) => Math.round(share * 10) / 10)).toEqual([33.3, 26.7, 40]);
  // Moving a tile takes it from where it was, and its split's other children share its space.
  const moved = placeTile(desk, "case", { beside: "notes", side: "right" });
  expect(moved).toEqual({
    type: "split",
    direction: "column",
    splitPercentages: [50, 50],
    children: [
      "history",
      { type: "split", direction: "row", splitPercentages: [50, 50], children: ["notes", "case"] },
    ],
  });
  // Taken out, a tile's space goes to its split, and a split of one becomes its only child.
  expect(removeTile(desk, "history")).toEqual({
    type: "split",
    direction: "row",
    splitPercentages: [40, 60],
    children: ["case", "notes"],
  });
  expect(removeTile("case", "case")).toBeNull();
  expect(tileIds(swapTiles(desk, "case", "notes"))).toEqual(["notes", "history", "case"]);
  // A split inside one in the same direction gives up its children, each with its share of its
  // share.
  expect(
    normaliseLayout({
      type: "split",
      direction: "row",
      splitPercentages: [50, 50],
      children: [
        "a",
        { type: "split", direction: "row", splitPercentages: [20, 80], children: ["b", "c"] },
      ],
    }),
  ).toEqual({
    type: "split",
    direction: "row",
    splitPercentages: [50, 10, 40],
    children: ["a", "b", "c"],
  });
});

test("each divider lies where react-mosaic draws the line, and moves only the tiles beside it", () => {
  const [across, down] = dividersOf(desk);
  expect(across).toMatchObject({ path: [], index: 0, direction: "row", at: 40, before: ["case"] });
  expect(across?.after).toEqual(["history", "notes"]);
  // The line down the right-hand split spans only that split's box.
  expect(down).toMatchObject({ path: [1], direction: "column", at: 50, before: ["history"] });
  expect(down?.box).toEqual({ top: 0, right: 0, bottom: 0, left: 40 });
  // Moving it changes the two tiles beside it and no others.
  expect(resizeTiles(desk, [1], 0, 30)).toMatchObject({
    splitPercentages: [40, 60],
    children: ["case", { splitPercentages: [30, 70] }],
  });
});

test("the dock lists the tiles not open, each a button that opens it, in a group named for them", () => {
  const html = renderToStaticMarkup(
    <Tiles
      defaultValue="case"
      tiles={[
        { id: "case", title: "Case" },
        { id: "map", title: "Map of the river" },
      ]}
      renderTile={(id) => <Tile title={id}>{id}</Tile>}
    >
      <TilesDock />
    </Tiles>,
  );
  expect(html).toMatch(/role="group" aria-labelledby="[^"]+" class="x-govuk-ui-tiles-dock"/);
  expect(html).toContain(">Closed tiles</span>");
  expect(html).toContain('aria-label="Open Map of the river"');
  expect(html).not.toContain('aria-label="Open Case"');
});

test("tiles are set out evenly, made larger, and shown in each other's places", () => {
  const four: TilesLayout = placeTile(desk, "map", { side: "bottom" });
  // Four in a square space make two rows of two, in reading order.
  expect(balanceTiles(four)).toEqual({
    type: "split",
    direction: "column",
    splitPercentages: [50, 50],
    children: [
      {
        type: "split",
        direction: "row",
        splitPercentages: [50, 50],
        children: ["case", "history"],
      },
      { type: "split", direction: "row", splitPercentages: [50, 50], children: ["notes", "map"] },
    ],
  });
  // In a wide space, more go across.
  expect(tileIds(balanceTiles(four, 4))).toEqual(["case", "history", "notes", "map"]);
  expect(balanceTiles(four, 4)).toMatchObject({
    direction: "row",
    children: ["case", "history", "notes", "map"],
  });
  // Made larger, each split on the path to the tile gives its part 70%.
  expect(expandTile(desk, "notes")).toMatchObject({
    splitPercentages: [30, 70],
    children: ["case", { splitPercentages: [30, 70] }],
  });
  // A closed tile takes the place of an open one, which leaves. An open tile swaps instead.
  expect(tileIds(replaceTile(desk, "history", "map"))).toEqual(["case", "map", "notes"]);
  expect(tileIds(replaceTile(desk, "history", "case"))).toEqual(["history", "case", "notes"]);
});

test("react-mosaic renders the elements the Tiles' stylesheet reaches, so an upgrade that moves them fails here", () => {
  // tiles.css places, maximises and guards tiles through this chain of react-mosaic's elements,
  // and shows drop targets by these classes. CSS fails silently, so this test speaks for it.
  const html = renderToStaticMarkup(
    <Tiles defaultValue={desk} renderTile={(id) => <Tile title={id}>{id}</Tile>} />,
  );
  expect(html).toMatch(
    /<div class="x-govuk-ui-tiles-mosaic mosaic mosaic-drop-target"><div class="mosaic-root"><div class="mosaic-tile" style="top:[\d.]+%;right:[\d.]+%;bottom:[\d.]+%;left:[\d.]+%"><div class="mosaic-window mosaic-drop-target"><div class="mosaic-window-toolbar"><span><\/span><\/div><div class="mosaic-window-body"><div id="[^"]+" class="x-govuk-ui-tile"/,
  );
  expect(html).toContain(
    '<div class="drop-target-container"><div class="drop-target top"></div><div class="drop-target bottom"></div><div class="drop-target left"></div><div class="drop-target right"></div></div>',
  );
  const swap = renderToStaticMarkup(
    <Tiles
      defaultValue={desk}
      dropBehaviour="split-and-swap"
      renderTile={(id) => <Tile title={id}>{id}</Tile>}
    />,
  );
  expect(swap).toContain('<div class="drop-target swap"></div>');
});

test("react-mosaic and the Tiles share one react-dnd, or react-mosaic's drop targets find no drag and drop", () => {
  const belsize = resolve("packages/belsize/src/index.ts");
  const mosaic = dirname(Bun.resolveSync("react-mosaic-component/package.json", belsize));
  expect(Bun.resolveSync("react-dnd", mosaic)).toBe(Bun.resolveSync("react-dnd", belsize));
});

test("a divider's pixels allow for the line each tile gives up, and never cross their limits", () => {
  const [across, down] = dividersOf(desk);
  // 1001 pixels of space in total, with the line. The case tile has 40% of it, less its line.
  const wide = dividerPixels(across!, 1000, 120);
  expect(wide).toMatchObject({ size: 399, min: 120, max: 879, even: 500 });
  // Back to a share within half a pixel, because the size was rounded to whole pixels.
  expect(Math.abs(wide.share(399) - 40)).toBeLessThan(50 / 1001);
  // The line across the right-hand split works in the board's height, all of which it spans.
  expect(dividerPixels(down!, 600, 120)).toMatchObject({ size: 300, min: 120, max: 479 });
  // A tile with no share, or a board too small for the minimum size, keeps its limits in order.
  const none = dividersOf({
    type: "split",
    direction: "row",
    splitPercentages: [0, 100],
    children: ["a", "b"],
  })[0]!;
  expect(dividerPixels(none, 1000, 120).size).toBe(0);
  const tiny = dividerPixels(across!, 3, 120);
  expect(tiny.max).toBeGreaterThanOrEqual(tiny.min);
  expect(tiny.size).toBeGreaterThanOrEqual(0);
});

test("placing, resizing and keeping tiles hold to their limits at the edges", () => {
  // Beside itself, a tile stays put. Beside a missing tile, it goes to the edge.
  expect(placeTile(desk, "case", { beside: "case", side: "left" })).toBe(desk);
  expect(tileIds(placeTile(desk, "map", { beside: "gone", side: "left" }))).toEqual([
    "map",
    "case",
    "history",
    "notes",
  ]);
  // A share is kept between 10% and 90%.
  expect(placeTile("case", "map", { beside: "case", side: "right", share: 99 })).toMatchObject({
    splitPercentages: [10, 90],
  });
  // A divider cannot give a tile more than the two beside it have, or less than zero.
  expect(resizeTiles(desk, [], 0, 150)).toMatchObject({ splitPercentages: [100, 0] });
  expect(resizeTiles(desk, [], 0, -5)).toMatchObject({ splitPercentages: [0, 100] });
  // Kept tiles no longer known are left out. With none left, there is nothing to keep.
  expect(tileIds(keepTiles(desk, ["case", "notes"]) ?? null)).toEqual(["case", "notes"]);
  expect(keepTiles(desk, ["map"])).toBeUndefined();
  expect(keepTiles(null, ["map"])).toBeNull();
});

test("a drop lands beside the tile it was over, however far the tile dragged was from it", () => {
  // react-mosaic adjusts a drop's path only within one split, so here it would land beside E.
  // The Tiles reads the tile at the path in the arrangement drawn, then places by ids.
  const board: TilesLayout = {
    type: "split",
    direction: "row",
    children: [
      "a",
      { type: "split", direction: "column", children: ["b", "c"] },
      { type: "split", direction: "column", children: ["d", "e"] },
    ],
  };
  const drawn = hideTile(board, "a");
  expect(tileAt(drawn, [1, 1])).toBe("c");
  const landed = placeTile(board, "a", { beside: tileAt(drawn, [1, 1]), side: "right" });
  expect(landed).toMatchObject({
    children: [
      { children: ["b", { direction: "row", children: ["c", "a"] }] },
      { children: ["d", "e"] },
    ],
  });
  // While it is dragged, the tile keeps its place with no share, and its split's other children
  // share it.
  const hidden = typeof drawn === "string" || !drawn ? [] : (drawn.splitPercentages ?? []);
  expect(hidden.map(Math.round)).toEqual([0, 50, 50]);
  // A gesture's path stays valid in the structure it began in, whatever the shares.
  expect(shapeOf(drawn)).toBe(shapeOf(board));
  expect(shapeOf(landed)).not.toBe(shapeOf(board));
});

test("shares that cannot be laid out, an empty id, or a swap with a tile not there change nothing", () => {
  const split = (splitPercentages: number[]) => ({
    type: "split",
    direction: "row",
    children: ["a", "b"],
    splitPercentages,
  });
  expect(isTilesLayout(split([25, 25]))).toBe(true);
  expect(isTilesLayout(split([0, 0]))).toBe(false);
  expect(isTilesLayout(split([Number.POSITIVE_INFINITY, 1]))).toBe(false);
  expect(isTilesLayout(split([Number.NaN, 1]))).toBe(false);
  expect(isTilesLayout({ type: "split", direction: "row", children: ["", "b"] })).toBe(false);
  // Shares that do not add up to 100 are scaled before anything is laid out.
  expect(normaliseLayout(split([25, 25]) as TilesLayout)).toMatchObject({
    splitPercentages: [50, 50],
  });
  expect(swapTiles(desk, "case", "missing")).toBe(desk);
  expect(swapTiles("case", "case", "missing")).toBe("case");
});

test("a tile's id in the page keeps ids apart that differ only in their spaces and dashes", () => {
  const html = renderToStaticMarkup(
    <Tiles
      defaultValue={{ type: "split", direction: "row", children: ["a b", "a-b"] }}
      renderTile={(id) => <Tile title={id}>{id}</Tile>}
    />,
  );
  const ids = [...html.matchAll(/id="([^"]+)" class="x-govuk-ui-tile"/g)].map(([, id]) => id);
  expect(ids).toHaveLength(2);
  expect(new Set(ids).size).toBe(2);
  expect(ids.every((id) => !/\s/.test(id ?? ""))).toBe(true);
});
