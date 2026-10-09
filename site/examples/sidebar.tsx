import { Fragment, type ReactNode, useState } from "react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  Kbd,
  MenuContent,
  MenuLinkItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
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
  type SidebarProps,
  SidebarProvider,
  SidebarSeparator,
  SidebarSkeleton,
  SidebarSubmenu,
  SidebarTrigger,
  useSidebarArrangement,
} from "x-govuk-ui";

type Props = Pick<
  SidebarProps,
  | "side"
  | "variant"
  | "collapsible"
  | "collapsedTrigger"
  | "resizable"
  | "minWidth"
  | "maxWidth"
  | "activeLine"
  | "animations"
> & {
  /** A SidebarProvider prop. */
  defaultOpen?: boolean;
  /** How the example lays out its groups. */
  sections?: "grouped" | "collapsible" | "off";
  /** Which optional parts the example shows. */
  show?: ("separators" | "badges" | "icons" | "submenus" | "footer" | "menus")[];
  /** Shows skeleton rows, as while the items load. */
  loading?: boolean;
  /** Sets the header on GOV.UK's black, as an inverse part of the page. */
  inverse?: boolean;
};

const icon = (path: string) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
);

type Section = {
  label?: string;
  icon?: ReactNode;
  items: { name: string; icon: ReactNode; badge?: number; children?: string[] }[];
};

const sections: Section[] = [
  {
    items: [
      { name: "Overview", icon: icon("M4 11 12 4l8 7M6 9.5V20h12V9.5") },
      {
        name: "Applications",
        icon: icon("M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"),
        badge: 3,
        children: ["In progress", "Submitted", "Decisions"],
      },
      { name: "Payments", icon: icon("M3 6h18v12H3zM3 10h18M7 15h4") },
      { name: "Messages", icon: icon("M3 6h18v12H3zM3 7l9 6 9-6"), badge: 2 },
    ],
  },
  {
    label: "Your account",
    icon: icon("M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0"),
    items: [
      { name: "Personal details", icon: icon("M3 5h18v14H3zM7 15h4M7 11h6M15 9h3") },
      { name: "Security", icon: icon("M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3") },
      { name: "Notifications", icon: icon("M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0") },
    ],
  },
  {
    label: "Help",
    icon: icon(
      "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.8-2.4 2.3-2.4 3.8M12 17h.01",
    ),
    items: [
      {
        name: "Guidance",
        icon: icon("M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"),
      },
      { name: "Contact us", icon: icon("M3 6h18v12H3zM3 7l9 6 9-6") },
    ],
  },
];

const services = ["Apply for a licence", "Renew a licence", "Report a change"];

/**
 * The items, for users to pin, move and hide, each in its section, with the first section
 * untitled.
 */
const entries = sections.flatMap((section) =>
  section.items.map((item) => ({
    id: item.name,
    label: item.name,
    group: section.label ?? "Main",
  })),
);
const itemsByName = new Map(
  sections.flatMap((section) => section.items.map((item) => [item.name, item])),
);

