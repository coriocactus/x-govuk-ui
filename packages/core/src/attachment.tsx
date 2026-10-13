"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { Details } from "./details";
import { useLabels } from "./labels";
import { Link, type LinkProps } from "./link";

export type AttachmentProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  title: ReactNode;
  href: string;
  /** Renders a router's link in place of the title's anchor. */
  render?: LinkProps["render"];
  /** The file's format, such as PDF or CSV, shown on its thumbnail and in its details. */
  format?: string;
  /** The file's size as it should read, such as "245 KB". */
  size?: string;
  pages?: number;
  /** A preview of the first page. Without one, the thumbnail is a page with the format on it. */
  thumbnail?: string;
  /**
   * Where to ask for an accessible format. With it, GOV.UK's notice that the file may not suit
   * assistive technology opens a request beneath.
   */
  accessibleFormatEmail?: string;
  headingLevel?: 2 | 3 | 4;
  /** Its words, in place of a LabelsProvider's or GOV.UK's. */
  labels?: Partial<AttachmentLabels>;
};

/** The words Attachment writes, which a LabelsProvider or its `labels` can change. */
export type AttachmentLabels = {
  pages: (count: number) => string;
  /** GOV.UK's notice that the file may not suit assistive technology. */
  notAccessible: ReactNode;
  /** The summary of the Details that asks for another format. */
  requestFormat: ReactNode;
  /** The Details' words, given the link to the address to write to. */
  requestHelp: (email: ReactNode) => ReactNode;
};

export const defaultAttachmentLabels: AttachmentLabels = {
  pages: (count) => `${count} ${count === 1 ? "page" : "pages"}`,
  notAccessible: "This file may not be suitable for users of assistive technology.",
  requestFormat: "Request an accessible format.",
  requestHelp: (email) => (
    <>
      If you use assistive technology, such as a screen reader, and need a version of this document
      in a more accessible format, email {email}. Tell us what format you need. It will help us if
      you say what assistive technology you use.
    </>
  ),
};

/**
 * A file users can download, listed as GOV.UK lists attachments. It shows a thumbnail of the
 * document, its title as a link, and its format, size and pages. A file that may not suit assistive
 * technology says so, in a Details that explains how to ask for an accessible format.
 */
export function Attachment({
  title,
  href,
  render,
  format,
  size,
  pages,
  thumbnail,
  accessibleFormatEmail,
  headingLevel = 3,
  className = "",
  labels: ownLabels,
  ...props
}: AttachmentProps) {
  const labels = useLabels("attachment", defaultAttachmentLabels, ownLabels);
  const Heading = `h${headingLevel}` as const;
  const facts = [format, size, pages ? labels.pages(pages) : null].filter(Boolean);
  return (
    <section {...props} className={`x-govuk-ui-attachment ${className}`.trim()}>
      {/* The thumbnail is decoration. The title is the link. */}
      <div className="x-govuk-ui-attachment-thumbnail" aria-hidden="true">
        {thumbnail ? (
          <img src={thumbnail} alt="" />
        ) : (
          <svg viewBox="0 0 84 120" aria-hidden="true">
            <path d="M2 2h56l24 24v92H2z" className="x-govuk-ui-attachment-page" />
            <path d="M58 2v24h24" className="x-govuk-ui-attachment-fold" />
            {[44, 54, 64, 74, 84].map((y) => (
              <path
                key={y}
                d={`M14 ${y}h${y === 84 ? 34 : 56}`}
                className="x-govuk-ui-attachment-line"
              />
            ))}
          </svg>
        )}
        {format && !thumbnail && (
          <span className="x-govuk-ui-attachment-format" data-format={format.toLowerCase()}>
            {format}
          </span>
        )}
      </div>
      <div className="x-govuk-ui-attachment-details">
        <Heading className="x-govuk-ui-attachment-title">
          <Link href={href} render={render}>
            {title}
          </Link>
        </Heading>
        {facts.length > 0 && <p className="x-govuk-ui-attachment-facts">{facts.join(", ")}</p>}
        {accessibleFormatEmail && (
          <>
            <p className="x-govuk-ui-attachment-facts">{labels.notAccessible}</p>
            <Details summary={labels.requestFormat}>
              {labels.requestHelp(
                <Link href={`mailto:${accessibleFormatEmail}`}>{accessibleFormatEmail}</Link>,
              )}
            </Details>
          </>
        )}
      </div>
    </section>
  );
}
