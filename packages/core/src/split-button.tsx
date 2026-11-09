"use client";

import type { ComponentPropsWithRef } from "react";
import { DropdownMenuTrigger, type DropdownMenuTriggerProps } from "./menu";

export type SplitButtonProps = ComponentPropsWithRef<"div">;

/**
 * A button joined to a menu of other ways to do the same thing, such as Save as a new view beside
 * Update this view. Put the Button first, then a DropdownMenu with a SplitButtonTrigger and its
 * MenuContent. Keep the button's action the one most users want, because the menu is a step
 * further away. Name the group with `aria-label`, such as Save the view. An action that takes the
 * split button away, such as Discard changes, must move focus somewhere that stays, because the
 * menu gives focus back to its trigger.
 */
export function SplitButton({ className = "", ...props }: SplitButtonProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: two buttons are a group, not a fieldset of fields.
    <div role="group" {...props} className={`x-govuk-ui-split-button ${className}`.trim()} />
  );
}

export type SplitButtonTriggerProps = Omit<DropdownMenuTriggerProps, "chevron" | "children"> & {
  /** Names the menu's button, which shows only a chevron, such as More ways to save. */
  label: string;
};

/**
 * The chevron that opens a SplitButton's menu, joined to the button beside it. Give it the button's
 * variant and size, so the two read as one.
 */
export function SplitButtonTrigger({
  label,
  variant = "primary",
  className = "",
  ...props
}: SplitButtonTriggerProps) {
  return (
    <DropdownMenuTrigger
      aria-label={label}
      variant={variant}
      {...props}
      className={`x-govuk-ui-split-button-trigger ${className}`.trim()}
    />
  );
}
