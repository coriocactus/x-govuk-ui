"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import {
  Children,
  type ComponentPropsWithRef,
  type CSSProperties,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { duration, easeOut, useMotionTiming } from "./motion";
import { useMergedRef } from "./refs";
import { ResizableHandle } from "./resizable";
import { ScrollArea } from "./scroll-area";

export type GroupedTableColumn = {
  id: string;
  /** Names the column. Screen readers hear it before each of its cells. */
  label: string;
  /**
   * Heads the column in the first group's band, in place of its label. Without it, the label heads
   * the column.
   */
  icon?: ReactNode;
  /**
   * How the column gives way when the table is short of room. "drop" leaves it out. "inline"
   * moves its cells after the row's title. `{ into }` moves them into another column, before that
   * column's own cells, such as a date into the column of the people it goes with.
   */
  collapse?: "drop" | "inline" | { into: string };
  /** Sets the cells at the end of their column, as for dates and people. */
  align?: "start" | "end";
};

/**
 * The steps in which the table gives way. Each is taken only when the step before would leave text
 * cut short or wrapped. First, the columns that drop are left out. Then the inline columns join the
 * titles, and the marks go. Then columns merge into others. Then the people in a cell stand closer
 * together. Past that, the table scrolls sideways.
 */
type Step = "full" | "drop" | "inline" | "merge" | "tight";
const order: Step[] = ["full", "drop", "inline", "merge", "tight"];
const reached = (step: Step, at: Step) => order.indexOf(step) >= order.indexOf(at);

/**
 * The grid's columns. They are one for the marks, where the bands have them, then the title's,
 * which takes the space left, then each of the tracks.
 */
const templateOf = (marks: boolean, title: number, tracks: readonly string[]) =>
  [...(marks ? ["20px"] : []), `minmax(${title}px, 1fr)`, ...tracks].join(" ");

type Layout = {
  columns: readonly GroupedTableColumn[];
  /** The columns with a track of their own, in order, each with any columns merged into it. */
  tracks: readonly { column: GroupedTableColumn; merged: readonly GroupedTableColumn[] }[];
  /** The columns whose cells follow the title. */
  inline: readonly GroupedTableColumn[];
  marks: boolean;
};
const LayoutContext = createContext<Layout | null>(null);
const FirstGroup = createContext(false);
/** Rows tell the table when they appear, as a band opens, so it measures them. */
const RowsAppear = createContext<() => void>(() => {});

export type GroupedTableProps = ComponentPropsWithRef<"div"> & {
  /** Names the table for screen readers. */
  label: string;
  columns: readonly GroupedTableColumn[];
  /** Sits above the groups, such as a title or tabs. */
  toolbar?: ReactNode;
  /** Gives the table a handle on its right edge to make it narrower or wider. */
  resizable?: boolean;
  /** The groups, as `GroupedTableGroup` parts. */
  children: ReactNode;
};

/**
 * Where a part was, by its key, before the table took another step. A part inside another, such as
 * a person in a cell, names the part that contains it.
 */
type Place = { rect: DOMRect; element: HTMLElement; row: string; holder?: string };

/**
 * Rows grouped under bands, such as issues by status, as an issue tracker sets them. Each band
 * folds its rows away. The columns are as wide as their widest cell, and line up across every
 * group, with the first band heading them.
 *
 * Text is never cut short or wrapped. As the table narrows, the columns give way in steps, each
 * only once it must. Some columns are left out, some join each row's title, and some merge into
 * others. People in a cell stand closer together. Each step moves through the rows from the top
 * down. Past the last step, the table scrolls sideways. Screen readers hear each cell's column
 * before it, wherever the cell sits. With `resizable`, a handle on the right edge narrows and
 * widens the table.
 *
 * The table measures its cells once for each step. It takes another step only when its width
 * crosses what a step needs, so resizing it costs almost nothing. Each step is animated with FLIP.
 * The cells move to their new places at once, then transforms carry them there from where they
 * were. The browser's compositor plays the transforms without the main thread.
 */
