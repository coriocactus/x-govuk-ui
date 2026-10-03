"use client";

import { useRender } from "@base-ui/react/use-render";
import {
  type ClipboardEvent,
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactNode,
  useLayoutEffect,
  useState,
} from "react";
import { CrossIcon, FileIcon } from "./icons";

// File chips. A long name is cut short in its middle, so its end and extension show, as
// "Catch return…2025.xlsx". The ellipsis is written into the start's own text, so the font sets it
// against the last letter shown, and the browser sizes each part from the letters it draws. No
// width is ever set from a measure, so no rounding leaves a gap or hides part of a letter. CSS's
// own ellipsis cuts at whole letters and leaves the rest of its box empty, which shows as a gap
// before the end.
//
// The cut is found by trying texts in the page. Every name is first shown in full. Those that do
// not fit then try the cut a measure suggests, and the next cuts either side, until each shows the
// most letters that fit. A name fits while its end stays inside its box. That compares two boxes
// in the same coordinates, so a transform, such as a chip popping in, cannot skew it. All waiting
// chips are tried together, so the page lays out once for each try. Until script cuts a name, and
// without script, its start gives way with CSS's ellipsis.
//
// Once cut, the parts are inline text on one line, so a selection runs across them. A double or
// triple click selects the whole name as shown, and copying all of it copies the full name.

export type FileChipsProps = ComponentPropsWithRef<"ul"> & {
  /** Names the list for screen readers, such as "Documents with this question". */
  label?: string;
};

/**
 * Files or documents as a row of chips that wraps, named for screen readers. It can sit anywhere,
 * such as under a sent message, to list what went with it. Chat input lists what goes with the next
 * message with the same chips, as ChatInputAttachments.
 */
export function FileChips({ label = "Files", className = "", ...props }: FileChipsProps) {
  return (
    <ul aria-label={label} {...props} className={`x-govuk-ui-file-chips ${className}`.trim()} />
  );
}

/**
 * A name in two parts, so a long one is cut short in its middle. The end keeps the extension and
 * the last word before it, because names that differ often differ there, such as by a date or a
 * version. A name with no word break near its end keeps its last 8 characters. The break itself,
 * such as a space, ends the start, so it is the first thing cut.
 */
function nameParts(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : "";
  const stem = name.slice(0, name.length - extension.length);
  const word = /[\s_-]([^\s_-]{1,10})$/.exec(stem)?.[1] ?? stem.slice(-8);
  return [stem.slice(0, stem.length - word.length), word + extension];
}

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter() : undefined;

/**
 * Where each letter of a text ends, as a reader sees letters, so no cut splits an accent or emoji.
 */
function letterEnds(text: string) {
  const ends = [0];
  if (segmenter) {
    for (const { index, segment } of segmenter.segment(text)) ends.push(index + segment.length);
  } else {
    let at = 0;
    for (const letter of text) {
      at += letter.length;
      ends.push(at);
    }
  }
  return ends;
}

/**
 * One way to show a name. It has the start's text, the end's text, how many characters of the
 * start it keeps and how many of the end it drops. A measure estimates its width from those counts.
 */
type Showing = { start: string; end: string; kept: number; dropped: number };

/**
 * Every way to show a name, from the whole name to the most cut. The start loses letters from its
 * end first, never ending in a space before the ellipsis. In a list too narrow even for the end,
 * the end then loses letters from its start, so its extension shows longest. Each way is narrower
 * than the one before, once the whole name does not fit, so the first that fits is the best.
 */
function showings(start: string, end: string): Showing[] {
  const ways: Showing[] = [{ start, end, kept: start.length, dropped: 0 }];
  const starts = letterEnds(start);
  for (let index = starts.length - 2; index >= 0; index--) {
    const kept = starts[index]!;
    if (index > 0 && /\s/.test(start.slice(starts[index - 1], kept))) continue;
    // With no start, "…" and the end would be wider than the end alone.
    if (kept === 0 && start === "") continue;
    ways.push({ start: `${start.slice(0, kept)}…`, end, kept, dropped: 0 });
  }
  const ends = letterEnds(end);
  for (let index = 1; index < ends.length - 1; index++)
    ways.push({ start: "…", end: end.slice(ends[index]), kept: 0, dropped: ends[index]! });
  return ways;
}

type Parts = { start: HTMLElement; end: HTMLElement; whole: HTMLElement };

function partsOf(name: HTMLElement): Parts | undefined {
  const find = (part: string) =>
    name.querySelector<HTMLElement>(`:scope > .x-govuk-ui-file-chip-${part}`);
  const [start, end, whole] = ["start", "end", "whole"].map(find);
  return start && end && whole ? { start, end, whole } : undefined;
}

