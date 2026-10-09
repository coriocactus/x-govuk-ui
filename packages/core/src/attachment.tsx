"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { Details } from "./details";
import { Link } from "./link";

export type AttachmentProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  title: ReactNode;
  href: string;
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
};

/**
 * A file users can download, listed as GOV.UK lists attachments. It shows a thumbnail of the
 * document, its title as a link, and its format, size and pages. A file that may not suit assistive
 * technology says so, in a Details that explains how to ask for an accessible format.
 */
export function Attachment({
  title,
  href,
  format,
  size,
  pages,
  thumbnail,
  accessibleFormatEmail,
  headingLevel = 3,
  className = "",
  ...props
}: AttachmentProps) {
  const Heading = `h${headingLevel}` as const;
  const facts = [format, size, pages ? `${pages} ${pages === 1 ? "page" : "pages"}` : null].filter(
    Boolean,
  );
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
          <Link href={href}>{title}</Link>
        </Heading>
        {facts.length > 0 && <p className="x-govuk-ui-attachment-facts">{facts.join(", ")}</p>}
        {accessibleFormatEmail && (
          <>
            <p className="x-govuk-ui-attachment-facts">
              This file may not be suitable for users of assistive technology.
            </p>
            <Details summary="Request an accessible format.">
              If you use assistive technology, such as a screen reader, and need a version of this
              document in a more accessible format, email{" "}
              <Link href={`mailto:${accessibleFormatEmail}`}>{accessibleFormatEmail}</Link>. Tell us
              what format you need. It will help us if you say what assistive technology you use.
            </Details>
          </>
        )}
      </div>
    </section>
  );
}
