"use client";

import { Popover as Primitive } from "@base-ui/react/popover";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { Button, type ButtonProps, withoutButtonLook } from "./button";
import { ArrowShape, CloseIconButton, useOverlaySound } from "./overlay";

export type PopoverProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * A small panel beside its button, for a short explanation or a few controls, such as sharing a
 * link. The page stays usable, and a press outside or Escape closes it. Compose it from
 * `PopoverTrigger`, `PopoverContent`, `PopoverTitle`, `PopoverDescription` and `PopoverClose`.
 * For text that is only a label, use Tooltip.
 */
export function Popover({ children, open, defaultOpen, onOpenChange }: PopoverProps) {
  const sound = useOverlaySound();
  return (
    <Primitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next, details) => {
        sound(next, details.reason);
        onOpenChange?.(next);
      }}
    >
      {children}
    </Primitive.Root>
  );
}

export type PopoverTriggerProps = ButtonProps & {
  /**
   * Another element to open the popover in the Button's place, such as a SidebarItem. It takes the
   * trigger's props and none of the Button's look.
   */
  render?: Primitive.Trigger.Props["render"];
};

/**
 * The button that opens the popover. It is a secondary Button, unless you choose another variant or
 * give an element as `render`.
 */
export function PopoverTrigger({ variant = "secondary", render, ...props }: PopoverTriggerProps) {
  if (render) return <Primitive.Trigger {...withoutButtonLook(props)} render={render} />;
  return <Primitive.Trigger render={<Button variant={variant} {...props} />} />;
}

export type PopoverContentProps = ComponentPropsWithRef<"div"> & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Points an arrow at the trigger. */
  arrow?: boolean;
  /** Shows a × button in the corner. */
  closeButton?: boolean;
  closeLabel?: string;
};

/** The panel. It grows out of its trigger and shrinks back into it. */
export function PopoverContent({
  side = "bottom",
  align = "center",
  arrow = true,
  closeButton = false,
  closeLabel = "Close",
  className = "",
  children,
  ...props
}: PopoverContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        className="x-govuk-ui-floating-positioner"
        side={side}
        align={align}
        sideOffset={arrow ? 10 : 6}
        collisionPadding={8}
      >
        <Primitive.Popup
          {...props}
          className={`x-govuk-ui-floating x-govuk-ui-popover ${className}`.trim()}
        >
          {arrow && (
            <Primitive.Arrow className="x-govuk-ui-floating-arrow">
              <ArrowShape />
            </Primitive.Arrow>
          )}
          {children}
          {closeButton && (
            <Primitive.Close
              render={<CloseIconButton label={closeLabel} className="x-govuk-ui-popover-close" />}
            />
          )}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}

/** The popover's heading, which names it for screen readers. */
export function PopoverTitle({ className = "", ...props }: ComponentPropsWithRef<"h2">) {
  return <Primitive.Title {...props} className={`x-govuk-ui-popover-title ${className}`.trim()} />;
}

/** A sentence under the heading that screen readers read as the popover opens. */
export function PopoverDescription({ className = "", ...props }: ComponentPropsWithRef<"p">) {
  return (
    <Primitive.Description
      {...props}
      className={`x-govuk-ui-popover-description ${className}`.trim()}
    />
  );
}

/** A button that closes the popover. It is a Button, secondary by default. */
export function PopoverClose({ variant = "secondary", ...props }: ButtonProps) {
  return <Primitive.Close render={<Button variant={variant} data-sound="close" {...props} />} />;
}
