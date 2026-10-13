"use client";

import type { ComponentPropsWithRef, CSSProperties, ReactNode } from "react";
import type { AnchorProps } from "./anchor";
import { BackLink } from "./back-link";
import { Footer, FooterLinks, type FooterProps } from "./footer";
import { Header } from "./header";
import { useLabels } from "./labels";
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

export type ServicePageProps = PageProps & {
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
  /**
   * What the phase banner says. By default, given a `feedbackUrl`, its `phase` label, which asks for
   * feedback there.
   */
  phaseMessage?: ReactNode;
  /**
   * Where the phase banner's feedback link goes. GOV.UK asks every service in a phase for feedback,
   * so give it, or a `phaseMessage` of your own. Without either, the banner shows only its tag.
   */
  feedbackUrl?: string;
  /** A Back link, by where it goes, or a part of your own in its place, such as Breadcrumbs. */
  back?: string | ReactNode;
  /**
   * The footer's support links, as FooterLink parts, such as Help, Cookies and the accessibility
   * statement. GOV.UK asks every service for these, at addresses of its own.
   */
  footerLinks?: ReactNode;
  /**
   * Where the footer's Royal Arms image is served, as Footer's `crest` is. Without it, Crown
   * copyright stands without the Royal Arms.
   */
  crest?: FooterProps["crest"];
  /**
   * Renders a router's link in place of each link the page makes for you, which are the header's,
   * the service's name, the Back link and the phase banner's feedback link.
   */
  render?: AnchorProps["render"];
  /**
   * How wide the content is, as a GridColumn's width, such as two-thirds, as GOV.UK's question
   * pages are, three-quarters, or the full width.
   */
  column?: GridColumnProps["width"];
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<ServicePageLabels>;
};

/** The words Service page writes, which a LabelsProvider or its `labels` can change. */
export type ServicePageLabels = {
  /** The phase banner's message, around its feedback link. */
  phase: (feedback: ReactNode) => ReactNode;
  /** The phase banner's feedback link. */
  feedback: string;
};

export const defaultServicePageLabels: ServicePageLabels = {
  phase: (feedback) => <>This is a new service. Help us improve it and {feedback}.</>,
  feedback: "give your feedback",
};

/**
 * A GOV.UK service's page, ready made. It has the header with the crown, Service navigation with
 * the service's name, a Phase banner and a Back link if wanted, the content in GOV.UK's two-thirds
 * column, and the footer with the service's support links. Put the page's own content inside, such
 * as a Form. It is Page with its usual parts filled in. Give `header` or `footer` to replace one of
 * them. For a page laid out another way, use Page.
 */
export function ServicePage({
  serviceName,
  serviceUrl = "/",
  homepageUrl = "/",
  navigation,
  phase,
  phaseMessage,
  feedbackUrl,
  back,
  footerLinks,
  crest,
  render,
  column = "two-thirds",
  beforeContent,
  header,
  footer,
  labels: ownLabels,
  children,
  ...page
}: ServicePageProps) {
  const labels = useLabels("servicePage", defaultServicePageLabels, ownLabels);
  const above = (phase || back || beforeContent) && (
    <>
      {phase && (
        <PhaseBanner tag={phase}>
          {phaseMessage ??
            (feedbackUrl !== undefined &&
              labels.phase(
                <Link href={feedbackUrl} render={render}>
                  {labels.feedback}
                </Link>,
              ))}
        </PhaseBanner>
      )}
      {typeof back === "string" ? <BackLink href={back} render={render} /> : back}
      {beforeContent}
    </>
  );
  return (
    <Page
      {...page}
      header={
        header ?? (
          <>
            <Header homepageUrl={homepageUrl} render={render} />
            <ServiceNavigation
              serviceName={serviceName}
              serviceUrl={serviceUrl}
              serviceRender={render}
            >
              {navigation}
            </ServiceNavigation>
          </>
        )
      }
      beforeContent={above || undefined}
      footer={
        footer ?? (
          <Footer crest={crest}>{footerLinks && <FooterLinks>{footerLinks}</FooterLinks>}</Footer>
        )
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
