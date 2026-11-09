"use client";

import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import { both } from "./events";
import { useLabels } from "./labels";
import { CloseIconButton } from "./overlay";
import { useMergedRef } from "./refs";

export type SelectionBarProps = ComponentPropsWithRef<"section"> & {
  /** How many things are chosen, such as rows of a Data table. At none, the bar is gone. */
  count: number;
  /** Clears the selection, from the bar's ×. */
  onClear: () => void;
  /** What to do with the things chosen, as Buttons, such as Change owner, and a Dropdown menu. */
  children: ReactNode;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<SelectionBarLabels>;
};

/** The words Selection bar writes, which a LabelsProvider or its `labels` can change. */
export type SelectionBarLabels = {
  /** Names the bar, as a region of the page. */
  region: string;
  /** Says how many are chosen, which screen readers hear as it changes. */
  selected: (count: number) => string;
  /** Names the × that clears the selection. */
  clear: string;
};

export const defaultSelectionBarLabels: SelectionBarLabels = {
  region: "Selection",
  selected: (count) => `${count} selected`,
  clear: "Clear selection",
};

/**
 * Where a Selection bar in a Data table says how tall it is while it shows, and 0 once it goes, so
 * the table's rows make room for it.
 * @internal
 */
export const SelectionBarHost = createContext<((height: number) => void) | null>(null);

/** How far the bar sits above the foot of its scrolling area, in pixels, as its styles say. */
const EDGE = 16;
/** The space kept between the bar and a control that takes focus above it, in pixels. */
const CLEAR = 8;

/**
 * The box whose scrolling the bar sits at the foot of, as `position: sticky` finds it. A box that
 * clips, as a Data table does, does not scroll, so the search passes it.
 */
function scrollerOf(element: HTMLElement) {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (parent === document.body) break;
    const { overflowY } = getComputedStyle(parent);
    if (overflowY !== "visible" && overflowY !== "clip") return parent;
  }
  return document.documentElement;
}

/**
 * What to do with the things users have chosen, in a bar that rises while any are chosen. It says
 * how many, and screen readers hear the count as it changes. It never takes focus as it appears,
 * because users are still choosing. If it goes while it has focus, such as once an action clears
 * the selection, focus goes back to where it was before it came into the bar, such as the last
 * row's checkbox.
 *
 * Give it to a Data table as its `selectionBar`. It then floats over the rows, just above the foot,
 * and the rows make room for it beneath the last one, so nothing moves as it comes and goes.
 * Elsewhere, put it after the list it acts on, in the same scrolling area. It then takes its own
 * room after the list, and stays at the foot of the scrolling area as the list scrolls beneath it.
 * Either way, a control that takes focus from the keyboard scrolls clear of it, never under it.
 */
export function SelectionBar({
  count,
  onClear,
  children,
  className = "",
  ref,
  onFocus,
  onBlur,
  labels: ownLabels,
  ...props
}: SelectionBarProps) {
  const labels = useLabels("selectionBar", defaultSelectionBarLabels, ownLabels);
  const bar = useRef<HTMLElement | null>(null);
  const merged = useMergedRef(bar, ref);
  // Where focus was before it came into the bar, to go back to if the bar goes while it has focus.
  const before = useRef<HTMLElement | null>(null);
  // Whether focus is in the bar, or in a popup opened from it, such as a Dropdown menu's. A popup
  // is drawn at the end of the page, but React passes its focus events up through the bar, so
  // `onFocus` and `onBlur` hear focus move into it and back. Focus that moves from one to the other
  // leaves and arrives in the same task, so the bar decides it has gone only once the task is over.
  const within = useRef(false);
  const leaving = useRef(false);
  const shown = count > 0;
  const host = useContext(SelectionBarHost);
  // While it shows, the bar's scrolling area keeps focus out of the strip it covers, by scroll
  // padding, so a control that takes focus beneath it scrolls into view above it, as WCAG 2.2's
  // focus not obscured asks. The area's own padding comes back as the bar goes. A Data table hears
  // how tall the bar is too, and its rows do the same.
  useLayoutEffect(() => {
    const element = bar.current;
    if (!shown || !element) return;
    const scroller = scrollerOf(element);
    const own = scroller.style.scrollPaddingBottom;
    const fit = () => {
      scroller.style.scrollPaddingBottom = `${element.offsetHeight + EDGE + CLEAR}px`;
      host?.(element.offsetHeight);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => {
      observer.disconnect();
      scroller.style.scrollPaddingBottom = own;
      host?.(0);
    };
  }, [shown, host]);
  // An action that empties the selection, from the bar or its menu, takes the bar away with focus
  // in it. A popup that closes then gives focus back to its trigger, which has gone from view and
  // takes none. Focus goes back to where it came from instead, before the popup closes.
  useLayoutEffect(() => {
    if (shown || !within.current) return;
    if (before.current?.isConnected) before.current.focus({ preventScroll: true });
  }, [shown]);
  return (
    <>
      {/* The count is said from a region that is always in the page, so the first is heard too,
          as the bar appears. */}
      <p className="x-govuk-ui-visually-hidden" role="status">
        {shown ? labels.selected(count) : ""}
      </p>
      <section
        aria-label={labels.region}
        {...props}
        ref={merged}
        className={`x-govuk-ui-selection-bar ${className}`.trim()}
        hidden={!shown}
        onFocus={both(onFocus, (event) => {
          const from = event.relatedTarget;
          if (!within.current && from instanceof HTMLElement) before.current = from;
          within.current = true;
          leaving.current = false;
        })}
        onBlur={both(onBlur, () => {
          leaving.current = true;
          queueMicrotask(() => {
            if (!leaving.current) return;
            within.current = false;
            leaving.current = false;
          });
        })}
      >
        <p className="x-govuk-ui-selection-bar-count">{shown ? labels.selected(count) : ""}</p>
        <div className="x-govuk-ui-selection-bar-actions">{children}</div>
        <CloseIconButton
          label={labels.clear}
          className="x-govuk-ui-selection-bar-clear"
          onClick={onClear}
        />
      </section>
    </>
  );
}
