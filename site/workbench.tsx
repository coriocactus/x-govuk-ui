import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Button,
  type ButtonProps,
  CodeBlock,
  CodeBlockCopy,
  CommandMenu,
  CommandMenuGroup,
  CommandMenuItem,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  ResizableHandle,
  ScrollArea,
  Separator,
  Sheet,
  SheetClose,
  SheetContent,
  SidebarCustomise,
  SidebarProvider,
  SidebarTrigger,
  Skeleton,
  SkipLink,
  SoundScope,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
  Tag,
  ThemePicker,
  Tooltip,
  TooltipGroup,
  TooltipProvider,
  useMotionTiming,
  useSidebarArrangement,
  useSound,
  useTheme,
} from "x-govuk-ui";
import { useStoredState } from "../packages/core/src/stored-state";
import { type ComponentName, catalogue, componentNames, componentOrder, groups } from "./catalogue";
import { CheckoutTag } from "./checkout-tag";
import { Credits } from "./credits";
import { Icon, type IconName } from "./icon";
import { WorkbenchLanding } from "./landing";
import { PropsPanel } from "./playground";
import { PREVIEW_DRAWN, PREVIEW_READY, type PreviewMessage } from "./preview-frame";
import { PreviewStage, useExamplesStay } from "./preview-stage";
import { type PropDoc, startingArgs } from "./props";
import { StylingPanel } from "./styling-panel";
import { ExperimentalMark, WorkbenchSidebar } from "./workbench-sidebar";

/**
 * The phone preview's width, which its edge changes, from a small phone up, starting at a common
 * one.
 */
const PHONE = { min: 320, start: 375, margin: 24 };

/**
 * Where the playground starts for a component, with the values its props and example settings
 * list.
 */
function argsFor(name: ComponentName) {
  const { props, example = [] } = catalogue[name];
  return startingArgs([...props, ...example]);
}

/** The component at /workbench/<name>, or none at /workbench, the workbench's own page. */
function componentFromPath(): ComponentName | null {
  const [base, slug] = location.pathname.split("/").filter(Boolean);
  if (base !== "workbench" || !slug) return null;
  return componentNames.includes(slug as ComponentName) ? (slug as ComponentName) : null;
}

/** An icon button whose tooltip repeats its accessible name. */
function ToolbarButton({ label, icon, ...props }: ButtonProps & { label: string; icon: IconName }) {
  return (
    <Tooltip content={label}>
      <Button variant="quiet" size="small-icon" aria-label={label} {...props}>
        <Icon name={icon} />
      </Button>
    </Tooltip>
  );
}

/** A component's sidebar entry, and whether it is out of sight in the list. */
function sidebarEntry(key: ComponentName) {
  const link = document.querySelector<HTMLElement>(
    `.workbench-sidebar a[href="/workbench/${key}"]`,
  );
  const list = link?.closest(".x-govuk-ui-scroll-area-viewport");
  if (!link?.checkVisibility() || !list) return null;
  const box = link.getBoundingClientRect();
  const view = list.getBoundingClientRect();
  return { link, hidden: box.top < view.top || box.bottom > view.bottom };
}

/** Brings a sidebar entry to the middle of the list, as far as the list scrolls. */
function centre(link: HTMLElement, reduced: boolean) {
  link.scrollIntoView({ block: "center", behavior: reduced ? "instant" : "smooth" });
}

/**
 * Every component as a sidebar entry, in the catalogue's order, for people to arrange. An
 * experimental component has its flask in Customise the sidebar too, after its name.
 */
const sidebarEntries = componentOrder.map((key) => ({
  id: key,
  label: catalogue[key].name,
  group: catalogue[key].group,
  badge: catalogue[key].experimental ? <ExperimentalMark /> : undefined,
}));

