"use client";

import { HTML5toTouch } from "rdndmb-html5-to-touch";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  createContext,
  type MouseEvent,
  memo,
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type ConnectDragPreview, DndProvider, useDrag, useDragLayer, useDrop } from "react-dnd";
import { MultiBackend } from "react-dnd-multi-backend";
import { createPortal } from "react-dom";
import { MosaicDragType, MosaicWindow, MosaicWithoutDragDropContext } from "react-mosaic-component";
import {
  Button,
  type ButtonProps,
  DropdownMenu,
  DropdownMenuTrigger,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuSeparator,
  MenuSubmenu,
  ResizableHandle,
  ScrollArea,
  Tooltip,
  useScopeSound,
} from "x-govuk-ui";
import { useMediaQuery, useMergedRef, useStoredState } from "x-govuk-ui/internal";
import {
  balanceTiles,
  dividerPixels,
  dividersOf,
  expandTile,
  hideTile,
  isTilesLayout,
  keepTiles,
  normaliseLayout,
  placeTile,
  removeTile,
  replaceTile,
  resizeTiles,
  shapeOf,
  swapTiles,
  type TilePlace,
  type TileSide,
  type TilesDivider,
  type TilesLayout,
  tileAt,
  tileIds,
} from "./layout";

// How the parts fit. A TilesProvider keeps the arrangement and every action on it, and its parts
// can sit anywhere inside it. The parts are a TilesBoard, where react-mosaic draws the tiles, a
// TilesDock, and a service's own controls. Tiles is the provider with its board and any parts
// above it.
//
// react-mosaic draws the board and its drop targets, and nothing else. Every change, from a drag,
// a divider or a menu, goes through this file's own helpers, by the tiles' ids. A drag and the
// keyboard therefore do the same thing, and nothing depends on how react-mosaic changes a tree.

/** The arrangement users leave, kept between visits. */
type Saved = { version: 1; layout: TilesLayout | null };

/** A tile the Tiles can show, open or not, and its title. */
export type TileEntry = { id: string; title: string };

/**
 * What a drag carries. react-mosaic's drop targets accept any drag of its own type, and its windows
 * show their targets for a drag that carries their board's id. A tile's drag carries the tile, and
 * a dock's drag carries the tile it opens.
 */
type DragItem = { mosaicId: string; tile?: string; dock?: string };

/** Where react-mosaic's drop targets say a drag landed, at an edge, in a tile's middle, or out. */
type DropResult = { path?: number[]; position?: TileSide; swap?: boolean; remove?: boolean };

/** What the parts and a service can do with the tiles. Every action takes the tiles' ids. */
export type TilesActions = {
  /** Opens a closed tile, beside another or at an edge. By default, at the right-hand edge. */
  open: (id: string, place?: TilePlace) => void;
  /** Closes a tile, with its neighbours taking its space, and moves focus to the tile beside it. */
  close: (id: string) => void;
  /** Moves a tile beside another, or to an edge. */
  move: (id: string, place: TilePlace) => void;
  swap: (id: string, other: string) => void;
  /** Shows a tile in another's place, at its size. The replaced tile closes. */
  replace: (id: string, by: string) => void;
  /**
   * Splits a tile, with the Tiles' `createTile` making the tile beside it. Focus moves to the new
   * tile, unless focus has gone elsewhere while it was made.
   */
  split: (id: string, direction: TileSplitDirection) => void;
  /** Gives a tile most of the space at each level, as react-mosaic's expand does. */
  expand: (id: string) => void;
  /** Lays every tile out evenly, in rows suited to the board's proportions. */
  tidy: () => void;
  maximise: (id: string) => void;
  restore: () => void;
  /** Moves focus to a tile's first control, or else its heading. */
  focus: (id: string) => void;
};

/** What a service can read of the tiles. */
export type TilesState = {
  /** The arrangement as it shows, at every step of a drag. */
  layout: TilesLayout | null;
  /** The ids of the open tiles, in reading order. */
  open: string[];
  /** The tiles the provider's `tiles` lists that are not open. */
  closed: TileEntry[];
  maximised: string | null;
  /** The tile in use, which is the one focus or the pointer entered last, while it is open. */
  active: string | null;
  /**
   * A tile's title, which is its Tile's own while open, or else its entry's in `tiles`, or its id.
   */
  titleOf: (id: string) => string;
};

/** @internal What the board and the parts share, apart from the arrangement. */
type TilesContextValue = TilesActions & {
  /** The board's id for react-mosaic, which every drag for it carries. */
  boardId: string;
  /** A tile's id in the page, for `aria-controls` and for focus. */
  domId: (id: string) => string;
  titleOf: (id: string) => string;
  closed: TileEntry[];
  maximised: string | null;
  /**
   * The tile that fills the board, which is the maximised one, or on a small screen the one in use.
   */
  shown: string | null;
  /** The tile in use, which is the one focus or the pointer entered last. */
  active: string | null;
  /** Whether the screen is below the provider's mobileBreakpoint, so the board shows one tile. */
  small: boolean;
  /** Marks a tile as the one in use. */
  use: (id: string) => void;
  announce: (words: string) => void;
  canSplit: boolean;
  message: string;
  /** Tells the provider a tile's title and the id it has in the page, while it is open. */
  register: (id: string, title: string, dom?: string) => () => void;
  board: { current: HTMLDivElement | null };
  getLayout: () => TilesLayout | null;
  /** A tile's drag, as react-dnd reports it, when it begins, and where it lands, if anywhere. */
  beginDrag: (id: string) => void;
  endDrag: (item: DragItem, result: DropResult | null) => void;
  /** A divider's drag, when it begins, at each step and when it ends, or a key that moves it. */
  beginResize: () => void;
  resize: (path: number[], index: number, share: number) => void;
  commitResize: (path: number[], index: number, share: number) => void;
};

const TilesContext = createContext<TilesContextValue | null>(null);

/**
 * The arrangement, kept apart from the rest, because it changes at every step of a divider's drag.
 * Only the parts that list the tiles read it, so the tiles themselves do not render again.
 */
const LayoutContext = createContext<TilesLayout | null>(null);

/** Which tile react-mosaic is rendering, and where it is in the arrangement. */
const SlotContext = createContext<{ id: string; path: number[] } | null>(null);

type TileContextValue = {
  id: string;
  title: string;
  headingId: string;
  headingLevel: 2 | 3 | 4 | 5 | 6;
  draggable: boolean;
};

const TileContext = createContext<TileContextValue | null>(null);

function useTiles(part: string) {
  const tiles = useContext(TilesContext);
  if (!tiles) throw new Error(`${part} must be used inside a Tiles or a TilesProvider.`);
  return tiles;
}

function useTilePart(part: string) {
  const tiles = useTiles(part);
  const tile = useContext(TileContext);
  if (!tile) throw new Error(`${part} must be used inside a Tile.`);
  return { tiles, tile };
}

/** The actions on the tiles, for a service's own controls, docks and shortcuts. */
export function useTilesActions(): TilesActions {
  const tiles = useTiles("useTilesActions");
  const { open, close, move, swap, replace, split, expand, tidy, maximise, restore, focus } = tiles;
  return useMemo(
    () => ({ open, close, move, swap, replace, split, expand, tidy, maximise, restore, focus }),
    [open, close, move, swap, replace, split, expand, tidy, maximise, restore, focus],
  );
}

