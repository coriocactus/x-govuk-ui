"use client";

import { Avatar as Primitive } from "@base-ui/react/avatar";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Anchor, type AnchorProps } from "./anchor";
import { Tag } from "./tag";

export type MediaCreditProps = Omit<ComponentPropsWithRef<"span">, "prefix"> & {
  /** Who made the photo, such as its photographer. */
  children: ReactNode;
  /** The words before the name, for screen readers, such as "Photo by". */
  prefix?: string;
};

/**
 * A photo's credit, as a small Tag in its bottom right corner. It shows while the pointer is over
 * the photo or over its container, such as a Card, and while something in the container has
 * focus. Put it beside the image in `CardMedia`, `AspectRatio` or another positioned box.
 */
export function MediaCredit({
  children,
  prefix = "Photo by",
  className = "",
  ...props
}: MediaCreditProps) {
  return (
    <span {...props} className={`x-govuk-ui-media-credit ${className}`.trim()}>
      <Tag colour="grey" className="x-govuk-ui-media-credit-tag">
        <span className="x-govuk-ui-visually-hidden">{prefix} </span>
        {children}
      </Tag>
    </span>
  );
}

export type CardProps = ComponentPropsWithRef<"article">;

/**
 * A surface that groups one thing, such as a service or a document, with an optional image,
 * a title and a few words. When its title is a link, the whole card is the link. Compose it from
 * `CardMedia`, `CardTitle`, `CardDescription` and `CardFooter`.
 */
export function Card({ className = "", ...props }: CardProps) {
  return <article {...props} className={`x-govuk-ui-card ${className}`.trim()} />;
}

/**
 * An image across the top of the card, cropped to the card's width, with an optional MediaCredit.
 */
export function CardMedia({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-card-media ${className}`.trim()} />;
}

export type CardTitleProps = ComponentPropsWithRef<"h2"> & {
  /** Makes the whole card a link to this address. */
  href?: string;
  /** Renders a router's link in place of the card's anchor. */
  render?: AnchorProps["render"];
  headingLevel?: 2 | 3 | 4;
};

/** The card's heading. With an `href`, its link reaches over the whole card. */
export function CardTitle({
  href,
  render,
  headingLevel = 2,
  className = "",
  children,
  ...props
}: CardTitleProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <Heading {...props} className={`x-govuk-ui-card-title ${className}`.trim()}>
      {href || render ? (
        <Anchor href={href} render={render} className="x-govuk-ui-card-link">
          {children}
        </Anchor>
      ) : (
        children
      )}
    </Heading>
  );
}

/** A few words under the title. */
export function CardDescription({ className = "", ...props }: ComponentPropsWithRef<"p">) {
  return <p {...props} className={`x-govuk-ui-card-description ${className}`.trim()} />;
}

/** The foot of the card, for details such as a date, or actions above the card's link. */
export function CardFooter({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-card-footer ${className}`.trim()} />;
}

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

export type AspectRatioProps = ComponentPropsWithRef<"div"> & {
  /** Width over height, such as 16 / 9. */
  ratio?: number;
};

/**
 * Keeps its content to a ratio, such as 16 by 9, at any width. An image or video inside fills it.
 */
export function AspectRatio({ ratio = 16 / 9, className = "", style, ...props }: AspectRatioProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-aspect-ratio ${className}`.trim()}
      style={{ aspectRatio: String(ratio), ...style } as CSSProperties}
    />
  );
}

export type AsideProps = ComponentPropsWithRef<"aside"> & {
  title: ReactNode;
  headingLevel?: 2 | 3 | 4;
};

/**
 * Content related to the page, beside or after its main content, such as related guidance. It is a
 * complementary landmark, named by its title, under a brand-blue rule, like GOV.UK's related links.
 */
export function Aside({ title, headingLevel = 2, className = "", children, ...props }: AsideProps) {
  const Heading = `h${headingLevel}` as const;
  const id = useId();
  return (
    <aside {...props} className={`x-govuk-ui-aside ${className}`.trim()} aria-labelledby={id}>
      <Heading id={id} className="x-govuk-ui-aside-title">
        {title}
      </Heading>
      {children}
    </aside>
  );
}

export type MarkerProps = ComponentPropsWithRef<"mark"> & {
  colour?: "yellow" | "blue" | "green" | "pink";
};

/**
 * Highlights words as a marker pen would. The highlight sweeps across them, from the start of the
 * line, the first time they scroll into view. With reduced motion, the highlight appears without
 * the sweep.
 */
export function Marker({ colour = "yellow", className = "", ...props }: MarkerProps) {
  const mark = useRef<HTMLElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const element = mark.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setDrawn(true);
        observer.disconnect();
      },
      { threshold: 1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <mark
      ref={mark}
      {...props}
      className={`x-govuk-ui-marker ${className}`.trim()}
      data-colour={colour}
      data-drawn={drawn || undefined}
    />
  );
}
