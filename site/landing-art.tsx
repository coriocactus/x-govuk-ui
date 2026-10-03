import { type ReactNode, useId } from "react";
import { QrCode } from "x-govuk-ui";
import type { ComponentName } from "./catalogue";
import { regions } from "./examples/geography/england-regions";

// Each component drawn small, for the workbench's own page, as a catalogue pictures its parts. The
// drawings use the same few shapes in the same few colours, so they read as a set and differ only
// where the components do. Words are bars as tall as a small letter, headings darker and taller,
// links blue and underlined, and GOV.UK's button, field and focus are drawn as GOV.UK draws them.
// A drawing is 96 by 72, a pixel to a unit, and a page or a window drawn whole fills it. Colours
// are the design tokens, named by tone in preview.css, so every drawing follows the theme.

/** A tone, which preview.css turns into a colour from the design tokens. */
type Tone =
  | "ink"
  | "words"
  | "faint"
  | "surface"
  | "paper"
  | "line"
  | "border"
  | "link"
  | "brand"
  | "tint"
  | "go"
  | "go-dark"
  | "danger"
  | "danger-dark"
  | "grey"
  | "grey-dark"
  | "red"
  | "red-tint"
  | "success"
  | "green-tint"
  | "focus"
  | "focus-text"
  | "white"
  | "on-success"
  | "scrim"
  | "shadow"
  | "dark"
  | "lit-sky"
  | "lit-land"
  | "c1"
  | "c2"
  | "c3"
  | "c4"
  | "on-c1"
  | "c1-tint"
  | "heat1"
  | "heat2"
  | "heat3"
  | "heat4"
  | "heat5"
  | "band1"
  | "band2"
  | "band3"
  | "marker"
  | "keyword"
  | "string"
  | "entity"
  | "fixed-white"
  | "fixed-dark"
  | "fixed-light-line"
  | "fixed-dark-line";

type Place = { x: number; y: number };
type Size = { w: number; h: number };

const round = (value: number) => Math.round(value * 100) / 100;

/** Words, as a bar as tall as a small letter. */
function Words({
  x,
  y,
  w,
  h = 3,
  tone = "words",
  opacity,
}: Place & { w: number; h?: number; tone?: Tone; opacity?: number }) {
  return (
    <rect
      className={tone}
      fill="currentColor"
      x={x}
      y={y}
      width={w}
      height={h}
      rx={h / 2}
      opacity={opacity}
    />
  );
}

/** Words that are a link, which are blue, as GOV.UK's links are, and underlined. */
function Link({ x, y, w, tone = "link" }: Place & { w: number; tone?: Tone }) {
  return (
    <>
      <Words x={x} y={y} w={w} tone={tone} />
      <rect className={tone} fill="currentColor" x={x} y={y + 4.5} width={w} height={1} />
    </>
  );
}

/** A filled rectangle. */
function Area({
  x,
  y,
  w,
  h,
  tone = "faint",
  r = 0,
  opacity,
}: Place & Size & { tone?: Tone; r?: number; opacity?: number }) {
  return (
    <rect
      className={tone}
      fill="currentColor"
      x={x}
      y={y}
      width={w}
      height={h}
      rx={r}
      opacity={opacity}
    />
  );
}

/** A box with its edge drawn inside it, as a border is, over its fill. */
function Frame({
  x,
  y,
  w,
  h,
  edge = "line",
  fill = "paper",
  r = 2,
  weight = 1,
  dash,
}: Place &
  Size & { edge?: Tone; fill?: Tone | "none"; r?: number; weight?: number; dash?: string }) {
  const inset = weight / 2;
  return (
    <>
      {fill !== "none" && <Area x={x} y={y} w={w} h={h} tone={fill} r={r} />}
      <rect
        className={edge}
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
        strokeDasharray={dash}
        x={x + inset}
        y={y + inset}
        width={w - weight}
        height={h - weight}
        rx={Math.max(0, r - inset)}
      />
    </>
  );
}

/** A line along a path, such as a tick, a chevron or a chart's series. */
function Stroke({
  d,
  tone = "ink",
  weight = 1.5,
  dash,
}: {
  d: string;
  tone?: Tone;
  weight?: number;
  dash?: string;
}) {
  return (
    <path
      d={d}
      className={tone}
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dash}
    />
  );
}

/** A filled path. */
function Shape({ d, tone, opacity }: { d: string; tone: Tone; opacity?: number }) {
  return <path d={d} className={tone} fill="currentColor" opacity={opacity} />;
}

/** A filled circle. */
function Dot({ x, y, r, tone = "ink" }: Place & { r: number; tone?: Tone }) {
  return <circle className={tone} fill="currentColor" cx={x} cy={y} r={r} />;
}

/** A circle with its edge drawn inside it, such as a radio. */
function Ring({
  x,
  y,
  r,
  edge = "border",
  fill = "paper",
  weight = 1.5,
}: Place & { r: number; edge?: Tone; fill?: Tone | "none"; weight?: number }) {
  return (
    <>
      {fill !== "none" && <Dot x={x} y={y} r={r} tone={fill} />}
      <circle
        className={edge}
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
        cx={x}
        cy={y}
        r={r - weight / 2}
      />
    </>
  );
}

/** A tick, in a square `size` across from its top left corner. */
function Tick({
  x,
  y,
  size = 6,
  tone = "ink",
  weight = 1.75,
}: Place & { size?: number; tone?: Tone; weight?: number }) {
  return (
    <Stroke
      d={`M${x} ${y + size * 0.55}L${x + size * 0.38} ${y + size * 0.9}L${x + size} ${y + size * 0.1}`}
      tone={tone}
      weight={weight}
    />
  );
}

/** A chevron, pointing `to` a side from its middle. */
function Chevron({
  x,
  y,
  to = "down",
  size = 3,
  tone = "ink",
  weight = 1.5,
}: Place & { to?: "up" | "down" | "left" | "right"; size?: number; tone?: Tone; weight?: number }) {
  const half = size / 2;
  const d = {
    down: `M${x - size} ${y - half}L${x} ${y + half}L${x + size} ${y - half}`,
    up: `M${x - size} ${y + half}L${x} ${y - half}L${x + size} ${y + half}`,
    left: `M${x + half} ${y - size}L${x - half} ${y}L${x + half} ${y + size}`,
    right: `M${x - half} ${y - size}L${x + half} ${y}L${x - half} ${y + size}`,
  }[to];
  return <Stroke d={d} tone={tone} weight={weight} />;
}

/** GOV.UK's button, with its colour on a darker shadow, and its label. */
function Press({
  x,
  y,
  w,
  h = 12,
  kind = "go",
}: Place & { w: number; h?: number; kind?: "go" | "danger" | "grey" }) {
  const [face, shadow, label] = (
    {
      go: ["go", "go-dark", "white"],
      danger: ["danger", "danger-dark", "white"],
      grey: ["grey", "grey-dark", "ink"],
    } as const
  )[kind];
  return (
    <>
      <Area x={x} y={y + 1.5} w={w} h={h} tone={shadow} r={2} />
      <Area x={x} y={y} w={w} h={h} tone={face} r={2} />
      <Words x={round(x + w * 0.25)} y={y + h / 2 - 1.5} w={round(w * 0.5)} tone={label} />
    </>
  );
}

/** A text field, with GOV.UK's heavier edge. */
function Field({
  x,
  y,
  w,
  h = 12,
  edge = "border",
}: Place & { w: number; h?: number; edge?: Tone }) {
  return <Frame x={x} y={y} w={w} h={h} edge={edge} weight={1.5} r={2} />;
}

/** A photo, of hills under the sun, cut to its corners. */
function Photo({
  x,
  y,
  w,
  h,
  r = 0,
  lit = false,
  opacity,
}: Place & Size & { r?: number; lit?: boolean; opacity?: number }) {
  const clip = useId();
  const [sky, land]: Tone[] = lit ? ["lit-sky", "lit-land"] : ["faint", "words"];
  return (
    <g opacity={opacity}>
      <clipPath id={clip}>
        <rect x={x} y={y} width={w} height={h} rx={r} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <Area x={x} y={y} w={w} h={h} tone={sky} />
        <Dot
          x={round(x + w * 0.72)}
          y={round(y + h * 0.3)}
          r={round(Math.min(w, h) * 0.09)}
          tone={land}
        />
        <Shape
          tone={land}
          d={`M${x} ${y + h}V${round(y + h * 0.78)}L${round(x + w * 0.32)} ${round(y + h * 0.42)}L${round(x + w * 0.55)} ${round(y + h * 0.72)}L${round(x + w * 0.7)} ${round(y + h * 0.56)}L${x + w} ${round(y + h * 0.86)}V${y + h}Z`}
        />
      </g>
    </g>
  );
}

/** GOV.UK's header across the top, a band of the brand's blue, with the wordmark in white. */
function Header({ y = 0, h = 12 }: { y?: number; h?: number }) {
  return (
    <>
      <Area x={0} y={y} w={96} h={h} tone="brand" />
      <Words x={7} y={y + h / 2 - 2} w={20} h={4} tone="white" />
    </>
  );
}

/** GOV.UK's footer, from `y` to the foot, a grey band under a blue rule, with links. */
function Foot({ y }: { y: number }) {
  return (
    <>
      <Area x={0} y={y} w={96} h={72 - y} tone="surface" />
      <Area x={0} y={y} w={96} h={1.5} tone="brand" />
      <Link x={8} y={y + 6} w={20} />
      <Link x={34} y={y + 6} w={16} />
      <Link x={56} y={y + 6} w={22} />
    </>
  );
}

/** A page under an overlay, with the header, a heading and a few paragraphs. */
function PageBehind() {
  return (
    <>
      <Header h={10} />
      <Words x={8} y={17} w={44} h={4.5} tone="ink" />
      <Words x={8} y={28} w={78} />
      <Words x={8} y={34} w={70} />
      <Words x={8} y={40} w={74} />
      <Words x={8} y={46} w={50} />
      <Words x={8} y={56} w={76} />
      <Words x={8} y={62} w={60} />
    </>
  );
}

/** The dim over a page while an overlay is open. */
function Scrim() {
  return <Area x={0} y={0} w={96} h={72} tone="scrim" />;
}

/** A box that opens over the page, with a soft shadow under it. */
function Popup({ x, y, w, h, r = 3 }: Place & Size & { r?: number }) {
  return (
    <>
      <Area x={x} y={y + 1.5} w={w} h={h} tone="shadow" r={r} />
      <Frame x={x} y={y} w={w} h={h} r={r} />
    </>
  );
}

/** A point `r` from a middle, at an angle in degrees clockwise from twelve o'clock. */
function at(cx: number, cy: number, r: number, degrees: number) {
  const angle = (degrees * Math.PI) / 180;
  return `${round(cx + r * Math.sin(angle))} ${round(cy - r * Math.cos(angle))}`;
}

/** An arc of a circle, clockwise from one angle to another. */
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  return `M${at(cx, cy, r, from)}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${at(cx, cy, r, to)}`;
}

/** A piece of a ring, between two radii and two angles. */
function sector(cx: number, cy: number, inner: number, outer: number, from: number, to: number) {
  const large = to - from > 180 ? 1 : 0;
  return `M${at(cx, cy, outer, from)}A${outer} ${outer} 0 ${large} 1 ${at(cx, cy, outer, to)}L${at(cx, cy, inner, to)}A${inner} ${inner} 0 ${large} 0 ${at(cx, cy, inner, from)}Z`;
}

/** A Sankey flow, as wide at each end as its share of the bar there. */
function flow(from: number, to: number, [a0, a1]: number[], [b0, b1]: number[]) {
  const middle = (from + to) / 2;
  return `M${from} ${a0}C${middle} ${a0} ${middle} ${b0} ${to} ${b0}V${b1}C${middle} ${b1} ${middle} ${a1} ${from} ${a1}Z`;
}

