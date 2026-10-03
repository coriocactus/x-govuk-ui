/**
 * The charts' arithmetic, which is scales, bins, stacks, steps and the packing of a beeswarm. Every
 * function here is pure, so each is tested on its own, and none needs a browser.
 * @internal
 */

/** A figure that may be missing, as a number, or null where there is none. */
export const figureOf = (value: unknown): number | null =>
  value === null || value === undefined || value === "" || !Number.isFinite(Number(value))
    ? null
    : Number(value);

/**
 * The lowest and highest of some figures, found in one pass instead of by spreading them as
 * arguments, which a map's hundreds of thousands of points would overflow. It is null for no
 * figures.
 */
export function extentOf(values: Iterable<number>): [number, number] | null {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return low <= high ? [low, high] : null;
}

/**
 * A figure without the error that adding fractions leaves, such as 0.30000000000000004 for 0.3. It
 * keeps twelve significant figures, so a tiny figure keeps its digits and a huge one its size.
 */
export const tidy = (value: number) => Number.parseFloat(value.toPrecision(12));

/**
 * A short fingerprint of some rows' figures, which differs when any figure differs. A chart can
 * then tell new figures from the same figures given again in a new array. It costs one pass over
 * the figures, and makes no copy of them.
 */
export function fingerprint(rows: readonly Record<string, unknown>[], keys: readonly string[]) {
  let hash = 2166136261;
  for (const row of rows)
    for (const key of keys) {
      const text = `${String(row[key])}\u0001`;
      for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
    }
  return `${rows.length}:${(hash >>> 0).toString(36)}`;
}

/** The most bins a histogram counts in, however its figures and its `bins` are given. */
const MOST_BINS = 1000;

/**
 * A scale from the lowest figure to the highest, widened to round numbers with four or five steps
 * between, as a reader expects on an axis. With no figures to fit, it runs from zero to one, so a
 * chart with no figures draws an empty plot instead of one full of NaNs.
 */
export function niceScale(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max)
    return { domain: [0, 1] as [number, number], ticks: [0, 1] };
  const span = max - min || Math.abs(max) || 1;
  const magnitude = 10 ** Math.floor(Math.log10(span / 4));
  const step =
    [1, 2, 2.5, 5, 10].map((unit) => unit * magnitude).find((unit) => span / unit <= 5) ??
    magnitude * 10;
  // The ratios are tidied before they are rounded, so a figure on a tick is not taken past it.
  const low = Math.floor(tidy(min / step)) * step;
  const high = Math.max(low + step, Math.ceil(tidy(max / step)) * step);
  const count = Math.round((high - low) / step) + 1;
  const ticks = Array.from({ length: count }, (_, index) => tidy(low + index * step));
  return { domain: [tidy(low), tidy(high)] as [number, number], ticks };
}

/**
 * The five shades a heat map's cells take, each a class of figures of equal width across the
 * domain. The Analysis Function asks a sequential scale for few enough classes to tell apart, each
 * named in the key. `range` writes a class, such as "0 to 2".
 */
export function heatScale(
  domain: readonly [number, number],
  format: (value: number) => string,
  range: (from: string, to: string) => string,
) {
  const [low, high] = domain;
  const width = (high - low) / 5 || 1;
  const step = (value: number) => Math.min(5, Math.max(1, Math.floor((value - low) / width) + 1));
  const classes = Array.from({ length: 5 }, (_, index) => {
    const from = low + width * index;
    const to = index === 4 ? high : low + width * (index + 1);
    return { step: index + 1, label: range(format(from), format(to)) };
  });
  return { step, classes };
}

/** A histogram's bin, with the range it counts, from its lower edge to its upper, and its count. */
export type Bin = { low: number; high: number; middle: number; count: number };

/**
 * A histogram's bins. They use the edges given, or as many bins as Sturges' rule gives for the
 * number of figures. They have one round width, from a round edge below the lowest figure to one
 * above the highest. Each bin counts the figures from its lower edge up to its upper edge, and the
 * last bin includes its upper edge too. Identical figures take one bin a tenth of their size wide.
 *
 * The edges are computed from their count, not by adding a width to the last edge. They therefore
 * still reach figures so large that adding a width would not change them. Edges that come out the
 * same are kept once.
 */
