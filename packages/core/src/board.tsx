"use client";

import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { chain } from "./events";
import { MoreIcon } from "./icons";
import { useLabels } from "./labels";
import { DropdownMenu, DropdownMenuTrigger, MenuContent, MenuItem, MenuSeparator } from "./menu";
import { duration, useMotionTiming } from "./motion";
import { useLatest, useMergedRef } from "./refs";
import { type Registry, useRegister, useRegistry } from "./registry";
import { ScrollArea } from "./scroll-area";
import { useScopeSound } from "./sound-scope";

/*
 * A board of things in stages, such as companies being onboarded, as columns of cards. Its parts:
 *
 * - Board names the board and hears where users move each card.
 * - BoardColumn is one stage, with its heading, its count and its cards, in order.
 * - BoardCard is one thing, with a menu that moves it up or down its stage, or to another stage.
 *
 * A card moves from its menu, by keyboard, pointer or touch alike, so moving needs no drag, as
 * WCAG 2.2's dragging movements asks. A mouse or pen can also drag a card to another place, in
 * its stage or another, and a finger can once it has held the card for a moment, so a swipe still
 * scrolls the board. As it is dragged, the cards make way for it where it would drop. Once the
 * card is in its new place, screen readers hear where it went, and a card moved from its menu
 * takes focus there. Until then, they hear nothing, so a move that fails says nothing untrue.
 */

/** The words Board writes, which a LabelsProvider or its `labels` can change. */
export type BoardLabels = {
  /** Names a card's menu, given the card's name. */
  move: (card: string) => string;
  /** Names the item that moves a card one place up its stage. */
  moveUp: string;
  /** Names the item that moves a card one place down its stage. */
  moveDown: string;
  /** Names the item that moves a card to the foot of another stage. */
  moveTo: (stage: string) => string;
  /** Says where a card went, for screen readers, as its place among the stage's cards. */
  moved: (card: string, stage: string, place: number, count: number) => string;
  /** Says how many cards a stage has, for screen readers, after its name. */
  count: (count: number) => string;
  /** Stands in a stage without cards. */
  empty: string;
};

export const defaultBoardLabels: BoardLabels = {
  move: (card) => `Move ${card}`,
  moveUp: "Move up",
  moveDown: "Move down",
  moveTo: (stage) => `Move to ${stage}`,
  moved: (card, stage, place, count) => `${card} moved to ${stage}, ${place} of ${count}`,
  count: (count) => `${count} ${count === 1 ? "card" : "cards"}`,
  empty: "None",
};

type Stage = { value: string; label: string };

/**
 * A card users asked to move, the stage it left, the card that came after it there, and whether it
 * takes focus when it arrives. A card that moves within its stage has arrived once another card
 * comes after it.
 */
type Moving = { card: string; from: string; next: string | null; focus: boolean };

/** The card a press began on. */
type Pressed = { value: string; stage: string };

/**
 * A stage's cards as they lie when a drag begins, each by its top in the stage's list and its
 * height, with the area its cards scroll in.
 */
type Laid = {
  stage: string;
  list: HTMLElement;
  scroll: HTMLElement | null;
  cards: { element: HTMLElement; top: number; height: number }[];
};

type BoardContextValue = {
  /** The stages, in the page's order. */
  stages: readonly Stage[];
  /** Where each stage registers, so a stage in a wrapper of a service's own is found too. */
  registry: Registry<Stage>;
  /** Asks the service to move a card before another, or to the foot of a stage with null. */
  move: (move: Moving & { to: string; before: string | null }) => void;
  /** The card users asked to move, until it is in its new place. */
  moving: Moving | null;
  /** Runs as the moving card appears in its new place, with that place among its stage's cards. */
  arrive: (card: string, label: string, stage: string, place: number, count: number) => void;
  /** The card that moved last, which rises into its new place. */
  moved: string | null;
  /** Each stage's column, by its value, to find the stage under a dragged card. */
  columns: RefObject<Map<string, HTMLElement>>;
  /** Each card's value, by its element, to say which card a dragged one would drop before. */
  cards: RefObject<Map<Element, string>>;
  /** Follows a press on a card, which becomes a drag once it moves, or once a finger holds. */
  press: (event: PointerEvent<HTMLLIElement>, card: Pressed) => void;
  headingLevel: 2 | 3 | 4 | 5 | 6;
  labels: BoardLabels;
};

