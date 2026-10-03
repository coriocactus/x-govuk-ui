"use client";

import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
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
import { Bubble, BubbleContent } from "./bubble";
import { type CopyLabels, readableText } from "./copy";
import { MessageActions, MessageCopy } from "./message-actions";
import { MessageScroller } from "./message-scroller";
import { duration, useMotionTiming } from "./motion";
import { useMergedRef } from "./refs";
import { TextShimmer } from "./text-shimmer";

/**
 * The status words that Conversation thinking takes turns with, unless it is given others. They are
 * plain, as a service's words are.
 */
export const defaultThinkingLabels = [
  "Thinking",
  "Working on a reply",
  "Considering your question",
  "Looking into it",
] as const;

/** Livelier words for Conversation thinking, for a service whose voice suits them. */
export const playfulThinkingLabels = [
  "Thinking",
  "Pondering",
  "Mulling it over",
  "Percolating",
  "Germinating",
  "Hatching",
  "Wandering",
  "Joining the dots",
  "Untangling",
  "Vibing",
] as const;

type Speaker = "user" | "assistant";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

const ConversationContext = createContext<{
  assistantName: string;
  headingLevel: HeadingLevel;
  /** Tells the conversation that a message has started or stopped streaming. */
  stream?: (id: string, streaming: boolean) => void;
}>({ assistantName: "Service assistant", headingLevel: 3 });
const MessageContext = createContext<{
  from: Speaker;
  content: RefObject<HTMLDivElement | null>;
  streaming: boolean;
} | null>(null);

function useMessage(part: string) {
  const context = useContext(MessageContext);
  if (!context) throw new Error(`${part} must be inside ConversationMessage.`);
  return context;
}

export type ConversationProps = ComponentPropsWithRef<"div"> & {
  children: ReactNode;
  /** Names the message log for screen readers. It is not shown. */
  label?: string;
  /**
   * Screen readers hear it before each reply and in the status while the assistant thinks.
   * It is not shown, because the layout already shows who spoke.
   */
  assistantName?: string;
  /**
   * Where people write, such as a Chat input. It floats over the foot of the log, which scrolls
   * beneath it and always keeps its newest message clear of it.
   */
  composer?: ReactNode;
  /**
   * What the empty log shows before anything is said, such as what the service can do, or how a
   * tool starts. With it, the composer waits at the foot of the log, beneath it, instead of in
   * the middle.
   */
  empty?: ReactNode;
  /**
   * The level of each message's heading, which only screen readers hear. Set it to fit the page's
   * outline, one level below the heading that names the conversation.
   */
  headingLevel?: HeadingLevel;
};

/**
 * A scrolling log of messages between a person and a service's assistant, with an optional
 * composer floating over its foot. It is a Message scroller laid out as a chat. It follows the
 * newest message while the reader is at the bottom. When the reader scrolls up, a button appears
 * to take them back, with a dot once more messages arrive. Before anything is said, the composer
 * waits in the middle of the empty log. It glides down to the foot as the first message arrives.
 *
 * Compose it from `ConversationMessage`, which contains `ConversationContent` and optional
 * `ConversationActions`. Add `ConversationThinking` while the assistant works on a reply. Give each
 * message a stable `key`.
 */
