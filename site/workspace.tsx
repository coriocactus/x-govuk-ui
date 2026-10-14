import {
  placeTile,
  replaceTile,
  Tile,
  TileBar,
  TileClose,
  TileContent,
  TileControls,
  TileGrip,
  TileMaximise,
  TileMenu,
  Tiles,
  type TilesLayout,
  TileTitle,
  tileIds,
  useTilesLayout,
} from "@x-govuk-ui/belsize";
import { Chart } from "@x-govuk-ui/memetics";
import {
  type CSSProperties,
  Fragment,
  memo,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Avatar,
  AvatarGroup,
  Bubble,
  BubbleContent,
  BubbleGroup,
  Button,
  ChatInput,
  CommandMenu,
  CommandMenuContent,
  CommandMenuGroup,
  CommandMenuItem,
  CopyButton,
  DropdownMenu,
  DropdownMenuTrigger,
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateTitle,
  GroupedTable,
  type GroupedTableColumn,
  GroupedTableGroup,
  GroupedTableRow,
  Kbd,
  MenuContent,
  MenuGroup,
  MenuHeader,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MessageActions,
  MessageRating,
  MessageScroller,
  MessageScrollerItem,
  MessageSuggestion,
  MessageSuggestions,
  ResizableHandle,
  Sheet,
  SheetContent,
  Sidebar,
  SidebarContent,
  SidebarCustomise,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarItem,
  SidebarItemMenu,
  SidebarLayout,
  SidebarPageBar,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  SoundScope,
  StreamingText,
  Tag,
  type TagColour,
  ThemePicker,
  Timeline,
  TimelineItem,
  Tooltip,
  TooltipGroup,
  TooltipProvider,
  useSidebar,
  useSidebarArrangement,
  useSound,
  useTheme,
} from "x-govuk-ui";
import { useStoredState } from "../packages/core/src/stored-state";
import { BrandLockup, brandPaths } from "./brand";
import { ComposedParts, ComposedView, prefetch } from "./composition";
import { Icon, type IconName } from "./icon";
import {
  type Application,
  caseworker,
  type Licence,
  money,
  type Status,
  shortDate,
  useActivity,
  useApplications,
  useLicenceWeeks,
} from "./workspace-data";

/*
 * The workspace, a service made from the components, as a caseworker would use it. This one is the
 * casework for rod fishing licences.
 *
 * - The sidebar has the GOV/UK UI lock-up, a switcher for the workspaces to come, the parts of the
 *   work and the caseworker's own menu. Users pin, move and hide the parts for themselves.
 * - The Overview is Tiles that caseworkers arrange for themselves. It shows the week's licences in
 *   a chart, the latest activity, and the applications waiting in a grouped table.
 * - Piscine Assist, the licensing team's assistant, sits beside the work, as wide as its handle is
 *   dragged. Asked for a view of the work, it composes one from the library's parts, as JSX, which
 *   opens in a tile on the Overview and acts on the same data.
 * - The data is site/workspace-data.ts, which stands in for the service's API.
 *
 * Command-K finds any part or action. The other parts are still to come.
 */

/** The parts of the work, in the sidebar's groups. The first group has no label. */
const sections = [
  {
    label: "Main",
    items: [
      { name: "Overview", icon: "overview" },
      { name: "Applications", icon: "applications" },
      { name: "Payments", icon: "payments" },
      { name: "Activity", icon: "clock" },
    ],
  },
  {
    label: "Reports",
    items: [
      { name: "Sales", icon: "sales" },
      { name: "Performance", icon: "performance" },
    ],
  },
  {
    label: "Service",
    items: [
      { name: "Content", icon: "content" },
      { name: "Settings", icon: "settings" },
    ],
  },
] as const satisfies readonly {
  label: string;
  items: readonly { name: string; icon: IconName }[];
}[];
type Section = (typeof sections)[number]["items"][number]["name"];
const groupNames = sections.map((section) => section.label);
const entries = sections.flatMap((section) =>
  section.items.map((item) => ({ id: item.name, label: item.name, group: section.label })),
);
const itemsByName = new Map(
  sections.flatMap((section) => section.items.map((item) => [item.name, item] as const)),
);

/** The workspaces to switch between. There is one so far, and the switcher is where others go. */
const workspaces = ["Fishing licences"];

/** The caseworker signed in. */
const you = caseworker;

const licenceSeries = [
  { key: "day", label: "1 day" },
  { key: "eight", label: "8 days" },
  { key: "year", label: "12 months" },
];

const columns: GroupedTableColumn[] = [
  { id: "reference", label: "Reference", collapse: "inline" },
  { id: "type", label: "Licence", collapse: "drop" },
  { id: "fee", label: "Fee", collapse: "inline" },
  { id: "received", label: "Received", collapse: { into: "assigned" } },
  { id: "assigned", label: "Assigned to", align: "end" },
];

