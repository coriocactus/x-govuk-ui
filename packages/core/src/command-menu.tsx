"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button, type ButtonProps, withoutButtonLook } from "./button";
import { useControllableState } from "./controllable-state";
import { chain } from "./events";
import { trackHighlight } from "./highlight";
import { Kbd } from "./kbd";
import { useLabels } from "./labels";
import { duration, easeOut, useMotionTiming } from "./motion";
import { useLatest, useMergedRef } from "./refs";
import { ScrollArea } from "./scroll-area";
import { shortcutKeys } from "./shortcut";
import { useScopeSound } from "./sound-scope";

/** A command as the search reads it. */
export type CommandMenuCommand = {
  /** Its name, as plain text, or empty where its label is not text and it has no `textValue`. */
  name: string;
  /** Its description, as plain text, or empty where it has none, or where it is not text. */
  description: string;
  keywords: readonly string[];
};

type Entry = { command: CommandMenuCommand; page: string | null };

/** How a CommandMenuBestMatches ranks commands, and how many it shows. */
type BestMatches = {
  rank: (search: string, command: CommandMenuCommand) => number | null;
  limit: number;
};
type Page = { id: string; label: string; placeholder?: string };

type MenuContextValue = {
  /** The open page, or null at the top level. */
  page: string | null;
  /** The commands that match the search on the open page. */
  visible: Set<string>;
  /** Each command shown among the best matches, by its place there. */
  best: Map<string, number>;
  /** Where each best match is drawn, by its place, once a CommandMenuBestMatches is there. */
  slots: (HTMLElement | null)[];
  entries: Map<string, Entry>;
  pages: Map<string, Page>;
  /** Opens a page, or closes the menu and runs the command. */
  choose: (opens: string | undefined, onSelect: (() => void) | undefined) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);
// Items inside a page belong to it. Items outside belong to the top level.
const PageContext = createContext<string | null>(null);

function useMenu(part: string) {
  const context = useContext(MenuContext);
  if (!context) throw new Error(`${part} must be inside CommandMenu.`);
  return context;
}

/**
 * The search a CommandMenu makes by default. Every word of the search appears somewhere in the
 * command's name, description or keywords.
 */
export function matchesCommand(search: string, command: CommandMenuCommand) {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = [command.name, command.description, ...command.keywords].join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * How a CommandMenuBestMatches ranks commands by default, lower first. A command whose name is the
 * search ranks 0, and one whose name starts with it ranks 1. Any other is not a best match, such as
 * one the search finds only by a group's keyword.
 */
export function rankCommandByName(search: string, command: CommandMenuCommand) {
  const typed = search.trim().toLowerCase();
  const name = command.name.trim().toLowerCase();
  if (!typed || !name) return null;
  if (name === typed) return 0;
  return name.startsWith(typed) ? 1 : null;
}

/**
 * The list's Scroll area follows the height of its commands, so filtering and pages resize it
 * smoothly.
 * The new height is set in the next frame, because setting it while the observer reports a
 * change would resize the list again within the same frame.
 */
function followHeight(scroller: HTMLDivElement | null) {
  const area = scroller?.parentElement;
  const content = scroller?.firstElementChild;
  if (!area || !(content instanceof HTMLElement)) return;
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const height = `${content.offsetHeight}px`;
      if (area.style.height !== height) area.style.height = height;
    });
  });
  observer.observe(content);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}

/**
 * Tracks the highlight and follows the commands' height, in the viewport of the list's Scroll area.
 */
function followScroller(viewport: HTMLDivElement | null) {
  const highlight = trackHighlight(viewport, {
    indicator: ".x-govuk-ui-command-menu-indicator",
    item: ".x-govuk-ui-command-menu-item[data-highlighted]",
  });
  const height = followHeight(viewport);
  return () => {
    highlight?.();
    height?.();
  };
}

/** The words Command menu writes, which a LabelsProvider or its `labels` can change. */
export type CommandMenuLabels = {
  /** The built-in button that opens the menu. */
  trigger: string;
  /** The search's placeholder. A page's own placeholder comes first. */
  search: string;
  /** Shown when nothing matches the search. */
  empty: string;
  /** Tells users how to use the menu, beneath the list. */
  help: string;
  /** Follows the help on a page of further commands. */
  helpBack: string;
  /**
   * Names the menu and its list of commands. The list is a Tab stop once it scrolls, so keyboard
   * users can scroll it. A page of further commands takes its own label instead.
   */
  commands: string;
  /** Names the Esc button that closes the menu. */
  close: string;
  /** The first page in the trail of pages opened. */
  home: string;
  /** Heads the commands that best match the search, in a CommandMenuBestMatches. */
  best: string;
};

