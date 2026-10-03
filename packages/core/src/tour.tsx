"use client";

import { Popover as Primitive } from "@base-ui/react/popover";
import {
  Children,
  type ComponentPropsWithRef,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import {
  type CalloutAnchor,
  type CalloutSide,
  type CalloutVariant,
  resolveAnchor,
  useCalloutSide,
} from "./callout";
import { glideEasing, useMotionTiming } from "./motion";
import { ArrowShape, CloseIconButton, useOverlaySound } from "./overlay";
import { useMergedRef } from "./refs";
import { useStoredState } from "./stored-state";

export type TourStepProps = {
  /**
   * What the step points at, which is an element, a ref to one, or a CSS selector. A step whose
   * target is not on the page is passed over. Leave it out for a step about the whole page, such as
   * a welcome, which sits in the middle of the screen.
   */
  target?: CalloutAnchor;
  title: ReactNode;
  children?: ReactNode;
  /** The side of its target it sits on. With `auto`, the side where it finds the best space. */
  side?: CalloutSide;
  align?: "start" | "center" | "end";
  /** Added to the card while this step shows. */
  className?: string;
};

/** One step of a Tour. It shows nothing itself, because the Tour shows each step in turn. */
export function TourStep(_props: TourStepProps): ReactNode {
  return null;
}

// The card takes the other props, at every step.
export type TourProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** The steps, as TourStep elements, in order. */
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Brand blue, to stand apart from the page, or plain, on the page's own colours. */
  variant?: CalloutVariant;
  /**
   * Dims the page, except for a gap around what each step points at, which glides from one to the
   * next. The colour is `--x-govuk-ui-tour-dim`, and the gap's corners are
   * `--x-govuk-ui-tour-radius`.
   */
  dim?: boolean;
  /** The space the dimming leaves around each target, in pixels. */
  dimPadding?: number;
  /**
   * Keeps how far someone got in local storage under this key, so it lasts between visits.
   * Without it, the tour keeps it only while the page is open.
   */
  storageKey?: string;
  /**
   * Whether opening the tour again continues from the step where someone left it. Once they have
   * finished, it starts again from the first step either way.
   */
  resume?: boolean;
  /**
   * What closing the tour before the end does. `ends` counts it as done, so a tour that opens by
   * default does not open again. `pauses` keeps their place, so it opens again where they left it.
   */
  closing?: "ends" | "pauses";
  /**
   * Closes the tour when someone presses outside it. Otherwise they can use the page around it.
   * Moving focus out of it with the keyboard leaves it open either way.
   */
  closeOnPressOutside?: boolean;
  /**
   * Shows a × button in the corner, as Popover's `closeButton` does. Without it, people close the
   * tour with Escape, by finishing it, or by a press outside if you allow that.
   */
  closeButton?: boolean;
  /** Called when someone presses Done on the last step. */
  onFinish?: () => void;
  /** How far along the tour is, shown beside the dots and read out with each step. */
  stepLabel?: (step: number, total: number) => string;
  nextLabel?: string;
  backLabel?: string;
  doneLabel?: string;
  closeLabel?: string;
  /** Added to the card at every step. */
  className?: string;
};

type Progress = { step: number; ended: "finished" | "closed" | null };
type Rect = { x: number; y: number; width: number; height: number };
type Boxed = { getBoundingClientRect(): DOMRect };

/** The middle of the screen, where a step about the whole page sits. */
const middle: Boxed = {
  getBoundingClientRect: () => new DOMRect(innerWidth / 2, innerHeight / 2, 0, 0),
};

/** Whether an element is fully on screen, with a little space around it. */
function inSight(element: Element) {
  const box = element.getBoundingClientRect();
  return (
    box.top >= 16 && box.left >= 0 && box.bottom <= innerHeight - 16 && box.right <= innerWidth
  );
}

