import { Fragment, type ReactNode, useEffect } from "react";
import { SoundScope, ThemePicker, TooltipGroup, TooltipProvider, useSound } from "x-govuk-ui";
import { useStoredState } from "../packages/core/src/stored-state";
import { BrandLockup } from "./brand";

type SiteLink = { label: string; href: string };

/**
 * The site's own pages share one layout. It has the GOV/UK UI lock-up, large in the middle of the
 * window, the page's heading, a message if it has one, and links beneath. On the front page, the
 * theme comes after the first link, and GitHub's mark dots the lock-up's I. A page without the
 * theme picker still opens in the chosen theme, which index.html sets before the page is drawn.
 *
 * The heading names the page for screen readers and in the window's title. It shows unless the
 * lock-up already says it. The front page's heading is the mark's own words, GOV/UK UI. The pages
 * share the workbench's sounds, and its mute, kept in this browser.
 */
function SitePage({
  heading,
  showHeading = true,
  message,
  links,
  theme = false,
  source = false,
}: {
  heading: string;
  showHeading?: boolean;
  message?: ReactNode;
  links: readonly SiteLink[];
  /** Whether the theme picker follows the first link. */
  theme?: boolean;
  /** Whether GitHub's mark dots the lock-up's I, as a link to the source. */
  source?: boolean;
}) {
  // Whether the sounds are muted, as chosen on any page of the site.
  const [muted] = useStoredState("x-govuk-ui-muted", false);
  const play = useSound({ muted });
  useEffect(() => {
    document.title = heading;
  }, [heading]);
  return (
    <SoundScope play={play}>
      <TooltipProvider>
        <main className="home">
          <BrandLockup className="home-lockup" source={source} />
          <h1 className={showHeading ? "home-heading" : "visually-hidden"}>{heading}</h1>
          {message && <p className="home-note">{message}</p>}
          <nav className="home-links" aria-label="x-govuk-ui">
            {links.map((link, index) => (
              <Fragment key={link.href}>
                <a href={link.href}>{link.label}</a>
                {theme && index === 0 && (
                  // Its tooltips open below, away from the lock-up above it. The theme is also the
                  // workbench's, kept in this browser.
                  <TooltipGroup side="bottom">
                    <ThemePicker storageKey="x-govuk-ui-theme" />
                  </TooltipGroup>
                )}
              </Fragment>
            ))}
          </nav>
        </main>
      </TooltipProvider>
    </SoundScope>
  );
}

const home: SiteLink = { label: "home", href: "/" };

/** The site's front page, leading to the workbench and the workspace. */
export function Home() {
  return (
    <SitePage
      heading="GOV/UK UI"
      showHeading={false}
      theme
      source
      links={[
        { label: "workbench", href: "/workbench" },
        { label: "workspace", href: "/workspace" },
      ]}
    />
  );
}

/** Any address the site does not have. */
export function NotFound() {
  return <SitePage heading="Page not found" links={[home]} />;
}
