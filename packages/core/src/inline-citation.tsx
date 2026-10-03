"use client";

import { Popover as Primitive } from "@base-ui/react/popover";
import { useRender } from "@base-ui/react/use-render";
import { type ComponentPropsWithRef, type ReactNode, useState } from "react";
import { Button } from "./button";
import { directionOf } from "./helpers";
import { GovukCrown } from "./logo";
import { useOverlaySound } from "./overlay";

export type CitationSource = {
  title: string;
  /** A line on where in the source the claim comes from, such as "Pages 3 to 5". */
  detail?: ReactNode;
  /** A router's link for the title, as an element or a function given the link's props. */
  render?: useRender.RenderProp;
  /** A line or two on what the source says. */
  description?: ReactNode;
  /** When the source was published or updated, such as "Updated 3 March 2026". */
  date?: ReactNode;
  /** The site's mark, in place of the crown or the site's initial. */
  icon?: ReactNode;
  /**
   * Marks the source with GOV.UK's crown, as a GOV.UK page or service. By default, a source on a
   * gov.uk address has the crown, and any other source has its site's initial.
   */
  crown?: boolean;
} & (
  | {
      url: string;
      /** The site's name, such as GOV.UK. By default, its address. */
      site?: string;
    }
  | {
      /** A source with no address of its own, such as a passage from a document uploaded. */
      url?: undefined;
      /** Where it is, such as "Your documents", because there is no address to name it by. */
      site: string;
    }
);

// The pill is a button, and the button takes the other props.
export type InlineCitationProps = ComponentPropsWithRef<"button"> & {
  /** The sources behind the claim. Several stack in one pill, and the card steps through them. */
  sources: readonly CitationSource[];
  /** Classes for the pill. */
  className?: string;
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const siteOf = (source: CitationSource) => source.site ?? hostOf(source.url ?? "");

// Initials take one of GOV.UK's colours, the same one for a site every time.
const tints = ["blue", "teal", "purple", "green", "magenta", "red"];
function SiteMark({ source }: { source: CitationSource }) {
  // The mark is decoration. The site's name is always beside it.
  if (source.icon)
    return (
      <span className="x-govuk-ui-citation-mark" aria-hidden="true">
        {source.icon}
      </span>
    );
  if (source.crown ?? (source.url !== undefined && hostOf(source.url).endsWith("gov.uk")))
    return (
      <span className="x-govuk-ui-citation-mark" aria-hidden="true">
        <GovukCrown />
      </span>
    );
  const site = siteOf(source);
  const tint =
    tints[[...site].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % tints.length];
  return (
    <span className="x-govuk-ui-citation-mark" data-tint={tint} aria-hidden="true">
      {site.charAt(0).toUpperCase()}
    </span>
  );
}

/** The source's title, as a link to it, or as its name alone when it has no address. */
function CitationTitle({ source }: { source: CitationSource }) {
  const plain = source.url === undefined;
  return useRender({
    defaultTagName: plain ? "span" : "a",
    render: plain ? undefined : source.render,
    props: {
      href: source.url,
      className: "x-govuk-ui-citation-title",
      "data-plain": plain ? "" : undefined,
      children: source.title,
    },
  });
}

const arrow = (path: string) => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

/**
 * A small pill after a claim, naming the site it comes from, such as an assistant's answer citing
 * a GOV.UK page. Several sources stack in one pill, as "GOV.UK +2". Resting on the pill, or
 * pressing it, opens a card with each source's site, title, summary and date. Arrows step through
 * a stack, and each source slides in from its side. The card is a Base UI Popover, so it also opens
 * from the keyboard, and focus moves into it. In the card, each title is a link to its source.
 */
export function InlineCitation({ sources, className = "", ...props }: InlineCitationProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const sound = useOverlaySound();
  const first = sources[0];
  const shown = sources[index] ?? first;
  if (!first || !shown) return null;
  const more = sources.length - 1;
  const step = (by: number) => {
    setDirection(by);
    setIndex((current) => (current + by + sources.length) % sources.length);
  };
  const site = siteOf(first);

  return (
    <Primitive.Root
      onOpenChange={(open, details) => {
        sound(open, details.reason);
        // Each opening starts at the first source.
        if (open) {
          setIndex(0);
          setDirection(0);
        }
      }}
    >
      <Primitive.Trigger
        {...props}
        openOnHover
        delay={200}
        className={`x-govuk-ui-citation ${className}`.trim()}
        data-copy="skip"
        aria-label={more ? `Sources: ${site} and ${more} more` : `Source: ${site}`}
      >
        <SiteMark source={first} />
        <span className="x-govuk-ui-citation-site">{site}</span>
        {more > 0 && <span className="x-govuk-ui-citation-more">+{more}</span>}
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Positioner
          className="x-govuk-ui-floating-positioner"
          side="bottom"
          align="center"
          sideOffset={8}
          collisionPadding={8}
        >
          <Primitive.Popup
            className="x-govuk-ui-floating x-govuk-ui-citation-card"
            aria-label={more ? "Sources" : "Source"}
            // Focus moves in when the card opens from the keyboard or a touch, not from hovering.
            initialFocus={(type) => type !== "mouse"}
          >
            {more > 0 && (
              <div className="x-govuk-ui-citation-nav">
                <Button
                  variant="quiet"
                  size="small-icon"
                  aria-label="Previous source"
                  onClick={() => step(-1)}
                >
                  {arrow("m10 3-5 5 5 5")}
                </Button>
                <Button
                  variant="quiet"
                  size="small-icon"
                  aria-label="Next source"
                  onClick={() => step(1)}
                >
                  {arrow("m6 3 5 5-5 5")}
                </Button>
                <span className="x-govuk-ui-citation-count" aria-live="polite">
                  <span className="x-govuk-ui-visually-hidden">Source </span>
                  {index + 1}
                  <span aria-hidden="true">/</span>
                  <span className="x-govuk-ui-visually-hidden"> of </span>
                  {sources.length}
                </span>
              </div>
            )}
            <div
              key={index}
              className="x-govuk-ui-citation-source"
              data-direction={directionOf(direction)}
            >
              <span className="x-govuk-ui-citation-from">
                <SiteMark source={shown} />
                {siteOf(shown)}
              </span>
              <CitationTitle source={shown} />
              {shown.detail && <span className="x-govuk-ui-citation-detail">{shown.detail}</span>}
              {shown.description && (
                <span className="x-govuk-ui-citation-description">{shown.description}</span>
              )}
              {shown.date && <span className="x-govuk-ui-citation-date">{shown.date}</span>}
            </div>
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
