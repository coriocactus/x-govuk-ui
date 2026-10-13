"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef } from "react";

export type VisuallyHiddenProps = ComponentPropsWithRef<"span"> & {
  /** Another element for the words, such as a heading that only screen readers hear. */
  render?: useRender.RenderProp;
};

/**
 * Text for screen readers only, such as the rest of a link's name, or a heading that names a part
 * of the page the layout already makes clear. It stays in the page and is read in place, but takes
 * up no space.
 */
export function VisuallyHidden({ render, className = "", ...props }: VisuallyHiddenProps) {
  return useRender({
    defaultTagName: "span",
    render,
    props: { ...props, className: `x-govuk-ui-visually-hidden ${className}`.trim() },
  });
}