export default function SidebarExample({
  defaultOpen = true,
  side = "left",
  variant = "sidebar",
  collapsible = "icon",
  collapsedTrigger = true,
  resizable = false,
  minWidth = 200,
  maxWidth = 360,
  activeLine = true,
  animations,
  sections: layout = "grouped",
  show = ["separators", "badges", "icons", "submenus", "footer", "menus"],
  loading = false,
  inverse = false,
}: Props) {
  const [current, setCurrent] = useState("Overview");
  const [service, setService] = useState(services[0]);
  // With item menus, users pin, move and hide the items, and arrange the whole sidebar in a sheet.
  const menus = show.includes("menus");
  const arranger = useSidebarArrangement({ entries });
  const [customising, setCustomising] = useState(false);
  const arranged: Section[] = menus
    ? [
        ...(arranger.arrangement.pinned.length > 0
          ? [
              {
                label: "Pinned",
                items: arranger.arrangement.pinned.map((id) => itemsByName.get(id)!),
              },
            ]
          : []),
        ...arranger.arrangement.groups.map((group) => ({
          ...sections.find((section) => (section.label ?? "Main") === group),
          label: group === "Main" ? undefined : group,
          items: arranger.listed(group).map((id) => itemsByName.get(id)!),
        })),
      ].filter((section) => section.items.length > 0)
    : sections;
  const page = (
    <div className="preview-app-page">
      <p>
        Press the sidebar button, or <Kbd shortcut="B" />, to collapse the sidebar.
      </p>
      {menus && (
        <>
          <Button variant="secondary" size="small" onClick={() => setCustomising(true)}>
            Customise the sidebar
          </Button>
          <SidebarCustomise arranger={arranger} open={customising} onOpenChange={setCustomising} />
        </>
      )}
    </div>
  );

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SidebarLayout className="preview-app" data-side={side}>
        <Sidebar
          label="Account"
          side={side}
          variant={variant}
          collapsible={collapsible}
          collapsedTrigger={collapsedTrigger}
          resizable={resizable}
          minWidth={minWidth}
          maxWidth={maxWidth}
          defaultWidth={240}
          activeLine={activeLine}
          animations={animations}
        >
          <SidebarHeader data-theme={inverse ? "inverse" : undefined}>
            <SidebarTrigger />
            {/* The service switcher is a Dropdown menu. */}
            <DropdownMenu>
              <DropdownMenuTrigger variant="quiet" size="small" className="preview-app-switcher">
                <span className="preview-app-name">{service}</span>
              </DropdownMenuTrigger>
              <MenuContent>
                <MenuRadioGroup label="Your services" value={service} onValueChange={setService}>
                  {services.map((name) => (
                    <MenuRadioItem key={name} value={name}>
                      {name}
                    </MenuRadioItem>
                  ))}
                </MenuRadioGroup>
                <MenuSeparator />
                <MenuLinkItem href="#services">Find another service</MenuLinkItem>
              </MenuContent>
            </DropdownMenu>
          </SidebarHeader>
          <SidebarContent>
            {loading && (
              <>
                <span className="x-govuk-ui-visually-hidden" role="status">
                  Loading the menu
                </span>
                <SidebarSkeleton rows={7} icons={show.includes("icons")} />
              </>
            )}
            {!loading &&
              arranged.map((section, index) => (
                <Fragment key={section.label ?? "main"}>
                  {index > 0 && show.includes("separators") && <SidebarSeparator />}
                  <SidebarGroup
                    label={layout === "off" ? undefined : section.label}
                    icon={section.icon}
                    collapsible={layout === "collapsible"}
                  >
                    {section.items.map((item) =>
                      item.children && show.includes("submenus") ? (
                        <SidebarSubmenu
                          key={item.name}
                          label={item.name}
                          icon={show.includes("icons") ? item.icon : undefined}
                        >
                          {item.children.map((child) => (
                            <SidebarItem
                              key={child}
                              isActive={child === current}
                              onClick={() => setCurrent(child)}
                            >
                              {child}
                            </SidebarItem>
                          ))}
                        </SidebarSubmenu>
                      ) : (
                        <SidebarItem
                          key={item.name}
                          icon={show.includes("icons") ? item.icon : undefined}
                          badge={show.includes("badges") ? item.badge : undefined}
                          isActive={item.name === current}
                          onClick={() => setCurrent(item.name)}
                          action={
                            menus ? (
                              <SidebarItemMenu arranger={arranger} id={item.name} />
                            ) : undefined
                          }
                        >
                          {item.name}
                        </SidebarItem>
                      ),
                    )}
                  </SidebarGroup>
                </Fragment>
              ))}
          </SidebarContent>
          {show.includes("footer") && (
            <SidebarFooter>
              <SidebarGroup>
                <SidebarItem icon={icon("M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10")}>
                  Sign out
                </SidebarItem>
              </SidebarGroup>
            </SidebarFooter>
          )}
        </Sidebar>
        <SidebarInset>
          <SidebarPageBar>
            <h2 className="preview-app-title">{current}</h2>
          </SidebarPageBar>
          {page}
        </SidebarInset>
      </SidebarLayout>
    </SidebarProvider>
  );
}
