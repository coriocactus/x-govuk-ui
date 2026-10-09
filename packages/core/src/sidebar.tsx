"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { useRender } from "@base-ui/react/use-render";
import {
  Component,
  type ComponentPropsWithRef,
  type CSSProperties,
  createContext,
  type MouseEvent,
  type ReactNode,
  type Ref,
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
import { Button, type ButtonProps } from "./button";
import { isOneGlyph } from "./glyph";
import { MoreIcon, SearchIcon } from "./icons";
import { Input, type InputProps } from "./input";
import { useMediaQuery } from "./media-query";
import { glideEasing, useMotionTiming } from "./motion";
import { ResizableHandle } from "./resizable";
import { ScrollArea } from "./scroll-area";
import { Sheet, SheetContent, type SheetContentProps } from "./sheet";
import { shortcutKeys } from "./shortcut";
import { Skeleton } from "./skeleton";
import { useScopeSound } from "./sound-scope";
import { useStoredState } from "./stored-state";
import { Tooltip, TooltipGroup } from "./tooltip";

/** Every movement a Sidebar can make, for `animations` to choose from. */
export const sidebarAnimations = [
  "collapse",
  "highlight",
  "active-line",
  "press",
  "tooltips",
  "folding",
] as const;
export type SidebarAnimation = (typeof sidebarAnimations)[number];

export type SidebarProviderProps = {
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The widest window, in pixels, that shows the sidebar as a sheet over the page. */
  mobileBreakpoint?: number;
  /** The key that toggles the sidebar with Command or Control. False turns the shortcut off. */
  shortcut?: string | false;
  /**
   * Remembers whether the sidebar is open, and its width, in the browser's local storage under
   * this key, so they are the same on the next visit. Server-rendered pages first render
   * `defaultOpen`, then the remembered state.
   */
  storageKey?: string;
};

export type SidebarProps = ComponentPropsWithRef<"nav"> & {
  children: ReactNode;
  /**
   * Names the sidebar for screen readers. It names the navigation landmark, and on a small screen
   * the sheet that contains it.
   */
  label?: string;
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  /**
   * How the sidebar collapses. `icon` collapses it to a column of icons, `offcanvas` off the edge
   * of the screen, and `none` not at all.
   */
  collapsible?: "icon" | "offcanvas" | "none";
  resizable?: boolean;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Marks the current item with a line along the sidebar's edge. */
  activeLine?: boolean;
  /**
   * Keeps a trigger where the sidebar was while it is collapsed off the screen, so users can bring
   * it back. Turn it off when the page has its own SidebarTrigger.
   */
  collapsedTrigger?: boolean;
  animations?: readonly SidebarAnimation[];
  /** What to focus when the sheet opens on a small screen, as for a Base UI drawer. */
  initialFocus?: SheetContentProps["initialFocus"];
};

export type SidebarGroupProps = ComponentPropsWithRef<"div"> & {
  children: ReactNode;
  label?: ReactNode;
  /** Shown beside the label of a group that folds. */
  icon?: ReactNode;
  /** Lets users fold the group away by pressing its label. */
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export type SidebarSubmenuProps = ComponentPropsWithRef<"li"> & {
  /** The items inside, as SidebarItem parts. */
  children: ReactNode;
  label: ReactNode;
  icon?: ReactNode;
  /** Opens the submenu at first. A submenu that contains the current page opens anyway. */
  defaultOpen?: boolean;
  /** Shown beside the submenu while the sidebar is collapsed to icons. Defaults to the label. */
  tooltip?: ReactNode;
};

export type SidebarItemProps = Omit<ComponentPropsWithRef<"button">, "children"> & {
  children: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  isActive?: boolean;
  /** Shown beside the item while the sidebar is collapsed to icons. Defaults to the label. */
  tooltip?: ReactNode;
  /**
   * Renders the item as another element, such as `<a href="/applications" />` or a router's
   * link, in place of the button.
   */
  render?: useRender.RenderProp;
  /**
   * A button at the end of the row, such as a SidebarItemAction, or a DropdownMenuTrigger with
   * the class `x-govuk-ui-sidebar-item-action` for a menu of the item's actions. It shows while the
   * row is under the pointer, while it has focus itself, while its menu is open, and always on
   * touch screens.
   */
  action?: ReactNode;
};

type SidebarState = {
  id: string;
  storageKey: string | undefined;
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  toggleSidebar: () => void;
  /** The shortcut as users type it on this device, such as "⌘ B". */
  shortcut: string | undefined;
};

/** What the parts of one sidebar share. */
type Frame = {
  id: string;
  side: "left" | "right";
  iconsOnly: boolean;
  animations: ReadonlySet<SidebarAnimation>;
  activeLine: boolean;
  /** Moves the hover highlight to a row, with the row's action riding it, or hides it. */
  hover: (row: HTMLElement | null, action?: HTMLElement | null) => void;
  highlight: RefObject<HTMLSpanElement | null>;
  content: RefObject<HTMLDivElement | null>;
  /** False during the sidebar's first render, so anything placed then appears without animating. */
  settled: RefObject<boolean>;
  /**
   * Where the active line was on screen as it left its item, for the next item's line to glide
   * from.
   */
  lineFrom: RefObject<{ top: number; height: number } | null>;
  /** The list's glide to a new scroll position, while it runs. */
  scrollGlide: RefObject<Animation | null>;
};

/** The glide each row's action is riding, so the next can take over from it. */
const riding = new WeakMap<Element, Animation>();

const SidebarContext = createContext<SidebarState | null>(null);
const FrameContext = createContext<Frame | null>(null);

/**
 * The sidebar's state, for parts of your own. It gives whether the sidebar is open, whether the
 * screen is small and the sidebar is a sheet, and `toggleSidebar`. Use it inside a SidebarProvider.
 */
export function useSidebar() {
  const sidebar = useContext(SidebarContext);
  if (!sidebar) throw new Error("useSidebar must be used inside a SidebarProvider.");
  return sidebar;
}

function useFrame() {
  const frame = useContext(FrameContext);
  if (!frame) throw new Error("Sidebar parts must be used inside a Sidebar.");
  return frame;
}

/**
 * Keeps whether the sidebar is open, for the Sidebar, its triggers and `useSidebar` to share. On a
 * small screen, the sidebar is a sheet, with an open state of its own. Command or Control with the
 * `shortcut` key toggles it. With a `storageKey`, it is as users left it on their next visit.
 */
export function SidebarProvider({
  children,
  defaultOpen = true,
  open: controlled,
  onOpenChange,
  mobileBreakpoint = 768,
  shortcut = "b",
  storageKey,
}: SidebarProviderProps) {
  const id = useId();
  const play = useScopeSound();
  const isMobile = useMediaQuery(`(max-width: ${mobileBreakpoint}px)`);
  const [own, setOwn] = useStoredState(storageKey && `${storageKey}-open`, defaultOpen);
  const [openMobile, setOpenMobile] = useState(false);
  const open = controlled ?? own;
  const expanded = isMobile ? openMobile : open;
  const setOpen = useCallback(
    (next: boolean) => {
      setOwn(next);
      onOpenChange?.(next);
    },
    [onOpenChange, setOwn],
  );
  const toggleSidebar = useCallback(() => {
    if (isMobile) setOpenMobile(!openMobile);
    else setOpen(!open);
  }, [isMobile, open, openMobile, setOpen]);

  // A sheet left open on a small screen should not reappear after the window grows and shrinks.
  useEffect(() => {
    if (!isMobile) setOpenMobile(false);
  }, [isMobile]);

  useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.shiftKey) return;
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== shortcut) return;
      event.preventDefault();
      // A shortcut has no press for SoundScope to respond to, so the sidebar plays its own sound.
      play(expanded ? "close" : "open");
      toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, expanded, toggleSidebar, play]);

  const value = useMemo<SidebarState>(
    () => ({
      id,
      storageKey,
      state: open ? "expanded" : "collapsed",
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      shortcut: shortcut ? shortcutKeys(shortcut) : undefined,
    }),
    [id, storageKey, open, setOpen, isMobile, openMobile, toggleSidebar, shortcut],
  );
  return <SidebarContext value={value}>{children}</SidebarContext>;
}

