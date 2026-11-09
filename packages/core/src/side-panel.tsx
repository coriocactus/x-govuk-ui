"use client";

import { useRender } from "@base-ui/react/use-render";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  createContext,
  type MouseEvent,
  type ReactNode,
  type RefCallback,
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
import type { ButtonProps } from "./button";
import { both, chain } from "./events";
import { useLabels } from "./labels";
import { CloseIconButton } from "./overlay";
import { useMergedRef } from "./refs";
import { ResizableHandle } from "./resizable";
import { ScrollArea, type ScrollAreaProps } from "./scroll-area";
import { Sheet, SheetContent } from "./sheet";
import { type StorageLike, useStoredState } from "./stored-state";

/*
 * A panel beside the work, such as an assistant or a form, which stays open while users move
 * around the work. Its parts:
 *
 * - SidePanelProvider keeps whether the panel is open and how wide it is, for every part inside it,
 *   such as a trigger in a page's header.
 * - SidePanelLayout lays out the work and the panel, and measures whether it has room for the
 *   panel beside the work.
 * - SidePanel is the panel. Beside the work, it has a handle to resize it, and slides away over the
 *   edge as it closes. Where the layout has no room for it beside the work, it is a Sheet.
 * - SidePanelHeader, SidePanelTitle and SidePanelClose head it.
 * - SidePanelTrigger opens it, and takes focus back as it closes. useSidePanel opens and closes it
 *   from anywhere else, such as a command menu.
 */

/** The words Side panel writes, which a LabelsProvider or its `labels` can change. */
export type SidePanelLabels = {
  /** Names the handle that resizes the panel, given the panel's name. */
  resize: (panel: string) => string;
  /** Names the button that closes the panel, given the panel's name. */
  close: (panel: string) => string;
};

export const defaultSidePanelLabels: SidePanelLabels = {
  resize: (panel) => `Resize ${panel}`,
  close: (panel) => `Close ${panel}`,
};

