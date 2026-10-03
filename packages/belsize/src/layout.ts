// A Tiles' arrangement, as react-mosaic keeps it, which is a tree of splits whose leaves are the
// tiles' ids. This module is pure, with no "use client", so a server can make or change an
// arrangement without loading the Tiles, and the tests can check one without a browser.

/** A part of the space split among its children, side by side in a row or stacked in a column. */
export type TilesSplit = {
  type: "split";
  /** A row sets the children side by side, and a column one above another. */
  direction: "row" | "column";
  /** Two or more tiles' ids or splits. */
  children: TilesLayout[];
  /** Each child's share of the split, in percent, adding up to 100. By default, equal shares. */
  splitPercentages?: number[];
};

/**
 * A Tiles' arrangement, which is a tile's id, or a split of the space among tiles and further
 * splits. It is react-mosaic's tree without its tab groups, so it can be stored as JSON and passed
 * to react-mosaic's helpers.
 */
export type TilesLayout = string | TilesSplit;

/** The side of a tile, or of the whole arrangement, that another tile goes to. */
export type TileSide = "left" | "right" | "top" | "bottom";

/** Where `placeTile` puts a tile, beside another or at an edge of the whole arrangement. */
export type TilePlace = {
  /** The tile to go beside. Without one, the tile goes to an edge of the whole arrangement. */
  beside?: string;
  side: TileSide;
  /**
   * The share of the space it takes from what it goes beside, in percent. By default, half a
   * tile's, or at an edge, as much as each tile along that edge already has.
   */
  share?: number;
};

/** A box inside the arrangement, as percentages of its space from each edge. */
type TilesBox = { top: number; right: number; bottom: number; left: number };

/** @internal The line between two neighbours in a split, which resizes them. */
export type TilesDivider = {
  /** The path to the split, as react-mosaic numbers it, with each child's index from the root. */
  path: number[];
  /** The line follows this child of the split. */
  index: number;
  direction: "row" | "column";
  /** The split's box. */
  box: TilesBox;
  /** Where the line is across the split's space, in percent of the whole arrangement. */
  at: number;
  /** The split's shares, complete, adding up to 100. */
  shares: number[];
  /** The tiles before the line, in the child it resizes, in reading order. */
  before: string[];
  /** The tiles after it. */
  after: string[];
};

const isSplit = (node: TilesLayout): node is TilesSplit => typeof node !== "string";

/**
 * Whether a split's shares are usable, with one for each child, all finite, none negative and some
 * positive.
 */
function usableShares(shares: unknown, count: number): shares is number[] {
  if (!Array.isArray(shares) || shares.length !== count) return false;
  if (!shares.every((share) => typeof share === "number" && Number.isFinite(share) && share >= 0)) {
    return false;
  }
  return shares.reduce((sum: number, share: number) => sum + share, 0) > 0;
}

/** A split's shares, scaled to add up to 100, or equal if it has none or they cannot be used. */
function sharesOf(split: TilesSplit): number[] {
  const count = split.children.length;
  const given = split.splitPercentages;
  if (!usableShares(given, count)) return split.children.map(() => 100 / count);
  const total = given.reduce((sum, share) => sum + share, 0);
  return given.map((share) => (share / total) * 100);
}

/** The tiles' ids, in reading order, left to right in a row and top to bottom in a column. */
export function tileIds(layout: TilesLayout | null): string[] {
  if (layout === null) return [];
  return isSplit(layout) ? layout.children.flatMap(tileIds) : [layout];
}

/**
 * Whether a value is an arrangement. It must have splits of two or more children, with a usable
 * share for each child if any, and every tile once, by an id that is not empty. A stored
 * arrangement is checked before it is used. Shares need not add up to 100, because the Tiles scales
 * them before it lays out.
 */
export function isTilesLayout(value: unknown): value is TilesLayout {
  const seen = new Set<string>();
  const valid = (node: unknown): boolean => {
    if (typeof node === "string") {
      if (node === "" || seen.has(node)) return false;
      seen.add(node);
      return true;
    }
    if (typeof node !== "object" || node === null) return false;
    const split = node as Partial<TilesSplit>;
    if (split.type !== "split" || (split.direction !== "row" && split.direction !== "column")) {
      return false;
    }
    if (!Array.isArray(split.children) || split.children.length < 2) return false;
    const shares = split.splitPercentages;
    if (shares !== undefined && !usableShares(shares, split.children.length)) return false;
    return split.children.every(valid);
  };
  return valid(value);
}

