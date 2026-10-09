"use client";

import { ContextMenu as ContextPrimitive } from "@base-ui/react/context-menu";
import { Menu } from "@base-ui/react/menu";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
} from "react";
import { Button, type ButtonProps, withoutButtonLook } from "./button";
import { trackHighlight } from "./highlight";
import { ChevronIcon, TickIcon } from "./icons";
import { Kbd } from "./kbd";
import { useOverlaySound } from "./overlay";
import { useMergedRef } from "./refs";
import { Separator } from "./separator";
import { useScopeSound } from "./sound-scope";

/** Which kind of menu the parts are in, so the popup knows where to open. */
const KindContext = createContext<"dropdown" | "context">("dropdown");

type MenuRootProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * A list of actions that opens from a button, such as an application's Edit, Duplicate and
 * Withdraw. Compose it from `DropdownMenuTrigger` and `MenuContent`. `MenuContent` contains
 * `MenuItem`, `MenuGroup`, `MenuSeparator`, `MenuCheckboxItem`, `MenuRadioGroup` with
 * `MenuRadioItem`, and `MenuSubmenu`. One highlight glides between the items. The arrow keys move
 * it, and typing jumps to an item.
 */
export function DropdownMenu({ children, open, defaultOpen, onOpenChange }: MenuRootProps) {
  const sound = useOverlaySound();
  return (
    <Menu.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next, details) => {
        sound(next, details.reason);
        onOpenChange?.(next);
      }}
    >
      <KindContext value="dropdown">{children}</KindContext>
    </Menu.Root>
  );
}

export type DropdownMenuTriggerProps = ButtonProps & {
  /** Shows a chevron after the label. Leave it off for an icon button. */
  chevron?: boolean;
  /**
   * Another element to open the menu in the Button's place, such as a SidebarItem, or a
   * SidebarItemAction for a row's own menu. It takes the trigger's props and none of the Button's
   * look, chevron or class.
   */
  render?: Menu.Trigger.Props["render"];
};

/**
 * The button that opens the menu, with a chevron. It is a secondary Button by default, or the
 * element given as `render`.
 */
export function DropdownMenuTrigger({
  variant = "secondary",
  chevron = true,
  render,
  className = "",
  children,
  ...props
}: DropdownMenuTriggerProps) {
  if (render)
    return (
      <Menu.Trigger
        {...withoutButtonLook(props)}
        className={className || undefined}
        render={render}
      >
        {children}
      </Menu.Trigger>
    );
  return (
    <Menu.Trigger
      render={
        <Button
          variant={variant}
          {...props}
          className={`x-govuk-ui-dropdown-trigger ${className}`.trim()}
        >
          {children}
          {chevron && <ChevronIcon />}
        </Button>
      }
    />
  );
}

/**
 * Actions for an area of the page, opened by a right-click or a long press there, where the pointer
 * is. Compose it from `ContextMenuTrigger` and `MenuContent`, with the same items as DropdownMenu.
 * Keep every action available elsewhere too, because a context menu is easy to miss.
 */
export function ContextMenu({
  children,
  onOpenChange,
}: Omit<MenuRootProps, "open" | "defaultOpen">) {
  const sound = useOverlaySound();
  const play = useScopeSound();
  return (
    <ContextPrimitive.Root
      onOpenChange={(next, details) => {
        // SoundScope does not hear a right-click as a press, so the menu plays its own sound as it
        // opens.
        if (next) play("open");
        sound(next, details.reason);
        onOpenChange?.(next);
      }}
    >
      <KindContext value="context">{children}</KindContext>
    </ContextPrimitive.Root>
  );
}

export type ContextMenuTriggerProps = ComponentPropsWithRef<"div"> & {
  /** Another element to be the area, such as a table's row. It keeps the area's class. */
  render?: ContextPrimitive.Trigger.Props["render"];
};

/** The area a right-click or long press opens the context menu in. */
export function ContextMenuTrigger({ className = "", ...props }: ContextMenuTriggerProps) {
  return (
    <ContextPrimitive.Trigger
      {...props}
      className={`x-govuk-ui-context-menu-trigger ${className}`.trim()}
    />
  );
}

/** The highlight that glides to the item under the pointer or the keys. */
function followHighlight(popup: HTMLDivElement | null) {
  return trackHighlight(popup, {
    indicator: ":scope > .x-govuk-ui-menu-highlight",
    item: ".x-govuk-ui-menu-item[data-highlighted]",
  });
}