export const defaultCommandMenuLabels: CommandMenuLabels = {
  trigger: "Open command menu",
  search: "Search commands…",
  empty: "No commands found.",
  commands: "Commands",
  close: "Close command menu",
  home: "Home",
  help: "Use the arrow keys to choose a command, then press Enter.",
  helpBack: "Press Backspace to go back.",
  best: "Best matches",
};

export type CommandMenuProps = {
  /** Its parts, which are a `CommandMenuTrigger`, if it has one, and a `CommandMenuContent`. */
  children: ReactNode;
  /** Whether the menu is open. Leave it out to let the menu keep track. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Toggles the menu with Command-K or Control-K anywhere on the page. */
  keyboardShortcut?: boolean;
  disabled?: boolean;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<CommandMenuLabels>;
  /**
   * Whether a command matches the search, such as by a fuzzy match of your own. By default,
   * `matchesCommand`, where every word of the search is in the command's name, description or
   * keywords.
   */
  filter?: (search: string, command: CommandMenuCommand) => boolean;
};

/** What the menu's trigger and content share, from its root. */
type Shared = {
  open: boolean;
  disabled: boolean;
  keyboardShortcut: boolean;
  labels: CommandMenuLabels;
  input: RefObject<HTMLInputElement | null>;
  list: RefObject<HTMLDivElement | null>;
  popup: RefObject<HTMLDivElement | null>;
  query: string;
  stack: string[];
  page: string | null;
  current: Page | undefined;
  pages: Map<string, Page>;
  visible: string[];
  /** Null until the list has been read, so nothing says that nothing matches before then. */
  order: string[] | null;
  setOrder: (order: string[]) => void;
  navigated: boolean;
  back: (depth: number) => void;
  /** Changes the search. */
  setQuery: (query: string) => void;
  /** Closes the menu. */
  close: () => void;
  /** Tells the menu how a CommandMenuBestMatches ranks, while it is there. */
  rankWith: (best: BestMatches | null) => void;
  /** Tells the menu where each best match is drawn. */
  setSlots: (slots: (HTMLElement | null)[]) => void;
};

const SharedContext = createContext<Shared | null>(null);

function useShared(part: string) {
  const shared = useContext(SharedContext);
  if (!shared) throw new Error(`${part} must be inside CommandMenu.`);
  return shared;
}

/**
 * A searchable list of commands in a dialog. Compose it from a `CommandMenuTrigger`, if it has
 * one, and a `CommandMenuContent` of `CommandMenuGroup` and `CommandMenuItem` parts. An item with
 * `page` opens a `CommandMenuPage` of further commands, and Backspace in an empty search goes back.
 */
