import type { ComponentPropsWithRef, ReactNode } from "react";
import { Figure, FigureCaption, type FigureProps, FigureSource } from "./figure";

export type StatChange = {
  /** How much the figure moved, written as it should read, such as "400 (22%)". */
  value: ReactNode;
  /** Which way it moved. `flat` shows no arrow. */
  direction: "up" | "down" | "flat";
  /**
   * Whether the move is good news, bad news, or neither. `good` is GOV.UK's green and `bad` its
   * red. The arrow and the words say it too, so colour is never the only sign.
   */
  sentiment?: "good" | "bad" | "neutral";
};

export type StatProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  /** What the figure counts, above it, such as "Applications this week". */
  label: ReactNode;
  /** The figure itself, written as it should read, such as "4,200" or "£1.2m". */
  value: ReactNode;
  /** A line beneath the figure, such as the period it covers, or what it compares with. */
  description?: ReactNode;
  /** How the figure has moved since the last period, beneath it, with an arrow. */
  change?: StatChange;
  /** An icon or a small picture beside the figure. */
  icon?: ReactNode;
  /** The words screen readers hear before a change, for another language. */
  labels?: Partial<StatLabels>;
};

/** The words a stat says to screen readers before its change, as its arrow shows it. */
export type StatLabels = {
  /** Before a rise, such as "Up by". */
  up: string;
  /** Before a fall, such as "Down by". */
  down: string;
  /** Before a change that is neither, such as "Change". */
  flat: string;
};

const arrows = {
  up: "M3 9.5 9.5 3M9.5 3H5M9.5 3v4.5",
  down: "M3 3l6.5 6.5M9.5 9.5H5M9.5 9.5V5",
};
const moved: StatLabels = { up: "Up by", down: "Down by", flat: "Change" };

/**
 * One figure that matters, with what it counts above it and how it has moved beneath, as a
 * dashboard shows the week's applications or the money paid out. The figure is large and bold, in
 * tabular numerals. The label and description are quiet. A change has an arrow and its meaning in
 * words, in GOV.UK's green or red when it is good or bad news. The stat's words are a description
 * list, so screen readers hear the label as a term and the figure as its description. Put several
 * in a Stats.
 */
export function Stat({
  label,
  value,
  description,
  change,
  icon,
  labels,
  className = "",
  ...props
}: StatProps) {
  const words = { ...moved, ...labels };
  return (
    <div {...props} className={`x-govuk-ui-stat ${className}`.trim()}>
      {/* The body lays out the words and the icon by the space the stat has. The stat itself is
          the container, so it cannot query its own size. */}
      <div className="x-govuk-ui-stat-body">
        <dl className="x-govuk-ui-stat-words">
          <dt className="x-govuk-ui-stat-label">{label}</dt>
          <dd className="x-govuk-ui-stat-value">{value}</dd>
          {description && <dd className="x-govuk-ui-stat-description">{description}</dd>}
          {change && (
            <dd
              className="x-govuk-ui-stat-change"
              data-direction={change.direction}
              data-sentiment={change.sentiment ?? "neutral"}
            >
              {change.direction !== "flat" && (
                <svg
                  viewBox="0 0 12 12"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={arrows[change.direction]} />
                </svg>
              )}
              <span className="x-govuk-ui-visually-hidden">{words[change.direction]} </span>
              {change.value}
            </dd>
          )}
        </dl>
        {icon && (
          <span className="x-govuk-ui-stat-icon" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export type StatsProps = Omit<FigureProps, "title"> & {
  /** Says what the figures show, as a headline under a short rule in brand blue, like a Chart's. */
  title?: ReactNode;
  /** What is measured, and when, such as "Rod fishing licences, week to 4 October". */
  subtitle?: ReactNode;
  /** Where the figures come from, at the foot. */
  source?: ReactNode;
  /** A row of stats, which wraps into more rows as space runs out, or a column. */
  orientation?: "horizontal" | "vertical";
  /** Centres each stat's words, for figures read as a row instead of a list. */
  align?: "start" | "centre";
  /** The figures, as `Stat` parts. */
  children: ReactNode;
};

/**
 * Figures that belong together, such as a dashboard's headline numbers. They sit side by side with
 * a keyline between each, or one above another. The row is a grid of equal cells, as many across
 * as fit at `--x-govuk-ui-stat-width`, which is 180 pixels by default. It wraps into more rows of
 * the same cells, so on a phone the stats stack. They are set in a Figure, so with a title they
 * read as a Chart does. A short rule in brand blue sits over a headline, then come the figures,
 * then the source.
 */
export function Stats({
  title,
  subtitle,
  source,
  orientation = "horizontal",
  align = "start",
  className = "",
  children,
  ...props
}: StatsProps) {
  return (
    <Figure
      {...props}
      className={`x-govuk-ui-stats ${className}`.trim()}
      data-orientation={orientation}
      data-align={align === "centre" ? "centre" : undefined}
    >
      {title && <FigureCaption title={title} subtitle={subtitle} />}
      <div className="x-govuk-ui-stats-grid">
        <div className="x-govuk-ui-stats-row">{children}</div>
      </div>
      {source && <FigureSource>{source}</FigureSource>}
    </Figure>
  );
}
