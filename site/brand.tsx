// The workbench's own identity, GOV/UK, which is a crown drawn from code brackets beside stencil
// lettering. It is a parody, not GOV.UK's logo, so the workbench can be shown outside GOV.UK.
// GOV.UK's own crown, wordmark and lock-up, which the library's Header and Footer show, are in
// src/logo.tsx. The same shapes are in site/assets/brand as files, in black and in white, and the
// favicon is the crown.

import { Tooltip } from "x-govuk-ui";

/** The library's source, which GitHub's mark on the lock-up links to. */
const repository = "https://github.com/coriocactus/x-govuk-ui";

/** The shapes of the GOV/UK crown, the wordmark's letters, and the wordmark's slash. */
export const brandPaths = {
  crown:
    "M18 10 0 28l18 18 6-6-12-12 12-12Z M28 4h8v36h-8Z M46 10l18 18-18 18-6-6 12-12-12-12Z M0 50h28l-4 10H0Z M36 50h28v10H32Z",
  wordmark:
    "M121 20l-6 7c-3-4-6-6-11-6-8 0-13 6-13 15s5 15 13 15c4 0 7-1 10-3v-8h-11v-8h20v20c-5 5-11 7-19 7-13 0-22-9-22-23s9-23 22-23c7 0 13 2 17 7Z M148 13c-12 1-19 10-19 23s7 22 19 23v-8c-7-1-10-7-10-15s3-14 10-15Z M152 13v8c7 1 10 7 10 15s-3 14-10 15v8c12-1 19-10 19-23s-7-22-19-23Z M174 14h10l11 33 11-33h10l-16 44h-10Z M244 14h9v27c0 6 2 9 7 10v8c-10-1-16-6-16-18Z M264 51c5-1 7-4 7-10V14h9v27c0 12-6 17-16 18Z M288 14h9v18l15-18h12l-19 21 20 23h-12l-16-19v19h-9Z",
  slash: "M229 14h9l-13 44h-9Z",
};

/** The GOV/UK lock-up, with the crown beside the wordmark, in the colour of the text around it. */
export function BrandLogo() {
  return (
    <svg
      className="brand-logo"
      viewBox="0 0 328 60"
      fill="currentColor"
      focusable="false"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={brandPaths.crown} />
      <path d={brandPaths.wordmark} />
      <path d={brandPaths.slash} />
    </svg>
  );
}

/**
 * The GOV/UK UI lock-up, which is the logo with UI raised beside it, its capitals level with the
 * wordmark's. Its size is --brand-height, the logo's height, which everything else follows.
 */
export function BrandLockup({
  className = "",
  source = false,
}: {
  className?: string;
  /**
   * Dots the I with GitHub's mark, as a link to the library's source. Leave it out wherever the
   * lock-up is itself a link, because a link cannot hold another.
   */
  source?: boolean;
}) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <BrandLogo />
      {source ? (
        // The link cannot be inside aria-hidden, so each letter is hidden on its own.
        <span className="brand-product">
          <span aria-hidden="true">U</span>
          <span className="brand-product-i">
            <span aria-hidden="true">I</span>
            <SourceDot />
          </span>
        </span>
      ) : (
        <span className="brand-product" aria-hidden="true">
          UI
        </span>
      )}
    </span>
  );
}

/**
 * GitHub's mark, as the dot of the I before it, linking to the library's source. The mark stands
 * a set gap above the I's capital height, whatever the typeface. workbench.css says how.
 *
 * @internal
 */
function SourceDot() {
  return (
    <span className="brand-source-anchor">
      <Tooltip content="Source on GitHub">
        <a className="brand-source" href={repository} aria-label="Source on GitHub">
          {/* GitHub's mark, from Primer's mark-github-16 octicon. */}
          <svg viewBox="0 0 16 16" fill="currentColor" focusable="false" aria-hidden="true">
            <path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" />
          </svg>
        </a>
      </Tooltip>
    </span>
  );
}
