"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef } from "react";

export type LinkProps = ComponentPropsWithRef<"a"> & {
  /**
   * `link` is GOV.UK's blue. `text` suits links among muted text, such as in a footer. `inverse`
   * suits links on a dark or brand-blue background.
   */
  colour?: "link" | "text" | "inverse";
  /** Leave it off only where the link is clearly a link without it, such as in navigation. */
  underline?: boolean;
  /** Shows that a link has been visited, in GOV.UK's purple. Turn it off for links in a service. */
  visited?: boolean;
  /** Opens the link in a new tab, and says so in the link, as GOV.UK advises. */
  newTab?: boolean;
  /** Renders a router's link in place of the anchor. */
  render?: useRender.RenderProp;
};

/**
 * GOV.UK's link. It is underlined, and the underline thickens under the pointer. It turns GOV.UK's
 * purple once visited, and has GOV.UK's yellow focus. A link that opens a new tab says so in its
 * text.
 */
export function Link({
  colour = "link",
  underline = true,
  visited = true,
  newTab = false,
  render,
  className = "",
  children,
  ...props
}: LinkProps) {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      className: `x-govuk-ui-link ${className}`.trim(),
      "data-colour": colour === "link" ? undefined : colour,
      "data-no-underline": underline ? undefined : "",
      "data-no-visited": visited ? undefined : "",
      ...(newTab ? { target: "_blank", rel: "noreferrer noopener" } : {}),
      children: newTab ? <>{children} (opens in new tab)</> : children,
    },
  });
}

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
