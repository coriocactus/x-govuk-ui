"use client";

/**
 * What memetics' framed charts share inside the package. That is the table and the card, and the
 * hooks that draw a plot in, measure its labels and show a card under the pointer. The package
 * exports `ChartCard`. No service may use the rest. The palette, the words and the arithmetic are
 * in modules of their own, without `"use client"`, because the charts set alone render on the
 * server.
 */
import {
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useMotionTiming,
} from "x-govuk-ui";
import { type ChartNode, figureOf, flatten, type heatScale, nodeValue } from "./chart-maths";
import type { ChartKeyEntry } from "./chart-parts";
import { type ChartLabels, chartLabels, percentIn } from "./chart-words";

/**
 * How long a chart takes to draw in as it first shows, and to move to new figures, in
 * milliseconds. The charts drawn in CSS, such as a bullet chart's bar, take the same time.
 */
const DRAW_MS = 700;
/**
 * How near a card under the pointer may come to the plot's edge, in pixels, before it turns to
 * keep within it.
 */
const CARD_EDGE = 90;

/**
 * A table cell's figure, or a dash, which screen readers hear as no figure, in `missing`'s words.
 * @internal
 */
export function CellFigure({
  value,
  format,
  missing = chartLabels.noFigure,
}: {
  value: unknown;
  format: (value: number) => string;
  missing?: string;
}) {
  const figure = figureOf(value);
  if (figure !== null) return format(figure);
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="x-govuk-ui-visually-hidden">{missing}</span>
    </>
  );
}

/**
 * The key of a chart shaded in five classes. It shows each class by its range, and, where any
 * figure is missing, the hatching that stands for a missing figure.
 * @internal
 */
export function heatKey(
  heat: ReturnType<typeof heatScale>,
  missing: boolean,
  noFigure: string,
): ChartKeyEntry[] {
  return [
    ...heat.classes.map((each) => ({ label: each.label, mark: "shade" as const, step: each.step })),
    ...(missing ? [{ label: noFigure, mark: "shade" as const }] : []),
  ];
}

/** A row of a chart's table, with its name, its key, and a cell for each column after the first. */
export type FigureRow = { name: ReactNode; key: string; cells: readonly ReactNode[] };
/** A chart's table, with its caption, if a set has several tables, its headings and its rows. */
export type FigureTable = { caption?: ReactNode; head: readonly ReactNode[]; rows: FigureRow[] };

/**
 * The figures as a table, with each row's name down the side, and a column for each measure.
 * @internal
 */
