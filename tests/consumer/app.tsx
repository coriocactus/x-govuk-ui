/*
 * A service's own code, as it meets the packages' published types. `scripts/consumer.ts` checks it
 * against each package's build, without the repository's links to the source. What only the source
 * shows, such as an extension's words that never reach its build's types, fails here.
 */

import { Tiles } from "@x-govuk-ui/belsize";
import { Editor } from "@x-govuk-ui/jorjorwel";
import { Chart } from "@x-govuk-ui/memetics";
import { defaultPaginationLabels, type Labels, LabelsProvider, useLabels } from "x-govuk-ui";

/** Every package's words, in one provider, as a Welsh service gives them. */
export const welsh: Labels = {
  locale: "cy",
  pagination: { previous: "Blaenorol" },
  chart: { showTable: "Dangos y tabl" },
  tiles: { tidy: "Tacluso'r teils" },
  editor: { bold: "Trwm" },
};

export function Page() {
  // A component of the service's own takes its words the same way.
  const { previous } = useLabels("pagination", defaultPaginationLabels);
  return (
    <LabelsProvider labels={welsh}>
      <p>{previous}</p>
      {[Editor, Chart, Tiles].length}
    </LabelsProvider>
  );
}

// A component that does not exist has no words.
// @ts-expect-error
export const nowhere: Labels = { nothing: {} };

// The page's language is the provider's own `locale`, not the charts'.
// @ts-expect-error
export const twice: Labels = { chart: { locale: "cy" } };
