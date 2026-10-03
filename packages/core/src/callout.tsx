"use client";

import { Popover as Primitive } from "@base-ui/react/popover";
import {
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Button, type ButtonProps } from "./button";
import { Countdown } from "./countdown";
import { ArrowShape, CloseIconButton, useOverlaySound } from "./overlay";
import { useMergedRef } from "./refs";
import { useScopeSound } from "./sound-scope";

/** What a callout points at, which is an element, a ref to one, or a CSS selector for one. */
export type CalloutAnchor = Element | RefObject<Element | null> | string | null;
export type CalloutSide = "auto" | "top" | "right" | "bottom" | "left";
/** Brand blue, to stand apart from the page, or plain, on the page's own colours. */
export type CalloutVariant = "brand" | "plain";
type Side = Exclude<CalloutSide, "auto">;

/**
 * Finds the element a callout points at. A selector is looked up when the callout opens.
 * @internal
 */
export function resolveAnchor(anchor: CalloutAnchor | undefined): Element | null {
  if (!anchor) return null;
  if (typeof anchor === "string") return document.querySelector(anchor);
  if ("current" in anchor) return anchor.current;
  return anchor;
}

// The space a card leaves between itself and what it points at, and between itself and the edge.
const GAP = 12;
const EDGE = 8;
// The order in which to try the sides when several have the same room. Below and above come first,
// because people read them first.
const SIDES: readonly Side[] = ["bottom", "top", "right", "left"];

/** The cards of callouts that are open, which a callout choosing its side keeps clear of. */
const placed = new Set<HTMLElement>();

type Box = { left: number; top: number; right: number; bottom: number };

/**
 * The part of the screen a card can use beside its anchor. It is the window, cut down to any box
 * that the anchor scrolls or is clipped inside, because the card must stay within those boxes too.
 */
function boundaryOf(anchor: Element): Box {
  const box = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  for (let parent = anchor.parentElement; parent; parent = parent.parentElement) {
    if (parent === document.body || parent === document.documentElement) break;
    const style = getComputedStyle(parent);
    if (`${style.overflowX}${style.overflowY}`.replaceAll("visible", "") === "") continue;
    const edge = parent.getBoundingClientRect();
    box.left = Math.max(box.left, edge.left);
    box.top = Math.max(box.top, edge.top);
    box.right = Math.min(box.right, edge.right);
    box.bottom = Math.min(box.bottom, edge.bottom);
  }
  return box;
}

/** Things people press, which a card would rather not cover. */
const CONTROLS =
  'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** The boxes of the controls inside a boundary, apart from the anchor and the card. */
function controlsIn(boundary: Box, anchor: Element, card: HTMLElement | null) {
  const boxes: DOMRect[] = [];
  for (const control of document.querySelectorAll(CONTROLS)) {
    if (control === anchor || anchor.contains(control) || card?.contains(control)) continue;
    const box = control.getBoundingClientRect();
    if (!box.width || box.bottom < boundary.top || box.top > boundary.bottom) continue;
    if (box.right < boundary.left || box.left > boundary.right) continue;
    boxes.push(box);
  }
  return boxes;
}

/**
 * The side of its anchor where a card finds the best space, measured on all four sides within the
 * anchor's boundary. A side counts only if the whole card fits there. Among those sides, the card
 * prefers the one that covers the fewest other open callouts. Next, it prefers the one that covers
 * the fewest things people press, such as the question it explains or the buttons beside it. After
 * that, it prefers the side with the most room.
 *
 * A card keeps its current side while it still fits there and covers nothing, so it does not hop
 * about as the page moves or its content grows. If it fits nowhere, it takes the side with the most
 * room.
 * @internal
 */
