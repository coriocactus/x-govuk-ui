import type { ComponentPropsWithRef, ReactNode } from "react";
import { Anchor, type AnchorProps } from "./anchor";
import { GovukLockup } from "./logo";
import { WidthContainer } from "./width-container";

export type HeaderProps = ComponentPropsWithRef<"header"> & {
  /** Where the logo goes. */
  homepageUrl?: string;
  /** A product's name after the logotype, such as Design System. */
  productName?: ReactNode;
  /**
   * Replaces the GOV.UK logo, for a government service that is not part of GOV.UK, with something
   * such as the service's own mark and name. The header is then GOV.UK's generic header, white on
   * black, because the crown and the blue are only for GOV.UK.
   */
  logo?: ReactNode;
  /** What the logo's link says to screen readers. */
  logoLabel?: string;
  /** Renders a router's link in place of the logo's anchor, keeping the header's look. */
  render?: AnchorProps["render"];
};

/**
 * The bar at the top of every page, with GOV.UK's logo, linking to its homepage, on brand blue. Put
 * a service's name and its sections in Service navigation beneath it. Given a service's own `logo`,
 * it is GOV.UK's generic header, white on black.
 */
export function Header({
  homepageUrl = "https://www.gov.uk/",
  productName,
  logo,
  logoLabel = "GOV.UK",
  render,
  className = "",
  children,
  ...props
}: HeaderProps) {
  return (
    <header
      {...props}
      className={`x-govuk-ui-header ${className}`.trim()}
      data-generic={logo ? "" : undefined}
    >
      <WidthContainer className="x-govuk-ui-header-container">
        <Anchor href={homepageUrl} render={render} className="x-govuk-ui-header-link">
          {logo ?? <GovukLockup className="x-govuk-ui-header-logo" />}
          <span className="x-govuk-ui-visually-hidden">{logoLabel}</span>
          {productName && <span className="x-govuk-ui-header-product">{productName}</span>}
        </Anchor>
        {children}
      </WidthContainer>
    </header>
  );
}
