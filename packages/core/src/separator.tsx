"use client";

import { Separator as Primitive } from "@base-ui/react/separator";
import type { ComponentPropsWithRef } from "react";

export type SeparatorProps = ComponentPropsWithRef<"div"> & {
  /** `vertical` suits a row, such as the groups in a toolbar. */
  orientation?: "horizontal" | "vertical";
  /**
   * Space above and below a horizontal separator, as GOV.UK's section break sizes it, for a
   * separator in running text. By default, the box it sits in spaces it, as a Stack does. In a box
   * that spaces its parts, this space is added to the box's.
   */
  spacing?: "none" | "small" | "medium" | "large";
};

/** A line between sections of a page, or between groups in a row, such as a toolbar's tools. */
export function Separator({
  orientation = "horizontal",
  spacing = "none",
  className = "",
  ...props
}: SeparatorProps) {
  return (
    <Primitive
      {...props}
      orientation={orientation}
      className={`x-govuk-ui-separator ${className}`.trim()}
      data-spacing={orientation === "horizontal" ? spacing : undefined}
    />
  );
}
