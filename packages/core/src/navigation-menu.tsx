"use client";

import { NavigationMenu as Primitive } from "@base-ui/react/navigation-menu";
import { type ComponentPropsWithRef, createContext, type ReactNode, useContext } from "react";
import { ChevronIcon } from "./icons";

type MenuContextValue = { disabled: boolean };
const MenuContext = createContext<MenuContextValue>({ disabled: false });
// Links inside a panel sit in its list, so each wraps itself in a list item.
const InPanel = createContext(false);

export type NavigationMenuProps = ComponentPropsWithRef<"nav"> & {
  children: ReactNode;
  /** Names the navigation for screen readers. It is not shown. */
  label?: string;
  /** Stops every link and menu from responding. */
  disabled?: boolean;
  /** Milliseconds the pointer rests on a trigger before its menu opens. */
  delay?: number;
  /** Milliseconds after the pointer leaves before the menu closes. */
  closeDelay?: number;
};

/**
 * Service navigation with menus. Compose it from `NavigationMenuItem`, `NavigationMenuLink`,
 * `NavigationMenuTrigger` and `NavigationMenuContent`. One panel contains every menu, and glides
 * between them, resizing to fit.
 */
export function NavigationMenu({
  children,
  label = "Services",
  disabled = false,
  className = "",
  delay = 80,
  closeDelay = 180,
  ...props
}: NavigationMenuProps) {
  return (
    <MenuContext value={{ disabled }}>
      <Primitive.Root
        {...props}
        aria-label={label}
        className={`x-govuk-ui-navigation ${className}`.trim()}
        delay={delay}
        closeDelay={closeDelay}
      >
        <Primitive.List className="x-govuk-ui-navigation-list">{children}</Primitive.List>
        {/* Portalled to the body, so the panel overlays the page and avoids only the
            window's edges. */}
        <Primitive.Portal>
          <Primitive.Positioner
            sideOffset={8}
            align="start"
            className="x-govuk-ui-navigation-positioner"
          >
            <Primitive.Popup className="x-govuk-ui-navigation-popup" aria-label={label}>
              <Primitive.Viewport className="x-govuk-ui-navigation-viewport" />
            </Primitive.Popup>
          </Primitive.Positioner>
        </Primitive.Portal>
      </Primitive.Root>
    </MenuContext>
  );
}

export type NavigationMenuItemProps = Omit<ComponentPropsWithRef<"li">, "value"> & {
  children: ReactNode;
  /** Identifies the item. Defaults to an id React generates. */
  value?: string;
};

/** One entry in the navigation, which is a link, or a trigger with its menu. */
export function NavigationMenuItem({
  children,
  value,
  className = "",
  ...props
}: NavigationMenuItemProps) {
  return (
    <Primitive.Item
      {...props}
      value={value}
      className={`x-govuk-ui-navigation-item ${className}`.trim()}
    >
      {children}
    </Primitive.Item>
  );
}

export type NavigationMenuTriggerProps = ComponentPropsWithRef<"button"> & { children: ReactNode };

/** Opens the item's menu on hover, press or the keyboard. */
export function NavigationMenuTrigger({
  children,
  className = "",
  ...props
}: NavigationMenuTriggerProps) {
  const { disabled } = useContext(MenuContext);
  return (
    <Primitive.Trigger
      {...props}
      className={`x-govuk-ui-navigation-trigger ${className}`.trim()}
      disabled={disabled}
    >
      {children}
      <Primitive.Icon className="x-govuk-ui-navigation-icon">
        <ChevronIcon />
      </Primitive.Icon>
    </Primitive.Trigger>
  );
}

export type NavigationMenuContentProps = ComponentPropsWithRef<"div"> & { children: ReactNode };

/** The menu's links. It opens inside the shared panel. */
export function NavigationMenuContent({
  children,
  className = "",
  ...props
}: NavigationMenuContentProps) {
  return (
    <Primitive.Content {...props} className={`x-govuk-ui-navigation-content ${className}`.trim()}>
      <ul className="x-govuk-ui-navigation-links">
        <InPanel value={true}>{children}</InPanel>
      </ul>
    </Primitive.Content>
  );
}

export type NavigationMenuLinkProps = Omit<Primitive.Link.Props, "className" | "children"> & {
  children: ReactNode;
  /** A line beneath the label, in a menu. */
  description?: ReactNode;
  /** Marks the page the user is on, with `aria-current="page"`. */
  current?: boolean;
  className?: string;
};

/**
 * A link, at the top level or in a menu. Pass `render` to use a router's link, such as
 * `render={<RouterLink to="/benefits" />}`.
 */
export function NavigationMenuLink({
  children,
  description,
  current = false,
  href,
  target,
  rel,
  className = "",
  ...props
}: NavigationMenuLinkProps) {
  const { disabled } = useContext(MenuContext);
  const inPanel = useContext(InPanel);
  const link = (
    <Primitive.Link
      {...props}
      className={`x-govuk-ui-navigation-link ${className}`.trim()}
      href={disabled ? undefined : href}
      aria-disabled={disabled || undefined}
      active={current}
      target={target}
      rel={rel ?? (target === "_blank" ? "noreferrer" : undefined)}
    >
      <span>{children}</span>
      {description && <span className="x-govuk-ui-navigation-description">{description}</span>}
    </Primitive.Link>
  );
  return inPanel ? <li>{link}</li> : link;
}
