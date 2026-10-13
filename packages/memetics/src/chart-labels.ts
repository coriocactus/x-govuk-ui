"use client";

import { useLabels, useLocale } from "x-govuk-ui";
import { type ChartLabels, chartLabels } from "./chart-words";

declare module "x-govuk-ui" {
  /** The charts' words, which a LabelsProvider or a chart's `labels` can change. */
  interface ComponentLabels {
    chart: ChartLabels;
  }
}

/**
 * A chart's words, from its own `labels`, then a LabelsProvider's `chart` words, then the charts'
 * own. Its language is its own `locale`, then the provider's `chart` locale, then the provider's
 * `locale`. The charts set alone render on the server, where no provider reaches, so they take
 * their words from `labels` only.
 * @internal
 */
export function useChartLabels(own?: Partial<ChartLabels>): ChartLabels {
  const given = useLabels("chart", {} as ChartLabels);
  const locale = useLocale();
  return {
    ...chartLabels,
    ...given,
    ...own,
    locale: own?.locale ?? given.locale ?? locale,
  };
}
