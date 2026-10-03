"use client";

import { type ComponentPropsWithRef, type ReactNode, useEffect, useId, useRef } from "react";
import { useMergedRef } from "./refs";

export type NotificationBannerProps = Omit<ComponentPropsWithRef<"div">, "title" | "autoFocus"> & {
  /**
   * `important` tells people about something that affects them. `success` confirms that something
   * they did has worked.
   */
  type?: "important" | "success";
  /** The banner's title. By default, Important or Success. */
  title?: ReactNode;
  /** The title's heading level. */
  titleLevel?: 2 | 3 | 4 | 5 | 6;
  /**
   * A success banner takes focus when it appears, as GOV.UK's does, so screen readers announce it.
   * Turn this off when the banner is part of the page from the start.
   */
  autoFocus?: boolean;
  children: ReactNode;
};

/**
 * GOV.UK's notification banner, with a coloured title bar over the message. An important banner is
 * a region named by its title. A success banner is an alert. It plays the success sound as it
 * appears, and takes focus. Put the message in `NotificationBannerHeading` when it is short.
 */
export function NotificationBanner({
  type = "important",
  title,
  titleLevel = 2,
  autoFocus = true,
  children,
  className = "",
  ref,
  ...props
}: NotificationBannerProps) {
  const titleId = useId();
  const banner = useRef<HTMLDivElement>(null);
  const success = type === "success";
  useEffect(() => {
    if (success && autoFocus) banner.current?.focus();
  }, [success, autoFocus]);
  const Title = `h${titleLevel}` as const;
  const mergedRef = useMergedRef(banner, ref);
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: Both of its roles, region and alert, can be named by the title.
    <div
      {...props}
      ref={mergedRef}
      className={`x-govuk-ui-notification-banner ${className}`.trim()}
      data-type={type}
      role={success ? "alert" : "region"}
      aria-labelledby={titleId}
      tabIndex={success ? -1 : undefined}
      data-sound-enter={success ? "success" : undefined}
    >
      <div className="x-govuk-ui-notification-banner-header">
        <Title id={titleId} className="x-govuk-ui-notification-banner-title">
          {title ?? (success ? "Success" : "Important")}
        </Title>
      </div>
      <div className="x-govuk-ui-notification-banner-content">{children}</div>
    </div>
  );
}

/** The banner's message in bold, as GOV.UK sets a short one. */
export function NotificationBannerHeading({
  className = "",
  ...props
}: ComponentPropsWithRef<"p">) {
  return <p {...props} className={`x-govuk-ui-notification-banner-heading ${className}`.trim()} />;
}
