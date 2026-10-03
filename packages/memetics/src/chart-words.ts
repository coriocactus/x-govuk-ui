/**
 * The words the charts write themselves, and how they write figures in a language. There is no
 * `"use client"`, because the charts set alone render on the server, and call these as they do.
 */

/**
 * The words the charts write themselves, instead of taking them from the figures, for a service in
 * another language, such as Welsh. Every chart takes any of them in its `labels`, and uses those it
 * needs, so one set serves every chart.
 */
export type ChartLabels = {
  /** The Details that opens a chart's table. */
  showTable: string;
  /** The Details that opens a Chart set's tables. */
  showTables: string;
  /** What a table's cell, a card's line or the key's entry says where a figure is missing. */
  noFigure: string;
  /** A range of figures, such as a heat map's class, a histogram's bin or a band of uncertainty. */
  range: (from: string, to: string) => string;
  /** A span of categories, such as the months a brush shows, given the first and the last. */
  span: (first: string, last: string) => string;
  /** A flow between two stages, as a Sankey diagram's card heads it. */
  flow: (from: string, to: string) => string;
  /** The word for a donut's whole, a waterfall's totals, and the key's name for them. */
  total: string;
  /** A waterfall's key, for a step up. */
  increase: string;
  /** A waterfall's key, for a step down. */
  decrease: string;
  /** A waterfall's card and table, for where the steps have reached. */
  runningTotal: string;
  /** A candlestick's and a slope's key, for a figure that went up. */
  rose: string;
  /** A candlestick's and a slope's key, for a figure that went down. */
  fell: string;
  /** A pie's, donut's, treemap's and sunburst's table, for each part's share of the whole. */
  share: string;
  /** A funnel's table, for each stage's share of the first, which it is given by name. */
  shareOf: (first: string) => string;
  /** A histogram's card and table, for how many figures each bin counts. */
  number: string;
  /**
   * A brush's first handle, given what the categories are, such as "Month". The chart's
   * `categoryLabel`, or else its `category`, names them.
   */
  firstShown: (category: string) => string;
  /** A brush's last handle, given what the categories are, like the first handle. */
  lastShown: (category: string) => string;
  /** A bullet chart's target, beside its figure, given the target written as a figure. */
  target: (figure: string) => string;
  /** What a gauge's meter says to screen readers, given its figures, already written out. */
  meter: (figures: { value: string; min: string; max: string; target?: string }) => string;
  /** A Sankey's table, heading where each flow comes from. */
  from: string;
  /** A Sankey's table, heading where each flow goes. */
  to: string;
  /** A calendar heat map's table, heading its rows. */
  weekBeginning: string;
  /**
   * The language the charts write their figures in by default, such as "cy" for Welsh. A calendar
   * heat map also names its months and days and writes its dates in it.
   */
  locale: string;
};

/** A heading as it is set in a sentence, so "Month" becomes "month", but "NHS trust" stays. */
const inSentence = (text: string) =>
  /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;

/** The charts' own words, in British English. */
export const chartLabels: ChartLabels = {
  showTable: "Show the figures as a table",
  showTables: "Show the figures as tables",
  noFigure: "No figure",
  range: (from, to) => `${from} to ${to}`,
  span: (first, last) => `${first} to ${last}`,
  flow: (from, to) => `${from} to ${to}`,
  total: "Total",
  increase: "Increase",
  decrease: "Decrease",
  runningTotal: "Running total",
  rose: "Rose",
  fell: "Fell",
  share: "Share",
  shareOf: (first) => `Share of ${first}`,
  number: "Number",
  firstShown: (category) => `First ${inSentence(category)} shown`,
  lastShown: (category) => `Last ${inSentence(category)} shown`,
  target: (figure) => `Target ${figure}`,
  meter: ({ value, min, max, target }) =>
    `${value}, from ${min} to ${max}${target === undefined ? "" : `, against a target of ${target}`}`,
  from: "From",
  to: "To",
  weekBeginning: "Week beginning",
  locale: "en-GB",
};

/**
 * A chart's words, which are the service's where it gives them, and the charts' own for the rest.
 * @internal
 */
export const wordsOf = (labels?: Partial<ChartLabels>): ChartLabels => ({
  ...chartLabels,
  ...labels,
});

const numbers = new Map<string, (value: number) => string>();
const percents = new Map<string, (value: number) => string>();
/**
 * A figure written as the language writes numbers, such as 1,234.5 in English, where a chart is
 * given no `format` of its own. There is one function for each language, made once, so a part that
 * depends on it is not made again at every render.
 * @internal
 */
export const plainIn = (locale: string) => {
  let known = numbers.get(locale);
  if (!known) {
    const format = new Intl.NumberFormat(locale);
    known = (value: number) => format.format(value);
    numbers.set(locale, known);
  }
  return known;
};
/**
 * A share written as the language writes a percentage, to the whole per cent, made once for each
 * language as `plainIn` is.
 * @internal
 */
export const percentIn = (locale: string) => {
  let known = percents.get(locale);
  if (!known) {
    const format = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 });
    known = (value: number) => format.format(value);
    percents.set(locale, known);
  }
  return known;
};
/** @internal */
export const plain = plainIn(chartLabels.locale);
/** @internal */
export const share = percentIn(chartLabels.locale);

/** @internal */
export const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