/** Each licence's colour, in the table and the views Piscine Assist composes. */
const licenceColours: Record<Licence, TagColour> = {
  "1 day": "green",
  "8 days": "teal",
  "12 months": "blue",
};

/** The table's groups, by the applications' status. An issued application has left the table. */
const bands: { status: Exclude<Status, "issued">; label: string; icon: IconName }[] = [
  { status: "decision", label: "Needs a decision", icon: "decided" },
  { status: "waiting", label: "Waiting for the applicant", icon: "clock" },
  { status: "ready", label: "Ready to issue", icon: "circle" },
];

/** The applications still open, which the table lists and the sidebar counts. */
const useOpenApplications = () =>
  useApplications().filter((application: Application) => application.status !== "issued");

type Message = {
  id: string;
  from: "you" | "assist";
  text: string;
  streaming?: boolean;
  stopped?: boolean;
  /** The view the reply composed, by its composition's name. */
  composition?: string;
};

/** A view Piscine Assist composed, in a tile on the Overview. */
type Composed = {
  /** The tile's id. */
  id: string;
  /** The composition's name, which is its file's in site/compositions. */
  name: string;
  title: string;
  /** When it started to be written, on `performance.now()`'s clock. */
  started: number;
};

const opening: Message[] = [
  {
    id: "m1",
    from: "you",
    text: "An applicant paid twice for the same 12-month licence. What do I do?",
  },
  {
    id: "m2",
    from: "assist",
    text: "Refund the second payment from the Payments page, and keep the first. The refund reaches their card within 5 working days, and the licence stays valid from the first payment.",
  },
];

// The questions caseworkers ask most, each with Piscine Assist's answer. A question about the
// work composes a view of it, in a tile on the Overview. Anything else gets the last answer.
const suggestions: {
  question: string;
  answer: string;
  compose?: { name: string; title: string };
}[] = [
  {
    question: "Show me Theresa May's application",
    answer:
      "Here is Theresa May's application, in a tile on the overview. Her date of birth does not match her driving licence, so check it, then issue her licence or ask her for proof of age.",
    compose: { name: "application", title: "Theresa May" },
  },
  {
    question: "What needs a decision?",
    answer:
      "These are the applications that need a decision, oldest first, in a tile on the overview. The list follows the applications, so each one leaves it as it is decided.",
    compose: { name: "decisions", title: "Needs a decision" },
  },
  {
    question: "Refund Gordon Brown's second payment",
    answer:
      "Gordon Brown paid twice for the same licence. Choose the payment to refund in the tile on the overview, and send it. The other payment pays for his licence.",
    compose: { name: "refund", title: "Refund for Gordon Brown" },
  },
  {
    question: "How are 12-month licences selling?",
    answer:
      "12-month licences have risen for 6 weeks in a row, to 460 last week, while the shorter licences fell. The tile on the overview sets them side by side.",
    compose: { name: "licences", title: "12-month licences" },
  },
  {
    question: "Which concessions need proof?",
    answer:
      "A senior concession needs a date of birth, which the application already has. A disability concession needs the applicant's Blue Badge number or their Personal Independence Payment letter. Ask for it before you issue the licence, and record which you saw.",
  },
];
const fallback =
  "Thanks. This is a demonstration, so nothing was sent to Piscine Assist. A real one would answer here.";

/** The Overview's tiles, open or not, with their titles. */
const overviewTiles = [
  { id: "licences", title: "Licences issued" },
  { id: "activity", title: "Recent activity" },
  { id: "applications", title: "Applications" },
];

/** Piscine Assist's width, which its handle changes, within these. */
const ASSIST = { min: 300, max: 560, start: 380 };
/**
 * Narrower than this, the body has no space for Piscine Assist beside the work, so it is a sheet.
 */
const BESIDE = 760;
/**
 * Narrower than this, the work has no room for a composed view in a column beside its tiles, so the
 * view goes beneath them.
 */
const COLUMN = 720;
/** The chart's plot height, which follows its tile's, within these. */
const PLOT = { min: 140, max: 520 };
/**
 * The Overview's tiles as they start, with the week's licences and the latest activity above the
 * applications waiting.
 */
const overview: TilesLayout = {
  type: "split",
  direction: "column",
  splitPercentages: [48, 52],
  children: [
    {
      type: "split",
      direction: "row",
      splitPercentages: [64, 36],
      children: ["licences", "activity"],
    },
    "applications",
  ],
};

/** Signing out leaves for the site's front page. */
const signOut = () => location.assign("/");

export function Workspace() {
  return (
    // The sidebar remembers whether it is open, and its width, in this browser.
    <SidebarProvider defaultOpen storageKey="x-govuk-ui-workspace-sidebar-state">
      <Shell />
    </SidebarProvider>
  );
}