export function CommandMenu({
  children,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  keyboardShortcut = true,
  disabled = false,
  labels: ownLabels,
  filter = matchesCommand,
}: CommandMenuProps) {
  const labels = useLabels("commandMenu", defaultCommandMenuLabels, ownLabels);
  const play = useScopeSound();
  const { reduced } = useMotionTiming();
  const [open, setOpen] = useControllableState(controlled, defaultOpen, onOpenChange);
  const close = useCallback(() => setOpen(false), [setOpen]);
  const isOpen = useLatest(open);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  // Every command on the open page, in the order the page shows them, once the list is read.
  const [order, setOrder] = useState<string[] | null>(null);
  const [stack, setStack] = useState<string[]>([]);
  // False until the user moves to another page, so the first page arrives with the dialog.
  const [navigated, setNavigated] = useState(false);
  const popup = useRef<HTMLDivElement>(null);
  const entries = useRef(new Map<string, Entry>()).current;
  const pages = useRef(new Map<string, Page>()).current;
  const page = stack.at(-1) ?? null;
  const current = page ? pages.get(page) : undefined;
  // The commands that match, in the order the page shows them. A command among the best matches
  // is drawn there, so the page's order follows it, and Base UI highlights and moves through them
  // in this order.
  const visible = (order ?? []).filter((id) => {
    const entry = entries.get(id);
    return entry?.page === page && filter(query, entry.command);
  });
  // How a CommandMenuBestMatches ranks, and where it draws, while it is there.
  const [bestMatches, rankWith] = useState<BestMatches | null>(null);
  const [slots, setSlots] = useState<(HTMLElement | null)[]>([]);
  const best = new Map<string, number>();
  if (bestMatches && query.trim()) {
    // Ties keep the order the commands were written in, wherever they show now.
    const written = new Map([...entries.keys()].map((id, place) => [id, place]));
    visible
      .flatMap((id) => {
        const command = entries.get(id)?.command;
        const rank = command ? bestMatches.rank(query, command) : null;
        return rank === null ? [] : [{ id, place: written.get(id) ?? 0, rank }];
      })
      .sort((a, b) => a.rank - b.rank || a.place - b.place)
      .slice(0, bestMatches.limit)
      .forEach(({ id }, place) => {
        best.set(id, place);
      });
  }

  const go = (next: string[]) => {
    setNavigated(true);
    setStack(next);
    setQuery("");
    input.current?.focus();
    // The dialog pulses slightly as the page changes.
    if (!reduced)
      popup.current?.animate([{ scale: "1" }, { scale: "0.99", offset: 0.4 }, { scale: "1" }], {
        duration: duration.medium * 1000,
        easing: `cubic-bezier(${easeOut.join(", ")})`,
      });
  };
  const back = (depth: number) => {
    if (depth >= stack.length) return;
    play("tick");
    go(stack.slice(0, depth));
  };

  useEffect(() => {
    if (!keyboardShortcut || disabled) return;
    const keydown = (event: KeyboardEvent) => {
      // A control that has taken the keys, such as the Editor's link on Mod K, keeps them.
      if (event.defaultPrevented) return;
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        setOpen(!isOpen.current);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [keyboardShortcut, disabled, setOpen]);
  return (
    <MenuContext
      value={{
        page,
        visible: new Set(visible),
        best,
        slots,
        entries,
        pages,
        choose: (opens, onSelect) => {
          if (opens) return go([...stack, opens]);
          setOpen(false);
          onSelect?.();
        },
      }}
    >
      {/* Base UI's Autocomplete is its pattern for a command palette. It is a list inline in a
          dialog, with the first command always highlighted, and items that act on a press or
          Enter. */}
      <Autocomplete.Root
        inline
        open={open}
        onOpenChangeComplete={(next) => {
          // The menu opens at the top level each time.
          if (next) return;
          setNavigated(false);
          setStack([]);
          setQuery("");
        }}
        value={query}
        onValueChange={(next) => setQuery(next)}
        items={visible}
        filter={null}
        autoHighlight="always"
        // The highlight stays on the last command under the pointer while the pointer crosses
        // a gap or a group label, rather than returning to the first command.
        keepHighlight
      >
        <Dialog.Root open={open} onOpenChange={(next) => setOpen(next)}>
          <SharedContext
            value={{
              open,
              disabled,
              keyboardShortcut,
              labels,
              input,
              list,
              popup,
              query,
              stack,
              page,
              current,
              pages,
              visible,
              order,
              setOrder,
              navigated,
              back,
              rankWith,
              setQuery,
              close,
              setSlots,
            }}
          >
            {children}
          </SharedContext>
        </Dialog.Root>
      </Autocomplete.Root>
    </MenuContext>
  );
}

export type CommandMenuTriggerProps = Omit<ButtonProps, "render"> & {
  /**
   * Another element to open the menu in the button's place, such as a quiet Button that shows only
   * the keys. It takes the trigger's props and none of the button's look.
   */
  render?: Dialog.Trigger.Props["render"];
};

/**
 * The button that opens the menu, an outline Button with its words and shortcut. Leave it out when
 * something else opens the menu through `open`.
 */
export function CommandMenuTrigger({
  render,
  className = "",
  children,
  ...props
}: CommandMenuTriggerProps) {
  const { disabled, keyboardShortcut, labels } = useShared("CommandMenuTrigger");
  // The shortcut is announced as a shortcut, not as part of the trigger's name.
  const shortcuts = keyboardShortcut ? "Meta+K Control+K" : undefined;
  if (render)
    return (
      <Dialog.Trigger
        {...withoutButtonLook(props)}
        className={className || undefined}
        render={render}
        disabled={disabled}
        aria-keyshortcuts={shortcuts}
      >
        {children}
      </Dialog.Trigger>
    );
  return (
    <Dialog.Trigger
      render={
        <Button
          variant="outline"
          {...props}
          className={`x-govuk-ui-command-menu-trigger ${className}`.trim()}
        />
      }
      disabled={disabled}
      aria-keyshortcuts={shortcuts}
    >
      {children ?? labels.trigger}
      {keyboardShortcut && <Kbd aria-hidden="true">{shortcutKeys("k")}</Kbd>}
    </Dialog.Trigger>
  );
}

/**
 * A button that closes the menu, such as one in a page of your own. It is a Button, secondary by
 * default. Choosing a command closes the menu by itself.
 */
export function CommandMenuClose({ variant = "secondary", ...props }: ButtonProps) {
  return <Dialog.Close render={<Button variant={variant} data-sound="close" {...props} />} />;
}

export type CommandMenuContentProps = ComponentPropsWithRef<"div"> & {
  /** Its commands, as `CommandMenuGroup`, `CommandMenuItem` and `CommandMenuPage` parts. */
  children: ReactNode;
  /** The search's placeholder, in place of its `search` label. A page's own comes first. */
  placeholder?: string;
  /**
   * Where focus goes as the menu closes, such as the page a command opened. By default, the
   * control that had focus before it opened.
   */
  finalFocus?: Dialog.Popup.Props["finalFocus"];
  /**
   * What shows when nothing matches the search, in place of its `empty` label, such as a button to
   * make what was searched for. `useCommandMenu` gives the search. Give null for nothing.
   */
  empty?: ReactNode;
  /**
   * The help beneath the list, in place of its `help` and `helpBack` labels, such as a row of
   * buttons. Give null for none.
   */
  help?: ReactNode;
};

/** What `useCommandMenu` gives a part of the menu, such as an empty state of your own. */
export type UseCommandMenuResult = {
  /** What users have typed. */
  search: string;
  /** Changes the search, as typing does. */
  setSearch: (search: string) => void;
  /** Closes the menu. */
  close: () => void;
};

/** The command menu around a part of it, such as an empty state of your own. Null outside one. */
export function useCommandMenu(): UseCommandMenuResult | null {
  const shared = useContext(SharedContext);
  const [search, setSearch, close] = [shared?.query, shared?.setQuery, shared?.close];
  return useMemo(
    () => (setSearch && close ? { search: search ?? "", setSearch, close } : null),
    [search, setSearch, close],
  );
}

/** The menu's dialog, with its search, its trail of pages and its list of commands. */
export function CommandMenuContent({
  children,
  placeholder: ownPlaceholder,
  finalFocus,
  empty,
  help,
  className = "",
  ref,
  ...props
}: CommandMenuContentProps) {
  const {
    open,
    labels,
    input,
    list,
    popup,
    query,
    stack,
    page,
    current,
    pages,
    visible,
    order,
    setOrder,
    navigated,
    back,
  } = useShared("CommandMenuContent");
  const placeholder = ownPlaceholder ?? labels.search;
  const popupRef = useMergedRef(popup, ref);
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="x-govuk-ui-command-menu-backdrop" />
      <Dialog.Popup
        {...props}
        ref={popupRef}
        className={`x-govuk-ui-command-menu-popup ${className}`.trim()}
        // SoundScope plays the command cue for its options.
        data-sound-list="command"
        initialFocus={input}
        finalFocus={finalFocus}
      >
        <Dialog.Title className="x-govuk-ui-visually-hidden">{labels.commands}</Dialog.Title>
        <div className="x-govuk-ui-command-menu-search">
          <Autocomplete.Input
            ref={input}
            className="x-govuk-ui-command-menu-input"
            placeholder={current?.placeholder ?? placeholder}
            aria-label={(current?.placeholder ?? placeholder).replace(/…$/, "")}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !query && stack.length) {
                event.preventDefault();
                back(stack.length - 1);
              }
            }}
          />
          <Dialog.Close
            className="x-govuk-ui-command-menu-close"
            aria-label={labels.close}
            data-sound="close"
          >
            Esc
          </Dialog.Close>
        </div>
        {stack.length > 0 && (
          <div className="x-govuk-ui-command-menu-crumbs">
            <button type="button" onClick={() => back(0)}>
              {labels.home}
            </button>
            {stack.map((id, index) =>
              index === stack.length - 1 ? (
                <span key={id} aria-current="page">
                  {pages.get(id)?.label}
                </span>
              ) : (
                <button key={id} type="button" onClick={() => back(index + 1)}>
                  {pages.get(id)?.label}
                </button>
              ),
            )}
          </div>
        )}
        <span className="x-govuk-ui-visually-hidden" role="status">
          {current?.label ?? ""}
        </span>
        {open && order !== null && visible.length === 0 && empty !== null && (
          <div className="x-govuk-ui-command-menu-empty">{empty ?? labels.empty}</div>
        )}
        <ScrollArea
          viewportRef={followScroller}
          label={current?.label ?? labels.commands}
          className="x-govuk-ui-command-menu-scroll"
          fade
        >
          <span className="x-govuk-ui-command-menu-indicator" aria-hidden="true" />
          <Autocomplete.List ref={list} className="x-govuk-ui-command-menu-list">
            {/* Keyed by page, so each page slides in from the side it was opened from. */}
            <div
              key={page ?? ""}
              className="x-govuk-ui-command-menu-page"
              data-navigated={navigated || undefined}
            >
              {children}
            </div>
          </Autocomplete.List>
          <TrackOrder list={list} onOrder={setOrder} />
        </ScrollArea>
        {/* The help of a service's own can be any content, such as a row of buttons, so it sits
            in a box of its own. */}
        {help === undefined ? (
          <p className="x-govuk-ui-command-menu-help">
            {labels.help}
            {stack.length > 0 && ` ${labels.helpBack}`}
          </p>
        ) : (
          help !== null && <div className="x-govuk-ui-command-menu-help">{help}</div>
        )}
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

