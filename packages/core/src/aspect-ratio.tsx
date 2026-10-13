import type { ComponentPropsWithRef, CSSProperties } from "react";

export type AspectRatioProps = ComponentPropsWithRef<"div"> & {
  /** Width over height, such as 16 / 9. */
  ratio?: number;
};

/**
 * Keeps its content to a ratio, such as 16 by 9, at any width. An image or video inside fills it.
 */
export function AspectRatio({ ratio = 16 / 9, className = "", style, ...props }: AspectRatioProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-aspect-ratio ${className}`.trim()}
      style={{ aspectRatio: String(ratio), ...style } as CSSProperties}
    />
  );
}
