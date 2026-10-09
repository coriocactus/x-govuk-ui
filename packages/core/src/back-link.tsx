"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef } from "react";

export type BackLinkProps = ComponentPropsWithRef<"a"> & {
  /** For dark backgrounds. */
  inverse?: boolean;
  /** Renders a router's link in place of the anchor, keeping the back link's look. */
  render?: useRender.RenderProp;
};

/**
 * Takes users back one page, at the top of a page in a journey. Its arrow leans back a little
 * under the pointer.
 */
export function BackLink({
  href = "#",
  inverse = false,
  render,
  children = "Back",
  className = "",
  ...props
}: BackLinkProps) {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      href,
      className: `x-govuk-ui-back-link ${className}`.trim(),
      "data-inverse": inverse || undefined,
      children: (
        <>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d="m10 3-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          {children}
        </>
      ),
    },
  });
}
