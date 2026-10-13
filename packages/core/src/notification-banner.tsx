"use client";

import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";
import { useMergedRef } from "./refs";

export type NotificationBannerProps = Omit<ComponentPropsWithRef<"div">, "title" | "autoFocus"> & {
  /**
   * `important` tells users about something that affects them. `success` confirms that something
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
 * appears, and takes focus. Put the message in `NotificationBannerHeading` when it is short. It is
 * a `NotificationBannerRoot` holding a `NotificationBannerHeader` with its
 * `NotificationBannerTitle`, and a `NotificationBannerContent`, which compose a banner of your own.
 */
export function NotificationBanner({
  type = "important",
  title,
  titleLevel = 2,
  children,
  ...props
}: NotificationBannerProps) {
  return (
    <NotificationBannerRoot {...props} type={type}>
      <NotificationBannerHeader>
        <NotificationBannerTitle level={titleLevel}>
          {title ?? (type === "success" ? "Success" : "Important")}
        </NotificationBannerTitle>
      </NotificationBannerHeader>
      <NotificationBannerContent>{children}</NotificationBannerContent>
    </NotificationBannerRoot>
  );
}

/** The id of a banner's title, which names the banner. */
const TitleContext = createContext<string | undefined>(undefined);

export type NotificationBannerRootProps = Omit<NotificationBannerProps, "title" | "titleLevel"> & {
  /**
   * The id of its title, which names it. Its `NotificationBannerTitle` takes the id from it. One is
   * generated when it is left out.
   */
  titleId?: string;
};

/**
 * A banner of your own. Put a `NotificationBannerHeader` in it, with its title, then a
 * `NotificationBannerContent`.
 */
export function NotificationBannerRoot({
  type = "important",
  titleId: givenTitleId,
  autoFocus = true,
  children,
  className = "",
  ref,
  ...props
}: NotificationBannerRootProps) {
  const generated = useId();
  const titleId = givenTitleId ?? generated;
  const banner = useRef<HTMLDivElement>(null);
  const success = type === "success";
  useEffect(() => {
    if (success && autoFocus) banner.current?.focus();
  }, [success, autoFocus]);
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
      <TitleContext value={titleId}>{children}</TitleContext>
    </div>
  );
}

/** A banner's coloured bar, which holds its title. */
export function NotificationBannerHeader({
  className = "",
  ...props
}: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-notification-banner-header ${className}`.trim()} />;
}

export type NotificationBannerTitleProps = ComponentPropsWithRef<"h2"> & {
  /** The title's heading level. */
  level?: 2 | 3 | 4 | 5 | 6;
};

/** A banner's title, such as Important, which names the banner. It takes its id from its banner. */
export function NotificationBannerTitle({
  level = 2,
  className = "",
  ...props
}: NotificationBannerTitleProps) {
  const titleId = useContext(TitleContext);
  const Title = `h${level}` as const;
  return (
    <Title
      {...props}
      id={props.id ?? titleId}
      className={`x-govuk-ui-notification-banner-title ${className}`.trim()}
    />
  );
}

/** A banner's message, beneath its bar. */
export function NotificationBannerContent({
  className = "",
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div {...props} className={`x-govuk-ui-notification-banner-content ${className}`.trim()} />
  );
}

/** The banner's message in bold, as GOV.UK sets a short one. */
export function NotificationBannerHeading({
  className = "",
  ...props
}: ComponentPropsWithRef<"p">) {
  return <p {...props} className={`x-govuk-ui-notification-banner-heading ${className}`.trim()} />;
}
