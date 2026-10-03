import type { ComponentPropsWithRef, CSSProperties } from "react";
import { colour } from "./chart-palette";
import { type ChartLabels, chartLabels, percentIn, plainIn } from "./chart-words";

export type WafflePart = { label: string; value: number };

export type WaffleProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** The parts of the whole, each in the next colour. */
  data: readonly WafflePart[];
  /**
   * The whole, where it is more than the parts, such as everyone asked when only some answered.
   * The cells beyond the parts stay empty. By default, the parts make the whole.
   */
  total?: number;
  /** How many rows of cells. */
  rows?: number;
  /** How many cells in a row. */
  columns?: number;
  /**
   * Writes each part's figure in the key, such as "4,200". By default, as the `labels`' language
   * writes numbers.
   */
  format?: (value: number) => string;
  /** The language the waffle writes its figures and shares in, such as `{ locale: "cy" }`. */
  labels?: Partial<Pick<ChartLabels, "locale">>;
};

/**
 * Each part's number of cells, in proportion to its figure, by the largest remainder method. Each
 * part takes its whole cells. Then the parts with the largest fractions take one more each, until
 * the parts fill their share of the grid. The cells therefore always add up, and no part gains or
 * loses more than one cell by rounding.
 */
export function waffleCells(values: readonly number[], whole: number, cells: number) {
  const exact = values.map((value) => (Math.max(0, value) / (whole || 1)) * cells);
  const counts = exact.map(Math.floor);
  const filled = Math.min(cells, Math.round(exact.reduce((sum, value) => sum + value, 0)));
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);
  for (let given = counts.reduce((a, b) => a + b, 0), next = 0; given < filled; given++, next++)
    counts[order[next % order.length]?.index ?? 0] += 1;
  return counts;
}

/**
 * Parts of a whole as a grid of cells, a hundred by default, so each cell is one in a hundred, as
 * ONS shows "1 in 4". The key beside the grid names each part with its figure and its share. The
 * words then say what the colours show, and screen readers hear only the key. The grid sits beside
 * the key while there is space, and above it when there is not. Its cells fill in, in reading
 * order, as it first shows, unless motion is reduced.
 */
export function Waffle({
  data,
  total,
  rows = 10,
  columns = 10,
  format: ownFormat,
  labels,
  className = "",
  style,
  ...props
}: WaffleProps) {
  const locale = labels?.locale ?? chartLabels.locale;
  const format = ownFormat ?? plainIn(locale);
  const share = percentIn(locale);
  const sum = data.reduce((all, part) => all + Math.max(0, part.value), 0);
  const whole = Math.max(total ?? sum, sum);
  const counts = waffleCells(
    data.map((part) => part.value),
    whole,
    rows * columns,
  );
  // Each cell's part, in reading order, and null for the cells beyond the parts.
  const filled = counts.flatMap((count, part) => Array.from({ length: count }, () => part));
  const cells = Array.from({ length: rows * columns }, (_, index) => filled[index] ?? null);
  return (
    <div
      {...props}
      className={`x-govuk-ui-waffle ${className}`.trim()}
      style={{ "--x-govuk-ui-waffle-columns": columns, ...style } as CSSProperties}
    >
      {/* The body lays out the grid and the key by the space the waffle has. The waffle is the
          container, so it cannot query its own size. */}
      <div className="x-govuk-ui-waffle-body">
        <div className="x-govuk-ui-waffle-grid" aria-hidden="true">
          {cells.map((part, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: A cell has only its place in the grid.
              key={index}
              className="x-govuk-ui-waffle-cell"
              data-empty={part === null || undefined}
              style={
                {
                  "--x-govuk-ui-waffle-index": index,
                  background: part === null ? undefined : colour(part),
                } as CSSProperties
              }
            />
          ))}
        </div>
        <ul className="x-govuk-ui-waffle-key">
          {data.map((part, index) => (
            <li key={part.label}>
              <span
                className="x-govuk-ui-waffle-swatch"
                style={{ background: colour(index) }}
                aria-hidden="true"
              />
              <span className="x-govuk-ui-waffle-label">{part.label}</span>
              <span className="x-govuk-ui-waffle-figure">
                {format(part.value)}
                {/* A share of nothing would be made up, so a whole of zero gives no share. */}
                {whole > 0 && (
                  <>
                    {" "}
                    <span className="x-govuk-ui-waffle-share">({share(part.value / whole)})</span>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
