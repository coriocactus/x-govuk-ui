"use client";

import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AutoHeight } from "./auto-height";
import { Button, ButtonGroup } from "./button";
import { Link } from "./link";
import { duration, useMotionTiming } from "./motion";
import { WidthContainer } from "./width-container";

export type CookieChoice = "accepted" | "rejected";

export type CookieBannerProps = Omit<HTMLMotionProps<"div">, "onChoose"> & {
  /** The service's name, as in the banner's heading, "Cookies on …". */
  serviceName?: ReactNode;
  /** Where people can read about the cookies and change their choice. */
  cookiesHref?: string;
  /** Called with the choice, so the service can save it, such as in a cookie of its own. */
  onChoose?: (choice: CookieChoice) => void;
  /** A choice made on an earlier visit. With one, the banner does not show. */
  choice?: CookieChoice | null;
};

/**
 * GOV.UK's cookie banner, which asks whether people accept analytics cookies. Once they choose, it
 * folds into a message that says what they chose, with a button to hide it. The message takes
 * focus, so screen readers hear it. Hiding the message folds the banner away.
 */
export function CookieBanner({
  serviceName = "GOV.UK",
  cookiesHref = "/help/cookies",
  onChoose,
  choice: saved = null,
  className = "",
  ...props
}: CookieBannerProps) {
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
        <motion.div
          key="banner"
          {...props}
          className={`x-govuk-ui-cookie-banner ${className}`.trim()}
          role="region"
          aria-label={`Cookies on ${typeof serviceName === "string" ? serviceName : "this service"}`}
          {...fold}
        >
          {/* The message changes at once, and the banner eases to its new height. */}
          <AutoHeight>
            {choice === null ? (
              <WidthContainer className="x-govuk-ui-cookie-banner-message">
                <h2 className="x-govuk-ui-cookie-banner-heading">Cookies on {serviceName}</h2>
                <p>We use some essential cookies to make this service work.</p>
                <p>
                  We'd also like to use analytics cookies so we can understand how you use the
                  service and make improvements.
                </p>
                <ButtonGroup>
                  <Button onClick={() => choose("accepted")}>Accept analytics cookies</Button>
                  <Button onClick={() => choose("rejected")}>Reject analytics cookies</Button>
                  <Link href={cookiesHref}>View cookies</Link>
                </ButtonGroup>
              </WidthContainer>
            ) : (
              <WidthContainer
                ref={message}
                className="x-govuk-ui-cookie-banner-message"
                role="alert"
                tabIndex={-1}
              >
                <p>
                  You've {choice} analytics cookies. You can{" "}
                  <Link href={cookiesHref}>change your cookie settings</Link> at any time.
                </p>
                <ButtonGroup>
                  <Button variant="outline" onClick={() => setHidden(true)}>
                    Hide cookie message
                  </Button>
                </ButtonGroup>
              </WidthContainer>
            )}
          </AutoHeight>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