/**
 * Writes a part's text. React's text node is kept and changed, so React rewrites it only for a new
 * name, because it compares a new name with the one it last rendered, not with the page. The node
 * is read again each time, because React may replace it.
 */
function write(part: HTMLElement, text: string) {
  const node = part.firstChild;
  if (node instanceof Text && !node.nextSibling) {
    if (node.data !== text) node.data = text;
  } else part.textContent = text;
}

/** Whether a name's end stays inside its box, as the browser lays them out. */
function fits(name: HTMLElement, parts: Parts) {
  return parts.end.getBoundingClientRect().right <= name.getBoundingClientRect().right + 1 / 64;
}

/**
 * The search for one name's cut. It has the way shown now, the last way known not to fit, and the
 * first way known to fit.
 */
type Search = {
  name: HTMLElement;
  parts: Parts;
  ways: Showing[];
  trying: number;
  tries: number;
  /** The last way known not to fit, and the first known to fit, or ways.length if none is yet. */
  tooWide: number;
  fitting: number;
};

/**
 * The index of the way a measure says fits. Widths are measured on the whole name, set on one line
 * for screen readers, with the ellipsis taken as 1em. The measure is only where the search starts,
 * so its rounding, which in WebKit is to whole pixels, costs at most one try.
 */
function estimate(search: Search) {
  const text = search.parts.whole.firstChild;
  if (!(text instanceof Text)) return 1;
  const range = document.createRange();
  const width = (from: number, to: number) => {
    if (to <= from) return 0;
    range.setStart(text, from);
    range.setEnd(text, to);
    return range.getBoundingClientRect().width;
  };
  const room = search.name.getBoundingClientRect().width;
  const ellipsis = Number.parseFloat(getComputedStyle(search.name).fontSize);
  const split = text.length - search.ways[0]!.end.length;
  const widthOf = ({ kept, dropped }: Showing) =>
    width(0, kept) + ellipsis + width(split + dropped, text.length);
  // The ways narrow from the second on, so the first estimated to fit is found by halving.
  let low = 1;
  let high = search.ways.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (widthOf(search.ways[middle]!) <= room) high = middle;
    else low = middle + 1;
  }
  return low;
}

/**
 * The next way to try. That is the estimate first, then its neighbour, then the way halfway
 * between the last known not to fit and the first known to fit.
 */
function nextTry(search: Search): number | undefined {
  if (search.fitting - search.tooWide <= 1) return undefined;
  const between = (index: number) =>
    Math.min(Math.max(index, search.tooWide + 1), search.fitting - 1);
  if (search.tries === 1) return between(estimate(search));
  if (search.tries === 2)
    return between(search.trying === search.fitting ? search.trying - 1 : search.trying + 1);
  return (search.tooWide + search.fitting) >> 1;
}

function show(search: Search, index: number) {
  const way = search.ways[index]!;
  write(search.parts.start, way.start);
  write(search.parts.end, way.end);
  search.trying = index;
  search.tries++;
}

const waiting = new Set<HTMLElement>();
let frame = 0;
let queued = false;

/** Cuts every waiting name, trying them all together, so the page lays out once for each try. */
function fitWaiting() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  queued = false;
  const searches: Search[] = [];
  for (const name of waiting) {
    const parts = partsOf(name);
    // A name not shown, such as in a closed panel, has no space. It is cut once it is shown.
    if (!name.isConnected || !parts || name.getClientRects().length === 0) continue;
    const [start, end] = nameParts(parts.whole.textContent ?? "");
    const ways = showings(start, end);
    // Measured, the start no longer gives way to CSS's ellipsis.
    name.setAttribute("data-measured", "");
    searches.push({ name, parts, ways, trying: 0, tries: 0, tooWide: 0, fitting: ways.length });
  }
  waiting.clear();
  for (const search of searches) show(search, 0);
  // Each round reads every name's fit, then writes every name's next try.
  let open = searches;
  while (open.length > 0) {
    for (const search of open) {
      if (fits(search.name, search.parts)) search.fitting = search.trying;
      else search.tooWide = search.trying;
    }
    const tries = open.map(nextTry);
    open = open.filter((search, index) => {
      const way = tries[index];
      if (way !== undefined) show(search, way);
      return way !== undefined;
    });
  }
  for (const search of searches) {
    // The most cut way is shown if none fits, in a list too narrow for any.
    const best = Math.min(search.fitting, search.ways.length - 1);
    if (search.trying !== best) show(search, best);
    search.name.toggleAttribute("data-cut", best > 0);
  }
  for (const search of searches) {
    const scale = scaleOf(search.name);
    if (Math.abs(scale - 1) > 0.001) watchScale(search.name, scale);
  }
}

