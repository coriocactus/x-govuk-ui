import type { ComponentPropsWithRef } from "react";
import { isOneGlyph } from "./glyph";

export type TagColour =
  | "grey"
  | "blue"
  | "teal"
  | "green"
  | "purple"
  | "magenta"
  | "red"
  | "orange"
  | "yellow";

export type TagProps = ComponentPropsWithRef<"strong"> & {
  /** GOV.UK's tag colours. Pick one per status and use it consistently across a service. */
  colour?: TagColour;
  /**
   * `outline` sets the text and a keyline in the colour, on the page's paper. Use it for a status
   * that must stand out on a tinted surface, or a quieter one beside solid tags.
   */
  variant?: "solid" | "outline";
};

/**
 * A short status, such as Completed or In progress, like GOV.UK's tag. When a status changes, the
 * tag eases from its old colour to its new one. A tag of one character, or of one `svg` icon with
 * any visually hidden text, is square.
 */
export function Tag({ colour = "blue", variant = "solid", className = "", ...props }: TagProps) {
  return (
    <strong
      {...props}
      className={`x-govuk-ui-tag ${className}`.trim()}
      data-colour={colour}
      data-variant={variant === "outline" ? "outline" : undefined}
      data-single={isOneGlyph(props.children) || undefined}
    />
  );
}
