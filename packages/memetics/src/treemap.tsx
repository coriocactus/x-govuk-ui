"use client";

import { useRef } from "react";
import { Treemap as RechartsTreemap, ResponsiveContainer, Tooltip } from "recharts";
import type { FigureProps } from "x-govuk-ui";
import { ChartCard, treeTable, useDrawIn, useRuler } from "./chart-frame";
import { type ChartNode, layTree, nodeValue } from "./chart-maths";
import { colour, onColour } from "./chart-palette";
import { ChartFrame, type ChartLayout } from "./chart-parts";
import { type ChartLabels, percentIn, plainIn, wordsOf } from "./chart-words";

export type TreemapProps = Omit<FigureProps, "title" | "children"> &
  ChartLayout & {
    /**
     * The parts of the whole, each a leaf with a figure or a branch of more parts. Each branch at
     * the top takes the next colour, and its parts share it.
     */
    data: readonly ChartNode[];
    /** What the parts are, heading the table's first column, such as "Department". */
    nameLabel: string;
    /** What the figures are, for the table's heading and the card, such as "Spending, £m". */
    valueLabel: string;
    /** Writes a figure, such as "£1.2bn". By default, as the `labels`' language writes numbers. */
    format?: (value: number) => string;
    /** The plot's height, in pixels. */
    height?: number;
    /**
     * The treemap's point, in a sentence, for screen readers. Every part's figure is in a table
     * beneath, which anyone can open.
     */
    description: string;
    /** The words the treemap writes itself, such as Share, for another language. */
    labels?: Partial<ChartLabels>;
  };

/** A node as Recharts lays it out, with the branch and the path the tree's layout gave it. */
type Laid = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
  value?: number;
  branch?: number;
  path?: string;
  children?: readonly unknown[] | null;
};

/**
 * Parts of a whole as rectangles, each as large as its figure, nested in their branches. The
 * Analysis Function suggests this for part-to-whole with many parts, such as spending by department
 * and programme. Each branch at the top has a colour, named in the key. Each part is named with its
 * figure where it has space. Moving over a part shows its path, figure and share in a card. Screen
 * readers hear the treemap's point in a sentence, and every part's figure is in a table beneath.
 * The parts grow into place as it first shows, unless motion is reduced.
 */
export function Treemap({
  data,
  nameLabel,
  valueLabel,
  format: ownFormat,
  height = 320,
  description,
  labels,
  className = "",
  ...props
}: TreemapProps) {
  const words = wordsOf(labels);
  const format = ownFormat ?? plainIn(words.locale);
  const share = percentIn(words.locale);
  return (
    <ChartFrame
      {...props}
      className={`x-govuk-ui-treemap ${className}`.trim()}
      parts={{
        key: data.map((node, index) => ({ label: node.name, colour: colour(index) })),
        summary: words.showTable,
        tables: [treeTable({ nodes: data, name: nameLabel, valueLabel, format, words })],
        // An element, so each ChartPlot that shows it measures its own parts' names.
        plot: (
          <TreemapDrawing
            data={data}
            valueLabel={valueLabel}
            format={format}
            share={share}
            height={height}
            description={description}
          />
        ),
      }}
    />
  );
}

/**
 * The treemap's parts, laid out by Recharts, each named where its name fits, as measured in the
 * page's font by a ruler of its own.
 * @internal
 */
function TreemapDrawing({
  data,
  valueLabel,
  format,
  share,
  height,
  description,
}: {
  data: readonly ChartNode[];
  valueLabel: string;
  format: (value: number) => string;
  share: (value: number) => string;
  height: number;
  description: string;
}) {
  const plot = useRef<HTMLDivElement>(null);
  const measure = useRuler(plot);
  const whole = data.reduce((sum, node) => sum + nodeValue(node), 0);
  const animation = useDrawIn(JSON.stringify(data.map((node) => node.name)), JSON.stringify(data));
  return (
    <div
      ref={plot}
      className="x-govuk-ui-chart-plot"
      role="img"
      aria-label={description}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsTreemap
          data={layTree(data)}
          dataKey="value"
          nameKey="name"
          aspectRatio={4 / 3}
          isAnimationActive={animation.isAnimationActive}
          animationDuration={animation.animationDuration}
          animationEasing={animation.animationEasing}
          onAnimationEnd={animation.onAnimationEnd}
          content={(node: Laid) => <TreemapPart {...node} measure={measure} format={format} />}
        >
          <Tooltip
            isAnimationActive={false}
            content={(given) => {
              const node = given.payload?.[0]?.payload as Laid | undefined;
              if (!given.active || !node) return null;
              return (
                <ChartCard
                  heading={node.path}
                  entries={[
                    {
                      key: "value",
                      name: valueLabel,
                      value: whole
                        ? `${format(node.value ?? 0)} (${share((node.value ?? 0) / whole)})`
                        : format(node.value ?? 0),
                      colour: colour(node.branch ?? 0),
                    },
                  ]}
                />
              );
            }}
          />
        </RechartsTreemap>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * One part of the treemap, as a leaf in its branch's colour, separated from its neighbours by a
 * line of the paper's colour. Where they fit, its name and figure are in the ink that reads on it.
 * A branch draws nothing of its own, because its parts cover it.
 */
function TreemapPart({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  depth = 0,
  name = "",
  value = 0,
  branch = 0,
  children,
  measure,
  format,
}: Laid & {
  measure: ((text: string, weight?: number) => number) | null;
  format: (value: number) => string;
}) {
  if (depth === 0 || children?.length || width <= 0 || height <= 0) return <g />;
  const figure = format(value);
  const room = width - 16;
  const named = measure !== null && height >= 26 && measure(name, 700) <= room;
  const figured = named && height >= 44 && measure(figure) <= room;
  return (
    <g className="x-govuk-ui-treemap-part">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={colour(branch)}
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth={2}
        rx={3}
      />
      {named && (
        <text x={x + 8} y={y + 19} fill={onColour(branch)} className="x-govuk-ui-treemap-label">
          <tspan className="x-govuk-ui-treemap-name">{name}</tspan>
          {figured && (
            <tspan x={x + 8} dy={17}>
              {figure}
            </tspan>
          )}
        </text>
      )}
    </g>
  );
}
