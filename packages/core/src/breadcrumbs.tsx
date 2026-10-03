"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { DropdownMenu, DropdownMenuTrigger, MenuContent } from "./menu";

export type BreadcrumbsProps = ComponentPropsWithRef<"nav"> & {
  /** What sits between the steps, which is a chevron, as in GOV.UK's, or a slash. */
  separator?: "chevron" | "slash";
  /** On small screens, shows only the first and last steps. */
  collapseOnMobile?: boolean;
  /** For dark backgrounds. */
  inverse?: boolean;
  children: ReactNode;
};

/**
 * Where a page sits in a service, as a trail of links from the top. The earlier steps are muted,
 * and the current page is in the text colour. Compose it from `BreadcrumbsItem` parts.
 * `BreadcrumbsEllipsis` stands in for the steps that a long trail leaves out. Each link plays a
 * note a step higher along the trail.
 */
export function Breadcrumbs({
  separator = "chevron",
  collapseOnMobile = false,
  inverse = false,
  "aria-label": label = "Breadcrumb",
  className = "",
  children,
  ...props
}: BreadcrumbsProps) {
  return (
    <nav
      {...props}
      aria-label={label}
      className={`x-govuk-ui-breadcrumbs ${className}`.trim()}
      data-separator={separator}
      data-collapse-on-mobile={collapseOnMobile || undefined}
      data-inverse={inverse || undefined}
    >
      <ol className="x-govuk-ui-breadcrumbs-list">{children}</ol>
    </nav>
  );
}

export type BreadcrumbsItemProps = ComponentPropsWithRef<"li"> & {
  href?: string;
  /** Marks the current page, shown as text. */
  current?: boolean;
  /** Renders a router's link in place of the anchor. */
  render?: useRender.RenderProp;
  children: ReactNode;
};

/** One step in the trail. */
export function BreadcrumbsItem({
  href,
  current = false,
  render,
  children,
  className = "",
  ...props
}: BreadcrumbsItemProps) {
  const link = useRender({
    defaultTagName: "a",
    render,
    props: { href, className: "x-govuk-ui-breadcrumbs-link", children },
  });
  return (
    <li
      {...props}
      className={`x-govuk-ui-breadcrumbs-item ${className}`.trim()}
      data-current={current || undefined}
    >
      {current || !href ? (
        <span className="x-govuk-ui-breadcrumbs-page" aria-current={current ? "page" : undefined}>
          {children}
        </span>
      ) : (
        link
      )}
    </li>
  );
}

export type BreadcrumbsEllipsisProps = ComponentPropsWithRef<"li"> & {
  /** Names the button that shows the steps left out. */
  label?: string;
  /** The steps left out, as `MenuLinkItem` parts. */
  children: ReactNode;
};

/**
 * Stands in for steps a long trail leaves out. Pressing it opens a Dropdown menu of them.
 */
export function BreadcrumbsEllipsis({
  label = "Show the pages in between",
  children,
  className = "",
  ...props
}: BreadcrumbsEllipsisProps) {
  return (
    <li {...props} className={`x-govuk-ui-breadcrumbs-item ${className}`.trim()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          variant="quiet"
          size="small-icon"
          chevron={false}
          aria-label={label}
          className="x-govuk-ui-breadcrumbs-ellipsis"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="3" cy="8" r="1.4" fill="currentColor" />
            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
            <circle cx="13" cy="8" r="1.4" fill="currentColor" />
          </svg>
        </DropdownMenuTrigger>
        <MenuContent>{children}</MenuContent>
      </DropdownMenu>
    </li>
  );
}