export function binsOf(values: readonly number[], bins?: number | readonly number[]): Bin[] {
  const extent = extentOf(values);
  if (!extent) return [];
  const [low, high] = extent;
  let edges: number[];
  if (Array.isArray(bins)) edges = bins.filter(Number.isFinite).sort((a, b) => a - b);
  else {
    const asked = typeof bins === "number" && Number.isFinite(bins) && bins >= 1;
    const count = Math.min(
      MOST_BINS,
      asked ? Math.round(bins) : Math.ceil(Math.log2(values.length) + 1),
    );
    const rough = (high - low) / count || Math.abs(high) / 10 || 1;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const width =
      [1, 2, 2.5, 5, 10].map((unit) => unit * magnitude).find((unit) => unit >= rough) ??
      magnitude * 10;
    const first = Math.floor(tidy(low / width)) * width;
    const steps = Math.min(MOST_BINS, Math.max(1, Math.ceil(tidy((high - first) / width)) || 1));
    edges = Array.from({ length: steps + 1 }, (_, index) => tidy(first + index * width));
    // The last edge takes the highest figure, if the steps fall short of it.
    edges[steps] = Math.max(edges[steps] ?? high, high);
  }
  edges = edges.filter((edge, index) => index === 0 || edge > (edges[index - 1] ?? edge));
  if (edges.length < 2) return [{ low, high, middle: (low + high) / 2, count: values.length }];
  return edges.slice(0, -1).map((from, index) => {
    const to = edges[index + 1] ?? from;
    const last = index === edges.length - 2;
    let count = 0;
    for (const value of values) if (value >= from && (last ? value <= to : value < to)) count++;
    return { low: from, high: to, middle: (from + to) / 2, count };
  });
}

/**
 * Where each dot of a beeswarm's row sits off the row's line, in pixels. Each dot in turn, lowest
 * figure first, takes the place nearest the line that no placed dot covers. The dots therefore
 * never overlap, and pile up where the figures crowd. Only the dots within a dot's reach along the
 * scale can cover it. The dots are placed in order along the scale, so each looks back only that
 * far.
 *
 * No dot goes further from the line than `limit`, the row's half-height. Where the figures crowd
 * more than the row has space for, the dots at the edge overlap instead of spilling into the next
 * row. Without a limit, identical figures look back at every dot before them.
 */
export function swarmOf(at: readonly number[], radius: number, limit = Number.POSITIVE_INFINITY) {
  const order = at.map((x, index) => ({ x, index })).sort((a, b) => a.x - b.x);
  const placed: { x: number; y: number }[] = [];
  const offsets: number[] = new Array(at.length).fill(0);
  const reach = radius * 2 + 1;
  // As many dots as a row has space for within one dot's reach along the scale, side by side, with
  // a column either side. Once more than that are near, the row is full there, and a dot takes an
  // edge without searching. Identical figures then cost no more to place than spread-out ones.
  const room = Number.isFinite(limit) ? 3 * (Math.floor((2 * limit) / reach) + 1) : Infinity;
  let near = 0;
  for (const { x, index } of order) {
    while (near < placed.length && x - (placed[near]?.x ?? x) >= reach) near++;
    if (placed.length - near > room) {
      const side = Math.sign(placed.at(-1)?.y ?? 0) || 1;
      const y = -side * Math.min(limit, reach);
      placed.push({ x, y });
      offsets[index] = y;
      continue;
    }
    // The heights each near dot rules out, as a band either side of it.
    const bands: (readonly [number, number])[] = [];
    for (let each = near; each < placed.length; each++) {
      const dot = placed[each];
      if (!dot) continue;
      const half = Math.sqrt(reach * reach - (x - dot.x) ** 2);
      bands.push([dot.y - half, dot.y + half]);
    }
    const free = (y: number) => bands.every(([low, high]) => y <= low || y >= high);
    const candidates = [0, ...bands.flat()]
      .filter((y) => Math.abs(y) <= limit)
      .sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    // With no space left in the row, a dot takes the edge opposite the last dot placed.
    const side = Math.sign(placed.at(-1)?.y ?? 0) || 1;
    const y = candidates.find(free) ?? -side * Math.min(limit, reach);
    placed.push({ x, y });
    offsets[index] = y;
  }
  return offsets;
}

/**
 * A row's stack, with each figure as a range from where the one before ended. Positives go up from
 * zero, and negatives down from it. Shares divide by the row's total, so the stack reaches 1.
 */
export function stackOf(values: readonly number[], normalise: boolean) {
  const whole = normalise ? values.reduce((sum, value) => sum + Math.abs(value), 0) || 1 : 1;
  let up = 0;
  let down = 0;
  const ranges = values.map((value): [number, number] => {
    const share = value / whole;
    if (share >= 0) {
      up += share;
      return [up - share, up];
    }
    down += share;
    return [down, down - share];
  });
  return { ranges, up, down };
}

/**
 * A stream's row, with each figure as a range, stacked from below a centre line by half the row's
 * total.
 */
export function streamOf(values: readonly number[]) {
  const { ranges, up } = stackOf(
    values.map((value) => Math.max(0, value)),
    false,
  );
  return ranges.map(([low, high]): [number, number] => [low - up / 2, high - up / 2]);
}

/**
 * A waterfall's step, with its kind, its change or a total's figure, the total after it, and where
 * its bar runs from and to. A missing change stays missing. The total after it is unknown until the
 * next total, so the steps between are neither drawn nor given a running total.
 */
export type Step = {
  kind: "rise" | "fall" | "total" | "missing";
  value: number | null;
  running: number | null;
  /** Where its bar runs, or null where it cannot be placed. */
  span: readonly [number, number] | null;
};