/**
 * The sidebar itself, a column at the page's side. It contains a header, scrolling content of
 * groups and items, and a footer. It collapses to a column of icons or off the edge, and users can
 * resize it. On a small screen, it is a Sheet.
 *
 * One highlight glides between its rows under the pointer. A line marks the current item and
 * glides to the next. The list keeps the current item in view. The sidebar is a navigation
 * landmark, named by its `label`, so nothing in it is left outside the page's landmarks.
 */
export function Sidebar({
  ref,
  children,
  label = "Sidebar",
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  resizable = false,
  defaultWidth = 256,
  minWidth = 200,
  maxWidth = 360,
  activeLine = true,
  collapsedTrigger = true,
  animations = sidebarAnimations,
  initialFocus,
  className = "",
  ...props
}: SidebarProps) {
  const sidebar = useSidebar();
  const content = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const settled = useRef(false);
  const lineFrom = useRef<{ top: number; height: number } | null>(null);
  const scrollGlide = useRef<Animation | null>(null);
  // Effects run from the inside out, so the parts see the first render before this marks it done.
  useEffect(() => {
    settled.current = true;
  }, []);
  const [storedWidth, setWidth] = useStoredState(
    sidebar.storageKey && `${sidebar.storageKey}-width`,
    defaultWidth,
  );
  // A remembered width still keeps within the current limits.
  const width = Math.min(maxWidth, Math.max(minWidth, storedWidth));
  const [resizing, setResizing] = useState(false);
  // The list is a new array each render, so its words stand for it where a stable value is needed.
  const animationList = animations.join(" ");
  const collapsed = !sidebar.isMobile && !sidebar.open && collapsible !== "none";
  const iconsOnly = collapsed && collapsible === "icon";
  const hasGutter = collapsible === "offcanvas" && collapsedTrigger;

  // The part that had focus may now be hidden and inert, so focus moves to the trigger that is
  // still showing. That is the trigger left at the edge, or the sidebar's own once the sidebar is
  // back.
  const wasCollapsed = useRef(collapsed);
  useEffect(() => {
    if (wasCollapsed.current === collapsed) return;
    wasCollapsed.current = collapsed;
    if (!hasGutter) return;
    const active = document.activeElement;
    const from = collapsed ? panel.current : gutter.current;
    if (active && active !== document.body && !from?.contains(active)) return;
    const to = collapsed ? gutter.current : panel.current;
    to?.querySelector<HTMLElement>(".x-govuk-ui-sidebar-trigger")?.focus();
  }, [collapsed, hasGutter]);

  // The hover highlight is one element that glides to whichever row the pointer is over, with the
  // row's action riding it. Like the active line, it notes where it is on screen, takes its new
  // place at once, then glides there from where it was. A glide cut short therefore continues from
  // where it reached. It is written straight to the page, so moving between rows renders nothing.
  const highlight = useRef<HTMLSpanElement>(null);
  const highlightGlide = useRef<Animation | null>(null);
  const { reduced } = useMotionTiming();
  const still = useRef(reduced);
  still.current = reduced;
  const hover = useCallback((row: HTMLElement | null, action?: HTMLElement | null) => {
    const mark = highlight.current;
    const scroller = content.current;
    if (!mark) return;
    // Rows in the header or footer have their own hover shading. Only the content's rows share the
    // gliding highlight, which must never reach past the content and make it scrollable.
    if (!row || !scroller?.contains(row)) {
      mark.removeAttribute("data-shown");
      return;
    }
    // It is placed against the rows' layer, which moves with them as the list glides. Everything
    // is read before anything is written.
    const layer = row.closest(".x-govuk-ui-scroll-area-content") ?? scroller;
    const base = layer.getBoundingClientRect().top;
    const top = row.getBoundingClientRect().top - base;
    const height = row.offsetHeight;
    const was = mark.getBoundingClientRect();
    const shown = mark.hasAttribute("data-shown");
    highlightGlide.current?.cancel();
    mark.style.transform = `translateY(${top}px)`;
    mark.style.height = `${height}px`;
    mark.setAttribute("data-shown", "");
    // When shown again after hiding, it appears in place.
    const from = { top: was.top - base, height: was.height };
    if (!shown || still.current) return;
    if (Math.abs(from.top - top) < 0.5 && Math.abs(from.height - height) < 0.5) return;
    const timing = { duration: glideEasing.duration, easing: glideEasing.easing };
    // It takes the row's height by scaling, as the active line does, so its glide is only a
    // transform. The browser runs that off the main thread, as it runs the action's glide, so a
    // busy page slows neither, and the two stay level.
    highlightGlide.current = mark.animate(
      [
        { transform: `translateY(${from.top}px) scaleY(${from.height / height})` },
        { transform: `translateY(${top}px)` },
      ],
      timing,
    );
    // The action's strip stays still, so the pointer is always over a strip as it moves down the
    // actions. Only the strip's content glides.
    if (!action) return;
    const shift = from.top + from.height / 2 - (top + height / 2);
    for (const part of action.children) {
      riding.get(part)?.cancel();
      riding.set(
        part,
        part.animate([{ transform: `translateY(${shift}px)` }, { transform: "none" }], timing),
      );
    }
  }, []);

  const frame = useMemo<Frame>(
    () => ({
      id: sidebar.id,
      side,
      iconsOnly,
      animations: new Set(animationList.split(" ") as SidebarAnimation[]),
      activeLine,
      hover,
      highlight,
      content,
      settled,
      lineFrom,
      scrollGlide,
    }),
    [sidebar.id, side, iconsOnly, animationList, activeLine, hover],
  );

  const parts = (
    <FrameContext value={frame}>
      {frame.animations.has("tooltips") ? (
        <TooltipGroup side={side === "left" ? "right" : "left"}>{children}</TooltipGroup>
      ) : (
        children
      )}
    </FrameContext>
  );
  const attributes = {
    "data-side": side,
    "data-variant": variant,
    "data-animate": animationList,
    style: { "--x-govuk-ui-sidebar-width": `${width}px` } as CSSProperties,
  };

  // On a small screen the sidebar is a Sheet, so a swipe towards its edge closes it.
  if (sidebar.isMobile)
    return (
      <Sheet side={side} open={sidebar.openMobile} onOpenChange={sidebar.setOpenMobile}>
        <SheetContent
          {...props}
          // The sheet's element is a div, which is the element the sidebar's ref is typed for.
          ref={ref as Ref<HTMLDivElement>}
          className={`x-govuk-ui-sidebar-panel x-govuk-ui-sidebar-sheet ${className}`.trim()}
          label={label}
          initialFocus={initialFocus}
          {...attributes}
        >
          {parts}
        </SheetContent>
      </Sheet>
    );

  return (
    <nav
      aria-label={label}
      {...props}
      ref={ref}
      className={`x-govuk-ui-sidebar ${className}`.trim()}
      data-state={collapsed ? "collapsed" : "expanded"}
      data-collapsible={collapsible}
      data-resizing={resizing || undefined}
      data-gutter={hasGutter || undefined}
      {...attributes}
    >
      <div
        ref={panel}
        id={`${sidebar.id}-sidebar`}
        className="x-govuk-ui-sidebar-panel"
        inert={collapsed && collapsible === "offcanvas"}
      >
        {parts}
      </div>
      {hasGutter && (
        <div ref={gutter} className="x-govuk-ui-sidebar-gutter" inert={!collapsed}>
          <SidebarTrigger />
        </div>
      )}
      {resizable && !collapsed && (
        <ResizableHandle
          className="x-govuk-ui-sidebar-rail"
          label="Resize sidebar"
          orientation="vertical"
          // Dragging away from the page widens a left sidebar and narrows a right one.
          panel={side === "left" ? "before" : "after"}
          value={width}
          min={minWidth}
          max={maxWidth}
          defaultValue={defaultWidth}
          onValueChange={setWidth}
          onDraggingChange={setResizing}
        />
      )}
    </nav>
  );
}