/**
 * Tidies an arrangement after a change. A split left with one child becomes that child. A split
 * inside another of the same direction gives its children to its parent, each with its share of the
 * parent's share. The tree therefore stays as shallow as its arrangement allows.
 */
export function normaliseLayout(layout: TilesLayout | null): TilesLayout | null {
  if (layout === null || !isSplit(layout)) return layout;
  const shares = sharesOf(layout);
  const children: TilesLayout[] = [];
  const kept: number[] = [];
  layout.children.forEach((child, index) => {
    const tidy = normaliseLayout(child);
    if (tidy === null) return;
    const share = shares[index] ?? 0;
    if (isSplit(tidy) && tidy.direction === layout.direction) {
      const inner = sharesOf(tidy);
      children.push(...tidy.children);
      kept.push(...inner.map((each) => (each * share) / 100));
    } else {
      children.push(tidy);
      kept.push(share);
    }
  });
  if (children.length === 0) return null;
  if (children.length === 1) return children[0] ?? null;
  const total = kept.reduce((sum, share) => sum + share, 0);
  return {
    type: "split",
    direction: layout.direction,
    children,
    splitPercentages: kept.map((share) =>
      total > 0 ? (share / total) * 100 : 100 / children.length,
    ),
  };
}

/**
 * Keeps only the tiles a Tiles still has, such as from an arrangement stored before a tile was
 * renamed or retired. With none of them left, there is nothing to keep, and the result is
 * undefined, so the caller can start again.
 */
export function keepTiles(
  layout: TilesLayout | null,
  ids: readonly string[],
): TilesLayout | null | undefined {
  if (layout === null) return null;
  const gone = tileIds(layout).filter((id) => !ids.includes(id));
  if (gone.length === 0) return layout;
  const kept = gone.reduce<TilesLayout | null>((rest, id) => removeTile(rest, id), layout);
  return kept ?? undefined;
}

/** Takes a tile out, and its split's other children share its space in proportion. */
export function removeTile(layout: TilesLayout | null, id: string): TilesLayout | null {
  if (layout === null || layout === id) return null;
  if (!isSplit(layout)) return layout;
  const shares = sharesOf(layout);
  const children: TilesLayout[] = [];
  const kept: number[] = [];
  layout.children.forEach((child, index) => {
    const rest = removeTile(child, id);
    if (rest === null) return;
    children.push(rest);
    kept.push(shares[index] ?? 0);
  });
  return normaliseLayout({ ...layout, children, splitPercentages: kept });
}

/** Puts `node` beside `target` in a new split, taking `share` of the target's space. */
function beside(target: TilesLayout, node: TilesLayout, side: TileSide, share: number): TilesSplit {
  const first = side === "left" || side === "top";
  return {
    type: "split",
    direction: side === "left" || side === "right" ? "row" : "column",
    children: first ? [node, target] : [target, node],
    splitPercentages: first ? [share, 100 - share] : [100 - share, share],
  };
}

/** The arrangement with the tile `id` replaced by what `replace` makes of it. */
function mapTile(
  layout: TilesLayout,
  id: string,
  replace: (tile: string) => TilesLayout,
): TilesLayout {
  if (!isSplit(layout)) return layout === id ? replace(layout) : layout;
  return { ...layout, children: layout.children.map((child) => mapTile(child, id, replace)) };
}

/**
 * Puts a tile beside another, or at an edge of the whole arrangement, taking it from where it was
 * if it was there already. It is how a tile is added, split off or moved, from the keyboard as from
 * a drag. A tile cannot go beside itself. A tile placed beside a missing tile goes to the edge
 * instead.
 */
export function placeTile(
  layout: TilesLayout | null,
  id: string,
  { beside: other, side, share }: TilePlace,
): TilesLayout {
  if (other === id) return layout ?? id;
  const rest = removeTile(layout, id);
  if (rest === null) return id;
  const target = other !== undefined && tileIds(rest).includes(other) ? other : undefined;
  // At an edge, along a split that runs that way, the tile takes as much as each of the split's
  // children has.
  const along = side === "left" || side === "right" ? "row" : "column";
  const count = !target && isSplit(rest) && rest.direction === along ? rest.children.length : 1;
  const part = Math.min(90, Math.max(10, share ?? 100 / (count + 1)));
  const placed = target
    ? mapTile(rest, target, (tile) => beside(tile, id, side, part))
    : beside(rest, id, side, part);
  return normaliseLayout(placed) ?? id;
}

