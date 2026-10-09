"use client";

import { type ReactNode, useLayoutEffect, useMemo, useRef } from "react";
import { Button } from "./button";
import { MoreIcon } from "./icons";
import { DropdownMenu, DropdownMenuTrigger, MenuContent, MenuItem } from "./menu";
import { glideEasing, useMotionTiming } from "./motion";
import {
  Sheet,
  SheetClose,
  SheetContent,
  type SheetContentProps,
  SheetDescription,
  SheetTitle,
} from "./sheet";
import { useStoredState } from "./stored-state";
import { Switch } from "./switch";
import { Tooltip } from "./tooltip";

/** An entry the sidebar can show, with its id, its name, and the group it belongs to. */
export type SidebarEntry = {
  id: string;
  label: string;
  group: string;
  /**
   * What SidebarCustomise shows after the entry's name, as SidebarItem shows its `badge`, such as
   * a count or a Tag.
   */
  badge?: ReactNode;
};

/**
 * How someone has arranged a sidebar, as its groups' order, each group's entries, and which entries
 * are pinned or hidden.
 */
export type SidebarArrangement = {
  groups: string[];
  order: Record<string, string[]>;
  pinned: string[];
  hidden: string[];
};

export type UseSidebarArrangementOptions = {
  /** Every entry the sidebar can show, in its own order. */
  entries: readonly SidebarEntry[];
  /** The groups in their own order. By default, the order in which the entries first name them. */
  groups?: readonly string[];
  /**
   * Keeps the arrangement in local storage under this key, so it lasts between visits. Without it,
   * the arrangement lasts only while the page is open.
   */
  storageKey?: string;
};

export type SidebarArranger = ReturnType<typeof useSidebarArrangement>;

const moved = <T,>(list: readonly T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
};

/**
 * A kept arrangement, made to fit the entries as they are now. Entries no longer there are dropped,
 * and new entries join their group where the entries list them.
 */
function fit(
  kept: Partial<SidebarArrangement> | null,
  entries: readonly SidebarEntry[],
  groups: readonly string[],
): SidebarArrangement {
  const known = new Map(entries.map((entry) => [entry.id, entry]));
  const allGroups = (kept?.groups ?? []).filter((group) => groups.includes(group));
  groups.forEach((group, index) => {
    if (!allGroups.includes(group)) allGroups.splice(Math.min(index, allGroups.length), 0, group);
  });
  const order = Object.fromEntries(
    groups.map((group) => {
      const own = entries.filter((entry) => entry.group === group).map((entry) => entry.id);
      const list = [
        ...new Set((kept?.order?.[group] ?? []).filter((id) => known.get(id)?.group === group)),
      ];
      own.forEach((id, index) => {
        if (!list.includes(id)) list.splice(Math.min(index, list.length), 0, id);
      });
      return [group, list];
    }),
  );
  const listed = (ids: unknown) =>
    [...new Set(Array.isArray(ids) ? (ids as string[]) : [])].filter((id) => known.has(id));
  return { groups: allGroups, order, pinned: listed(kept?.pinned), hidden: listed(kept?.hidden) };
}

/**
 * A sidebar that users arrange for themselves. They pin entries to the top, hide the ones they do
 * not use, and move entries and groups up or down. It returns the arrangement and the ways to
 * change it, for SidebarItemMenu, SidebarCustomise and the sidebar's own groups to share. Every
 * part that uses the same `storageKey` sees the same arrangement.
 */
