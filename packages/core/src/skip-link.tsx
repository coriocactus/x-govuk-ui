"use client";

import type { ComponentPropsWithRef } from "react";
import { chain } from "./events";
import { useLabels } from "./labels";

export type SkipLinkProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  /** The id of the main content, with its hash. */
  href?: string;
};

/** The words Skip link writes, which a LabelsProvider can change. */
export type SkipLinkLabels = {
  skip: string;
};

export const defaultSkipLinkLabels: SkipLinkLabels = {
  skip: "Skip to main content",
};

/**
 * The first link on a page, for keyboard users to go straight to the main content. It is hidden
 * until it has focus, then drops into view in GOV.UK's yellow. Following it moves focus to the
 * content, as GOV.UK's does, so the next Tab continues from there.
 */
export function SkipLink({
  href = "#main-content",
  children: ownChildren,
  className = "",
  onClick,
  ...props
}: SkipLinkProps) {
  const words = useLabels("skipLink", defaultSkipLinkLabels);
  const children = ownChildren ?? words.skip;
  return (
    <a
      {...props}
      href={href}
      className={`x-govuk-ui-skip-link ${className}`.trim()}
      onClick={chain(onClick, (event) => {
        const target = href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
        if (!target) return;
        event.preventDefault();
        // The content takes focus for as long as it has it, without becoming a Tab stop.
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
          target.addEventListener("blur", () => target.removeAttribute("tabindex"), {
            once: true,
          });
        }
        target.focus();
        target.scrollIntoView({ block: "start" });
      })}
    >
      {children}
    </a>
  );
}
