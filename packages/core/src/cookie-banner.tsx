"use client";

import { AnimatePresence } from "motion/react";
import { type ComponentPropsWithRef, type ReactNode, useEffect, useRef, useState } from "react";
import { AutoHeight } from "./auto-height";
import { Button, ButtonGroup } from "./button";
import { useLabels } from "./labels";
import { Link } from "./link";
import { duration, MotionDiv, motionElementProps, useMotionTiming } from "./motion";
import { WidthContainer } from "./width-container";

export type CookieChoice = "accepted" | "rejected";

export type CookieBannerProps = Omit<ComponentPropsWithRef<"div">, "onChoose"> & {
  /** The service's name, as in the banner's heading, "Cookies on …". */
  serviceName?: ReactNode;
  /** Where users can read about the cookies and change their choice. */
  cookiesHref?: string;
  /** Called with the choice, so the service can save it, such as in a cookie of its own. */
  onChoose?: (choice: CookieChoice) => void;
  /** A choice made on an earlier visit. With one, the banner does not show. */
  choice?: CookieChoice | null;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<CookieBannerLabels>;
};

/** The words Cookie banner writes, which a LabelsProvider or its `labels` can change. */
export type CookieBannerLabels = {
  /** The service's name, unless the banner is given one. */
  serviceName: ReactNode;
  heading: (serviceName: ReactNode) => ReactNode;
  /** Names the banner for screen readers, from the service's name when it is text. */
  region: (serviceName: string | null) => string;
  /** What the banner says about the cookies, before its buttons. */
  message: ReactNode;
  accept: ReactNode;
  reject: ReactNode;
  view: ReactNode;
  /** Says what users chose, around the link to change it. */
  chosen: (choice: CookieChoice, change: ReactNode) => ReactNode;
  change: ReactNode;
  hide: ReactNode;
};

export const defaultCookieBannerLabels: CookieBannerLabels = {
  serviceName: "GOV.UK",
  heading: (serviceName) => <>Cookies on {serviceName}</>,
  region: (serviceName) => `Cookies on ${serviceName ?? "this service"}`,
  message: (
    <>
      <p>We use some essential cookies to make this service work.</p>
      <p>
        We'd also like to use analytics cookies so we can understand how you use the service and
        make improvements.
      </p>
    </>
  ),
  accept: "Accept analytics cookies",
  reject: "Reject analytics cookies",
  view: "View cookies",
  chosen: (choice, change) => (
    <>
      You've {choice} analytics cookies. You can {change} at any time.
    </>
  ),
  change: "change your cookie settings",
  hide: "Hide cookie message",
};

/**
 * GOV.UK's cookie banner, which asks whether users accept analytics cookies. Once they choose, it
 * folds into a message that says what they chose, with a button to hide it. The message takes
 * focus, so screen readers hear it. Hiding the message folds the banner away.
 */
export function CookieBanner({
  serviceName: ownServiceName,
  cookiesHref = "/help/cookies",
  onChoose,
  choice: saved = null,
  labels: ownLabels,
  className = "",
  ...props
}: CookieBannerProps) {
  const labels = useLabels("cookieBanner", defaultCookieBannerLabels, ownLabels);
  const serviceName = ownServiceName ?? labels.serviceName;
  const [choice, setChoice] = useState<CookieChoice | null>(null);
  const [hidden, setHidden] = useState(saved !== null);
  const message = useRef<HTMLDivElement>(null);
  const timing = useMotionTiming();
  const fold = {
    initial: { height: 0, opacity: 0 },
    animate: { height: "auto", opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: timing.ease(duration.slow),
  };
  useEffect(() => {
    if (choice) message.current?.focus();
  }, [choice]);
  const choose = (next: CookieChoice) => {
    setChoice(next);
    onChoose?.(next);
  };

  return (
    <AnimatePresence initial={false}>
      {!hidden && (
        <MotionDiv
          key="banner"
          {...motionElementProps(props)}
          className={`x-govuk-ui-cookie-banner ${className}`.trim()}
          role="region"
          aria-label={labels.region(typeof serviceName === "string" ? serviceName : null)}
          {...fold}
        >
          {/* The message changes at once, and the banner eases to its new height. */}
          <AutoHeight>
            {choice === null ? (
              <WidthContainer className="x-govuk-ui-cookie-banner-message">
                <h2 className="x-govuk-ui-cookie-banner-heading">{labels.heading(serviceName)}</h2>
                {labels.message}
                <ButtonGroup>
                  <Button onClick={() => choose("accepted")}>{labels.accept}</Button>
                  <Button onClick={() => choose("rejected")}>{labels.reject}</Button>
                  <Link href={cookiesHref}>{labels.view}</Link>
                </ButtonGroup>
              </WidthContainer>
            ) : (
              <WidthContainer
                ref={message}
                className="x-govuk-ui-cookie-banner-message"
                role="alert"
                tabIndex={-1}
              >
                <p>{labels.chosen(choice, <Link href={cookiesHref}>{labels.change}</Link>)}</p>
                <ButtonGroup>
                  <Button variant="outline" onClick={() => setHidden(true)}>
                    {labels.hide}
                  </Button>
                </ButtonGroup>
              </WidthContainer>
            )}
          </AutoHeight>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