/** The tiles as they are, for a service's own controls and docks. */
export function useTilesState(): TilesState {
  const tiles = useTiles("useTilesState");
  const layout = useContext(LayoutContext);
  const { closed, maximised, active, titleOf } = tiles;
  return useMemo(
    () => ({ layout, open: tileIds(layout), closed, maximised, active, titleOf }),
    [layout, closed, maximised, active, titleOf],
  );
}

/** The tile a part is in, for a service's own tile controls. */
export function useTile(): { id: string; title: string; headingId: string; maximised: boolean } {
  const { tiles, tile } = useTilePart("useTile");
  return {
    id: tile.id,
    title: tile.title,
    headingId: tile.headingId,
    maximised: tiles.maximised === tile.id,
  };
}

// react-mosaic's own drag and drop, which is HTML5's, with a switch to touch. Touch waits for a
// finger to move 10 pixels, so a tap on a tile's bar is not taken for a drag. react-mosaic's own
// provider reads the window as it renders, so the Tiles brings its own, which also renders on a
// server.
const dragOptions = {
  ...HTML5toTouch,
  backends: HTML5toTouch.backends.map((backend) =>
    backend.id === "touch"
      ? { ...backend, options: { ...(backend.options as object), touchSlop: 10 } }
      : backend,
  ),
};

// The browser's own picture of a dragged element is replaced with a transparent pixel, because the
// Tiles draws its own, for a pointer and a finger alike.
const EMPTY = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
let emptyImage: HTMLImageElement | undefined;
function blankPicture() {
  if (!emptyImage && typeof Image !== "undefined") {
    emptyImage = new Image();
    emptyImage.src = EMPTY;
  }
  return emptyImage;
}

/** Gives a drag the blank picture, instead of the browser's own. */
function useBlankPreview(preview: ConnectDragPreview) {
  useEffect(() => {
    const blank = blankPicture();
    if (blank) preview(blank, { captureDraggingState: true });
  }, [preview]);
}

/** The grip of dots that says a tile, or a dock's chip, can be dragged. */
const gripDots = (
  <svg className="x-govuk-ui-tile-grip-dots" viewBox="0 0 10 16" aria-hidden="true">
    {[3, 8, 13].flatMap((y) => [
      <circle key={`a${y}`} cx="3" cy={y} r="1.4" />,
      <circle key={`b${y}`} cx="7" cy={y} r="1.4" />,
    ])}
  </svg>
);

// Each side's words, for the menu beside a tile and at an edge, and for the announcement.
const sideWords: Record<TileSide, { beside: string; edge: string; moved: string }> = {
  left: { beside: "On its left", edge: "To the left edge", moved: "to the left of" },
  right: { beside: "On its right", edge: "To the right edge", moved: "to the right of" },
  top: { beside: "Above it", edge: "To the top", moved: "above" },
  bottom: { beside: "Below it", edge: "To the bottom", moved: "below" },
};
const sides = Object.keys(sideWords) as TileSide[];