function Popup({
  className = "",
  children,
  ref,
  ...props
}: ComponentPropsWithRef<"div"> & { finalFocus?: Menu.Popup.Props["finalFocus"] }) {
  const merged = useMergedRef(followHighlight, ref);
  return (
    <Menu.Popup
      {...props}
      ref={merged}
      className={`x-govuk-ui-floating x-govuk-ui-menu ${className}`.trim()}
    >
      <span className="x-govuk-ui-menu-highlight" aria-hidden="true" />
      {children}
    </Menu.Popup>
  );
}

export type MenuContentProps = ComponentPropsWithRef<"div"> & {
  /** For a dropdown menu, the side of its button, or of its anchor, that it opens on. */
  side?: "top" | "bottom" | "left" | "right";
  /** For a dropdown menu, the edge of its button, or of its anchor, that it lines up with. */
  align?: "start" | "center" | "end";
  /**
   * For a dropdown menu, the element it is placed against instead of its button, such as the row
   * the button sits in. The menu's `--anchor-width` is this element's width. A context menu opens
   * at the pointer, and ignores `anchor`, as it ignores `side`.
   */
  anchor?: Element | RefObject<Element | null>;
  /**
   * Where focus goes as the menu closes, as Base UI's popup's `finalFocus` decides. By default,
   * focus goes back to the menu's button. The Editor's formatting menu gives it back to the
   * document.
   */
  finalFocus?: Menu.Popup.Props["finalFocus"];
};

/**
 * The menu's list. A dropdown menu's grows from its button, and a context menu's from the pointer.
 */
export function MenuContent({
  side = "bottom",
  align = "start",
  anchor,
  ...props
}: MenuContentProps) {
  const kind = useContext(KindContext);
  return (
    <Menu.Portal>
      {kind === "context" ? (
        <ContextPrimitive.Positioner
          className="x-govuk-ui-floating-positioner"
          collisionPadding={8}
        >
          <Popup {...props} />
        </ContextPrimitive.Positioner>
      ) : (
        <Menu.Positioner
          className="x-govuk-ui-floating-positioner"
          anchor={anchor}
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
        >
          <Popup {...props} />
        </Menu.Positioner>
      )}
    </Menu.Portal>
  );
}

/** An item's icon, label and shortcut, in the same columns for every kind of item. */
function ItemBody({
  icon,
  shortcut,
  children,
  end,
}: {
  icon?: ReactNode;
  shortcut?: string;
  children: ReactNode;
  end?: ReactNode;
}) {
  return (
    <>
      <span className="x-govuk-ui-menu-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="x-govuk-ui-menu-label">{children}</span>
      {shortcut && (
        <Kbd aria-hidden="true" className="x-govuk-ui-menu-shortcut">
          {shortcut}
        </Kbd>
      )}
      {end}
    </>
  );
}

export type MenuItemProps = Omit<ComponentPropsWithRef<"div">, "onSelect"> & {
  children: ReactNode;
  /** Runs when the item is chosen, by a press or by Enter. */
  onSelect?: () => void;
  icon?: ReactNode;
  /** A shortcut that does the same thing elsewhere, shown as keys, such as "⌘ D". */
  shortcut?: string;
  /** Colours the item as one that removes or withdraws something. */
  destructive?: boolean;
  disabled?: boolean;
  /** Keeps the menu open after the item is chosen. */
  keepOpen?: boolean;
};

/** One action. */
export function MenuItem({
  children,
  onSelect,
  icon,
  shortcut,
  destructive = false,
  disabled,
  keepOpen = false,
  className = "",
  ...props
}: MenuItemProps) {
  return (
    <Menu.Item
      {...props}
      className={`x-govuk-ui-menu-item ${className}`.trim()}
      data-destructive={destructive || undefined}
      data-sound={destructive ? "destructive" : undefined}
      disabled={disabled}
      closeOnClick={!keepOpen}
      onClick={() => onSelect?.()}
    >
      <ItemBody icon={icon} shortcut={shortcut}>
        {children}
      </ItemBody>
    </Menu.Item>
  );
}

export type MenuLinkItemProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  /** Renders a router's link in place of the item's anchor. */
  render?: Menu.LinkItem.Props["render"];
};

/** An item that goes to another page. */
export function MenuLinkItem({
  href,
  children,
  icon,
  render,
  className = "",
  ...props
}: MenuLinkItemProps) {
  return (
    <Menu.LinkItem
      {...props}
      className={`x-govuk-ui-menu-item ${className}`.trim()}
      href={href}
      render={render}
    >
      <ItemBody icon={icon}>{children}</ItemBody>
    </Menu.LinkItem>
  );
}

export type MenuGroupProps = ComponentPropsWithRef<"div"> & {
  label?: ReactNode;
  children: ReactNode;
};

