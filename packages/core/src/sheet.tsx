"use client";

import { Drawer as Primitive } from "@base-ui/react/drawer";
import { type ComponentPropsWithRef, createContext, type ReactNode, useContext } from "react";
import { Button, type ButtonProps, withoutButtonLook } from "./button";
import { CloseIconButton, type OverlayLabels, useOverlaySound } from "./overlay";

export type SheetSide = "left" | "right" | "top" | "bottom";
const SideContext = createContext<SheetSide>("right");
/** The way a swipe closes a sheet, which is back towards the edge it came from. */
const swipeTowards = { left: "left", right: "right", top: "up", bottom: "down" } as const;

export type SheetProps = {
  children: ReactNode;
  /** The edge it slides in from. A swipe back towards that edge closes it. */
  side?: SheetSide;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Closes it when someone presses outside it, on the dimmed page. Give false for a sheet that
   * must be finished or closed by its own controls. Escape, a swipe and its own close still close
   * it.
   */
  closeOnPressOutside?: boolean;
};

/**
 * A panel that slides over the page from one edge, for settings, filters or navigation on small
 * screens. Base UI's Drawer provides it, so on a touch screen a swipe towards the edge closes it.
 * Compose it from `SheetTrigger`, `SheetContent`, `SheetTitle`, `SheetDescription` and
 * `SheetClose`. The Sidebar becomes a Sheet on small screens.
 */
export function Sheet({
  children,
  side = "right",
  open,
  defaultOpen,
  onOpenChange,
  closeOnPressOutside = true,
}: SheetProps) {
  const sound = useOverlaySound();
  return (
    <Primitive.Root
      open={open}
      defaultOpen={defaultOpen}
      disablePointerDismissal={!closeOnPressOutside}
      swipeDirection={swipeTowards[side]}
      onOpenChange={(next, details) => {
        sound(next, details.reason);
        onOpenChange?.(next);
      }}
    >
      <SideContext value={side}>{children}</SideContext>
    </Primitive.Root>
  );
}

export type SheetTriggerProps = Omit<ButtonProps, "render"> & {
  /**
   * Another element to open the sheet in the Button's place, such as a SidebarItem. It takes the
   * trigger's props and none of the Button's look.
   */
  render?: Primitive.Trigger.Props["render"];
};

/**
 * The button that opens the sheet. It is a secondary Button, unless you choose another variant or
 * give an element as `render`.
 */
export function SheetTrigger({ variant = "secondary", render, ...props }: SheetTriggerProps) {
  if (render) return <Primitive.Trigger {...withoutButtonLook(props)} render={render} />;
  return <Primitive.Trigger render={<Button variant={variant} {...props} />} />;
}

export type SheetContentProps = ComponentPropsWithRef<"div"> & {
  /** Names the sheet for screen readers when it has no `SheetTitle`. */
  label?: string;
  /** Shows a × button in the corner. */
  closeButton?: boolean;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<OverlayLabels>;
  initialFocus?: Primitive.Popup.Props["initialFocus"];
  finalFocus?: Primitive.Popup.Props["finalFocus"];
};

/**
 * The sheet itself, at its edge over a dimmed page, which fades as the sheet is swiped away. It
 * stacks its parts as a Stack does, with `--x-govuk-ui-space-surface` between them. Its description
 * sits close beneath its title, and a ButtonGroup among its parts sits at its foot.
 */
export function SheetContent({
  label,
  closeButton = false,
  labels,
  initialFocus,
  finalFocus,
  className = "",
  children,
  ...props
}: SheetContentProps) {
  const side = useContext(SideContext);
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="x-govuk-ui-sheet-backdrop" />
      <Primitive.Viewport className="x-govuk-ui-sheet-viewport">
        <Primitive.Popup
          {...props}
          className={`x-govuk-ui-sheet x-govuk-ui-stack ${className}`.trim()}
          data-side={side}
          aria-label={label}
          initialFocus={initialFocus}
          finalFocus={finalFocus}
        >
          {children}
          {closeButton && (
            <Primitive.Close
              render={<CloseIconButton label={labels?.close} className="x-govuk-ui-sheet-close" />}
            />
          )}
        </Primitive.Popup>
      </Primitive.Viewport>
    </Primitive.Portal>
  );
}

/** The sheet's heading, which names it for screen readers. */
export function SheetTitle({ className = "", ...props }: ComponentPropsWithRef<"h2">) {
  return <Primitive.Title {...props} className={`x-govuk-ui-sheet-title ${className}`.trim()} />;
}

/** A sentence under the heading that screen readers read as the sheet opens. */
export function SheetDescription({ className = "", ...props }: ComponentPropsWithRef<"p">) {
  return (
    <Primitive.Description
      {...props}
      className={`x-govuk-ui-sheet-description ${className}`.trim()}
    />
  );
}

/** A button that closes the sheet. It is a Button, secondary by default. */
export function SheetClose({ variant = "secondary", ...props }: ButtonProps) {
  return <Primitive.Close render={<Button variant={variant} data-sound="close" {...props} />} />;
}