/** Names tiles in a sentence, such as "Notes", "Notes and Map", or "Notes, Map and Files". */
function inWords(names: string[]) {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The first control in an element that can take focus now, which is shown and not disabled. */
function firstControl(element: Element | null | undefined) {
  for (const control of element?.querySelectorAll<HTMLElement>(
    "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
  ) ?? []) {
    if (control.matches(":disabled") || control.getClientRects().length === 0) continue;
    return control;
  }
  return null;
}

/** Focuses an element that takes no focus of its own, such as a heading, for a moment. */
function focusAside(element: HTMLElement | null | undefined) {
  if (!element) return;
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1");
  element.focus();
}

export type TilesLayoutOptions = {
  /**
   * Keeps the arrangement under this key, in this browser. Without it, the arrangement lasts only
   * as long as the page.
   */
  storageKey?: string;
  /** The arrangement to start with, and to go back to when the kept one cannot be used. */
  defaultValue: TilesLayout | null;
  /** The tiles that still exist. Any kept under the key that are not among them are left out. */
  ids?: readonly string[];
};

/**
 * An arrangement for Tiles, kept in this browser, for Tiles you control, such as to lay them out
 * again from an empty state. What was kept is checked before it is used. If it is not an
 * arrangement, or has a tile twice, `defaultValue` replaces it. Tiles no longer among `ids` are
 * left out. Uncontrolled Tiles keep their arrangement this way under their `storageKey`.
 */
export function useTilesLayout({
  storageKey,
  defaultValue,
  ids,
}: TilesLayoutOptions): [TilesLayout | null, (layout: TilesLayout | null) => void] {
  const [own, setOwn] = useState(defaultValue);
  const [saved, setSaved] = useStoredState<Saved | null>(storageKey, null);
  let usable: TilesLayout | null | undefined;
  if (saved?.version === 1 && (saved.layout === null || isTilesLayout(saved.layout))) {
    usable = ids === undefined ? saved.layout : keepTiles(saved.layout, ids);
  }
  // Storage is read again each render. What was kept keeps one identity while it stays the same, so
  // the tiles do not lay out again needlessly.
  const kept = useRef<{ text: string; layout: TilesLayout | null } | undefined>(undefined);
  if (usable === undefined) kept.current = undefined;
  else {
    const text = JSON.stringify(usable);
    if (kept.current?.text !== text) kept.current = { text, layout: usable };
  }
  const set = useCallback(
    (next: TilesLayout | null) => {
      setOwn(next);
      if (storageKey) setSaved({ version: 1, layout: next });
    },
    [storageKey, setSaved],
  );
  return [kept.current ? kept.current.layout : own, set];
}

export type TilesProviderProps = {
  /** The arrangement, for Tiles you keep track of. Null means no tiles. */
  value?: TilesLayout | null;
  /**
   * The arrangement uncontrolled Tiles start with, unless users left another under `storageKey`.
   */
  defaultValue?: TilesLayout | null;
  /**
   * Called with each arrangement users make, by dragging a tile or a divider, by a menu's move, by
   * splitting or by closing. A divider calls it as its drag ends, not at every step.
   */
  onValueChange?: (layout: TilesLayout | null) => void;
  /**
   * For uncontrolled Tiles, keeps the arrangement users make under this key, in this browser.
   * Controlled Tiles keep theirs with `useTilesLayout`, which checks it the same way.
   */
  storageKey?: string;
  /**
   * Every tile the Tiles can show, with its title. Closed tiles wait in a `TilesDock`, and in each
   * tile's Show here. The entries name a tile before its Tile does, so a Tile needs no title of its
   * own. An arrangement kept under `storageKey` loses any tile not among them.
   */
  tiles?: readonly TileEntry[];
  /**
   * Makes the tile a split adds, and returns its id. That can be a new tile, or one already open,
   * to move beside the tile split. Without it, tiles cannot be split. Null, or a promise that
   * rejects, adds nothing.
   */
  createTile?: () => string | null | Promise<string | null>;
  /** The maximised tile, for Tiles you keep track of. Null means none. */
  maximised?: string | null;
  onMaximisedChange?: (id: string | null) => void;
  /**
   * Called with the tile in use, which is the one focus or the pointer entered last, as it changes.
   */
  onActiveChange?: (id: string | null) => void;
  /**
   * The widest screen, in pixels, on which the board shows one tile at a time. The tile in use
   * fills the board, with a pager in its bar to the others, because tiles side by side on a phone
   * each have too little space. Without it, the tiles keep their arrangement at every width.
   */
  mobileBreakpoint?: number;
  children?: ReactNode;
};

/**
 * Keeps a Tiles' arrangement and every action on it, for parts anywhere inside, such as a
 * `TilesBoard`, a `TilesDock` in a sidebar, or a service's own controls with `useTilesActions`.
 * `Tiles` is this provider with its board.
 */
export function TilesProvider({
  value,
  defaultValue = null,
  onValueChange,
  storageKey,
  tiles: entries,
  createTile,
  maximised: maximisedValue,
  onMaximisedChange,
  onActiveChange,
  mobileBreakpoint,
  children,
}: TilesProviderProps) {
  const boardId = useId();
  const play = useScopeSound();
  const board = useRef<HTMLDivElement | null>(null);
  // A page often makes its list of tiles again each render, so its text stands in for it.
  const entriesText = JSON.stringify(entries ?? []);
  const known = useMemo(() => JSON.parse(entriesText) as TileEntry[], [entriesText]);
  const [own, setOwn] = useTilesLayout({
    storageKey: value === undefined ? storageKey : undefined,
    defaultValue,
    ids: entries ? known.map((entry) => entry.id) : undefined,
  });
  const committed = value !== undefined ? value : own;
  // While a tile or a divider is dragged, the arrangement it is making shows, and it is kept once
  // the drag ends.
  const [live, setLive] = useState<TilesLayout | null | undefined>(undefined);
  // Shares are scaled to add up to 100 before react-mosaic lays the tiles out. The dividers work
  // them out the same way, so the two always agree.
  const layout = useMemo(
    () => normaliseLayout(live !== undefined ? live : committed),
    [live, committed],
  );
  const latest = useRef({ committed, layout });
  latest.current = { committed, layout };
  const ids = tileIds(layout);
  const idsText = JSON.stringify(ids);

  const [ownMaximised, setOwnMaximised] = useState<string | null>(null);
  const wanted = maximisedValue !== undefined ? maximisedValue : ownMaximised;
  const maximised = wanted !== null && ids.includes(wanted) ? wanted : null;
  const setMaximised = useCallback(
    (id: string | null) => {
      if (maximisedValue === undefined) setOwnMaximised(id);
      onMaximisedChange?.(id);
    },
    [maximisedValue, onMaximisedChange],
  );

  // The tile in use, while it is open. The service is told as it changes.
  const [used, use] = useState<string | null>(null);
  const active = used !== null && ids.includes(used) ? used : null;
  const told = useRef<string | null>(null);
  useEffect(() => {
    if (told.current === active) return;
    told.current = active;
    onActiveChange?.(active);
  }, [active, onActiveChange]);
  // On a small screen, one tile fills the board, which is the one in use, or else the first.
  const small = useMediaQuery(
    mobileBreakpoint === undefined ? "not all" : `(max-width: ${mobileBreakpoint}px)`,
  );
  const shown = small ? (active ?? ids[0] ?? null) : maximised;

  const [registered, setRegistered] = useState<
    ReadonlyMap<string, { title: string; dom?: string }>
  >(new Map());
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const commit = useCallback(
    (next: TilesLayout | null) => {
      setLive(undefined);
      if (value === undefined) setOwn(next);
      onValueChange?.(next);
    },
    [value, setOwn, onValueChange],
  );

  // A tile's page id is its board's id with its own, encoded, so different ids stay different and
  // contain no spaces, because `aria-controls` lists them with spaces between.
  const domId = useCallback(
    (id: string) => registered.get(id)?.dom ?? `${boardId}tile-${encodeURIComponent(id)}`,
    [registered, boardId],
  );
  const titleOf = useCallback(
    (id: string) =>
      registered.get(id)?.title ?? known.find((entry) => entry.id === id)?.title ?? id,
    [registered, known],
  );
  const closed = useMemo(() => {
    const open = JSON.parse(idsText) as string[];
    return known.filter((entry) => !open.includes(entry.id));
  }, [known, idsText]);
  // A new message each time, even one the same as the last, so screen readers say it again.
  const announce = useCallback((words: string) => {
    setMessage("");
    requestAnimationFrame(() => setMessage(words));
  }, []);
  // Focus goes to a tile's first control that can take it, or else its heading. With no tiles
  // left, it goes to what the empty board shows.
  const focus = useCallback(
    (id: string) =>
      requestAnimationFrame(() => {
        const tile = document.getElementById(domId(id));
        const control = firstControl(tile?.querySelector(".x-govuk-ui-tile-bar"));
        if (control) control.focus();
        else focusAside(tile?.querySelector<HTMLElement>(".x-govuk-ui-tile-heading"));
      }),
    [domId],
  );
  const focusEmpty = useCallback(
    () =>
      requestAnimationFrame(() => {
        const empty = board.current?.querySelector<HTMLElement>(".x-govuk-ui-tiles-empty");
        const control = firstControl(empty);
        if (control) control.focus();
        else focusAside(empty);
      }),
    [],
  );

  const register = useCallback((id: string, title: string, dom?: string) => {
    setRegistered((current) => {
      const was = current.get(id);
      if (was?.title === title && was.dom === dom) return current;
      return new Map(current).set(id, { title, dom });
    });
    return () =>
      setRegistered((current) => {
        if (!current.has(id)) return current;
        const next = new Map(current);
        next.delete(id);
        return next;
      });
  }, []);

  // The actions. Each reads the current arrangement, not the one when the action was created.
  const closeTile = useCallback(
    (id: string, { moveFocus = true } = {}) => {
      const before = tileIds(latest.current.committed);
      if (!before.includes(id)) return;
      const at = before.indexOf(id);
      // Focus goes to the tile beside it in reading order, so it is not lost with the tile.
      const next = before[at + 1] ?? before[at - 1];
      if (maximised === id) setMaximised(null);
      commit(removeTile(latest.current.committed, id));
      announce(`${titleOf(id)} closed`);
      if (!moveFocus) return;
      if (next) focus(next);
      else focusEmpty();
    },
    [commit, announce, titleOf, focus, focusEmpty, maximised, setMaximised],
  );
  const close = useCallback((id: string) => closeTile(id), [closeTile]);
  const move = useCallback(
    (id: string, place: TilePlace) => {
      const now = latest.current.committed;
      if (!tileIds(now).includes(id)) return;
      commit(placeTile(now, id, place));
      const words = sideWords[place.side];
      // A missing tile to go beside sends it to the edge, as `placeTile` does.
      const where =
        place.beside && place.beside !== id && tileIds(now).includes(place.beside)
          ? `${words.moved} ${titleOf(place.beside)}`
          : words.edge.toLowerCase();
      announce(`${titleOf(id)} moved ${where}`);
    },
    [commit, announce, titleOf],
  );
  const swap = useCallback(
    (id: string, other: string) => {
      const now = latest.current.committed;
      if (!tileIds(now).includes(id) || !tileIds(now).includes(other)) return;
      commit(swapTiles(now, id, other));
      announce(`${titleOf(id)} swapped with ${titleOf(other)}`);
    },
    [commit, announce, titleOf],
  );
  const showIn = useCallback(
    (id: string, by: string, { moveFocus = true } = {}) => {
      const now = latest.current.committed;
      if (!tileIds(now).includes(id)) return;
      // A maximised tile would hide the one shown, so it is restored first.
      setMaximised(null);
      commit(replaceTile(now, id, by));
      announce(`${titleOf(by)} shown in place of ${titleOf(id)}`);
      if (moveFocus) focus(by);
    },
    [commit, announce, titleOf, focus, setMaximised],
  );
  const replace = useCallback((id: string, by: string) => showIn(id, by), [showIn]);
  const openTile = useCallback(
    (id: string, place: TilePlace = { side: "right" }, { moveFocus = true } = {}) => {
      setMaximised(null);
      commit(placeTile(latest.current.committed, id, place));
      announce(`${titleOf(id)} opened`);
      if (moveFocus) focus(id);
    },
    [commit, announce, titleOf, focus, setMaximised],
  );
  const open = useCallback((id: string, place?: TilePlace) => openTile(id, place), [openTile]);
  const split = useCallback(
    async (id: string, direction: TileSplitDirection) => {
      if (!createTile) return;
      const pressed = document.activeElement;
      let added: string | null;
      try {
        added = await createTile();
      } catch {
        return;
      }
      // A tile made after the split tile was closed, or after the Tiles went, has nowhere to go.
      if (!added || !mounted.current || !tileIds(latest.current.committed).includes(id)) return;
      setMaximised(null);
      const side = direction === "across" ? "right" : "bottom";
      commit(placeTile(latest.current.committed, added, { beside: id, side }));
      announce(`${titleOf(id)} split ${direction}`);
      // A tile made by a server can take a while. Focus moved elsewhere meanwhile is left there.
      // Focus still where it was, which a press does not move in Safari, moves to the new tile, as
      // does focus back in the split tile, where a menu returns it on closing.
      const now = document.activeElement;
      if (
        !now ||
        now === pressed ||
        now === document.body ||
        document.getElementById(domId(id))?.contains(now)
      )
        focus(added);
    },
    [createTile, commit, announce, titleOf, setMaximised, focus, domId],
  );
  const splitTile = useCallback(
    (id: string, direction: TileSplitDirection) => void split(id, direction),
    [split],
  );
  const expand = useCallback(
    (id: string) => {
      commit(expandTile(latest.current.committed, id));
      announce(`${titleOf(id)} made larger`);
    },
    [commit, announce, titleOf],
  );
  // Even rows suit the board's own proportions, so each tile is as near square as it can be.
  const tidy = useCallback(() => {
    const box = board.current?.getBoundingClientRect();
    const aspect = box && box.height > 0 ? box.width / box.height : 1;
    commit(balanceTiles(latest.current.committed, aspect));
    announce("Tiles set out evenly");
  }, [commit, announce]);
  const maximise = useCallback((id: string) => setMaximised(id), [setMaximised]);
  const restore = useCallback(() => setMaximised(null), [setMaximised]);

  // A tile's drag. The tile steps aside a moment after the drag begins, and the rest show where it
  // could go. It waits, because a browser cancels a drag whose element changes as it starts.
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const beginDrag = useCallback((id: string) => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setLive(hideTile(latest.current.committed, id)), 0);
  }, []);
  // However it ends, the arrangement the drag was making is discarded. A drop is read against the
  // arrangement drawn while the drag lasted, where its path was. It is applied by ids to the
  // current arrangement, so a change from elsewhere meanwhile is kept.
  const endDrag = useCallback(
    (item: DragItem, result: DropResult | null) => {
      clearTimeout(hideTimer.current);
      try {
        if (!result) return;
        const target = result.path ? tileAt(latest.current.layout, result.path) : undefined;
        if (item.tile) {
          if (result.remove) closeTile(item.tile, { moveFocus: false });
          else if (result.swap && target) swap(item.tile, target);
          else if (result.position) move(item.tile, { beside: target, side: result.position });
          else return;
        } else if (item.dock) {
          if (result.swap && target) showIn(target, item.dock, { moveFocus: false });
          else if (result.position) {
            openTile(item.dock, { beside: target, side: result.position }, { moveFocus: false });
          } else return;
        }
        play(result.remove ? "close" : "swoosh");
      } finally {
        setLive(undefined);
      }
    },
    [closeTile, swap, move, showIn, openTile, play],
  );

  // A divider's drag, which shows as it goes and is kept as it ends. Its path names a split in the
  // structure the drag began in, so a drag that ends in another structure is not kept.
  const resizeShape = useRef<string | undefined>(undefined);
  const beginResize = useCallback(() => {
    resizeShape.current = shapeOf(latest.current.committed);
  }, []);
  const resize = useCallback((path: number[], index: number, share: number) => {
    setLive(resizeTiles(latest.current.layout, path, index, share));
  }, []);
  const commitResize = useCallback(
    (path: number[], index: number, share: number) => {
      const began = resizeShape.current;
      resizeShape.current = undefined;
      const now = latest.current.committed;
      if (began !== undefined && began !== shapeOf(now)) {
        setLive(undefined);
        return;
      }
      commit(resizeTiles(now, path, index, share));
    },
    [commit],
  );

  const getLayout = useCallback(() => latest.current.layout, []);
  const context = useMemo<TilesContextValue>(
    () => ({
      open,
      close,
      move,
      swap,
      replace,
      split: splitTile,
      expand,
      tidy,
      maximise,
      restore,
      focus,
      boardId,
      domId,
      titleOf,
      closed,
      maximised,
      shown,
      active,
      small,
      use,
      announce,
      canSplit: Boolean(createTile),
      message,
      register,
      board,
      getLayout,
      beginDrag,
      endDrag,
      beginResize,
      resize,
      commitResize,
    }),
    [
      open,
      close,
      move,
      swap,
      replace,
      splitTile,
      expand,
      tidy,
      maximise,
      restore,
      focus,
      boardId,
      domId,
      titleOf,
      closed,
      maximised,
      shown,
      active,
      small,
      announce,
      createTile,
      message,
      register,
      getLayout,
      beginDrag,
      endDrag,
      beginResize,
      resize,
      commitResize,
    ],
  );

  return (
    <TilesContext value={context}>
      <LayoutContext value={layout}>
        <DndProvider
          backend={MultiBackend}
          options={dragOptions}
          context={typeof window === "undefined" ? undefined : window}
        >
          {children}
          <DragPicture />
        </DndProvider>
      </LayoutContext>
    </TilesContext>
  );
}

