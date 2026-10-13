"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef } from "react";
import { useLabels } from "./labels";

export type BackLinkProps = ComponentPropsWithRef<"a"> & {
  /** For dark backgrounds. */
  inverse?: boolean;
  /** Renders a router's link in place of the anchor, keeping the back link's look. */
  render?: useRender.RenderProp;
};

/** The words Back link writes, which a LabelsProvider can change. */
export type BackLinkLabels = {
  back: string;
};

export const defaultBackLinkLabels: BackLinkLabels = {
  back: "Back",
};

/**
 * Takes users back one page, at the top of a page in a journey. Its arrow leans back a little
 * under the pointer.
 */
export function BackLink({
  href = "#",
  inverse = false,
  render,
  children: ownChildren,
  className = "",
  ...props
}: BackLinkProps) {
  const words = useLabels("backLink", defaultBackLinkLabels);
  const children = ownChildren ?? words.back;
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
