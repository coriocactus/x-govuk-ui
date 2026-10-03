import type { ComponentPropsWithRef } from "react";

export type TextShimmerProps = ComponentPropsWithRef<"span">;

/** Status text with light passing across it, for work that is under way, such as "Writing…". */
export function TextShimmer({ className = "", ...props }: TextShimmerProps) {
  return <span {...props} className={`x-govuk-ui-text-shimmer ${className}`.trim()} />;
}