/**
 * @internal The picture that follows a drag of a tile or a dock's chip, for a pointer and a finger
 * alike, above everything in the page.
 */
function DragPicture() {
  const tiles = useTiles("DragPicture");
  const { item, offset } = useDragLayer((monitor) => ({
    item: monitor.isDragging() ? (monitor.getItem() as DragItem | null) : null,
    offset: monitor.getClientOffset(),
  }));
  const id = item?.mosaicId === tiles.boardId ? (item.tile ?? item.dock) : undefined;
  if (!id || !offset || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="x-govuk-ui-tiles-drag-picture"
      style={{ transform: `translate(${offset.x + 12}px, ${offset.y + 12}px)` }}
      aria-hidden="true"
    >
      {tiles.titleOf(id)}
    </div>,
    document.body,
  );
}

export type TilesBoardProps = ComponentPropsWithRef<"div"> & {
  /**
   * Renders the tile with this id, as a `Tile`. A tile renders again when this function changes,
   * or the tile moves, and not at each step of a divider's drag.
   */
  renderTile: (id: string) => ReactElement;
  /**
   * What a tile dropped on another does. `"split"` splits it at the edge it is dropped on.
   * `"swap"` swaps their places. `"split-and-swap"` does both, swapping at its middle.
   */
  dropBehaviour?: "split" | "swap" | "split-and-swap";
  /** The smallest size, in pixels, a divider leaves a tile on either side. */
  minSize?: number;
  /** Moves each divider in steps of this many pixels as it is dragged, and with each arrow key. */
  snap?: number;
  /** Shows a grip on each divider, so it is easier to find. */
  grip?: boolean;
  /**
   * Moves only the line as a divider is dragged, and resizes the tiles once as it is let go. Use it
   * for tiles that are slow to draw, such as charts.
   */
  previewResize?: boolean;
  /** Shows while no tile is open, such as an Empty state with a way to bring them back. */
  empty?: ReactNode;
};

