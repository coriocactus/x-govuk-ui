import type { ComponentPropsWithRef } from "react";

export type InsetTextProps = ComponentPropsWithRef<"div">;

/** Sets a passage apart from the text around it, such as a quotation, an example or a suggestion. */
export function InsetText({ className = "", ...props }: InsetTextProps) {
  return <div {...props} className={`x-govuk-ui-inset-text ${className}`.trim()} />;
}