/** Waits until an element stops moving, as the page finishes scrolling to it. */
function settled(element: Element) {
  return new Promise<void>((resolve) => {
    let last = element.getBoundingClientRect().top;
    let still = 0;
    const start = performance.now();
    const check = () => {
      const top = element.getBoundingClientRect().top;
      still = Math.abs(top - last) < 0.5 ? still + 1 : 0;
      last = top;
      if (still >= 3 || performance.now() - start > 1200) resolve();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  });
}

const count = (step: number, total: number) => `${step} of ${total}`;

/**
 * A walk through a page, one step at a time. Each step is a card pointing at a part of the page,
 * or sitting in the middle of the screen. It has its title, a sentence or two, how far along the
 * tour is, and Back, Next and Done. The card glides from one step to the next. The page first
 * scrolls to a step that is out of sight. Each card takes the side of its target where it finds
 * the best space.
 *
 * Focus moves to Next as the tour opens. The arrow keys step through it, and Escape or × closes it.
 * Focus then returns to where it was. Screen readers hear each step as it comes. You choose its
 * look, whether it dims the page, where it continues from, and what closing does.
 */
export function Tour({
  children,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  variant = "brand",
  dim = false,
  dimPadding = 6,
  storageKey,
  resume = true,
  closing = "ends",
  closeOnPressOutside = false,
  closeButton = true,
  onFinish,
  stepLabel = count,
  nextLabel = "Next",
  backLabel = "Back",
  doneLabel = "Done",
  closeLabel = "Close the tour",
  className = "",
  ref,
  onKeyDown,
  ...props
}: TourProps) {
  const steps = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => child.props as TourStepProps);
  const stepsNow = useRef(steps);
  stepsNow.current = steps;
  // How far someone got, in local storage with a key, or else in memory.
  const [progress, setProgress] = useStoredState<Progress>(storageKey, { step: 0, ended: null });
  const firstStep = () => {
    if (!resume || progress.ended === "finished") return 0;
    return Math.max(0, Math.min(steps.length - 1, progress.step));
  };
  // A tour opened by default stays closed once someone has finished it, or ended it by closing.
  const [own, setOwn] = useState(() => defaultOpen && progress.ended === null);
  const open = controlled ?? own;
  const setOpen = (next: boolean) => {
    if (controlled === undefined) setOwn(next);
    onOpenChange?.(next);
  };
  const setOpenNow = useRef(setOpen);
  setOpenNow.current = setOpen;
  const [step, setStep] = useState(firstStep);
  // The step's target, or the middle of the screen for a step about the whole page.
  const [target, setTarget] = useState<Element | "middle" | null>(null);
  const [card, setCard] = useState<HTMLDivElement | null>(null);
  const cardRef = useMergedRef(setCard, ref);
  const [positioner, setPositioner] = useState<HTMLDivElement | null>(null);
  const [moving, setMoving] = useState(false);
  const [heard, setHeard] = useState("");
  const { reduced } = useMotionTiming();
  const sound = useOverlaySound();
  const next = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const direction = useRef(1);
  const glideFrom = useRef<{ box: DOMRect; until: number } | null>(null);
  const flip = useRef<Animation | null>(null);
  const current = steps[step];
  const last = step === steps.length - 1;
  const centred = target === "middle";
  const element = target instanceof Element ? target : null;
  const side = useCalloutSide(open, element, card, centred ? "top" : (current?.side ?? "auto"));

  // Opening starts at the first step, or where someone left it. Focus goes back to where it was
  // once the tour closes.
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      returnTo.current = document.activeElement as HTMLElement | null;
      direction.current = 1;
      setStep(firstStep());
      setHeard("");
    }
    wasOpen.current = open;
  });

  // Each step finds its target as it comes. A step whose target is not on the page is passed over,
  // in the direction of travel.
  useLayoutEffect(() => {
    if (!open) return;
    const wanted = stepsNow.current[step]?.target;
    if (wanted === undefined) {
      setTarget("middle");
      return;
    }
    const found = resolveAnchor(wanted);
    if (found) {
      setTarget(found);
      if (!inSight(found))
        found.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
      return;
    }
    const after = step + direction.current;
    if (after >= 0 && after < stepsNow.current.length) setStep(after);
    else setOpenNow.current(false);
  }, [open, step, reduced]);

  // The card glides from where it was to its next place. Base UI places it a moment after the
  // step changes, so the glide starts as it does, before the new place is ever drawn.
  useEffect(() => {
    if (!positioner || !card) return;
    const observer = new MutationObserver(() => {
      const from = glideFrom.current;
      if (!from || performance.now() > from.until) return;
      flip.current?.cancel();
      const box = card.getBoundingClientRect();
      const x = from.box.left - box.left;
      const y = from.box.top - box.top;
      if (Math.abs(x) + Math.abs(y) < 1) return;
      flip.current = card.animate([{ translate: `${x}px ${y}px` }, { translate: "0px 0px" }], {
        duration: glideEasing.duration,
        easing: glideEasing.easing,
      });
    });
    observer.observe(positioner, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [positioner, card]);

  // Screen readers hear each step after the first as it comes. The first step is the card's own
  // name.
  const steppedTo = useRef(-1);
  useEffect(() => {
    if (!open || !card) return;
    if (steppedTo.current === -1 || steppedTo.current === step) {
      steppedTo.current = step;
      return;
    }
    steppedTo.current = step;
    const words = [
      ...card.querySelectorAll(".x-govuk-ui-callout-title, .x-govuk-ui-callout-description"),
    ]
      .map((part) => (part as HTMLElement).innerText)
      .join(". ");
    setHeard(`${stepLabel(step + 1, steps.length)}. ${words}`);
  }, [open, card, step, steps.length, stepLabel]);
  useEffect(() => {
    if (!open) steppedTo.current = -1;
  }, [open]);

  const go = async (index: number) => {
    if (moving || index < 0 || index >= steps.length) return;
    direction.current = index > step ? 1 : -1;
    const wanted = steps[index]?.target;
    const coming = wanted === undefined ? null : resolveAnchor(wanted);
    // For a step out of sight, the card fades while the page scrolls to it, then appears there.
    if (coming && !inSight(coming)) {
      setMoving(true);
      coming.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
      await settled(coming);
      glideFrom.current = null;
    } else if (card && !reduced) {
      glideFrom.current = { box: card.getBoundingClientRect(), until: performance.now() + 300 };
    }
    setStep(index);
    setMoving(false);
    setProgress({ step: index, ended: null });
    // There is no Back at the first step, so focus moves on to Next.
    requestAnimationFrame(() => {
      if (!card?.contains(document.activeElement)) next.current?.focus();
    });
  };
  const end = (how: "finished" | "closed") => {
    const ended = how === "closed" && closing === "pauses" ? null : how;
    setProgress({ step, ended });
    setOpen(false);
    if (how === "finished") onFinish?.();
  };
  // When the card has focus, Base UI sees a press outside as focus leaving the card. Presses
  // outside are therefore noted here, to tell them apart from focus moving on with the keyboard.
  const pressedOutside = useRef(0);
  useEffect(() => {
    if (!open || !closeOnPressOutside) return;
    const note = (event: PointerEvent) => {
      if (event.target instanceof Node && card?.contains(event.target)) return;
      pressedOutside.current = performance.now();
    };
    document.addEventListener("pointerdown", note, true);
    return () => document.removeEventListener("pointerdown", note, true);
  }, [open, closeOnPressOutside, card]);

  // A step about the whole page sits with its middle on the middle of the screen. Dimming leaves
  // its space around the target, and the card sits beyond that.
  let sideOffset: Primitive.Positioner.Props["sideOffset"] = dim ? 12 + dimPadding : 12;
  if (centred) sideOffset = ({ positioner: box }) => -box.height / 2;

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return;
    if (event.key === "ArrowRight" && !last) go(step + 1);
    else if (event.key === "ArrowLeft") go(step - 1);
    else return;
    event.preventDefault();
  };

  return (
    <>
      {dim && (
        <Spotlight
          target={open ? (centred ? middle : element) : null}
          open={open}
          reduced={reduced}
          padding={dimPadding}
        />
      )}
      <Primitive.Root
        open={open && target !== null}
        onOpenChange={(opening, details) => {
          // The tour stays while people use the page, unless it closes on a press outside.
          if (opening) return;
          const pressed =
            details.reason === "outside-press" ||
            (details.reason === "focus-out" && performance.now() - pressedOutside.current < 500);
          if (details.reason === "focus-out" && !pressed) return;
          if (pressed && !closeOnPressOutside) return;
          sound(opening, details.reason);
          end("closed");
        }}
      >
        <Primitive.Portal>
          <Primitive.Positioner
            ref={setPositioner}
            className="x-govuk-ui-floating-positioner"
            anchor={centred ? middle : element}
            side={side}
            align={centred ? "center" : (current?.align ?? "center")}
            sideOffset={sideOffset}
            collisionPadding={8}
            collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "end" }}
          >
            <Primitive.Popup
              {...props}
              ref={cardRef}
              className={`x-govuk-ui-floating x-govuk-ui-callout x-govuk-ui-tour ${className} ${current?.className ?? ""}`.trim()}
              data-variant={variant}
              data-centred={centred || undefined}
              initialFocus={next}
              finalFocus={returnTo}
              data-moving={moving || undefined}
              onKeyDown={keys}
            >
              {!centred && (
                <Primitive.Arrow className="x-govuk-ui-floating-arrow">
                  <ArrowShape />
                </Primitive.Arrow>
              )}
              {/* Each step's words fade in as it comes. */}
              <div key={step} className="x-govuk-ui-tour-step">
                <Primitive.Title className="x-govuk-ui-callout-title">
                  {current?.title}
                </Primitive.Title>
                {current?.children && (
                  <Primitive.Description
                    className="x-govuk-ui-callout-description"
                    render={<div />}
                  >
                    {current.children}
                  </Primitive.Description>
                )}
              </div>
              <div className="x-govuk-ui-tour-foot">
                <span className="x-govuk-ui-tour-count">
                  <span className="x-govuk-ui-tour-dots" aria-hidden="true">
                    {steps.map((_, index) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: a dot is only a place.
                        key={index}
                        data-current={index === step || undefined}
                        data-done={index < step || undefined}
                      />
                    ))}
                  </span>
                  {stepLabel(step + 1, steps.length)}
                </span>
                {step > 0 && (
                  <Button variant="quiet" size="small" onClick={() => go(step - 1)}>
                    {backLabel}
                  </Button>
                )}
                <Button
                  ref={next}
                  size="small"
                  data-sound={last ? "success" : undefined}
                  onClick={() => (last ? end("finished") : go(step + 1))}
                >
                  {last ? doneLabel : nextLabel}
                </Button>
              </div>
              {closeButton && (
                <Primitive.Close
                  render={
                    <CloseIconButton label={closeLabel} className="x-govuk-ui-callout-close" />
                  }
                />
              )}
              <span className="x-govuk-ui-visually-hidden" aria-live="polite">
                {heard}
              </span>
            </Primitive.Popup>
          </Primitive.Positioner>
        </Primitive.Portal>
      </Primitive.Root>
    </>
  );
}