/** The top of the sidebar, for a name or a mark, and a trigger. It stays as the content scrolls. */
export function SidebarHeader({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-sidebar-header ${className}`.trim()} />;
}

/** The foot of the sidebar, such as for the user's account. It stays as the content scrolls. */
export function SidebarFooter({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-sidebar-footer ${className}`.trim()} />;
}

/**
 * A compact field for finding items in the sidebar, built from Input. Place it between the
 * header and the content, so it stays in view. The label is hidden but still announced, and the
 * prefix shows a search icon unless another is given.
 */
export function SidebarInput({ className = "", prefix = <SearchIcon />, ...props }: InputProps) {
  const frame = useFrame();
  return (
    // A sidebar of icons has no space for the field, so the field cannot take focus there.
    <div className={`x-govuk-ui-sidebar-input ${className}`.trim()} inert={frame.iconsOnly}>
      <Input type="search" autoComplete="off" hideLabel prefix={prefix} {...props} />
    </div>
  );
}

export type SidebarSkeletonProps = ComponentPropsWithRef<"div"> & {
  /** How many rows stand in for the items. */
  rows?: number;
  /** Shows a shape where each item's icon will be. */
  icons?: boolean;
};

/**
 * Rows of Skeleton in place of a sidebar's items while they load, each with a shape for its icon
 * and a bar for its label at a different length. Say what is loading in a status nearby.
 */
