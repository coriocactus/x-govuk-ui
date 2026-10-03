import type { ComponentPropsWithRef } from "react";

/**
 * GOV.UK's body text for content written as elements, such as a page's headings, paragraphs,
 * lists, quotations and links. It has 19 pixel text, bold headings from the second level down,
 * bullets and numbers with GOV.UK's spacing, and GOV.UK's links. Rich text and the Editor set their
 * documents in it. Its rules reach only plain elements, so the library's parts inside it keep their
 * own styles.
 */
export function Prose({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-prose ${className}`.trim()} />;
}