/** How much larger or smaller a name is drawn than laid out, by a transform on it or around it. */
function scaleOf(name: HTMLElement) {
  const laid = Number.parseFloat(getComputedStyle(name).width);
  return laid > 0 ? name.getBoundingClientRect().width / laid : 1;
}

/**
 * Names cut while drawn larger or smaller. Each has the scale it was cut at, the scale last read,
 * and the frames it has been watched.
 */
const scaling = new Map<HTMLElement, { cut: number; last: number; frames: number }>();
let readingScales = false;

/**
 * Watches a name cut while drawn larger or smaller, as when a chip pops in, and cuts it again once
 * its scale stops changing. Firefox places an element under a changing transform a hundredth of a
 * pixel or so out, so a cut found then can show a letter fewer than fits. No observer reports a
 * transform, and an animation run by script fires no event, so the scale is read once each frame
 * while it changes, for 10 seconds at most. A name drawn at a scale that does not change, such as
 * in a zoomed preview, is not cut again.
 */
function watchScale(name: HTMLElement, scale: number) {
  scaling.set(name, { cut: scale, last: scale, frames: 0 });
  if (readingScales) return;
  readingScales = true;
  requestAnimationFrame(readScales);
}

function readScales() {
  readingScales = false;
  for (const [name, watched] of scaling) {
    const scale = name.isConnected ? scaleOf(name) : watched.last;
    watched.frames++;
    if (Math.abs(scale - watched.last) > 0.0001 && watched.frames < 600) {
      watched.last = scale;
      continue;
    }
    scaling.delete(name);
    if (name.isConnected && Math.abs(scale - watched.cut) > 0.0001) fitAfterRender(name);
  }
  if (scaling.size === 0) return;
  readingScales = true;
  requestAnimationFrame(readScales);
}

/** Cuts a name before the page paints, once React has finished putting its chips in the page. */
function fitAfterRender(name: HTMLElement) {
  waiting.add(name);
  if (queued) return;
  queued = true;
  queueMicrotask(fitWaiting);
}

/**
 * Cuts a name in the next frame, after its space changes. Cutting inside a ResizeObserver's
 * callback would resize what it watches, such as a list as wide as its chips, while it reports.
 */
function fitNextFrame(name: HTMLElement) {
  waiting.add(name);
  frame ||= requestAnimationFrame(fitWaiting);
}

// One observer and one font listener serve every chip. Each watched element maps to the names
// whose space it changes.
const watchers = new Map<Element, Set<HTMLElement>>();
const shown = new Set<HTMLElement>();
let observer: ResizeObserver | undefined;
const refitAll = () => {
  for (const name of shown) fitAfterRender(name);
};

/**
 * Watches the elements whose size changes a name's space. These are its list and the list's
 * container, which may grow while a list as wide as its chips does not. They are also its end and
 * its kind, which take new widths when a font changes. When a font loads, names are cut for it
 * before the page paints with it.
 */
function watch(name: HTMLElement, targets: Element[]) {
  observer ??= new ResizeObserver((entries) => {
    for (const entry of entries)
      for (const watcher of watchers.get(entry.target) ?? []) fitNextFrame(watcher);
  });
  for (const target of targets) {
    let names = watchers.get(target);
    if (!names) {
      names = new Set();
      watchers.set(target, names);
      observer.observe(target);
    }
    names.add(name);
  }
  if (shown.size === 0) document.fonts?.addEventListener("loadingdone", refitAll);
  shown.add(name);
  return () => {
    for (const target of targets) {
      const names = watchers.get(target);
      names?.delete(name);
      if (names?.size === 0) {
        watchers.delete(target);
        observer?.unobserve(target);
      }
    }
    shown.delete(name);
    waiting.delete(name);
    scaling.delete(name);
    if (shown.size === 0) document.fonts?.removeEventListener("loadingdone", refitAll);
  };
}

export type FileChipProps = Omit<ComponentPropsWithRef<"li">, "children"> & {
  /**
   * What it is, such as a file's or a document's name. A long name is cut short in its middle, so
   * its end and extension show.
   */
  name: string;
  /** What kind of thing it is, such as PDF, after its name. */
  kind?: ReactNode;
  /** Its icon. By default, a page. */
  icon?: ReactNode;
  /**
   * Removes it, from a × button. Once it is removed, focus goes to the next chip's button, or the
   * one before, unless onRemove moves focus itself. Without onRemove, the chip has no button.
   */
  onRemove?: () => void;
  /** Names the × button. By default, Remove and the name. */
  removeLabel?: string;
  /** Another element for the name, such as a link to the document. */
  render?: useRender.RenderProp;
};

