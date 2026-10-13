"use client";

import { useMemo } from "react";
import { useLabels, useLocale } from "x-govuk-ui";
import { type ChartLabels, defaultChartLabels } from "./chart-words";

const { locale: _english, ...chartWords } = defaultChartLabels;

/**
 * A chart's words, from its own `labels`, then a LabelsProvider's `chart` words, then the charts'
 * own. Its language is its own `locale`, then the provider's `locale`. The charts set alone render
 * on the server, where no provider reaches, so they take their words from `labels` only.
 * @internal
 */
export function useChartLabels(own?: Partial<ChartLabels>): ChartLabels {
  const { locale: ownLocale, ...ownWords } = own ?? {};
  const words = useLabels("chart", chartWords, ownWords);
  const pageLocale = useLocale();
  const locale = ownLocale ?? pageLocale;
  return useMemo(() => ({ ...words, locale }), [words, locale]);
}
