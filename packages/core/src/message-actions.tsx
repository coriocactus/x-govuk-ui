"use client";

import { type ComponentPropsWithRef, type ReactNode, useState } from "react";
import { Button, type ButtonProps } from "./button";
import { CopyButton, type CopyButtonProps } from "./copy";
import { Tooltip } from "./tooltip";

export type MessageActionsProps = ComponentPropsWithRef<"div">;

/**
 * A row of tools for one message, such as `MessageCopy`, `MessageRating` and `MessageRetry`, or
 * any `MessageAction`. Conversation's `ConversationActions` is one.
 */
export function MessageActions({ className = "", ...props }: MessageActionsProps) {
  return <div {...props} className={`x-govuk-ui-message-tools ${className}`.trim()} />;
}

export type MessageActionProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
  /** Names the tool, for screen readers, and shows in its tooltip. */
  label: string;
  /** The tool's icon, about 16 pixels square. */
  icon: ReactNode;
};

/** One tool, as a quiet icon Button with its name in a Tooltip. */
export function MessageAction({ label, icon, className = "", ...props }: MessageActionProps) {
  return (
    <Tooltip content={label}>
      <Button
        {...props}
        variant="quiet"
        size="small-icon"
        aria-label={label}
        className={`x-govuk-ui-message-tool ${className}`.trim()}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

export type MessageCopyProps = Omit<CopyButtonProps, "text"> & {
  /** The message's text, or a function that reads it at the press. */
  text: string | (() => string);
};

/** Copies the message's text. The icon turns to a tick for a moment once it is copied. */
export function MessageCopy({ text, ...props }: MessageCopyProps) {
  return <CopyButton {...props} text={typeof text === "string" ? () => text : text} />;
}

const icon = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);
// A raised thumb. Turned over, it is the thumb down.
const thumb = (
  <path d="M7 11v9H4v-9zM7 11l4-7c1.6 0 2.6 1.3 2.2 2.8L12.6 10H18a2 2 0 0 1 2 2.3l-1.1 6A2 2 0 0 1 16.9 20H7" />
);

export type MessageRatingValue = "up" | "down";

export type MessageRatingProps = Omit<
  ComponentPropsWithRef<"span">,
  "defaultValue" | "onValueChange"
> & {
  /** The rating given. Leave it out to let the rating keep track. */
  value?: MessageRatingValue | null;
  defaultValue?: MessageRatingValue | null;
  onValueChange?: (value: MessageRatingValue | null) => void;
  upLabel?: string;
  downLabel?: string;
};

/**
 * A thumb up and a thumb down, for saying whether a reply helped. The chosen thumb fills and pops,
 * and pressing it again takes the rating back. Screen readers hear each as a pressed button.
 */
export function MessageRating({
  value,
  defaultValue = null,
  onValueChange,
  upLabel = "Helpful",
  downLabel = "Not helpful",
  className = "",
  ...props
}: MessageRatingProps) {
  const [own, setOwn] = useState(defaultValue);
  const rating = value === undefined ? own : value;
  const rate = (next: MessageRatingValue) => {
    const chosen = rating === next ? null : next;
    if (value === undefined) setOwn(chosen);
    onValueChange?.(chosen);
  };
  return (
    <span {...props} className={`x-govuk-ui-message-rating ${className}`.trim()}>
      <MessageAction
        label={upLabel}
        icon={icon(thumb)}
        aria-pressed={rating === "up"}
        className="x-govuk-ui-message-rate"
        onClick={() => rate("up")}
      />
      <MessageAction
        label={downLabel}
        icon={icon(<g transform="rotate(180 12 12)">{thumb}</g>)}
        aria-pressed={rating === "down"}
        className="x-govuk-ui-message-rate"
        onClick={() => rate("down")}
      />
    </span>
  );
}

export type MessageRetryProps = Omit<
  MessageActionProps,
  "label" | "icon" | "onClick" | "disabled"
> & {
  /** Asks for the reply again. */
  onRetry?: () => void;
  label?: string;
  disabled?: boolean;
  /**
   * Keeps the tool in its place but refuses a press, with the refusing sound and a shake, such as
   * for a reply too old to ask for again. Screen readers hear it as unavailable.
   */
  unavailable?: boolean;
};

/**
 * Asks for the reply again. Its arrow turns once round as it is pressed. An unavailable button
 * shakes instead.
 */
export function MessageRetry({
  onRetry,
  label = "Try again",
  disabled,
  unavailable = false,
  className = "",
  ...props
}: MessageRetryProps) {
  // Each press turns the arrow again, or shakes it. A new key restarts the animation from the
  // beginning.
  const [presses, setPresses] = useState(0);
  const refuse = () => setPresses((count) => count + 1);
  return (
    <MessageAction
      {...props}
      label={label}
      disabled={disabled}
      aria-disabled={unavailable || undefined}
      className={`x-govuk-ui-message-retry ${className}`.trim()}
      icon={
        <span
          key={presses}
          className="x-govuk-ui-message-retry-icon"
          data-turning={(!unavailable && presses > 0) || undefined}
          data-refused={(unavailable && presses > 0) || undefined}
        >
          {icon(<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" />)}
        </span>
      }
      // An unavailable button is never pressed, so its refusal responds to the pointer and keys.
      onPointerDown={unavailable ? refuse : undefined}
      onKeyDown={
        unavailable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") refuse();
            }
          : undefined
      }
      onClick={() => {
        setPresses((count) => count + 1);
        onRetry?.();
      }}
    />
  );
}

export type MessageSuggestionsProps = ComponentPropsWithRef<"ul"> & {
  /** Names the list for screen readers, such as "Suggested questions". */
  "aria-label"?: string;
  /** The suggestions, as `MessageSuggestion` parts. */
  children: ReactNode;
};

/**
 * Questions or replies the user might send next, as the latest reply's own offer of what to ask.
 * Put them after that reply, in its row of the log, so they sit on the replier's side. On the
 * user's side, they would read as messages already sent. Docked above the message box, they
 * would stay while the conversation moved past them, and take up its space. Leave them out while a
 * reply is on its way, and offer them again once it has arrived. Before anything is said, they can
 * sit in the empty log.
 */
export function MessageSuggestions({
  "aria-label": label = "Suggested questions",
  className = "",
  ...props
}: MessageSuggestionsProps) {
  return (
    <ul
      {...props}
      aria-label={label}
      className={`x-govuk-ui-message-suggestions ${className}`.trim()}
    />
  );
}

export type MessageSuggestionProps = Omit<ButtonProps, "variant" | "size">;

/**
 * One suggestion, as an outline Button with the usual corners, which sends its words when pressed.
 * A long suggestion wraps instead of being cut short.
 */
export function MessageSuggestion({ className = "", ...props }: MessageSuggestionProps) {
  return (
    <li className="x-govuk-ui-message-suggestion">
      <Button
        {...props}
        variant="outline"
        size="small"
        className={`x-govuk-ui-message-suggestion-button ${className}`.trim()}
      />
    </li>
  );
}
