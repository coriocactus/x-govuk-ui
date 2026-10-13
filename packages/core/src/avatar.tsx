"use client";

import { Avatar as Primitive } from "@base-ui/react/avatar";
import type { ComponentPropsWithRef } from "react";

export type AvatarProps = ComponentPropsWithRef<"span"> & {
  /** The person's name. It names the avatar, and gives the initials when there is no image. */
  name: string;
  src?: string;
  size?: "small" | "medium" | "large";
};

// Initials take one of GOV.UK's colours, the same one for a name every time.
const tints = ["blue", "teal", "purple", "green", "magenta", "red"];
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

/**
 * A person's photo, or their initials on one of GOV.UK's colours until the photo loads or if there
 * is none. The initials' colour stays the same for a name. It is built on Base UI's Avatar, so a
 * photo fades in only once it has loaded. Put several in an `AvatarGroup` to overlap them.
 */
export function Avatar({ name, src, size = "medium", className = "", ...props }: AvatarProps) {
  const tint =
    tints[[...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % tints.length];
  return (
    <Primitive.Root
      {...props}
      className={`x-govuk-ui-avatar ${className}`.trim()}
      data-size={size}
      data-tint={tint}
      role="img"
      aria-label={name}
    >
      {src && <Primitive.Image className="x-govuk-ui-avatar-image" src={src} alt="" />}
      <Primitive.Fallback className="x-govuk-ui-avatar-fallback" aria-hidden="true">
        {initialsOf(name)}
      </Primitive.Fallback>
    </Primitive.Root>
  );
}

export type AvatarGroupProps = ComponentPropsWithRef<"div"> & {
  /** People beyond those shown, counted in a last circle, such as +3. */
  more?: number;
};

// How the group responds to the pointer. The avatar under it rises most and grows a little. Its
// neighbours rise less the further away they are.
const LIFT = -4;
const FALLOFF = 0.45;
const GROW = 1.05;

/**
 * Avatars that overlap, each ringed in the page's colour, with a count of any more. Under the
 * pointer, the avatar there rises and grows a little, and its neighbours rise less the further
 * they are from it. As the pointer leaves, they spring back into line.
 */
export function AvatarGroup({
  more = 0,
  className = "",
  children,
  onPointerOver,
  onPointerLeave,
  ...props
}: AvatarGroupProps) {
  const lift = (group: HTMLElement, active: number | null) => {
    group.toggleAttribute("data-settling", active === null);
    [...group.children].forEach((avatar, place) => {
      if (!(avatar instanceof HTMLElement)) return;
      const lifted = active === null ? 0 : LIFT * FALLOFF ** Math.abs(place - active);
      avatar.style.setProperty("--x-govuk-ui-avatar-lift", `${lifted.toFixed(2)}px`);
      avatar.style.setProperty("--x-govuk-ui-avatar-grow", place === active ? String(GROW) : "1");
      avatar.toggleAttribute("data-active", place === active);
    });
  };
  return (
    <div
      {...props}
      className={`x-govuk-ui-avatar-group ${className}`.trim()}
      onPointerOver={(event) => {
        onPointerOver?.(event);
        const group = event.currentTarget;
        const avatar = (event.target as Element).closest(".x-govuk-ui-avatar");
        if (avatar?.parentElement === group) lift(group, [...group.children].indexOf(avatar));
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        lift(event.currentTarget, null);
      }}
    >
      {children}
      {more > 0 && (
        <span className="x-govuk-ui-avatar x-govuk-ui-avatar-more" data-size="medium">
          <span aria-hidden="true">+{more}</span>
          <span className="x-govuk-ui-visually-hidden">and {more} more</span>
        </span>
      )}
    </div>
  );
}
