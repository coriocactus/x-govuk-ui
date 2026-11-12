import type { ComponentPropsWithRef } from "react";

export type HeadingProps = ComponentPropsWithRef<"h1"> & {
  /** The heading's level, which is its element, from `h1` to `h6`. Give a page one `h1`. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  /**
   * GOV.UK's heading sizes. Left out, the size follows the level, as GOV.UK advises: large for
   * level 1, medium for level 2 and small below that. Set it where a page needs another, such as
   * extra-large on a page with little content.
   */
  size?: "small" | "medium" | "large" | "extra-large";
};

/** The size GOV.UK advises for each level. */
const sizes = { 1: "large", 2: "medium", 3: "small", 4: "small", 5: "small", 6: "small" } as const;

/**
 * A heading as GOV.UK sets one, for a page or a section of it. Prose styles the headings of
 * running content, at sizes of its own.
 *
 * It has no margin. The box it sits in spaces it, such as a Stack, a GridColumn or a Form. Inside
 * a Form, a large heading keeps GOV.UK's 30 pixels beneath it.
 */
export function Heading({
  level = 1,
  size = sizes[level],
  className = "",
  ...props
}: HeadingProps) {
  const Element = `h${level}` as const;
  return (
    <Element {...props} className={`x-govuk-ui-heading ${className}`.trim()} data-size={size} />
  );
}