/**
 * Reads the order of the commands on the open page from the list, so the search keeps the page's
 * order. It sits inside the popup, so it runs once the list exists.
 */
function TrackOrder({
  list,
  onOrder,
}: {
  list: RefObject<HTMLDivElement | null>;
  onOrder: (order: string[]) => void;
}) {
  // Null until the list is first read, so a page with no commands is read too.
  const last = useRef<string | null>(null);
  useLayoutEffect(() => {
    const ids = [...(list.current?.querySelectorAll<HTMLElement>("[data-command]") ?? [])].map(
      (element) => element.dataset.command ?? "",
    );
    const key = ids.join(" ");
    if (key === last.current) return;
    last.current = key;
    onOrder(ids);
  });
  return null;
}

export type CommandMenuGroupProps = ComponentPropsWithRef<"div"> & {
  label: string;
  children: ReactNode;
};

/** A labelled set of commands. It hides itself when none of its commands match the search. */
export function CommandMenuGroup({
  label,
  children,
  className = "",
  ...props
}: CommandMenuGroupProps) {
  return (
    <Autocomplete.Group {...props} className={`x-govuk-ui-command-menu-group ${className}`.trim()}>
      <Autocomplete.GroupLabel className="x-govuk-ui-command-menu-group-label">
        {label}
      </Autocomplete.GroupLabel>
      {children}
    </Autocomplete.Group>
  );
}

