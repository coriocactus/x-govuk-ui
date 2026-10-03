/*
 * The mosaic behind Image generation. It is a grid of small square cells, drawn on a canvas. While
 * an image is being made, a slow flow of colour passes through the grid, as ridges of brand tint
 * that drift and curl, with cells popping now and then. The image forms out of the cells when it
 * arrives, and breaks back into them when the work starts again.
 *
 * It is drawn with the canvas's 2D context, one rectangle for each cell, which is cheap at this
 * size. There are about a thousand cells, drawn fifteen times a second while the flow drifts, and
 * every frame only while an image forms or breaks. Drawing stops while the mosaic is out of sight.
 */

type Colour = [number, number, number];

/** Cells are about this many pixels across. */
const CELL = 14;
/** The flow is redrawn this often, in milliseconds. It drifts slowly, so more would be waste. */
const FLOW_EVERY = 66;
/** An image forms, or breaks into cells, over this long, in milliseconds. */
const FORM = 1200;
const BREAK = 700;
/**
 * How far ahead of a cell's turn it shows the image's colour as a block, as a share of the sweep.
 */
const BAND = 0.08;

// Simplex noise in two dimensions, after Stefan Gustavson, with a fixed shuffle so the flow is the
// same every time.
const GRADIENTS = [1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1];
const PERMUTATION = (() => {
  const order = Array.from({ length: 256 }, (_, index) => index);
  let seed = 7;
  for (let index = 255; index > 0; index--) {
    seed = (seed * 16807) % 2147483647;
    const swap = seed % (index + 1);
    [order[index], order[swap]] = [order[swap] as number, order[index] as number];
  }
  return Uint8Array.from({ length: 512 }, (_, index) => order[index & 255] as number);
})();
const SKEW = 0.5 * (Math.sqrt(3) - 1);
const UNSKEW = (3 - Math.sqrt(3)) / 6;

function corner(hash: number, x: number, y: number) {
  const weight = 0.5 - x * x - y * y;
  if (weight <= 0) return 0;
  const gradient = (hash & 7) * 2;
  return weight ** 4 * (GRADIENTS[gradient]! * x + GRADIENTS[gradient + 1]! * y);
}

/** Smooth noise from -1 to 1. */
function noise(x: number, y: number) {
  const skew = (x + y) * SKEW;
  const i = Math.floor(x + skew);
  const j = Math.floor(y + skew);
  const unskew = (i + j) * UNSKEW;
  const x0 = x - (i - unskew);
  const y0 = y - (j - unskew);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = 1 - i1;
  const a = i & 255;
  const b = j & 255;
  const p = PERMUTATION;
  return (
    70 *
    (corner(p[a + p[b]!]!, x0, y0) +
      corner(p[a + i1 + p[b + j1]!]!, x0 - i1 + UNSKEW, y0 - j1 + UNSKEW) +
      corner(p[a + 1 + p[b + 1]!]!, x0 - 1 + 2 * UNSKEW, y0 - 1 + 2 * UNSKEW))
  );
}

/**
 * A number from 0 to 1 that is the same for the same cell and step, and unrelated to its
 * neighbours'.
 */
