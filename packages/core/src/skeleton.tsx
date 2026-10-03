import type { ComponentPropsWithRef, CSSProperties } from "react";

export type SkeletonProps = ComponentPropsWithRef<"span"> & {
  /** `text` is a few lines, the last one shorter. `block` is one shape, and `circle` is round. */
  variant?: "text" | "block" | "circle";
  /** For text, the number of lines. */
  lines?: number;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
};

/**
 * A grey shape where content will appear, so the page keeps its layout while it loads. One soft
 * light sweeps across every skeleton on the page together. Skeletons are hidden from screen
 * readers, so say what is loading in a status nearby, or mark the region busy.
 */
export function Skeleton({
  variant = "text",
  lines = 1,
  width,
  height,
  className = "",
  style,
  ...props
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      {...props}
      className={`x-govuk-ui-skeleton ${className}`.trim()}
      data-variant={variant}
      style={{ width, height, ...style }}
    >
      {variant === "text" &&
        Array.from({ length: Math.max(1, lines) }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Lines have positional identities and no state.
          <span key={index} className="x-govuk-ui-skeleton-line" />
        ))}
    </span>
  );
}