export type CommandMenuItemProps = Omit<ComponentPropsWithRef<"div">, "onSelect"> & {
  children: ReactNode;
  /** Runs when the user chooses the command, with a press or Enter. The menu closes first. */
  onSelect?: () => void;
  /** Opens the `CommandMenuPage` with this id instead of running a command. */
  page?: string;
  description?: ReactNode;
  /** Shown after the label, such as "⌘ S". It shows a shortcut. It does not set one up. */
  shortcut?: string;
  icon?: ReactNode;
  /** Extra words the search matches, such as other names for the command. */
  keywords?: string[];
  /** The text the search matches when the label is not plain text. */
  textValue?: string;
  disabled?: boolean;
};

/** One command. */
export function CommandMenuItem({
  children,
  onSelect,
  page: opens,
  description,
  shortcut,
  icon,
  keywords = [],
  textValue,
  disabled = false,
  className = "",
  onClick,
  ...props
}: CommandMenuItemProps) {
  const menu = useMenu("CommandMenuItem");
  const page = useContext(PageContext);
  const id = useId();
  const command: CommandMenuCommand = {
    name: textValue ?? (typeof children === "string" ? children : ""),
    description: typeof description === "string" ? description : "",
    keywords,
  };
  // The menu searches these before the commands render.
  useLayoutEffect(() => {
    menu.entries.set(id, { command, page });
  });
  useLayoutEffect(() => () => void menu.entries.delete(id), [menu.entries, id]);

  if (page !== menu.page) return null;
  // A command that does not match leaves a marker, so the list still knows its place.
  if (!menu.visible.has(id)) return <span data-command={id} hidden />;
  const item = (
    <Autocomplete.Item
      {...props}
      value={id}
      disabled={disabled}
      className={`x-govuk-ui-command-menu-item ${className}`.trim()}
      data-command={id}
      onClick={chain(onClick, () => menu.choose(opens, onSelect))}
    >
      {icon && (
        <span className="x-govuk-ui-command-menu-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="x-govuk-ui-command-menu-text">
        <span>{children}</span>
        {description && <span className="x-govuk-ui-command-menu-description">{description}</span>}
      </span>
      {opens ? (
        <svg
          className="x-govuk-ui-command-menu-more"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
        >
          <path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      ) : (
        shortcut && <Kbd aria-hidden="true">{shortcut}</Kbd>
      )}
    </Autocomplete.Item>
  );
  // A best match is drawn among the best matches, through a portal, so it stays in its own place
  // in React's tree, with every context, ref and handler a service gave it.
  const place = menu.best.get(id);
  const slot = place === undefined ? null : menu.slots[place];
  return slot ? createPortal(item, slot) : item;
}

/** The parts of a menu's best matches, from CommandMenuBestMatches's props. */
export type CommandMenuBestMatchesProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** Its heading. By default, its `best` label, "Best matches". */
  label?: string;
  /** The most commands it shows. */
  limit?: number;
  /**
   * How well the search names a command, lower first, or null where it is not a best match. By
   * default, `rankCommandByName`, where a command whose name is the search comes first, then those
   * whose names start with it. Ties keep the order the commands were written in.
   */
  rank?: (search: string, command: CommandMenuCommand) => number | null;
};

/**
 * The commands that best match the search, shown together as users search, such as before every
 * group, so a command named as typed is never lost beneath a group whose keywords match too.
 * Place it among the groups, where the best matches should show. Each command shown here moves
 * from its place, so it is listed once. Without it, the groups keep their order alone.
 */
export function CommandMenuBestMatches({
  label,
  limit = 3,
  rank = rankCommandByName,
  className = "",
  ...props
}: CommandMenuBestMatchesProps) {
  const { labels, rankWith, setSlots } = useShared("CommandMenuBestMatches");
  const latest = useLatest(rank);
  // The menu ranks with the latest `rank`, so a function written inline does not rank again at
  // every render.
  const ranking = useCallback(
    (search: string, command: CommandMenuCommand) => latest.current(search, command),
    [],
  );
  useLayoutEffect(() => {
    rankWith({ rank: ranking, limit });
    return () => rankWith(null);
  }, [rankWith, ranking, limit]);
  // One place for each best match, so each is drawn in its rank's place, whichever moves first.
  // The menu learns of the places once they are on the page, which is before any layout effect.
  const places = useRef<(HTMLElement | null)[]>([]);
  const refs = useMemo(
    () =>
      Array.from({ length: limit }, (_, index) => (element: HTMLElement | null) => {
        places.current[index] = element;
      }),
    [limit],
  );
  useLayoutEffect(() => {
    setSlots(refs.map((_, index) => places.current[index] ?? null));
    return () => setSlots([]);
  }, [refs, setSlots]);
  return (
    <Autocomplete.Group
      {...props}
      className={`x-govuk-ui-command-menu-group x-govuk-ui-command-menu-best ${className}`.trim()}
    >
      <Autocomplete.GroupLabel className="x-govuk-ui-command-menu-group-label">
        {label ?? labels.best}
      </Autocomplete.GroupLabel>
      {Array.from({ length: limit }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: Each place is its rank.
          key={index}
          ref={refs[index]}
          className="x-govuk-ui-command-menu-best-place"
        />
      ))}
    </Autocomplete.Group>
  );
}

export type CommandMenuPageProps = {
  /** Matches the `page` of the item that opens it. */
  id: string;
  /** Shown in the trail above the commands, and announced when the page opens. */
  label: string;
  /** The search's placeholder on this page. */
  placeholder?: string;
  children: ReactNode;
};

/** Further commands, opened by an item with a matching `page`. */
export function CommandMenuPage({ id, label, placeholder, children }: CommandMenuPageProps) {
  const menu = useMenu("CommandMenuPage");
  useLayoutEffect(() => {
    menu.pages.set(id, { id, label, placeholder });
  });
  useLayoutEffect(() => () => void menu.pages.delete(id), [menu.pages, id]);
  if (menu.page !== id) return null;
  return <PageContext value={id}>{children}</PageContext>;
}