export function roomiestSide(
  anchor: DOMRect,
  boundary: Box,
  card: { width: number; height: number },
  current: Side | null,
  others: DOMRect[] = [],
  controls: DOMRect[] = [],
): Side {
  const room: Record<Side, number> = {
    top: anchor.top - boundary.top - EDGE,
    bottom: boundary.bottom - anchor.bottom - EDGE,
    left: anchor.left - boundary.left - EDGE,
    right: boundary.right - anchor.right - EDGE,
  };
  const across = (side: Side) => side === "top" || side === "bottom";
  const need = (side: Side) => (across(side) ? card.height : card.width) + GAP;
  const spare = (side: Side) => room[side] - need(side);
  const clampTo = (start: number, size: number, low: number, high: number) =>
    Math.max(low + EDGE, Math.min(high - EDGE - size, start));
  // Where the card would sit on a side. It is centred on the anchor along that side, and kept on
  // screen.
  const boxOn = (side: Side): Box => {
    if (across(side)) {
      const left = clampTo(
        anchor.left + anchor.width / 2 - card.width / 2,
        card.width,
        boundary.left,
        boundary.right,
      );
      const top = side === "bottom" ? anchor.bottom + GAP : anchor.top - GAP - card.height;
      return { left, top, right: left + card.width, bottom: top + card.height };
    }
    const top = clampTo(
      anchor.top + anchor.height / 2 - card.height / 2,
      card.height,
      boundary.top,
      boundary.bottom,
    );
    const left = side === "right" ? anchor.right + GAP : anchor.left - GAP - card.width;
    return { left, top, right: left + card.width, bottom: top + card.height };
  };
  const covered = (side: Side, boxes: DOMRect[]) => {
    const box = boxOn(side);
    return boxes.reduce((total, other) => {
      const width = Math.min(box.right, other.right) - Math.max(box.left, other.left);
      const height = Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top);
      return total + Math.max(0, width) * Math.max(0, height);
    }, 0);
  };
  const fits = (side: Side) => spare(side) >= 0;
  const cost = (side: Side) => [covered(side, others), covered(side, controls), -spare(side)];
  if (current && fits(current) && cost(current)[0] === 0 && cost(current)[1] === 0) return current;
  const fitting = SIDES.filter(fits);
  if (fitting.length)
    return fitting.reduce((best, side) => {
      const [a, b] = [cost(side), cost(best)];
      const better = a[0]! - b[0]! || a[1]! - b[1]! || a[2]! - b[2]!;
      return better < 0 ? side : best;
    });
  return SIDES.reduce((best, side) =>
    room[side] / need(side) > room[best] / need(best) ? side : best,
  );
}

/**
 * The side a card takes. With `auto`, it is the side with the most room, chosen again whenever the
 * card or the window changes size. The card is registered while it is open, so other callouts keep
 * clear of it.
 * @internal
 */
export function useCalloutSide(
  open: boolean,
  anchor: Element | null,
  card: HTMLElement | null,
  side: CalloutSide,
): Side {
  const [chosen, setChosen] = useState<Side>(side === "auto" ? "bottom" : side);
  useLayoutEffect(() => {
    if (side !== "auto") {
      setChosen(side);
      return;
    }
    if (!open || !anchor) return;
    const choose = () => {
      // The card's laid-out size, not its size part way through growing in.
      const size = card ? { width: card.offsetWidth, height: card.offsetHeight } : null;
      const others = [...placed].filter((other) => other !== card);
      const boundary = boundaryOf(anchor);
      setChosen((current) =>
        roomiestSide(
          anchor.getBoundingClientRect(),
          boundary,
          size ?? { width: 320, height: 150 },
          size ? current : null,
          others.map((other) => other.getBoundingClientRect()),
          controlsIn(boundary, anchor, card),
        ),
      );
    };
    choose();
    const observer = new ResizeObserver(choose);
    if (card) observer.observe(card);
    addEventListener("resize", choose);
    return () => {
      observer.disconnect();
      removeEventListener("resize", choose);
    };
  }, [open, anchor, card, side]);
  useEffect(() => {
    if (!open || !card) return;
    placed.add(card);
    return () => {
      placed.delete(card);
    };
  }, [open, card]);
  return chosen;
}