const BoardContext = createContext<BoardContextValue | null>(null);

/**
 * The stage a card is in, where the card registers, so its stage can count it, and the stage's
 * cards in order, so a card knows its place.
 */
const StageContext = createContext<{
  value: string;
  cards: Registry<string> | null;
  order: readonly string[];
}>({ value: "", cards: null, order: [] });

function useBoard() {
  const board = useContext(BoardContext);
  if (!board) throw new Error("A Board's parts belong inside a Board.");
  return board;
}

/** How far a mouse or pen moves before a press becomes a drag, in pixels. */
const MOUSE_SLOP = 4;
/** How far a finger moves before it holds, after which the press is a scroll, in pixels. */
const TOUCH_SLOP = 10;
/** How long a finger holds a card before it lifts, in milliseconds. */
const HOLD = 350;
/** How near the board's edge a dragged card scrolls the stages, in pixels. */
const EDGE = 64;
/** How far above or below the stages a card can still drop into one, in pixels. */
const SLACK = 48;
/** What a press on starts its own action, not a drag. */
const CONTROL = "button, input, select, textarea, label, [contenteditable]";

export type BoardProps = ComponentPropsWithRef<"section"> & {
  /** Names the board, such as Onboarding. */
  label: string;
  /**
   * Runs as users move a card, to another place in its stage or to another stage, from its menu or
   * by dragging it. It has the card's value, the stage's, and the value of the card it now goes
   * before, or null where it goes at the stage's foot, as a card moved to another stage from its
   * menu does. Put the card there, at once or once the move is saved. If the move fails, leave the
   * card where it was, and tell users.
   */
  onMove: (card: string, stage: string, before: string | null) => void;
  /** The level of each stage's heading. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** The stages, as `BoardColumn` parts, in order. */
  children: ReactNode;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<BoardLabels>;
};

/**
 * Things in stages, as columns of cards side by side, which scroll sideways in a Scroll area where
 * there are more than fit, fading at the edges with more beyond. The board fills the height its
 * container gives it, such as a page laid out to fill the window, or a tile. Its stages then reach
 * its foot, each scrolls its own cards, and the scrollbar sits at the foot. In a page that flows,
 * the board is as tall as its tallest stage, and only the page scrolls down.
 */