/**
 * Selects the whole name as shown on a double or triple click, where the browser would select a
 * word of it. A link's clicks are left to the link.
 */
function selectName(event: MouseEvent<HTMLElement>) {
  const name = event.currentTarget;
  const parts = partsOf(name);
  if (event.detail < 2 || !parts || name.closest("a")) return;
  event.preventDefault();
  const range = document.createRange();
  range.setStart(parts.start, 0);
  range.setEnd(parts.end, parts.end.childNodes.length);
  getSelection()?.removeAllRanges();
  getSelection()?.addRange(range);
}

/** Copies the name itself, not the cut, when all of it is selected as shown. */
function copyName(event: ClipboardEvent<HTMLElement>, whole: string) {
  const parts = partsOf(event.currentTarget);
  const selected = getSelection()?.toString();
  if (!parts || !event.clipboardData || !event.currentTarget.hasAttribute("data-cut")) return;
  if (selected !== `${parts.start.textContent}${parts.end.textContent}`) return;
  event.clipboardData.setData("text/plain", whole);
  event.preventDefault();
}

/**
 * One file or document, as a chip with its icon, its name and its kind. Given `onRemove`, it has a
 * button to remove it. Given `render`, its name can be a link to the document, beside the button.
 * A name cut short shows in full in its `title`, and screen readers hear it in full. Copying all of
 * it copies the full name.
 */
export function FileChip({
  name,
  kind,
  icon = <FileIcon />,
  onRemove,
  removeLabel,
  render,
  className = "",
  ...props
}: FileChipProps) {
  // The name's element is kept in state, so a new one, as when `render` makes the name a link, is
  // also cut and watched.
  const [element, setElement] = useState<Element | null>(null);
  const [start, end] = nameParts(name);
  const hasKind = kind !== undefined && kind !== null && kind !== false;
  const removable = Boolean(onRemove);
  // The name is cut again for a new element, name, kind or button, and whenever its space changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: A new name, kind or button changes what is cut and watched, though the effect reads them from the page.
  useLayoutEffect(() => {
    const chip = element?.closest("li");
    if (!(element instanceof HTMLElement) || !chip) return;
    fitAfterRender(element);
    const list = chip.parentElement;
    const targets = [
      list,
      list?.parentElement,
      element.querySelector(":scope > .x-govuk-ui-file-chip-end"),
      chip.querySelector(":scope > .x-govuk-ui-file-chip-kind"),
    ].filter((target): target is Element => Boolean(target));
    return watch(element, targets);
  }, [element, name, hasKind, removable]);
  const label = useRender({
    defaultTagName: "span",
    render,
    ref: setElement,
    props: {
      className: "x-govuk-ui-file-chip-name",
      title: name,
      onMouseDown: selectName,
      onCopy: (event: ClipboardEvent<HTMLElement>) => copyName(event, name),
      children: (
        <>
          {/* Screen readers hear the whole name once. Its shown parts are blocks, between which a
              browser may put a space in the name it gives them, and the start may be cut. */}
          <span className="x-govuk-ui-file-chip-start" aria-hidden="true">
            {start}
          </span>
          <span className="x-govuk-ui-file-chip-end" aria-hidden="true">
            {end}
          </span>
          <span className="x-govuk-ui-visually-hidden x-govuk-ui-file-chip-whole">{name}</span>
        </>
      ),
    },
  });
  return (
    <li {...props} className={`x-govuk-ui-file-chip ${className}`.trim()}>
      {icon}
      {label}
      {hasKind && <span className="x-govuk-ui-file-chip-kind">{kind}</span>}
      {onRemove && (
        <button
          type="button"
          className="x-govuk-ui-file-chip-remove"
          aria-label={removeLabel ?? `Remove ${name}`}
          onClick={(event) => {
            const button = event.currentTarget;
            const chip = button.closest("li");
            const neighbour = [chip?.nextElementSibling, chip?.previousElementSibling]
              .map((sibling) => sibling?.querySelector<HTMLElement>(".x-govuk-ui-file-chip-remove"))
              .find(Boolean);
            onRemove();
            // The chip and its button disappear, which would drop focus to the page.
            if (document.activeElement === button) neighbour?.focus();
          }}
        >
          <CrossIcon size={12} />
        </button>
      )}
    </li>
  );
}
