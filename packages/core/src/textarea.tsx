"use client";

import { ScrollArea as Primitive } from "@base-ui/react/scroll-area";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CharacterCountNote, countWords } from "./character-count";
import { ErrorMessage, Field, Hint, Label, useField, useFormDefault } from "./field";
import { ScrollAreaBars } from "./scroll-area";

export type TextareaProps = ComponentPropsWithRef<"textarea"> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: string;
  /**
   * Which way people can drag its corner to resize it. It never gets shorter than `rows` lines,
   * narrower than about twelve characters, or wider than its container.
   */
  resize?: "both" | "vertical" | "horizontal" | "none";
  /**
   * Grows with its text, from `rows` lines, where the browser supports it. Elsewhere it keeps
   * `rows` lines and scrolls.
   */
  autoResize?: boolean;
  /**
   * Counts the characters, as GOV.UK's character count does, and says how many are left or how
   * many are over. People can go over the limit, so they can see what to cut.
   */
  characterLimit?: number;
  /** Counts words instead of characters. */
  wordLimit?: number;
  /**
   * The count shows once this share of the limit is used, from 0 to 1. By default, it always shows.
   */
  threshold?: number;
};

/**
 * A field for longer answers, such as a description of a problem. Its text scrolls with the
 * library's own thin scrollbar, as a Scroll area does. With a character or word limit, it is
 * GOV.UK's character count. A line beneath says how many are left, and turns red once there are too
 * many. Screen readers hear the count when typing pauses.
 */
export function Textarea({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  resize = "both",
  autoResize = false,
  rows = 5,
  id,
  className = "",
  style,
  onInput,
  onChange,
  tabIndex,
  characterLimit,
  wordLimit,
  threshold = 0,
  "aria-describedby": describedBy,
  ...props
}: TextareaProps) {
  const limit = wordLimit ?? characterLimit;
  const unit = wordLimit ? "word" : "character";
  const field = useField({
    id,
    name: props.name,
    hint,
    errorMessage,
    "aria-describedby": describedBy,
  });
  const infoId = `${field.id}-info`;
  // A Form can give the field an answer to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(props.name)?.[0];
  const startWith = props.value === undefined ? (props.defaultValue ?? saved) : undefined;
  const [typed, setTyped] = useState(String(props.value ?? startWith ?? ""));
  const text = props.value === undefined ? typed : String(props.value);
  const count = wordLimit ? countWords(text) : text.length;
  const left = limit ? limit - count : 0;
  const root = useRef<HTMLDivElement>(null);
  // The scrollbar is placed by the textarea's width, which changes when its corner is dragged.
  useLayoutEffect(() => {
    const container = root.current;
    const element = container?.querySelector("textarea");
    if (!container || !element) return;
    const observer = new ResizeObserver(() =>
      container.style.setProperty("--x-govuk-ui-textarea-width", `${element.offsetWidth}px`),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <Field invalid={field.invalid}>
      <Label htmlFor={field.id} visuallyHidden={hideLabel}>
        {label}
      </Label>
      <Hint id={field.hintId}>{hint}</Hint>
      <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
      {/* The textarea is the scrolling element itself, so it keeps native editing and
          resizing. The scrollbar follows its right edge when its corner is dragged. */}
      <Primitive.Root ref={root} className="x-govuk-ui-scroll-area x-govuk-ui-textarea-scroll">
        {/* biome-ignore lint/a11y/useValidAriaRole: Undefined removes Base UI's role rather than setting one. */}
        <Primitive.Viewport
          render={
            <textarea
              rows={rows}
              {...props}
              {...field.controlProps}
              aria-describedby={
                limit
                  ? [field.controlProps["aria-describedby"], infoId].filter(Boolean).join(" ")
                  : field.controlProps["aria-describedby"]
              }
              aria-invalid={field.controlProps["aria-invalid"] ?? props["aria-invalid"]}
              defaultValue={startWith}
              data-over-limit={(limit && left < 0) || undefined}
              onChange={(event) => {
                setTyped(event.target.value);
                onChange?.(event);
              }}
              data-auto-resize={autoResize || undefined}
              data-resize={resize}
              onInput={(event) => {
                onInput?.(event);
                // Typing can change the text's height without a scroll event, so the scrollbar is
                // sent one.
                event.currentTarget.dispatchEvent(new Event("scroll"));
              }}
            />
          }
          // A textarea is always a Tab stop and announces itself, unlike a scrolling box, so
          // Base UI's presentation role is removed.
          role={undefined}
          tabIndex={tabIndex ?? 0}
          className={`x-govuk-ui-input x-govuk-ui-textarea ${className}`.trim()}
          // It is never shorter than `rows` lines.
          style={
            {
              ...style,
              // Auto, not scroll, because Safari hides the corner's grip on a field that always
              // scrolls.
              overflowX: "hidden",
              overflowY: "auto",
              "--x-govuk-ui-textarea-rows": rows,
            } as CSSProperties
          }
        />
        <ScrollAreaBars vertical horizontal={false} />
      </Primitive.Root>
      {limit !== undefined && (
        <CharacterCountNote
          id={infoId}
          limit={limit}
          count={count}
          unit={unit}
          threshold={threshold}
        />
      )}
    </Field>
  );
}