export function Conversation({
  children,
  label = "Conversation",
  assistantName = "Service assistant",
  composer,
  empty: start,
  headingLevel = 3,
  className = "",
  ref,
  ...props
}: ConversationProps) {
  const root = useRef<HTMLDivElement>(null);
  const empty = Children.toArray(children).length === 0;
  // The composer takes its place before the first frame, and only glides after that.
  const [placed, setPlaced] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPlaced(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  // The composer rises from the foot to the middle of the log. It rises by half the space it
  // leaves free, less the footer's padding beneath it.
  useLayoutEffect(() => {
    const element = root.current;
    const footer = element?.querySelector<HTMLElement>(".x-govuk-ui-message-scroller-footer");
    if (!element || !footer) return;
    const place = () => {
      const style = getComputedStyle(footer);
      const below = Number.parseFloat(style.paddingBottom);
      const composer = footer.clientHeight - Number.parseFloat(style.paddingTop) - below;
      const rise = `${Math.max(0, Math.round((element.clientHeight - composer) / 2 - below))}px`;
      // The property is written only when it changes, because this runs while the browser reports
      // resizes.
      if (element.style.getPropertyValue("--x-govuk-ui-conversation-rise") !== rise)
        element.style.setProperty("--x-govuk-ui-conversation-rise", rise);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);
  const mergedRef = useMergedRef(root, ref);
  // While any message streams, the log is busy, so screen readers wait for the reply.
  const streams = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  const stream = useCallback((id: string, streaming: boolean) => {
    if (streaming) streams.current.add(id);
    else streams.current.delete(id);
    setBusy(streams.current.size > 0);
  }, []);
  const shared = useMemo(
    () => ({ assistantName, headingLevel, stream }),
    [assistantName, headingLevel, stream],
  );
  return (
    <ConversationContext value={shared}>
      <div
        {...props}
        ref={mergedRef}
        className={`x-govuk-ui-conversation ${className}`.trim()}
        data-empty={empty || undefined}
        data-start={(empty && Boolean(start)) || undefined}
        data-placed={placed || undefined}
      >
        <MessageScroller
          label={label}
          footer={composer}
          framed={false}
          defaultPosition="end"
          busy={busy}
          empty={start}
        >
          {children}
        </MessageScroller>
      </div>
    </ConversationContext>
  );
}

/** New rows open space for themselves, so arrivals push the log up smoothly. */
function useArrival() {
  const timing = useMotionTiming();
  return {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: timing.ease(duration.slow),
  };
}

export type ConversationMessageProps = HTMLMotionProps<"div"> & {
  /** Who wrote the message. The person's messages sit in a bubble on the other side. */
  from: Speaker;
  children: ReactNode;
  /**
   * Set while a reply streams in as any content other than plain text, such as Markdown into a Rich
   * text. Screen readers hear that the reply is being written, then the whole reply once it is
   * done, instead of every change to it. Plain text streams through Streaming text, which does
   * this itself.
   */
  streaming?: boolean;
};

/** One message. It grows out from its speaker's side, and screen readers hear who wrote it. */
export function ConversationMessage({
  from,
  children,
  streaming = false,
  className = "",
  ...props
}: ConversationMessageProps) {
  const { assistantName, headingLevel, stream } = useContext(ConversationContext);
  const Heading = `h${headingLevel}` as const;
  const timing = useMotionTiming();
  const arrival = useArrival();
  const content = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!streaming || !stream) return;
    stream(id, true);
    return () => stream(id, false);
  }, [streaming, stream, id]);
  return (
    <MessageContext value={{ from, content, streaming }}>
      <motion.div
        {...props}
        className="x-govuk-ui-message-row"
        data-role={from}
        data-message=""
        data-sound-enter={from === "assistant" ? "notification" : undefined}
        {...arrival}
      >
        <motion.article
          className={`x-govuk-ui-message ${className}`.trim()}
          data-role={from}
          aria-busy={streaming || undefined}
          initial={{ scale: 0.86, x: from === "user" ? 14 : -14, filter: "blur(2px)" }}
          animate={{ scale: 1, x: 0, filter: "blur(0px)" }}
          transition={timing.ease(duration.slow)}
          style={{ transformOrigin: from === "user" ? "100% 100%" : "0% 100%" }}
        >
          {/* The layout shows who spoke, and screen readers hear the speaker's name. */}
          <Heading className="x-govuk-ui-visually-hidden">
            {from === "user" ? "You" : assistantName}
          </Heading>
          {streaming && (
            <span className="x-govuk-ui-visually-hidden" role="status">
              {assistantName} is writing a reply
            </span>
          )}
          {children}
        </motion.article>
      </motion.div>
    </MessageContext>
  );
}

