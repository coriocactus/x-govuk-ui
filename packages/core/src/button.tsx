"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef } from "react";
import { Spinner } from "./spinner";

export type ButtonGroupProps = ComponentPropsWithRef<"div"> & {
  /**
   * Stacks the buttons on a phone, each at full width, as GOV.UK's page actions do, such as Send
   * above Cancel. Set it to false for choices that belong side by side, such as Yes and No. The
   * buttons then stay in a row that fits their text on any screen, and wrap only if they must.
   */
  stack?: boolean;
};

/**
 * Buttons that belong together, such as "Save and continue" beside a "Cancel" link button, as in
 * GOV.UK's button group. They sit in a row, and stack on a phone unless `stack` is false. The
 * group, not each button, decides whether its buttons take the full width, because that depends on
 * how they belong together.
 */
export function ButtonGroup({ stack = true, className = "", ...props }: ButtonGroupProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-button-group ${className}`.trim()}
      data-inline={stack ? undefined : ""}
    />
  );
}

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  /**
   * Use primary for the main action, quiet for tools, and link for a lesser choice beside a button.
   * Outline stands out where secondary grey would disappear, such as on a tinted surface.
   */
  variant?: "primary" | "secondary" | "outline" | "warning" | "quiet" | "link";
  /**
   * Small buttons suit toolbars, popups and dense layouts. Icon sizes are square, 44 or 32
   * pixels across, for a single icon. Name an icon button with `aria-label`.
   */
  size?: "medium" | "small" | "icon" | "small-icon";
  loading?: boolean;
  /**
   * Renders another element with the Button's look, such as a link for GOV.UK's Start button, or a
   * router's link, as `<a href="/start" />` or `<RouterLink to="/start" />`. It takes the Button's
   * class, label and the rest of its props.
   */
  render?: useRender.RenderProp;
};

/**
 * Removes the props that only a Button reads. A trigger uses it when it is given another element to
 * render in the Button's place, and passes that element the other props. @internal
 */
export function withoutButtonLook({
  variant: _variant,
  size: _size,
  loading: _loading,
  render: _render,
  ...rest
}: ButtonProps) {
  return rest;
}

/**
 * GOV.UK's button. On a phone, a medium button takes the full width, as GOV.UK's do. From tablet
 * width up, it fits its text. Small, icon, quiet and link buttons keep their own width, because
 * they sit in toolbars and rows. Buttons in a ButtonGroup that does not stack also keep their own
 * width. While `loading`, the button keeps its width and its focus.
 */
export function Button({
  variant = "primary",
  size = "medium",
  loading = false,
  type,
  className = "",
  children,
  onClick,
  render,
  ...props
}: ButtonProps) {
  const unavailable =
    loading || props["aria-disabled"] === true || props["aria-disabled"] === "true";
  // A warning button sounds destructive, unless it names its own sound, as Exit this page does.
  const sound =
    (props as { "data-sound"?: string })["data-sound"] ??
    (variant === "warning" ? "destructive" : undefined);
  const button = (
    <button
      {...props}
      // A button never sends its form by accident. Another element, such as a link, takes no type.
      type={render ? type : (type ?? "button")}
      className={`x-govuk-ui-button x-govuk-ui-button--${variant}${size === "medium" ? "" : ` x-govuk-ui-button--${size}`} ${className}`.trim()}
      aria-busy={loading || undefined}
      aria-disabled={unavailable || undefined}
      data-loading={loading || undefined}
      data-sound={sound}
      // SoundScope plays a quiet button's press more softly.
      data-sound-soft={variant === "quiet" || undefined}
      onClick={(event) => {
        if (unavailable) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
    >
      <span className="x-govuk-ui-button-label">{children}</span>
      <Spinner size="small" className="x-govuk-ui-button-spinner" aria-hidden="true" />
    </button>
  );
  // Given another element, the Button gives it its own props, look and content.
  return useRender({
    defaultTagName: "button",
    render: render ?? button,
    props: render ? button.props : {},
  });
}
