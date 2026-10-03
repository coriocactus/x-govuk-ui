"use client";

import { type ComponentPropsWithRef, useLayoutEffect, useState } from "react";
import { isOneCharacter, isOneGlyph } from "./glyph";
import { modifierKey } from "./shortcut";

export type KbdProps = ComponentPropsWithRef<"kbd"> & {
  /**
   * `subtle` caps sit quietly beside a label, as in a menu. `outline` caps have a keyline and a
   * bottom edge in the text colour, as outline Buttons do, for a shortcut that must stand out.
   */
  variant?: "subtle" | "outline";
  /**
   * A key held with this device's modifier, in place of children. "K" shows ⌘ K on Apple devices
   * and Ctrl K elsewhere. The device is detected once the page is in the browser.
   */
  shortcut?: string;
};

/**
 * A key or shortcut, such as ⌘ K. Separate keys with spaces to show each one as its own cap, or
 * give `shortcut` a key to show it with this device's modifier. A cap of one character is square.
 */
export function Kbd({
  variant = "subtle",
  shortcut,
  className = "",
  children,
  ...props
}: KbdProps) {
  // Read before the first paint, so the right modifier shows from the start.
  const [modifier, setModifier] = useState<string>();
  useLayoutEffect(() => {
    if (shortcut) setModifier(modifierKey());
  }, [shortcut]);
  let content = children;
  if (shortcut) content = modifier ? `${modifier} ${shortcut.toUpperCase()}` : "";
  // A shortcut of several keys shows each as its own cap.
  const keys = typeof content === "string" ? content.split(" ").filter(Boolean) : null;
  const caps = keys && keys.length > 1 ? keys : null;
  return (
    <kbd
      {...props}
      className={`x-govuk-ui-kbd ${className}`.trim()}
      data-variant={variant === "outline" ? "outline" : undefined}
      data-single={(!caps && isOneGlyph(content)) || undefined}
    >
      {caps
        ? caps.map((key, index) => (
            <kbd
              // biome-ignore lint/suspicious/noArrayIndexKey: Keys in a shortcut can repeat, so their position is their identity.
              key={index}
              className="x-govuk-ui-kbd-key"
              data-single={isOneCharacter(key) || undefined}
            >
              {key}
            </kbd>
          ))
        : content}
    </kbd>
  );
}
