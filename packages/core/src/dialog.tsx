"use client";

import { Dialog as Primitive } from "@base-ui/react/dialog";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { Button, type ButtonProps, withoutButtonLook } from "./button";
import { CloseIconButton, useOverlaySound } from "./overlay";

export type DialogProps = {
  children: ReactNode;
  /** Whether it is open. Leave it out to let the dialog keep track. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * A window over the page that asks for one decision or a short task, such as confirming that
 * something should be deleted. The page behind is dimmed and inert until it closes. Compose it from
 * `DialogTrigger`, `DialogContent`, `DialogTitle`, `DialogDescription` and `DialogClose`. GOV.UK
 * advises against dialogs for most tasks, so prefer a page of its own when the task has steps.
 */
export function Dialog({ children, open, defaultOpen, onOpenChange }: DialogProps) {
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

export type DialogTriggerProps = ButtonProps & {
  /**
   * Another element to open the dialog in the Button's place, such as a SidebarItem. It takes the
   * trigger's props and none of the Button's look.
   */
  render?: Primitive.Trigger.Props["render"];
};

/**
 * The button that opens the dialog. It is a secondary Button, unless you choose another variant or
 * give an element as `render`.
 */
export function DialogTrigger({ variant = "secondary", render, ...props }: DialogTriggerProps) {
  if (render) return <Primitive.Trigger {...withoutButtonLook(props)} render={render} />;
  return <Primitive.Trigger render={<Button variant={variant} {...props} />} />;
}

export type DialogContentProps = ComponentPropsWithRef<"div"> & {
  /** Shows a × button in the corner. Escape and a press outside close the dialog either way. */
  closeButton?: boolean;
  closeLabel?: string;
  /** Where focus goes as it opens. By default, the first control inside. */
  initialFocus?: Primitive.Popup.Props["initialFocus"];
  /** Where focus goes as it closes. By default, the trigger. */
  finalFocus?: Primitive.Popup.Props["finalFocus"];
};

/**
 * The dialog itself, centred over a dimmed page. It grows into place and shrinks away, and it
 * scrolls within the window when its content is long.
 */
export function DialogContent({
  closeButton = true,
  closeLabel = "Close",
  initialFocus,
  finalFocus,
  className = "",
  children,
  ...props
}: DialogContentProps) {
  return (
    <Primitive.Portal>
      <Primitive.Backdrop className="x-govuk-ui-dialog-backdrop" />
      <Primitive.Viewport className="x-govuk-ui-dialog-viewport">
        <Primitive.Popup
          {...props}
          className={`x-govuk-ui-dialog ${className}`.trim()}
          initialFocus={initialFocus}
          finalFocus={finalFocus}
        >
          {children}
          {closeButton && (
            <Primitive.Close
              render={<CloseIconButton label={closeLabel} className="x-govuk-ui-dialog-close" />}
            />
          )}
        </Primitive.Popup>
      </Primitive.Viewport>
    </Primitive.Portal>
  );
}

/** The dialog's heading, which names it for screen readers. */
export function DialogTitle({ className = "", ...props }: ComponentPropsWithRef<"h2">) {
  return <Primitive.Title {...props} className={`x-govuk-ui-dialog-title ${className}`.trim()} />;
}

/** A sentence under the heading that screen readers read as the dialog opens. */
export function DialogDescription({ className = "", ...props }: ComponentPropsWithRef<"p">) {
  return (
    <Primitive.Description
      {...props}
      className={`x-govuk-ui-dialog-description ${className}`.trim()}
    />
  );
}

/** A button that closes the dialog, such as Cancel. It is a Button, secondary by default. */
export function DialogClose({ variant = "secondary", ...props }: ButtonProps) {
  return <Primitive.Close render={<Button variant={variant} data-sound="close" {...props} />} />;
}
