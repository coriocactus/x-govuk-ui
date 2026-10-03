import type { ComponentPropsWithRef, ReactNode } from "react";

// The icons the library's own parts draw, so a service can compose with the same marks, such as a
// row's menu opened by SidebarItemAction's three dots. They are not an icon set for a service's own
// actions, so bring your own for those. Each is hidden from screen readers unless it is given a
// name with aria-label, because the control it sits in is named instead.

export type IconProps = Omit<ComponentPropsWithRef<"svg">, "children"> & {
  /** How wide and tall it is, in pixels. */
  size?: number;
};

/** An icon's SVG, hidden from screen readers unless it is named, when it is an image. */
function Svg({
  size,
  viewBox = "0 0 16 16",
  children,
  ...props
}: Omit<ComponentPropsWithRef<"svg">, "width" | "height"> & { size: number; children: ReactNode }) {
  const named = Boolean(props["aria-label"] || props["aria-labelledby"]);
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: It is hidden unless named with aria-label, as an image.
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      focusable="false"
      aria-hidden={named ? undefined : true}
      role={named ? "img" : undefined}
      {...props}
    >
      {children}
    </svg>
  );
}

/** Three dots, one above another, for a button that offers more of an item's actions. */
export function MoreIcon({ size = 16, ...props }: IconProps) {
  return (
    <Svg size={size} {...props} fill="currentColor">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </Svg>
  );
}

export type ChevronIconProps = IconProps & {
  /** `down` for what opens beneath, such as a menu, or `right` for what opens beside. */
  direction?: "down" | "right";
};

/** The chevron on a trigger, or on an item that opens more. Its strokeWidth suits its place. */
export function ChevronIcon({
  direction = "down",
  size = 14,
  strokeWidth = 1.8,
  className = "",
  ...props
}: ChevronIconProps) {
  return (
    <Svg
      size={size}
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      className={`x-govuk-ui-chevron ${className}`.trim()}
      data-direction={direction}
    >
      <path d={direction === "down" ? "m4 6 4 4 4-4" : "m6 4 4 4-4 4"} />
    </Svg>
  );
}

/** The tick that marks a chosen item or a step done. Its strokeWidth suits its place. */
export function TickIcon({ size = 14, strokeWidth = 2, ...props }: IconProps) {
  return (
    <Svg size={size} {...props}>
      <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </Svg>
  );
}

/** The small × that clears or removes something, such as a chip or a toast. */
export function CrossIcon({ size = 14, ...props }: IconProps) {
  return (
    <Svg size={size} {...props} fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" />
    </Svg>
  );
}

/** A magnifying glass, for a field that finds. */
export function SearchIcon({ size = 15, ...props }: IconProps) {
  return (
    <Svg size={size} viewBox="0 0 24 24" {...props} fill="none">
      <path
        d="M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** A page with its corner turned, for a file or a document. */
export function FileIcon({ size = 14, ...props }: IconProps) {
  return (
    <Svg size={size} {...props} fill="none">
      <path d="M4 1.5h5L12.5 5v9.5h-8.5z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 1.5V5h3.5" stroke="currentColor" strokeWidth="1.4" />
    </Svg>
  );
}
