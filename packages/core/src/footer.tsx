"use client";

import { useRender } from "@base-ui/react/use-render";
import {
  Children,
  type ComponentPropsWithRef,
  type CSSProperties,
  isValidElement,
  type ReactNode,
} from "react";
import { GovukCrown } from "./logo";
import { WidthContainer } from "./width-container";

const licenceLogo = (
  <svg
    aria-hidden="true"
    focusable="false"
    className="x-govuk-ui-footer-licence-logo"
    viewBox="0 0 483.2 195.7"
    height="17"
    width="41"
  >
    <path
      fill="currentColor"
      d="M421.5 142.8V.1l-50.7 32.3v161.1h112.4v-50.7zm-122.3-9.6A47.12 47.12 0 0 1 221 97.8c0-26 21.1-47.1 47.1-47.1 16.7 0 31.4 8.7 39.7 21.8l42.7-27.2A97.63 97.63 0 0 0 268.1 0c-36.5 0-68.3 20.1-85.1 49.7A98 98 0 0 0 97.8 0C43.9 0 0 43.9 0 97.8s43.9 97.8 97.8 97.8c36.5 0 68.3-20.1 85.1-49.7a97.76 97.76 0 0 0 149.6 25.4l19.4 22.2h3v-87.8h-80l24.3 27.5zM97.8 145c-26 0-47.1-21.1-47.1-47.1s21.1-47.1 47.1-47.1 47.2 21 47.2 47S123.8 145 97.8 145"
    />
  </svg>
);

const defaultLicence = (
  <>
    All content is available under the{" "}
    <a
      className="x-govuk-ui-footer-link"
      href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
      rel="license"
    >
      Open Government Licence v3.0
    </a>
    , except where otherwise stated
  </>
);

export type FooterProps = ComponentPropsWithRef<"footer"> & {
  /**
   * Shows GOV.UK's crown at the top and the Royal Arms above Crown copyright, as GOV.UK's footer
   * does. Both are only for GOV.UK services.
   */
  crown?: boolean;
  /**
   * Where the Royal Arms image is served, as GOV.UK Frontend's `govuk-crest.svg`. GOV.UK Frontend
   * serves its images from /assets/images/.
   */
  crest?: string;
  /** The content's licence. By default, the Open Government Licence v3.0. Give null for none. */
  licence?: ReactNode;
  /** The copyright line, which links to Crown copyright's terms. */
  copyright?: ReactNode;
};

/**
 * The foot of every page, as GOV.UK's is, under a band of brand blue. In order, it shows:
 *
 * - the crown
 * - any navigation, in `FooterSection` parts, above a rule
 * - the support links, in `FooterLinks`
 * - anything else given, such as who built the service
 * - the licence, with Crown copyright under the Royal Arms at the end of the row
 */
export function Footer({
  crown = true,
  crest = "/assets/images/govuk-crest.svg",
  licence = defaultLicence,
  copyright = "© Crown copyright",
  className = "",
  style,
  children,
  ...props
}: FooterProps) {
  // Sections go in the navigation at the top. Everything else goes with the support links.
  const parts = Children.toArray(children);
  const sections = parts.filter((part) => isValidElement(part) && part.type === FooterSection);
  const rest = parts.filter((part) => !sections.includes(part));
  return (
    <footer
      {...props}
      className={`x-govuk-ui-footer ${className}`.trim()}
      style={
        crown
          ? ({ ...style, "--x-govuk-ui-footer-crest": `url("${crest}")` } as CSSProperties)
          : style
      }
    >
      <WidthContainer className="x-govuk-ui-footer-container">
        {crown && <GovukCrown className="x-govuk-ui-footer-crown" />}
        {sections.length > 0 && (
          <>
            <div className="x-govuk-ui-footer-navigation">{sections}</div>
            <hr className="x-govuk-ui-footer-break" />
          </>
        )}
        <div className="x-govuk-ui-footer-meta">
          <div className="x-govuk-ui-footer-meta-main">
            {rest}
            {licence !== null && (
              <p className="x-govuk-ui-footer-licence">
                {licenceLogo}
                <span className="x-govuk-ui-footer-licence-description">{licence}</span>
              </p>
            )}
          </div>
          <a
            className="x-govuk-ui-footer-link x-govuk-ui-footer-copyright"
            data-crest={crown || undefined}
            href="https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/"
          >
            {copyright}
          </a>
        </div>
      </WidthContainer>
    </footer>
  );
}

export type FooterSectionProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  /** The section's heading. */
  title: ReactNode;
  /**
   * The share of the footer's width it takes from tablet width up. On a phone, every section takes
   * the full width.
   */
  width?: "full" | "three-quarters" | "two-thirds" | "one-half" | "one-third" | "one-quarter";
  /** Sets its links in columns from desktop width up, as in GOV.UK's long list of topics. */
  columns?: 1 | 2 | 3;
  children: ReactNode;
};

/** A heading over a rule, and its links, for wider navigation above the support links. */
export function FooterSection({
  title,
  width = "full",
  columns = 1,
  children,
  className = "",
  ...props
}: FooterSectionProps) {
  return (
    <div {...props} className={`x-govuk-ui-footer-section ${className}`.trim()} data-width={width}>
      <h2 className="x-govuk-ui-footer-heading">{title}</h2>
      <ul className="x-govuk-ui-footer-list" data-columns={columns > 1 ? columns : undefined}>
        {children}
      </ul>
    </div>
  );
}

export type FooterLinksProps = ComponentPropsWithRef<"nav"> & { children: ReactNode };

/** The support links, such as Help, Cookies and the accessibility statement, in a row. */
export function FooterLinks({
  "aria-label": label = "Support links",
  children,
  className = "",
  ...props
}: FooterLinksProps) {
  return (
    <nav {...props} aria-label={label} className={`x-govuk-ui-footer-links ${className}`.trim()}>
      <ul className="x-govuk-ui-footer-inline-list">{children}</ul>
    </nav>
  );
}

export type FooterLinkProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  href: string;
  render?: useRender.RenderProp;
};

/** One link in a FooterSection or FooterLinks. */
export function FooterLink({ render, className = "", ...props }: FooterLinkProps) {
  const link = useRender({
    defaultTagName: "a",
    render,
    props: { ...props, className: `x-govuk-ui-footer-link ${className}`.trim() },
  });
  return <li>{link}</li>;
}