// England's regions, from the Choropleth map's example, drawn to fit the picture. Longitude is
// narrowed by the cosine of England's middle latitude, so the country keeps its shape.
const england = (() => {
  const narrow = Math.cos((53 * Math.PI) / 180);
  const polygons = regions.flatMap((area) =>
    (area.geometry.type === "Polygon"
      ? [area.geometry.coordinates]
      : area.geometry.coordinates
    ).map((polygon) => ({ code: area.code, polygon })),
  );
  let [left, right, top, bottom] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const { polygon } of polygons)
    for (const ring of polygon)
      for (const [longitude = 0, latitude = 0] of ring) {
        left = Math.min(left, longitude * narrow);
        right = Math.max(right, longitude * narrow);
        top = Math.min(top, -latitude);
        bottom = Math.max(bottom, -latitude);
      }
  const scale = Math.min(84 / (right - left), 62 / (bottom - top));
  const across = (96 - (right - left) * scale) / 2;
  const down = (72 - (bottom - top) * scale) / 2;
  const paths = new Map<string, string>();
  for (const { code, polygon } of polygons) {
    const d = polygon
      .map(
        (ring) =>
          `M${ring
            .map(
              ([longitude = 0, latitude = 0]) =>
                `${Math.round(((longitude * narrow - left) * scale + across) * 10) / 10} ${Math.round(((-latitude - top) * scale + down) * 10) / 10}`,
            )
            .join("L")}Z`,
      )
      .join("");
    paths.set(code, (paths.get(code) ?? "") + d);
  }
  return paths;
})();

// Each region's shade, as the example's figures, licences for every 1,000 people, shade it.
const englandShades: Record<string, Tone> = {
  E12000001: "heat3",
  E12000002: "heat2",
  E12000003: "heat3",
  E12000004: "heat4",
  E12000005: "heat2",
  E12000006: "heat4",
  E12000007: "heat1",
  E12000008: "heat3",
  E12000009: "heat5",
};

// Fourteen weeks of days, busiest mid-season and quietest at weekends, with a fixed scatter.
const calendarDays = Array.from({ length: 14 * 7 }, (_, index) => {
  const week = Math.floor(index / 7);
  const day = index % 7;
  const season = Math.sin((week / 13) * Math.PI);
  const scatter = ((week * 37 + day * 53) % 10) / 10;
  const level = Math.round(1 + season * 2.4 + scatter * 1.8 - (day >= 5 ? 1.4 : 0));
  return { x: 9.5 + week * 5.5, y: 18 + day * 5.5, level: Math.max(1, Math.min(5, level)) };
});

// A hundred cells, filled a column at a time, with 62 in the first colour and 18 in the second.
const waffleCells = Array.from({ length: 100 }, (_, index) => {
  const column = Math.floor(index / 10);
  const row = index % 10;
  const tone: Tone = index < 62 ? "c1" : index < 80 ? "c2" : "faint";
  return { x: 21 + column * 5.5, y: 8.5 + (9 - row) * 5.5, tone };
});

// The part of an image still forming, as squares of light and shade over the lower half.
const formingCells = Array.from({ length: 10 * 5 }, (_, index) => {
  const column = index % 10;
  const row = Math.floor(index / 10);
  const tones: Tone[] = ["faint", "line", "surface", "faint", "line"];
  return {
    x: 18 + column * 6,
    y: 34 + row * 6,
    tone: tones[(column * 3 + row * 2) % 5] ?? "faint",
  };
});