export function useSidebarArrangement({
  entries,
  groups: ownGroups,
  storageKey,
}: UseSidebarArrangementOptions) {
  const groups = useMemo(
    () => ownGroups ?? [...new Set(entries.map((entry) => entry.group))],
    [ownGroups, entries],
  );
  const [kept, keep] = useStoredState<Partial<SidebarArrangement> | null>(storageKey, null);
  const signature = JSON.stringify(kept);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the arrangement follows what is kept.
  const arrangement = useMemo(() => fit(kept, entries, groups), [signature, entries, groups]);
  const labels = useMemo(
    () => Object.fromEntries(entries.map((entry) => [entry.id, entry.label])),
    [entries],
  );
  const badges = useMemo(
    () =>
      Object.fromEntries(
        entries.flatMap((entry) => (entry.badge === undefined ? [] : [[entry.id, entry.badge]])),
      ) as Record<string, ReactNode>,
    [entries],
  );
  const groupOf = (id: string) => entries.find((entry) => entry.id === id)?.group ?? "";
  const isPinned = (id: string) => arrangement.pinned.includes(id);
  const isHidden = (id: string) => arrangement.hidden.includes(id);
  /** A group's entries as the sidebar lists them, without those pinned or hidden. */
  const listed = (group: string) =>
    (arrangement.order[group] ?? []).filter((id) => !isPinned(id) && !isHidden(id));
  /** The entries listed with this one, in the sidebar, or in the full list with `all`. */
  const siblings = (id: string, all: boolean) => {
    if (isPinned(id)) return arrangement.pinned;
    if (all) return arrangement.order[groupOf(id)] ?? [];
    return listed(groupOf(id));
  };

  return {
    arrangement,
    /** Each entry's name, by its id. */
    labels,
    /** Each entry's badge, by its id, for those that have one. */
    badges,
    /** Whether the arrangement is still the entries' own. */
    original: kept === null,
    /** The entries the sidebar shows, in its order, with the pinned first, then each group's. */
    shown: [...arrangement.pinned, ...arrangement.groups.flatMap(listed)],
    listed,
    isPinned,
    isHidden,
    pin: (id: string) =>
      keep({
        ...arrangement,
        pinned: isPinned(id) ? arrangement.pinned : [...arrangement.pinned, id],
        hidden: arrangement.hidden.filter((each) => each !== id),
      }),
    unpin: (id: string) =>
      keep({ ...arrangement, pinned: arrangement.pinned.filter((each) => each !== id) }),
    /** Hiding an entry unpins it. */
    hide: (id: string) =>
      keep({
        ...arrangement,
        hidden: [...arrangement.hidden.filter((each) => each !== id), id],
        pinned: arrangement.pinned.filter((each) => each !== id),
      }),
    show: (id: string) =>
      keep({ ...arrangement, hidden: arrangement.hidden.filter((each) => each !== id) }),
    /**
     * Whether an entry can move a place up or down. In the sidebar, it passes over hidden entries,
     * so the move shows. With `all`, in the full list, it moves past the next entry, shown or not.
     */
    canMove: (id: string, by: -1 | 1, all = false) => {
      const list = siblings(id, all);
      const at = list.indexOf(id);
      return at !== -1 && at + by >= 0 && at + by < list.length;
    },
    move: (id: string, by: -1 | 1, all = false) => {
      if (isPinned(id)) {
        const at = arrangement.pinned.indexOf(id);
        if (at + by < 0 || at + by >= arrangement.pinned.length) return;
        keep({ ...arrangement, pinned: moved(arrangement.pinned, at, at + by) });
        return;
      }
      const group = groupOf(id);
      const full = arrangement.order[group] ?? [];
      const list = siblings(id, all);
      const neighbour = list[list.indexOf(id) + by];
      if (!neighbour) return;
      keep({
        ...arrangement,
        order: {
          ...arrangement.order,
          [group]: moved(full, full.indexOf(id), full.indexOf(neighbour)),
        },
      });
    },
    moveGroup: (group: string, by: -1 | 1) => {
      const at = arrangement.groups.indexOf(group);
      if (at + by < 0 || at + by >= arrangement.groups.length) return;
      keep({ ...arrangement, groups: moved(arrangement.groups, at, at + by) });
    },
    /** Puts the sidebar back as its entries list it. */
    reset: () => keep(null),
  };
}

const line = (path: string): ReactNode => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

