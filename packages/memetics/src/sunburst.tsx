"use client";

import { ResponsiveContainer, SunburstChart, Tooltip } from "recharts";
import type { FigureProps } from "x-govuk-ui";
import { ChartCard, treeTable } from "./chart-frame";
import { type ChartNode, type LaidNode, layTree, nodeValue } from "./chart-maths";
import { colour } from "./chart-palette";
import { ChartFrame, type ChartLayout } from "./chart-parts";
import { type ChartLabels, percentIn, plainIn, wordsOf } from "./chart-words";

export type SunburstProps = Omit<FigureProps, "title" | "children"> &
  ChartLayout & {
    /**
     * The parts of the whole, each a leaf with a figure or a branch of more parts, which make the
     * next ring out. Each branch in the middle ring takes the next colour, and its parts a paler
     * shade.
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
     * The sunburst's point, in a sentence, for screen readers. Every part's figure is in a table
     * beneath, which anyone can open.
     */
    description: string;
    /** The words the sunburst writes itself, such as Share, for another language. */
    labels?: Partial<ChartLabels>;
  };

/** A node as the sunburst draws it, laid out, with its colour, and its parts drawn the same way. */
type Ring = LaidNode & { fill: string; children?: Ring[] };

/**
 * Each node laid out, as the sunburst sizes its arcs by their figures. It takes its branch's
 * colour, paler the further out it lies.
 */
function rings(nodes: readonly ChartNode[]): Ring[] {
  const coloured = ({ children, ...node }: LaidNode): Ring => ({
    ...node,
    fill:
      node.depth === 0
        ? colour(node.branch)
        : `color-mix(in srgb, ${colour(node.branch)} ${Math.max(35, 75 - node.depth * 20)}%, var(--x-govuk-ui-paper))`,
    ...(children ? { children: children.map(coloured) } : {}),
  });
  return layTree(nodes).map(coloured);
}

/**
 * Parts of a whole in rings, as a treemap sets them in rectangles. Each branch is an arc as long as
 * its figure in the middle ring, and its parts are in the rings beyond. Each branch has a colour,
 * named in the key, and its parts a paler shade. Moving over an arc shows its path, figure and
 * share in a card. Screen readers hear the sunburst's point in a sentence, and every part's figure
 * is in a table beneath. Arcs are read less exactly than lengths, so read the figures from the
 * table. To compare the parts, prefer a Treemap or a Chart's bars.
 */
export function Sunburst({
  data,
  nameLabel,
  valueLabel,
  format: ownFormat,
  height = 320,
  description,
  labels,
  className = "",
  ...props
}: SunburstProps) {
  const words = wordsOf(labels);
  const format = ownFormat ?? plainIn(words.locale);
  const share = percentIn(words.locale);
  const whole = data.reduce((sum, node) => sum + nodeValue(node), 0) || 1;
  return (
    <ChartFrame
      {...props}
      className={`x-govuk-ui-sunburst ${className}`.trim()}
      parts={{
        key: data.map((node, index) => ({ label: node.name, colour: colour(index) })),
        summary: words.showTable,
        tables: [treeTable({ nodes: data, name: nameLabel, valueLabel, format, words })],
        plot: (
          <div
            className="x-govuk-ui-chart-plot"
            role="img"
            aria-label={description}
            style={{ height }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <SunburstChart
                data={{ name: "", value: whole, children: rings(data) }}
                dataKey="value"
                nameKey="name"
                innerRadius={Math.round(height * 0.14)}
                padding={2}
                stroke="var(--x-govuk-ui-paper)"
                textOptions={{ className: "x-govuk-ui-sunburst-text" }}
              >
                <Tooltip
                  isAnimationActive={false}
                  content={(given) => {
                    const node = given.payload?.[0]?.payload as Ring | undefined;
                    if (!given.active || !node) return null;
                    return (
                      <ChartCard
                        heading={node.path}
                        entries={[
                          {
                            key: "value",
                            name: valueLabel,
                            value: `${format(node.value)} (${share(node.value / whole)})`,
                            colour: node.fill,
                          },
                        ]}
                      />
                    );
                  }}
                />
              </SunburstChart>
            </ResponsiveContainer>
          </div>
        ),
      }}
    />
  );
}
