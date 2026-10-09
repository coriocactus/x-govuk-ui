"use client";

import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithRef, ReactNode } from "react";

/**
 * Lets users switch the service's language, as GOV.UK's language navigation does. Compose it from
 * `LanguageNavigationItem` parts, each written in its own language.
 */
export function LanguageNavigation({
  "aria-label": label = "Language",
  className = "",
  children,
  ...props
}: ComponentPropsWithRef<"nav">) {
  return (
    <nav
      {...props}
      aria-label={label}
      className={`x-govuk-ui-language-navigation ${className}`.trim()}
    >
      <ul className="x-govuk-ui-language-navigation-list">{children}</ul>
    </nav>
  );
}

export type LanguageNavigationItemProps = Omit<ComponentPropsWithRef<"li">, "lang" | "dir"> & {
  /** The page in this language. Leave it out for the current language. */
  href?: string;
  /** The language's code, such as "cy", which screen readers use to pronounce its name. */
  lang: string;
  /** Marks the current language, shown as text. */
  current?: boolean;
  /** Read by screen readers after the name, in the page's language, such as "(Welsh)". */
  description?: string;
  dir?: "ltr" | "rtl";
  /** Renders a router's link in place of the anchor. */
  render?: useRender.RenderProp;
  children: ReactNode;
};

/** One language, named in itself, such as Cymraeg. */
export function LanguageNavigationItem({
  href,
  lang,
  current = false,
  description,
  dir,
  render,
  children,
  className = "",
  ...props
}: LanguageNavigationItemProps) {
  const link = useRender({
    defaultTagName: "a",
    render,
    props: {
      href,
      lang,
      hrefLang: lang,
      dir,
      rel: "alternate",
      className: "x-govuk-ui-language-navigation-link",
      children: (
        <>
          {children}
          {description && <span className="x-govuk-ui-visually-hidden"> {description}</span>}
        </>
      ),
    },
  });
  return (
    <li {...props} className={`x-govuk-ui-language-navigation-item ${className}`.trim()}>
      {current || !href ? (
        <span
          className="x-govuk-ui-language-navigation-current"
          aria-current="true"
          lang={lang}
          dir={dir}
        >
          {children}
        </span>
      ) : (
        link
      )}
    </li>
  );
}