/** Each step of a waterfall, from its changes and the indexes of its totals. */
export function waterfallOf(changes: readonly (number | null)[], totals: ReadonlySet<number>) {
  let running: number | null = 0;
  return changes.map((value, index): Step => {
    if (totals.has(index)) {
      running = value;
      return {
        kind: value === null ? "missing" : "total",
        value,
        running,
        span: value === null ? null : [Math.min(0, value), Math.max(0, value)],
      };
    }
    if (value === null) {
      running = null;
      return { kind: "missing", value, running, span: null };
    }
    const from: number | null = running;
    running = from === null ? null : from + value;
    return {
      kind: value >= 0 ? "rise" : "fall",
      value,
      running,
      span:
        from === null || running === null
          ? null
          : [Math.min(from, running), Math.max(from, running)],
    };
  });
}

/**
 * A step's change with its sign, as a waterfall labels it, a total's figure as it is, or null for a
 * missing change.
 */
export function signed(step: Pick<Step, "kind" | "value">, figure: (value: number) => string) {
  if (step.value === null) return null;
  if (step.kind === "total") return figure(step.value);
  return step.value >= 0 ? `+${figure(step.value)}` : `−${figure(Math.abs(step.value))}`;
}

/** The index of the last figure that is not missing, where a line's name goes. */
export function lastFigureOf(values: readonly (number | null)[]) {
  for (let index = values.length - 1; index >= 0; index--) if (values[index] !== null) return index;
  return values.length - 1;
}

/**
 * For a row of figures, the place of the lowest, or of the first if several are equal. Its label
 * goes the other way from the rest, so two dots close together never share a label's place. It is
 * minus one for a row with no figures.
 */
export function lowestOf(values: readonly (number | null)[]) {
  let lowest = -1;
  values.forEach((value, index) => {
    if (value !== null && (lowest < 0 || value < (values[lowest] ?? value))) lowest = index;
  });
  return lowest;
}

/**
 * The links of a flow with every loop removed, because a Sankey diagram cannot draw a loop. Each
 * link is kept unless it closes a loop with those kept before it, or joins a stage to itself.
 */
export function acyclic<Link extends { from: string; to: string }>(links: readonly Link[]) {
  const next = new Map<string, Set<string>>();
  const reaches = (from: string, to: string) => {
    const seen = new Set<string>();
    const stack = [from];
    while (stack.length) {
      const here = stack.pop() ?? "";
      if (here === to) return true;
      if (seen.has(here)) continue;
      seen.add(here);
      for (const after of next.get(here) ?? []) stack.push(after);
    }
    return false;
  };
  return links.filter((link) => {
    if (link.from === link.to || reaches(link.to, link.from)) return false;
    next.set(link.from, (next.get(link.from) ?? new Set()).add(link.to));
    return true;
  });
}

/**
 * A node of a tree of figures, for a treemap or a sunburst. A leaf has a figure, and a branch has
 * children.
 */
export type ChartNode = {
  /** The part's name, unique among its siblings. */
  name: string;
  /** A leaf's figure. A branch's is the sum of its children's. */
  value?: number;
  /** A branch's parts, which make its figure. */
  children?: readonly ChartNode[];
};

/**
 * A node's figure, which is its own, or the sum of its children's.
 * @internal
 */
export const nodeValue = (node: ChartNode): number =>
  node.children?.length
    ? node.children.reduce((sum, child) => sum + nodeValue(child), 0)
    : (node.value ?? 0);

/**
 * A node of a tree as a treemap or a sunburst lays it out. It has its figure, summed for a branch,
 * and the top branch it belongs to, for its colour. It also has how deep it lies, the path to it,
 * for its card, and its parts, laid out the same way.
 * @internal
 */
export type LaidNode = {
  name: string;
  value: number;
  branch: number;
  depth: number;
  path: string;
  children?: LaidNode[];
};

/**
 * A tree laid out for a treemap or a sunburst, each node with its figure, its branch, its depth and
 * its path.
 * @internal
 */
export function layTree(
  nodes: readonly ChartNode[],
  depth = 0,
  branch?: number,
  path: string[] = [],
): LaidNode[] {
  return nodes.map((node, index) => {
    const own = branch ?? index;
    const trail = [...path, node.name];
    return {
      name: node.name,
      value: nodeValue(node),
      branch: own,
      depth,
      path: trail.join(" › "),
      ...(node.children?.length ? { children: layTree(node.children, depth + 1, own, trail) } : {}),
    };
  });
}

/**
 * Every node of a tree, each with the path to it, the colour of its branch and its depth.
 * @internal
 */
export function flatten(nodes: readonly ChartNode[]) {
  const rows: { path: string[]; value: number; branch: number; depth: number }[] = [];
  const walk = (node: ChartNode, path: string[], branch: number) => {
    rows.push({ path: [...path, node.name], value: nodeValue(node), branch, depth: path.length });
    for (const child of node.children ?? []) walk(child, [...path, node.name], branch);
  };
  for (const [index, node] of nodes.entries()) walk(node, [], index);
  return rows;
}
