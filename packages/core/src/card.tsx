"use client";
import type { ComponentPropsWithRef, ReactNode } from "react";
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