export function Board({
  label,
  onMove,
  headingLevel = 3,
  className = "",
  children,
  labels: ownLabels,
  ref,
  ...props
}: BoardProps) {
  const labels = useLabels("board", defaultBoardLabels, ownLabels);
  const play = useScopeSound();
  const timing = useMotionTiming();
  const { items: stages, registry } = useRegistry<Stage>();
  const [moving, setMoving] = useState<Moving | null>(null);
  const [moved, setMoved] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const section = useRef<HTMLElement>(null);
  const merged = useMergedRef(section, ref);
  const viewport = useRef<HTMLDivElement>(null);
  const columns = useRef(new Map<string, HTMLElement>());
  const cards = useRef(new Map<Element, string>());
  // The service's handler, kept apart from the context, so a new one at each render, as an inline
  // function is, renders no card again.
  const moveTo = useLatest(onMove);
  // The press under way, if any, and whether it holds the card, so touch does not scroll.
  const gesture = useRef<{ holds: () => boolean; end: () => void } | null>(null);
  // Puts back the cards that made way for a dropped card, once the board is drawn again, as it is
  // with the card in its new place.
  const settled = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const settle = settled.current;
    settled.current = null;
    settle?.();
  });
  const move = useCallback(
    ({ to, before, ...card }: Moving & { to: string; before: string | null }) => {
      setMoving(card);
      moveTo.current(card.card, to, before);
    },
    [],
  );
  const arrive = useCallback(
    (card: string, name: string, to: string, place: number, count: number) => {
      const stage = stages.find((each) => each.value === to);
      setMoving(null);
      setMoved(card);
      setSaid(labels.moved(name, stage?.label ?? to, place, count));
    },
    [stages, labels],
  );

  const press = useCallback(
    (event: PointerEvent<HTMLLIElement>, card: Pressed) => {
      gesture.current?.end();
      const element = event.currentTarget;
      const page = element.ownerDocument;
      const view = page.defaultView;
      const pointer = event.pointerId;
      const touch = event.pointerType === "touch";
      const start = { x: event.clientX, y: event.clientY };
      const at = { ...start };
      let active = false;
      let over: string | null = null;
      let origin: DOMRect | null = null;
      let ghost: HTMLElement | null = null;
      let frame = 0;
      // When the last frame scrolled the stages, or 0 when it did not.
      let scrolled = 0;
      let hold: ReturnType<typeof setTimeout> | undefined;
      // Each stage's cards as they lie when the drag begins, before any makes way, by where each
      // sits in its list. The list moves as its stage scrolls, so each card's place is read from
      // the list's top. The dragged card's height and the space between cards are what the others
      // move by to make way for it, or to close the space it leaves.
      let laid: Laid[] = [];
      let home: Laid | undefined;
      let homeAt: DOMRect | null = null;
      let from = -1;
      let gap = 0;
      let room = 0;
      // Where the card would drop, as its stage and the place among that stage's other cards.
      let aimed: { stage: string; place: number } | null = null;
      const moved = new Set<HTMLElement>();

      // Where the dragged card's middle is, which says where it would drop, not where the pointer
      // is, so a card held by its foot drops where it is seen, as one held by its middle does.
      const middle = () => ({
        x: (origin?.left ?? 0) + (origin?.width ?? 0) / 2 + at.x - start.x,
        y: (origin?.top ?? 0) + (origin?.height ?? 0) / 2 + at.y - start.y,
      });
      // The stage whose column is under the card's middle, across the column's width and the half
      // of each gap beside it, while the column is in view in the board. A card held past the
      // board's edge, where the stages scroll, is over the stage at that edge. It only reads layout.
      const stageAt = (area: DOMRect, held: { x: number; y: number }) => {
        if (held.y < area.top - SLACK || held.y > area.bottom + SLACK) return null;
        const x = Math.min(Math.max(held.x, area.left), area.right - 1);
        for (const [value, column] of columns.current) {
          const box = column.getBoundingClientRect();
          const left = Math.max(box.left - 6, area.left);
          const right = Math.min(box.right + 6, area.right);
          if (x >= left && x < right) return value;
        }
        return null;
      };
      // Where the card would sit at each place among a stage's other cards, from the top of the
      // stage's list: before each card, as it sits once the card's own space has closed, then
      // past the last.
      const placesIn = (stage: Laid) => {
        const others = stage.cards.filter((each) => each.element !== element);
        const closed = others.map(
          (each) => each.top - (stage === home && stage.cards.indexOf(each) > from ? room : 0),
        );
        const last = others.length - 1;
        return [...closed, last < 0 ? 0 : (closed[last] ?? 0) + (others[last]?.height ?? 0) + gap];
      };
      // The place whose middle is nearest the card's. Among its own stage's places is the one it
      // came from, so the cards beside it make way once it is half over one, whichever way it
      // goes. It only reads layout.
      const placeIn = (stage: Laid, y: number) => {
        const top = stage.list.getBoundingClientRect().top + (origin?.height ?? 0) / 2;
        const places = placesIn(stage);
        let nearest = 0;
        for (const [place, offset] of places.entries())
          if (Math.abs(top + offset - y) < Math.abs(top + (places[nearest] ?? 0) - y))
            nearest = place;
        return nearest;
      };
      // Marks the stage the card would drop into, other than its own, with a tick as it changes.
      // It only writes.
      const aim = (stage: string | null) => {
        const target = stage === card.stage ? null : stage;
        if (target === over) return;
        if (over) columns.current.get(over)?.removeAttribute("data-over");
        if (target) {
          columns.current.get(target)?.setAttribute("data-over", "");
          play("tick", { velocity: 0.5 });
        }
        over = target;
      };
      // Moves each card aside by a transform, as the card would drop: down past the place it would
      // take, and up over the space it left in its own stage. In its own stage, the faded card goes
      // to the place it would take. Out of its stage, it is hidden, so its space closes. It only
      // writes, and only what changed.
      const shift = (target: HTMLElement, by: number) => {
        const next = by ? `translateY(${by}px)` : "";
        if (target.style.transform === next) return;
        target.style.transform = next;
        moved.add(target);
      };
      const arrange = (next: { stage: string; place: number } | null) => {
        if (next?.stage === aimed?.stage && next?.place === aimed?.place) return;
        aimed = next;
        for (const stage of laid) {
          let place = 0;
          for (const [index, each] of stage.cards.entries()) {
            if (each.element === element) continue;
            const left = stage === home && index > from;
            const made = stage.stage === next?.stage && place >= next.place;
            shift(each.element, (made ? room : 0) - (left ? room : 0));
            place += 1;
          }
        }
        const stay = next?.stage === card.stage ? home : undefined;
        element.toggleAttribute("data-away", !stay);
        // At its own place it does not move, which a sum of measured heights would say only
        // to within a fraction of a pixel.
        if (stay && next)
          shift(
            element,
            next.place === from
              ? 0
              : (placesIn(stay)[next.place] ?? 0) - (stay.cards[from]?.top ?? 0),
          );
      };
      // Puts every card back. Instantly, where the board is drawn with the card in its new place,
      // and each card is already where it moved to. Otherwise each glides back.
      const putBack = (instant: boolean) => {
        for (const each of moved) {
          if (instant) each.style.transition = "none";
          each.style.transform = "";
        }
        element.removeAttribute("data-away");
        const done = () => {
          for (const each of moved) each.style.transition = "";
          moved.clear();
          section.current?.removeAttribute("data-sorting");
        };
        if (instant || timing.reduced) requestAnimationFrame(done);
        else setTimeout(done, duration.medium * 1000);
      };
      // At most once a frame, and only while the pointer moves or a scrolling area scrolls: read
      // where the stages and their cards are, scroll near the board's edge or a stage's top or
      // foot, faster the nearer it, then move the copy, mark the stage and move the cards aside.
      // All the reads come before the writes, so the browser lays out at most once a frame. A
      // pointer held still away from the edges costs nothing.
      const request = () => {
        if (!frame) frame = requestAnimationFrame(step);
      };
      const step = (now = performance.now()) => {
        frame = 0;
        const area = viewport.current;
        if (!active || !area) return;
        const box = area.getBoundingClientRect();
        const edge = Math.min(EDGE, box.width / 4);
        const into = Math.max(box.left + edge - at.x, 0) - Math.max(at.x - (box.right - edge), 0);
        const held = middle();
        const target = stageAt(box, held);
        const stage = laid.find((each) => each.stage === target);
        const place = stage ? placeIn(stage, held.y) : 0;
        const lane = stage?.scroll?.getBoundingClientRect();
        const reach = lane ? Math.min(EDGE, lane.height / 4) : 0;
        const down = lane
          ? Math.max(lane.top + reach - at.y, 0) - Math.max(at.y - (lane.bottom - reach), 0)
          : 0;
        // Each scroll is as far as the 60ths of a second since the last one, so the stages scroll
        // at one speed whatever the screen's frame rate. A first scroll counts as one, and a
        // stalled frame as no more than a tenth of a second, so neither jumps.
        const frames = scrolled ? Math.min(now - scrolled, 100) / (1000 / 60) : 1;
        scrolled = into !== 0 || down !== 0 ? now : 0;
        if (into !== 0)
          area.scrollLeft -=
            Math.round((Math.min(Math.abs(into), edge) / 4) * frames) * Math.sign(into);
        if (down !== 0 && stage?.scroll)
          stage.scroll.scrollTop -=
            Math.round((Math.min(Math.abs(down), reach) / 4) * frames) * Math.sign(down);
        if (ghost) ghost.style.transform = `translate(${at.x - start.x}px, ${at.y - start.y}px)`;
        aim(target);
        arrange(target ? { stage: target, place } : null);
        if (into !== 0 || down !== 0) request();
      };
      // A drag selects no words. Clearing a selection writes no style, so nothing else restyles.
      const unselect = () => page.getSelection()?.removeAllRanges();
      const noSelect = (select: Event) => select.preventDefault();
      const begin = () => {
        active = true;
        origin = element.getBoundingClientRect();
        // Every card's place, read once, before any moves, so no later read waits for a layout.
        laid = [...columns.current].flatMap(([stage, column]) => {
          const list = column.querySelector<HTMLElement>(".x-govuk-ui-board-cards");
          if (!list) return [];
          const top = list.getBoundingClientRect().top;
          const scroll = column.querySelector<HTMLElement>(
            ".x-govuk-ui-board-column-scroll > .x-govuk-ui-scroll-area-viewport",
          );
          // A card that has just moved is still rising into place, so its place is where it lies
          // less how far it has still to rise.
          const laidCards = [...list.children].flatMap((child) => {
            if (!cards.current.has(child)) return [];
            const each = child.getBoundingClientRect();
            const rising = new DOMMatrixReadOnly(getComputedStyle(child).transform).f;
            return [
              { element: child as HTMLElement, top: each.top - rising - top, height: each.height },
            ];
          });
          return [{ stage, list, scroll, cards: laidCards }];
        });
        home = laid.find((each) => each.stage === card.stage);
        homeAt = home?.list.getBoundingClientRect() ?? null;
        from = home?.cards.findIndex((each) => each.element === element) ?? -1;
        gap = home ? Number.parseFloat(getComputedStyle(home.list).rowGap) || 0 : 0;
        room = origin.height + gap;
        const look = getComputedStyle(element);
        // The card stays in its place, faded, while a copy of it follows the pointer above the
        // page, where no scrolling region cuts it off. The copy is hidden from screen readers.
        ghost = element.cloneNode(true) as HTMLElement;
        for (const each of [ghost, ...ghost.querySelectorAll("[id]")]) each.removeAttribute("id");
        ghost.removeAttribute("data-arrived");
        ghost.style.transform = "";
        ghost.setAttribute("aria-hidden", "true");
        ghost.inert = true;
        ghost.classList.add("x-govuk-ui-board-ghost");
        Object.assign(ghost.style, {
          left: `${origin.left}px`,
          top: `${origin.top}px`,
          width: `${origin.width}px`,
          height: `${origin.height}px`,
          font: look.font,
          color: look.color,
        });
        page.body.append(ghost);
        // The card holds the pointer, so the grab cursor it shows holds wherever the pointer goes.
        element.setAttribute("data-dragging", "");
        section.current?.setAttribute("data-sorting", "");
        try {
          element.setPointerCapture(pointer);
        } catch {
          // A pointer that has already gone cannot be captured, and its end follows.
        }
        unselect();
        page.addEventListener("selectionchange", unselect);
        page.addEventListener("selectstart", noSelect);
        play("tap", { velocity: 0.7 });
        request();
      };
      // The press after a drag is not a click, so a link the drag began on does not open.
      const swallowClick = () => {
        const swallow = (click: Event) => {
          click.preventDefault();
          click.stopPropagation();
        };
        view?.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => view?.removeEventListener("click", swallow, true), 0);
      };
      const end = () => {
        clearTimeout(hold);
        cancelAnimationFrame(frame);
        frame = 0;
        view?.removeEventListener("pointermove", onMoveTo);
        view?.removeEventListener("pointerup", onUp);
        view?.removeEventListener("pointercancel", onCancel);
        view?.removeEventListener("keydown", onKey, true);
        page.removeEventListener("selectionchange", unselect);
        page.removeEventListener("selectstart", noSelect);
        aim(null);
        active = false;
        if (gesture.current === handle) gesture.current = null;
      };
      // A card that does not move goes back to its place, then shows again, as the others glide
      // back to theirs.
      const settle = () => {
        const copy = ghost;
        ghost = null;
        end();
        putBack(false);
        // Its place is where it lay, moved as far as its stage has scrolled since. It glides there
        // from the place it had made way to, so its own box cannot say.
        const now = home?.list.isConnected ? home.list.getBoundingClientRect() : null;
        const back =
          now && homeAt && origin
            ? { left: origin.left + now.left - homeAt.left, top: origin.top + now.top - homeAt.top }
            : null;
        const done = () => {
          copy?.remove();
          element.removeAttribute("data-dragging");
        };
        if (!copy || !back || !origin || timing.reduced) return done();
        copy.style.transition =
          "transform var(--x-govuk-ui-duration-medium) var(--x-govuk-ui-ease-out)";
        copy.style.transform = `translate(${back.left - origin.left}px, ${back.top - origin.top}px)`;
        copy.addEventListener("transitionend", done, { once: true });
        setTimeout(done, 400);
      };
      // A card that drops elsewhere asks the service to move it. The cards stay as they made way
      // until the board is drawn again, then go back at once, as the card is in its new place.
      // Where the service moves it later, once the move is saved, they glide back meanwhile.
      const drop = (to: string, place: number) => {
        const target = laid.find((each) => each.stage === to);
        const others = target?.cards.filter((each) => each.element !== element) ?? [];
        const before = others[place]?.element;
        const list = element.parentElement;
        const index = list ? [...list.children].indexOf(element) : -1;
        ghost?.remove();
        ghost = null;
        element.removeAttribute("data-dragging");
        end();
        play("swoosh");
        const putAway = () => {
          const still =
            element.isConnected &&
            element.parentElement === list &&
            list !== null &&
            [...list.children].indexOf(element) === index;
          putBack(!still);
        };
        settled.current = putAway;
        requestAnimationFrame(() => {
          if (settled.current !== putAway) return;
          settled.current = null;
          putAway();
        });
        const following = home?.cards[from + 1]?.element;
        move({
          card: card.value,
          from: card.stage,
          next: following ? (cards.current.get(following) ?? null) : null,
          focus: false,
          to,
          before: before ? (cards.current.get(before) ?? null) : null,
        });
      };
      // A move only notes where the pointer is. The next frame acts on it.
      function onMoveTo(next: globalThis.PointerEvent) {
        if (next.pointerId !== pointer) return;
        at.x = next.clientX;
        at.y = next.clientY;
        if (active) return request();
        const far = Math.hypot(at.x - start.x, at.y - start.y) > (touch ? TOUCH_SLOP : MOUSE_SLOP);
        // A finger that moves before it holds is scrolling.
        if (touch) {
          if (far) end();
          return;
        }
        if (far) begin();
      }
      function onUp(up: globalThis.PointerEvent) {
        if (up.pointerId !== pointer) return;
        if (!active) return end();
        swallowClick();
        // The frame the pointer moved in may not have come yet, so the drop is aimed now.
        cancelAnimationFrame(frame);
        frame = 0;
        step();
        const there = aimed;
        if (there && !(there.stage === card.stage && there.place === from))
          drop(there.stage, there.place);
        else settle();
      }
      function onCancel(cancel: globalThis.PointerEvent) {
        if (cancel.pointerId !== pointer) return;
        if (active) settle();
        else end();
      }
      // Escape puts the card back, and goes no further, so it closes nothing around the board.
      function onKey(key: KeyboardEvent) {
        if (key.key !== "Escape" || !active) return;
        key.preventDefault();
        key.stopPropagation();
        settle();
      }
      view?.addEventListener("pointermove", onMoveTo);
      view?.addEventListener("pointerup", onUp);
      view?.addEventListener("pointercancel", onCancel);
      view?.addEventListener("keydown", onKey, true);
      if (touch) hold = setTimeout(begin, HOLD);
      const handle = { holds: () => active, end: () => (active ? settle() : end()) };
      gesture.current = handle;
    },
    [move, play, timing],
  );

  // A finger that holds a card drags it, so the page does not scroll under it, and its press opens
  // no menu of the browser's. The browser lets a listener stop a scroll only if it was there before
  // the touch began, so this one is on the board throughout. It costs one wait for the page's
  // script as a touch on the board starts to scroll, and nothing after: the browser sends the rest
  // of the scroll's moves without waiting. A drag under way ends with the board.
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const holding = (event: Event) => {
      if (gesture.current?.holds()) event.preventDefault();
    };
    element.addEventListener("touchmove", holding, { passive: false });
    element.addEventListener("contextmenu", holding);
    return () => {
      element.removeEventListener("touchmove", holding);
      element.removeEventListener("contextmenu", holding);
      gesture.current?.end();
    };
  }, []);

  const context = useMemo(
    () => ({
      stages,
      registry,
      move,
      moving,
      arrive,
      moved,
      columns,
      cards,
      press,
      headingLevel,
      labels,
    }),
    [stages, registry, move, moving, arrive, moved, press, headingLevel, labels],
  );
  return (
    <BoardContext value={context}>
      <section
        aria-label={label}
        {...props}
        ref={merged}
        className={`x-govuk-ui-board ${className}`.trim()}
      >
        {/* Unnamed, it adds no Tab stop, because each card's menu can take focus. */}
        <ScrollArea
          orientation="horizontal"
          fade
          viewportRef={viewport}
          className="x-govuk-ui-board-scroll"
        >
          <div className="x-govuk-ui-board-stages">{children}</div>
        </ScrollArea>
        <p className="x-govuk-ui-visually-hidden" role="status">
          {said}
        </p>
      </section>
    </BoardContext>
  );
}

