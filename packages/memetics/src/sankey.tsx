"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Sankey as RechartsSankey, ResponsiveContainer, Tooltip } from "recharts";
import type { FigureProps } from "x-govuk-ui";
import { ChartCard, useRuler } from "./chart-frame";
import { acyclic } from "./chart-maths";
import { colour } from "./chart-palette";
import { ChartFrame, type ChartLayout } from "./chart-parts";
import { type ChartLabels, plainIn, wordsOf } from "./chart-words";

export type SankeyLink = {
  /** Where the flow comes from, by name. */
  from: string;
  /** Where the flow goes, by name. */
  to: string;
  /** How much flows, which sets the band's width. */
  value: number;
};

export type SankeyProps = Omit<FigureProps, "title" | "children"> &
  ChartLayout & {
    /**
     * The flows, each from one stage to another, as wide as its figure. The flows name the stages,
     * each in the next colour as it first appears, set in columns by how far along they are. A flow
     * can only go forward. A flow that returns to a stage it came through, or to its own stage, is
     * left out of the drawing, though the table lists it.
     */
    links: readonly SankeyLink[];
    /**
     * What the figures are, heading the table's figures and in the card, such as "Applications".
     */
    valueLabel: string;
    /** Writes a figure, such as "4,200". By default, as the `labels`' language writes numbers. */
    format?: (value: number) => string;
    /** The plot's height, in pixels. */
    height?: number;
    /**
     * The flow's point, in a sentence, for screen readers. Every flow's figure is in a table
     * beneath, which anyone can open.
     */
    description: string;
    /**
     * The words the diagram writes itself, such as its table's From and To, in another language.
     */
    labels?: Partial<ChartLabels>;
  };

type Node = { name: string; value?: number; depth?: number };
type Laid = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: Node;
};
type Flow = {
  sourceX?: number;
  targetX?: number;
  sourceY?: number;
  targetY?: number;
  sourceControlX?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: { source?: Node; target?: Node; value?: number };
};

/**
 * How things move from one stage to the next, as a Sankey diagram draws them, such as applications
 * from how they arrived to how they were decided. The Analysis Function suggests this for flows.
 * Each stage is a bar as tall as what passes through it, named with its figure beside it. Each flow
 * is a band as wide as its figure, in the colour of the stage it leaves. Moving over a flow or a
 * stage shows its figure in a card. Screen readers hear the flow's point in a sentence, and every
 * flow's figure is in a table beneath.
 */
export function Sankey({
  links,
  valueLabel,
  format: ownFormat,
  height = 320,
  description,
  labels,
  className = "",
  ...props
}: SankeyProps) {
  const words = wordsOf(labels);
  const format = ownFormat ?? plainIn(words.locale);
  // Recharts lays the stages out in columns, and a loop has no column to go in, so it would never
  // end.
  const forward = useMemo(() => acyclic(links), [links]);
  // The stages, in the order the flows first name them. Each stage that flows on takes the next
  // colour. The last stages, the outcomes, are in ink, so the colours tell the flows apart.
  const names = [...new Set(forward.flatMap((link) => [link.from, link.to]))];
  const sources = [...new Set(forward.map((link) => link.from))];
  const colourOf = (name = "") =>
    sources.includes(name) ? colour(sources.indexOf(name)) : "var(--x-govuk-ui-text)";
  const data = {
    nodes: names.map((name) => ({ name })),
    links: forward.map((link) => ({
      source: names.indexOf(link.from),
      target: names.indexOf(link.to),
      value: link.value,
    })),
  };
  return (
    <ChartFrame
      {...props}
      className={`x-govuk-ui-sankey ${className}`.trim()}
      parts={{
        summary: words.showTable,
        tables: [
          {
            head: [words.from, words.to, valueLabel],
            rows: links.map((link, index) => ({
              key: `${index}`,
              name: link.from,
              cells: [link.to, format(link.value)],
            })),
          },
        ],
        // An element, so each ChartPlot that shows it measures its own width and names.
        plot: (
          <SankeyDrawing
            data={data}
            forward={forward}
            colourOf={colourOf}
            valueLabel={valueLabel}
            format={format}
            words={words}
            height={height}
            description={description}
          />
        ),
      }}
    />
  );
}

/**
 * The flows, laid out by Recharts, with each stage named on the side that has space. A ruler of its
 * own measures the names in the page's font, at a width of its own.
 * @internal
 */
