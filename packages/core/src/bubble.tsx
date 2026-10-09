"use client";

import { Menu } from "@base-ui/react/menu";
import { useRender } from "@base-ui/react/use-render";
import { AnimatePresence, motion } from "motion/react";
import {
  Children,
  type ComponentPropsWithRef,
  type CSSProperties,
  createContext,
  isValidElement,
  type RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { duration, useMotionTiming } from "./motion";
import { useShrinkWrap } from "./shrink-wrap";
import { useScopeSound } from "./sound-scope";

export type BubbleVariant =
  | "default"
  | "secondary"
  | "muted"
  | "tinted"
  | "outline"
  | "ghost"
  | "destructive";

type Side = "start" | "end";

const BubbleContext = createContext<{
  variant: BubbleVariant;
  align: Side;
  root: RefObject<HTMLDivElement | null>;
  frame: RefObject<HTMLDivElement | null>;
  mounted: RefObject<boolean>;
} | null>(null);

function useBubble(part: string) {
  const context = useContext(BubbleContext);
  if (!context) throw new Error(`${part} must be inside Bubble.`);
  return context;
}

export type BubbleProps = ComponentPropsWithRef<"div"> & {
  /**
   * How the bubble looks.
   *
   * - `default` is a strong brand-blue bubble, usually for the user's own messages.
   * - `secondary` is the standard grey bubble, for the other side.
   * - `muted` is a quieter bubble, and `tinted` a light blue one.
   * - `outline` has an edge, for richer content.
   * - `ghost` has no frame at all.
   * - `destructive` is a red bubble, for something that failed.
   */
  variant?: BubbleVariant;
  /**
   * Which side of the conversation it sits on. Use the start for others, and the end for the
   * user.
   */
  align?: Side;
};

/**
 * A message in a bubble, like shadcn's Bubble. It is only the surface. Names, avatars and times go
 * around it, as in a Message scroller. A bubble is as wide as its longest line, up to 80% of its
 * row. A ghost bubble can take the whole row. Compose it from `BubbleContent`, and optionally
 * `BubbleReactions` and `BubbleReactionPicker`. Set consecutive bubbles from one sender in a
 * `BubbleGroup`.
 */
export function Bubble({
  variant = "default",
  align = "start",
  className = "",
  children,
  ...props
}: BubbleProps) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  return (
    <BubbleContext value={{ variant, align, root, frame, mounted }}>
      <div
        {...props}
        ref={root}
        className={`x-govuk-ui-bubble ${className}`.trim()}
        data-variant={variant}
        data-align={align}
      >
        <div ref={frame} className="x-govuk-ui-bubble-frame">
          {children}
        </div>
      </div>
    </BubbleContext>
  );
}

export type BubbleContentProps = useRender.ComponentProps<"div">;

/**
 * The bubble's text. Pretext measures plain text of several lines, so the bubble is as wide as its
 * longest line. CSS alone would leave a ragged gap beside the lines. With `render`, the text
 * becomes a link or a button, such as a suggested reply, with GOV.UK's focus and a press.
 */
export function BubbleContent({
  render,
  className = "",
  style,
  ref,
  ...props
}: BubbleContentProps) {
  const bubble = useBubble("BubbleContent");
  const content = useRef<HTMLElement>(null);
  const width = useShrinkWrap(content, bubble.variant !== "ghost", {
    container: () => bubble.root.current,
    share: 0.8,
  });
  return useRender({
    defaultTagName: "div",
    render,
    ref: ref ? [content, ref] : content,
    props: {
      ...props,
      className: `x-govuk-ui-bubble-content ${className}`.trim(),
      style: width === null ? style : { ...style, width },
    },
  });
}

export type BubbleReactionsProps = ComponentPropsWithRef<"div"> & {
  /** The edge of the bubble the reactions sit on, overlapping it. */
  side?: "top" | "bottom";
  /** Which end of that edge they sit at. */
  align?: Side;
};

/**
 * Reactions on a bubble, such as emoji or quick actions, overlapping its edge. They take no room
 * of their own, so leave space between rows for them. Reactions added while the bubble is showing
 * pop in, and those removed shrink away. A row of emoji reads best as one picture, so give
 * it `role="img"` and an `aria-label`, such as "Reactions: thumbs up". Buttons need labels of their
 * own.
 */