// The card takes the rest of the props.
export type CalloutProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  /**
   * What it points at, which is an element, a ref to an element, or a CSS selector. Leave it out
   * when you give a `trigger`, and the callout points at the trigger.
   */
  anchor?: CalloutAnchor;
  /**
   * A button that opens and closes it, such as a CalloutTrigger beside a question, for help that
   * people ask for.
   */
  trigger?: ReactElement;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: ReactNode;
  children?: ReactNode;
  /** Buttons at its foot, such as "Got it". */
  actions?: ReactNode;
  /** Brand blue, to stand apart from the page, or plain, on the page's own colours. */
  variant?: CalloutVariant;
  /** The side of its anchor it sits on. With `auto`, the side where it finds the best space. */
  side?: CalloutSide;
  align?: "start" | "center" | "end";
  /**
   * Closes it when someone presses outside it. By default, help that people asked for closes, and
   * a notice stays while they use the page.
   */
  closeOnPressOutside?: boolean;
  /**
   * Closes it after this many milliseconds, as Toast's `timeout` does, for a notice that can go by
   * itself. The default, 0, keeps it open until someone closes it, because a notice that vanishes
   * may be missed. The time stops while the pointer or focus is on it, and continues afterwards.
   */
  timeout?: number;
  /**
   * With a timeout, shows the time left as a line along the foot of the card, as Toast's does. The
   * line shrinks as the time runs out, and stops while the time stops. Its colour is
   * `--x-govuk-ui-countdown-colour`, and its thickness is `--x-govuk-ui-countdown-height`.
   */
  countdown?: boolean;
  /**
   * Shows a × button in the corner, as Popover's `closeButton` does. Without it, give people
   * another way to close it, such as an action, a timeout or a press outside.
   */
  closeButton?: boolean;
  closeLabel?: string;
  className?: string;
};

/**
 * A card with an arrow that points at something on the page, for help, a notice or a step in a
 * Tour. It is brand blue unless you choose plain.
 *
 * Given a `trigger`, it is help that people ask for. The button opens it, focus moves into it, and
 * a press outside or Escape closes it.
 *
 * Given an `anchor`, it is a notice that appears by itself, with the notification sound. Screen
 * readers read it out without it taking focus. It stays while people use the page, until they
 * close it or its `timeout` passes.
 *
 * Unless told otherwise, it takes the side where it finds the best space. It keeps clear of other
 * open callouts and of controls, and moves to another side if it no longer fits.
 */
