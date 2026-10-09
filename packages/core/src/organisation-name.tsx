"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef, CSSProperties } from "react";

export type OrganisationNameProps = ComponentPropsWithRef<"span"> & {
  /**
   * The colour of the bar beside the name, such as a department's own, as GOV.UK Frontend's
   * `govuk-organisation-colour` gives it. By default, the colour of the words.
   */
  colour?: string;
  /**
   * Where the Royal Arms image is served, such as GOV.UK Frontend's `govuk-crest.svg`, to sit above
   * the name, as a department's lock-up has it. The library ships none.
   */
  crest?: string;
  /**
   * How large it is set. `medium` is the size of GOV.UK's organisation logo, for a page's header.
   * `small` suits a sidebar or a footer, with the name at 15 pixels and a smaller Royal Arms.
   */
  size?: "medium" | "small";
  /** A link for the name, such as to the organisation's page, as an element or a function. */
  render?: useRender.RenderProp;
};

/**
 * An organisation's name as GOV.UK's organisation logo sets one without an image. The name is in
 * the regular weight, beside a bar of its colour. When given the Royal Arms, it sits under them,
 * in the words' colour, as in a department's lock-up. It suits a header, or at its small size a
 * footer or a sidebar. Logo carousel uses it to name an organisation that has no logo.
 */
export function OrganisationName({
  colour,
  crest,
  size = "medium",
  render,
  className = "",
  style,
  ...props
}: OrganisationNameProps) {
  return useRender({
    defaultTagName: "span",
    render,
    props: {
      ...props,
      className: `x-govuk-ui-organisation-name ${className}`.trim(),
      "data-crest": crest ? "" : undefined,
      "data-size": size,
      style: {
        ...style,
        ...(colour ? { "--x-govuk-ui-organisation-colour": colour } : {}),
        ...(crest ? { "--x-govuk-ui-organisation-crest": `url("${crest}")` } : {}),
      } as CSSProperties,
    },
  });
}