/**
 * The message's text. It is plain for the assistant, and in a secondary Bubble for the person.
 * Pretext measures a bubble of plain text, so the bubble is as wide as its longest line, not as
 * wide as it may be. No ragged gap is then left beside its lines.
 *
 * While its message streams, screen readers do not hear the text. Once the message is done, the
 * text is drawn again, whole, and the log announces it. A log announces what is added to it, but
 * not text that only stops being hidden. Anything opened inside the text while it streamed, such
 * as a citation's card, therefore closes at that point.
 */
export function ConversationContent({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  const message = useMessage("ConversationContent");
  const classes = `x-govuk-ui-message-content ${className}`.trim();
  if (message.from === "user")
    return (
      <Bubble variant="secondary" align="end">
        <BubbleContent {...props} ref={message.content} className={classes} />
      </Bubble>
    );
  return (
    <div
      {...props}
      // A new element once streaming ends, so screen readers are given the whole reply at once.
      key={message.streaming ? "streaming" : "written"}
      ref={message.content}
      className={classes}
      aria-hidden={message.streaming || undefined}
    />
  );
}

/**
 * A quiet note in a message, in GOV.UK's muted text. It can say what a reply was given, or that
 * someone stopped the reply.
 */
export function ConversationNote({ className = "", ...props }: ComponentPropsWithRef<"p">) {
  useMessage("ConversationNote");
  return <p {...props} className={`x-govuk-ui-message-note ${className}`.trim()} />;
}

/**
 * Tools for one message, as a `MessageActions` row of parts such as `ConversationCopy`,
 * `MessageRating` and `MessageRetry`. They sit under the start of a reply, and under the end of the
 * person's bubble. The latest message always shows its tools, whoever wrote it, so a message just
 * sent shows them until the reply arrives. Earlier messages show their tools when the pointer is
 * over them or a tool has focus, and always on touch screens.
 */
export function ConversationActions({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  useMessage("ConversationActions");
  return <MessageActions {...props} className={`x-govuk-ui-message-actions ${className}`.trim()} />;
}

export type ConversationCopyProps = CopyLabels;

/** Copies the message's text. The icon turns to a tick for a moment once it is copied. */
export function ConversationCopy(labels: ConversationCopyProps) {
  const message = useMessage("ConversationCopy");
  return <MessageCopy {...labels} text={() => readableText(message.content.current)} />;
}

export type ConversationThinkingProps = HTMLMotionProps<"div"> & {
  /** Status words that take turns. Screen readers hear one plain status instead. */
  labels?: readonly string[];
};

/** Shows the assistant working on a reply, with one shimmering status word after another. */
export function ConversationThinking({
  labels = defaultThinkingLabels,
  className = "",
  ...props
}: ConversationThinkingProps) {
  const { assistantName } = useContext(ConversationContext);
  const arrival = useArrival();
  const timing = useMotionTiming();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (labels.length < 2) return;
    const timer = setInterval(
      // Jump to any other word, so the order never feels like a list being read out.
      () =>
        setIndex(
          (current) =>
            (current + 1 + Math.floor(Math.random() * (labels.length - 1))) % labels.length,
        ),
      1800,
    );
    return () => clearInterval(timer);
  }, [labels]);
  const word = labels[index % labels.length] ?? "Thinking";
  return (
    <motion.div
      {...props}
      className={`x-govuk-ui-message-row ${className}`.trim()}
      data-role="assistant"
      {...arrival}
    >
      <p className="x-govuk-ui-thinking" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={word}
            className="x-govuk-ui-thinking-word"
            initial={{ opacity: 0, y: 8, filter: "blur(3px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
            transition={timing.ease(duration.slow)}
          >
            <TextShimmer>{word}…</TextShimmer>
          </motion.span>
        </AnimatePresence>
      </p>
      <span className="x-govuk-ui-visually-hidden" role="status">
        {assistantName} is writing a reply
      </span>
    </motion.div>
  );
}