type SidePanelContextValue = {
  /** The panel's id, which the trigger and the handle name. */
  id: string;
  /** Whether the panel is open beside the work. */
  open: boolean;
  /** Whether the layout has room for the panel beside the work. */
  beside: boolean;
  /** Whether the panel is open as a sheet, where there is no room beside the work. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
  resizing: boolean;
  setResizing: (resizing: boolean) => void;
  setBeside: (beside: boolean) => void;
  besideFrom: number;
  trigger: RefObject<HTMLElement | null>;
  panel: RefObject<HTMLElement | null>;
  layout: RefObject<HTMLDivElement | null>;
  firstFocus: RefObject<(() => HTMLElement | null | undefined) | undefined>;
  show: () => void;
  close: () => void;
};

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

/**
 * The panel's width, apart from the rest, because it changes at every step of a drag. Only the
 * panel and its handle read it, so a drag renders them alone, not every trigger and form.
 */
type SidePanelWidth = {
  width: number;
  minWidth: number;
  maxWidth: number;
  setDragWidth: (width: number | null) => void;
  setKeptWidth: (width: number) => void;
};

const SidePanelWidthContext = createContext<SidePanelWidth>({
  width: 0,
  minWidth: 0,
  maxWidth: 0,
  setDragWidth: () => {},
  setKeptWidth: () => {},
});

function useSidePanelContext() {
  const context = useContext(SidePanelContext);
  if (!context) throw new Error("A Side panel's parts belong inside a SidePanelProvider.");
  return context;
}

/** What useSidePanel gives a control of a service's own. */
export type SidePanelState = {
  /** Whether the panel is open, beside the work or as a sheet. */
  shown: boolean;
  /** Whether the layout has room for the panel beside the work. */
  beside: boolean;
  /** Opens the panel, beside the work or as a sheet, and puts focus in it. */
  show: () => void;
  /** Closes the panel, and gives focus back to its trigger. */
  close: () => void;
};

/** Opens and closes the Side panel around it, such as from a command menu. */
export function useSidePanel(): SidePanelState {
  const { open, beside, sheetOpen, show, close } = useSidePanelContext();
  return { shown: beside ? open : sheetOpen, beside, show, close };
}

export type SidePanelProviderProps = {
  /**
   * Whether the panel is open, beside the work or as a sheet. Leave it out to let the provider keep
   * track. Every opening and closing calls `onOpenChange`, as a sheet as well as beside the work.
   * Where there is no room beside the work, the panel opens as a sheet only when users open it, so
   * an open panel does not cover the work by itself as the window narrows, and comes back beside
   * the work as it widens.
   */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The panel's id, which its trigger and its handle name. By default, one of its own. */
  id?: string;
  /** The panel's width as it starts, in pixels, until users resize it. */
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /**
   * The least width, in pixels, the layout needs to show the panel beside the work. In less, the
   * panel opens as a sheet over the work.
   */
  besideFrom?: number;
  /**
   * Keeps the panel's width between visits, under this key, and whether it is open beside the
   * work, unless `open` is given. Opening and closing it as a sheet keeps nothing.
   */
  storageKey?: string;
  /** Where `storageKey` keeps them. By default, local storage. */
  storage?: StorageLike;
  children: ReactNode;
};

/**
 * Keeps whether a Side panel is open and how wide it is, for every part inside it. Put it around
 * the SidePanelLayout and anything else that opens the panel, such as a trigger in a page's header.
 */
export function SidePanelProvider({
  open: givenOpen,
  defaultOpen = true,
  onOpenChange,
  defaultWidth = 380,
  minWidth = 300,
  maxWidth = 560,
  besideFrom = 760,
  storageKey,
  storage,
  children,
  id: givenId,
}: SidePanelProviderProps) {
  const ownId = useId();
  const id = givenId ?? ownId;
  const [ownOpen, setOwnOpen] = useStoredState(
    storageKey && `${storageKey}-open`,
    defaultOpen,
    storage,
  );
  const open = givenOpen ?? ownOpen;
  // Every change is reported. Only a change beside the work is kept, as users' preference there.
  const change = useCallback(
    (next: boolean, keep: boolean) => {
      if (givenOpen === undefined && keep) setOwnOpen(next);
      onOpenChange?.(next);
    },
    [givenOpen, setOwnOpen, onOpenChange],
  );
  // The width is kept once it is chosen, and follows a drag only in memory.
  const [keptWidth, setKeptWidth] = useStoredState(
    storageKey && `${storageKey}-width`,
    defaultWidth,
    storage,
  );
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const width = Math.min(maxWidth, Math.max(minWidth, dragWidth ?? keptWidth));
  const [resizing, setResizing] = useState(false);
  const [beside, setBeside] = useState(true);
  // The sheet opens only when users open it, so it never covers the work by itself. A change of
  // room puts it away in the render that brings the change, so it never shows for a frame, and the
  // panel, still open, comes back beside the work as the window widens. A panel closed by the
  // service closes its sheet too.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [roomWas, setRoomWas] = useState(beside);
  if (roomWas !== beside) {
    setRoomWas(beside);
    setSheetOpen(false);
  }
  if (sheetOpen && givenOpen === false) setSheetOpen(false);
  const trigger = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLElement | null>(null);
  const layout = useRef<HTMLDivElement | null>(null);
  const firstFocus = useRef<(() => HTMLElement | null | undefined) | undefined>(undefined);
  // Beside the work, the panel is in the page while closed, so focus moves once the opening is in
  // the page and the panel is reachable: to the place the panel names, or else to the panel.
  // Closed, focus goes back to the trigger used, or, if it has left the page or gone from view, to
  // the layout. A sheet moves focus itself.
  const [opened, setOpened] = useState(0);
  const show = useCallback(() => {
    if (!beside) {
      setSheetOpen(true);
      return change(true, false);
    }
    change(true, true);
    setOpened((count) => count + 1);
  }, [beside, change]);
  useEffect(() => {
    if (opened === 0) return;
    (firstFocus.current?.() ?? panel.current)?.focus({ preventScroll: true });
  }, [opened]);
  // Focus goes back once the close is in the page, with anything that closed with it, such as a
  // Selection bar emptied by the form's save, so a trigger that went from view is passed over.
  const [closed, setClosed] = useState(0);
  const close = useCallback(() => {
    if (!beside) {
      setSheetOpen(false);
      return change(false, false);
    }
    change(false, true);
    setClosed((count) => count + 1);
  }, [beside, change]);
  useEffect(() => {
    if (closed === 0) return;
    // A trigger can stay in the page but go from view, such as one in a Selection bar that
    // closed with the selection, and a hidden element takes no focus.
    const used = trigger.current;
    const shown = used?.isConnected && (used.checkVisibility?.() ?? used.offsetParent !== null);
    (shown ? used : layout.current)?.focus({ preventScroll: true });
  }, [closed]);
  const setSheet = useCallback(
    (next: boolean) => {
      setSheetOpen(next);
      change(next, false);
    },
    [change],
  );
  const context = useMemo<SidePanelContextValue>(
    () => ({
      id,
      open,
      beside,
      sheetOpen,
      setSheetOpen: setSheet,
      resizing,
      setResizing,
      setBeside,
      besideFrom,
      trigger,
      panel,
      layout,
      firstFocus,
      show,
      close,
    }),
    [id, open, beside, sheetOpen, setSheet, resizing, besideFrom, show, close],
  );
  const sizes = useMemo(
    () => ({ width, minWidth, maxWidth, setDragWidth, setKeptWidth }),
    [width, minWidth, maxWidth, setKeptWidth],
  );
  return (
    <SidePanelContext value={context}>
      <SidePanelWidthContext value={sizes}>{children}</SidePanelWidthContext>
    </SidePanelContext>
  );
}

export type SidePanelLayoutProps = ComponentPropsWithRef<"div">;

/**
 * The work and the Side panel beside it, as wide as users leave it. It measures its own width, not
 * the window's, so a sidebar beside it leaves the panel less room. Put the work first, then the
 * SidePanel.
 */
export function SidePanelLayout({ className = "", style, ref, ...props }: SidePanelLayoutProps) {
  const panel = useSidePanelContext();
  const { setBeside, besideFrom, layout } = panel;
  // The first measure is taken before the page paints, so a narrow layout never shows the panel
  // beside the work for a frame. The observer's first report comes after the paint.
  useLayoutEffect(() => {
    const element = layout.current;
    if (!element) return;
    const measure = () => setBeside(element.clientWidth >= besideFrom);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [setBeside, besideFrom, layout]);
  return (
    <div
      // Focus comes here as the panel closes, if the trigger used has left the page.
      tabIndex={-1}
      {...props}
      ref={useMergedRef(layout, ref)}
      className={`x-govuk-ui-side-panel-layout ${className}`.trim()}
      data-open={(panel.beside && panel.open) || undefined}
      data-resizing={panel.resizing || undefined}
      style={style}
    />
  );
}

// The panel's id is its SidePanelProvider's, which its trigger and handle name.
export type SidePanelProps = Omit<ComponentPropsWithRef<"aside">, "id"> & {
  /** Names the panel, its handle and its close button, such as Piscine Assist. */
  label: string;
  /** Where focus goes as the panel opens, such as its message box. By default, the panel. */
  initialFocus?: () => HTMLElement | null | undefined;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<SidePanelLabels>;
  children: ReactNode;
};

const SidePanelNameContext = createContext("");

/**
 * The panel. Beside the work, a handle on its edge resizes it with a drag or the arrow keys, and
 * it slides away over the edge as it closes, out of reach of the keyboard and screen readers. The
 * work takes or gives up the panel's space at once, and the panel slides by a transform, so the
 * work lays out once, not at every frame of the slide. Where the layout has no room for it beside
 * the work, it opens as a Sheet, which gives focus back to its trigger as it closes.
 */
export function SidePanel({
  label,
  initialFocus,
  className = "",
  ref,
  labels: ownLabels,
  children,
  ...props
}: SidePanelProps) {
  const labels = useLabels("sidePanel", defaultSidePanelLabels, ownLabels);
  const panel = useSidePanelContext();
  const sizes = useContext(SidePanelWidthContext);
  const { firstFocus, id } = panel;
  useLayoutEffect(() => {
    firstFocus.current = initialFocus;
  });
  // The width is the panel's own, so a drag restyles the panel alone, not the work beside it.
  const width = { "--x-govuk-ui-side-panel-width": `${sizes.width}px` } as CSSProperties;
  const element = useMergedRef(panel.panel, ref);
  if (!panel.beside)
    return (
      <SidePanelNameContext value={label}>
        <Sheet side="right" open={panel.sheetOpen} onOpenChange={panel.setSheetOpen}>
          <SheetContent
            {...(props as ComponentPropsWithRef<"div">)}
            ref={element as RefCallback<HTMLDivElement>}
            id={id}
            label={label}
            className={`x-govuk-ui-side-panel x-govuk-ui-side-panel-sheet ${className}`.trim()}
            initialFocus={initialFocus ?? true}
            finalFocus={panel.trigger}
            style={{ ...width, ...props.style }}
          >
            {children}
          </SheetContent>
        </Sheet>
      </SidePanelNameContext>
    );
  return (
    <SidePanelNameContext value={label}>
      <ResizableHandle
        className="x-govuk-ui-side-panel-handle"
        label={labels.resize(label)}
        controls={id}
        panel="after"
        value={sizes.width}
        min={sizes.minWidth}
        max={sizes.maxWidth}
        disabled={!panel.open}
        onValueChange={sizes.setDragWidth}
        onValueCommit={(kept) => {
          sizes.setKeptWidth(kept);
          sizes.setDragWidth(null);
        }}
        onDraggingChange={panel.setResizing}
      />
      <aside
        aria-label={label}
        // Focus comes here as the panel opens, unless it names a place of its own.
        tabIndex={-1}
        {...props}
        ref={element}
        id={id}
        className={`x-govuk-ui-side-panel ${className}`.trim()}
        inert={!panel.open}
        style={{ ...width, ...props.style }}
      >
        {children}
      </aside>
    </SidePanelNameContext>
  );
}

export type SidePanelHeaderProps = ComponentPropsWithRef<"div">;

/** The panel's head, with its title and its close button, above a keyline. */
export function SidePanelHeader({ className = "", ...props }: SidePanelHeaderProps) {
  return <div {...props} className={`x-govuk-ui-side-panel-header ${className}`.trim()} />;
}

export type SidePanelTitleProps = ComponentPropsWithRef<"h2">;

/** The panel's title, as a heading of the page's second level. */
export function SidePanelTitle({ className = "", ...props }: SidePanelTitleProps) {
  return <h2 {...props} className={`x-govuk-ui-side-panel-title ${className}`.trim()} />;
}

export type SidePanelBodyProps = Omit<ScrollAreaProps, "orientation">;

/**
 * The panel's content beneath its head, with the panel's padding. It fills the rest of the panel,
 * and scrolls in a Scroll area where it is taller, so the head stays in place. It stacks its parts
 * as a Stack does, with `--x-govuk-ui-space-surface` between them, so put running text in a
 * paragraph. Its class and style go on the Scroll area's box.
 */
export function SidePanelBody({ className = "", children, ...props }: SidePanelBodyProps) {
  return (
    <ScrollArea {...props} className={`x-govuk-ui-side-panel-body ${className}`.trim()}>
      <div className="x-govuk-ui-side-panel-content x-govuk-ui-stack">{children}</div>
    </ScrollArea>
  );
}

export type SidePanelCloseProps = ButtonProps & {
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<SidePanelLabels>;
};

/** An × that closes the panel, named after it, such as Close Piscine Assist. */
export function SidePanelClose({
  className = "",
  onClick,
  labels: ownLabels,
  ...props
}: SidePanelCloseProps) {
  const labels = useLabels("sidePanel", defaultSidePanelLabels, ownLabels);
  const panel = useSidePanelContext();
  const name = useContext(SidePanelNameContext);
  return (
    <CloseIconButton
      label={labels.close(name)}
      {...props}
      className={`x-govuk-ui-side-panel-close ${className}`.trim()}
      onClick={chain(onClick, () => panel.close())}
    />
  );
}

export type SidePanelTriggerProps = ComponentPropsWithRef<"button"> & {
  /** Renders another element, such as a Button, in place of the button. */
  render?: useRender.RenderProp;
};

/**
 * Opens the panel, beside the work or as a sheet, and takes focus back as it closes. Several can
 * open one panel, such as a Change button on each row, and focus goes back to the one used. It
 * names the panel it controls while the panel is in the page.
 */
export function SidePanelTrigger({ render, onClick, ref, ...props }: SidePanelTriggerProps) {
  const panel = useSidePanelContext();
  const { trigger } = panel;
  // A trigger takes focus back once it is in the page, such as one that shows only while the
  // panel is closed. Leaving the page, it keeps its place until another takes it, so a trigger
  // that comes back as the panel closes is found.
  const register = useCallback(
    (element: HTMLButtonElement | null) => {
      if (element) trigger.current = element;
    },
    [trigger],
  );
  return useRender({
    defaultTagName: "button",
    render,
    ref: ref ? [register, ref] : register,
    props: {
      type: "button",
      // The sheet is not in the page while it is closed, so the trigger names it only while there
      // is a panel beside the work or an open sheet to name.
      "aria-controls": panel.beside || panel.sheetOpen ? panel.id : undefined,
      ...props,
      // The trigger used takes focus back, even one whose service stops it opening the panel, such
      // as a trigger that closes the panel while it is open.
      onClick: both(
        (event: MouseEvent<HTMLButtonElement>) => {
          trigger.current = event.currentTarget;
        },
        chain(onClick, () => panel.show()),
      ),
    },
  });
}