export function Callout({
  anchor,
  trigger,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  title,
  children,
  actions,
  variant = "brand",
  side = "auto",
  align = "center",
  closeOnPressOutside,
  timeout = 0,
  countdown = true,
  closeButton = true,
  closeLabel = "Close",
  className = "",
  ref,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  ...props
}: CalloutProps) {
  const [own, setOwn] = useState(defaultOpen);
  const open = controlled ?? own;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  const asked = Boolean(trigger);
  const sound = useOverlaySound();
  const play = useScopeSound();
  const [target, setTarget] = useState<Element | null>(null);
  const [card, setCard] = useState<HTMLDivElement | null>(null);
  const cardRef = useMergedRef(setCard, ref);
  const chosen = useCalloutSide(open, target, card, side);
  const [heard, setHeard] = useState("");

  // A selector is looked up as the callout opens, once the page has what it names.
  const triggerElement = useRef<HTMLButtonElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a selector is looked up at each opening.
  useLayoutEffect(() => {
    setTarget(asked ? triggerElement.current : resolveAnchor(anchor));
  }, [anchor, asked, open]);
  // While the callout is open, an anchor that leaves the page is looked up again as the page
  // changes. A toolbar's control, for example, goes behind More when the window narrows, and comes
  // back when it widens. While there is nothing to point at, the card waits out of sight, not at
  // the page's corner.
  //
  // The page can change while the browser is laying it out, such as while the window is resized. A
  // card that moved to its new anchor then would have the anchor measured too late for that frame,
  // and the browser would report a loop of resize observers. The card therefore moves in a task of
  // its own, straight away.
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    if (asked || !open) return;
    let timer = 0;
    const observer = new MutationObserver(() => {
      if (targetRef.current?.isConnected) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        const found = resolveAnchor(anchor);
        flushSync(() => setTarget(found?.isConnected ? found : null));
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [anchor, asked, open]);

  // A notice that appears by itself plays a sound, and is read out without moving focus. A notice
  // that is there from the start stays quiet, because nothing has happened.
  const appeared = useRef(open);
  useEffect(() => {
    if (asked || !open || appeared.current) {
      appeared.current = open;
      return;
    }
    appeared.current = true;
    play("notification");
  }, [open, asked, play]);
  useEffect(() => {
    if (asked || !open || !card) return setHeard("");
    // The words are set a moment after the region is empty, so screen readers hear the change.
    const words = card.querySelectorAll(
      ".x-govuk-ui-callout-title, .x-govuk-ui-callout-description",
    );
    const timer = setTimeout(
      () => setHeard([...words].map((part) => (part as HTMLElement).innerText).join(". ")),
      150,
    );
    return () => clearTimeout(timer);
  }, [asked, open, card]);

  // A notice with a timeout closes itself, but not while someone is reading or using it. The time
  // stops while the pointer or focus is on it, and continues from there afterwards, as a toast's
  // does.
  const [pointed, setPointed] = useState(false);
  const [focused, setFocused] = useState(false);
  const held = pointed || focused;
  // A card closed from inside, such as by its own button, gets no event for the pointer or focus
  // leaving it, so the pause is released here.
  useEffect(() => {
    if (open) return;
    setPointed(false);
    setFocused(false);
  }, [open]);
  const closeRef = useRef(setOpen);
  closeRef.current = setOpen;
  const left = useRef(timeout);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each opening starts the time in full.
  useEffect(() => {
    left.current = timeout;
  }, [open, timeout]);
  useEffect(() => {
    if (!open || timeout <= 0 || held) return;
    const started = performance.now();
    const timer = setTimeout(() => closeRef.current(false), left.current);
    return () => {
      clearTimeout(timer);
      left.current = Math.max(0, left.current - (performance.now() - started));
    };
  }, [open, timeout, held]);

  return (
    <Primitive.Root
      open={open}
      onOpenChange={(next, details) => {
        // A notice stays while people use the page around it, unless told otherwise.
        const outside = details.reason === "outside-press" || details.reason === "focus-out";
        if (!next && outside && !(closeOnPressOutside ?? asked)) return;
        sound(next, details.reason);
        setOpen(next);
      }}
    >
      {trigger && <Primitive.Trigger ref={triggerElement} render={trigger} />}
      {!asked && (
        <span className="x-govuk-ui-visually-hidden" role="status">
          {heard}
        </span>
      )}
      <Primitive.Portal>
        <Primitive.Positioner
          className="x-govuk-ui-floating-positioner"
          anchor={asked ? undefined : target}
          style={asked || target ? undefined : { visibility: "hidden" }}
          side={chosen}
          align={align}
          sideOffset={GAP}
          collisionPadding={EDGE}
          collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "end" }}
        >
          <Primitive.Popup
            {...props}
            ref={cardRef}
            className={`x-govuk-ui-floating x-govuk-ui-callout ${className}`.trim()}
            data-variant={variant}
            data-held={held || undefined}
            initialFocus={asked ? undefined : false}
            finalFocus={asked ? undefined : false}
            onPointerEnter={(event) => {
              onPointerEnter?.(event);
              setPointed(true);
            }}
            onPointerLeave={(event) => {
              onPointerLeave?.(event);
              setPointed(false);
            }}
            onFocus={(event) => {
              onFocus?.(event);
              setFocused(true);
            }}
            onBlur={(event) => {
              onBlur?.(event);
              if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
            }}
          >
            <Primitive.Arrow className="x-govuk-ui-floating-arrow">
              <ArrowShape />
            </Primitive.Arrow>
            {title && (
              <Primitive.Title className="x-govuk-ui-callout-title">{title}</Primitive.Title>
            )}
            {children && (
              <Primitive.Description className="x-govuk-ui-callout-description" render={<div />}>
                {children}
              </Primitive.Description>
            )}
            {actions && <div className="x-govuk-ui-callout-actions">{actions}</div>}
            {closeButton && (
              <Primitive.Close
                render={<CloseIconButton label={closeLabel} className="x-govuk-ui-callout-close" />}
              />
            )}
            {/* A new timeout starts the line again. */}
            {countdown && timeout > 0 && <Countdown key={timeout} time={timeout} />}
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

/**
 * The small round button that opens help beside a question or a heading, marked with a question
 * mark. Name it for what it helps with, such as "Help with your reference number".
 */
export function CalloutTrigger({
  label = "Help",
  className = "",
  ...props
}: ButtonProps & { label?: string }) {
  return (
    <Button
      variant="quiet"
      size="small-icon"
      aria-label={label}
      className={`x-govuk-ui-callout-trigger ${className}`.trim()}
      {...props}
    >
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
        <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7.9 7.7a2.2 2.2 0 1 1 3 2.05c-.6.24-.9.7-.9 1.3v.45"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="10" cy="14.2" r="1" fill="currentColor" />
      </svg>
    </Button>
  );
}