export function SidebarSkeleton({
  rows = 5,
  icons = true,
  className = "",
  ...props
}: SidebarSkeletonProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-sidebar-skeleton ${className}`.trim()}
      aria-hidden="true"
    >
      {Array.from({ length: rows }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Rows have positional identities and no state.
        <span key={index} className="x-govuk-ui-sidebar-skeleton-row">
          {icons && <Skeleton variant="block" className="x-govuk-ui-sidebar-skeleton-icon" />}
          <Skeleton
            variant="block"
            className="x-govuk-ui-sidebar-skeleton-label"
            // The bars vary in length, so they read as labels rather than a pattern.
            width={`${[72, 56, 84, 62, 48, 78][index % 6]}%`}
          />
        </span>
      ))}
    </div>
  );
}

/** A keyline between parts of the sidebar. */
export function SidebarSeparator({ className = "", ...props }: ComponentPropsWithRef<"hr">) {
  return <hr {...props} className={`x-govuk-ui-sidebar-separator ${className}`.trim()} />;
}

export type SidebarContentProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  children: ReactNode;
};

/**
 * The scrolling middle of the sidebar, between its header and footer, containing its groups. The
 * hover highlight glides between the rows in it.
 */
export function SidebarContent({ children, className = "", ...props }: SidebarContentProps) {
  const frame = useFrame();
  return (
    <ScrollArea
      {...props}
      viewportRef={frame.content}
      className={`x-govuk-ui-sidebar-content ${className}`.trim()}
      fade
      onPointerLeave={() => frame.hover(null)}
    >
      {/* The highlight moves inside a layer clipped to the rows. Wherever it was left, such as
          below rows that a search has removed, it never makes the list taller or scrollable. */}
      {frame.animations.has("highlight") && (
        <span className="x-govuk-ui-sidebar-highlight-layer" aria-hidden="true">
          <span ref={frame.highlight} className="x-govuk-ui-sidebar-highlight" />
        </span>
      )}
      {children}
    </ScrollArea>
  );
}

/**
 * Items under a label. With `collapsible`, pressing the label folds the group away. A sidebar of
 * icons keeps every group open, though, so each item keeps its icon.
 */
export function SidebarGroup({
  children,
  label,
  icon,
  collapsible = false,
  defaultOpen = true,
  className = "",
  ...props
}: SidebarGroupProps) {
  const frame = useFrame();
  const labelId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const menu = (
    <ul className="x-govuk-ui-sidebar-menu" aria-labelledby={label ? labelId : undefined}>
      {children}
    </ul>
  );
  if (!collapsible || !label)
    return (
      <div {...props} className={`x-govuk-ui-sidebar-group ${className}`.trim()}>
        {label && (
          <div className="x-govuk-ui-sidebar-group-label" id={labelId}>
            {label}
          </div>
        )}
        {menu}
      </div>
    );
  return (
    // While the sidebar shows only icons, every group stays open so each item has its icon.
    <Collapsible.Root
      {...props}
      className={`x-govuk-ui-sidebar-group ${className}`.trim()}
      data-foldable=""
      open={open || frame.iconsOnly}
      onOpenChange={setOpen}
    >
      <Collapsible.Trigger
        id={labelId}
        className="x-govuk-ui-sidebar-group-trigger"
        onPointerEnter={(event) => frame.hover(event.currentTarget)}
      >
        {icon && (
          <span className="x-govuk-ui-sidebar-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="x-govuk-ui-sidebar-label">{label}</span>
        <span className="x-govuk-ui-sidebar-fold" aria-hidden="true" />
      </Collapsible.Trigger>
      <Collapsible.Panel className="x-govuk-ui-sidebar-group-panel">{menu}</Collapsible.Panel>
    </Collapsible.Root>
  );
}

/**
 * An item that folds open to show sub-items, indented along a guide line. While the sidebar shows
 * only icons, pressing it opens the sidebar and the submenu together.
 */
export function SidebarSubmenu({
  children,
  label,
  icon,
  defaultOpen = false,
  tooltip,
  className = "",
  ...props
}: SidebarSubmenuProps) {
  const sidebar = useSidebar();
  const frame = useFrame();
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(defaultOpen);
  // A submenu that contains the current page starts open, so the page shows in the sidebar.
  useLayoutEffect(() => {
    if (panel.current?.querySelector('[aria-current="page"]')) setOpen(true);
  }, []);
  return (
    <li {...props} className={`x-govuk-ui-sidebar-menu-item ${className}`.trim()}>
      <Collapsible.Root
        className="x-govuk-ui-sidebar-submenu-root"
        open={open && !frame.iconsOnly}
        onOpenChange={setOpen}
      >
        <Tooltip
          content={tooltip ?? label}
          side={frame.side === "left" ? "right" : "left"}
          disabled={!frame.iconsOnly}
        >
          <Collapsible.Trigger
            className="x-govuk-ui-sidebar-item x-govuk-ui-sidebar-submenu-trigger"
            onPointerEnter={(event) => frame.hover(event.currentTarget)}
            onClick={() => {
              if (!frame.iconsOnly) return;
              sidebar.setOpen(true);
              setOpen(true);
            }}
          >
            {icon && (
              <span className="x-govuk-ui-sidebar-icon" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="x-govuk-ui-sidebar-label">{label}</span>
            <span className="x-govuk-ui-sidebar-fold" aria-hidden="true" />
          </Collapsible.Trigger>
        </Tooltip>
        {/* When closed, the sub-items stay in the page, so find in page can reach them. */}
        <Collapsible.Panel ref={panel} className="x-govuk-ui-sidebar-group-panel" hiddenUntilFound>
          <ul className="x-govuk-ui-sidebar-menu x-govuk-ui-sidebar-submenu">{children}</ul>
        </Collapsible.Panel>
      </Collapsible.Root>
    </li>
  );
}

/**
 * The scroll position that brings a row into view. A row out of sight goes to the middle of the
 * list. A row close to the edge scrolls just far enough to clear it.
 */
function inView(scroller: HTMLElement, box: DOMRect, place: DOMRect) {
  const margin = 32;
  let top = scroller.scrollTop;
  if (place.bottom < box.top || place.top > box.bottom)
    top += place.top - box.top - (box.height - place.height) / 2;
  else if (place.top < box.top + margin) top += place.top - box.top - margin;
  else if (place.bottom > box.bottom - margin) top += place.bottom - box.bottom + margin;
  return Math.round(Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, top)));
}

type LineSnapshotProps = {
  active: boolean;
  line: RefObject<HTMLSpanElement | null>;
  from: RefObject<{ top: number; height: number } | null>;
};

/**
 * Notes where the active line is on screen just before it leaves its item, part way through a
 * glide or at rest, so the next item's line glides on from there. React calls this before it
 * changes the page, and only a class component can receive that call.
 */
class LineSnapshot extends Component<LineSnapshotProps> {
  getSnapshotBeforeUpdate(previous: LineSnapshotProps) {
    if (previous.active && !this.props.active) {
      const box = this.props.line.current?.getBoundingClientRect();
      if (box && box.height > 0) this.props.from.current = { top: box.top, height: box.height };
    }
    return null;
  }
  // React warns when a component takes a snapshot but has no componentDidUpdate to receive it.
  componentDidUpdate() {}
  render() {
    return null;
  }
}

/**
 * One row, with an icon, a label, and optionally a badge and an action at its end. It is a button,
 * or a link with `render`. The current item is marked. On a small screen, choosing an item closes
 * the sheet.
 */
export function SidebarItem({
  children,
  icon,
  badge,
  isActive = false,
  tooltip,
  render,
  action,
  className = "",
  onClick,
  onPointerEnter,
  ref,
  ...props
}: SidebarItemProps) {
  const sidebar = useSidebar();
  const frame = useFrame();
  const timing = useMotionTiming();
  const element = useRef<HTMLButtonElement>(null);
  const line = useRef<HTMLSpanElement>(null);
  const actions = useRef<HTMLSpanElement>(null);
  const glides = frame.animations.has("active-line") && !timing.reduced;

  // The whole row takes the highlight, including its action. Moving onto the action from another
  // row therefore moves the highlight with the pointer, and the action rides the highlight there.
  const enter = () => frame.hover(element.current, actions.current);

  // When the sidebar first renders, the list opens with the current item in its middle, as far as
  // the list scrolls. This waits until the list has its size.
  useEffect(() => {
    const row = element.current;
    const scroller = frame.content.current;
    if (!isActive || !row || !scroller || frame.settled.current) return;
    const box = scroller.getBoundingClientRect();
    const place = row.getBoundingClientRect();
    scroller.scrollTop += place.top - box.top - (box.height - place.height) / 2;
  }, [isActive, frame.content, frame.settled]);

  // After that, the current item stays in view, so the list follows when something else, such as
  // Next and Previous buttons, changes the page.
  useLayoutEffect(() => {
    const row = element.current;
    const scroller = frame.content.current;
    const from = frame.lineFrom.current;
    if (!isActive || !row || !scroller || !frame.settled.current) return;
    frame.lineFrom.current = null;
    // A glide still running stops where it is, and the next one starts from there.
    const layer = scroller.querySelector<HTMLElement>(".x-govuk-ui-scroll-area-content");
    let shifted = 0;
    if (frame.scrollGlide.current && layer) {
      const before = layer.getBoundingClientRect().top;
      frame.scrollGlide.current.cancel();
      frame.scrollGlide.current = null;
      shifted = before - layer.getBoundingClientRect().top;
    }
    const box = scroller.getBoundingClientRect();
    const place = row.getBoundingClientRect();
    const target = inView(scroller, box, place);
    const mark = line.current;
    if (!glides || !from || !mark || !layer) {
      if (target !== scroller.scrollTop)
        scroller.scrollTo({ top: target, behavior: timing.reduced ? "instant" : "smooth" });
      return;
    }
    // The list jumps to where it is going, then glides there from where it was, as the line glides
    // from the item it left. They share one curve, so the line takes a straight path on screen.
    const mark0 = mark.getBoundingClientRect();
    const scrolled = scroller.scrollTop;
    scroller.scrollTop = target;
    const moved = scroller.scrollTop - scrolled;
    const glideTiming = { duration: glideEasing.duration, easing: glideEasing.easing };
    mark.animate(
      [
        {
          transform: `translateY(${from.top - mark0.top - shifted}px) scaleY(${from.height / mark0.height})`,
        },
        { transform: "none" },
      ],
      glideTiming,
    );
    if (moved + shifted === 0) return;
    const glide = layer.animate(
      [{ transform: `translateY(${moved + shifted}px)` }, { transform: "none" }],
      glideTiming,
    );
    frame.scrollGlide.current = glide;
    glide.onfinish = () => {
      if (frame.scrollGlide.current === glide) frame.scrollGlide.current = null;
    };
  }, [
    isActive,
    glides,
    frame.content,
    frame.settled,
    frame.lineFrom,
    frame.scrollGlide,
    timing.reduced,
  ]);

  const item = useRender({
    defaultTagName: "button",
    render,
    ref: ref ? [ref, element] : element,
    props: {
      ...props,
      type: render ? undefined : "button",
      className: `x-govuk-ui-sidebar-item ${className}`.trim(),
      "aria-current": isActive ? "page" : undefined,
      "data-active": isActive || undefined,
      onPointerEnter,
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        // Choosing an item on a small screen closes the sheet, so the page it opens is visible.
        if (sidebar.isMobile) sidebar.setOpenMobile(false);
      },
      children: (
        <>
          {isActive && frame.activeLine && (
            <span ref={line} className="x-govuk-ui-sidebar-line" aria-hidden="true" />
          )}
          <LineSnapshot active={isActive} line={line} from={frame.lineFrom} />
          {icon && (
            <span className="x-govuk-ui-sidebar-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="x-govuk-ui-sidebar-label">{children}</span>
          {badge !== undefined && (
            <span className="x-govuk-ui-sidebar-badge" data-single={isOneGlyph(badge) || undefined}>
              {badge}
            </span>
          )}
        </>
      ),
    },
  });
  return (
    <li
      className="x-govuk-ui-sidebar-menu-item"
      data-has-action={(action && !frame.iconsOnly) || undefined}
      onPointerEnter={enter}
    >
      <Tooltip
        content={tooltip ?? children}
        side={frame.side === "left" ? "right" : "left"}
        disabled={!frame.iconsOnly}
      >
        {item}
      </Tooltip>
      {/* When the sidebar is collapsed to icons, a row has no space for its action. */}
      {action && !frame.iconsOnly && (
        // A press anywhere in the action's strip goes to the action, such as while the action
        // glides into place. The keyboard reaches the action itself.
        // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: As above.
        <span
          ref={actions}
          className="x-govuk-ui-sidebar-item-actions"
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            event.currentTarget.querySelector<HTMLElement>("button, a")?.click();
          }}
        >
          {action}
        </span>
      )}
    </li>
  );
}

export type SidebarItemActionProps = ButtonProps & {
  /** Names the action for screen readers, such as "Remove Applications". */
  label: string;
  /** The action's icon. By default, three dots, for more of the item's actions. */
  icon?: ReactNode;
};

/**
 * A small button at the end of a SidebarItem's row, as its `action`. It shows three dots unless it
 * is given another icon. For a menu of the item's actions, give it to a DropdownMenuTrigger as its
 * `render`.
 */
export function SidebarItemAction({
  label,
  icon = <MoreIcon />,
  className = "",
  ...props
}: SidebarItemActionProps) {
  return (
    <Button
      variant="quiet"
      size="small-icon"
      aria-label={label}
      {...props}
      className={`x-govuk-ui-sidebar-item-action ${className}`.trim()}
    >
      {icon}
    </Button>
  );
}

/**
 * The button that opens and closes the sidebar, with its shortcut in a tooltip. On a small screen
 * it opens and closes the sheet.
 */
export function SidebarTrigger({ className = "", onClick, ...props }: ButtonProps) {
  const sidebar = useSidebar();
  const expanded = sidebar.isMobile ? sidebar.openMobile : sidebar.open;
  let label: string;
  if (sidebar.isMobile) label = expanded ? "Close sidebar" : "Open sidebar";
  else label = expanded ? "Collapse sidebar" : "Expand sidebar";
  return (
    <Tooltip content={label} shortcut={sidebar.shortcut}>
      <Button
        variant="quiet"
        size="small-icon"
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={sidebar.isMobile ? undefined : `${sidebar.id}-sidebar`}
        {...props}
        className={`x-govuk-ui-sidebar-trigger ${className}`.trim()}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) sidebar.toggleSidebar();
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          <path
            d="M4 5h16v14H4zM10 5v14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </Button>
    </Tooltip>
  );
}

/**
 * The frame of an app with a sidebar, with the Sidebar and the page side by side, filling the
 * height they are given. Put the Sidebar first for the left side, or last for the right, and the
 * page in a SidebarInset. Beside an inset sidebar, the layout takes the sidebar's fill, and the
 * page is raised on it.
 */
export function SidebarLayout({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-sidebar-layout ${className}`.trim()} />;
}

