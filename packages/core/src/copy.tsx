"use client";

import { type ComponentPropsWithRef, useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { Tooltip } from "./tooltip";

const copyIcon = "M8 8h12v12H8zM16 8V4H4v12h4";
const checkIcon = "m5 12 4 4L19 6";

export type CopyLabels = {
  /** Names the button, and shows in its tooltip. */
  label?: string;
  /** Replaces the label for a moment once the text is copied. */
  copiedLabel?: string;
  /** Replaces the label for a moment when the browser refuses to copy. */
  failedLabel?: string;
  /** Classes for the button. */
  className?: string;
};

/**
 * The text of an element as users see it, with its paragraphs. Text meant only for screen readers
 * is left out, as are parts marked `data-copy="skip"`, such as citations.
 * @internal
 */
export function readableText(element: HTMLElement | null) {
  if (!element) return "";
  const skipped = [
    ...element.querySelectorAll<HTMLElement>('.x-govuk-ui-visually-hidden, [data-copy="skip"]'),
  ];
  // They are hidden only while the text is read, so nothing is painted without them.
  const displays = skipped.map((part) => part.style.display);
  for (const part of skipped) part.style.display = "none";
  const text = element.innerText;
  skipped.forEach((part, index) => {
    part.style.display = displays[index] ?? "";
  });
  return text.trim();
}

/**
 * Puts text on the clipboard. Browsers offer the Clipboard API only in a secure context. On a plain
 * http address other than localhost, such as on an intranet or from a phone on the network, the
 * text is copied the older way. It is selected in a hidden field and copied with the browser's own
 * command. The field goes beside the button, inside any open dialog, so a dialog that keeps focus
 * within itself cannot take focus from the field before the copy. Focus goes back to the button
 * afterwards.
 */
async function writeText(text: string, from: HTMLElement) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.setAttribute("aria-hidden", "true");
  field.style.cssText = "position: fixed; inset: 0; opacity: 0; pointer-events: none;";
  (from.closest('[role="dialog"], dialog') ?? document.body).append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  from.focus({ preventScroll: true });
  if (!copied) throw new Error("The browser did not copy the text.");
}

/** @internal */
export type CopyButtonProps = Omit<ComponentPropsWithRef<"button">, "children"> &
  CopyLabels & {
    /** The text to copy, read at the press, so it is always current. */
    text: () => string;
  };

/**
 * An icon button that copies text, shared by the parts that copy. Its icon turns to a tick for a
 * moment once the text is copied. It copies on a page served over plain http too, where browsers
 * offer no Clipboard API.
 * @internal
 */
export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  failedLabel = "Could not copy",
  className = "",
  ...props
}: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const name = { idle: label, copied: copiedLabel, failed: failedLabel }[status];
  return (
    <Tooltip content={name}>
      <Button
        {...props}
        variant="quiet"
        size="small-icon"
        className={`x-govuk-ui-copy-button ${className}`.trim()}
        aria-label={name}
        data-sound="copy"
        onClick={async (event) => {
          let next: typeof status = "copied";
          try {
            await writeText(text(), event.currentTarget);
          } catch {
            next = "failed";
          }
          setStatus(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setStatus("idle"), 1600);
        }}
      >
        {/* Both icons share one spot and cross-fade, so nothing moves as the tick arrives. */}
        <span className="x-govuk-ui-copy-icons" data-copied={status === "copied" || undefined}>
          {[copyIcon, checkIcon].map((path) => (
            <svg
              key={path}
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
              <path d={path} />
            </svg>
          ))}
        </span>
      </Button>
    </Tooltip>
  );
}
