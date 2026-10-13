import type { ComponentPropsWithRef } from "react";

export type ItemProps = ComponentPropsWithRef<"div"> & {
  /** Outline gives the item a keyline of its own, for an item that stands alone. */
  variant?: "plain" | "outline";
};

/**
 * One thing in a list, such as a person or a file, with its media, its title and description, and
 * actions at the end. Compose it from `ItemMedia`, `ItemContent` with `ItemTitle` and
 * `ItemDescription`, and `ItemActions`. Put several in an `ItemGroup`, which draws lines between
 * them.
 */
export function Item({ variant = "plain", className = "", ...props }: ItemProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-item ${className}`.trim()}
      data-variant={variant === "outline" ? "outline" : undefined}
    />
  );
}

/** A list of items with a line between each. Each child is a list item. */
export function ItemGroup({ className = "", children, ...props }: ComponentPropsWithRef<"ul">) {
  return (
    <ul {...props} className={`x-govuk-ui-item-group ${className}`.trim()}>
      {children}
    </ul>
  );
}

export type ItemMediaProps = ComponentPropsWithRef<"div"> & {
  /** `tile` sets an icon in a rounded square of the brand's tint, as in Question card's header. */
  variant?: "plain" | "tile";
};

/** The item's picture or icon, at its start. */
export function ItemMedia({ variant = "plain", className = "", ...props }: ItemMediaProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-item-media ${className}`.trim()}
      data-variant={variant === "tile" ? "tile" : undefined}
    />
  );
}

/** The item's title and description, which take the space between the media and the actions. */
export function ItemContent({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-item-content ${className}`.trim()} />;
}

/** The item's name. */
export function ItemTitle({ className = "", ...props }: ComponentPropsWithRef<"p">) {
  return <p {...props} className={`x-govuk-ui-item-title ${className}`.trim()} />;
}

/** A line under the name, such as a role or a size. */
export function ItemDescription({ className = "", ...props }: ComponentPropsWithRef<"p">) {
  return <p {...props} className={`x-govuk-ui-item-description ${className}`.trim()} />;
}

/** Buttons or a menu at the item's end. */
export function ItemActions({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-item-actions ${className}`.trim()} />;
}