const icons = {
  pin: line("M9 3h6l-1 6 3.5 3.5h-11L10 9zM12 12.5V21"),
  up: line("m6 15 6-6 6 6"),
  down: line("m6 9 6 6 6-6"),
  hide: line(
    "M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 8.5 4 9.5 6a12 12 0 0 1-2.4 3.2M6.5 7.6A12 12 0 0 0 2.5 12c1 2 4.5 6 9.5 6a9 9 0 0 0 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  ),
};

export type SidebarItemMenuLabels = {
  /** The dots' name for screen readers, given the entry's name, such as "Options for Input". */
  options: (label: string) => string;
  pin: string;
  unpin: string;
  moveUp: string;
  moveDown: string;
  hide: string;
};

const menuWords: SidebarItemMenuLabels = {
  options: (label) => `Options for ${label}`,
  pin: "Pin to the top",
  unpin: "Unpin",
  moveUp: "Move up",
  moveDown: "Move down",
  hide: "Hide from the sidebar",
};

export type SidebarItemMenuProps = {
  arranger: SidebarArranger;
  /** The entry's id. */
  id: string;
  /** The menu's words, such as for Welsh. */
  labels?: Partial<SidebarItemMenuLabels>;
  className?: string;
};

/**
 * An entry's own menu, from three dots at the end of its row, as a SidebarItem's `action`. It pins
 * the entry to the top or unpins it, moves it up or down among the entries beside it, or hides it.
 * The dots stay out of the tab order, so a long list stays quick to tab through. SidebarCustomise
 * offers the same choices from the keyboard.
 */
export function SidebarItemMenu({ arranger, id, labels, className = "" }: SidebarItemMenuProps) {
  const words = { ...menuWords, ...labels };
  const pinned = arranger.isPinned(id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        variant="quiet"
        size="small-icon"
        chevron={false}
        className={`x-govuk-ui-sidebar-item-action ${className}`.trim()}
        aria-label={words.options(arranger.labels[id] ?? id)}
        tabIndex={-1}
      >
        <MoreIcon />
      </DropdownMenuTrigger>
      <MenuContent align="start">
        <MenuItem
          icon={icons.pin}
          onSelect={() => (pinned ? arranger.unpin(id) : arranger.pin(id))}
        >
          {pinned ? words.unpin : words.pin}
        </MenuItem>
        <MenuItem
          icon={icons.up}
          disabled={!arranger.canMove(id, -1)}
          onSelect={() => arranger.move(id, -1)}
        >
          {words.moveUp}
        </MenuItem>
        <MenuItem
          icon={icons.down}
          disabled={!arranger.canMove(id, 1)}
          onSelect={() => arranger.move(id, 1)}
        >
          {words.moveDown}
        </MenuItem>
        <MenuItem icon={icons.hide} onSelect={() => arranger.hide(id)}>
          {words.hide}
        </MenuItem>
      </MenuContent>
    </DropdownMenu>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  disabled,
  pressed,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <Tooltip content={label}>
      <Button
        variant="quiet"
        size="small-icon"
        aria-label={label}
        aria-pressed={pressed}
        // When unavailable, it stays in the tab order and does nothing.
        aria-disabled={disabled || undefined}
        onClick={disabled ? undefined : onClick}
      >
        {icon}
      </Button>
    </Tooltip>
  );
}

/**
 * Where something is, as its top, measured from the nearest container that also moves, such as a
 * row from its group's section. A row in a moving section then glides only by its own move.
 */
function placeOf(element: HTMLElement) {
  const holder = element.parentElement?.closest<HTMLElement>("[data-glide]");
  return element.getBoundingClientRect().top - (holder?.getBoundingClientRect().top ?? 0);
}

export type SidebarCustomiseLabels = {
  title: string;
  description: ReactNode;
  pinned: string;
  nothingPinned: string;
  /** A row's controls, given the entry's or group's name. */
  showEntry: (label: string) => string;
  pinEntry: (label: string) => string;
  unpinEntry: (label: string) => string;
  moveUp: (label: string) => string;
  moveDown: (label: string) => string;
  done: string;
  reset: string;
  close: string;
};

const customiseWords: SidebarCustomiseLabels = {
  title: "Customise the sidebar",
  description:
    "Choose what the sidebar shows, and in what order. Pinned entries come first. Your choices are kept in this browser.",
  pinned: "Pinned",
  nothingPinned: "Nothing is pinned. Pin an entry to keep it at the top.",
  showEntry: (label) => `Show ${label}`,
  pinEntry: (label) => `Pin ${label} to the top`,
  unpinEntry: (label) => `Unpin ${label}`,
  moveUp: (label) => `Move ${label} up`,
  moveDown: (label) => `Move ${label} down`,
  done: "Done",
  reset: "Reset to the original",
  close: "Close",
};

// The sheet's panel takes the other props, as a `SheetContent` does.
export type SidebarCustomiseProps = Omit<SheetContentProps, "children" | "label"> & {
  arranger: SidebarArranger;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The sheet's words, such as for Welsh, or to call the entries by what the sidebar lists. */
  labels?: Partial<SidebarCustomiseLabels>;
};

/**
 * A sheet where users arrange a sidebar. It lists the pinned entries first, then each group, with
 * its entries. Each group moves up or down. Each row has a small Switch at its end to show or hide
 * the entry.
 *
 * Under the pointer, or with keyboard focus in it, a row also offers its pin, with Move up and Move
 * down after it. The pin comes in from the left as the name eases aside to make space. A pinned
 * entry keeps its pin in view. Changes show in the sidebar at once, and rows glide to their new
 * places. Reset puts the sidebar back as it was.
 */
export function SidebarCustomise({
  arranger,
  open,
  onOpenChange,
  labels,
  className = "",
  ...props
}: SidebarCustomiseProps) {
  const words = { ...customiseWords, ...labels };
  const { arrangement } = arranger;
  const { reduced } = useMotionTiming();
  const root = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, number> | null>(null);
  const note = () => {
    before.current = new Map(
      [...(root.current?.querySelectorAll<HTMLElement>("[data-glide]") ?? [])].map((row) => [
        row.dataset.glide ?? "",
        placeOf(row),
      ]),
    );
  };
  const signature = JSON.stringify(arrangement);
  // biome-ignore lint/correctness/useExhaustiveDependencies: rows glide after each change.
  useLayoutEffect(() => {
    const was = before.current;
    before.current = null;
    if (!was || reduced) return;
    // Every place is read before any glide starts, so none is read part way through another's.
    const moves = [...(root.current?.querySelectorAll<HTMLElement>("[data-glide]") ?? [])]
      .map((row) => {
        const from = was.get(row.dataset.glide ?? "");
        return { row, by: from === undefined ? 0 : from - placeOf(row) };
      })
      .filter(({ by }) => Math.abs(by) >= 1);
    for (const { row, by } of moves)
      row.animate([{ transform: `translateY(${by}px)` }, { transform: "none" }], {
        duration: glideEasing.duration,
        easing: glideEasing.easing,
      });
  }, [signature, reduced]);

  /** Notes where everything is, then makes the change, so it glides. */
  const then =
    <Args extends unknown[]>(change: (...args: Args) => void) =>
    (...args: Args) => {
      note();
      change(...args);
    };
  const move = then(arranger.move);
  const moveGroup = then(arranger.moveGroup);
  const pin = then(arranger.pin);
  const unpin = then(arranger.unpin);

  const row = (id: string, group?: string) => {
    const pinned = arranger.isPinned(id);
    const shown = !arranger.isHidden(id);
    const label = arranger.labels[id] ?? id;
    const badge = arranger.badges[id];
    const all = group !== undefined;
    // A pinned entry moves among the pinned, at the top, not in its group.
    const movable = !(all && pinned);
    return (
      <li
        key={id}
        className="x-govuk-ui-sidebar-customise-row"
        data-glide={`${group ?? ""}:${id}`}
        data-pinned={pinned || undefined}
        data-hidden={!shown || undefined}
      >
        {/* The pin and name move as one. The pin comes in from the left as the name
            makes space. */}
        <span className="x-govuk-ui-sidebar-customise-lead">
          <span className="x-govuk-ui-sidebar-customise-pin">
            <IconButton
              label={pinned ? words.unpinEntry(label) : words.pinEntry(label)}
              icon={icons.pin}
              pressed={pinned}
              onClick={() => (pinned ? unpin(id) : pin(id))}
            />
          </span>
          {/* The badge follows the name, and moves aside for the pin with it. */}
          <span className="x-govuk-ui-sidebar-customise-name">
            <span className="x-govuk-ui-sidebar-customise-label">{label}</span>
            {badge !== undefined && (
              <span className="x-govuk-ui-sidebar-customise-badge">{badge}</span>
            )}
          </span>
        </span>
        {movable && (
          <span className="x-govuk-ui-sidebar-customise-move">
            <IconButton
              label={words.moveUp(label)}
              icon={icons.up}
              disabled={!arranger.canMove(id, -1, all)}
              onClick={() => move(id, -1, all)}
            />
            <IconButton
              label={words.moveDown(label)}
              icon={icons.down}
              disabled={!arranger.canMove(id, 1, all)}
              onClick={() => move(id, 1, all)}
            />
          </span>
        )}
        {all && (
          <Switch
            size="small"
            label={words.showEntry(label)}
            hideLabel
            checked={shown}
            onCheckedChange={(on) => (on ? arranger.show(id) : arranger.hide(id))}
          />
        )}
      </li>
    );
  };

  return (
    <Sheet side="right" open={open} onOpenChange={onOpenChange}>
      <SheetContent
        {...props}
        className={`x-govuk-ui-sidebar-customise ${className}`.trim()}
        closeButton
        closeLabel={words.close}
      >
        <SheetTitle>{words.title}</SheetTitle>
        <SheetDescription>{words.description}</SheetDescription>
        <div ref={root} className="x-govuk-ui-sidebar-customise-groups">
          <section className="x-govuk-ui-sidebar-customise-group" aria-label={words.pinned}>
            <h3 className="x-govuk-ui-sidebar-customise-heading">{words.pinned}</h3>
            {arrangement.pinned.length > 0 ? (
              <ul className="x-govuk-ui-sidebar-customise-list">
                {arrangement.pinned.map((id) => row(id))}
              </ul>
            ) : (
              <p className="x-govuk-ui-sidebar-customise-empty">{words.nothingPinned}</p>
            )}
          </section>
          {arrangement.groups.map((group, index) => (
            <section
              key={group}
              className="x-govuk-ui-sidebar-customise-group"
              data-glide={group}
              aria-label={group}
            >
              <div className="x-govuk-ui-sidebar-customise-group-head">
                <h3 className="x-govuk-ui-sidebar-customise-heading">{group}</h3>
                <span className="x-govuk-ui-sidebar-customise-move">
                  <IconButton
                    label={words.moveUp(group)}
                    icon={icons.up}
                    disabled={index === 0}
                    onClick={() => moveGroup(group, -1)}
                  />
                  <IconButton
                    label={words.moveDown(group)}
                    icon={icons.down}
                    disabled={index === arrangement.groups.length - 1}
                    onClick={() => moveGroup(group, 1)}
                  />
                </span>
              </div>
              <ul className="x-govuk-ui-sidebar-customise-list">
                {(arrangement.order[group] ?? []).map((id) => row(id, group))}
              </ul>
            </section>
          ))}
        </div>
        <div className="x-govuk-ui-sidebar-customise-actions">
          <SheetClose variant="primary">{words.done}</SheetClose>
          <Button
            variant="secondary"
            aria-disabled={arranger.original || undefined}
            onClick={() => {
              if (arranger.original) return;
              note();
              arranger.reset();
            }}
          >
            {words.reset}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