/**
 * The board where react-mosaic draws the tiles, with the dividers between them. It fills the space
 * its container gives it. Put it in a `TilesProvider`, or use `Tiles`, which has one.
 */
export function TilesBoard({
  renderTile,
  dropBehaviour = "split",
  minSize = 120,
  snap,
  grip = false,
  previewResize = false,
  empty,
  className = "",
  ref,
  ...props
}: TilesBoardProps) {
  const tiles = useTiles("TilesBoard");
  const layout = useContext(LayoutContext);
  const { boardId: id, board } = tiles;
  const own = useCallback(
    (element: HTMLDivElement | null) => {
      board.current = element;
    },
    [board],
  );
  const merged = useMergedRef(own, ref);
  const [room, setRoom] = useState({ width: 0, height: 0 });
  const [resizing, setResizing] = useState(false);

  // The board's size, which turns each divider's share into pixels.
  useLayoutEffect(() => {
    const target = board.current;
    if (!target) return;
    const measure = () =>
      setRoom((current) =>
        current.width === target.clientWidth && current.height === target.clientHeight
          ? current
          : { width: target.clientWidth, height: target.clientHeight },
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [board]);

  // react-mosaic's drop targets accept any drag of its type, from any Tiles. While a tile from
  // other Tiles is dragged, this board takes no drop.
  const foreign = useDragLayer((monitor) => {
    const item = monitor.isDragging() ? (monitor.getItem() as DragItem | null) : null;
    return Boolean(item?.mosaicId && item.mosaicId !== id);
  });

  const slot = useCallback(
    (tile: string, path: number[]) => <TileSlot id={tile} path={path} render={renderTile} />,
    [renderTile],
  );
  const zero = <div className="mosaic-zero-state x-govuk-ui-tiles-empty">{empty}</div>;
  return (
    <div
      {...props}
      ref={merged}
      className={`x-govuk-ui-tiles-board ${className}`.trim()}
      data-maximised={tiles.shown !== null || undefined}
      data-small={tiles.small || undefined}
      data-several={(layout !== null && tileIds(layout).length > 1) || undefined}
      data-resizing={resizing || undefined}
      data-snap={snap ? "" : undefined}
      data-foreign={foreign || undefined}
    >
      <MosaicWithoutDragDropContext<string>
        mosaicId={id}
        className="x-govuk-ui-tiles-mosaic"
        value={layout}
        // react-mosaic changes no tree itself. The Tiles' own drag sources and dividers do.
        onChange={ignore}
        renderTile={slot}
        resize="DISABLED"
        dropBehavior={dropBehaviour}
        zeroStateView={zero}
      />
      {room.width > 0 && layout !== null && (
        <div className="x-govuk-ui-tiles-dividers">
          {dividersOf(layout).map((divider) => (
            <TileDivider
              key={`${divider.direction}:${divider.before.at(-1)}|${divider.after[0]}`}
              divider={divider}
              room={room}
              minSize={minSize}
              snap={snap}
              grip={grip}
              preview={previewResize}
              titleOf={tiles.titleOf}
              domId={tiles.domId}
              onDraggingChange={(dragging) => {
                if (dragging) tiles.beginResize();
                setResizing(dragging);
              }}
              onShareChange={(share) => {
                if (!previewResize) tiles.resize(divider.path, divider.index, share);
              }}
              onShareCommit={(share) => tiles.commitResize(divider.path, divider.index, share)}
            />
          ))}
        </div>
      )}
      <div className="x-govuk-ui-visually-hidden" aria-live="polite">
        {tiles.message}
      </div>
    </div>
  );
}

const ignore = () => {};

/**
 * @internal A tile as react-mosaic renders it, and where it is. react-mosaic renders every tile
 * again whenever the arrangement changes, such as at each step of a divider's drag. A tile renders
 * again only when it moves or the page's `renderTile` changes.
 */
const TileSlot = memo(
  function TileSlot({
    id,
    path,
    render,
  }: {
    id: string;
    path: number[];
    render: (id: string) => ReactElement;
  }) {
    const slot = useMemo(() => ({ id, path }), [id, path]);
    return <SlotContext value={slot}>{render(id)}</SlotContext>;
  },
  (before, after) =>
    before.id === after.id &&
    before.render === after.render &&
    before.path.join() === after.path.join(),
);

type DividerProps = {
  divider: TilesDivider;
  room: { width: number; height: number };
  minSize: number;
  snap?: number;
  grip: boolean;
  /** Moves only the line while it is dragged, while the tiles wait for it to be let go. */
  preview: boolean;
  titleOf: (id: string) => string;
  domId: (id: string) => string;
  onDraggingChange: (dragging: boolean) => void;
  onShareChange: (share: number) => void;
  onShareCommit: (share: number) => void;
};

/**
 * @internal The line between two neighbours in a split, as a Resizable handle that sizes the tiles
 * before it. It works in pixels, as the tiles' own width or height. The split keeps shares, so the
 * tiles keep their proportions as the window changes.
 */
function TileDivider({
  divider,
  room,
  minSize,
  snap,
  grip,
  preview,
  titleOf,
  domId,
  onDraggingChange,
  onShareChange,
  onShareCommit,
}: DividerProps) {
  // Where a previewed drag has taken the line, while the tiles wait.
  const [moved, setMoved] = useState<number | null>(null);
  const { box, direction, index, shares, at } = divider;
  const row = direction === "row";
  const extent = row ? 100 - box.left - box.right : 100 - box.top - box.bottom;
  const pixels = dividerPixels(divider, row ? room.width : room.height, minSize);
  const { share } = pixels;
  // A share of the split is a share of the split's own part of the whole board.
  const line = moved === null ? at : at + ((moved - (shares[index] ?? 0)) * extent) / 100;
  const style: CSSProperties = row
    ? { left: `calc(${line}% - 1px)`, top: `${box.top}%`, bottom: `${box.bottom}%` }
    : { top: `calc(${line}% - 1px)`, left: `${box.left}%`, right: `${box.right}%` };
  return (
    <ResizableHandle
      className="x-govuk-ui-tiles-divider"
      orientation={row ? "vertical" : "horizontal"}
      label={`Resize ${inWords(divider.before.map(titleOf))}`}
      controls={divider.before.map(domId).join(" ")}
      panel="before"
      value={pixels.size}
      min={pixels.min}
      max={pixels.max}
      // A double-click shares the space evenly between the two sides.
      defaultValue={pixels.even}
      snap={snap}
      grip={grip}
      style={style}
      data-preview={moved === null ? undefined : ""}
      onDraggingChange={(dragging) => {
        if (!dragging) setMoved(null);
        onDraggingChange(dragging);
      }}
      onValueChange={(size) => {
        if (preview) setMoved(share(size));
        onShareChange(share(size));
      }}
      onValueCommit={(size) => {
        setMoved(null);
        onShareCommit(share(size));
      }}
    />
  );
}

export type TilesProps = TilesProviderProps &
  Omit<TilesBoardProps, keyof ComponentPropsWithRef<"div">> &
  Omit<ComponentPropsWithRef<"div">, "defaultValue" | "onChange" | "children"> & {
    /**
     * Parts that work with the tiles, such as a `TilesDock` and a `TilesTidy`, set above the board.
     * For parts elsewhere, use a `TilesProvider` and a `TilesBoard` of your own.
     */
    children?: ReactNode;
  };

/**
 * A tiling window manager, on react-mosaic, with tiles that share a space. Users resize them from
 * the dividers between them, and drag them by their bars to another tile's edge or the space's own
 * edge. They can split, maximise and close them. The arrangement is react-mosaic's tree of splits,
 * controlled or uncontrolled, and can be kept in the browser. Each tile's menu does from the
 * keyboard everything a drag does, and a divider is a window splitter moved by the arrow keys. It
 * is a `TilesProvider` with a `TilesBoard`, under any parts given to it.
 */
export function Tiles({
  value,
  defaultValue,
  onValueChange,
  storageKey,
  tiles,
  createTile,
  maximised,
  onMaximisedChange,
  onActiveChange,
  mobileBreakpoint,
  renderTile,
  dropBehaviour,
  minSize,
  snap,
  grip,
  previewResize,
  empty,
  className = "",
  children,
  ...props
}: TilesProps) {
  return (
    <TilesProvider
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      storageKey={storageKey}
      tiles={tiles}
      createTile={createTile}
      maximised={maximised}
      onMaximisedChange={onMaximisedChange}
      onActiveChange={onActiveChange}
      mobileBreakpoint={mobileBreakpoint}
    >
      <div {...props} className={`x-govuk-ui-tiles ${className}`.trim()}>
        {children}
        <TilesBoard
          renderTile={renderTile}
          dropBehaviour={dropBehaviour}
          minSize={minSize}
          snap={snap}
          grip={grip}
          previewResize={previewResize}
          empty={empty}
        />
      </div>
    </TilesProvider>
  );
}

export type TileProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  /**
   * Names the tile in words, for its heading, unless `bar` gives another, its menu, its drag's
   * picture and the dividers beside it. By default, its entry's title in the provider's `tiles`, or
   * its id.
   */
  title?: string;
  /** The level of the tile's heading. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * The buttons at the end of the tile's bar. By default, its menu, Maximise and Close. Compose
   * your own from `TileSplit`, `TileMenu`, `TileMaximise`, `TileClose` and any of your own.
   */
  controls?: ReactNode;
  /**
   * The tile's whole bar, instead of its default one, such as for a heading with a count. Compose
   * it from `TileBar`, `TileGrip`, `TileTitle` and `TileControls`.
   */
  bar?: ReactNode;
  /** Lets users drag the tile by its grip, to another tile's edge or an edge of the board. */
  draggable?: boolean;
};

/**
 * One tile, as a board's `renderTile` returns it. It has a bar with its heading and controls, which
 * users drag to move it, above its content. Put the content in a `TileContent`.
 */
export function Tile({
  title: ownTitle,
  headingLevel = 2,
  controls,
  bar,
  draggable = true,
  id: domIdGiven,
  className = "",
  children,
  onFocus,
  onPointerDown,
  ...props
}: TileProps) {
  const tiles = useContext(TilesContext);
  const slot = useContext(SlotContext);
  if (!tiles || !slot) throw new Error("Tile must be returned by a TilesBoard's renderTile.");
  const { id, path } = slot;
  const title = ownTitle ?? tiles.titleOf(id);
  const headingId = useId();
  const { register } = tiles;
  useLayoutEffect(() => register(id, title, domIdGiven), [register, id, title, domIdGiven]);
  const maximised = tiles.shown === id;
  // A tile alone, or one filling the board, has nowhere to go.
  const movable = draggable && path.length > 0 && tiles.shown === null;
  const tile = useMemo(
    () => ({ id, title, headingId, headingLevel, draggable: movable }),
    [id, title, headingId, headingLevel, movable],
  );
  return (
    <MosaicWindow<string>
      path={path}
      title={title}
      // The bar is the Tile's own, inside the window, as are its drag and its picture, so the
      // window's own bar is left empty and hidden.
      draggable={false}
      renderToolbar={() => <span />}
      renderPreview={() => <div className="mosaic-preview" hidden />}
      disableAdditionalControlsOverlay
    >
      <TileContext value={tile}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: The handlers only mark the tile in use, as focus or the pointer goes into it, and the tile is not a control. */}
        <div
          {...props}
          id={domIdGiven ?? tiles.domId(id)}
          className={`x-govuk-ui-tile ${className}`.trim()}
          data-tile-id={id}
          data-maximised={maximised || undefined}
          data-active={tiles.active === id || undefined}
          inert={tiles.shown !== null && !maximised}
          // The tile that focus or the pointer enters is the one in use.
          onFocus={(event) => {
            onFocus?.(event);
            tiles.use(id);
          }}
          onPointerDown={(event) => {
            onPointerDown?.(event);
            tiles.use(id);
          }}
        >
          {bar ?? (
            <TileBar>
              <TileGrip>
                <TileTitle />
              </TileGrip>
              <TileControls>
                <TilePager />
                {controls ?? (
                  <>
                    <TileMenu />
                    <TileMaximise />
                    <TileClose />
                  </>
                )}
              </TileControls>
            </TileBar>
          )}
          {children}
        </div>
      </TileContext>
    </MosaicWindow>
  );
}

