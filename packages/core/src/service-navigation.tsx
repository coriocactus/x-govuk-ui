"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { useRender } from "@base-ui/react/use-render";
import { LayoutGroup, motion } from "motion/react";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useId,
} from "react";
import { ChevronIcon } from "./icons";
import { useMediaQuery } from "./media-query";
import { springs, useMotionTiming } from "./motion";
import { WidthContainer } from "./width-container";

const NavigationContext = createContext<string>("");

export type ServiceNavigationProps = ComponentPropsWithRef<"section"> & {
  /** The service's name, which leads its navigation. */
  serviceName?: ReactNode;
  serviceUrl?: string;
  /** The button that shows the links on a small screen. */
  menuLabel?: string;
  /** Names the links for screen readers. */
  navigationLabel?: string;
  children?: ReactNode;
};

/**
 * The service's name and its sections, in a band under the Header, like GOV.UK's. The current
 * section's bar glides to the next as the page changes. On a small screen, the sections fold away
 * behind a Menu button. Compose it from `ServiceNavigationItem` parts.
 */
export function ServiceNavigation({
  serviceName,
  serviceUrl,
  menuLabel = "Menu",
  navigationLabel = "Menu",
  className = "",
  children,
  ...props
}: ServiceNavigationProps) {
  const id = useId();
  const small = useMediaQuery("(max-width: 40em)");
  const list = (
    <ul className="x-govuk-ui-service-navigation-list">
      <LayoutGroup id={id}>{children}</LayoutGroup>
    </ul>
  );
  return (
    <NavigationContext value={id}>
      <section
        aria-label="Service information"
        {...props}
        className={`x-govuk-ui-service-navigation ${className}`.trim()}
      >
        <WidthContainer className="x-govuk-ui-service-navigation-container">
          {serviceName && (
            <span className="x-govuk-ui-service-navigation-name">
              {serviceUrl ? <a href={serviceUrl}>{serviceName}</a> : serviceName}
            </span>
          )}
          {children &&
            (small ? (
              <Collapsible.Root className="x-govuk-ui-service-navigation-menu">
                <Collapsible.Trigger className="x-govuk-ui-service-navigation-toggle">
                  {menuLabel}
                  <ChevronIcon size={12} strokeWidth={2} />
                </Collapsible.Trigger>
                <Collapsible.Panel className="x-govuk-ui-service-navigation-panel">
                  <nav aria-label={navigationLabel}>{list}</nav>
                </Collapsible.Panel>
              </Collapsible.Root>
            ) : (
              <nav aria-label={navigationLabel}>{list}</nav>
            ))}
        </WidthContainer>
      </section>
    </NavigationContext>
  );
}

export type ServiceNavigationItemProps = ComponentPropsWithRef<"li"> & {
  href: string;
  /** Marks the section the page is in. */
  current?: boolean;
  /** Renders a router's link in place of the anchor. */
  render?: useRender.RenderProp;
  children: ReactNode;
};

/** One of the service's sections. */
export function ServiceNavigationItem({
  href,
  current = false,
  render,
  children,
  className = "",
  ...props
}: ServiceNavigationItemProps) {
  const navigation = useContext(NavigationContext);
  const timing = useMotionTiming();
  const link = useRender({
    defaultTagName: "a",
    render,
    props: {
      href,
      className: "x-govuk-ui-service-navigation-link",
      "aria-current": current ? "page" : undefined,
      // A hidden bold copy of the label keeps each section as wide as it is when current, so the
      // sections never shift as the current one changes.
      children: (
        <span className="x-govuk-ui-service-navigation-label">
          <span>{children}</span>
          <span className="x-govuk-ui-service-navigation-label-room" aria-hidden="true">
            {children}
          </span>
        </span>
      ),
    },
  });
  return (
    <li
      {...props}
      className={`x-govuk-ui-service-navigation-item ${className}`.trim()}
      data-current={current || undefined}
    >
      {link}
      {current && (
        <motion.span
          layoutId={`${navigation}-current`}
          className="x-govuk-ui-service-navigation-bar"
          aria-hidden="true"
          transition={timing.spring(springs.glide)}
        />
      )}
    </li>
  );
}