export type BoardColumnProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** Says which stage it is, for `onMove`. */
  value: string;
  /** The stage's name, such as Meeting held. */
  label: string;
  /**
   * Sits before the name, such as a dot in the stage's colour. It is hidden from screen readers,
   * because the name already says which stage it is.
   */
  marker?: ReactNode;
  /** The stage's cards, as `BoardCard` parts. */
  children?: ReactNode;
};

/**
 * One stage: its name, how many cards it has, and its cards, in order, the first at the top, which
 * scroll in a Scroll area where the board is too short for them. It is a group named by its
 * heading, not a region, so the board adds one landmark, not one for each stage. While a card from
 * another stage is dragged over it, it is outlined, ready to take the card, and its cards make way
 * for it where it would drop. Near its top or foot, its cards scroll.
 */
export function BoardColumn({
  value,
  label,
  marker,
  className = "",
  children,
  ref,
  ...props
}: BoardColumnProps) {
  const board = useBoard();
  const { labels, columns } = board;
  const place = useRef<HTMLDivElement | null>(null);
  const stage = useMemo(() => ({ value, label }), [value, label]);
  useRegister(board.registry, stage, place);
  const own = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      place.current = element;
      columns.current.set(value, element);
      return () => {
        place.current = null;
        if (columns.current.get(value) === element) columns.current.delete(value);
      };
    },
    [columns, value],
  );
  const merged = useMergedRef(own, ref);
  // Each card registers once it renders, so a card in a wrapper of a service's own is counted.
  // Until then, as the server renders, the cards are the direct children.
  const { items: cards, registry: cardRegistry } = useRegistry<string>();
  const [registered, setRegistered] = useState(false);
  useLayoutEffect(() => setRegistered(true), []);
  const count = registered ? cards.length : Children.toArray(children).length;
  const inStage = useMemo(
    () => ({ value, cards: cardRegistry, order: registered ? cards : [] }),
    [value, cardRegistry, registered, cards],
  );
  const Heading = `h${board.headingLevel}` as const;
  const heading = useId();
  return (
    <StageContext value={inStage}>
      {/* biome-ignore lint/a11y/useSemanticElements: a stage of cards is a group, not a fieldset of fields. */}
      <div
        role="group"
        aria-labelledby={heading}
        {...props}
        ref={merged}
        className={`x-govuk-ui-board-column ${className}`.trim()}
      >
        <Heading id={heading} className="x-govuk-ui-board-column-heading">
          {marker && (
            <span className="x-govuk-ui-board-column-marker" aria-hidden="true">
              {marker}
            </span>
          )}
          <span className="x-govuk-ui-board-column-name">{label}</span>
          <span className="x-govuk-ui-board-column-count">
            <span aria-hidden="true">{count}</span>
            <span className="x-govuk-ui-visually-hidden">{labels.count(count)}</span>
          </span>
        </Heading>
        {/* The list is always drawn, so a wrapper that draws no card yet can draw one later. */}
        <ScrollArea orientation="vertical" fade className="x-govuk-ui-board-column-scroll">
          <ol className="x-govuk-ui-board-cards">{children}</ol>
        </ScrollArea>
        {count === 0 && <p className="x-govuk-ui-board-empty">{labels.empty}</p>}
      </div>
    </StageContext>
  );
}

