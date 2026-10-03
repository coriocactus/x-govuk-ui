"use client";

import { Menu } from "@base-ui/react/menu";
import { Menubar as Primitive } from "@base-ui/react/menubar";
import type { ComponentPropsWithRef, ReactNode } from "react";

export type MenubarProps = ComponentPropsWithRef<"div"> & {
  children: ReactNode;
  /** Names the bar for screen readers, such as "Document". */
  "aria-label"?: string;
};

/**
 * A row of menus, such as an application's File, Edit and View. Each is a `DropdownMenu` with a
 * `MenubarTrigger` and the menus' own `MenuContent` and items. The arrow keys move along the bar.
 * Once one menu is open, moving to another opens that menu in its place. It is built on Base UI's
 * Menubar.
 */
export function Menubar({ className = "", children, ...props }: MenubarProps) {
  return (
    <Primitive {...props} className={`x-govuk-ui-menubar ${className}`.trim()}>
      {children}
    </Primitive>
  );
}

export type MenubarTriggerProps = ComponentPropsWithRef<"button"> & {
  /** Another element to be the menu's name. It keeps the name's class. */
  render?: Menu.Trigger.Props["render"];
};

/** A menu's name in the bar. It shades under the pointer and while its menu is open. */
export function MenubarTrigger({ className = "", ...props }: MenubarTriggerProps) {
  return <Menu.Trigger {...props} className={`x-govuk-ui-menubar-trigger ${className}`.trim()} />;
}