function chance(cell: number, step: number) {
  const value = Math.sin(cell * 127.1 + step * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const ease = (share: number) => 0.5 - Math.cos(share * Math.PI) / 2;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const mix = (from: Colour, to: Colour, share: number): Colour => [
  from[0] + (to[0] - from[0]) * share,
  from[1] + (to[1] - from[1]) * share,
  from[2] + (to[2] - from[2]) * share,
];
const css = ([red, green, blue]: Colour) =>
  `rgb(${Math.round(red)} ${Math.round(green)} ${Math.round(blue)})`;

/** What the mosaic is doing. */
type Mode =
  | { name: "flow" }
  | { name: "form"; start: number; done: () => void }
  | { name: "break"; start: number; done: () => void }
  | { name: "rest" };

/** @internal The mosaic an Image generation draws on its canvas while an image is made. */
export class Mosaic {
  private context: CanvasRenderingContext2D | null;
  private mode: Mode;
  private frame = 0;
  private timer = 0;
  private drawn = -Infinity;
  private visible = true;
  private observers: (ResizeObserver | IntersectionObserver)[] = [];
  private width = 0;
  private height = 0;
  private columns = 0;
  private rows = 0;
  /** Each cell's own random number, which sets when its turn comes as an image forms. */
  private seeds = new Float32Array(0);
  /** The theme's tones, from the surface behind the cells to the brightest ridge. */
  private tones: Colour[] = [];
  private shades: string[] = [];
  /** Each cell's colour in an image whose colours the flow takes, such as a rough preview. */
  private tint: Uint8ClampedArray | null = null;
  private tintSince = 0;
  /** Each cell's colour in the image forming or breaking. */
  private image: Uint8ClampedArray | null = null;
  private source: HTMLImageElement | null = null;
  private tintSource: HTMLImageElement | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    /** Elements whose colours are the tones, so the theme sets them in CSS. */
    private toneElements: HTMLElement,
    /** With reduced motion, the flow stays still and an image arrives without sweeping. */
    private still: boolean,
    resting: boolean,
  ) {
    this.context = canvas.getContext("2d", { alpha: true });
    this.mode = resting ? { name: "rest" } : { name: "flow" };
    this.readTones();
    // The tones change with the theme. Each tone element has a short colour transition, which ends
    // once the theme has changed, so the mosaic learns of every change without polling.
    toneElements.addEventListener("transitionend", this.retone);
    const resize = new ResizeObserver(() => this.resize());
    resize.observe(canvas);
    const sight = new IntersectionObserver(([entry]) => {
      this.visible = Boolean(entry?.isIntersecting);
      this.wake();
    });
    sight.observe(canvas);
    this.observers = [resize, sight];
    this.resize();
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.timer);
    for (const observer of this.observers) observer.disconnect();
    this.toneElements.removeEventListener("transitionend", this.retone);
  }

  /**
   * The flow takes its colours from this image, such as a rough preview, or else from the theme.
   */
  tintWith(image: HTMLImageElement | null) {
    if (image === this.tintSource) return;
    this.tintSource = image;
    this.tint = image ? this.sample(image) : null;
    this.tintSince = performance.now();
    this.wake(true);
  }

  /** The image forms out of the cells, which then rest. */
  form(image: HTMLImageElement, done: () => void) {
    this.source = image;
    this.image = this.sample(image);
    // With reduced motion, the mosaic fades away instead, in CSS.
    if (this.still) {
      this.mode = { name: "rest" };
      this.timer = window.setTimeout(() => {
        this.clear();
        done();
      }, 300);
      return;
    }
    this.mode = { name: "form", start: performance.now(), done };
    this.wake(true);
  }

  /** The image breaks into cells, which take its colours and flow. */
  break(image: HTMLImageElement, done: () => void) {
    this.source = image;
    this.image = this.sample(image);
    this.tintWith(image);
    this.mode = this.still ? { name: "flow" } : { name: "break", start: performance.now(), done };
    if (this.still) done();
    this.wake(true);
  }

  /** The flow stops, because the image is whole. */
  rest() {
    this.mode = { name: "rest" };
    this.tintWith(null);
    this.clear();
  }

  private retone = () => {
    this.readTones();
    this.wake(true);
  };

  /** Reads the tones' colours as the browser draws them, whatever form CSS gives them. */
  private readTones() {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const context = probe.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    this.tones = [...this.toneElements.children].map((element) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = getComputedStyle(element).color;
      context.fillRect(0, 0, 1, 1);
      const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
      return [red, green, blue];
    });
    // Sixty-four steps from the surface to the brightest ridge, through each tone in turn.
    const stops = this.tones.slice(0, -1);
    this.shades = Array.from({ length: 64 }, (_, step) => {
      const place = (step / 63) * (stops.length - 1);
      const below = Math.floor(place);
      const from = stops[below] ?? [0, 0, 0];
      return css(mix(from, stops[Math.min(stops.length - 1, below + 1)] ?? from, place - below));
    });
  }

  private resize() {
    const box = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, devicePixelRatio || 1);
    this.width = Math.round(box.width * ratio);
    this.height = Math.round(box.height * ratio);
    if (!this.width || !this.height) return;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const columns = Math.max(4, Math.round(box.width / CELL));
    const rows = Math.max(3, Math.round(box.height / CELL));
    if (columns !== this.columns || rows !== this.rows) {
      this.columns = columns;
      this.rows = rows;
      this.seeds = Float32Array.from({ length: columns * rows }, () => Math.random());
      if (this.tintSource) this.tint = this.sample(this.tintSource);
      if (this.source) this.image = this.sample(this.source);
    }
    this.wake(true);
  }

  /** An image's colour in each cell, cropped to the frame as the image itself is. */
  private sample(image: HTMLImageElement) {
    if (!this.columns) return null;
    const scratch = document.createElement("canvas");
    scratch.width = this.columns;
    scratch.height = this.rows;
    const context = scratch.getContext("2d", { willReadFrequently: true });
    if (!context || !image.naturalWidth) return null;
    const frame = this.width / Math.max(1, this.height);
    const own = image.naturalWidth / image.naturalHeight;
    const across = own > frame ? image.naturalHeight * frame : image.naturalWidth;
    const down = own > frame ? image.naturalHeight : image.naturalWidth / frame;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      (image.naturalWidth - across) / 2,
      (image.naturalHeight - down) / 2,
      across,
      down,
      0,
      0,
      this.columns,
      this.rows,
    );
    try {
      return context.getImageData(0, 0, this.columns, this.rows).data;
    } catch {
      // An image from another site without permission to read it keeps the theme's colours.
      return null;
    }
  }

  /** Asks for frames while there is something to draw. */
  private wake(now = false) {
    if (now) this.drawn = -Infinity;
    cancelAnimationFrame(this.frame);
    if (!this.visible || this.mode.name === "rest") return;
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (time: number) => {
    const mode = this.mode;
    const moving = mode.name === "form" || mode.name === "break";
    if (moving || time - this.drawn >= FLOW_EVERY) {
      this.drawn = time;
      this.draw(this.still ? 0 : time / 1000);
    }
    if (mode.name === "form" && time - mode.start >= FORM) {
      this.mode = { name: "rest" };
      this.clear();
      mode.done();
      return;
    }
    if (mode.name === "break" && time - mode.start >= BREAK) {
      this.mode = { name: "flow" };
      mode.done();
    }
    if (this.still && !moving) return;
    this.frame = requestAnimationFrame(this.tick);
  };

  private clear() {
    this.context?.clearRect(0, 0, this.width, this.height);
  }

  private draw(seconds: number) {
    const context = this.context;
    if (!context || !this.columns || this.tones.length < 2) return;
    const { columns, rows, width, height, mode } = this;
    const surface = this.tones[0]!;
    const surfaceCss = css(surface);
    const glint = this.tones[this.tones.length - 1]!;
    const tintShare = this.tint ? clamp((performance.now() - this.tintSince) / 600) : 0;
    // How far a sweep has gone, past every cell's turn by the end.
    const now = performance.now();
    let sweep = -1;
    if (mode.name === "form")
      sweep = ease(clamp((now - mode.start) / FORM)) * (1 + 2 * BAND) - BAND;
    if (mode.name === "break")
      sweep = ease(clamp((now - mode.start) / BREAK)) * (1 + 2 * BAND) - BAND;
    const step = Math.floor(seconds * 3);
    const gap = Math.max(1, Math.round(width / columns / 9));
    context.clearRect(0, 0, width, height);
    for (let row = 0; row < rows; row++) {
      const top = Math.round((row * height) / rows);
      const bottom = Math.round(((row + 1) * height) / rows);
      for (let column = 0; column < columns; column++) {
        const cell = row * columns + column;
        const left = Math.round((column * width) / columns);
        const right = Math.round(((column + 1) * width) / columns);
        // Each cell's turn as a sweep crosses the frame from the top left, a little out of order.
        const turn =
          0.72 * ((column / columns + row / rows) / 2) + 0.28 * (this.seeds[cell] ?? 0) * 0.96;
        let state: "flow" | "block" | "image" = "flow";
        if (mode.name === "form") {
          if (sweep > turn + BAND) state = "image";
          else if (sweep > turn - BAND) state = chance(cell, step * 7) < 0.2 ? "flow" : "block";
        } else if (mode.name === "break") {
          if (sweep < turn - BAND) state = "image";
          else if (sweep < turn + BAND) state = chance(cell, step * 7) < 0.2 ? "image" : "block";
        }
        if (state === "image") continue;
        // Beneath a sweep, the cells hide the image until their turn.
        if (mode.name !== "flow") {
          context.fillStyle = surfaceCss;
          context.fillRect(left, top, right - left, bottom - top);
        }
        if (state === "block" && this.image) {
          const at = cell * 4;
          context.fillStyle = css([this.image[at]!, this.image[at + 1]!, this.image[at + 2]!]);
          context.fillRect(left, top, right - left, bottom - top);
          continue;
        }
        const colour = this.flow(column, row, cell, seconds, step, tintShare, surface, glint);
        if (colour === null) continue;
        context.fillStyle = colour;
        context.fillRect(left + gap, top + gap, right - left - 2 * gap, bottom - top - 2 * gap);
      }
    }
  }

  /** A cell's colour in the flow, or null where the flow leaves the surface bare. */
  private flow(
    column: number,
    row: number,
    cell: number,
    seconds: number,
    step: number,
    tintShare: number,
    surface: Colour,
    glint: Colour,
  ) {
    const x = (column * CELL) / 240;
    const y = (row * CELL) / 240;
    const t = seconds;
    // Ridges of a noise field, bent by two slower fields, so they drift and curl. They are brighter
    // where a broad, slow swell passes beneath them.
    const bendX = noise(x * 0.6 + t * 0.045, y * 0.6 - t * 0.035);
    const bendY = noise(x * 0.6 + 5.2 - t * 0.03, y * 0.6 + 1.3 + t * 0.04);
    const field = noise(x * 1.2 + bendX * 1.1 + t * 0.09, y * 1.2 + bendY * 1.1 - t * 0.06);
    const ridge = (1 - Math.abs(field)) ** 7;
    const swell = noise(x * 0.45 - t * 0.05, y * 0.45 + 9.1 + t * 0.03) * 0.5 + 0.5;
    let level = clamp(ridge * (0.5 + 0.75 * swell) + swell ** 3 * 0.3);
    // Now and then a cell pops brighter, or blinks out.
    const pop = chance(cell, step);
    if (pop > 0.985) level = Math.min(1, level + 0.5);
    else if (pop < 0.01) level = 0;
    // Cells fade towards the frame's edges.
    const edge = Math.min(
      column + 0.5,
      row + 0.5,
      this.columns - column - 0.5,
      this.rows - row - 0.5,
    );
    level *= 0.55 + 0.45 * clamp(edge / 2.5);
    if (this.tint && tintShare > 0) {
      const at = cell * 4;
      const own: Colour = [this.tint[at]!, this.tint[at + 1]!, this.tint[at + 2]!];
      // In an image's colours, the flow shows as light and shade passing over it.
      const lit =
        level > 0.6
          ? mix(own, glint, (level - 0.6) * 0.6)
          : mix(surface, own, Math.min(1, 0.55 + level * 0.75));
      const themed = this.shades[Math.round(level * 63)] ?? css(surface);
      return tintShare >= 1 ? css(lit) : css(mix(parse(themed), lit, tintShare));
    }
    if (level < 0.11) return null;
    return pop > 0.985 ? css(glint) : (this.shades[Math.round(level * 63)] ?? null);
  }
}

function parse(colour: string): Colour {
  const [red = 0, green = 0, blue = 0] = colour.match(/\d+/g)?.map(Number) ?? [];
  return [red, green, blue];
}