/**
 * Shows another tile in a tile's place, at its size, as react-mosaic's `replaceWith` does. The
 * replaced tile leaves the arrangement. A tile already in the arrangement swaps places with it
 * instead.
 */
export function replaceTile(
  layout: TilesLayout | null,
  id: string,
  by: string,
): TilesLayout | null {
  if (layout === null || !tileIds(layout).includes(id)) return layout;
  if (tileIds(layout).includes(by)) return swapTiles(layout, id, by);
  return mapTile(layout, id, () => by);
}

/**
 * Lays the tiles out evenly, in reading order, in rows of equal tiles. Each row has as many across
 * as suit a space of this width to height, so each tile is as near square as the count allows.
 */
export function balanceTiles(layout: TilesLayout | null, aspect = 1): TilesLayout | null {
  const ids = tileIds(layout);
  if (ids.length < 2) return ids[0] ?? null;
  const across = Math.min(ids.length, Math.max(1, Math.round(Math.sqrt(ids.length * aspect))));
  const rows: TilesLayout[] = [];
  for (let start = 0; start < ids.length; start += across) {
    const row = ids.slice(start, start + across);
    rows.push(
      row.length === 1
        ? (row[0] ?? "")
        : {
            type: "split",
            direction: "row",
            children: row,
            splitPercentages: row.map(() => 100 / row.length),
          },
    );
  }
  if (rows.length === 1) return rows[0] ?? null;
  return {
    type: "split",
    direction: "column",
    children: rows,
    splitPercentages: rows.map(() => 100 / rows.length),
  };
}

/**
 * Makes a tile larger, as react-mosaic's `expand` does. Each split on the path to it gives its part
 * `share` percent, and the rest share what is left. Its neighbours stay, only smaller.
 */
export function expandTile(layout: TilesLayout | null, id: string, share = 70): TilesLayout | null {
  if (layout === null || !isSplit(layout)) return layout;
  const part = Math.min(90, Math.max(10, share));
  const at = layout.children.findIndex((child) => tileIds(child).includes(id));
  if (at === -1) return layout;
  const rest = (100 - part) / (layout.children.length - 1);
  return {
    ...layout,
    children: layout.children.map((child, index) =>
      index === at ? (expandTile(child, id, share) ?? child) : child,
    ),
    splitPercentages: layout.children.map((_, index) => (index === at ? part : rest)),
  };
}

/** The node at a path, as react-mosaic numbers it, which is a tile, a split, or null. */
function nodeAt(layout: TilesLayout | null, path: readonly number[]): TilesLayout | null {
  let node = layout;
  for (const index of path) {
    if (node === null || !isSplit(node)) return null;
    node = node.children[index] ?? null;
  }
  return node;
}

/** @internal The tile at a path, as react-mosaic numbers it, if a tile is there. */
export function tileAt(layout: TilesLayout | null, path: readonly number[]): string | undefined {
  const node = nodeAt(layout, path);
  return typeof node === "string" ? node : undefined;
}

/** Exchanges two tiles' places, each taking the other's space. Both must be there. */
export function swapTiles(layout: TilesLayout | null, a: string, b: string): TilesLayout | null {
  if (layout === null || a === b) return layout;
  const ids = tileIds(layout);
  if (!ids.includes(a) || !ids.includes(b)) return layout;
  return exchange(layout, a, b);
}

function exchange(layout: TilesLayout, a: string, b: string): TilesLayout {
  if (!isSplit(layout)) {
    if (layout === a) return b;
    return layout === b ? a : layout;
  }
  return { ...layout, children: layout.children.map((child) => exchange(child, a, b)) };
}

/**
 * @internal The arrangement with a tile's share given to its split's other children in proportion,
 * but with the tile still in it, as a dragged tile is while it is away. The rest then show where it
 * could go.
 */
export function hideTile(layout: TilesLayout | null, id: string): TilesLayout | null {
  if (layout === null || !isSplit(layout)) return layout;
  const shares = sharesOf(layout);
  const at = layout.children.indexOf(id);
  if (at !== -1) {
    const rest = 100 - (shares[at] ?? 0);
    return {
      ...layout,
      splitPercentages: shares.map((share, index) =>
        index === at || rest <= 0 ? 0 : (share / rest) * 100,
      ),
    };
  }
  return { ...layout, children: layout.children.map((child) => hideTile(child, id) ?? child) };
}

/**
 * @internal The arrangement's structure, without its shares, which is what a path names. A gesture
 * that began in one structure is not finished in another, where its path could name another
 * split.
 */
