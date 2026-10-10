"use client";

import {
  type ComponentPropsWithRef,
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMotionTiming } from "./motion";

/** How many words make a run. */
const RUN = 50;

type RunProps = {
  /** The run's words, each with the spaces after it. */
  words: readonly string[];
  /** How many of the run's words show. */
  shown: number;
  /** Whether the caret follows the run's last shown word. */
  caret: boolean;
  /** Whether the words still to come take their space. */
  rest: boolean;
};

/**
 * A run of words. The words show a few at a time, and each step changes only the run that the
 * last shown word is in. The other runs are not rendered again, so a step costs the same however
 * long the text has grown. Rendering every word at every step would keep the main thread busy for
 * seconds while a long reply streams in.
 *
 * Each run is a span of its own, so a word is added among 50 siblings at most. Rules such as
 * `.x-govuk-ui-card > :last-child` depend on where an element sits among its siblings. Because of
 * them, Chromium works out the style of every sibling again when one is added. Among 1,500 words,
 * that takes most of each frame.
 * @internal
 */
const Run = memo(
  function Run({ words, shown, caret, rest }: RunProps) {
    return (
      <span>
        {words.slice(0, shown).map((word, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: A word has only its place in the text.
          <span key={index} className="x-govuk-ui-streaming-word">
            {word}
          </span>
        ))}
        {caret && <span className="x-govuk-ui-streaming-caret" />}
        {rest && shown < words.length && (
          <span className="x-govuk-ui-streaming-rest" data-copy="skip">
            {words.slice(shown).join("")}
          </span>
        )}
      </span>
    );
  },
  // A text that grows is split into words again, so a run's words are compared by value.
  (was, now) =>
    was.shown === now.shown &&
    was.caret === now.caret &&
    was.rest === now.rest &&
    was.words.length === now.words.length &&
    was.words.every((word, index) => word === now.words[index]),
);

export type StreamingTextProps = Omit<ComponentPropsWithRef<"span">, "onComplete"> & {
  /** The text so far. When it grows, as from a live stream, the new words join the end. */
  text: string;
  /**
   * Set while more text is still to come from a stream. Screen readers hear the text once it ends.
   */
  streaming?: boolean;
  /** Words a second. A stream that runs ahead is caught up within about a second. */
  speed?: number;
  /** Shows the whole text at once, such as for a message that arrived before the page opened. */
  instant?: boolean;
  /** Stops where it is, such as when someone stops a reply. Screen readers hear only what shows. */
  stopped?: boolean;
  /** Called once, when the last word is showing or the text is stopped. */
  onComplete?: () => void;
};

/**
 * Text that arrives a word at a time, as an assistant's reply does. Each word fades in, behind a
 * caret that pulses until the text is complete. The words still to come already take up their
 * space, unseen, so the text never grows as they arrive, and nothing beneath it moves. Screen
 * readers hear the whole text at once, not a word at a time, as soon as it is known. With reduced
 * motion, the whole text shows at once.
 */
export function StreamingText({
  text,
  streaming = false,
  speed = 30,
  instant = false,
  stopped = false,
  onComplete,
  className = "",
  ...props
}: StreamingTextProps) {
  const { reduced } = useMotionTiming();
  // Each word keeps the spaces after it, so paragraphs stay as they were written.
  const words = useMemo(() => text.match(/\s*\S+\s*/g) ?? [], [text]);
  const skip = instant || reduced;
  const [shown, setShown] = useState(skip ? words.length : 0);
  const [mountedInstant] = useState(skip);

  // A text that does not continue the last one starts again from its first word.
  const previous = useRef(text);
  useLayoutEffect(() => {
    if (!text.startsWith(previous.current)) setShown(skip ? words.length : 0);
    previous.current = text;
  }, [text, words.length, skip]);

  useEffect(() => {
    if (stopped) return;
    if (skip) {
      setShown(words.length);
      return;
    }
    if (shown >= words.length) return;
    const behind = words.length - shown;
    const timer = setTimeout(
      () => setShown((count) => count + Math.max(1, Math.ceil(behind / speed))),
      1000 / speed,
    );
    return () => clearTimeout(timer);
  }, [shown, words.length, speed, skip, stopped]);

  const complete = stopped || (!streaming && shown >= words.length);
  const done = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: It completes once, whatever the handler.
  useEffect(() => {
    if (complete && !done.current) {
      done.current = true;
      onComplete?.();
    }
  }, [complete]);

  // The caret follows the last shown word, or starts the first run. A text with no words yet has
  // one empty run, for the caret.
  const caretRun = shown > 0 ? Math.floor((shown - 1) / RUN) : 0;
  const runs = [];
  for (let start = 0; start < Math.max(words.length, 1); start += RUN) {
    const run = words.slice(start, start + RUN);
    runs.push(
      <Run
        key={start}
        words={run}
        shown={Math.min(Math.max(shown - start, 0), run.length)}
        caret={!complete && caretRun === start / RUN}
        rest={!stopped}
      />,
    );
  }
  return (
    <span
      {...props}
      className={`x-govuk-ui-streaming-text ${className}`.trim()}
      data-complete={complete || undefined}
      data-instant={mountedInstant || undefined}
    >
      {stopped ? (
        <span className="x-govuk-ui-visually-hidden">{words.slice(0, shown).join("")}</span>
      ) : (
        !streaming && <span className="x-govuk-ui-visually-hidden">{text}</span>
      )}
      <span aria-hidden="true">{runs}</span>
    </span>
  );
}