export function Workbench() {
  // The component showing, or none on the workbench's own page.
  const [name, setName] = useState<ComponentName | null>(componentFromPath);
  const component = name ? catalogue[name] : null;
  const [args, setArgs] = useState<Record<string, unknown>>(() => (name ? argsFor(name) : {}));
  const [paletteOpen, setPaletteOpen] = useState(false);
  // A command that opens or resets a preview sends focus to the start of it as the menu closes.
  const focusPreview = useRef(false);
  const [panelHeight, setPanelHeight] = useState(260);
  const [panelWidth, setPanelWidth] = useState(320);
  // A divider being dragged sets its panel's size on the page directly. The workbench takes the
  // size once the drag ends, so the preview and the code do not render again at every move.
  const shell = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const codeSection = useRef<HTMLElement>(null);
  const resizing = useRef<{ code?: number; inspector?: number } | null>(null);
  const resize = (panel: "code" | "inspector", value: number) => {
    if (!resizing.current) {
      if (panel === "code") setPanelHeight(value);
      else setPanelWidth(value);
      return;
    }
    resizing.current[panel] = value;
    const users = panel === "code" ? [main.current, codeSection.current] : [shell.current];
    for (const element of users)
      element?.style.setProperty(
        panel === "code" ? "--code-height" : "--inspector-width",
        `${value}px`,
      );
  };
  const resizeDragging = (active: boolean) => {
    if (active) resizing.current = {};
    else {
      const sizes = resizing.current;
      resizing.current = null;
      if (sizes?.code !== undefined) setPanelHeight(sizes.code);
      if (sizes?.inspector !== undefined) setPanelWidth(sizes.inspector);
    }
    setDragging(active);
  };
  const [codeOpen, setCodeOpen] = useState(true);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const openPlayground = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  const [viewport, setViewport] = useState({ width: innerWidth, height: innerHeight });
  const narrow = viewport.width <= 900;
  const maxWidth = Math.max(240, Math.min(600, viewport.width - 256 - 326));
  const maxHeight = Math.max(100, viewport.height - 180);
  const codeHeight = Math.min(panelHeight, maxHeight);
  const inspectorWidth = Math.min(panelWidth, maxWidth);
  const [generation, setGeneration] = useState(0);
  // The usage code, with the component it belongs to.
  const [source, setSource] = useState<{ name: ComponentName; code: string } | null>(null);
  const [sourceSlow, setSourceSlow] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  // The theme, which is system, light or dark, kept in this browser for every page of the site.
  const appearance = useTheme({ storageKey: "x-govuk-ui-theme" });
  const theme = appearance.theme;
  const { reduced } = useMotionTiming();
  // Whether the sounds are muted, kept in this browser for every page of the site.
  const [muted, setMuted] = useStoredState("x-govuk-ui-muted", false);
  const playSound = useSound({ muted });
  const wasMuted = useRef(muted);
  useEffect(() => {
    if (wasMuted.current && !muted) void playSound("swoosh").catch(() => {});
    wasMuted.current = muted;
  }, [muted, playSound]);
  const showCode = useRef<HTMLButtonElement>(null);
  const hideCode = useRef<HTMLButtonElement>(null);

  const selectComponent = useCallback((next: ComponentName | null) => {
    setName(next);
    setArgs(next ? argsFor(next) : {});
    setGeneration((value) => value + 1);
  }, []);
  const navigate = (next: ComponentName | null) => {
    if (name === next) return;
    history.pushState(null, "", next ? `/workbench/${next}` : "/workbench");
    selectComponent(next);
  };
  // From the command menu, a component's preview takes focus. The sidebar brings a new entry into
  // view itself, to the middle of the list if it was out of sight. The current entry comes to the
  // middle here if it is out of sight.
  const openFromMenu = (key: ComponentName) => {
    focusPreview.current = true;
    if (key === name) {
      const entry = sidebarEntry(key);
      if (entry?.hidden) centre(entry.link, reduced);
      return;
    }
    navigate(key);
  };
  // The browser's Back and Forward move between components. An example's own history entries on
  // the same page, such as Form steps', belong to the example.
  const shown = useRef(name);
  useEffect(() => {
    shown.current = name;
  }, [name]);
  useEffect(() => {
    const popstate = () => {
      const next = componentFromPath();
      if (next !== shown.current) selectComponent(next);
    };
    window.addEventListener("popstate", popstate);
    return () => window.removeEventListener("popstate", popstate);
  }, [selectComponent]);

  // Next and Previous follow the sidebar as it is arranged, or the catalogue's own order for a
  // component the sidebar hides, and wrap around at either end.
  const arranger = useSidebarArrangement({
    entries: sidebarEntries,
    groups,
    storageKey: "x-govuk-ui-sidebar-layout",
  });
  const [customising, setCustomising] = useState(false);
  // From the workbench's own page, Next is the first component and Previous the last.
  const route = (
    name && !arranger.shown.includes(name) ? componentOrder : arranger.shown
  ) as ComponentName[];
  const position = name ? route.indexOf(name) : -1;
  const previous = route.at(name ? position - 1 : -1)!;
  const next = route.at((position + 1) % route.length)!;
  const pinned = name ? arranger.isPinned(name) : false;

  useEffect(() => {
    document.title = component?.name ?? "Workbench";
  }, [component?.name]);

  // The usage code is the example's own source file, the same file that renders the preview.
  // Lines of skeleton stand in for it only if it takes a while to arrive, so a quick load shows no
  // flash. Until then, the last code stays.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Try again loads the code once more.
  useEffect(() => {
    const controller = new AbortController();
    setSourceError(false);
    setSourceSlow(false);
    if (!name) return;
    const slow = setTimeout(() => setSourceSlow(true), 300);
    fetch(`/source/${name}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Source unavailable");
        return response.text();
      })
      .then((code) => setSource({ name, code }))
      .catch((error) => {
        if (error.name !== "AbortError") setSourceError(true);
      })
      .finally(() => clearTimeout(slow));
    return () => {
      controller.abort();
      clearTimeout(slow);
    };
  }, [name, sourceAttempt]);
  // The code for the component showing, or the last code until the new one is slow or missing.
  let code: string | null | undefined = source?.code;
  if (source?.name !== name && (sourceSlow || sourceError)) code = null;

  useEffect(() => {
    const resize = () => setViewport({ width: innerWidth, height: innerHeight });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // The workbench's own page has no code to show. Moving between it and a component, the code
  // panel simply appears or disappears. It only moves when Hide code or Show code is pressed.
  const showsCode = codeOpen && component !== null;
  const page = component ? "component" : "landing";
  const shownPage = useRef(page);
  const switchingPage = shownPage.current !== page;
  useLayoutEffect(() => {
    shownPage.current = page;
  });
  const change = (prop: PropDoc, value: unknown) => {
    setArgs((previous) => ({ ...previous, [prop.name]: value }));
    // A prop read once, such as defaultOpen, only shows its effect when the example starts again.
    if (prop.restart) setGeneration((value) => value + 1);
  };
  // An example sets every setting at once, and starts the example again if it changes one read
  // once.
  const replace = (next: Record<string, unknown>) => {
    const { props, example = [] } = name ? catalogue[name] : { props: [] };
    const restarts = [...props, ...example].some(
      (prop) => prop.restart && next[prop.name] !== args[prop.name],
    );
    setArgs(next);
    if (restarts) setGeneration((value) => value + 1);
  };
  // On a small screen, the playground is a Sheet. Show code sits in it, so showing the code closes
  // the sheet to reveal the code. Hiding the code leaves the playground closed, and focus moves to
  // the button that opens it, where Show code now is.
  const toggleCode = (open: boolean) => {
    setCodeOpen(open);
    if (narrow && open) setPlaygroundOpen(false);
    requestAnimationFrame(() => {
      if (open) return hideCode.current?.focus();
      if (narrow) return openPlayground.current?.focus();
      showCode.current?.focus();
    });
  };
  const hideButton = (
    <ToolbarButton
      ref={hideCode}
      label="Hide code panel"
      icon="hide"
      aria-controls="code-panel"
      aria-expanded={codeOpen}
      onClick={() => toggleCode(false)}
    />
  );
  const resetPreview = () => {
    if (!name) return;
    setArgs(argsFor(name));
    setGeneration((value) => value + 1);
  };

  useExamplesStay();
  const stage = useRef<HTMLDivElement>(null);
  const [inspectorTab, setInspectorTab] = useState("props");

  // The phone preview shows the example in a frame as wide as a phone, which people can widen or
  // narrow from its edge. The frame is a page of its own, so rules that depend on the window's
  // width apply in it as on a phone. It takes the component and the playground's props by message,
  // and asks for them when it is ready. Whether it is on, and its width, are kept in this browser.
  //
  // A page of its own takes a moment to load. The frame therefore loads as the pointer or focus
  // reaches the Phone preview button, or at once if the preview starts on. It loads out of sight,
  // at the place and size it will show at, and is kept from then on, empty while it is not shown.
  // Turned on, the button is pressed at once, and the example stays in the workbench's own preview
  // until the frame has drawn it, so the preview is never blank. Going from one component to the
  // next, the frame is told, and loads nothing.
  const [phone, setPhone] = useStoredState("x-govuk-ui-workbench-phone", false);
  const [phoneWidth, setPhoneWidth] = useStoredState(
    "x-govuk-ui-workbench-phone-width",
    PHONE.start,
  );
  const [phoneDragging, setPhoneDragging] = useState(false);
  const phoneFrame = useRef<HTMLIFrameElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const measure = () => setCanvasWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const phoneAllowed = component !== null && !narrow;
  const phoneShown = phone && phoneAllowed;
  const [phoneWarm, setPhoneWarm] = useState(false);
  const phoneLoaded = (phoneWarm || phoneShown) && phoneAllowed;
  const [phoneDrawn, setPhoneDrawn] = useState(false);
  const phoneInSight = phoneShown && phoneDrawn;
  // The frame's address is the component it first shows, and stays, because a new address would
  // load it again. The component is kept from the render the frame loads in, and released when the
  // frame goes.
  const [loadedAs, setLoadedAs] = useState<ComponentName | null>(null);
  if (phoneLoaded && loadedAs === null && name) setLoadedAs(name);
  if (!phoneLoaded && loadedAs !== null) setLoadedAs(null);
  const phoneSource = loadedAs === null ? "" : `/workbench/${loadedAs}?frame`;
  if (!phoneShown && phoneDrawn) setPhoneDrawn(false);
  const phoneMax = Math.max(PHONE.min, canvasWidth - 2 * PHONE.margin);
  // What the frame was last sent, for the sender to read whenever the frame asks.
  const sent = useRef({ name, args, generation, muted, shown: phoneShown });
  useEffect(() => {
    sent.current = { name, args, generation, muted, shown: phoneShown };
  }, [name, args, generation, muted, phoneShown]);
  const sendToPhone = useCallback(() => {
    const { name, ...rest } = sent.current;
    if (!name) return;
    const message: PreviewMessage = { type: "x-govuk-ui-preview", name, ...rest };
    phoneFrame.current?.contentWindow?.postMessage(message, location.origin);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each change is sent as it happens.
  useEffect(() => {
    if (phoneLoaded) sendToPhone();
  }, [phoneLoaded, phoneShown, name, args, generation, muted, sendToPhone]);
  useEffect(() => {
    const heard = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== phoneFrame.current?.contentWindow)
        return;
      const data = event.data as { type?: string; name?: string } | null;
      if (data?.type === PREVIEW_READY) sendToPhone();
      if (data?.type === PREVIEW_DRAWN && data.name === sent.current.name && sent.current.shown)
        setPhoneDrawn(true);
    };
    window.addEventListener("message", heard);
    return () => window.removeEventListener("message", heard);
  }, [sendToPhone]);

  // The playground, with the component, its description, and its props and styling in two tabs,
  // which stay as chosen from one component to the next. A Sheet contains it on a small screen,
  // and the side column on a wide one. The workbench's own page has none.
  const inspector = component && name && (
    <>
      <div className="inspector-header">
        <div className="inspector-heading">
          <h2 className="component-title">
            {component.name}
            {component.experimental && (
              <Tag colour="orange" className="component-experimental">
                Experimental
              </Tag>
            )}
          </h2>
          {narrow && (
            <SheetClose variant="quiet" size="small-icon" aria-label="Close playground">
              <Icon name="close" />
            </SheetClose>
          )}
        </div>
        <Credits name={name} />
        <p className="inspector-description">{component.description}</p>
      </div>
      <Tabs value={inspectorTab} onValueChange={setInspectorTab} className="inspector-tabs">
        <TabsList aria-label={`${component.name} reference`} className="inspector-tablist">
          <TabsTrigger value="props">Props</TabsTrigger>
          <TabsTrigger value="styling">Styling</TabsTrigger>
        </TabsList>
        <TabsPanel value="props" className="inspector-panel">
          <ScrollArea className="inspector-scroll" label="Props" fade>
            <PropsPanel
              props={component.props}
              example={component.example}
              presets={component.presets}
              args={args}
              onChange={change}
              onReplace={replace}
            />
          </ScrollArea>
        </TabsPanel>
        <TabsPanel value="styling" className="inspector-panel">
          <ScrollArea className="inspector-scroll" label="Styling" fade>
            <StylingPanel name={name} />
          </ScrollArea>
        </TabsPanel>
      </Tabs>
      {!codeOpen && (
        <div className="inspector-footer">
          <Button
            ref={showCode}
            variant="quiet"
            className="show-code-button"
            aria-controls="code-panel"
            aria-expanded={false}
            onClick={() => toggleCode(true)}
          >
            <Icon name="code" />
            Show code
          </Button>
        </div>
      )}
    </>
  );

  return (
    <SoundScope play={playSound}>
      {/* Tooltips outside the toolbar's group share one delay, so the next opens at once. */}
      <TooltipProvider>
        <CommandMenu
          open={paletteOpen}
          onOpenChange={(open) => {
            setPaletteOpen(open);
            // Opening by shortcut has no press to answer, so the menu plays its own sound.
            if (open) void playSound("open").catch(() => {});
          }}
          trigger={false}
          // After a component is chosen, or the preview reset, focus rests unseen at the start of
          // the preview, so the next Tab reaches the example's first control. Base UI only
          // returns focus to something Tab reaches, and would pass it on to that first control.
          // The workbench therefore places focus itself and asks Base UI to leave it alone. Other
          // commands return focus to where it was.
          finalFocus={() => {
            if (!focusPreview.current) return true;
            focusPreview.current = false;
            stage.current?.focus({ preventScroll: true });
            return false;
          }}
          // On its own page, the command menu example takes Command-K.
          hotkey={name !== "command-menu"}
          placeholder="Search components and actions…"
        >
          <CommandMenuGroup label="Preview">
            <CommandMenuItem icon={<Icon name="next" />} onSelect={() => openFromMenu(next)}>
              {`Next component: ${catalogue[next].name}`}
            </CommandMenuItem>
            <CommandMenuItem
              icon={<Icon name="previous" />}
              onSelect={() => openFromMenu(previous)}
            >
              {`Previous component: ${catalogue[previous].name}`}
            </CommandMenuItem>
            {component && (
              <CommandMenuItem
                icon={<Icon name="reset" />}
                onSelect={() => {
                  focusPreview.current = true;
                  resetPreview();
                }}
              >
                Reset preview
              </CommandMenuItem>
            )}
          </CommandMenuGroup>
          <CommandMenuGroup label="Workbench">
            {/* The workbench's own page, with every component drawn. */}
            <CommandMenuItem
              icon={<Icon name="overview" />}
              keywords={["home", "start", "landing", "featured"]}
              onSelect={() => navigate(null)}
            >
              Overview
            </CommandMenuItem>
            <CommandMenuItem
              icon={<Icon name={theme === "light" ? "sun" : "moon"} />}
              keywords={["appearance", "theme"]}
              onSelect={() => appearance.setTheme(theme === "light" ? "dark" : "light")}
            >
              {`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            </CommandMenuItem>
            <CommandMenuItem
              icon={<Icon name={muted ? "sound" : "muted"} />}
              onSelect={() => setMuted(!muted)}
            >
              {muted ? "Unmute sounds" : "Mute sounds"}
            </CommandMenuItem>
            {name && component && (
              <>
                <CommandMenuItem
                  icon={<Icon name={codeOpen ? "hide" : "code"} />}
                  keywords={["usage"]}
                  onSelect={() => toggleCode(!codeOpen)}
                >
                  {codeOpen ? "Hide code panel" : "Show code panel"}
                </CommandMenuItem>
                <CommandMenuItem
                  icon={<Icon name="pin" />}
                  keywords={["sidebar", "favourite"]}
                  onSelect={() => (pinned ? arranger.unpin(name) : arranger.pin(name))}
                >
                  {pinned ? `Unpin ${component.name}` : `Pin ${component.name} to the top`}
                </CommandMenuItem>
              </>
            )}
            <CommandMenuItem
              icon={<Icon name="settings" />}
              keywords={["sidebar", "order", "hide", "pin"]}
              onSelect={() => setCustomising(true)}
            >
              Customise the sidebar
            </CommandMenuItem>
          </CommandMenuGroup>
          {/* The components, in the sidebar's groups and order. */}
          {groups.map((group) => {
            const members = componentOrder.filter((key) => catalogue[key].group === group);
            return (
              members.length > 0 && (
                <CommandMenuGroup key={group} label={`Components · ${group}`}>
                  {members.map((key) => (
                    <CommandMenuItem
                      key={key}
                      keywords={[group]}
                      onSelect={() => openFromMenu(key)}
                    >
                      {catalogue[key].name}
                    </CommandMenuItem>
                  ))}
                </CommandMenuGroup>
              )
            );
          })}
        </CommandMenu>
        {/* On the sidebar's own page, the sidebar example takes Command-B. */}
        {/* The workbench remembers whether its sidebar is open, and its width. */}
        <SidebarProvider
          mobileBreakpoint={900}
          shortcut={name !== "sidebar" && "b"}
          storageKey="x-govuk-ui-sidebar"
        >
          <div
            ref={shell}
            className="workbench"
            data-resizing={dragging || undefined}
            data-playground={component ? undefined : "none"}
            style={{ "--inspector-width": `${inspectorWidth}px` } as CSSProperties}
          >
            <SkipLink href="#component">Skip to component</SkipLink>
            <WorkbenchSidebar
              name={name}
              onNavigate={navigate}
              onOpenCommands={() => setPaletteOpen(true)}
              arranger={arranger}
            />
            <SidebarCustomise
              arranger={arranger}
              open={customising}
              onOpenChange={setCustomising}
              labels={{
                description:
                  "Choose which components the sidebar shows, and in what order. Pinned components come first. Your choices are kept in this browser.",
                nothingPinned: "Nothing is pinned. Pin a component to keep it at the top.",
              }}
            />

            <main
              ref={main}
              id="component"
              className="component-main"
              tabIndex={-1}
              data-code-open={showsCode}
              data-instant={switchingPage || undefined}
              style={{ "--code-height": `${codeHeight}px` } as CSSProperties}
            >
              <h1 className="visually-hidden">{component?.name ?? "Workbench"}</h1>
              <span className="visually-hidden" role="status">
                {component ? `${component.name} component` : "Workbench"}
              </span>
              <section className="preview-section" aria-label="Live preview">
                {/* One tooltip glides along the toolbar as the pointer moves between buttons. */}
                <TooltipGroup side="bottom">
                  <div className="preview-toolbar">
                    <div className="preview-tools">
                      <SidebarTrigger />
                    </div>
                    <CheckoutTag />
                    <div className="preview-tools">
                      <ToolbarButton
                        label={`Previous: ${catalogue[previous].name}`}
                        icon="previous"
                        onClick={() => navigate(previous)}
                      />
                      <ToolbarButton
                        label={`Next: ${catalogue[next].name}`}
                        icon="next"
                        onClick={() => navigate(next)}
                      />
                      {/* The workbench's own page, from any component. The button disappears as
                          it opens, so focus waits unseen at the start of the preview, as it does
                          after the command menu, and Tab reaches the first component. */}
                      {component && (
                        <ToolbarButton
                          label="Overview"
                          icon="overview"
                          onClick={() => {
                            stage.current?.focus({ preventScroll: true });
                            navigate(null);
                          }}
                        />
                      )}
                      <Separator orientation="vertical" className="toolbar-divider" />
                      {component && (
                        <ToolbarButton
                          label="Reset preview"
                          icon="reset"
                          data-sound="chirp"
                          onClick={resetPreview}
                        />
                      )}
                      {/* On a phone, the workbench is already as narrow as one, so it has none. */}
                      {component && !narrow && (
                        <ToolbarButton
                          label="Phone preview"
                          icon="phone"
                          aria-pressed={phone}
                          onClick={() => setPhone(!phone)}
                          // The frame starts loading as people reach for the button.
                          onPointerEnter={() => setPhoneWarm(true)}
                          onFocus={() => setPhoneWarm(true)}
                        />
                      )}
                      <ToolbarButton
                        label="Mute sounds"
                        icon={muted ? "muted" : "sound"}
                        aria-pressed={muted}
                        data-sound="off"
                        onClick={() => setMuted(!muted)}
                      />
                      <ToolbarButton
                        label="Customise the sidebar"
                        icon="arrange"
                        aria-haspopup="dialog"
                        onClick={() => setCustomising(true)}
                      />
                      <ThemePicker value={appearance.theme} onValueChange={appearance.setTheme} />
                      {component && (
                        <ToolbarButton
                          ref={openPlayground}
                          label="Open playground"
                          icon="settings"
                          className="mobile-only"
                          aria-haspopup="dialog"
                          aria-expanded={playgroundOpen}
                          aria-controls={playgroundOpen ? "playground" : undefined}
                          onClick={() => setPlaygroundOpen(true)}
                        />
                      )}
                    </div>
                  </div>
                </TooltipGroup>
                <div ref={canvas} className="preview-canvas" data-phone={phoneInSight || undefined}>
                  {phoneLoaded && (
                    <div
                      className="preview-phone"
                      data-waiting={!phoneInSight || undefined}
                      inert={!phoneInSight}
                      data-dragging={phoneDragging || undefined}
                      style={
                        {
                          "--phone-width": `${Math.min(phoneWidth, phoneMax)}px`,
                        } as CSSProperties
                      }
                    >
                      {/* No sandbox. The frame is the site's own page, which needs its scripts
                          and its origin, for its storage and its messages. A sandbox that allows
                          both is no sandbox. */}
                      <iframe
                        ref={phoneFrame}
                        id="phone-preview"
                        src={phoneSource}
                        title={`${component.name}, as on a phone`}
                        className="preview-phone-screen"
                      />
                      <ResizableHandle
                        className="preview-phone-edge"
                        label="Resize the phone preview"
                        controls="phone-preview"
                        grip
                        value={Math.min(phoneWidth, phoneMax)}
                        min={PHONE.min}
                        max={phoneMax}
                        defaultValue={PHONE.start}
                        panel="before"
                        onValueChange={setPhoneWidth}
                        onDraggingChange={setPhoneDragging}
                      />
                      <p className="preview-phone-width" aria-hidden="true">
                        {Math.min(phoneWidth, phoneMax)} px
                      </p>
                    </div>
                  )}
                  {!phoneInSight && (
                    <ScrollArea orientation="both" label="Preview" className="preview-frame">
                      <PreviewStage
                        ref={stage}
                        name={name}
                        args={args}
                        generation={generation}
                        muted={muted}
                      >
                        <WorkbenchLanding onOpen={navigate} />
                      </PreviewStage>
                    </ScrollArea>
                  )}
                </div>
              </section>

              <div className="code-divider" inert={!showsCode} aria-hidden={!showsCode}>
                <ResizableHandle
                  orientation="horizontal"
                  label="Resize code panel"
                  controls="code-panel"
                  value={codeHeight}
                  min={100}
                  max={maxHeight}
                  onValueChange={(value) => resize("code", value)}
                  onDraggingChange={resizeDragging}
                />
              </div>
              <div className="code-slot" inert={!showsCode} aria-hidden={!showsCode}>
                <section
                  ref={codeSection}
                  id="code-panel"
                  className="code-section"
                  style={{ "--code-height": `${codeHeight}px` } as CSSProperties}
                  aria-label={component ? `${component.name} usage` : undefined}
                >
                  {!component ? null : code && !sourceError ? (
                    <CodeBlock code={code} label={`${component.name} usage`} className="code-panel">
                      {hideButton}
                      <CodeBlockCopy />
                    </CodeBlock>
                  ) : (
                    <div className="code-panel code-status">
                      <div className="x-govuk-ui-code-block-actions" data-floating="">
                        {hideButton}
                      </div>
                      {sourceError ? (
                        <EmptyState size="small" className="source-status">
                          <EmptyStateTitle level={3}>
                            The usage code could not be loaded
                          </EmptyStateTitle>
                          <EmptyStateDescription>
                            Check your connection, then try again.
                          </EmptyStateDescription>
                          <EmptyStateActions>
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={() => setSourceAttempt((value) => value + 1)}
                            >
                              Try again
                            </Button>
                          </EmptyStateActions>
                        </EmptyState>
                      ) : (
                        // Lines of skeleton stand in for the code while it loads, once it has
                        // taken a while.
                        <div className="source-loading" aria-busy="true">
                          <span className="visually-hidden" role="status">
                            Loading usage
                          </span>
                          {sourceSlow && <Skeleton lines={7} className="source-skeleton" />}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </main>

            {/* The workbench's own page has no props, so no playground. */}
            {component && !narrow && (
              <ResizableHandle
                orientation="vertical"
                label="Resize playground"
                controls="playground"
                value={inspectorWidth}
                min={240}
                max={maxWidth}
                onValueChange={(value) => resize("inspector", value)}
                onDraggingChange={resizeDragging}
              />
            )}

            {!component ? null : narrow ? (
              <Sheet side="right" open={playgroundOpen} onOpenChange={setPlaygroundOpen}>
                <SheetContent
                  id="playground"
                  className="inspector"
                  label="Component settings"
                  finalFocus={openPlayground}
                >
                  {inspector}
                </SheetContent>
              </Sheet>
            ) : (
              <aside id="playground" className="inspector" aria-label="Component settings">
                {inspector}
              </aside>
            )}
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </SoundScope>
  );
}