export function GroupedTable({
  label,
  columns,
  toolbar,
  resizable = false,
  children,
  className = "",
  ref,
  ...props
}: GroupedTableProps) {
  const frame = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLElement>(null);
  const [room, setRoom] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const { reduced } = useMotionTiming();

  // Only the steps that change something are taken.
  const steps = useMemo<Step[]>(
    () => [
      "full",
      ...(columns.some((column) => column.collapse === "drop") ? (["drop"] as const) : []),
      ...(columns.some((column) => column.collapse === "inline") ? (["inline"] as const) : []),
      ...(columns.some((column) => typeof column.collapse === "object")
        ? (["merge"] as const)
        : []),
      "tight",
    ],
    [columns],
  );
  const [index, setIndex] = useState(0);
  const [fonts, setFonts] = useState(0);
  // Rows in a folded band are not on the page, so they cannot be measured. The table measures
  // again when rows appear, or the columns would keep the widths of whatever step it last measured,
  // such as a narrower one taken while every band was folded.
  const [appeared, setAppeared] = useState(0);
  const appear = useCallback(() => setAppeared((count) => count + 1), []);
  const step = steps[Math.min(index, steps.length - 1)]!;
  const current = useRef(index);
  current.current = index;
  const last = useRef(steps.length - 1);
  last.current = steps.length - 1;
  // The room each step needs, measured while it was showing, and the room there is.
  const needs = useRef(new Map<number, number>());
  // The columns each step was measured to want, each column's widest cell, and the widest title at
  // any step. With every band folded, the first band still heads the columns by position. Without
  // a template, its headings would fall into extra columns that the grid adds at the end.
  const templates = useRef(new Map<number, string>());
  const widest = useRef({ title: 0, columns: new Map<string, number>() });
  const space = useRef(0);
  // Where everything was before a step, to move it from there.
  const before = useRef<Map<string, Place> | null>(null);

  const layout = useMemo<Layout>(() => {
    const dropped = new Set(
      reached(step, "drop")
        ? columns.filter((column) => column.collapse === "drop").map((column) => column.id)
        : [],
    );
    const inline = reached(step, "inline")
      ? columns.filter((column) => column.collapse === "inline")
      : [];
    const merging = reached(step, "merge");
    const tracks = columns
      .filter(
        (column) =>
          !dropped.has(column.id) &&
          !inline.includes(column) &&
          !(merging && typeof column.collapse === "object"),
      )
      .map((column) => ({
        column,
        merged: merging
          ? columns.filter(
              (other) => typeof other.collapse === "object" && other.collapse.into === column.id,
            )
          : [],
      }));
    return { columns, tracks, inline, marks: !reached(step, "inline") };
  }, [columns, step]);

  /** Notes where every moving part is, so the next step can carry each from there. */
  const remember = () => {
    const places = new Map<string, Place>();
    for (const element of frame.current?.querySelectorAll<HTMLElement>("[data-flip]") ?? []) {
      const key = element.dataset.flip!;
      const row = key.split("|")[0]!;
      places.set(key, { rect: element.getBoundingClientRect(), element, row });
      // People in a cell move closer together within it, as well as moving with it.
      element
        .querySelectorAll<HTMLElement>(".x-govuk-ui-avatar-group > *")
        .forEach((person, at) => {
          places.set(`${key}|${at}`, {
            rect: person.getBoundingClientRect(),
            element: person,
            row,
            holder: key,
          });
        });
    }
    return places;
  };

  /** The step for the room there is, from what each step was measured to need. */
  const choose = () => {
    const at = current.current;
    const need = needs.current.get(at);
    if (need !== undefined && need > space.current + 0.5 && at < last.current) return at + 1;
    const easier = needs.current.get(at - 1);
    if (at > 0 && easier !== undefined && easier <= space.current) return at - 1;
    return at;
  };

  /**
   * A change of width costs nothing unless it crosses what a step needs. Then the table notes where
   * everything is, and takes the step.
   */
  const follow = () => {
    const viewport = body.current?.closest<HTMLElement>(".x-govuk-ui-scroll-area-viewport");
    if (!viewport) return;
    space.current = viewport.clientWidth;
    const next = choose();
    if (next === current.current) return;
    before.current ??= remember();
    setIndex(next);
  };

  // The table watches its own width and its container's. The browser reports a new width after
  // laying the page out, so a step it calls for is taken in the next frame. Taking it at once would
  // resize the table while the browser is still reporting sizes, which it treats as a loop.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The observer reads the latest step through refs.
  useLayoutEffect(() => {
    const element = frame.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    const observer = new ResizeObserver(() => {
      setRoom((was) => (Math.abs(was - parent.clientWidth) < 0.5 ? was : parent.clientWidth));
      follow();
    });
    observer.observe(element);
    observer.observe(parent);
    // Text measured before the fonts arrive is the fallback font's, so it is measured again.
    document.fonts?.ready.then(() => {
      needs.current.clear();
      templates.current.clear();
      widest.current = { title: 0, columns: new Map() };
      setFonts((count) => count + 1);
    });
    return () => observer.disconnect();
  }, []);

  // The handle sets the width while React renders, so a step it calls for is taken before the
  // frame is drawn, and the columns never show cut short at the new width.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each width the handle sets.
  useLayoutEffect(follow, [chosen]);

  /**
   * Measures what the rows need at this step, which is the widest title with anything that joined
   * it, and the widest cell in each column. The columns take those widths, and the need is noted
   * for the step. All the reading is done before any writing, so the browser lays the table out
   * once.
   */
  const measure = () => {
    const content = body.current;
    const table = frame.current;
    if (!content || !table) return;
    const rows = [...content.querySelectorAll<HTMLElement>(".x-govuk-ui-grouped-table-row")];
    const first = rows[0];
    const marks = layout.marks;
    // With every band folded there is nothing to measure, so the columns are the current step's as
    // last measured, or else as wide as each was at any step. The need is left unknown.
    if (!first) {
      const { title, columns: kept } = widest.current;
      const tracks = layout.tracks.map(({ column }) => {
        const width = kept.get(column.id);
        return width === undefined ? "auto" : `${width}px`;
      });
      table.style.setProperty(
        "--x-govuk-ui-grouped-columns",
        templates.current.get(current.current) ?? templateOf(marks, title, tracks),
      );
      return;
    }
    const style = getComputedStyle(first);
    const gap = Number.parseFloat(style.columnGap) || 0;
    const pad = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
    const edges = getComputedStyle(content);
    const outer = Number.parseFloat(edges.paddingLeft) + Number.parseFloat(edges.paddingRight);
    let title = 0;
    const widths: number[] = [];
    for (const row of rows) {
      const block = row.querySelector<HTMLElement>(".x-govuk-ui-grouped-table-title");
      if (block) {
        const parts = [...block.children] as HTMLElement[];
        const between = Number.parseFloat(getComputedStyle(block).columnGap) || 0;
        const width =
          parts.reduce((sum, part) => sum + part.offsetWidth, 0) +
          Math.max(0, parts.length - 1) * between;
        title = Math.max(title, width);
      }
      row
        .querySelectorAll<HTMLElement>(
          ':scope > [data-place="track"] > .x-govuk-ui-grouped-table-content',
        )
        .forEach((cell, place) => {
          widths[place] = Math.max(widths[place] ?? 0, cell.offsetWidth);
        });
    }
    // A column headed by its label is at least as wide as the label.
    content
      .querySelectorAll<HTMLElement>(".x-govuk-ui-grouped-table-heading-text")
      .forEach((text) => {
        const place = Number(text.parentElement?.dataset.place);
        widths[place] = Math.max(widths[place] ?? 0, text.offsetWidth);
      });
    widest.current.title = Math.max(widest.current.title, title);
    layout.tracks.forEach(({ column }, place) => {
      const width = widths[place];
      if (width !== undefined)
        widest.current.columns.set(
          column.id,
          Math.max(widest.current.columns.get(column.id) ?? 0, width),
        );
    });
    needs.current.set(
      current.current,
      outer +
        pad +
        (marks ? 20 + gap : 0) +
        title +
        widths.reduce((sum, width) => sum + width + gap, 0),
    );
    // Written straight to the table, so the rows are not rendered again for it.
    const template = templateOf(
      marks,
      title,
      widths.map((w) => `${w}px`),
    );
    templates.current.set(current.current, template);
    table.style.setProperty("--x-govuk-ui-grouped-columns", template);
  };

  // After each step, the table measures it. If the room is still short, it takes the next step at
  // once, before anything is drawn. Once a step fits, everything moves from where it was.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each step, the fonts arriving and rows appearing are measured once.
  useLayoutEffect(() => {
    if (space.current === 0) {
      const viewport = body.current?.closest<HTMLElement>(".x-govuk-ui-scroll-area-viewport");
      space.current = viewport?.clientWidth ?? 0;
    }
    measure();
    const next = choose();
    if (next !== index) return setIndex(next);
    const places = before.current;
    before.current = null;
    if (places && !reduced) play(places);
  }, [index, layout, fonts, appeared]);

  /**
   * Plays a step with FLIP. Each part already sits in its new place, so a transform shows it where
   * it was, and then lets it go. Parts that arrive fade in, and parts that went fade out where they
   * were. Each row starts a moment after the one above, so the step moves down the table.
   */
  const play = (places: Map<string, Place>) => {
    const table = frame.current;
    if (!table) return;
    const rows = new Map(
      [...table.querySelectorAll<HTMLElement>(".x-govuk-ui-grouped-table-row")].map(
        (row, place) => [row.dataset.row!, { row, place }],
      ),
    );
    const timing = (row: string): KeyframeAnimationOptions => ({
      duration: duration.medium * 1000,
      easing: `cubic-bezier(${easeOut.join(",")})`,
      delay: Math.min(rows.get(row)?.place ?? 0, 10) * 16,
      fill: "backwards",
    });
    const now = remember();
    for (const [key, place] of now) {
      const was = places.get(key);
      if (!was) {
        place.element.animate(
          [{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1 }],
          timing(place.row),
        );
        continue;
      }
      // A part inside another moves relative to it, because its container moves it too.
      const outer = place.holder
        ? { now: now.get(place.holder)?.rect, was: places.get(place.holder)?.rect }
        : null;
      const dx =
        was.rect.left - place.rect.left - ((outer?.was?.left ?? 0) - (outer?.now?.left ?? 0));
      const dy = was.rect.top - place.rect.top - ((outer?.was?.top ?? 0) - (outer?.now?.top ?? 0));
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      place.element.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
        timing(place.row),
      );
    }
    // What went fades out where it was, as a copy laid over the row. Every row is measured before
    // any copy is added, because measuring a row after adding a copy lays out the table again.
    const gone = [...places].flatMap(([key, was]) => {
      const row = now.has(key) || was.holder ? undefined : rows.get(was.row)?.row;
      return row ? [{ was, row, box: row.getBoundingClientRect() }] : [];
    });
    for (const { was, row, box } of gone) {
      const ghost = was.element.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("data-flip");
      ghost.setAttribute("aria-hidden", "true");
      Object.assign(ghost.style, {
        position: "absolute",
        left: `${was.rect.left - box.left}px`,
        top: `${was.rect.top - box.top}px`,
        width: `${was.rect.width}px`,
        height: `${was.rect.height}px`,
        margin: "0",
        pointerEvents: "none",
      });
      row.append(ghost);
      ghost
        .animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(4px)" }], {
          ...timing(was.row),
          fill: "both",
        })
        .finished.then(
          () => ghost.remove(),
          () => ghost.remove(),
        );
    }
  };

  const groups = Children.toArray(children);
  const mergedRef = useMergedRef(frame, ref);
  return (
    <div
      {...props}
      ref={mergedRef}
      className={`x-govuk-ui-grouped-table ${className}`.trim()}
      data-step={step}
      style={{ width: chosen === null ? undefined : `${chosen}px` } as CSSProperties}
    >
      {toolbar && <div className="x-govuk-ui-grouped-table-toolbar">{toolbar}</div>}
      {/* Past the last step, the groups scroll sideways rather than cut any text short. */}
      <ScrollArea orientation="horizontal" className="x-govuk-ui-grouped-table-scroll">
        <section ref={body} className="x-govuk-ui-grouped-table-groups" aria-label={label}>
          <LayoutContext value={layout}>
            <RowsAppear value={appear}>
              {groups.map((group, place) => (
                <FirstGroup key={(group as { key?: string }).key ?? place} value={place === 0}>
                  {group}
                </FirstGroup>
              ))}
            </RowsAppear>
          </LayoutContext>
        </section>
      </ScrollArea>
      {resizable && room > 0 && (
        <ResizableHandle
          label="Width of the table"
          grip
          panel="before"
          value={chosen ?? room}
          min={Math.min(room, 280)}
          max={room}
          step={20}
          defaultValue={room}
          onValueChange={(next) => setChosen(next >= room ? null : next)}
          className="x-govuk-ui-grouped-table-handle"
        />
      )}
    </div>
  );
}