/** The tile's bar, with its grip, which contains its title, and its controls. */
export function TileBar({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  useTilePart("TileBar");
  return <div {...props} className={`x-govuk-ui-tile-bar ${className}`.trim()} />;
}

/**
 * What users drag the tile by, with a grip of dots that shows it can be dragged. It contains the
 * tile's title. Put links and buttons beside it in the bar, not in it.
 */
export function TileGrip({
  className = "",
  children,
  ref,
  ...props
}: ComponentPropsWithRef<"div">) {
  const { tiles, tile } = useTilePart("TileGrip");
  const { boardId, beginDrag, endDrag } = tiles;
  const [, drag, preview] = useDrag<DragItem, DropResult, unknown>(
    {
      type: MosaicDragType.WINDOW,
      canDrag: () => tile.draggable,
      item: () => {
        beginDrag(tile.id);
        return { mosaicId: boardId, tile: tile.id };
      },
      end: (item, monitor) => endDrag(item, monitor.getDropResult()),
    },
    [boardId, tile.id, tile.draggable, beginDrag, endDrag],
  );
  useBlankPreview(preview);
  const connect = useCallback(
    (element: HTMLDivElement | null) => {
      drag(element);
    },
    [drag],
  );
  const merged = useMergedRef(connect, ref);
  return (
    <div
      {...props}
      ref={merged}
      className={`x-govuk-ui-tile-grip ${className}`.trim()}
      data-draggable={tile.draggable || undefined}
    >
      {tile.draggable && gripDots}
      {children}
    </div>
  );
}

/**
 * The tile's heading, which names its content's Scroll area. It shows the tile's title, or what
 * you give it, such as the title with a count.
 */
export function TileTitle({ className = "", children, ...props }: ComponentPropsWithRef<"h2">) {
  const { tile } = useTilePart("TileTitle");
  const Heading = `h${tile.headingLevel}` as const;
  return (
    <Heading
      {...props}
      id={tile.headingId}
      className={`x-govuk-ui-tile-heading ${className}`.trim()}
    >
      {children ?? tile.title}
    </Heading>
  );
}

/** The buttons at the end of the tile's bar. */
export function TileControls({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  useTilePart("TileControls");
  return <div {...props} className={`x-govuk-ui-tile-controls ${className}`.trim()} />;
}

export type TileContentProps = ComponentPropsWithRef<"div"> & {
  /** Scrolls the content in a Scroll area named by the tile's heading, so Tab reaches it. */
  scroll?: boolean;
};

/** The tile's content beneath its bar, filling the rest of it. */
export function TileContent({
  scroll = false,
  className = "",
  children,
  ...props
}: TileContentProps) {
  const { tile } = useTilePart("TileContent");
  const classes = `x-govuk-ui-tile-content ${className}`.trim();
  return scroll ? (
    <ScrollArea {...props} className={classes} labelledBy={tile.headingId} fade>
      {children}
    </ScrollArea>
  ) : (
    <div {...props} className={classes}>
      {children}
    </div>
  );
}

type ControlProps = Omit<ButtonProps, "children" | "variant" | "size">;

/**
 * @internal An icon button in a tile's bar, named by its tooltip's words and the tile's title. A
 * service's own `onClick` runs first. Calling `preventDefault` on its event stops the action.
 */
function Control({
  label,
  icon,
  action,
  onClick,
  className,
  ...props
}: ControlProps & { label: string; icon: ReactNode; action: () => void }) {
  return (
    <Tooltip content={label} side="bottom">
      <Button
        {...props}
        variant="quiet"
        size="small-icon"
        className={`x-govuk-ui-tile-control ${className}`.trim()}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) action();
        }}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

const icon = (path: string) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const icons = {
  close: icon("M4 4l8 8M12 4l-8 8"),
  maximise: icon("M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"),
  restore: icon("M6 2.5V6H2.5M13.5 6H10V2.5M10 13.5V10h3.5M2.5 10H6v3.5"),
  previous: icon("m10 3.5-4.5 4.5 4.5 4.5"),
  next: icon("m6 3.5 4.5 4.5-4.5 4.5"),
  across: icon("M2.5 3.5h11v9h-11zM8 3.5v9"),
  down: icon("M2.5 3.5h11v9h-11zM2.5 8h11"),
  larger: icon("M2.5 3.5h11v9h-11zM10.5 3.5v9M2.5 9.5h8"),
  tidy: icon("M2.5 2.5h4.5v4.5h-4.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5h-4.5zM9 9h4.5v4.5H9z"),
  more: (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <circle cx="3.5" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="12.5" cy="8" r="1.5" />
    </svg>
  ),
};

/**
 * On a small screen, where the board shows one tile at a time, this shows where the tile is among
 * them, such as 2 of 3. It sits between buttons to the tile before and the one after. Elsewhere it
 * shows nothing. A Tile's own bar has it, and a service's own bar can have it.
 */
export function TilePager({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  const { tiles, tile } = useTilePart("TilePager");
  const layout = useContext(LayoutContext);
  const order = tileIds(layout);
  if (!tiles.small || order.length < 2) return null;
  const at = order.indexOf(tile.id);
  const before = order[at - 1];
  const after = order[at + 1];
  const go = (id: string) => {
    tiles.use(id);
    tiles.announce(`${tiles.titleOf(id)}, ${order.indexOf(id) + 1} of ${order.length}`);
    tiles.focus(id);
  };
  return (
    <div {...props} className={`x-govuk-ui-tile-pager ${className}`.trim()}>
      {before !== undefined && (
        <Control
          label="Previous tile"
          icon={icons.previous}
          aria-label={`Previous tile: ${tiles.titleOf(before)}`}
          action={() => go(before)}
        />
      )}
      <span className="x-govuk-ui-tile-pager-place">
        {at + 1} of {order.length}
      </span>
      {after !== undefined && (
        <Control
          label="Next tile"
          icon={icons.next}
          aria-label={`Next tile: ${tiles.titleOf(after)}`}
          action={() => go(after)}
        />
      )}
    </div>
  );
}

/** Closes the tile, with its neighbours taking its space. Focus goes to the tile beside it. */
export function TileClose({ className = "", ...props }: ControlProps) {
  const { tiles, tile } = useTilePart("TileClose");
  return (
    <Control
      {...props}
      label="Close"
      icon={icons.close}
      aria-label={`Close ${tile.title}`}
      className={`x-govuk-ui-tile-close ${className}`.trim()}
      action={() => tiles.close(tile.id)}
    />
  );
}

/** Fills the board with the tile, over the rest. Pressing it again restores the tile. */
export function TileMaximise({ className = "", ...props }: ControlProps) {
  const { tiles, tile } = useTilePart("TileMaximise");
  const on = tiles.maximised === tile.id;
  // On a small screen, every tile fills the board, so there is nothing to maximise.
  if (tiles.small) return null;
  return (
    <Control
      {...props}
      label={on ? "Restore" : "Maximise"}
      icon={on ? icons.restore : icons.maximise}
      aria-label={`Maximise ${tile.title}`}
      aria-pressed={on}
      className={`x-govuk-ui-tile-maximise ${className}`.trim()}
      action={() => (on ? tiles.restore() : tiles.maximise(tile.id))}
    />
  );
}

/** `across` puts the new tile to the right of the split tile, and `down` puts it below. */
export type TileSplitDirection = "across" | "down";

export type TileSplitProps = ControlProps & {
  /** Which way the tile splits, `across` with the new tile on its right, or `down` below it. */
  direction?: TileSplitDirection;
};

/**
 * Splits the tile, across or down, with the provider's `createTile` making the tile beside it.
 * Without `createTile`, it renders nothing.
 */
export function TileSplit({ direction = "across", className = "", ...props }: TileSplitProps) {
  const { tiles, tile } = useTilePart("TileSplit");
  if (!tiles.canSplit) return null;
  return (
    <Control
      {...props}
      label={`Split ${direction}`}
      icon={icons[direction]}
      aria-label={`Split ${tile.title} ${direction}`}
      className={`x-govuk-ui-tile-split ${className}`.trim()}
      data-direction={direction}
      action={() => tiles.split(tile.id, direction)}
    />
  );
}

export type TileMenuProps = ControlProps & {
  /** Items of your own, before the tile's own, such as `MenuItem`s that use `useTile`. */
  children?: ReactNode;
};

/**
 * The tile's menu, which does from the keyboard what a drag does. It splits the tile, moves it
 * beside another tile or to an edge, swaps it with another, shows another in its place, makes it
 * larger, maximises it and closes it. It contains every control a narrow tile's bar has no space
 * for.
 */
export function TileMenu({ className = "", children, ...props }: TileMenuProps) {
  const { tile } = useTilePart("TileMenu");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        {...props}
        variant="quiet"
        size="small-icon"
        chevron={false}
        aria-label={`Options for ${tile.title}`}
        className={`x-govuk-ui-tile-control x-govuk-ui-tile-menu-trigger ${className}`.trim()}
      >
        {icons.more}
      </DropdownMenuTrigger>
      <MenuContent align="end" className="x-govuk-ui-tile-menu">
        <TileMenuItems>{children}</TileMenuItems>
      </MenuContent>
    </DropdownMenu>
  );
}

/**
 * @internal The menu's items, which list the other tiles. They render only while the menu is open,
 * so the arrangement they read does not render every tile's menu again at each step of a drag.
 */
function TileMenuItems({ children }: { children: ReactNode }) {
  const { tiles, tile } = useTilePart("TileMenu");
  const layout = useContext(LayoutContext);
  const others = tileIds(layout).filter((other) => other !== tile.id);
  const name = tiles.titleOf;
  const on = tiles.maximised === tile.id;
  const moves = others.length > 0 && !on;
  const shows = tiles.closed.length > 0 && !on;
  return (
    <>
      {children}
      {tiles.canSplit && (
        <MenuGroup>
          <MenuItem icon={icons.across} onSelect={() => tiles.split(tile.id, "across")}>
            Split across
          </MenuItem>
          <MenuItem icon={icons.down} onSelect={() => tiles.split(tile.id, "down")}>
            Split down
          </MenuItem>
        </MenuGroup>
      )}
      {moves && (
        <MenuGroup>
          <MenuSubmenu label="Move">
            {others.map((other) => (
              <MenuSubmenu key={other} label={`Beside ${name(other)}`}>
                {sides.map((side) => (
                  <MenuItem
                    key={side}
                    onSelect={() => tiles.move(tile.id, { beside: other, side })}
                  >
                    {sideWords[side].beside}
                  </MenuItem>
                ))}
              </MenuSubmenu>
            ))}
            <MenuSeparator />
            {sides.map((side) => (
              <MenuItem key={side} onSelect={() => tiles.move(tile.id, { side })}>
                {sideWords[side].edge}
              </MenuItem>
            ))}
          </MenuSubmenu>
          <MenuSubmenu label="Swap with">
            {others.map((other) => (
              <MenuItem key={other} onSelect={() => tiles.swap(tile.id, other)}>
                {name(other)}
              </MenuItem>
            ))}
          </MenuSubmenu>
        </MenuGroup>
      )}
      {shows && (
        <MenuSubmenu label="Show here">
          {tiles.closed.map((entry) => (
            <MenuItem key={entry.id} onSelect={() => tiles.replace(tile.id, entry.id)}>
              {name(entry.id)}
            </MenuItem>
          ))}
        </MenuSubmenu>
      )}
      {(children || tiles.canSplit || moves || shows) && <MenuSeparator />}
      {moves && (
        <MenuItem icon={icons.larger} onSelect={() => tiles.expand(tile.id)}>
          Make larger
        </MenuItem>
      )}
      <MenuItem
        icon={on ? icons.restore : icons.maximise}
        onSelect={() => (on ? tiles.restore() : tiles.maximise(tile.id))}
      >
        {on ? "Restore" : "Maximise"}
      </MenuItem>
      <MenuItem icon={icons.close} onSelect={() => tiles.close(tile.id)}>
        Close
      </MenuItem>
    </>
  );
}

export type TilesDockProps = ComponentPropsWithRef<"div"> & {
  /** Names the dock, for its tiles and for screen readers. */
  label?: string;
  /** Says what to do while the dock is empty, and while a tile is dragged to it. */
  hint?: string;
  /** Where a tile pressed in the dock opens. By default, at the right-hand edge. */
  place?: TilePlace;
  /** The dock's own items, instead of a `TilesDockItem` for each closed tile. */
  children?: ReactNode;
};

/**
 * A place for the closed tiles, from the provider's `tiles`, as chips. Drag a chip onto the edge of
 * a tile or of the board to open its tile there. Press it to open the tile at `place`. A tile
 * dragged onto the dock closes. Put it anywhere inside the provider, such as in a sidebar.
 */
export function TilesDock({
  label = "Closed tiles",
  hint = "Drag a tile here to close it",
  place,
  className = "",
  children,
  ref,
  ...props
}: TilesDockProps) {
  const tiles = useTiles("TilesDock");
  const { boardId } = tiles;
  const labelId = useId();
  // A tile from this provider's board dropped here closes, which react-mosaic takes `remove` to
  // mean.
  const [{ ready, over }, drop] = useDrop<DragItem, DropResult, { ready: boolean; over: boolean }>(
    {
      accept: MosaicDragType.WINDOW,
      canDrop: (item) => item.mosaicId === boardId && item.tile !== undefined,
      drop: () => ({ remove: true }),
      collect: (monitor) => ({
        ready: monitor.canDrop(),
        over: monitor.isOver() && monitor.canDrop(),
      }),
    },
    [boardId],
  );
  const target = useCallback(
    (element: HTMLDivElement | null) => {
      drop(element);
    },
    [drop],
  );
  const merged = useMergedRef(target, ref);
  return (
    // biome-ignore lint/a11y/useSemanticElements: The dock contains buttons, not form fields, and a fieldset's legend will not sit in a row of chips in every engine.
    <div
      {...props}
      ref={merged}
      role="group"
      aria-labelledby={labelId}
      className={`x-govuk-ui-tiles-dock ${className}`.trim()}
      data-ready={ready || undefined}
      data-over={over || undefined}
    >
      <span id={labelId} className="x-govuk-ui-tiles-dock-label">
        {label}
      </span>
      {children ??
        tiles.closed.map((entry) => <TilesDockItem key={entry.id} tile={entry.id} place={place} />)}
      {(tiles.closed.length === 0 || ready) && (
        <span className="x-govuk-ui-tiles-dock-hint">{hint}</span>
      )}
    </div>
  );
}

export type TilesDockItemProps = ComponentPropsWithRef<"button"> & {
  /** The id of the tile it opens. */
  tile: string;
  /** Where the tile opens when it is pressed. By default, at the right-hand edge. */
  place?: TilePlace;
};

/**
 * A closed tile, as a chip. Dragged onto an edge of a tile or of the board, it opens there.
 * Pressed, it opens at `place`, and focus goes to it. It shows the tile's title, or what you give
 * it.
 */
export function TilesDockItem({
  tile,
  place = { side: "right" },
  className = "",
  children,
  onClick,
  ref,
  ...props
}: TilesDockItemProps) {
  const tiles = useTiles("TilesDockItem");
  const { boardId, endDrag, open, titleOf } = tiles;
  const [{ dragging }, drag, preview] = useDrag<DragItem, DropResult, { dragging: boolean }>(
    {
      type: MosaicDragType.WINDOW,
      item: { mosaicId: boardId, dock: tile },
      end: (item, monitor) => endDrag(item, monitor.getDropResult()),
      collect: (monitor) => ({ dragging: monitor.isDragging() }),
    },
    [boardId, tile, endDrag],
  );
  useBlankPreview(preview);
  const connect = useCallback(
    (element: HTMLButtonElement | null) => {
      drag(element);
    },
    [drag],
  );
  const merged = useMergedRef(connect, ref);
  return (
    <button
      type="button"
      aria-label={`Open ${titleOf(tile)}`}
      {...props}
      ref={merged}
      className={`x-govuk-ui-tiles-dock-tile ${className}`.trim()}
      data-dragging={dragging || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) open(tile, place);
      }}
    >
      {gripDots}
      {children ?? titleOf(tile)}
    </button>
  );
}

export type TilesTidyProps = ButtonProps;

/**
 * Lays every tile out evenly, in reading order, in rows as near square as the board's proportions
 * allow. It is a small secondary Button, unless you choose otherwise. Put it inside the provider.
 */
export function TilesTidy({
  variant = "secondary",
  size = "small",
  className = "",
  children = "Tidy the tiles",
  disabled,
  onClick,
  ...props
}: TilesTidyProps) {
  const tiles = useTiles("TilesTidy");
  const layout = useContext(LayoutContext);
  return (
    <Button
      {...props}
      variant={variant}
      size={size}
      className={`x-govuk-ui-tiles-tidy ${className}`.trim()}
      disabled={disabled || tileIds(layout).length < 2}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) tiles.tidy();
      }}
    >
      {icons.tidy}
      {children}
    </Button>
  );
}