export type BoardCardProps = Omit<ComponentPropsWithRef<"li">, "value"> & {
  /** Says which card it is, for `onMove`. */
  value: string;
  /** The card's name, which its menu and screen readers use, such as a company's name. */
  label: string;
  /** What the card shows, such as a RecordChip and a Tag. */
  children: ReactNode;
};

/**
 * One thing on the board, with a menu at its corner that moves it up or down its stage, or to the
 * foot of another stage. A mouse or pen drags it by anywhere but a control, such as its menu, and
 * a finger once it has held it for a moment. Dragged, a copy follows the pointer, and the cards
 * make way for it where it would drop, in its own stage or another, which is outlined. In its own
 * stage, the card itself, faded, shows where it would drop. Near the board's edge, the stages
 * scroll. Escape, or a drop outside any stage, puts it back. Once it is in its new place, the card
 * rises into it, unless users ask for reduced motion. Moved from its menu, its menu takes focus
 * there.
 */
export function BoardCard({
  value,
  label,
  className = "",
  children,
  onPointerDown,
  onDragStart,
  ref,
  ...props
}: BoardCardProps) {
  const board = useBoard();
  const { value: stage, cards, order } = useContext(StageContext);
  const place = useRef<HTMLLIElement | null>(null);
  useRegister(cards, value, place);
  const values = board.cards;
  const own = useCallback(
    (element: HTMLLIElement | null) => {
      if (!element) return;
      values.current.set(element, value);
      return () => {
        values.current.delete(element);
      };
    },
    [values, value],
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const { moving, arrive } = board;
  const index = order.indexOf(value);
  const previous = index > 0 ? order[index - 1] : undefined;
  const next = index >= 0 ? (order[index + 1] ?? null) : null;
  // A card moved to another stage is drawn anew there. A card moved within its stage is drawn
  // again with another card after it. Either way, it knows it has arrived as its stage counts it
  // in its new place.
  const arriving =
    moving?.card === value && index >= 0 && (moving.from !== stage || moving.next !== next);
  const focus = arriving && moving.focus;
  useEffect(() => {
    if (!arriving) return;
    if (focus) trigger.current?.focus({ preventScroll: false });
    arrive(value, label, stage, index + 1, order.length);
  }, [arriving, focus, arrive, value, label, stage, index, order.length]);
  const arrived = board.moved === value;
  const go = (to: string, before: string | null) =>
    board.move({ card: value, from: stage, next, focus: true, to, before });
  const others = board.stages.filter((each) => each.value !== stage);
  return (
    <li
      {...props}
      ref={useMergedRef(useMergedRef(place, own), ref)}
      className={`x-govuk-ui-board-card ${className}`.trim()}
      data-arrived={arrived || undefined}
      onPointerDown={chain(onPointerDown, (event) => {
        if (event.button !== 0 || !event.isPrimary) return;
        if ((event.target as Element).closest(CONTROL)) return;
        board.press(event, { value, stage });
      })}
      // The browser's own drag of a link or image would take the pointer from the card's.
      onDragStart={chain(onDragStart, (event) => event.preventDefault())}
    >
      <div className="x-govuk-ui-board-card-body">{children}</div>
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={trigger}
          variant="quiet"
          size="small-icon"
          chevron={false}
          className="x-govuk-ui-board-card-menu"
          aria-label={board.labels.move(label)}
        >
          <MoreIcon />
        </DropdownMenuTrigger>
        <MenuContent align="end">
          {previous !== undefined && (
            <MenuItem onSelect={() => go(stage, previous)}>{board.labels.moveUp}</MenuItem>
          )}
          {next !== null && (
            <MenuItem onSelect={() => go(stage, order[index + 2] ?? null)}>
              {board.labels.moveDown}
            </MenuItem>
          )}
          {(previous !== undefined || next !== null) && others.length > 0 && <MenuSeparator />}
          {others.map((each) => (
            <MenuItem key={each.value} onSelect={() => go(each.value, null)}>
              {board.labels.moveTo(each.label)}
            </MenuItem>
          ))}
        </MenuContent>
      </DropdownMenu>
    </li>
  );
}