/** Inside the SidebarProvider, so the command menu can toggle the sidebar. */
function Shell() {
  const appearance = useTheme({ storageKey: "x-govuk-ui-theme" });
  // Whether the sounds are muted, kept in this browser for every page of the site.
  const [muted, setMuted] = useStoredState("x-govuk-ui-muted", false);
  const play = useSound({ muted });
  // Turning the sounds back on plays one, so users hear that they are on.
  const wasMuted = useRef(muted);
  useEffect(() => {
    if (wasMuted.current && !muted) void play("swoosh").catch(() => {});
    wasMuted.current = muted;
  }, [muted, play]);
  const sidebar = useSidebar();
  const [workspace, setWorkspace] = useState(workspaces[0]!);
  const [current, setCurrent] = useState<Section>("Overview");
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [customising, setCustomising] = useState(false);
  const [assistOpen, setAssistOpen] = useStoredState("x-govuk-ui-workspace-assist", true);
  // The width is kept in this browser once it is chosen, and follows a drag only in memory.
  const [keptWidth, setKeptWidth] = useStoredState(
    "x-govuk-ui-workspace-assist-width",
    ASSIST.start,
  );
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const assistWidth = dragWidth ?? keptWidth;
  const [resizingAssist, setResizingAssist] = useState(false);
  const assistShow = useRef<HTMLButtonElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const work = useRef<HTMLDivElement>(null);
  const beside = useRoomFor(body, BESIDE);
  // Where it is too narrow beside the work, Piscine Assist opens over the work as a sheet. Its own
  // state is not kept, so the sheet never opens over the work by itself as the window narrows.
  const [sheetOpen, setSheetOpen] = useState(false);
  // A change of space puts the sheet away, in the render that brings the change instead of after
  // it, so the sheet never shows over the work for a frame.
  const [roomWas, setRoomWas] = useState(beside);
  if (roomWas !== beside) {
    setRoomWas(beside);
    setSheetOpen(false);
  }
  // The views Piscine Assist composed, each a tile of the Overview, which keeps their arrangement
  // with its own tiles. A composed view lasts as long as the page, so a tile kept from an earlier
  // visit that is not here now is left out.
  const [composed, setComposed] = useState<Composed[]>([]);
  const [layout, setLayout] = useTilesLayout({
    storageKey: "x-govuk-ui-workspace-overview-tiles",
    defaultValue: overview,
    ids: [...overviewTiles, ...composed].map((tile) => tile.id),
  });
  const [maximised, setMaximised] = useState<string | null>(null);
  const column = useRoomFor(work, COLUMN);
  // A view opens on the Overview, in the place of the composed view open there, so the Overview
  // keeps room for each. The earlier view stays among the tiles, to show again from a tile's menu.
  // Without one open, the view takes the Overview's right, or its foot where the work is too
  // narrow for a column beside the tiles. A maximised tile gives way, so the view is seen.
  // Composed again, a view is written again.
  const compose = (view: Composed) => {
    setCurrent("Overview");
    setMaximised((current) => (current === view.id ? current : null));
    setComposed((current) => [...current.filter((each) => each.id !== view.id), view]);
    const open = tileIds(layout);
    if (open.includes(view.id)) return;
    const shown = composed.filter((each) => open.includes(each.id)).at(-1);
    setLayout(
      shown
        ? replaceTile(layout, shown.id, view.id)
        : placeTile(
            layout,
            view.id,
            column ? { side: "right", share: 45 } : { side: "bottom", share: 50 },
          ),
    );
  };
  const chat = useAssistChat(compose);
  const openApplications = useOpenApplications().length;
  // The fish disappears as it is pressed, so its message box takes focus instead.
  const showAssist = () => {
    if (!beside) return setSheetOpen(true);
    setAssistOpen(true);
    requestAnimationFrame(() =>
      document.getElementById("workspace-assist-message")?.focus({ preventScroll: true }),
    );
  };
  // Closed, Piscine Assist slides away out of reach, and focus goes to the fish that replaces it.
  const closeAssist = () => {
    setAssistOpen(false);
    requestAnimationFrame(() => assistShow.current?.focus());
  };
  const footerRow = useRef<HTMLDivElement>(null);
  // Users pin, move and hide the parts of the work, and the arrangement is kept in this browser.
  const arranger = useSidebarArrangement({
    entries,
    groups: groupNames,
    storageKey: "x-govuk-ui-workspace-sidebar",
  });
  useEffect(() => {
    document.title = `${current} · ${workspace}`;
  }, [current, workspace]);

  const entry = (name: string) => {
    const item = itemsByName.get(name as Section)!;
    return (
      <SidebarItem
        key={name}
        icon={<Icon name={item.icon} size={18} />}
        badge={name === "Applications" ? openApplications : undefined}
        current={name === current}
        onClick={() => setCurrent(item.name)}
        action={<SidebarItemMenu arranger={arranger} id={name} />}
      >
        {name}
      </SidebarItem>
    );
  };
  const visibleGroups = arranger.arrangement.groups.filter(
    (group) => arranger.listed(group).length > 0,
  );

  return (
    <SoundScope play={play}>
      <TooltipProvider>
        <SidebarLayout className="workspace">
          <Sidebar
            label="Workspace"
            collapsible="icon"
            resizable
            defaultWidth={288}
            minWidth={240}
            maxWidth={420}
          >
            <SidebarHeader className="workspace-head">
              {/* The lock-up leads to the front page. Collapsed, its crown stands in for it. */}
              <a className="workspace-brand" href="/" aria-label="GOV/UK UI">
                <BrandLockup className="workspace-lockup" />
                <svg
                  className="workspace-crown"
                  viewBox="0 -2 64 64"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d={brandPaths.crown} />
                </svg>
              </a>
              {/* Command-K finds any part or action, beside the lock-up, as in the workbench. */}
              <Tooltip content="Find a part or an action">
                <Button
                  variant="quiet"
                  size="small"
                  className="workspace-commands"
                  aria-label="Open command menu"
                  aria-keyshortcuts="Meta+K Control+K"
                  data-sound="open"
                  onClick={() => setCommandsOpen(true)}
                >
                  <Kbd shortcut="K" />
                </Button>
              </Tooltip>
            </SidebarHeader>
            <SidebarContent>
              {/* Pinned parts come first, then each group as arranged, without those hidden. */}
              {arranger.arrangement.pinned.length > 0 && (
                <SidebarGroup label="Pinned">{arranger.arrangement.pinned.map(entry)}</SidebarGroup>
              )}
              {visibleGroups.map((group, index) => (
                <Fragment key={group}>
                  {(index > 0 || arranger.arrangement.pinned.length > 0) && <SidebarSeparator />}
                  <SidebarGroup label={group === "Main" ? undefined : group}>
                    {arranger.listed(group).map(entry)}
                  </SidebarGroup>
                </Fragment>
              ))}
            </SidebarContent>
            <SidebarFooter>
              {/* The caseworker's row opens their menu over it, where Sign out is. The menu's root
                  is outside the list, so Base UI's focus guards land beside the list, not in it.
                  The menu is placed against the footer's row, not the caseworker's, so it spans
                  from the caseworker to the sounds and the theme. The caseworker's row shrinks a
                  little while it is pressed, and a menu placed or sized by it would stay a pixel
                  out once the row is back. Collapsed to icons, the tools are gone, and the menu
                  takes its minimum width. */}
              <div ref={footerRow} className="workspace-footer-row">
                <DropdownMenu>
                  <SidebarGroup className="workspace-footer-user">
                    <DropdownMenuTrigger
                      render={
                        <SidebarItem
                          className="workspace-user"
                          icon={
                            <Avatar
                              name={you.name}
                              size="small"
                              className="workspace-user-avatar"
                            />
                          }
                          tooltip={you.name}
                        >
                          {you.name}
                        </SidebarItem>
                      }
                    />
                  </SidebarGroup>
                  <MenuContent
                    side="top"
                    align="start"
                    anchor={footerRow}
                    className="workspace-user-menu"
                  >
                    {/* The caseworker heads their own items, as the group's label, which a menu
                        may contain where a plain card is not allowed. */}
                    <MenuGroup>
                      <MenuHeader>
                        <Avatar name={you.name} size="medium" />
                        <span className="workspace-user-text">
                          <span className="workspace-user-name">{you.name}</span>
                          <span className="workspace-user-role">{you.role}</span>
                        </span>
                      </MenuHeader>
                      <MenuItem icon={<Icon name="account" />}>Account</MenuItem>
                      <MenuItem icon={<Icon name="notifications" />}>Notifications</MenuItem>
                      <MenuItem
                        icon={<Icon name="keyboard" />}
                        shortcut="⌘ K"
                        onSelect={() => setCommandsOpen(true)}
                      >
                        Commands
                      </MenuItem>
                    </MenuGroup>
                    <MenuSeparator />
                    <MenuItem
                      icon={<Icon name={appearance.theme === "light" ? "sun" : "moon"} />}
                      onSelect={() =>
                        appearance.setTheme(appearance.theme === "light" ? "dark" : "light")
                      }
                    >
                      {`Switch to ${appearance.theme === "light" ? "dark" : "light"} theme`}
                    </MenuItem>
                    <MenuItem
                      icon={<Icon name={muted ? "muted" : "sound"} />}
                      onSelect={() => setMuted(!muted)}
                    >
                      {muted ? "Unmute sounds" : "Mute sounds"}
                    </MenuItem>
                    <MenuItem icon={<Icon name="help" />}>Help</MenuItem>
                    <MenuSeparator />
                    <MenuItem icon={<Icon name="sign-out" />} destructive onSelect={signOut}>
                      Sign out
                    </MenuItem>
                  </MenuContent>
                </DropdownMenu>
                {/* The sounds and the theme sit beside the caseworker, apart from their row, so
                    the pointer on them is not on the row. Collapsed to icons, they wait in the
                    caseworker's menu and the command menu. */}
                <div className="workspace-footer-tools">
                  <TooltipGroup side="top">
                    {/* Pressing it makes no sound of its own, because it is the sounds' switch. */}
                    <Tooltip content={muted ? "Unmute sounds" : "Mute sounds"}>
                      <Button
                        variant="quiet"
                        size="small-icon"
                        aria-label="Mute sounds"
                        aria-pressed={muted}
                        data-sound="off"
                        onClick={() => setMuted(!muted)}
                      >
                        <Icon name={muted ? "muted" : "sound"} />
                      </Button>
                    </Tooltip>
                    <ThemePicker value={appearance.theme} onValueChange={appearance.setTheme} />
                  </TooltipGroup>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset render={<main />} className="workspace-main">
            <SidebarPageBar render={<header />} className="workspace-bar">
              <div className="workspace-bar-start">
                <SidebarTrigger />
                <h1>{current}</h1>
              </div>
              {/* Where other workspaces will go. For now the switcher lists this one. */}
              <div className="workspace-bar-middle">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    variant="quiet"
                    size="small"
                    className="workspace-switcher"
                    aria-label={`Workspace: ${workspace}`}
                  >
                    <span className="workspace-switcher-name">{workspace}</span>
                    <Tag colour="green" className="workspace-switcher-tag">
                      Casework
                    </Tag>
                  </DropdownMenuTrigger>
                  <MenuContent align="center">
                    <MenuRadioGroup
                      label="Workspaces"
                      value={workspace}
                      onValueChange={setWorkspace}
                    >
                      {workspaces.map((name) => (
                        <MenuRadioItem key={name} value={name}>
                          {name}
                        </MenuRadioItem>
                      ))}
                    </MenuRadioGroup>
                  </MenuContent>
                </DropdownMenu>
              </div>
              {/* While Piscine Assist is hidden, a fish brings it back. Open, it has its own cross
                  to close it, so the bar needs no button for that. Where it is too narrow beside
                  the work, the fish opens it as a sheet, and focus returns to the fish. */}
              <div className="workspace-bar-end">
                {(!beside || !assistOpen) && (
                  <Tooltip side="bottom" content="Show Piscine Assist">
                    <Button
                      ref={assistShow}
                      variant="quiet"
                      size="small-icon"
                      aria-label="Show Piscine Assist"
                      // The sheet is not in the page while it is closed, so the fish names it only
                      // while there is a pane or an open sheet to name.
                      aria-controls={beside || sheetOpen ? "workspace-assist" : undefined}
                      onClick={showAssist}
                    >
                      <Icon name="fish" />
                    </Button>
                  </Tooltip>
                )}
              </div>
            </SidebarPageBar>
            {/* Piscine Assist belongs to the workspace, not to one part of it. It stays open, with
                its conversation, from part to part, beside the work, as wide as its handle is
                dragged. It is a pane of a fixed width, not a tile, so it keeps its pixels as the
                window changes. */}
            <div
              ref={body}
              className="workspace-body"
              data-assist={beside && assistOpen ? "open" : "closed"}
              data-resizing={resizingAssist || undefined}
              style={{ "--workspace-assist-width": `${assistWidth}px` } as CSSProperties}
            >
              <div ref={work} id="workspace-work" className="workspace-work">
                {current === "Overview" ? (
                  <Overview
                    layout={layout}
                    onLayoutChange={setLayout}
                    maximised={maximised}
                    onMaximisedChange={setMaximised}
                    composed={composed}
                  />
                ) : (
                  <section className="workspace-panel workspace-coming" aria-label={current}>
                    <p className="workspace-coming-title">{current} is still to come.</p>
                    <p>
                      This part of the workspace will be built from the components, as the Overview
                      is.
                    </p>
                    <Button variant="secondary" size="small" onClick={() => setCurrent("Overview")}>
                      Back to the overview
                    </Button>
                  </section>
                )}
              </div>
              {beside ? (
                <>
                  <ResizableHandle
                    className="workspace-assist-handle"
                    label="Resize Piscine Assist"
                    controls="workspace-assist"
                    panel="after"
                    value={assistWidth}
                    min={ASSIST.min}
                    max={ASSIST.max}
                    defaultValue={ASSIST.start}
                    disabled={!assistOpen}
                    onValueChange={setDragWidth}
                    onValueCommit={(width) => {
                      setKeptWidth(width);
                      setDragWidth(null);
                    }}
                    onDraggingChange={setResizingAssist}
                  />
                  <div id="workspace-assist" className="workspace-assist-pane" inert={!assistOpen}>
                    <PiscineAssist chat={chat} onClose={closeAssist} />
                  </div>
                </>
              ) : (
                <Sheet side="right" open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetContent
                    id="workspace-assist"
                    label="Piscine Assist"
                    className="workspace-assist-sheet"
                    initialFocus={() => document.getElementById("workspace-assist-message")}
                    finalFocus={assistShow}
                  >
                    <PiscineAssist chat={chat} onClose={() => setSheetOpen(false)} />
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </SidebarInset>
          <SidebarCustomise
            arranger={arranger}
            open={customising}
            onOpenChange={setCustomising}
            labels={{
              description:
                "Choose which parts of the work the sidebar shows, and in what order. Pinned parts come first. Your choices are kept in this browser.",
            }}
          />
          <CommandMenu
            open={commandsOpen}
            onOpenChange={(open) => {
              setCommandsOpen(open);
              // Opening by shortcut has no press to answer, so the menu plays its own sound.
              if (open) void play("open").catch(() => {});
            }}
          >
            <CommandMenuContent placeholder="Search the workspace…">
              <CommandMenuGroup label="Go to">
                {sections.flatMap((section) =>
                  section.items.map((item) => (
                    <CommandMenuItem
                      key={item.name}
                      icon={<Icon name={item.icon} />}
                      onSelect={() => setCurrent(item.name)}
                    >
                      {item.name}
                    </CommandMenuItem>
                  )),
                )}
              </CommandMenuGroup>
              <CommandMenuGroup label="Workspace">
                <CommandMenuItem
                  icon={<Icon name="arrange" />}
                  keywords={["sidebar", "order", "hide", "pin", "arrange"]}
                  onSelect={() => setCustomising(true)}
                >
                  Customise the sidebar
                </CommandMenuItem>
                <CommandMenuItem
                  icon={<Icon name="fish" />}
                  keywords={["chat", "assistant", "help", "fish"]}
                  onSelect={() => (beside && assistOpen ? closeAssist() : showAssist())}
                >
                  {beside && assistOpen ? "Hide Piscine Assist" : "Show Piscine Assist"}
                </CommandMenuItem>
                <CommandMenuItem
                  icon={<Icon name="sidebar" />}
                  shortcut="⌘ B"
                  onSelect={() => sidebar.toggleSidebar()}
                >
                  {sidebar.open ? "Collapse the sidebar" : "Expand the sidebar"}
                </CommandMenuItem>
                <CommandMenuItem
                  icon={<Icon name={appearance.theme === "light" ? "sun" : "moon"} />}
                  keywords={["appearance", "theme", "dark", "light"]}
                  onSelect={() =>
                    appearance.setTheme(appearance.theme === "light" ? "dark" : "light")
                  }
                >
                  {`Switch to ${appearance.theme === "light" ? "dark" : "light"} theme`}
                </CommandMenuItem>
                <CommandMenuItem
                  icon={<Icon name={muted ? "sound" : "muted"} />}
                  onSelect={() => setMuted(!muted)}
                >
                  {muted ? "Unmute sounds" : "Mute sounds"}
                </CommandMenuItem>
              </CommandMenuGroup>
              <CommandMenuGroup label="Account">
                <CommandMenuItem icon={<Icon name="sign-out" />} onSelect={signOut}>
                  Sign out
                </CommandMenuItem>
              </CommandMenuGroup>
            </CommandMenuContent>
          </CommandMenu>
        </SidebarLayout>
      </TooltipProvider>
    </SoundScope>
  );
}

/** Whether an element has at least this many pixels of its own width, as it changes. */
function useRoomFor(element: RefObject<HTMLElement | null>, width: number) {
  const [room, setRoom] = useState(true);
  useLayoutEffect(() => {
    const target = element.current;
    if (!target) return;
    const observer = new ResizeObserver(() => setRoom(target.clientWidth >= width));
    observer.observe(target);
    return () => observer.disconnect();
  }, [element, width]);
  return room;
}

/**
 * The Overview, which is Tiles that caseworkers arrange for themselves, kept in this browser. They
 * start with the week's licences beside the latest activity, above the applications waiting, and
 * each view Piscine Assist composes joins them. The arrangement is controlled, so the empty state
 * can lay the tiles out again, and Piscine Assist can place its views. Piscine Assist's
 * conversation changes the workspace, not the Overview, so the Overview does not render again as
 * it streams.
 */
const Overview = memo(function Overview({
  layout,
  onLayoutChange: setLayout,
  maximised,
  onMaximisedChange,
  composed,
}: {
  layout: TilesLayout | null;
  onLayoutChange: (layout: TilesLayout | null) => void;
  maximised: string | null;
  onMaximisedChange: (id: string | null) => void;
  composed: Composed[];
}) {
  const applications = useOpenApplications();
  const activity = useActivity();
  return (
    <Tiles
      value={layout}
      onValueChange={setLayout}
      maximised={maximised}
      onMaximisedChange={onMaximisedChange}
      // A closed tile comes back in another's place, from that tile's Show here.
      tiles={[...overviewTiles, ...composed]}
      minSize={160}
      className="workspace-overview"
      empty={
        <EmptyState size="small">
          <EmptyStateTitle level={2}>Every tile is closed</EmptyStateTitle>
          <EmptyStateDescription>
            Set the overview out again to see the licences, the activity and the applications.
          </EmptyStateDescription>
          <EmptyStateActions>
            <Button variant="secondary" size="small" onClick={() => setLayout(overview)}>
              Set out the overview
            </Button>
          </EmptyStateActions>
        </EmptyState>
      }
      renderTile={(id) => {
        const view = composed.find((each) => each.id === id);
        if (view)
          return (
            <Tile title={view.title}>
              <TileContent scroll className="workspace-tile">
                {/* Asked for again, the view is written again. */}
                <ComposedView key={view.started} name={view.name} started={view.started} />
              </TileContent>
            </Tile>
          );
        if (id === "licences")
          return (
            <Tile title="Licences issued">
              <TileContent scroll>
                <LicencesChart />
              </TileContent>
            </Tile>
          );
        if (id === "activity")
          return (
            <Tile title="Recent activity">
              <TileContent scroll className="workspace-tile">
                <Timeline label="What the licensing team did last">
                  {activity.map((event) => (
                    <TimelineItem
                      key={event.id}
                      title={event.title}
                      by={event.by}
                      date={event.date}
                    >
                      {event.text}
                    </TimelineItem>
                  ))}
                </Timeline>
              </TileContent>
            </Tile>
          );
        return (
          // The heading shows how many applications wait, beside the title its menu and
          // dividers use.
          <Tile
            title="Applications"
            bar={
              <TileBar>
                <TileGrip>
                  <TileTitle>
                    Applications{" "}
                    <span className="workspace-applications-count">{applications.length}</span>
                  </TileTitle>
                </TileGrip>
                <TileControls>
                  <TileMenu />
                  <TileMaximise />
                  <TileClose />
                </TileControls>
              </TileBar>
            }
          >
            <TileContent scroll className="workspace-applications">
              <GroupedTable label="Applications" columns={columns}>
                {bands.map((band) => {
                  const items = applications.filter((each) => each.status === band.status);
                  if (items.length === 0) return null;
                  return (
                    <GroupedTableGroup
                      key={band.status}
                      label={band.label}
                      icon={<Icon name={band.icon} />}
                    >
                      {items.map((item) => (
                        <GroupedTableRow
                          key={item.reference}
                          title={`${item.name}: ${item.note}`}
                          cells={{
                            reference: (
                              <span className="workspace-reference">{item.reference}</span>
                            ),
                            type: (
                              <Tag variant="outline" colour={licenceColours[item.licence]}>
                                {item.licence}
                              </Tag>
                            ),
                            fee: <span className="workspace-fee">{money(item.fee)}</span>,
                            received: (
                              <span className="workspace-received">{shortDate(item.received)}</span>
                            ),
                            assigned: (
                              <AvatarGroup>
                                {item.assigned.map((name) => (
                                  <Avatar key={name} name={name} size="small" />
                                ))}
                              </AvatarGroup>
                            ),
                          }}
                        />
                      ))}
                    </GroupedTableGroup>
                  );
                })}
              </GroupedTable>
            </TileContent>
          </Tile>
        );
      }}
    />
  );
});

/**
 * The week's licences, with the chart's plot as tall as its tile allows, so dragging the tile's
 * divider sizes the chart. Its words take what they need first. Without space for the smallest
 * plot, the tile scrolls.
 */
function LicencesChart() {
  const weeks = useLicenceWeeks();
  const box = useRef<HTMLDivElement>(null);
  const [plot, setPlot] = useState(240);
  useLayoutEffect(() => {
    const element = box.current;
    const viewport = element?.closest<HTMLElement>(".x-govuk-ui-scroll-area-viewport");
    const figure = element?.querySelector<HTMLElement>(".x-govuk-ui-chart");
    const drawn = element?.querySelector<HTMLElement>(".x-govuk-ui-chart-plot");
    if (!element || !viewport || !figure || !drawn) return;
    // Everything except the plot keeps its height as the plot changes, so this resolves at once.
    const fit = () => {
      const words = element.offsetHeight - drawn.offsetHeight;
      const next = Math.round(
        Math.min(PLOT.max, Math.max(PLOT.min, viewport.clientHeight - words)),
      );
      setPlot((current) => (Math.abs(current - next) < 2 ? current : next));
    };
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    observer.observe(figure);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={box} className="workspace-tile workspace-chart">
      <Chart
        type="bar"
        stacked
        title="Yearly licences are overtaking short ones as the season ends"
        subtitle="Rod fishing licences issued each week, last 8 weeks"
        source="Source: made-up figures for this workspace"
        description="Licences for 1 day and 8 days fall from late August. Licences for 12 months rise through September, to 460 in the last week."
        data={weeks}
        category="week"
        series={licenceSeries}
        height={plot}
      />
    </div>
  );
}

/**
 * The conversation with Piscine Assist, kept by the workspace, so it lasts as the assist moves
 * between its pane and its sheet. A reply that composes a view opens it with `compose` as the
 * reply arrives.
 */
function useAssistChat(compose: (view: Composed) => void) {
  const [messages, setMessages] = useState(opening);
  const [asked, setAsked] = useState(0);
  // Waiting for a reply is a state of its own, so stopping before the reply arrives ends it.
  const [waiting, setWaiting] = useState(false);
  const streaming = messages.some((message) => message.streaming);
  const reply = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(reply.current), []);
  // The reply composes with the workspace as it is when the reply arrives, not when it was asked.
  const composeNow = useRef(compose);
  useEffect(() => {
    composeNow.current = compose;
  });

  const ask = (question: string) => {
    const suggestion = suggestions.find((each) => each.question === question);
    const view = suggestion?.compose;
    // The composition is fetched while the assist thinks, so it is ready to be written.
    if (view) prefetch(view.name);
    const id = `q${asked}`;
    setAsked(asked + 1);
    setMessages((current) => [...current, { id, from: "you", text: question }]);
    setWaiting(true);
    // The assist answers a moment later, and the answer streams in, as its view is written.
    reply.current = setTimeout(() => {
      setWaiting(false);
      setMessages((current) => [
        ...current,
        {
          id: `${id}-reply`,
          from: "assist",
          text: suggestion?.answer ?? fallback,
          streaming: true,
          composition: view?.name,
        },
      ]);
      if (view)
        composeNow.current({
          id: `composed-${view.name}`,
          name: view.name,
          title: view.title,
          started: performance.now(),
        });
    }, 700);
  };
  const done = (id: string) =>
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, streaming: false } : message)),
    );
  // Stopping before the reply arrives leaves it unwritten. Stopping as it streams keeps what is
  // shown.
  const stop = () => {
    clearTimeout(reply.current);
    setWaiting(false);
    setMessages((current) =>
      current.map((message) =>
        message.streaming ? { ...message, streaming: false, stopped: true } : message,
      ),
    );
  };
  // A question that composes a view stays, so the view can be asked for again.
  const unasked = suggestions.filter(
    (suggestion) =>
      suggestion.compose || messages.every((message) => message.text !== suggestion.question),
  );
  return { messages, waiting, streaming, ask, done, stop, unasked };
}

