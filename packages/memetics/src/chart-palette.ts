/**
 * The charts' colours, as CSS custom properties that `palette.css` sets for each theme. There is no
 * `"use client"`, because the charts set alone render on the server, and call these as they do.
 */

/** A series' place among the palette's six colours, from 1, going round again after the sixth. */
const slot = (index: number) => (((index % 6) + 6) % 6) + 1;
/**
 * The Government Analysis Function's categorical palette, as `palette.css` sets it.
 * @internal
 */
export const colour = (index: number) => `var(--x-govuk-ui-chart-${slot(index)})`;
/**
 * A palette colour for text on the paper, darkened where the colour itself contrasts too little.
 * @internal
 */
export const inkOf = (index: number) => `var(--x-govuk-ui-chart-ink-${slot(index)})`;
/**
 * Text that reads on a palette colour, which is white on the dark ones and the page's ink on the
 * light ones.
 * @internal
 */
export const onColour = (index: number) => `var(--x-govuk-ui-chart-on-${slot(index)})`;
/**
 * The grey that sets everything but the focus back, as the Analysis Function's focus charts do.
 * @internal
 */
export const muted = "var(--x-govuk-ui-chart-muted)";
