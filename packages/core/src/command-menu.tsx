"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps, withoutButtonLook } from "./button";
import { useControllableState } from "./controllable-state";
import { trackHighlight } from "./highlight";
import { Kbd } from "./kbd";
import { useLabels } from "./labels";
import { duration, easeOut, useMotionTiming } from "./motion";
import { ScrollArea } from "./scroll-area";
import { shortcutKeys } from "./shortcut";
import { useScopeSound } from "./sound-scope";

type Entry = { text: string; page: string | null };
type Page = { id: string; label: string; placeholder?: string };

type MenuContextValue = {
  /** The open page, or null at the top level. */
  page: string | null;
  /** The commands that match the search on the open page. */
  visible: Set<string>;
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

/** Every word of the query must appear somewhere in the item's text. */
function matches(query: string, text: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = text.toLowerCase();
  return words.every((word) => haystack.includes(word));
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
    indicator: ".x-govuk-ui-command-indicator",
    item: ".x-govuk-ui-command-item[data-highlighted]",
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
  order: string[];
  setOrder: (order: string[]) => void;
  navigated: boolean;
  back: (depth: number) => void;
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
}: CommandMenuProps) {
  const labels = useLabels("commandMenu", defaultCommandMenuLabels, ownLabels);
  const play = useScopeSound();
  const { reduced } = useMotionTiming();
  const [open, setOpen] = useControllableState(controlled, defaultOpen, onOpenChange);
  const isOpen = useRef(open);
  isOpen.current = open;
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  // Every command on the open page, in the order the page shows them.
  const [order, setOrder] = useState<string[]>([]);
  const [stack, setStack] = useState<string[]>([]);
  // False until the user moves to another page, so the first page arrives with the dialog.
  const [navigated, setNavigated] = useState(false);
  const popup = useRef<HTMLDivElement>(null);
  const entries = useRef(new Map<string, Entry>()).current;
  const pages = useRef(new Map<string, Page>()).current;
  const page = stack.at(-1) ?? null;
  const current = page ? pages.get(page) : undefined;
  // Base UI highlights and moves through these, in this order.
  const visible = order.filter((id) => {
    const entry = entries.get(id);
    return entry?.page === page && matches(query, entry.text);
  });

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
        render={render}
        disabled={disabled}
        aria-keyshortcuts={shortcuts}
      />
    );
  return (
    <Dialog.Trigger
      render={
        <Button
          variant="outline"
          {...props}
          className={`x-govuk-ui-command-trigger ${className}`.trim()}
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
};

/** The menu's dialog, with its search, its trail of pages and its list of commands. */
export function CommandMenuContent({
  children,
  placeholder: ownPlaceholder,
  finalFocus,
  className = "",
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
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="x-govuk-ui-command-backdrop" />
      <Dialog.Popup
        ref={popup}
        {...props}
        className={`x-govuk-ui-command-popup ${className}`.trim()}
        // SoundScope plays the command cue for its options.
        data-sound-list="command"
        initialFocus={input}
        finalFocus={finalFocus}
      >
        <Dialog.Title className="x-govuk-ui-visually-hidden">{labels.commands}</Dialog.Title>
        <div className="x-govuk-ui-command-search">
          <Autocomplete.Input
            ref={input}
            className="x-govuk-ui-command-input"
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
            className="x-govuk-ui-command-close"
            aria-label={labels.close}
            data-sound="close"
          >
            Esc
          </Dialog.Close>
        </div>
        {stack.length > 0 && (
          <div className="x-govuk-ui-command-crumbs">
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
        {open && visible.length === 0 && order.length > 0 && (
          <p className="x-govuk-ui-command-empty">{labels.empty}</p>
        )}
        <ScrollArea
          viewportRef={followScroller}
          label={current?.label ?? labels.commands}
          className="x-govuk-ui-command-scroll"
          fade
        >
          <span className="x-govuk-ui-command-indicator" aria-hidden="true" />
          <Autocomplete.List ref={list} className="x-govuk-ui-command-list">
            {/* Keyed by page, so each page slides in from the side it was opened from. */}
            <div
              key={page ?? ""}
              className="x-govuk-ui-command-page"
              data-navigated={navigated || undefined}
            >
              {children}
            </div>
          </Autocomplete.List>
          <TrackOrder list={list} onOrder={setOrder} />
        </ScrollArea>
        <p className="x-govuk-ui-command-help">
          {labels.help}
          {stack.length > 0 && ` ${labels.helpBack}`}
        </p>
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
  const last = useRef("");
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
    <Autocomplete.Group {...props} className={`x-govuk-ui-command-group ${className}`.trim()}>
      <Autocomplete.GroupLabel className="x-govuk-ui-command-group-label">
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
  ...props
}: CommandMenuItemProps) {
  const menu = useMenu("CommandMenuItem");
  const page = useContext(PageContext);
  const id = useId();
  const text = [
    textValue ?? (typeof children === "string" ? children : ""),
    typeof description === "string" ? description : "",
    ...keywords,
  ].join(" ");
  // The menu filters by this text before the commands render.
  useLayoutEffect(() => {
    menu.entries.set(id, { text, page });
  });
  useLayoutEffect(() => () => void menu.entries.delete(id), [menu.entries, id]);

  if (page !== menu.page) return null;
  // A command that does not match leaves a marker, so the list still knows its place.
  if (!menu.visible.has(id)) return <span data-command={id} hidden />;
  return (
    <Autocomplete.Item
      {...props}
      value={id}
      disabled={disabled}
      className={`x-govuk-ui-command-item ${className}`.trim()}
      data-command={id}
      onClick={() => menu.choose(opens, onSelect)}
    >
      {icon && (
        <span className="x-govuk-ui-command-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="x-govuk-ui-command-text">
        <span>{children}</span>
        {description && <span className="x-govuk-ui-command-description">{description}</span>}
      </span>
      {opens ? (
        <svg
          className="x-govuk-ui-command-more"
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
