"use client";

import {
  AnimatePresence,
  type AnimationPlaybackControls,
  animate,
  type HTMLMotionProps,
  motion,
} from "motion/react";
import {
  Children,
  type ComponentPropsWithRef,
  cloneElement,
  isValidElement,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { duration, easeOut, useMotionTiming } from "./motion";
import { ScrollArea } from "./scroll-area";

/** Moves a Message scroller from outside it, such as from search results or a list of turns. */
export type MessageScrollerHandle = {
  /**
   * Brings a message into view by its `id`, and marks it for a moment. Returns false if it is not
   * there.
   */
  scrollToMessage: (id: string) => boolean;
  /** Goes to the newest message and follows the log again. */
  scrollToEnd: () => void;
  /** Goes to the first message. */
  scrollToStart: () => void;
};

export type MessageScrollerProps = Omit<ComponentPropsWithRef<"div">, "ref"> & {
  /** The messages, each in a `MessageScrollerItem`. */
  children: ReactNode;
  /** Names the log for screen readers. It is not shown. */
  label?: string;
  /** Follows the newest message while the reader is at the end of the log. */
  autoScroll?: boolean;
  /** How much of the turn before stays in view above a new turn, in pixels. */
  peek?: number;
  /**
   * Where the log opens. `end` opens at the newest message, and `start` at the first.
   * `last-anchor` shows the last turn from its start, with the reply below it. If the whole turn
   * fits, the log opens at the end instead.
   */
  defaultPosition?: "start" | "end" | "last-anchor";
  /**
   * Floats over the foot of the log, such as a Chat input. The log scrolls beneath it and keeps its
   * newest message clear of it.
   */
  footer?: ReactNode;
  /** Draws the log in a rounded box. Without it, the log fills its space unframed. */
  framed?: boolean;
  /** Set while a reply streams, so screen readers wait for it to finish before reading it. */
  busy?: boolean;
  /**
   * What shows while there are no messages, such as what the service can do or how a tool
   * starts, in the middle of the space above the footer. It is not part of the log, and fades
   * away as the first message arrives.
   */
  empty?: ReactNode;
  ref?: Ref<MessageScrollerHandle>;
};

const NEAR = 32;
const atEnd = (scroller: HTMLElement) =>
  scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR;

/**
 * A scrolling log of messages, like shadcn's Message scroller, that never moves the reader against
 * their will. At the end of the log, it follows new messages and streamed text. When the reader
 * scrolls away, it stays put, and a button rises to go back, with a dot once more messages arrive.
 * A new turn, such as the person's question, rises to near the top, with a peek of the turn
 * before. Its reply streams into the space below. Earlier messages loaded above keep the reader
 * where they were.
 *
 * A Conversation is a Message scroller laid out as a chat. Mark each row with
 * `MessageScrollerItem`, and give it a stable `id`. Rows that start a turn are `anchor`s.
 */
export function MessageScroller({
  children,
  label = "Messages",
  autoScroll = true,
  peek = 64,
  defaultPosition = "end",
  footer,
  framed = true,
  busy,
  empty,
  ref,
  className = "",
  ...props
}: MessageScrollerProps) {
  const noMessages = Children.toArray(children).length === 0;
  const root = useRef<HTMLDivElement>(null);
  const footerBox = useRef<HTMLDivElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const rows = useRef<HTMLDivElement>(null);
  const spacer = useRef<HTMLDivElement>(null);
  const timing = useMotionTiming();
  // Whether the log follows its newest message. Only the reader's own scrolling changes it.
  const pinned = useRef(true);
  const readerScrolled = useRef(-Infinity);
  const steering = useRef<AnimationPlaybackControls | null>(null);
  // The anchor of the newest turn started while the log is open, which the spacer makes room for.
  const turn = useRef<HTMLElement | null>(null);
  const anchors = useRef<Set<string> | null>(null);
  // Where each row started at the last change, to keep the reader's row still through the next.
  const tops = useRef(new Map<string, number>());
  const height = useRef(0);
  // Rows grow as the fonts arrive. Only growth after that counts as new content.
  const settled = useRef(false);
  const settings = useRef({ autoScroll, peek });
  settings.current = { autoScroll, peek };
  const [away, setAway] = useState(false);
  const [unseen, setUnseen] = useState(false);

  const readerScrolls = () => {
    readerScrolled.current = performance.now();
    steering.current?.stop();
    steering.current = null;
  };
  /** Where the rows start, in the log's scroll. */
  const contentTop = () => {
    const scroller = log.current!;
    return (
      content.current!.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop
    );
  };
  /** Where a row starts, in the log's scroll, ignoring any transform it is moving with. */
  const topOf = (row: HTMLElement) => contentTop() + row.offsetTop;
  /**
   * Lets the log scroll far enough for the newest turn's anchor to rise to near the top, with the
   * turn before peeking above it. A marker set that far down, out of the flow, stretches the scroll
   * without changing the size of anything. The reply then fills the space below as it streams, and
   * the log stays still. The extra space is no longer needed once the reply is longer than the log.
   */
  const fit = () => {
    const scroller = log.current;
    const gap = spacer.current;
    if (!scroller || !gap) return;
    const anchor = turn.current;
    const reach = anchor?.isConnected
      ? Math.round(anchor.offsetTop - settings.current.peek + scroller.clientHeight - 1)
      : 0;
    const next = `${Math.max(0, reach)}px`;
    if (gap.style.top !== next) gap.style.top = next;
  };
  /** Glides the log to a place, or jumps there with reduced motion. */
  const steer = (top: number, then?: () => void) => {
    const scroller = log.current;
    if (!scroller) return;
    steering.current?.stop();
    const end = Math.max(0, Math.min(top, scroller.scrollHeight - scroller.clientHeight));
    if (timing.reduced || Math.abs(end - scroller.scrollTop) < 1) {
      scroller.scrollTop = end;
      steering.current = null;
      then?.();
      return;
    }
    steering.current = animate(scroller.scrollTop, end, {
      duration: duration.slow + 0.1,
      ease: easeOut,
      onUpdate: (value) => {
        scroller.scrollTop = value;
      },
      onComplete: () => {
        steering.current = null;
        then?.();
      },
    });
  };
  const toEnd = () => {
    const scroller = log.current;
    if (!scroller) return;
    pinned.current = true;
    setAway(false);
    setUnseen(false);
    steer(scroller.scrollHeight);
  };

  useImperativeHandle(ref, () => ({
    scrollToMessage: (id) => {
      const row = content.current?.querySelector<HTMLElement>(
        `[data-message-id="${CSS.escape(id)}"]`,
      );
      if (!row) return false;
      pinned.current = false;
      steer(topOf(row) - 16);
      // The row glows in the focus colour for a moment, so the eye finds it.
      row.removeAttribute("data-found");
      void row.offsetWidth;
      row.setAttribute("data-found", "");
      return true;
    },
    scrollToEnd: toEnd,
    scrollToStart: () => {
      pinned.current = false;
      steer(0);
    },
  }));

  // The log opens where it is asked to, before it is first painted.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Only where the log first opens.
  useLayoutEffect(() => {
    const scroller = log.current;
    const box = content.current;
    if (!scroller || !box) return;
    // The space for the footer is made first, so the end of the log is where it will stay.
    root.current?.style.setProperty(
      "--x-govuk-ui-message-scroller-footer",
      `${footerBox.current?.offsetHeight ?? 0}px`,
    );
    const rows = [...box.querySelectorAll<HTMLElement>("[data-anchor]")];
    anchors.current = new Set(rows.map((row) => row.dataset.messageId ?? ""));
    const last = rows.at(-1);
    if (defaultPosition === "start") scroller.scrollTop = 0;
    else if (
      defaultPosition === "last-anchor" &&
      last &&
      scroller.scrollHeight - topOf(last) + peek > scroller.clientHeight
    )
      scroller.scrollTop = topOf(last) - peek;
    else scroller.scrollTop = scroller.scrollHeight;
    pinned.current = atEnd(scroller);
    setAway(!pinned.current);
    height.current = scroller.scrollHeight;
  }, []);

  // After each change of rows, rows added or grown above keep the reader's row where it was, and a
  // new turn rises to near the top.
  useLayoutEffect(() => {
    const scroller = log.current;
    const box = content.current;
    if (!scroller || !box) return;
    const rows = [...box.querySelectorAll<HTMLElement>("[data-message-id]")];
    const was = tops.current;
    // At the end of a log that follows, the end is the reader's place, and the log keeps to it.
    const following = pinned.current && settings.current.autoScroll;
    if (was.size && !steering.current && !following) {
      // The row at the top of the view before the change, by where the rows were then.
      const view = scroller.scrollTop - contentTop();
      let held: HTMLElement | undefined;
      let heldTop = -Infinity;
      for (const row of rows) {
        const top = was.get(row.dataset.messageId ?? "");
        if (top !== undefined && top <= view + 1 && top > heldTop) {
          held = row;
          heldTop = top;
        }
      }
      const moved = held ? held.offsetTop - heldTop : 0;
      if (Math.abs(moved) > 0.5) {
        scroller.scrollTop += moved;
        height.current = scroller.scrollHeight;
      }
    }
    tops.current = new Map(rows.map((row) => [row.dataset.messageId ?? "", row.offsetTop]));

    const known = anchors.current;
    if (!known) return;
    const all = [...box.querySelectorAll<HTMLElement>("[data-anchor]")];
    const fresh = all.filter((row) => !known.has(row.dataset.messageId ?? ""));
    for (const row of fresh) known.add(row.dataset.messageId ?? "");
    // Only a new anchor after every other one starts a turn. An anchor loaded above does not.
    const newest = all.at(-1);
    if (!newest || !fresh.includes(newest)) return;
    turn.current = newest;
    fit();
    pinned.current = true;
    setAway(false);
    setUnseen(false);
    steer(topOf(newest) - settings.current.peek);
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: The observer reads the latest settings through refs.
  useEffect(() => {
    const element = rows.current;
    const scroller = log.current;
    if (!element || !scroller) return;
    // Rows open and grow, and words stream into them. At the end of the log, the log follows in the
    // same frame, before anything is painted, so the text never jumps. Away from the end, the log
    // stays where it is, and a dot says more has arrived.
    let live = true;
    document.fonts?.ready.then(() =>
      requestAnimationFrame(() => {
        if (live) settled.current = true;
      }),
    );
    const observer = new ResizeObserver(() => {
      fit();
      const grew = scroller.scrollHeight > height.current + 1;
      height.current = scroller.scrollHeight;
      if (steering.current) return;
      if (pinned.current && settings.current.autoScroll) scroller.scrollTop = scroller.scrollHeight;
      else if (grew && settled.current && !atEnd(scroller)) setUnseen(true);
    });
    observer.observe(element);
    observer.observe(scroller);
    // The log leaves space beneath its rows for the footer floating over them. The footer is
    // observed on its own, because the space it makes resizes the rows' container. That space is
    // set in the next frame, and only when it changes. Set within the observer, it would resize the
    // footer's container while the browser is still reporting resizes, which it treats as a loop.
    let room = -1;
    let roomFrame = 0;
    const footer = new ResizeObserver(() => {
      cancelAnimationFrame(roomFrame);
      roomFrame = requestAnimationFrame(() => {
        const next = footerBox.current?.offsetHeight ?? 0;
        if (next === room) return;
        room = next;
        root.current?.style.setProperty("--x-govuk-ui-message-scroller-footer", `${room}px`);
        // A taller footer, such as a composer growing a line, keeps the newest message clear of it.
        if (pinned.current && settings.current.autoScroll && !steering.current)
          scroller.scrollTop = scroller.scrollHeight;
      });
    });
    if (footerBox.current) footer.observe(footerBox.current);
    // Only the reader's own scrolling decides whether the log follows. Rows opening and closing can
    // move the scroll position too, and must never stop the log following.
    const scrolled = () => {
      const end = atEnd(scroller);
      if (performance.now() - readerScrolled.current < 800) pinned.current = end;
      else if (end) pinned.current = true;
      setAway(!end && !pinned.current);
      if (end) setUnseen(false);
    };
    scroller.addEventListener("scroll", scrolled, { passive: true });
    return () => {
      live = false;
      observer.disconnect();
      footer.disconnect();
      cancelAnimationFrame(roomFrame);
      scroller.removeEventListener("scroll", scrolled);
      steering.current?.stop();
    };
  }, []);

  return (
    <div
      {...props}
      ref={root}
      className={`x-govuk-ui-message-scroller ${className}`.trim()}
      data-framed={framed || undefined}
    >
      {/* The log scrolls in a Scroll area. The log itself takes focus, so the arrow keys scroll it,
        and the Scroll area adds no second stop. */}
      <ScrollArea
        viewportRef={log}
        className="x-govuk-ui-message-scroller-scroll"
        fade
        onWheel={readerScrolls}
        onTouchMove={readerScrolls}
        onPointerDown={readerScrolls}
        onKeyDown={readerScrolls}
      >
        <div
          ref={content}
          className="x-govuk-ui-message-scroller-content"
          role="log"
          aria-label={label}
          aria-relevant="additions text"
          aria-busy={busy || undefined}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The log must be keyboard-scrollable.
          tabIndex={0}
        >
          <div ref={rows} className="x-govuk-ui-message-scroller-rows">
            <AnimatePresence initial={false}>{keyed(children)}</AnimatePresence>
          </div>
          <div ref={spacer} className="x-govuk-ui-message-scroller-spacer" aria-hidden="true" />
        </div>
      </ScrollArea>
      {/* Beside the log, not in it, because it is not a message. It has a Scroll area of its own,
          because a tool's guide can be longer than the space. */}
      <AnimatePresence initial={false}>
        {noMessages && empty && (
          <motion.div
            key="empty"
            className="x-govuk-ui-message-scroller-empty"
            exit={{ opacity: 0 }}
            transition={timing.ease(duration.fast)}
          >
            <ScrollArea className="x-govuk-ui-message-scroller-empty-scroll" fade>
              <div className="x-govuk-ui-message-scroller-empty-content">{empty}</div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        className="x-govuk-ui-message-scroller-latest"
        data-shown={away || undefined}
        data-unseen={unseen || undefined}
        aria-label={unseen ? "Go to the new messages" : "Go to the latest message"}
        tabIndex={away ? 0 : -1}
        aria-hidden={!away || undefined}
        onClick={toEnd}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14m0 0-6-6m6 6 6-6" />
        </svg>
      </button>
      {footer && (
        <div ref={footerBox} className="x-govuk-ui-message-scroller-footer">
          {footer}
        </div>
      )}
    </div>
  );
}

/** Each row is known by its id, so rows that come and go never need a key of their own. */
function keyed(children: ReactNode) {
  return Children.toArray(children).map((child) =>
    isValidElement<{ id?: unknown }>(child) && typeof child.props.id === "string"
      ? cloneElement(child, { key: `row:${child.props.id}` })
      : child,
  );
}

// A row is a motion.div, so Motion types its props.
export type MessageScrollerItemProps = Omit<HTMLMotionProps<"div">, "id"> & {
  /** A stable id, so the log can keep the reader's place and jump to the row. */
  id: string;
  /** Starts a turn, such as the person's question. A new anchor rises to near the top. */
  anchor?: boolean;
  children: ReactNode;
};

/**
 * One row of a Message scroller, such as a message, a marker like a date, or a row of controls. A
 * row added at the end rises from the foot of the log as it fades in.
 */
export function MessageScrollerItem({
  id,
  anchor = false,
  children,
  className = "",
  ...props
}: MessageScrollerItemProps) {
  const timing = useMotionTiming();
  return (
    <motion.div
      {...props}
      className={`x-govuk-ui-message-scroller-item ${className}`.trim()}
      data-message-id={id}
      data-anchor={anchor || undefined}
      initial={timing.reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: timing.ease(duration.fast) }}
      transition={timing.ease(duration.slow)}
    >
      {children}
    </motion.div>
  );
}
