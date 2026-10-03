"use client";

import {
  type ComponentPropsWithRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMotionTiming } from "./motion";

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

  const visible = words.slice(0, shown);
  return (
    <span
      {...props}
      className={`x-govuk-ui-streaming-text ${className}`.trim()}
      data-complete={complete || undefined}
      data-instant={mountedInstant || undefined}
    >
      {stopped ? (
        <span className="x-govuk-ui-visually-hidden">{visible.join("")}</span>
      ) : (
        !streaming && <span className="x-govuk-ui-visually-hidden">{text}</span>
      )}
      <span aria-hidden="true">
        {visible.map((word, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: A word has only its place in the text.
          <span key={index} className="x-govuk-ui-streaming-word">
            {word}
          </span>
        ))}
        {!complete && <span className="x-govuk-ui-streaming-caret" />}
        {!stopped && shown < words.length && (
          <span className="x-govuk-ui-streaming-rest" data-copy="skip">
            {words.slice(shown).join("")}
          </span>
        )}
      </span>
    </span>
  );
}