export function Figures({ caption, head, rows, className }: FigureTable & { className?: string }) {
  return (
    <Table className={className}>
      {caption && <TableCaption>{caption}</TableCaption>}
      <TableHeader>
        <TableRow>
          {head.map((heading, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: A heading has only its place in the row.
            <TableHead key={index} numeric={index > 0}>
              {heading}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableHead>{row.name}</TableHead>
            {row.cells.map((cell, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: A cell has only its place in the row.
              <TableCell key={index} numeric>
                {cell}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** One line of the card under the pointer, with a swatch, a name and a figure. */
export type CardEntry = {
  /** What the figure is, such as a series' name. */
  name?: ReactNode;
  /** The figure as it reads, such as "41k" or "41k (38k to 44k)". */
  value: ReactNode;
  /** The swatch's colour, as the figure's mark has on the plot. */
  colour?: string;
  /** A key that is unique in the card, to tell this line from the others. */
  key: string;
};

export type ChartCardProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** What the figures are of, such as a month or an area's name, in bold above them. */
  heading?: ReactNode;
  /** A line for each figure, in the order given. */
  entries: readonly CardEntry[];
};

/**
 * The card that shows the figures under the pointer. It has a heading, then a row for each figure,
 * with its name and its figure in columns of their own. Where any row has a swatch, every row keeps
 * the swatch's column, so the names line up. A service's own chart can show its figures in it, so
 * they read as every chart's do.
 */
export function ChartCard({ heading, entries, className = "", ...props }: ChartCardProps) {
  const swatched = entries.some((entry) => entry.colour);
  return (
    <div {...props} className={`x-govuk-ui-chart-tooltip ${className}`.trim()}>
      {heading !== undefined && heading !== "" && (
        <p className="x-govuk-ui-chart-tooltip-label">{heading}</p>
      )}
      <ul data-swatched={swatched || undefined}>
        {entries.map((entry) => (
          <li key={entry.key}>
            {swatched && (
              <span
                className="x-govuk-ui-chart-tooltip-swatch"
                style={entry.colour ? { background: entry.colour } : undefined}
              />
            )}
            <span className="x-govuk-ui-chart-tooltip-name">{entry.name}</span>
            <span className="x-govuk-ui-chart-tooltip-value">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * How Recharts animates a plot. The plot draws itself in when it first shows. When its figures
 * change, it moves to them, as a dashboard's does. A change to the chart itself, its `structure`,
 * shows at once. Otherwise Recharts would draw the new chart in again, or move the old figures
 * into unrelated new ones, which turns a change of settings into a performance.
 * @internal
 */
export function useDrawIn(structure: string, figures: string) {
  const { reduced } = useMotionTiming();
  // What was last drawn, kept as state instead of a ref written during the render. React's second
  // render in development would see such a ref as already changed. Recharts takes animation turning
  // on as a cue to draw in again. Animation therefore stays off after a change of structure until
  // the figures next change. It goes off again only once the move has ended, so the move is not cut
  // short.
  const [last, setLast] = useState({ structure, figures });
  const restructured = last.structure !== structure;
  const refigured = !restructured && last.figures !== figures;
  useEffect(() => {
    if (restructured) setLast({ structure, figures });
  }, [restructured, structure, figures]);
  const [drawn, setDrawn] = useState(false);
  return {
    isAnimationActive: !reduced && (!drawn || refigured),
    animationDuration: DRAW_MS,
    animationEasing: "ease-out" as const,
    onAnimationEnd: () => {
      setDrawn(true);
      setLast({ structure, figures });
    },
  };
}

/**
 * The width of the widest of some labels, in pixels, as they are set in the element's font, for
 * space beside a plot. Labels measured before a web font loads are measured again once it has.
 * @internal
 */
export function useWidest(
  element: RefObject<HTMLElement | null>,
  labels: readonly string[],
  weight = 400,
  size = 13,
) {
  const measure = useRuler(element, size);
  if (!measure) return 0;
  let wide = 0;
  for (const label of labels) wide = Math.max(wide, measure(label, weight));
  return Math.ceil(wide);
}

/**
 * A function that measures a line of text as the element's font sets it, in pixels, or null until
 * the element is on the page. It is made again once web fonts load, so what it measured in the
 * fallback font is measured again in the page's own.
 * @internal
 */
export function useRuler(element: RefObject<HTMLElement | null>, size = 13) {
  const [ruler, setRuler] = useState<((text: string, weight?: number) => number) | null>(null);
  useLayoutEffect(() => {
    let live = true;
    const make = () => {
      const current = element.current;
      const context = document.createElement("canvas").getContext("2d");
      if (!live || !current || !context) return;
      const family = getComputedStyle(current).fontFamily;
      setRuler(() => (text: string, weight = 400) => {
        context.font = `${weight} ${size}px ${family}`;
        return context.measureText(text).width;
      });
    };
    make();
    document.fonts?.ready.then(make);
    return () => {
      live = false;
    };
  }, [element, size]);
  return ruler;
}

/**
 * A tree's figures as a table, with each node by its path, its figure and its share of the whole.
 * @internal
 */
export function treeTable({
  nodes,
  name,
  valueLabel,
  format,
  words,
}: {
  nodes: readonly ChartNode[];
  name: string;
  valueLabel: string;
  format: (value: number) => string;
  words: ChartLabels;
}): FigureTable {
  // A share of nothing is no figure, instead of one made up.
  const whole = nodes.reduce((sum, node) => sum + nodeValue(node), 0);
  const percent = percentIn(words.locale);
  return {
    head: [name, valueLabel, words.share],
    rows: flatten(nodes).map((row) => ({
      key: row.path.join("\u0000"),
      name: row.path.join(" › "),
      cells: [
        format(row.value),
        whole ? (
          percent(row.value / whole)
        ) : (
          <CellFigure key="share" value={null} format={percent} missing={words.noFigure} />
        ),
      ],
    })),
  };
}

/** Where a card under the pointer stands, which is over what, at what point, and on what edge. */
type CardPlace = { id: string; x: number; y: number; edge?: "start" | "end" };

/**
 * A card under the pointer, for the charts that show one themselves, over a day or an area. It
 * behaves as WCAG asks of content that shows on hover. It stays while the pointer moves onto it,
 * so a reader with a magnifier can read it, and goes when the pointer leaves both. Escape hides it,
 * and it stays hidden until the pointer reaches something else.
 * @internal
 */
export function useHoverCard(width: () => number) {
  const [shown, setShown] = useState<CardPlace | null>(null);
  // What Escape hid, which the pointer must leave before its card shows again.
  const dismissed = useRef<string | null>(null);
  const onCard = useRef(false);
  useEffect(() => {
    if (!shown) return;
    const putAway = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dismissed.current = shown.id;
      // The card goes from under the pointer without the pointer leaving it, so that is noted here.
      onCard.current = false;
      setShown(null);
    };
    document.addEventListener("keydown", putAway);
    return () => document.removeEventListener("keydown", putAway);
  }, [shown]);
  const show = useCallback(
    (id: string, x: number, y: number) => {
      if (onCard.current || dismissed.current === id) return;
      dismissed.current = null;
      let edge: CardPlace["edge"];
      if (x < CARD_EDGE) edge = "start";
      else if (x > width() - CARD_EDGE) edge = "end";
      // Over the same thing, the card stays where it first appeared, so the pointer can reach it.
      setShown((was) => (was?.id === id ? was : { id, x, y, edge }));
    },
    [width],
  );
  const hide = useCallback(() => {
    if (!onCard.current) setShown(null);
  }, []);
  const card = {
    onPointerEnter: () => {
      onCard.current = true;
    },
    onPointerLeave: () => {
      onCard.current = false;
      setShown(null);
    },
  };
  return { shown, show, hide, card };
}

/**
 * The card a chart sets itself over what is under the pointer, where Recharts does not, such as on
 * a calendar's day or a map's area. It stands above the point, kept within the plot near its ends.
 */
function FloatingCard({
  place,
  card,
  children,
}: {
  place: CardPlace;
  card: ComponentPropsWithRef<"div">;
  children: ReactNode;
}) {
  return (
    <div
      {...card}
      className="x-govuk-ui-chart-float"
      data-edge={place.edge}
      style={{ left: place.x, top: place.y }}
    >
      {children}
    </div>
  );
}

/**
 * A floating card of one figure, as a calendar's day and a map's area show. It gives what the
 * figure is of, what the figure is, and the figure, or the words for a missing figure.
 * @internal
 */
export function FigureCard({
  place,
  card,
  heading,
  label,
  value,
  format,
  missing,
}: {
  place: CardPlace;
  card: ComponentPropsWithRef<"div">;
  /** What the figure is of, such as a date or an area's name. */
  heading: ReactNode;
  /** What the figure is, such as "Licences sold". */
  label: string;
  value: unknown;
  format: (value: number) => string;
  /** The words for a missing figure. */
  missing: string;
}) {
  return (
    <FloatingCard place={place} card={card}>
      <ChartCard
        heading={heading}
        entries={[
          {
            key: "value",
            name: label,
            value: <CellFigure value={value} format={format} missing={missing} />,
          },
        ]}
      />
    </FloatingCard>
  );
}