/**
 * The dimming over the page, with a rounded gap around the step's target. The gap follows its
 * target as the page scrolls, and glides to the next one, along the same curve as the card. For a
 * step about the whole page, the gap closes to nothing in the middle of the screen. It is one
 * element whose shadow is the dimming, so the page beneath stays usable.
 */
function Spotlight({
  target,
  open,
  reduced,
  padding,
}: {
  target: Boxed | null;
  open: boolean;
  reduced: boolean;
  padding: number;
}) {
  const spot = useRef<HTMLDivElement>(null);
  const [present, setPresent] = useState(open);
  const shown = useRef<Rect | null>(null);
  const glide = useRef<{ from: Rect; start: number } | null>(null);
  const lastTarget = useRef<Boxed | null>(null);

  // It fades out as the tour closes, then goes.
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const timer = setTimeout(() => {
      setPresent(false);
      shown.current = null;
      lastTarget.current = null;
    }, 220);
    return () => clearTimeout(timer);
  }, [open]);

  useLayoutEffect(() => {
    if (!present || !target) return;
    // A new target is glided to from wherever the gap is.
    if (lastTarget.current && lastTarget.current !== target && shown.current && !reduced)
      glide.current = { from: shown.current, start: performance.now() };
    lastTarget.current = target;
    let frame = 0;
    let still = 0;
    // The gap is placed from its target whenever anything on the page moves, and written only when
    // it has moved. It is not placed every frame. It is placed each frame only while something
    // moves, such as the glide to a new target, a scroll, a resize, a transition or any change to
    // the page. Once nothing has moved for three frames, it rests, so an open tour leaves the main
    // thread idle. Placing returns whether the gap moved.
    const place = () => {
      const element = spot.current;
      if (!element) return false;
      const box = target.getBoundingClientRect();
      const room = box.width || box.height ? padding : 0;
      let rect: Rect = {
        x: box.left - room,
        y: box.top - room,
        width: box.width + 2 * room,
        height: box.height + 2 * room,
      };
      const moving = glide.current;
      if (moving) {
        const share = (performance.now() - moving.start) / glideEasing.duration;
        if (share >= 1) glide.current = null;
        else {
          const along = glideEasing.at(share);
          const between = (from: number, to: number) => from + (to - from) * along;
          rect = {
            x: between(moving.from.x, rect.x),
            y: between(moving.from.y, rect.y),
            width: between(moving.from.width, rect.width),
            height: between(moving.from.height, rect.height),
          };
        }
      }
      const was = shown.current;
      const moved =
        !was ||
        Math.abs(was.x - rect.x) + Math.abs(was.y - rect.y) > 0.1 ||
        Math.abs(was.width - rect.width) + Math.abs(was.height - rect.height) > 0.1;
      if (moved) {
        element.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
        element.style.width = `${rect.width}px`;
        element.style.height = `${rect.height}px`;
      }
      shown.current = rect;
      return moved;
    };
    const tick = () => {
      still = place() || glide.current ? 0 : still + 1;
      frame = still < 3 ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      still = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    // Scroll and transition events do not bubble, so they are caught on the way down.
    const events = [
      "scroll",
      "resize",
      "transitionrun",
      "transitionend",
      "animationstart",
      "animationend",
    ];
    for (const name of events)
      window.addEventListener(name, wake, { capture: true, passive: true });
    // Anything else that moves the target changes the page somewhere, such as a row added above
    // it, a style set by a script, or a panel opening. The gap's own writes are ignored.
    const changes = new MutationObserver((records) => {
      if (records.some((record) => record.target !== spot.current)) wake();
    });
    changes.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "open", "aria-expanded", "data-state"],
    });
    wake();
    return () => {
      cancelAnimationFrame(frame);
      changes.disconnect();
      for (const name of events) window.removeEventListener(name, wake, { capture: true });
    };
  }, [present, target, reduced, padding]);

  if (!present) return null;
  return createPortal(
    <div
      ref={spot}
      className="x-govuk-ui-tour-spotlight"
      data-closing={!open || undefined}
      aria-hidden="true"
    />,
    document.body,
  );
}
