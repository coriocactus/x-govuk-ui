"use client";

import { PreviewCard as Primitive } from "@base-ui/react/preview-card";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { ArrowShape } from "./overlay";

export type HoverCardProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * A card that previews where a link goes, such as a person's role and team, while the pointer
 * rests on the link or it has keyboard focus. It adds detail for those who want it. Everything in
 * it must also be reachable by following the link, because touch screens do not show it. Compose it
 * from `HoverCardTrigger` and `HoverCardContent`. It makes no sound, because it opens without a
 * press.
 */
export function HoverCard({ children, open, defaultOpen, onOpenChange }: HoverCardProps) {
  return (
    <Primitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next) => onOpenChange?.(next)}
    >
      {children}
    </Primitive.Root>
  );
}

export type HoverCardTriggerProps = ComponentPropsWithRef<"a"> & {
  href: string;
  /** A router's link in place of the `<a>`, as an element or a function given the link's props. */
  render?: Primitive.Trigger.Props["render"];
  /** How long the pointer rests before the card opens, in milliseconds. */
  delay?: number;
  /** How long the card stays after the pointer leaves, in milliseconds. */
  closeDelay?: number;
};

/** The link the card previews. */
export function HoverCardTrigger({
  delay = 200,
  closeDelay = 250,
  className = "",
  ...props
}: HoverCardTriggerProps) {
  return (
    <Primitive.Trigger
      {...props}
      delay={delay}
      closeDelay={closeDelay}
      className={`x-govuk-ui-hover-card-trigger ${className}`.trim()}
    />
  );
}

export type HoverCardContentProps = ComponentPropsWithRef<"div"> & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  arrow?: boolean;
};

/** The card. It grows out of the link and fades away. */
export function HoverCardContent({
  side = "bottom",
  align = "center",
  arrow = true,
  className = "",
  children,
  ...props
}: HoverCardContentProps) {
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
          className={`x-govuk-ui-floating x-govuk-ui-hover-card ${className}`.trim()}
        >
          {arrow && (
            <Primitive.Arrow className="x-govuk-ui-floating-arrow">
              <ArrowShape />
            </Primitive.Arrow>
          )}
          {children}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