/** Each component drawn, except the QR code, which is already a drawing. */
const drawings: Record<Exclude<ComponentName, "qr-code">, ReactNode> = {
  // Actions
  button: <Press x={22} y={27} w={52} h={16} />,
  link: (
    <>
      <Words x={12} y={24} w={72} />
      <Words x={12} y={32} w={20} />
      <Link x={35} y={32} w={30} />
      <Words x={68} y={32} w={16} />
      <Words x={12} y={40} w={56} />
    </>
  ),
  "exit-this-page": (
    <>
      <Press x={48} y={8} w={40} h={13} kind="danger" />
      <Words x={10} y={30} w={44} h={5} tone="ink" />
      <Words x={10} y={42} w={74} />
      <Words x={10} y={48} w={66} />
      <Words x={10} y={54} w={50} />
    </>
  ),

  // Form controls
  input: (
    <>
      <Words x={18} y={16} w={30} h={4} tone="ink" />
      <Words x={18} y={25} w={48} />
      <Field x={18} y={33} w={60} h={17} />
      <Words x={23} y={40} w={22} tone="ink" />
    </>
  ),
  textarea: (
    <>
      <Words x={18} y={10} w={34} h={4} tone="ink" />
      <Field x={18} y={18} w={60} h={44} />
      <Words x={23} y={24} w={46} tone="ink" />
      <Words x={23} y={30} w={40} tone="ink" />
      <Words x={23} y={36} w={28} tone="ink" />
      <Stroke d="M69 58L75 52M72 58L75 55" tone="words" weight={1} />
    </>
  ),
  editor: (
    <>
      <Frame x={10} y={8} w={76} h={56} edge="border" weight={1.5} r={3} />
      <Area x={11.5} y={9.5} w={73} h={11} tone="surface" r={1.5} />
      <Area x={11.5} y={20.5} w={73} h={1} tone="line" />
      <Area x={16} y={12.5} w={4} h={5} tone="ink" r={0.75} />
      <Stroke d="M26 12.5L24 17.5" weight={1.25} />
      <Stroke d="M30 12.5V15a1.5 1.5 0 0 0 3 0V12.5M29.5 18H33.5" weight={1} />
      <Area x={38} y={12} w={1} h={6} tone="line" />
      <Dot x={44} y={13.5} r={0.9} tone="words" />
      <Area x={46} y={13} w={6} h={1} tone="words" />
      <Dot x={44} y={16.5} r={0.9} tone="words" />
      <Area x={46} y={16} w={6} h={1} tone="words" />
      <Stroke
        d="M57 16.5l3-3M56.5 14.5a1.6 1.6 0 0 1 2.2-2.2M60.6 15.5a1.6 1.6 0 0 1-2.2 2.2"
        tone="words"
        weight={1}
      />
      <Words x={16} y={27} w={34} h={4.5} tone="ink" />
      <Words x={16} y={37} w={62} />
      <Words x={16} y={43} w={54} />
      <Dot x={18} y={51.5} r={1.2} tone="words" />
      <Words x={22} y={50} w={36} />
      <Dot x={18} y={57.5} r={1.2} tone="words" />
      <Words x={22} y={56} w={28} />
    </>
  ),
  select: (
    <>
      <Words x={18} y={7} w={28} h={4} tone="ink" />
      <Field x={18} y={15} w={60} h={14} />
      <Words x={23} y={20.5} w={26} tone="ink" />
      <Chevron x={70} y={22} />
      <Popup x={18} y={32} w={60} h={32} />
      <Area x={20} y={34} w={56} h={9} tone="brand" r={1.5} />
      <Tick x={23} y={36} size={5} tone="white" weight={1.5} />
      <Words x={31} y={37} w={26} tone="white" />
      <Words x={31} y={47} w={32} tone="ink" />
      <Words x={31} y={56} w={22} tone="ink" />
    </>
  ),
  radios: (
    <>
      <Ring x={24} y={20} r={6} />
      <Dot x={24} y={20} r={3} />
      <Words x={36} y={18.5} w={34} tone="ink" />
      <Ring x={24} y={36} r={6} />
      <Words x={36} y={34.5} w={28} tone="ink" />
      <Ring x={24} y={52} r={6} />
      <Words x={36} y={50.5} w={38} tone="ink" />
    </>
  ),
  checkboxes: (
    <>
      <Field x={18} y={14} w={12} h={12} />
      <Tick x={20.75} y={16.5} size={6.5} />
      <Words x={36} y={18.5} w={34} tone="ink" />
      <Field x={18} y={30} w={12} h={12} />
      <Words x={36} y={34.5} w={28} tone="ink" />
      <Field x={18} y={46} w={12} h={12} />
      <Tick x={20.75} y={48.5} size={6.5} />
      <Words x={36} y={50.5} w={38} tone="ink" />
    </>
  ),
  choices: (
    <>
      <Frame x={14} y={12} w={68} h={14} r={3} />
      <Frame x={17} y={15} w={8} h={8} edge="border" r={1.5} />
      <Area x={20} y={17} w={2} h={4} tone="ink" r={0.5} />
      <Words x={30} y={17.5} w={30} tone="ink" />
      <Frame x={14} y={29} w={68} h={14} edge="link" fill="tint" weight={1.5} r={3} />
      <Area x={17} y={32} w={8} h={8} tone="brand" r={1.5} />
      <Area x={20} y={34} w={2} h={4} tone="white" r={0.5} />
      <Words x={30} y={34.5} w={36} tone="ink" />
      <Frame x={14} y={46} w={68} h={14} r={3} />
      <Frame x={17} y={49} w={8} h={8} edge="border" r={1.5} />
      <Area x={20} y={51} w={2} h={4} tone="ink" r={0.5} />
      <Words x={30} y={51.5} w={24} tone="ink" />
    </>
  ),
  "date-input": (
    <>
      <Words x={9} y={20} w={10} tone="ink" />
      <Words x={27} y={20} w={14} tone="ink" />
      <Words x={45} y={20} w={10} tone="ink" />
      <Field x={9} y={27} w={14} h={16} />
      <Words x={12.5} y={33.5} w={7} tone="ink" />
      <Field x={27} y={27} w={14} h={16} />
      <Words x={30.5} y={33.5} w={7} tone="ink" />
      <Field x={45} y={27} w={24} h={16} />
      <Words x={49} y={33.5} w={14} tone="ink" />
      <Frame x={73} y={27} w={14} h={16} edge="border" fill="grey" weight={1} r={2} />
      <Frame x={76} y={31} w={8} h={8} edge="ink" fill="none" r={1} />
      <Area x={76} y={31} w={8} h={2.5} tone="ink" r={1} />
    </>
  ),
  "time-input": (
    <>
      <Words x={17} y={20} w={10} tone="ink" />
      <Words x={41} y={20} w={14} tone="ink" />
      <Field x={17} y={27} w={18} h={16} />
      <Words x={21.5} y={33.5} w={9} tone="ink" />
      <Dot x={38} y={32} r={1.2} />
      <Dot x={38} y={38} r={1.2} />
      <Field x={41} y={27} w={18} h={16} />
      <Words x={45.5} y={33.5} w={9} tone="ink" />
      <Ring x={72} y={35} r={8} edge="ink" fill="none" />
      <Stroke d="M72 30.5V35L75 37" weight={1.5} />
    </>
  ),
  "file-upload": (
    <>
      <Words x={14} y={12} w={34} h={4} tone="ink" />
      <Frame x={14} y={20} w={68} h={34} edge="border" weight={1.5} r={3} dash="3 2.5" />
      <Press x={20} y={30} w={26} h={12} kind="grey" />
      <Words x={52} y={34.5} w={24} />
    </>
  ),
  combobox: (
    <>
      <Words x={18} y={6} w={30} h={4} tone="ink" />
      <Field x={18} y={14} w={60} h={14} />
      <Words x={23} y={19.5} w={12} tone="ink" />
      <Area x={36.5} y={17.5} w={1} h={7} tone="ink" />
      <Popup x={18} y={31} w={60} h={33} />
      <Area x={20} y={33} w={56} h={9} tone="faint" r={1.5} />
      <Words x={24} y={36} w={12} tone="ink" />
      <Words x={37} y={36} w={20} />
      <Words x={24} y={46} w={12} tone="ink" />
      <Words x={37} y={46} w={26} />
      <Words x={24} y={56} w={12} tone="ink" />
      <Words x={37} y={56} w={14} />
    </>
  ),
  "multi-select": (
    <>
      <Words x={14} y={6} w={30} h={4} tone="ink" />
      <Field x={14} y={14} w={68} h={18} />
      <Area x={17} y={18} w={24} h={10} tone="tint" r={5} />
      <Words x={21} y={21.5} w={11} tone="link" />
      <Stroke d="M35 21.5l3 3m0-3l-3 3" tone="link" weight={1} />
      <Area x={44} y={18} w={22} h={10} tone="tint" r={5} />
      <Words x={48} y={21.5} w={9} tone="link" />
      <Stroke d="M60 21.5l3 3m0-3l-3 3" tone="link" weight={1} />
      <Area x={69.5} y={19} w={1} h={8} tone="ink" />
      <Popup x={14} y={35} w={68} h={30} />
      <Area x={18} y={39} w={6} h={6} tone="brand" r={1} />
      <Tick x={19.25} y={40.25} size={3.5} tone="white" weight={1.1} />
      <Words x={28} y={40.5} w={26} tone="ink" />
      <Area x={18} y={48} w={6} h={6} tone="brand" r={1} />
      <Tick x={19.25} y={49.25} size={3.5} tone="white" weight={1.1} />
      <Words x={28} y={49.5} w={20} tone="ink" />
      <Frame x={18} y={57} w={6} h={6} edge="border" r={1} />
      <Words x={28} y={58.5} w={30} tone="ink" />
    </>
  ),
  "search-box": (
    <>
      <Field x={10} y={28} w={62} h={16} />
      <Words x={15} y={34.5} w={26} tone="ink" />
      <Shape d="M70 28H84a2 2 0 0 1 2 2V42a2 2 0 0 1-2 2H70Z" tone="brand" />
      <Ring x={77} y={35} r={4} edge="white" fill="none" />
      <Stroke d="M79.8 37.8L82.5 40.5" tone="white" weight={1.75} />
    </>
  ),
  switch: (
    <>
      <Area x={18} y={22} w={22} h={12} tone="brand" r={6} />
      <Dot x={34} y={28} r={4} tone="white" />
      <Words x={46} y={26.5} w={32} tone="ink" />
      <Frame x={18} y={40} w={22} h={12} edge="border" weight={1.5} r={6} />
      <Dot x={24} y={46} r={3.5} tone="border" />
      <Words x={46} y={44.5} w={26} tone="ink" />
    </>
  ),
  slider: (
    <>
      <Words x={14} y={20} w={30} h={4} tone="ink" />
      <Words x={72} y={20.5} w={10} tone="ink" />
      <Area x={14} y={34} w={68} h={4} tone="faint" r={2} />
      <Area x={14} y={34} w={42} h={4} tone="brand" r={2} />
      <Ring x={56} y={36} r={7} edge="brand" weight={2} />
      <Words x={14} y={49} w={6} />
      <Words x={76} y={49} w={6} />
    </>
  ),
  "toggle-group": (
    <>
      <Area x={16} y={25} w={64} h={22} tone="band2" r={4} />
      <Area x={19} y={29} w={18} h={16} tone="shadow" r={2.5} />
      <Area x={19} y={28} w={18} h={16} tone="paper" r={2.5} />
      <Area x={23} y={31} w={10} h={2} tone="ink" />
      <Area x={23} y={35} w={6} h={2} tone="ink" />
      <Area x={23} y={39} w={10} h={2} tone="ink" />
      <Area x={43} y={31} w={10} h={2} tone="words" />
      <Area x={45} y={35} w={6} h={2} tone="words" />
      <Area x={43} y={39} w={10} h={2} tone="words" />
      <Area x={63} y={31} w={10} h={2} tone="words" />
      <Area x={67} y={35} w={6} h={2} tone="words" />
      <Area x={63} y={39} w={10} h={2} tone="words" />
    </>
  ),
  "filter-chips": (
    <>
      <Area x={12} y={22} w={30} h={12} tone="brand" r={6} />
      <Tick x={16} y={25.5} size={5} tone="white" weight={1.5} />
      <Words x={24} y={26.5} w={13} tone="white" />
      <Frame x={45} y={22} w={22} h={12} edge="border" r={6} />
      <Words x={50} y={26.5} w={12} tone="ink" />
      <Frame x={70} y={22} w={16} h={12} edge="border" r={6} />
      <Words x={74} y={26.5} w={8} tone="ink" />
      <Frame x={12} y={38} w={26} h={12} edge="border" r={6} />
      <Words x={17} y={42.5} w={16} tone="ink" />
      <Area x={41} y={38} w={28} h={12} tone="brand" r={6} />
      <Tick x={45} y={41.5} size={5} tone="white" weight={1.5} />
      <Words x={53} y={42.5} w={11} tone="white" />
    </>
  ),
  "input-otp": (
    <>
      {[10, 22, 34, 52, 64, 76].map((x, index) =>
        index === 4 ? (
          <g key={x}>
            <Area x={x - 2} y={27} w={14} h={18} tone="focus" r={3} />
            <Frame x={x} y={29} w={10} h={14} edge="focus-text" weight={2} r={1.5} />
            <Area x={x + 4.5} y={32} w={1} h={8} tone="ink" />
          </g>
        ) : (
          <g key={x}>
            <Field x={x} y={29} w={10} h={14} />
            {index < 4 && <Area x={x + 3.5} y={33} w={3} h={6} tone="ink" r={1} />}
          </g>
        ),
      )}
      <Area x={46} y={35.25} w={4} h={1.5} tone="words" r={0.75} />
    </>
  ),

  // Fields and validation
  field: (
    <>
      <Area x={14} y={10} w={3} h={52} tone="red" />
      <Words x={23} y={12} w={34} h={4} tone="ink" />
      <Words x={23} y={21} w={50} />
      <Words x={23} y={29} w={40} tone="red" />
      <Field x={23} y={37} w={58} h={17} edge="red" />
      <Words x={28} y={44} w={18} tone="ink" />
    </>
  ),
  fieldset: (
    <>
      <Words x={12} y={8} w={56} h={5.5} tone="ink" />
      <Words x={12} y={21} w={24} tone="ink" />
      <Field x={12} y={27} w={72} h={11} />
      <Words x={12} y={44} w={18} tone="ink" />
      <Field x={12} y={50} w={40} h={11} />
    </>
  ),
  "error-summary": (
    <>
      <Frame x={10} y={10} w={76} h={52} edge="red" weight={3} />
      <Words x={18} y={18} w={48} h={5} tone="ink" />
      <Link x={18} y={30} w={42} tone="red" />
      <Link x={18} y={39} w={34} tone="red" />
      <Link x={18} y={48} w={46} tone="red" />
    </>
  ),
  form: (
    <>
      <Words x={12} y={7} w={50} h={5.5} tone="ink" />
      <Words x={12} y={18} w={22} tone="ink" />
      <Field x={12} y={23} w={56} h={11} />
      <Words x={12} y={38} w={28} tone="ink" />
      <Field x={12} y={43} w={56} h={11} />
      <Press x={12} y={58} w={26} h={10} />
    </>
  ),

  // Navigation
  "skip-link": (
    <>
      <Area x={0} y={0} w={96} h={14} tone="focus" />
      <Words x={8} y={5} w={42} tone="focus-text" />
      <Area x={8} y={9.5} w={42} h={1.5} tone="focus-text" />
      <Header y={14} h={14} />
      <Words x={8} y={36} w={44} h={5} tone="ink" />
      <Words x={8} y={47} w={76} />
      <Words x={8} y={53} w={68} />
      <Words x={8} y={59} w={52} />
    </>
  ),
  "service-navigation": (
    <>
      <Header />
      <Area x={0} y={12} w={96} h={18} tone="tint" />
      <Words x={8} y={19.5} w={22} h={3.5} tone="ink" />
      <Words x={38} y={19.75} w={12} tone="link" />
      <Area x={38} y={27} w={12} h={3} tone="brand" />
      <Words x={55} y={19.75} w={14} tone="link" />
      <Words x={74} y={19.75} w={12} tone="link" />
      <Words x={8} y={38} w={46} h={5} tone="ink" />
      <Words x={8} y={49} w={74} />
      <Words x={8} y={55} w={66} />
      <Words x={8} y={61} w={50} />
    </>
  ),
  "navigation-menu": (
    <>
      <Words x={10} y={9} w={14} tone="link" />
      <Chevron x={28} y={10.5} to="up" size={2.5} tone="link" weight={1.25} />
      <Words x={36} y={9} w={16} tone="link" />
      <Chevron x={56} y={10.5} size={2.5} tone="link" weight={1.25} />
      <Words x={64} y={9} w={14} tone="link" />
      <Chevron x={82} y={10.5} size={2.5} tone="link" weight={1.25} />
      <Popup x={6} y={18} w={68} h={46} />
      <Words x={12} y={25} w={20} h={3.5} tone="ink" />
      <Link x={12} y={34} w={22} />
      <Link x={12} y={43} w={18} />
      <Link x={12} y={52} w={24} />
      <Words x={42} y={25} w={18} h={3.5} tone="ink" />
      <Link x={42} y={34} w={20} />
      <Link x={42} y={43} w={24} />
    </>
  ),
  menubar: (
    <>
      <Area x={0} y={0} w={96} h={14} tone="surface" />
      <Area x={0} y={13} w={96} h={1} tone="line" />
      <Area x={4} y={2.5} w={18} h={9} tone="grey" r={2} />
      <Words x={8} y={5.5} w={10} tone="ink" />
      <Words x={28} y={5.5} w={10} tone="ink" />
      <Words x={44} y={5.5} w={12} tone="ink" />
      <Popup x={4} y={15} w={52} h={44} />
      <Words x={9} y={21} w={22} tone="ink" />
      <Words x={42} y={21} w={9} />
      <Area x={6} y={26} w={48} h={9} tone="brand" r={1.5} />
      <Words x={9} y={29} w={18} tone="white" />
      <Words x={42} y={29} w={9} tone="white" />
      <Words x={9} y={38} w={26} tone="ink" />
      <Words x={42} y={38} w={9} />
      <Area x={6} y={44} w={48} h={1} tone="line" />
      <Words x={9} y={50} w={20} tone="ink" />
    </>
  ),
  sidebar: (
    <>
      <Area x={0} y={0} w={32} h={72} tone="surface" />
      <Area x={32} y={0} w={1} h={72} tone="line" />
      <Words x={6} y={7} w={16} h={4} tone="ink" />
      <Area x={6} y={18} w={5} h={5} tone="words" r={1} />
      <Words x={14} y={19} w={12} tone="link" />
      <Area x={3} y={25} w={26} h={10} tone="tint" r={2} />
      <Area x={6} y={27.5} w={5} h={5} tone="brand" r={1} />
      <Words x={14} y={28.5} w={10} tone="link" />
      <Area x={6} y={37} w={5} h={5} tone="words" r={1} />
      <Words x={14} y={38} w={13} tone="link" />
      <Words x={6} y={49} w={10} h={2.5} />
      <Area x={6} y={55} w={5} h={5} tone="words" r={1} />
      <Words x={14} y={56} w={11} tone="link" />
      <Area x={6} y={64} w={5} h={5} tone="words" r={1} />
      <Words x={14} y={65} w={13} tone="link" />
      <Words x={40} y={8} w={36} h={5} tone="ink" />
      <Words x={40} y={20} w={48} />
      <Words x={40} y={26} w={40} />
      <Frame x={40} y={36} w={22} h={20} r={2} />
      <Frame x={66} y={36} w={22} h={20} r={2} />
    </>
  ),
  breadcrumbs: (
    <>
      <Link x={10} y={22} w={12} tone="ink" />
      <Chevron x={27} y={23.5} to="right" size={2.5} tone="words" weight={1.25} />
      <Link x={32} y={22} w={16} tone="ink" />
      <Chevron x={53} y={23.5} to="right" size={2.5} tone="words" weight={1.25} />
      <Words x={58} y={22} w={22} />
      <Words x={10} y={36} w={52} h={6} tone="ink" />
      <Words x={10} y={50} w={72} />
      <Words x={10} y={56} w={60} />
    </>
  ),
  "back-link": (
    <>
      <Chevron x={12} y={19.5} to="left" size={3} />
      <Link x={16} y={18} w={18} tone="ink" />
      <Words x={10} y={32} w={56} h={6} tone="ink" />
      <Words x={10} y={46} w={74} />
      <Words x={10} y={52} w={66} />
      <Words x={10} y={58} w={44} />
    </>
  ),
  tabs: (
    <>
      <Words x={12} y={16.5} w={18} h={3.5} tone="ink" />
      <Words x={40} y={17} w={18} tone="link" />
      <Words x={66} y={17} w={18} tone="link" />
      <Area x={4} y={26} w={88} h={1} tone="line" />
      <Area x={8} y={24} w={26} h={3} tone="link" />
      <Words x={10} y={36} w={40} h={5} tone="ink" />
      <Words x={10} y={47} w={72} />
      <Words x={10} y={53} w={64} />
      <Words x={10} y={59} w={48} />
    </>
  ),
  pagination: (
    <>
      <Chevron x={12} y={36} to="left" size={3.5} tone="link" />
      {[23, 34, 62, 73].map((x) => (
        <Link key={x} x={x} y={34.5} w={5} />
      ))}
      <Area x={43} y={27} w={14} h={18} tone="brand" r={2} />
      <Words x={47.5} y={34.5} w={5} tone="white" />
      <Chevron x={86} y={36} to="right" size={3.5} tone="link" />
    </>
  ),
  "language-navigation": (
    <>
      <Header />
      <Words x={46} y={18} w={16} tone="ink" />
      <Area x={66} y={16.5} w={1} h={6} tone="line" />
      <Link x={70} y={18} w={18} />
      <Words x={8} y={32} w={44} h={5} tone="ink" />
      <Words x={8} y={44} w={76} />
      <Words x={8} y={50} w={68} />
      <Words x={8} y={56} w={52} />
    </>
  ),
  "command-menu": (
    <>
      <PageBehind />
      <Scrim />
      <Popup x={14} y={8} w={68} h={56} r={4} />
      <Ring x={21} y={16} r={3} edge="words" fill="none" weight={1.25} />
      <Stroke d="M23.2 18.2L25 20" tone="words" weight={1.25} />
      <Words x={28} y={14.5} w={30} />
      <Area x={14.5} y={23} w={67} h={1} tone="line" />
      <Area x={17} y={26} w={62} h={9} tone="faint" r={2} />
      {[29, 38, 47, 56].map((y, index) => (
        <g key={y}>
          <Area x={21} y={y - 1} w={5} h={5} tone="words" r={1} />
          <Words x={29} y={y} w={[26, 32, 22, 28][index] ?? 24} tone="ink" />
          {index % 2 === 0 && <Frame x={69} y={y - 1.5} w={7} h={6} r={1} />}
        </g>
      ))}
    </>
  ),

  // Page structure
  page: (
    <>
      <Header />
      <Words x={10} y={20} w={48} h={5.5} tone="ink" />
      <Words x={10} y={32} w={70} />
      <Words x={10} y={38} w={62} />
      <Words x={10} y={44} w={50} />
      <Foot y={54} />
    </>
  ),
  "cookie-banner": (
    <>
      <Area x={0} y={0} w={96} h={40} tone="surface" />
      <Words x={8} y={6} w={48} h={4.5} tone="ink" />
      <Words x={8} y={15} w={78} />
      <Words x={8} y={21} w={64} />
      <Press x={8} y={27} w={22} h={8} />
      <Press x={33} y={27} w={22} h={8} />
      <Link x={60} y={29.5} w={20} />
      <Header y={40} h={11} />
      <Words x={8} y={57} w={40} h={4} tone="ink" />
      <Words x={8} y={65} w={70} />
    </>
  ),
  header: (
    <>
      <Area x={0} y={0} w={96} h={26} tone="brand" />
      <Words x={8} y={10} w={28} h={6} tone="white" />
      <Words x={42} y={11.5} w={26} h={3} tone="white" />
      <Words x={8} y={36} w={46} h={5} tone="ink" />
      <Words x={8} y={48} w={76} />
      <Words x={8} y={54} w={66} />
      <Words x={8} y={60} w={52} />
    </>
  ),
  "phase-banner": (
    <>
      <Header h={14} />
      <Area x={8} y={18} w={17} h={9} tone="tint" r={1.5} />
      <Words x={11} y={21} w={11} tone="link" />
      <Words x={29} y={21} w={30} />
      <Link x={62} y={21} w={18} />
      <Area x={0} y={31} w={96} h={1} tone="line" />
      <Words x={8} y={40} w={46} h={5} tone="ink" />
      <Words x={8} y={51} w={74} />
      <Words x={8} y={57} w={60} />
    </>
  ),
  feedback: (
    <>
      <Words x={8} y={8} w={70} />
      <Words x={8} y={14} w={58} />
      <Area x={0} y={24} w={96} h={24} tone="tint" />
      <Words x={8} y={34.5} w={30} tone="ink" />
      <Frame x={42} y={30} w={16} h={11} edge="border" r={2} />
      <Words x={46} y={34} w={8} tone="ink" />
      <Frame x={62} y={30} w={14} h={11} edge="border" r={2} />
      <Words x={66} y={34} w={6} tone="ink" />
      <Foot y={54} />
    </>
  ),
  footer: (
    <>
      <Words x={8} y={8} w={60} />
      <Words x={8} y={14} w={46} />
      <Area x={0} y={24} w={96} h={48} tone="surface" />
      <Area x={0} y={24} w={96} h={2} tone="brand" />
      <Words x={8} y={32} w={20} h={3.5} tone="ink" />
      <Link x={8} y={40} w={18} />
      <Link x={8} y={47} w={14} />
      <Words x={40} y={32} w={18} h={3.5} tone="ink" />
      <Link x={40} y={40} w={20} />
      <Link x={40} y={47} w={16} />
      <Area x={8} y={55} w={80} h={1} tone="line" />
      <Ring x={12} y={63} r={3.5} edge="words" fill="none" weight={1} />
      <Words x={19} y={61.5} w={40} />
      <Ring x={83} y={63} r={5} edge="words" fill="none" weight={1} />
    </>
  ),

  // Layout
  "width-container": (
    <>
      <Stroke d="M20.5 4V68M75.5 4V68" tone="brand" weight={1} dash="2 2" />
      <Stroke
        d="M6 36H16M13 33L16 36L13 39M90 36H80M83 33L80 36L83 39"
        tone="brand"
        weight={1.25}
      />
      <Words x={25} y={10} w={36} h={5} tone="ink" />
      <Words x={25} y={21} w={46} />
      <Words x={25} y={27} w={40} />
      <Area x={25} y={36} w={28} h={26} tone="faint" r={2} />
      <Area x={57} y={36} w={14} h={26} tone="faint" r={2} />
    </>
  ),
  card: (
    <>
      <Frame x={22} y={6} w={52} h={60} r={4} />
      <Photo x={23} y={7} w={50} h={25} r={3} />
      <Link x={28} y={37} w={30} />
      <Words x={28} y={46} w={40} />
      <Words x={28} y={52} w={34} />
      <Words x={28} y={58} w={22} />
    </>
  ),
  aside: (
    <>
      <Words x={8} y={10} w={44} h={5} tone="ink" />
      {[21, 27, 33, 39, 45, 51].map((y, index) => (
        <Words key={y} x={8} y={y} w={[50, 46, 50, 42, 48, 30][index] ?? 40} />
      ))}
      <Area x={64} y={10} w={24} h={2} tone="brand" />
      <Words x={64} y={17} w={18} h={3.5} tone="ink" />
      <Link x={64} y={26} w={22} />
      <Link x={64} y={34} w={18} />
      <Link x={64} y={42} w={24} />
    </>
  ),
  accordion: (
    <>
      <Area x={10} y={4} w={76} h={1} tone="line" />
      <Words x={10} y={10} w={40} h={4.5} tone="ink" />
      <Ring x={82} y={12} r={5} edge="ink" fill="none" weight={1.25} />
      <Chevron x={82} y={12} to="up" size={2} weight={1.25} />
      <Words x={10} y={21} w={66} />
      <Words x={10} y={27} w={54} />
      <Area x={10} y={35} w={76} h={1} tone="line" />
      <Words x={10} y={41} w={34} h={4.5} tone="ink" />
      <Ring x={82} y={43} r={5} edge="ink" fill="none" weight={1.25} />
      <Chevron x={82} y={43} size={2} weight={1.25} />
      <Area x={10} y={51} w={76} h={1} tone="line" />
      <Words x={10} y={57} w={46} h={4.5} tone="ink" />
      <Ring x={82} y={59} r={5} edge="ink" fill="none" weight={1.25} />
      <Chevron x={82} y={59} size={2} weight={1.25} />
      <Area x={10} y={67} w={76} h={1} tone="line" />
    </>
  ),
  details: (
    <>
      <Shape d="M12 19h7l-3.5 4.5Z" tone="link" />
      <Link x={22} y={19} w={38} />
      <Area x={12} y={30} w={3} h={32} tone="line" />
      {[32, 38, 44, 50, 56].map((y, index) => (
        <Words key={y} x={21} y={y} w={[60, 54, 62, 46, 30][index] ?? 40} />
      ))}
    </>
  ),
  separator: (
    <>
      <Words x={10} y={10} w={64} />
      <Words x={10} y={16} w={50} />
      <Area x={10} y={26} w={76} h={1} tone="border" />
      <Words x={10} y={35} w={70} />
      <Words x={10} y={41} w={44} />
      <Frame x={10} y={50} w={76} h={14} r={3} />
      <Area x={15} y={54.5} w={5} h={5} tone="words" r={1} />
      <Area x={23} y={54.5} w={5} h={5} tone="words" r={1} />
      <Area x={31.5} y={53} w={1} h={8} tone="border" />
      <Area x={36} y={54.5} w={5} h={5} tone="words" r={1} />
      <Area x={44} y={54.5} w={5} h={5} tone="words" r={1} />
      <Area x={52.5} y={53} w={1} h={8} tone="border" />
      <Area x={57} y={54.5} w={5} h={5} tone="words" r={1} />
    </>
  ),
  "scroll-area": (
    <>
      <Frame x={16} y={8} w={64} h={56} r={3} />
      <Words x={21} y={14} w={42} h={4} tone="ink" />
      {[23, 29, 35, 41, 47, 53, 59].map((y, index) => (
        <Words key={y} x={21} y={y} w={[46, 40, 48, 36, 44, 42, 38][index] ?? 40} />
      ))}
      <Area x={73} y={12} w={3} h={20} tone="border" r={1.5} />
    </>
  ),
  tiles: (
    <>
      <Area x={0} y={0} w={96} h={72} tone="surface" />
      <Frame x={4} y={4} w={54} h={38} r={2} />
      <Area x={4.5} y={4.5} w={53} h={7} tone="faint" />
      <Words x={8} y={6.5} w={18} h={2.5} tone="ink" />
      <Words x={8} y={17} w={42} />
      <Words x={8} y={23} w={36} />
      <Words x={8} y={29} w={44} />
      <Frame x={61} y={4} w={31} h={38} r={2} />
      <Area x={61.5} y={4.5} w={30} h={7} tone="faint" />
      <Words x={65} y={6.5} w={14} h={2.5} tone="ink" />
      <Area x={65} y={17} w={23} h={20} tone="faint" r={1.5} />
      <Frame x={4} y={45} w={88} h={23} r={2} />
      <Area x={4.5} y={45.5} w={87} h={7} tone="faint" />
      <Words x={8} y={47.5} w={22} h={2.5} tone="ink" />
      <Words x={8} y={58} w={60} />
      <Area x={59} y={18} w={1} h={10} tone="border" r={0.5} />
    </>
  ),
  "aspect-ratio": (
    <>
      <Photo x={14} y={12} w={64} h={36} r={2} />
      <Stroke d="M14 56H78M14 53V59M78 53V59" tone="words" weight={1} />
      <Stroke d="M85 12V48M82 12H88M82 48H88" tone="words" weight={1} />
    </>
  ),

  // Messages and status
  "notification-banner": (
    <>
      <Frame x={8} y={10} w={80} h={52} edge="brand" weight={3} r={3} />
      <Shape d="M8 13a3 3 0 0 1 3-3H85a3 3 0 0 1 3 3V23H8Z" tone="brand" />
      <Words x={14} y={15} w={24} tone="white" />
      <Words x={15} y={30} w={56} h={5} tone="ink" />
      <Words x={15} y={41} w={62} />
      <Link x={15} y={49} w={34} />
    </>
  ),
  panel: (
    <>
      <Area x={10} y={10} w={76} h={52} tone="success" r={4} />
      <Words x={22} y={20} w={52} h={7} tone="on-success" />
      <Words x={30} y={35} w={36} tone="on-success" />
      <Words x={34} y={43} w={28} h={5} tone="on-success" />
    </>
  ),
  "warning-text": (
    <>
      <Dot x={20} y={36} r={8} />
      <Area x={19} y={31} w={2} h={6.5} tone="paper" r={1} />
      <Dot x={20} y={40.5} r={1.2} tone="paper" />
      <Words x={34} y={30} w={50} h={3.5} tone="ink" />
      <Words x={34} y={38} w={40} h={3.5} tone="ink" />
    </>
  ),
  "inset-text": (
    <>
      <Area x={14} y={16} w={4} h={40} tone="line" r={2} />
      {[20, 27, 34, 41, 48].map((y, index) => (
        <Words key={y} x={26} y={y} w={[56, 60, 50, 56, 32][index] ?? 40} />
      ))}
    </>
  ),
  prose: (
    <>
      <Words x={10} y={10} w={56} h={6} tone="ink" />
      <Words x={10} y={22} w={74} />
      <Words x={10} y={28} w={64} />
      <Area x={10} y={37} w={2.5} h={13} tone="line" r={1.25} />
      <Words x={17} y={39} w={58} />
      <Words x={17} y={45} w={44} />
      <Words x={10} y={56} w={40} h={4.5} tone="ink" />
      <Words x={10} y={65} w={70} />
    </>
  ),
  "rich-text": (
    <>
      <Words x={10} y={8} w={50} h={6} tone="ink" />
      <Words x={10} y={20} w={74} />
      <Words x={10} y={26} w={30} />
      <Link x={42} y={26} w={22} />
      <Words x={66} y={26} w={18} />
      <Dot x={13} y={37.5} r={1.3} tone="words" />
      <Words x={18} y={36} w={44} />
      <Dot x={13} y={44.5} r={1.3} tone="words" />
      <Words x={18} y={43} w={52} />
      <Words x={10} y={53} w={44} h={4.5} tone="ink" />
      <Words x={10} y={63} w={70} />
    </>
  ),
  toast: (
    <>
      <Words x={8} y={8} w={50} h={4.5} tone="ink" />
      <Words x={8} y={18} w={70} />
      <Words x={8} y={24} w={60} />
      <Popup x={44} y={35} w={40} h={14} />
      <Popup x={40} y={40} w={48} h={16} />
      <Popup x={36} y={45} w={56} h={22} />
      <Dot x={44} y={53} r={3.5} tone="success" />
      <Tick x={42.2} y={51.3} size={3.6} tone="white" weight={1.2} />
      <Words x={51} y={50} w={30} tone="ink" />
      <Words x={51} y={57} w={22} />
      <Area x={37} y={64} w={30} h={1.5} tone="brand" />
    </>
  ),
  tag: (
    <>
      <Area x={10} y={18} w={34} h={12} tone="tint" r={2} />
      <Words x={14} y={22.5} w={26} tone="link" />
      <Area x={48} y={18} w={30} h={12} tone="green-tint" r={2} />
      <Words x={52} y={22.5} w={22} tone="success" />
      <Area x={10} y={36} w={26} h={12} tone="red-tint" r={2} />
      <Words x={14} y={40.5} w={18} tone="red" />
      <Area x={40} y={36} w={40} h={12} tone="band2" r={2} />
      <Words x={44} y={40.5} w={32} tone="ink" />
    </>
  ),
  progress: (
    <>
      <Words x={14} y={22} w={34} h={4} tone="ink" />
      <Words x={72} y={22.5} w={10} />
      <Area x={14} y={32} w={68} h={8} tone="faint" r={4} />
      <Area x={14} y={32} w={44} h={8} tone="brand" r={4} />
      <Words x={14} y={47} w={40} />
    </>
  ),
  spinner: (
    <>
      <Ring x={48} y={36} r={14} edge="faint" fill="none" weight={4} />
      <Stroke d={arc(48, 36, 12, 0, 120)} tone="brand" weight={4} />
    </>
  ),
  skeleton: (
    <>
      <Dot x={20} y={20} r={8} tone="faint" />
      <Area x={33} y={14} w={44} h={5} tone="faint" r={2.5} />
      <Area x={33} y={23} w={30} h={5} tone="faint" r={2.5} />
      <Area x={12} y={36} w={72} h={24} tone="faint" r={3} />
    </>
  ),
  "empty-state": (
    <>
      <Ring x={46} y={19} r={7} edge="words" fill="none" weight={2} />
      <Stroke d="M51 24L55.5 28.5" tone="words" weight={2.5} />
      <Words x={28} y={34} w={40} h={4.5} tone="ink" />
      <Words x={22} y={43} w={52} />
      <Press x={34} y={51} w={28} h={10} kind="grey" />
    </>
  ),

  // Data display
  table: (
    <>
      <Words x={10} y={12} w={20} h={3.5} tone="ink" />
      <Words x={40} y={12} w={18} h={3.5} tone="ink" />
      <Words x={70} y={12} w={16} h={3.5} tone="ink" />
      <Area x={10} y={19} w={76} h={1} tone="line" />
      {[
        [25, 22, 26, 12],
        [35, 18, 30, 10],
        [45, 24, 20, 12],
        [55, 16, 28, 8],
      ].map(([y = 0, a = 0, b = 0, c = 0]) => (
        <g key={y}>
          <Words x={10} y={y} w={a} />
          <Words x={40} y={y} w={b} />
          <Words x={86 - c} y={y} w={c} />
          <Area x={10} y={y + 6} w={76} h={1} tone="line" />
        </g>
      ))}
    </>
  ),
  "summary-list": (
    <>
      {[12, 26, 40, 54].map((y, index) => (
        <g key={y}>
          <Words x={8} y={y} w={[22, 18, 24, 20][index] ?? 20} h={3.5} tone="ink" />
          <Words x={36} y={y} w={[30, 24, 34, 18][index] ?? 24} />
          <Link x={74} y={y} w={14} />
          <Area x={8} y={y + 9} w={80} h={1} tone="line" />
        </g>
      ))}
    </>
  ),
  "data-table": (
    <>
      <Frame x={4} y={6} w={88} h={60} r={2} />
      <Area x={4.5} y={6.5} w={87} h={10} tone="surface" />
      <Area x={4.5} y={16} w={87} h={1} tone="line" />
      <Frame x={8} y={9} w={5} h={5} edge="border" r={1} />
      <Words x={17} y={10} w={14} tone="ink" />
      <Shape d="M34 12.5l2-3l2 3Z" tone="ink" />
      <Area x={41} y={8.5} w={1} h={6} tone="border" />
      <Words x={45} y={10} w={14} tone="ink" />
      <Area x={63} y={8.5} w={1} h={6} tone="border" />
      <Words x={67} y={10} w={16} tone="ink" />
      <Area x={4.5} y={25} w={87} h={8} tone="tint" />
      {[20, 28, 36, 44, 52, 60].map((y, index) =>
        index === 1 ? (
          <g key={y}>
            <Area x={8} y={y - 1} w={5} h={5} tone="brand" r={1} />
            <Tick x={9} y={y} size={3} tone="white" weight={1} />
            <Words x={17} y={y} w={18} tone="ink" />
            <Words x={45} y={y} w={12} tone="ink" />
            <Words x={67} y={y} w={14} tone="ink" />
          </g>
        ) : (
          <g key={y}>
            <Frame x={8} y={y - 1} w={5} h={5} edge="border" r={1} />
            <Words x={17} y={y} w={[20, 0, 16, 22, 14, 18][index] ?? 16} />
            <Words x={45} y={y} w={[14, 0, 10, 12, 15, 9][index] ?? 12} />
            <Words x={67} y={y} w={[12, 0, 18, 10, 16, 13][index] ?? 12} />
          </g>
        ),
      )}
    </>
  ),
  "grouped-table": (
    <>
      <Area x={4} y={8} w={88} h={11} tone="surface" r={1.5} />
      <Chevron x={10} y={13.5} size={2} weight={1.25} />
      <Words x={15} y={12} w={24} h={3.5} tone="ink" />
      <Area x={42} y={10.5} w={10} h={6} tone="tint" r={3} />
      <Words x={15} y={24} w={26} />
      <Words x={48} y={24} w={20} />
      <Words x={78} y={24} w={10} />
      <Area x={4} y={30} w={88} h={1} tone="line" />
      <Words x={15} y={34} w={22} />
      <Words x={48} y={34} w={16} />
      <Words x={80} y={34} w={8} />
      <Area x={4} y={42} w={88} h={11} tone="surface" r={1.5} />
      <Chevron x={10} y={47.5} size={2} weight={1.25} />
      <Words x={15} y={46} w={30} h={3.5} tone="ink" />
      <Area x={48} y={44.5} w={10} h={6} tone="tint" r={3} />
      <Words x={15} y={58} w={28} />
      <Words x={48} y={58} w={18} />
      <Words x={78} y={58} w={10} />
      <Area x={4} y={64} w={88} h={1} tone="line" />
    </>
  ),
  "task-list": (
    <>
      {[12, 26, 40, 54].map((y, index) => (
        <g key={y}>
          <Link x={8} y={y} w={[36, 30, 40, 26][index] ?? 30} />
          <Area x={8} y={y + 9} w={80} h={1} tone="line" />
        </g>
      ))}
      <Words x={68} y={12} w={20} tone="ink" />
      <Words x={68} y={26} w={20} tone="ink" />
      <Area x={63} y={37} w={25} h={9} tone="tint" r={1.5} />
      <Words x={66} y={40} w={19} tone="link" />
      <Words x={64} y={54} w={24} />
    </>
  ),
  timeline: (
    <>
      <Area x={15} y={13} w={1.5} h={46} tone="line" />
      {[10, 31, 52].map((y, index) => (
        <g key={y}>
          {index === 0 ? (
            <Dot x={15.75} y={y + 3} r={4} tone="brand" />
          ) : (
            <Ring x={15.75} y={y + 3} r={4} />
          )}
          <Words x={26} y={y} w={[40, 34, 44][index] ?? 40} h={4} tone="ink" />
          <Words x={26} y={y + 7} w={20} h={2.5} />
          <Words x={26} y={y + 12} w={[56, 48, 52][index] ?? 50} />
        </g>
      ))}
    </>
  ),
  stat: (
    <>
      <Words x={10} y={18} w={28} />
      <Area x={10} y={26} w={30} h={12} tone="ink" r={2} />
      <Shape d="M10 49.5l3.5-5l3.5 5Z" tone="success" />
      <Words x={20} y={46} w={16} tone="success" />
      <Area x={49} y={16} w={1} h={40} tone="line" />
      <Words x={58} y={18} w={24} />
      <Area x={58} y={26} w={24} h={12} tone="ink" r={2} />
      <Shape d="M58 44.5l3.5 5l3.5-5Z" tone="red" />
      <Words x={68} y={46} w={14} tone="red" />
    </>
  ),
  figure: (
    <>
      <Words x={10} y={7} w={60} h={4.5} tone="ink" />
      <Words x={10} y={15} w={40} h={2.5} />
      <Area x={10} y={26} w={76} h={0.75} tone="line" />
      <Area x={10} y={41} w={76} h={0.75} tone="line" />
      {[
        [14, 30],
        [28, 38],
        [42, 24],
        [56, 42],
        [70, 34],
      ].map(([x = 0, top = 0]) => (
        <Area key={x} x={x} y={top} w={10} h={56 - top} tone="c1" />
      ))}
      <Area x={10} y={56} w={76} h={1} tone="border" />
      <Words x={10} y={62} w={40} h={2.5} />
    </>
  ),
  "code-block": (
    <>
      <Area x={8} y={8} w={80} h={56} tone="surface" r={4} />
      <Frame x={77} y={12} w={5} h={6} edge="words" fill="none" r={1} />
      <Frame x={75} y={14} w={5} h={6} edge="words" fill="surface" r={1} />
      {[16, 23, 30, 37, 44, 51].map((y) => (
        <Words key={y} x={13} y={y} w={3} tone="line" />
      ))}
      <Words x={21} y={16} w={10} tone="keyword" />
      <Words x={33} y={16} w={12} tone="ink" />
      <Words x={47} y={16} w={18} tone="string" />
      <Words x={25} y={23} w={18} tone="ink" />
      <Words x={45} y={23} w={16} tone="entity" />
      <Words x={25} y={30} w={12} tone="ink" />
      <Words x={39} y={30} w={8} tone="keyword" />
      <Words x={49} y={30} w={16} tone="string" />
      <Words x={21} y={37} w={4} tone="ink" />
      <Words x={21} y={51} w={12} tone="keyword" />
      <Words x={35} y={51} w={22} tone="ink" />
    </>
  ),
  avatar: (
    <>
      <AvatarPhoto />
      <Dot x={64} y={36} r={14} tone="brand" />
      <Words x={56} y={34} w={16} h={4} tone="white" />
    </>
  ),
  item: (
    <>
      {[16, 36, 56].map((y, index) => (
        <g key={y}>
          <Dot x={16} y={y} r={6} tone={index === 1 ? "brand" : "faint"} />
          <Words x={27} y={y - 5} w={[28, 24, 32][index] ?? 28} h={3.5} tone="ink" />
          <Words x={27} y={y + 1.5} w={[40, 34, 30][index] ?? 34} h={2.5} />
          <Dot x={84} y={y - 3} r={1} tone="words" />
          <Dot x={84} y={y} r={1} tone="words" />
          <Dot x={84} y={y + 3} r={1} tone="words" />
          {index < 2 && <Area x={8} y={y + 9.5} w={80} h={1} tone="line" />}
        </g>
      ))}
    </>
  ),
  attachment: (
    <>
      <Shape d="M14 18H30L38 26V54H14Z" tone="paper" />
      <Stroke
        d="M14.5 18.5H29.8L37.5 26.2V53.5H14.5ZM29.5 18.5V26.5H37.5"
        tone="border"
        weight={1}
      />
      {[32, 36, 40, 44, 48].map((y, index) => (
        <Area key={y} x={18} y={y} w={[14, 16, 12, 16, 10][index] ?? 14} h={1.5} tone="line" />
      ))}
      <Link x={44} y={21} w={40} />
      <Link x={44} y={29} w={24} />
      <Words x={44} y={39} w={30} h={2.5} />
      <Words x={44} y={45} w={22} h={2.5} />
    </>
  ),
  kbd: (
    <>
      <Area x={23} y={25} w={22} h={22} tone="line" r={3} />
      <Frame x={23} y={23} w={22} h={22} r={3} fill="surface" />
      <g transform="translate(28 28) scale(0.5)">
        <Stroke
          d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"
          weight={2.5}
        />
      </g>
      <Area x={51} y={25} w={22} h={22} tone="line" r={3} />
      <Frame x={51} y={23} w={22} h={22} r={3} fill="surface" />
      <Stroke d="M59 29V39M59 35L64.5 29M61 33L64.5 39" weight={1.5} />
    </>
  ),
  marker: (
    <>
      <Words x={10} y={18} w={74} />
      <Words x={10} y={27} w={18} />
      <Area x={30} y={24.5} w={36} h={8} tone="marker" r={1} />
      <Words x={32} y={27} w={32} tone="ink" />
      <Words x={68} y={27} w={16} />
      <Words x={10} y={36} w={66} />
      <Words x={10} y={45} w={28} />
      <Area x={40} y={42.5} w={26} h={8} tone="marker" r={1} />
      <Words x={42} y={45} w={22} tone="ink" />
      <Words x={10} y={54} w={52} />
    </>
  ),

  // Charts
  chart: (
    <>
      <Words x={10} y={6} w={44} h={4} tone="ink" />
      <Area x={10} y={22} w={78} h={0.75} tone="line" />
      <Area x={10} y={34} w={78} h={0.75} tone="line" />
      <Area x={10} y={46} w={78} h={0.75} tone="line" />
      <Area x={10} y={58} w={78} h={1} tone="border" />
      <Stroke d="M10 50L23 44L36 46L49 34L62 30L75 24L86 18" tone="c1" weight={2} />
      <Stroke d="M10 54L23 52L36 48L49 49L62 43L75 41L86 37" tone="c2" weight={2} />
      <Dot x={86} y={18} r={2.25} tone="c1" />
      <Dot x={86} y={37} r={2.25} tone="c2" />
      <Words x={10} y={63} w={8} h={2} />
      <Words x={45} y={63} w={8} h={2} />
      <Words x={78} y={63} w={8} h={2} />
    </>
  ),
  "chart-set": (
    <>
      {[
        [8, 8, "M8 29L17 25L26 26L35 20L44 18"],
        [52, 8, "M52 30L61 28L70 24L79 25L88 21"],
        [8, 40, "M8 58L17 60L26 55L35 56L44 51"],
        [52, 40, "M52 61L61 57L70 58L79 52L88 50"],
      ].map(([x = 0, y = 0, d = ""]) => (
        <g key={`${x} ${y}`}>
          <Words x={Number(x)} y={Number(y)} w={16} h={2.5} tone="ink" />
          <Area x={Number(x)} y={Number(y) + 24} w={36} h={0.75} tone="border" />
          <Stroke d={String(d)} tone="c1" weight={1.5} />
        </g>
      ))}
    </>
  ),
  "calendar-heatmap": (
    <>
      <Words x={10} y={11} w={9} h={2.5} />
      <Words x={32} y={11} w={9} h={2.5} />
      <Words x={54} y={11} w={9} h={2.5} />
      {calendarDays.map(({ x, y, level }) => (
        <Area key={`${x} ${y}`} x={x} y={y} w={4.5} h={4.5} tone={`heat${level}` as Tone} r={1} />
      ))}
      <Words x={52} y={61.5} w={8} h={2} />
      {[1, 2, 3, 4, 5].map((level) => (
        <Area
          key={level}
          x={58 + level * 5.5}
          y={60.5}
          w={4.5}
          h={4.5}
          tone={`heat${level}` as Tone}
          r={1}
        />
      ))}
    </>
  ),
  "choropleth-map": (
    <>
      {[...england].map(([code, d]) => (
        <path
          key={code}
          d={d}
          className={`${englandShades[code] ?? "faint"} landing-art-boundary`}
          fill="currentColor"
        />
      ))}
    </>
  ),
  treemap: (
    <>
      <Area x={8} y={8} w={46} h={34} tone="c1" />
      <Area x={8} y={43} w={28} h={21} tone="c1" opacity={0.75} />
      <Area x={37} y={43} w={17} h={21} tone="c1" opacity={0.55} />
      <Area x={55} y={8} w={33} h={24} tone="c2" />
      <Area x={55} y={33} w={33} h={13} tone="c2" opacity={0.7} />
      <Area x={55} y={47} w={19} h={17} tone="c3" />
      <Area x={75} y={47} w={13} h={17} tone="c4" />
      <Words x={11} y={11} w={16} h={2.5} tone="on-c1" />
      <Words x={58} y={11} w={12} h={2.5} tone="ink" />
    </>
  ),
  sunburst: (
    <>
      <Dot x={48} y={36} r={7} tone="faint" />
      {(
        [
          [8, 18, 0, 150, "c1", 1],
          [8, 18, 150, 260, "c2", 1],
          [8, 18, 260, 320, "c3", 1],
          [8, 18, 320, 360, "c4", 1],
          [19, 28, 0, 70, "c1", 0.85],
          [19, 28, 70, 120, "c1", 0.65],
          [19, 28, 120, 150, "c1", 0.45],
          [19, 28, 150, 220, "c2", 0.8],
          [19, 28, 220, 260, "c2", 0.55],
          [19, 28, 260, 300, "c3", 0.8],
          [19, 28, 300, 320, "c3", 0.55],
          [19, 28, 320, 360, "c4", 0.75],
        ] as const
      ).map(([inner, outer, from, to, tone, opacity]) => (
        <path
          key={`${inner} ${from}`}
          d={sector(48, 36, inner, outer, from, to)}
          className={`${tone} landing-art-boundary`}
          fill="currentColor"
          fillOpacity={opacity}
        />
      ))}
    </>
  ),
  sankey: (
    <>
      <Shape d={flow(12, 46, [8, 26], [6, 24])} tone="c1" opacity={0.35} />
      <Shape d={flow(12, 46, [26, 32], [40, 46])} tone="c1" opacity={0.35} />
      <Shape d={flow(12, 46, [36, 48], [24, 36])} tone="c2" opacity={0.35} />
      <Shape d={flow(12, 46, [48, 56], [46, 54])} tone="c2" opacity={0.35} />
      <Shape d={flow(12, 46, [56, 64], [58, 66])} tone="c2" opacity={0.35} />
      <Shape d={flow(50, 84, [6, 30], [8, 32])} tone="words" opacity={0.35} />
      <Shape d={flow(50, 84, [30, 36], [44, 50])} tone="words" opacity={0.35} />
      <Shape d={flow(50, 84, [40, 48], [32, 40])} tone="words" opacity={0.35} />
      <Shape d={flow(50, 84, [48, 54], [50, 56])} tone="words" opacity={0.35} />
      <Shape d={flow(50, 84, [58, 66], [56, 64])} tone="words" opacity={0.35} />
      <Area x={8} y={8} w={4} h={24} tone="c1" />
      <Area x={8} y={36} w={4} h={28} tone="c2" />
      <Area x={46} y={6} w={4} h={30} tone="ink" />
      <Area x={46} y={40} w={4} h={14} tone="ink" />
      <Area x={46} y={58} w={4} h={8} tone="ink" />
      <Area x={84} y={8} w={4} h={32} tone="ink" />
      <Area x={84} y={44} w={4} h={20} tone="ink" />
    </>
  ),
  "bar-list": (
    <>
      {[
        [10, 66, 22, 8],
        [22, 52, 18, 8],
        [34, 40, 26, 6],
        [46, 28, 14, 6],
        [58, 16, 20, 4],
      ].map(([y = 0, length = 0, name = 0, figure = 0]) => (
        <g key={y}>
          <Area x={10} y={y} w={length} h={9} tone="c1-tint" r={1.5} />
          <Words x={13} y={y + 3} w={name} tone="ink" />
          <Words x={86 - figure} y={y + 3} w={figure} tone="ink" />
        </g>
      ))}
    </>
  ),
  "bullet-chart": (
    <>
      {[
        [14, 50, 64],
        [42, 30, 54],
      ].map(([y = 0, figure = 0, target = 0]) => (
        <g key={y}>
          <Words x={10} y={y} w={26} tone="ink" />
          <Area x={10} y={y + 7} w={76} h={12} tone="band1" />
          <Area x={10} y={y + 7} w={56} h={12} tone="band2" />
          <Area x={10} y={y + 7} w={34} h={12} tone="band3" />
          <Area x={10} y={y + 11} w={figure} h={4} tone="c1" />
          <Area x={10 + target} y={y + 5} w={2} h={16} tone="ink" />
        </g>
      ))}
    </>
  ),
  gauge: (
    <>
      <Stroke d={arc(48, 48, 28, -90, 90)} tone="faint" weight={8} />
      <path
        d={arc(48, 48, 28, -90, 22)}
        className="c1"
        fill="none"
        stroke="currentColor"
        strokeWidth={8}
      />
      <Area x={40} y={40} w={16} h={7} tone="ink" r={1.5} />
      <Words x={16} y={56} w={8} h={2.5} />
      <Words x={72} y={56} w={8} h={2.5} />
    </>
  ),
  waffle: (
    <>
      {waffleCells.map(({ x, y, tone }) => (
        <Area key={`${x} ${y}`} x={x} y={y} w={4.5} h={4.5} tone={tone} r={0.75} />
      ))}
    </>
  ),
  sparkline: (
    <>
      {(
        [
          [16, "M36 20L42 17L48 18L54 13L60 15L66 11L70 12", 70, 12],
          [36, "M36 32L42 35L48 33L54 38L60 37L66 40L70 41", 70, 41],
          [56, "M36 57L42 54L48 58L54 55L60 56L66 52L70 53", 70, 53],
        ] as const
      ).map(([y, d, x, end]) => (
        <g key={y}>
          <Words x={8} y={y - 1.5} w={22} tone="ink" />
          <Stroke d={d} tone="c1" weight={1.5} />
          <Dot x={x} y={end} r={1.75} tone="c1" />
          <Words x={76} y={y - 1.5} w={12} tone="ink" />
          {y < 56 && <Area x={8} y={y + 9.5} w={80} h={1} tone="line" />}
        </g>
      ))}
    </>
  ),

  // Media
  carousel: (
    <>
      <Photo x={-10} y={14} w={22} h={34} r={3} opacity={0.5} />
      <Photo x={84} y={14} w={22} h={34} r={3} opacity={0.5} />
      <Photo x={18} y={10} w={60} h={42} r={3} />
      <Ring x={18} y={31} r={6} edge="border" weight={1} />
      <Chevron x={17.5} y={31} to="left" size={2.5} weight={1.25} />
      <Ring x={78} y={31} r={6} edge="border" weight={1} />
      <Chevron x={78.5} y={31} to="right" size={2.5} weight={1.25} />
      <Dot x={40} y={61} r={2} />
      <Dot x={48} y={61} r={2} tone="line" />
      <Dot x={56} y={61} r={2} tone="line" />
    </>
  ),
  "organisation-name": (
    <>
      <Area x={22} y={17} w={3} h={40} tone="danger" r={1} />
      <Dot x={36} y={25} r={6} tone="ink" />
      <Words x={31} y={37} w={46} h={4.5} tone="ink" />
      <Words x={31} y={46} w={34} h={4.5} tone="ink" />
    </>
  ),
  "logo-carousel": (
    <>
      <Words x={28} y={20} w={40} h={3} />
      {[
        [-6, 0.35],
        [24, 1],
        [56, 1],
        [86, 0.35],
      ].map(([x = 0, opacity = 1]) => (
        <g key={x} opacity={opacity}>
          <Ring x={x + 5} y={40} r={5.5} edge="ink" fill="none" />
          <Dot x={x + 5} y={40} r={2} />
          <Words x={x + 14} y={36} w={13} tone="ink" />
          <Words x={x + 14} y={41.5} w={9} />
        </g>
      ))}
    </>
  ),
  lightbox: (
    <>
      <Area x={0} y={0} w={96} h={72} tone="dark" />
      <Photo x={20} y={10} w={56} h={40} r={1} lit />
      <Stroke d="M85 7l5 5m0-5l-5 5" tone="fixed-white" weight={1.5} />
      <Chevron x={10} y={30} to="left" size={3.5} tone="fixed-white" weight={2} />
      <Chevron x={86} y={30} to="right" size={3.5} tone="fixed-white" weight={2} />
      {[30, 40, 50, 60].map((x) => (
        <Area key={x} x={x} y={57} w={7} h={7} tone="lit-sky" r={1} opacity={x === 40 ? 1 : 0.55} />
      ))}
      <Frame x={39} y={56} w={9} h={9} edge="fixed-white" fill="none" r={1.5} />
    </>
  ),

  // Overlays
  dialog: (
    <>
      <PageBehind />
      <Scrim />
      <Popup x={14} y={12} w={68} h={48} r={4} />
      <Words x={21} y={19} w={42} h={5} tone="ink" />
      <Words x={21} y={30} w={52} />
      <Words x={21} y={36} w={40} />
      <Press x={21} y={45} w={24} h={9} kind="danger" />
      <Press x={49} y={45} w={20} h={9} kind="grey" />
    </>
  ),
  sheet: (
    <>
      <PageBehind />
      <Scrim />
      <Area x={50} y={0} w={2} h={72} tone="shadow" />
      <Area x={52} y={0} w={44} h={72} tone="paper" />
      <Stroke d="M85 6l5 5m0-5l-5 5" weight={1.25} />
      <Words x={58} y={8} w={22} h={4.5} tone="ink" />
      {[22, 31, 40].map((y, index) =>
        index === 1 ? (
          <g key={y}>
            <Frame x={58} y={y} w={6} h={6} edge="border" r={1} />
            <Words x={67} y={y + 1.5} w={16} tone="ink" />
          </g>
        ) : (
          <g key={y}>
            <Area x={58} y={y} w={6} h={6} tone="brand" r={1} />
            <Tick x={59.25} y={y + 1.25} size={3.5} tone="white" weight={1.1} />
            <Words x={67} y={y + 1.5} w={20} tone="ink" />
          </g>
        ),
      )}
      <Press x={58} y={56} w={30} h={9} />
    </>
  ),
  popover: (
    <>
      <Press x={14} y={50} w={30} h={12} kind="grey" />
      <Popup x={8} y={8} w={62} h={34} />
      <Shape d="M23.5 41L29 46.5L34.5 41Z" tone="paper" />
      <Stroke d="M23.5 41.5L29 47L34.5 41.5" tone="line" weight={1} />
      <Words x={14} y={15} w={34} h={4} tone="ink" />
      <Words x={14} y={24} w={50} />
      <Words x={14} y={30} w={42} />
    </>
  ),
  callout: (
    <>
      <Words x={8} y={8} w={40} h={4.5} tone="ink" />
      <Words x={8} y={18} w={70} />
      <Words x={8} y={24} w={56} />
      <Press x={60} y={50} w={26} h={12} kind="grey" />
      <Frame x={57} y={47} w={32} h={19} edge="brand" fill="none" weight={1.5} r={4} />
      <Area x={8} y={32} w={44} h={28} tone="brand" r={3} />
      <Shape d="M52 50L57 54L52 58Z" tone="brand" />
      <Words x={13} y={38} w={28} h={3.5} tone="white" />
      <Words x={13} y={45} w={34} tone="white" />
      <Words x={13} y={51} w={24} tone="white" />
    </>
  ),
  tour: (
    <>
      <Header h={10} />
      <Words x={8} y={17} w={36} h={4.5} tone="ink" />
      <Press x={60} y={15} w={28} h={10} />
      <Words x={8} y={30} w={40} />
      <Words x={8} y={36} w={34} />
      <Words x={8} y={46} w={20} />
      <Shape
        tone="scrim"
        d="M0 0H96V72H0ZM58 12a2 2 0 0 0-2 2V27a2 2 0 0 0 2 2H90a2 2 0 0 0 2-2V14a2 2 0 0 0-2-2Z"
      />
      <Popup x={28} y={36} w={62} h={30} />
      <Shape d="M69 36.5L74 31.5L79 36.5Z" tone="paper" />
      <Stroke d="M69 36L74 31L79 36" tone="line" weight={1} />
      <Words x={34} y={42} w={30} h={3.5} tone="ink" />
      <Words x={34} y={49} w={48} />
      <Dot x={36} y={59} r={1.5} />
      <Dot x={41} y={59} r={1.5} tone="line" />
      <Dot x={46} y={59} r={1.5} tone="line" />
      <Press x={70} y={55} w={14} h={8} />
    </>
  ),
  "hover-card": (
    <>
      <Words x={8} y={10} w={14} />
      <Link x={24} y={10} w={24} />
      <Words x={50} y={10} w={36} />
      <Popup x={18} y={21} w={62} h={42} r={4} />
      <Dot x={30} y={34} r={6} tone="faint" />
      <Words x={40} y={30} w={30} h={3.5} tone="ink" />
      <Words x={40} y={37} w={22} h={2.5} />
      <Words x={24} y={47} w={50} />
      <Words x={24} y={53} w={38} />
    </>
  ),
  tooltip: (
    <>
      <Frame x={40} y={44} w={16} h={16} edge="border" r={3} />
      <Stroke d="M44.5 48.5H51.5M46 48.5V47H50V48.5M45.5 48.5L46 55.5H50L50.5 48.5" weight={1} />
      <Area x={24} y={18} w={48} h={16} tone="ink" r={3} />
      <Shape d="M44 33.5L48 38L52 33.5Z" tone="ink" />
      <Words x={30} y={24.5} w={24} tone="paper" />
      <Frame x={58} y={22} w={9} h={8} edge="paper" fill="none" r={1.5} />
    </>
  ),
  "dropdown-menu": (
    <>
      <Area x={12} y={9.5} w={38} h={12} tone="grey-dark" r={2} />
      <Area x={12} y={8} w={38} h={12} tone="grey" r={2} />
      <Words x={17} y={12.5} w={18} tone="ink" />
      <Chevron x={43} y={14} size={2.5} weight={1.25} />
      <Popup x={12} y={25} w={52} h={40} />
      <Words x={18} y={31} w={30} tone="ink" />
      <Area x={14} y={36} w={48} h={9} tone="brand" r={1.5} />
      <Words x={18} y={39} w={26} tone="white" />
      <Words x={18} y={48.5} w={34} tone="ink" />
      <Area x={14} y={54} w={48} h={1} tone="line" />
      <Words x={18} y={58} w={22} tone="red" />
    </>
  ),
  "context-menu": (
    <>
      <Frame x={8} y={10} w={36} h={26} r={3} />
      <Area x={13} y={16} w={10} h={14} tone="faint" r={1} />
      <Words x={27} y={18} w={12} tone="ink" />
      <Words x={27} y={24} w={10} />
      <Popup x={38} y={28} w={50} h={38} />
      <Words x={44} y={34} w={28} tone="ink" />
      <Words x={78} y={34} w={6} />
      <Area x={40} y={39} w={46} h={9} tone="brand" r={1.5} />
      <Words x={44} y={42} w={24} tone="white" />
      <Words x={78} y={42} w={6} tone="white" />
      <Words x={44} y={51.5} w={30} tone="ink" />
      <Area x={40} y={56} w={46} h={1} tone="line" />
      <Words x={44} y={60} w={20} tone="red" />
      <path
        d="M36 23V33L38.5 30.7L40.2 34.6L42 33.8L40.3 30H43.6Z"
        className="ink"
        fill="currentColor"
      />
      <path
        d="M36 23V33L38.5 30.7L40.2 34.6L42 33.8L40.3 30H43.6Z"
        className="paper"
        fill="none"
        stroke="currentColor"
        strokeWidth={0.75}
        strokeLinejoin="round"
      />
    </>
  ),

  // AI and agents
  conversation: (
    <>
      <Dot x={11} y={11} r={3.5} tone="brand" />
      <Words x={18} y={8} w={58} />
      <Words x={18} y={14} w={64} />
      <Words x={18} y={20} w={40} />
      <Area x={40} y={28} w={48} h={14} tone="grey" r={6} />
      <Words x={46} y={33.5} w={36} tone="ink" />
      <Dot x={11} y={51} r={3.5} tone="brand" />
      <Words x={18} y={48} w={52} />
      <Frame x={6} y={57} w={84} h={12} edge="border" r={6} />
      <Words x={12} y={61.5} w={30} />
      <Dot x={84} y={63} r={3.5} />
      <Chevron x={84} y={63} to="up" size={1.5} tone="paper" weight={1} />
    </>
  ),
  "message-scroller": (
    <>
      <Frame x={10} y={6} w={76} h={60} r={4} />
      <Area x={16} y={12} w={40} h={10} tone="grey" r={5} />
      <Words x={21} y={15.5} w={30} tone="ink" />
      <Area x={40} y={26} w={40} h={10} tone="brand" r={5} />
      <Words x={45} y={29.5} w={28} tone="white" />
      <Area x={16} y={40} w={46} h={10} tone="grey" r={5} />
      <Words x={21} y={43.5} w={36} tone="ink" />
      <Area x={16} y={54} w={36} h={11} tone="grey" r={5} />
      <Popup x={42} y={50} w={12} h={12} r={6} />
      <Chevron x={48} y={56} size={2.5} weight={1.25} />
    </>
  ),
  bubble: (
    <>
      <Area x={34} y={10} w={54} h={20} tone="brand" r={8} />
      <Words x={40} y={15} w={40} tone="white" />
      <Words x={40} y={21} w={28} tone="white" />
      <Area x={8} y={36} w={56} h={20} tone="grey" r={8} />
      <Words x={14} y={41} w={42} tone="ink" />
      <Words x={14} y={47} w={30} tone="ink" />
      <Frame x={12} y={53} w={16} h={9} edge="line" r={4.5} />
      <Words x={16} y={56} w={8} />
    </>
  ),
  "chat-input": (
    <>
      <Frame x={8} y={20} w={80} h={34} edge="border" weight={1.5} r={8} />
      <Words x={15} y={27} w={46} />
      <Ring x={18} y={45} r={4.5} edge="line" fill="none" weight={1} />
      <Stroke d="M18 43V47M16 45H20" weight={1} />
      <Dot x={78} y={45} r={5} />
      <Stroke d="M78 47.5V42.5M75.8 44.6L78 42.4L80.2 44.6" tone="paper" weight={1.25} />
    </>
  ),
  "file-chips": (
    <>
      {[
        [10, 18, 34],
        [48, 18, 38],
        [10, 36, 44],
      ].map(([x = 0, y = 0, w = 0]) => (
        <g key={`${x} ${y}`}>
          <Area x={x} y={y} w={w} h={12} tone="faint" r={3} />
          <Frame x={x + 4} y={y + 3} w={4.5} h={6} edge="words" fill="none" r={0.5} weight={1} />
          <Words x={x + 11} y={y + 4.5} w={w - 22} tone="ink" />
          <Words x={x + w - 9} y={y + 4.5} w={5} />
        </g>
      ))}
    </>
  ),
  "streaming-text": (
    <>
      <Words x={10} y={18} w={76} />
      <Words x={10} y={26} w={70} />
      <Words x={10} y={34} w={74} />
      <Words x={10} y={42} w={30} />
      <Words x={43} y={42} w={14} opacity={0.6} />
      <Words x={60} y={42} w={10} opacity={0.3} />
    </>
  ),
  "text-shimmer": <Shimmer />,
  "reasoning-steps": (
    <>
      <Area x={15.25} y={16} w={1.5} h={36} tone="line" />
      {[12, 30].map((y) => (
        <g key={y}>
          <Dot x={16} y={y + 2} r={4} tone="success" />
          <Tick x={13.8} y={y - 0.2} size={4.4} tone="white" weight={1.2} />
        </g>
      ))}
      <Ring x={16} y={50} r={4} edge="faint" />
      <Stroke d={arc(16, 50, 3.25, 0, 110)} tone="brand" weight={1.5} />
      {[12, 30, 48].map((y, index) => (
        <g key={y}>
          <Words x={26} y={y} w={[40, 46, 34][index] ?? 40} h={3.5} tone="ink" />
          <Words x={26} y={y + 7} w={[52, 40, 0][index] ?? 40} h={2.5} />
        </g>
      ))}
    </>
  ),
  "inline-citation": (
    <>
      <Words x={8} y={16} w={50} />
      <Area x={60} y={14} w={14} h={7} tone="grey" r={3.5} />
      <Words x={63} y={16.25} w={8} h={2.5} tone="ink" />
      <Words x={8} y={26} w={74} />
      <Words x={8} y={36} w={36} />
      <Area x={46} y={34} w={14} h={7} tone="tint" r={3.5} />
      <Words x={49} y={36.25} w={8} h={2.5} tone="link" />
      <Words x={62} y={36} w={22} />
      <Popup x={30} y={44} w={56} h={22} />
      <Words x={36} y={49} w={32} tone="link" />
      <Words x={36} y={56} w={40} h={2.5} />
    </>
  ),
  "plan-card": (
    <>
      <Frame x={8} y={6} w={80} h={60} r={4} />
      <Words x={14} y={12} w={40} h={4.5} tone="ink" />
      {[23, 32, 41].map((y, index) => (
        <g key={y}>
          <Ring x={17} y={y + 1.5} r={3} edge="words" weight={1} />
          <Words x={24} y={y} w={[44, 50, 36][index] ?? 40} />
        </g>
      ))}
      <Area x={8.5} y={49} w={79} h={1} tone="line" />
      <Press x={14} y={53} w={26} h={9} />
      <Link x={46} y={56} w={16} />
    </>
  ),
  "question-card": (
    <>
      <Frame x={8} y={6} w={80} h={60} r={4} />
      <Words x={14} y={11} w={12} h={2.5} />
      <Words x={14} y={17} w={52} h={4.5} tone="ink" />
      <Ring x={18} y={30} r={3.5} weight={1.25} />
      <Words x={25} y={28.5} w={30} tone="ink" />
      <Ring x={18} y={39} r={3.5} weight={1.25} />
      <Dot x={18} y={39} r={1.75} />
      <Words x={25} y={37.5} w={36} tone="ink" />
      <Area x={8.5} y={47} w={79} h={1} tone="line" />
      <Link x={14} y={55} w={12} />
      <Press x={60} y={52} w={22} h={9} />
    </>
  ),
  "file-diff": (
    <>
      <Frame x={6} y={6} w={84} h={60} r={3} />
      <Area x={6.5} y={6.5} w={83} h={10} tone="surface" />
      <Words x={11} y={10} w={30} tone="ink" />
      <Words x={66} y={10} w={8} tone="success" />
      <Words x={76} y={10} w={8} tone="red" />
      <Words x={10} y={21} w={4} tone="line" />
      <Words x={18} y={21} w={40} />
      <Area x={6.5} y={26} w={83} h={7} tone="red-tint" />
      <Area x={10} y={29} w={4} h={1.25} tone="red" />
      <Words x={18} y={28} w={46} tone="ink" />
      <Area x={6.5} y={33} w={83} h={14} tone="green-tint" />
      <Stroke d="M10 36.5H14M12 34.5V38.5M10 43.5H14M12 41.5V45.5" tone="success" weight={1.2} />
      <Words x={18} y={35} w={52} tone="ink" />
      <Words x={18} y={42} w={30} tone="ink" />
      <Words x={10} y={50} w={4} tone="line" />
      <Words x={18} y={50} w={36} />
      <Words x={10} y={57} w={4} tone="line" />
      <Words x={18} y={57} w={44} />
    </>
  ),
  "image-generation": <Forming />,

  // Utilities
  sound: (
    <>
      <Shape d="M10 31H15L21 26V46L15 41H10Z" tone="ink" />
      <Shape
        tone="brand"
        opacity={0.85}
        d="M28 38C30 30 38 28 46 30C58 33 74 36 88 37.5C74 39 58 43 46 46C38 48 30 46 28 38Z"
      />
      <Shape
        tone="brand"
        opacity={0.5}
        d="M30 22C34 18 42 18 50 20C56 21.5 62 22.5 68 23C62 23.5 56 24.5 50 25.5C42 27 34 26 30 22Z"
      />
      <Shape
        tone="brand"
        opacity={0.35}
        d="M32 54C36 52 42 52 48 53C52 53.7 56 54 60 54.2C56 54.4 52 54.8 48 55.4C42 56.3 36 56 32 54Z"
      />
    </>
  ),
  "theme-picker": (
    <>
      <Frame x={10} y={10} w={46} h={36} edge="fixed-light-line" fill="fixed-white" r={3} />
      <Area x={15} y={16} w={22} h={3.5} tone="fixed-light-line" r={1.75} />
      <Area x={15} y={24} w={34} h={2.5} tone="fixed-light-line" r={1.25} />
      <Area x={15} y={29} w={28} h={2.5} tone="fixed-light-line" r={1.25} />
      <Frame x={40} y={26} w={46} h={36} edge="fixed-dark-line" fill="fixed-dark" r={3} />
      <Area x={45} y={32} w={22} h={3.5} tone="fixed-dark-line" r={1.75} />
      <Area x={45} y={40} w={34} h={2.5} tone="fixed-dark-line" r={1.25} />
      <Area x={45} y={45} w={28} h={2.5} tone="fixed-dark-line" r={1.25} />
    </>
  ),
  "visually-hidden": (
    <>
      <Words x={10} y={22} w={26} tone="ink" />
      <Frame x={39} y={19} w={28} h={9} edge="words" fill="none" r={2} dash="2 1.5" />
      <Words x={70} y={22} w={16} tone="ink" />
      <Stroke d="M36 48C40 41 56 41 60 48C56 55 40 55 36 48Z" tone="words" />
      <Ring x={48} y={48} r={4} edge="words" fill="none" />
      <Stroke d="M38 57L58 39" tone="paper" weight={3.5} />
      <Stroke d="M38 57L58 39" tone="words" />
    </>
  ),
};

