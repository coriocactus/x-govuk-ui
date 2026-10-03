"use client";

import type { ComponentPropsWithRef } from "react";

export type SkipLinkProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  /** The id of the main content, with its hash. */
  href?: string;
};

/**
 * The first link on a page, for keyboard users to go straight to the main content. It is hidden
 * until it has focus, then drops into view in GOV.UK's yellow. Following it moves focus to the
 * content, as GOV.UK's does, so the next Tab continues from there.
 */
export function SkipLink({
  href = "#main-content",
  children = "Skip to main content",
  className = "",
  onClick,
  ...props
}: SkipLinkProps) {
  return (
    <a
      {...props}
      href={href}
      className={`x-govuk-ui-skip-link ${className}`.trim()}
      onClick={(event) => {
        onClick?.(event);
        const target = href.startsWith("#") ? document.getElementById(href.slice(1)) : null;
        if (!target || event.defaultPrevented) return;
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
      }}
    >
      {children}
    </a>
  );
}
