"use client";

import { type PointerEvent, useCallback, useId, useMemo, useRef } from "react";
import type { FigureProps } from "x-govuk-ui";
import { CellFigure, FigureCard, heatKey, useHoverCard } from "./chart-frame";
import { extentOf, heatScale, niceScale } from "./chart-maths";
import { ChartFrame, type ChartLayout } from "./chart-parts";
import { type ChartLabels, plainIn, wordsOf } from "./chart-words";

/** A point of a boundary, as GeoJSON gives it, with its longitude, then its latitude. */
type Position = readonly number[];

export type MapArea = {
  /** The area's code, such as E12000009, by which `data` gives its figure. */
  code: string;
  /** The area's name, as the card and the table give it. */
  name: string;
  /** Its boundary, as a GeoJSON Polygon or MultiPolygon, in longitude and latitude. */
  geometry:
    | { type: "Polygon"; coordinates: readonly (readonly Position[])[] }
    | { type: "MultiPolygon"; coordinates: readonly (readonly (readonly Position[])[])[] };
};

export type ChoroplethMapProps = Omit<FigureProps, "title" | "children"> &
  ChartLayout & {
    /**
     * The areas to draw, each with its boundary. The map brings no geography of its own, so a
     * service draws whichever areas its figures are for, such as the Office for National
     * Statistics' boundaries, simplified to the detail the map needs.
     */
    areas: readonly MapArea[];
    /** Each area's figure, by its code. An area without one is hatched, and the key says so. */
    data: Readonly<Record<string, number>>;
    /** What the figures are, such as "Licences per 1,000 people", in the card and the table. */
    label: string;
    /** What the areas are, heading the table's first column, such as "Region". */
    nameLabel?: string;
    /** Writes a figure, such as "23 per 1,000". */
    format?: (value: number) => string;
    /** The range of figures the five shades divide. By default, it fits the figures. */
    domain?: [number, number];
    /** The map's height, in pixels. It keeps its shape, centred in its width. */
    height?: number;
    /**
     * The map's point, in a sentence, for screen readers. Every area's figure is in a table
     * beneath, which anyone can open.
     */
    description: string;
    /** The words the map writes itself, such as No figure, for another language. */
    labels?: Partial<ChartLabels>;
  };

/** Every ring of an area's boundary, whichever kind of polygon it is. */
const ringsOf = (area: MapArea): readonly (readonly Position[])[] =>
  area.geometry.type === "Polygon" ? area.geometry.coordinates : area.geometry.coordinates.flat();

/**
 * A choropleth map, with areas shaded by their figures in the five classes a heat map uses, named
 * in the key. The Analysis Function suggests this for figures that differ by place. The service
 * gives the boundaries as GeoJSON. They are drawn on a plain projection that keeps a small
 * country's shape, with longitude narrowed by the cosine of the middle latitude.
 *
 * Moving over an area outlines it and shows its name and figure in a card. Screen readers hear the
 * map's point in a sentence. Every area's figure is in a table beneath, because a map alone tells
 * a screen reader nothing.
 */