export type GroupedTableGroupProps = Omit<ComponentPropsWithRef<"div">, "onOpenChange"> & {
  /** The band's name, such as In review. */
  label: ReactNode;
  /** Sits before the name, such as a status's mark. */
  icon?: ReactNode;
  /** The number beside the name. By default, the number of rows. */
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The rows, as `GroupedTableRow` parts. */
  children: ReactNode;
};

/**
 * A band with its rows beneath. Pressing the band folds the rows away, and the first band heads
 * the columns. Built on Base UI's Collapsible.
 */
export function GroupedTableGroup({
  label,
  icon,
  count,
  defaultOpen = true,
  open,
  onOpenChange,
  children,
  className = "",
  ...props
}: GroupedTableGroupProps) {
  const layout = useContext(LayoutContext);
  const first = useContext(FirstGroup);
  const rows = Children.count(children);
  const start = layout?.marks ? 3 : 2;
  return (
    <Collapsible.Root
      {...props}
      className={`x-govuk-ui-grouped-table-group ${className}`.trim()}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="x-govuk-ui-grouped-table-band">
        <Collapsible.Trigger className="x-govuk-ui-grouped-table-trigger">
          {icon && layout?.marks && (
            <span className="x-govuk-ui-grouped-table-mark" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="x-govuk-ui-grouped-table-name">{label}</span>
          <span className="x-govuk-ui-grouped-table-count">{count ?? rows}</span>
          <svg
            className="x-govuk-ui-grouped-table-chevron"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden="true"
          >
            <path d="m4 10 4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </Collapsible.Trigger>
        {/* The first band heads the columns with their icons. The last is left for the chevron. */}
        {first &&
          layout?.tracks.map(({ column, merged }, place) =>
            place < layout.tracks.length - 1 ? (
              <span
                key={column.id}
                data-flip={`band|${column.id}`}
                className="x-govuk-ui-grouped-table-heading"
                data-align={column.align}
                style={{ gridColumn: start + place }}
                data-place={place}
                aria-hidden="true"
                title={[...merged, column].map((each) => each.label).join(", ")}
              >
                {merged[0]?.icon ?? column.icon ?? (
                  <span className="x-govuk-ui-grouped-table-heading-text">
                    {[...merged, column].map((each) => each.label).join(" · ")}
                  </span>
                )}
              </span>
            ) : null,
          )}
      </div>
      <Collapsible.Panel className="x-govuk-ui-grouped-table-panel">
        <ul className="x-govuk-ui-grouped-table-rows">{children}</ul>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

export type GroupedTableRowProps = Omit<ComponentPropsWithRef<"li">, "title"> & {
  /** The row's name, such as an issue's title. */
  title: ReactNode;
  /** Sits before the title while there is room, such as a priority's mark. */
  icon?: ReactNode;
  /** Each column's cell, by the column's id. */
  cells: Partial<Record<string, ReactNode>>;
};

/** One row, with its mark, its title, and a cell for each column. */
export function GroupedTableRow({
  title,
  icon,
  cells,
  className = "",
  ...props
}: GroupedTableRowProps) {
  const layout = useContext(LayoutContext);
  const appear = useContext(RowsAppear);
  const id = useId();
  useLayoutEffect(appear, [appear]);
  if (!layout) return null;
  // Each part is known by its row and column, so it can move from its old place to its new one.
  const cell = (column: GroupedTableColumn) => (
    <span
      key={column.id}
      data-flip={`${id}|${column.id}`}
      className="x-govuk-ui-grouped-table-part"
      data-align={column.align}
    >
      <span className="x-govuk-ui-visually-hidden">{column.label}: </span>
      {cells[column.id]}
    </span>
  );
  const start = layout.marks ? 3 : 2;
  return (
    <li {...props} className={`x-govuk-ui-grouped-table-row ${className}`.trim()} data-row={id}>
      {layout.marks && (
        <span data-flip={`${id}|mark`} className="x-govuk-ui-grouped-table-mark" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="x-govuk-ui-grouped-table-title">
        <span data-flip={`${id}|title`} className="x-govuk-ui-grouped-table-title-text">
          {title}
        </span>
        {layout.inline.map((column) => (
          <span key={column.id} className="x-govuk-ui-grouped-table-cell" data-place="inline">
            {cell(column)}
          </span>
        ))}
      </span>
      {layout.tracks.map(({ column, merged }, place) => (
        <span
          key={column.id}
          className="x-govuk-ui-grouped-table-cell"
          data-place="track"
          data-align={column.align}
          style={{ gridColumn: start + place }}
        >
          <span className="x-govuk-ui-grouped-table-content">
            {merged.map(cell)}
            {cell(column)}
          </span>
        </span>
      ))}
    </li>
  );
}