function SankeyDrawing({
  data,
  forward,
  colourOf,
  valueLabel,
  format,
  words,
  height,
  description,
}: {
  data: {
    nodes: { name: string }[];
    links: { source: number; target: number; value: number }[];
  };
  forward: readonly SankeyLink[];
  colourOf: (name?: string) => string;
  valueLabel: string;
  format: (value: number) => string;
  words: ChartLabels;
  height: number;
  description: string;
}) {
  // The plot's width, and a ruler, so each stage's name goes on the side with space for it.
  const plot = useRef<HTMLDivElement>(null);
  const measure = useRuler(plot);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = plot.current;
    if (!element) return;
    // To the nearest 24 pixels, because the plot is drawn again for each width, and a phone turning
    // or a panel being dragged need not draw it at every pixel.
    const sizes = new ResizeObserver(() => setWidth(Math.round(element.clientWidth / 24) * 24));
    sizes.observe(element);
    return () => sizes.disconnect();
  }, []);
  return (
    <div
      ref={plot}
      className="x-govuk-ui-chart-plot"
      role="img"
      aria-label={description}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {/* Recharts draws the stages once for their figures, so the plot is drawn again as its
        width changes, and once the fonts have loaded, for the names to find their sides. */}
        <RechartsSankey
          key={`${width}:${measure === null ? "" : "measured"}`}
          data={data}
          nodeWidth={12}
          nodePadding={18}
          linkCurvature={0.5}
          iterations={64}
          sort={false}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          node={(node: Laid) => (
            <SankeyStage
              {...node}
              fill={colourOf(node.payload?.name)}
              last={!forward.some((link) => link.from === node.payload?.name)}
              format={format}
              width={node.width}
              plotWidth={width}
              measure={measure}
            />
          )}
          link={(flow: Flow) => (
            <SankeyFlow {...flow} stroke={colourOf(flow.payload?.source?.name)} />
          )}
        >
          <Tooltip
            isAnimationActive={false}
            content={(given) => {
              const item = given.payload?.[0]?.payload as
                | {
                    payload?: { source?: Node; target?: Node; name?: string; value?: number };
                  }
                | undefined;
              const what = item?.payload;
              if (!given.active || !what) return null;
              const flow = what.source && what.target;
              return (
                <ChartCard
                  heading={
                    flow ? words.flow(what.source?.name ?? "", what.target?.name ?? "") : what.name
                  }
                  entries={[
                    {
                      key: "value",
                      name: valueLabel,
                      value: format(Number(what.value ?? 0)),
                      colour: colourOf(flow ? what.source?.name : what.name),
                    },
                  ]}
                />
              );
            }}
          />
        </RechartsSankey>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * A stage, as a bar as tall as what passes through it, with its name and figure beside it, inside
 * the plot. The first stages are named after their bars and the last before them. A stage between
 * is named on the side with more space. Where its words do not fit there on one line, its figure
 * goes on a second line.
 */
function SankeyStage({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  fill,
  last,
  format,
  plotWidth,
  measure,
}: Laid & {
  fill: string;
  last: boolean;
  format: (value: number) => string;
  plotWidth: number;
  measure: ((text: string, weight?: number) => number) | null;
}) {
  const name = payload?.name ?? "";
  const figure = format(Number(payload?.value ?? 0));
  const first = x < width;
  const before = last || (!first && x + width / 2 > plotWidth / 2);
  const room = (before ? x : plotWidth - x - width) - 12;
  const split =
    measure !== null && plotWidth > 0 && measure(name, 700) + measure(` ${figure}`) > room;
  return (
    <g className="x-govuk-ui-sankey-stage">
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} />
      <text
        x={before ? x - 8 : x + width + 8}
        y={y + height / 2}
        dy={split ? -3 : 4}
        textAnchor={before ? "end" : "start"}
        className="x-govuk-ui-chart-label"
      >
        <tspan className="x-govuk-ui-sankey-name">{name}</tspan>
        {split ? (
          <tspan x={before ? x - 8 : x + width + 8} dy={15}>
            {figure}
          </tspan>
        ) : (
          ` ${figure}`
        )}
      </text>
    </g>
  );
}

/** A flow, as a band as wide as its figure, in the colour of the stage it leaves. */
function SankeyFlow({
  sourceX = 0,
  targetX = 0,
  sourceY = 0,
  targetY = 0,
  sourceControlX = 0,
  targetControlX = 0,
  linkWidth = 0,
  stroke,
}: Flow & { stroke: string }) {
  return (
    <path
      className="x-govuk-ui-sankey-flow"
      d={`M${sourceX},${sourceY}C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={stroke}
      strokeWidth={Math.max(1, linkWidth)}
    />
  );
}