/** A photo, round, with the head and shoulders of a person. */
function AvatarPhoto() {
  const clip = useId();
  return (
    <>
      <clipPath id={clip}>
        <circle cx={32} cy={36} r={14} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <Dot x={32} y={36} r={14} tone="faint" />
        <Dot x={32} y={32} r={5.5} tone="words" />
        <ellipse className="words" fill="currentColor" cx={32} cy={50} rx={11} ry={8} />
      </g>
    </>
  );
}

/** Status words with light passing across them. */
function Shimmer() {
  const light = useId();
  return (
    <>
      <linearGradient id={light}>
        <stop offset="0" className="ink" stopColor="currentColor" />
        <stop offset="0.4" className="ink" stopColor="currentColor" />
        <stop offset="0.56" className="faint" stopColor="currentColor" />
        <stop offset="0.72" className="ink" stopColor="currentColor" />
        <stop offset="1" className="ink" stopColor="currentColor" />
      </linearGradient>
      <rect x={18} y={33} width={60} height={5} rx={2.5} fill={`url(#${light})`} />
    </>
  );
}

/** An image half made, with the top drawn and the rest still squares of light and shade. */
function Forming() {
  const clip = useId();
  return (
    <>
      <clipPath id={clip}>
        <rect x={18} y={8} width={60} height={56} rx={4} />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <Photo x={18} y={8} w={60} h={56} />
        {formingCells.map(({ x, y, tone }) => (
          <Area key={`${x} ${y}`} x={x} y={y} w={6} h={6} tone={tone} />
        ))}
        <Area x={18} y={33} w={60} h={1.5} tone="paper" opacity={0.8} />
      </g>
    </>
  );
}

/**
 * A component drawn small, for its tile on the workbench's own page. The QR code shows itself,
 * because it is already a drawing, and a real one scans.
 */
export function LandingArt({ name }: { name: ComponentName }) {
  if (name === "qr-code")
    return (
      <QrCode
        value="https://www.gov.uk/"
        size={56}
        ripple={0}
        className="landing-art-qr"
        aria-hidden="true"
      />
    );
  return (
    <svg viewBox="0 0 96 72" width={96} height={72} aria-hidden="true" focusable="false">
      {drawings[name]}
    </svg>
  );
}