export function BubbleReactions({
  side = "bottom",
  align = "end",
  className = "",
  children,
  ...props
}: BubbleReactionsProps) {
  const bubble = useBubble("BubbleReactions");
  const timing = useMotionTiming();
  // Reactions present from the start appear without animation. Reactions added later pop in, with
  // a single overshoot. Reactions removed shrink away as the others close up.
  const [arrived] = useState(() => bubble.mounted.current);
  return (
    <div
      {...props}
      className={`x-govuk-ui-bubble-reactions ${className}`.trim()}
      data-side={side}
      data-align={align}
    >
      <AnimatePresence initial={arrived} mode="popLayout">
        {Children.toArray(children).map((child, place) => (
          <motion.span
            key={isValidElement(child) ? child.key : place}
            className="x-govuk-ui-bubble-reaction"
            layout={timing.reduced ? false : "position"}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={
              timing.reduced
                ? { duration: 0 }
                : { type: "spring", duration: duration.slow, bounce: 0.35 }
            }
          >
            {child}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export type BubbleReaction = {
  /** The reaction itself, such as an emoji. It is the reaction's value. */
  emoji: string;
  /** What screen readers hear for it, such as "thumbs up". */
  label: string;
};

export type BubbleReactionPickerProps = {
  /** The reactions to choose from, in order. */
  options: readonly BubbleReaction[];
  /** The reactions chosen, by their emoji. Leave it out to let the picker keep track. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Names the picker's button for keyboard and screen reader users. */
  label?: string;
  /** How long the bubble is held before the picker opens, in milliseconds. */
  hold?: number;
};

/**
 * Reactions to choose from, which open when the bubble is held, as a phone's messages do. The
 * bubble sinks a little while it is held. It then springs back as the picker rises above it, and
 * each reaction pops in after the one before. A right-click also opens the picker. Choosing a
 * reaction adds it, or removes it if it was already chosen, and the picker closes.
 *
 * Keyboard users reach the picker through a button after the bubble's text, which shows once it
 * has focus. The arrow keys move between reactions. Show the chosen reactions with
 * `BubbleReactions`.
 */
export function BubbleReactionPicker({
  options,
  value,
  defaultValue = [],
  onValueChange,
  label = "React to this message",
  hold = 300,
}: BubbleReactionPickerProps) {
  const bubble = useBubble("BubbleReactionPicker");
  const play = useScopeSound();
  const [open, setOpen] = useState(false);
  const [own, setOwn] = useState(defaultValue);
  const chosen = value ?? own;
  const choose = (next: string[]) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  // Holding the bubble opens the picker. Moving the pointer, such as to select text or to scroll,
  // cancels the hold. Once the picker opens, a held link or button does not follow its press.
  useEffect(() => {
    const frame = bubble.frame.current;
    if (!frame) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let start: { x: number; y: number } | null = null;
    let held = false;
    const onContent = (event: Event) =>
      event.target instanceof Element &&
      Boolean(event.target.closest(".x-govuk-ui-bubble-content"));
    const show = () => {
      frame.removeAttribute("data-holding");
      setOpen(true);
      play("open");
    };
    const letGo = () => {
      clearTimeout(timer);
      start = null;
      frame.removeAttribute("data-holding");
    };
    const down = (event: PointerEvent) => {
      held = false;
      if (event.button !== 0 || !onContent(event)) return;
      start = { x: event.clientX, y: event.clientY };
      frame.style.setProperty("--x-govuk-ui-bubble-hold", `${hold}ms`);
      frame.setAttribute("data-holding", "");
      timer = setTimeout(() => {
        held = true;
        start = null;
        show();
      }, hold);
    };
    const move = (event: PointerEvent) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) letGo();
    };
    const click = (event: MouseEvent) => {
      if (!held) return;
      held = false;
      event.preventDefault();
      event.stopPropagation();
    };
    const context = (event: MouseEvent) => {
      if (!onContent(event)) return;
      event.preventDefault();
      letGo();
      if (!held) show();
    };
    // While the bubble is held, its text is not selected, and a phone shows no menu of its own.
    const select = (event: Event) => {
      if (frame.hasAttribute("data-holding")) event.preventDefault();
    };
    frame.addEventListener("pointerdown", down);
    frame.addEventListener("pointermove", move);
    for (const type of ["pointerup", "pointercancel", "pointerleave"])
      frame.addEventListener(type, letGo);
    frame.addEventListener("click", click, true);
    frame.addEventListener("contextmenu", context);
    frame.addEventListener("selectstart", select);
    return () => {
      letGo();
      frame.removeEventListener("pointerdown", down);
      frame.removeEventListener("pointermove", move);
      for (const type of ["pointerup", "pointercancel", "pointerleave"])
        frame.removeEventListener(type, letGo);
      frame.removeEventListener("click", click, true);
      frame.removeEventListener("contextmenu", context);
      frame.removeEventListener("selectstart", select);
    };
  }, [bubble.frame, hold, play]);

  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false} orientation="horizontal">
      <Menu.Trigger className="x-govuk-ui-bubble-react" aria-label={label}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <circle cx="9" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M6.5 11.5c.6 1 1.5 1.5 2.5 1.5s1.9-.5 2.5-1.5M7 8h.01M11 8h.01"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M16 2v4M14 4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className="x-govuk-ui-floating-positioner"
          anchor={bubble.frame}
          side="top"
          align={bubble.align}
          sideOffset={8}
          collisionPadding={8}
        >
          <Menu.Popup className="x-govuk-ui-bubble-picker" aria-label={label}>
            {options.map((option, place) => (
              <Menu.CheckboxItem
                key={option.emoji}
                className="x-govuk-ui-bubble-picker-item"
                label={option.label}
                aria-label={option.label}
                checked={chosen.includes(option.emoji)}
                onCheckedChange={(on) =>
                  choose(
                    on
                      ? [...chosen, option.emoji]
                      : chosen.filter((emoji) => emoji !== option.emoji),
                  )
                }
                closeOnClick
                style={{ "--x-govuk-ui-pick": place } as CSSProperties}
              >
                <span aria-hidden="true">{option.emoji}</span>
              </Menu.CheckboxItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export type BubbleGroupProps = ComponentPropsWithRef<"div">;

/**
 * Consecutive bubbles from one sender, set close together. The corners between them tighten, so
 * the run reads as one turn. Set `align` on each Bubble, not on the group.
 */
export function BubbleGroup({ className = "", ...props }: BubbleGroupProps) {
  return <div {...props} className={`x-govuk-ui-bubble-group ${className}`.trim()} />;
}