export function shapeOf(layout: TilesLayout | null): string {
  const shape = (node: TilesLayout): unknown =>
    isSplit(node) ? [node.direction, node.children.map(shape)] : node;
  return JSON.stringify(layout === null ? null : shape(layout));
}

/** The split at a path, if there is one. */
function splitAt(layout: TilesLayout | null, path: readonly number[]): TilesSplit | null {
  const node = nodeAt(layout, path);
  return node !== null && isSplit(node) ? node : null;
}

/**
 * @internal Moves the line after child `index` of the split at `path`, so that child has `share`
 * percent of the split. The child after it gives or takes the difference, and the rest stay still.
 */
export function resizeTiles(
  layout: TilesLayout | null,
  path: readonly number[],
  index: number,
  share: number,
): TilesLayout | null {
  const split = splitAt(layout, path);
  if (layout === null || !split) return layout;
  const shares = sharesOf(split);
  const pair = (shares[index] ?? 0) + (shares[index + 1] ?? 0);
  const next = Math.min(pair, Math.max(0, share));
  const changed = shares.map((each, at) => {
    if (at === index) return next;
    return at === index + 1 ? pair - next : each;
  });
  const update = (node: TilesLayout, depth: number): TilesLayout => {
    if (!isSplit(node)) return node;
    if (depth === path.length) return { ...node, splitPercentages: changed };
    const at = path[depth];
    return {
      ...node,
      children: node.children.map((child, each) =>
        each === at ? update(child, depth + 1) : child,
      ),
    };
  };
  return update(layout, 0);
}

/** A divider's sizes in pixels, which are the tiles before it, its limits, and its even point. */
type DividerPixels = {
  /** The size of the tiles before the line, as people see it. */
  size: number;
  min: number;
  max: number;
  /** The size that shares the space evenly between the two sides. */
  even: number;
  /** The share of the split a size in pixels comes to. */
  share: (pixels: number) => number;
};

/**
 * @internal Turns a divider's shares into pixels, in a board this many pixels long in its split's
 * direction. The board's tiles each give a pixel to the line after them. A split's space is
 * therefore a pixel more than its tiles show, and a tile's size is its share of that space, less
 * its line.
 */
export function dividerPixels(
  divider: Pick<TilesDivider, "box" | "direction" | "index" | "shares">,
  room: number,
  minSize: number,
): DividerPixels {
  const { box, direction, index, shares } = divider;
  const row = direction === "row";
  const extent = row ? 100 - box.left - box.right : 100 - box.top - box.bottom;
  const span = Math.max(1, (room + 1) * (extent / 100));
  const pair = (((shares[index] ?? 0) + (shares[index + 1] ?? 0)) / 100) * span;
  const least = Math.max(0, Math.min(minSize, pair / 2 - 1));
  return {
    size: Math.max(0, Math.round(((shares[index] ?? 0) / 100) * span - 1)),
    min: Math.round(least),
    // Never below the minimum, however small the space.
    max: Math.round(Math.max(least, pair - 2 - least)),
    even: Math.max(0, Math.round(pair / 2 - 1)),
    share: (pixels) => ((pixels + 1) / span) * 100,
  };
}

/**
 * @internal Every line between neighbours, with the box of its split, worked out as react-mosaic
 * lays the tiles out. Each split divides its box among its children by their shares.
 */
export function dividersOf(layout: TilesLayout | null): TilesDivider[] {
  const found: TilesDivider[] = [];
  const walk = (node: TilesLayout, box: TilesBox, path: number[]) => {
    if (!isSplit(node)) return;
    const shares = sharesOf(node);
    const row = node.direction === "row";
    const start = row ? box.left : box.top;
    const extent = row ? 100 - box.left - box.right : 100 - box.top - box.bottom;
    let before = 0;
    node.children.forEach((child, index) => {
      const share = shares[index] ?? 0;
      const from = start + (extent * before) / 100;
      const to = start + (extent * (before + share)) / 100;
      const inner: TilesBox = row
        ? { ...box, left: from, right: 100 - to }
        : { ...box, top: from, bottom: 100 - to };
      walk(child, inner, [...path, index]);
      before += share;
      const next = node.children[index + 1];
      if (next === undefined) return;
      found.push({
        path,
        index,
        direction: node.direction,
        box,
        at: to,
        shares,
        before: tileIds(child),
        after: tileIds(next),
      });
    });
  };
  if (layout !== null) walk(layout, { top: 0, right: 0, bottom: 0, left: 0 }, []);
  return found;
}