export type SidebarInsetProps = ComponentPropsWithRef<"div"> & {
  /** Another element for the page, such as its `main`, so the column is the landmark itself. */
  render?: useRender.RenderProp;
};

/**
 * The page beside the sidebar, as a column that takes the space the sidebar leaves, with an
 * optional SidebarPageBar along its top. Beside an inset sidebar, it is drawn as a raised panel. It
 * is the page's main element, given `render={<main />}`, or contains it.
 */
export function SidebarInset({ render, className = "", ...props }: SidebarInsetProps) {
  return useRender({
    defaultTagName: "div",
    render,
    props: { ...props, className: `x-govuk-ui-sidebar-inset ${className}`.trim() },
  });
}

export type SidebarPageBarProps = ComponentPropsWithRef<"div"> & {
  /** Another element for the bar, such as a `header` inside the page's `main`. */
  render?: useRender.RenderProp;
};

/**
 * A bar along the top of the page beside the sidebar, for a SidebarTrigger and the page's title,
 * as tall as the sidebar's header. `--x-govuk-ui-bar-height` sets its height, along with the
 * header's and a tile bar's, so their lower edges meet.
 */
export function SidebarPageBar({ render, className = "", ...props }: SidebarPageBarProps) {
  return useRender({
    defaultTagName: "div",
    render,
    props: { ...props, className: `x-govuk-ui-sidebar-page-bar ${className}`.trim() },
  });
}

/**
 * Words in the sidebar's header or footer, such as a department's name or a copyright notice.
 * Unlike the sidebar's rows, they wrap. While the sidebar is narrow, they fade away, and their
 * height eases to zero as its width does. The footer's rows then sit at its foot.
 *
 * Put it directly in SidebarHeader or SidebarFooter, not inside an element of your own. There, in a
 * sidebar that narrows to its icons, it keeps the width the open sidebar gives it, so its words do
 * not reflow as the sidebar narrows and widens. That width allows for the header's or footer's own
 * padding, and nothing else. Anywhere deeper, it still fades away, but its words reflow.
 *
 * A margin, padding or border given to SidebarText keeps its space, so give these their own rules
 * for the narrow sidebar.
 */
export function SidebarText({ children, className = "", ...props }: ComponentPropsWithRef<"p">) {
  return (
    <p {...props} className={`x-govuk-ui-sidebar-text ${className}`.trim()}>
      <span className="x-govuk-ui-sidebar-text-inner">{children}</span>
    </p>
  );
}
