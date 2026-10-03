"use client";

import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";
import { BackLink } from "./back-link";
import { Footer, FooterLink, FooterLinks } from "./footer";
import { Header } from "./header";
import { Link } from "./link";
import { PhaseBanner } from "./phase-banner";
import { ServiceNavigation } from "./service-navigation";
import { SkipLink } from "./skip-link";
import {
  ContentAbove,
  GridColumn,
  type GridColumnProps,
  GridRow,
  MainWrapper,
  WidthContainer,
} from "./width-container";

export type PageProps = ComponentPropsWithRef<"div"> & {
  /** The top of the page, with a Header, and any Service navigation beneath it. */
  header?: ReactNode;
  /**
   * What sits above the main content, in the width container, such as a Phase banner and then a
   * Back link or Breadcrumbs.
   */
  beforeContent?: ReactNode;
  /** The foot of the page, usually a Footer. */
  footer?: ReactNode;
  /**
   * The first link on the page. It goes to the MainWrapper by its id. Set `null` to leave it out,
   * such as where something else on the page provides one.
   */
  skipLink?: ReactNode;
  /**
   * The widest the header, content and footer grow, in pixels or as any CSS length. Every
   * WidthContainer inside follows it, so they line up. GOV.UK's is 960 pixels.
   */
  width?: number | string;
};

/**
 * GOV.UK's page template as one component. It has a skip link, the header, the content in a width
 * container, and the footer, which stays at the foot of the screen on a short page. Put the
 * content in a MainWrapper, which gives it GOV.UK's spacing above and below, with more when
 * nothing sits above it.
 */
export function Page({
  header,
  beforeContent,
  footer,
  skipLink = <SkipLink />,
  width,
  className = "",
  style,
  children,
  ...props
}: PageProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-page ${className}`.trim()}
      style={
        width === undefined
          ? style
          : ({
              ...style,
              "--x-govuk-ui-page-width": typeof width === "number" ? `${width}px` : width,
            } as CSSProperties)
      }
    >
      {skipLink}
      {header}
      <WidthContainer className="x-govuk-ui-page-body">
        {beforeContent}
        <ContentAbove value={Boolean(beforeContent)}>{children}</ContentAbove>
      </WidthContainer>
      {footer}
    </div>
  );
}

export type ServicePageLink = { label: ReactNode; href: string };

export type ServicePageProps = Omit<PageProps, "header" | "footer"> & {
  /** The service's name, in Service navigation beneath the header. */
  serviceName: ReactNode;
  serviceUrl?: string;
  /** Where the crown in the header goes. */
  homepageUrl?: string;
  /** Service navigation's links, as ServiceNavigationItem parts. */
  navigation?: ReactNode;
  /**
   * The phase banner's tag, such as "Beta" or "Alpha", for a service that is not yet live. Leave it
   * out for a live service.
   */
  phase?: ReactNode;
  /** What the phase banner says. By default, GOV.UK's words, asking for feedback. */
  phaseMessage?: ReactNode;
  /** Where the phase banner's feedback link goes. */
  feedbackUrl?: string;
  /** A Back link, by where it goes, or a part of your own in its place, such as Breadcrumbs. */
  back?: string | ReactNode;
  /** The footer's links. By default, GOV.UK's usual support links. Give an empty list for none. */
  footerLinks?: readonly ServicePageLink[];
  /**
   * How wide the content is, as a GridColumn's width, such as two-thirds, as GOV.UK's question
   * pages are, three-quarters, or the full width.
   */
  column?: GridColumnProps["width"];
};

const supportLinks: readonly ServicePageLink[] = [
  { label: "Help", href: "#help" },
  { label: "Privacy", href: "#privacy" },
  { label: "Cookies", href: "#cookies" },
  { label: "Accessibility statement", href: "#accessibility-statement" },
  { label: "Contact", href: "#contact" },
];

/**
 * A GOV.UK service's page, ready made. It has the header with the crown, Service navigation with
 * the service's name, a Phase banner and a Back link if wanted, the content in GOV.UK's two-thirds
 * column, and the footer with its support links. Put the page's own content inside, such as a
 * Form. It is Page with its usual parts filled in. For a page laid out another way, use Page.
 */
export function ServicePage({
  serviceName,
  serviceUrl = "/",
  homepageUrl = "/",
  navigation,
  phase,
  phaseMessage,
  feedbackUrl = "#feedback",
  back,
  footerLinks = supportLinks,
  column = "two-thirds",
  beforeContent,
  children,
  ...page
}: ServicePageProps) {
  const above = (phase || back || beforeContent) && (
    <>
      {phase && (
        <PhaseBanner tag={phase}>
          {phaseMessage ?? (
            <>
              This is a new service. Help us improve it and{" "}
              <Link href={feedbackUrl}>give your feedback</Link>.
            </>
          )}
        </PhaseBanner>
      )}
      {typeof back === "string" ? <BackLink href={back} /> : back}
      {beforeContent}
    </>
  );
  return (
    <Page
      {...page}
      header={
        <>
          <Header homepageUrl={homepageUrl} />
          <ServiceNavigation serviceName={serviceName} serviceUrl={serviceUrl}>
            {navigation}
          </ServiceNavigation>
        </>
      }
      beforeContent={above || undefined}
      footer={
        <Footer>
          {footerLinks.length > 0 && (
            <FooterLinks>
              {footerLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </FooterLinks>
          )}
        </Footer>
      }
    >
      <MainWrapper>
        <GridRow>
          <GridColumn width={column}>{children}</GridColumn>
        </GridRow>
      </MainWrapper>
    </Page>
  );
}