/** Items under a small heading, such as Download. */
export function MenuGroup({ label, children, className = "", ...props }: MenuGroupProps) {
  return (
    <Menu.Group {...props} className={`x-govuk-ui-menu-group ${className}`.trim()}>
      {label && <Menu.GroupLabel className="x-govuk-ui-menu-group-label">{label}</Menu.GroupLabel>}
      {children}
    </Menu.Group>
  );
}

/**
 * Who or what a menu is for, at its head, such as the user signed in, with their avatar. It is
 * the label of the group it starts, so it names the items that follow. It is set at the menu's
 * edge, in the words' own size. Put it first in a MenuGroup that has no `label`.
 */
export function MenuHeader({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <Menu.GroupLabel {...props} className={`x-govuk-ui-menu-header ${className}`.trim()} />;
}

/** A keyline between groups of items. It is the library's Separator. */
export function MenuSeparator({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return (
    <Separator
      {...props}
      spacing="none"
      className={`x-govuk-ui-menu-separator ${className}`.trim()}
    />
  );
}

export type MenuCheckboxItemProps = Omit<
  ComponentPropsWithRef<"div">,
  "defaultChecked" | "onCheckedChange"
> & {
  children: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
};

/** An item that turns a setting on or off, with a tick while it is on. The menu stays open. */
export function MenuCheckboxItem({
  children,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  className = "",
  ...props
}: MenuCheckboxItemProps) {
  return (
    <Menu.CheckboxItem
      {...props}
      className={`x-govuk-ui-menu-item ${className}`.trim()}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      disabled={disabled}
      closeOnClick={false}
    >
      <ItemBody
        icon={
          <Menu.CheckboxItemIndicator className="x-govuk-ui-menu-indicator" keepMounted>
            <TickIcon />
          </Menu.CheckboxItemIndicator>
        }
      >
        {children}
      </ItemBody>
    </Menu.CheckboxItem>
  );
}

export type MenuRadioGroupProps = Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onValueChange"
> & {
  children: ReactNode;
  /** A heading for the choices, such as Sort by. */
  label?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

/** Items of which one is chosen, such as an order to sort by. */
export function MenuRadioGroup({
  children,
  label,
  value,
  defaultValue,
  onValueChange,
  className = "",
  ...props
}: MenuRadioGroupProps) {
  return (
    <Menu.Group className={`x-govuk-ui-menu-group ${className}`.trim()}>
      {label && <Menu.GroupLabel className="x-govuk-ui-menu-group-label">{label}</Menu.GroupLabel>}
      <Menu.RadioGroup
        {...props}
        value={value}
        defaultValue={defaultValue}
        onValueChange={(next) => onValueChange?.(next as string)}
      >
        {children}
      </Menu.RadioGroup>
    </Menu.Group>
  );
}

export type MenuRadioItemProps = ComponentPropsWithRef<"div"> & {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  /** An icon for the choice. With one, a tick at the end marks the chosen item instead of a dot. */
  icon?: ReactNode;
  /** Closes the menu once chosen, as a picker does. By default, the menu stays open. */
  closeOnClick?: boolean;
};

/** One choice in a MenuRadioGroup, with a dot while it is chosen, or a tick beside an icon. */
export function MenuRadioItem({
  value,
  children,
  disabled,
  icon,
  closeOnClick = false,
  className = "",
  ...props
}: MenuRadioItemProps) {
  return (
    <Menu.RadioItem
      {...props}
      className={`x-govuk-ui-menu-item ${className}`.trim()}
      value={value}
      disabled={disabled}
      closeOnClick={closeOnClick}
    >
      <ItemBody
        icon={
          icon ?? (
            <Menu.RadioItemIndicator className="x-govuk-ui-menu-indicator" keepMounted>
              <span className="x-govuk-ui-menu-dot" />
            </Menu.RadioItemIndicator>
          )
        }
        end={
          icon && (
            <Menu.RadioItemIndicator
              className="x-govuk-ui-menu-indicator x-govuk-ui-menu-end-tick"
              keepMounted
            >
              <TickIcon />
            </Menu.RadioItemIndicator>
          )
        }
      >
        {children}
      </ItemBody>
    </Menu.RadioItem>
  );
}

export type MenuSubmenuProps = { label: ReactNode; icon?: ReactNode; children: ReactNode };

/** An item that opens more items beside it, such as Download with its formats. */
export function MenuSubmenu({ label, icon, children }: MenuSubmenuProps) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className="x-govuk-ui-menu-item">
        <ItemBody icon={icon} end={<ChevronIcon direction="right" />}>
          {label}
        </ItemBody>
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner
          className="x-govuk-ui-floating-positioner"
          side="right"
          align="start"
          sideOffset={4}
          alignOffset={-5}
          collisionPadding={8}
        >
          <Popup>{children}</Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}