/**
 * A chat with Piscine Assist, the licensing team's assistant, like the Message scroller example's.
 * Hidden, it is out of reach as well as out of sight, and keeps its conversation.
 */
function PiscineAssist({
  chat,
  onClose,
}: {
  chat: ReturnType<typeof useAssistChat>;
  onClose: () => void;
}) {
  const { messages, waiting, streaming, ask, done, stop, unasked } = chat;
  return (
    <aside className="workspace-panel workspace-assist" aria-labelledby="workspace-assist-title">
      <header className="workspace-assist-header">
        <h2 id="workspace-assist-title">Piscine Assist</h2>
        <Tooltip content="Close">
          <Button
            variant="quiet"
            size="small-icon"
            aria-label="Close Piscine Assist"
            onClick={onClose}
          >
            <Icon name="close" />
          </Button>
        </Tooltip>
      </header>
      <MessageScroller
        label="Messages with Piscine Assist"
        framed={false}
        busy={streaming}
        className="workspace-assist-log"
        footer={
          <ChatInput
            id="workspace-assist-message"
            label="Message Piscine Assist"
            placeholder="Ask a question…"
            busy={waiting || streaming}
            onStop={stop}
            onSubmit={(text) => {
              if (text.trim()) ask(text.trim());
            }}
            maxRows={4}
            layout="inline"
          />
        }
      >
        {messages.map((message) => (
          <MessageScrollerItem key={message.id} id={message.id} anchor={message.from === "you"}>
            <BubbleGroup>
              <Bubble
                variant={message.from === "you" ? "default" : "secondary"}
                align={message.from === "you" ? "end" : "start"}
              >
                <BubbleContent>
                  {message.streaming || message.stopped ? (
                    <StreamingText
                      text={message.text}
                      stopped={message.stopped}
                      onComplete={() => done(message.id)}
                    />
                  ) : (
                    message.text
                  )}
                  {message.composition && !message.streaming && (
                    <ComposedParts name={message.composition} />
                  )}
                </BubbleContent>
              </Bubble>
            </BubbleGroup>
            {message.from === "assist" && !message.streaming && (
              <MessageActions className="workspace-assist-tools">
                <CopyButton text={message.text} />
                <MessageRating />
              </MessageActions>
            )}
          </MessageScrollerItem>
        ))}
        {unasked.length > 0 && !waiting && !streaming && (
          <MessageScrollerItem id="suggestions">
            <MessageSuggestions>
              {unasked.map(({ question }) => (
                <MessageSuggestion key={question} onClick={() => ask(question)}>
                  {question}
                </MessageSuggestion>
              ))}
            </MessageSuggestions>
          </MessageScrollerItem>
        )}
      </MessageScroller>
    </aside>
  );
}