export function ChoroplethMap({
  areas,
  data,
  label,
  nameLabel = "Area",
  format: ownFormat,
  domain,
  height = 440,
  description,
  labels,
  className = "",
  ...props
}: ChoroplethMapProps) {
  const words = wordsOf(labels);
  const format = ownFormat ?? plainIn(words.locale);
  const [low, high] =
    domain ??
    niceScale(
      ...(extentOf([
        0,
        ...areas.flatMap((area) => {
          const value = data[area.code];
          return value === undefined ? [] : [value];
        }),
      ]) ?? [0, 1]),
    ).domain;
  const heat = heatScale([low, high], format, words.range);

  // The areas are projected once for their boundaries, not again as the figures change.
  const geometry = useMemo(() => drawingOf(areas), [areas]);

  const missing = areas.some((area) => data[area.code] === undefined);

  return (
    <ChartFrame
      {...props}
      className={`x-govuk-ui-choropleth-map ${className}`.trim()}
      parts={{
        summary: words.showTable,
        key: heatKey(heat, missing, words.noFigure),
        tables: [
          {
            head: [nameLabel, label],
            rows: areas.map((area) => ({
              key: area.code,
              name: area.name,
              cells: [
                <CellFigure
                  key="figure"
                  value={data[area.code]}
                  format={format}
                  missing={words.noFigure}
                />,
              ],
            })),
          },
        ],
        // An element, so each ChartPlot that shows it has a drawing, and a card, of its own.
        plot: (
          <MapDrawing
            areas={areas}
            geometry={geometry}
            data={data}
            label={label}
            domain={[low, high]}
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
 * The map's areas, shaded, and the card for the area under the pointer. The areas are shaded once
 * for their figures, not again as the pointer moves over them. The area under the pointer is
 * outlined over its neighbours, because an SVG draws in order. The card stands where the pointer
 * entered the area, and stays there while the pointer is in it, so the pointer can reach it.
 * @internal
 */
function MapDrawing({
  areas,
  geometry: { paths, wide, tall },
  data,
  label,
  domain: [low, high],
  format,
  words,
  height,
  description,
}: {
  areas: readonly MapArea[];
  geometry: ReturnType<typeof drawingOf>;
  data: Readonly<Record<string, number>>;
  label: string;
  domain: readonly [number, number];
  format: (value: number) => string;
  words: ChartLabels;
  height: number;
  description: string;
}) {
  // An area without a figure is hatched, as the key shows, so it is never taken for the palest
  // shade. The hatching's stripes are a ninetieth of the map's longer side apart, in the drawing's
  // own units. Each drawing has its own pattern, because a map shown twice has two drawings.
  const missing = areas.some((area) => data[area.code] === undefined);
  const hatch = `x-govuk-ui-hatch-${useId().replace(/[^\w-]/g, "")}`;
  const stripe = Math.max(wide, tall) / 90;
  const plot = useRef<HTMLDivElement>(null);
  const { shown, show, hide, card } = useHoverCard(
    useCallback(() => plot.current?.clientWidth ?? 0, []),
  );
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const code = (event.target as Element).closest<SVGElement>("[data-code]")?.dataset.code;
    const box = plot.current?.getBoundingClientRect();
    if (!code || !box) return;
    show(code, event.clientX - box.left, event.clientY - box.top - 4);
  };
  const hovered = shown && areas.find((area) => area.code === shown.id);
  const shaded = useMemo(() => {
    const step = heatScale([low, high], String, String).step;
    return areas.map((area) => {
      const value = data[area.code];
      return (
        <path
          key={area.code}
          className="x-govuk-ui-choropleth-map-area"
          d={paths.get(area.code)}
          data-code={area.code}
          data-step={value === undefined ? undefined : step(value)}
          fill={value === undefined ? `url(#${hatch})` : undefined}
        />
      );
    });
  }, [areas, paths, data, low, high, hatch]);
  return (
    <div className="x-govuk-ui-choropleth-map-plot" ref={plot} onPointerLeave={hide}>
      {/* The map is a picture for screen readers, described in a sentence. The table has every
          figure. */}
      <svg
        className="x-govuk-ui-choropleth-map-drawing"
        role="img"
        aria-label={description}
        viewBox={`0 0 ${wide || 1} ${tall || 1}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ height }}
        onPointerMove={point}
      >
        {missing && (
          <defs>
            <pattern
              id={hatch}
              width={stripe}
              height={stripe}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect className="x-govuk-ui-choropleth-map-hatch" width={stripe} height={stripe} />
              <line className="x-govuk-ui-choropleth-map-stripe" x1={0} y1={0} x2={0} y2={stripe} />
            </pattern>
          </defs>
        )}
        {shaded}
        {hovered && (
          <path className="x-govuk-ui-choropleth-map-outline" d={paths.get(hovered.code)} />
        )}
      </svg>
      {shown && hovered && (
        <FigureCard
          place={shown}
          card={card}
          heading={hovered.name}
          label={label}
          value={data[hovered.code]}
          format={format}
          missing={words.noFigure}
        />
      )}
    </div>
  );
}

/**
 * The areas drawn, with each one's path by its code, and the drawing's width and height, in its own
 * units. Longitude is narrowed by the cosine of the middle latitude, and latitude flipped so north
 * is up. The drawing's box is the areas' own, and the page scales it to fit. The bounds are found
 * in one pass, because a detailed map has more points than a spread can pass as arguments.
 */
function drawingOf(areas: readonly MapArea[]) {
  const latitudes = extentOf(
    (function* () {
      for (const area of areas)
        for (const ring of ringsOf(area)) for (const point of ring) yield point[1] ?? 0;
    })(),
  ) ?? [0, 0];
  const narrow = Math.cos(((latitudes[0] + latitudes[1]) / 2) * (Math.PI / 180));
  /** A point on the drawing's plane, with its longitude narrowed and its latitude flipped. */
  const project = (point: Position) => [(point[0] ?? 0) * narrow, -(point[1] ?? 0)] as const;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const area of areas)
    for (const ring of ringsOf(area))
      for (const point of ring) {
        const [x, y] = project(point);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (!Number.isFinite(left)) return { paths: new Map<string, string>(), wide: 0, tall: 0 };
  const paths = new Map(
    areas.map((area) => [
      area.code,
      ringsOf(area)
        .map((ring) => {
          const points = ring.map((point) => {
            const [x, y] = project(point);
            return `${(x - left).toFixed(4)},${(y - top).toFixed(4)}`;
          });
          return `M${points.join("L")}Z`;
        })
        .join(""),
    ]),
  );
  return { paths, wide: right - left, tall: bottom - top };
}
