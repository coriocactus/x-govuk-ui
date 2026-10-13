"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef } from "react";
import { useLabels } from "./labels";

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
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<LinkLabels>;
};

/** The words Link writes, which a LabelsProvider or its `labels` can change. */
export type LinkLabels = {
  /** Follows a link that opens a new tab, as GOV.UK advises. */
  newTab: string;
};

export const defaultLinkLabels: LinkLabels = {
  newTab: "(opens in new tab)",
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
  labels: ownLabels,
  ...props
}: LinkProps) {
  const labels = useLabels("link", defaultLinkLabels, ownLabels);
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
      children: newTab ? (
        <>
          {children} {labels.newTab}
        </>
      ) : (
        children
      ),
    },
  });
}
