/**
 * The modules a composition may import, by the names it imports them by. They are React, the
 * library, its charts and the workspace's data. The server compiles a composition only if it
 * imports nothing else, and the page gives it these modules as it loads.
 */
export const composable = [
  "react",
  "react/jsx-runtime",
  "x-govuk-ui",
  "@x-govuk-ui/memetics",
  "../workspace-data",
] as const;

export type Composable = (typeof composable)[number];
