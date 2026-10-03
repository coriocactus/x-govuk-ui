// The workbench's own identity, GOV/UK, which is a crown drawn from code brackets beside stencil
// lettering. It is a parody, not GOV.UK's logo, so the workbench can be shown outside GOV.UK.
// GOV.UK's own crown, wordmark and lock-up, which the library's Header and Footer show, are in
// src/logo.tsx. The same shapes are in site/assets/brand as files, in black and in white, and the
// favicon is the crown.

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
export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-lockup ${className}`.trim()}>
      <BrandLogo />
      <span className="brand-product" aria-hidden="true">
        UI
      </span>
    </span>
  );
}
