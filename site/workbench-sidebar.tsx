import type { MouseEvent } from "react";
import {
  Button,
  Kbd,
  Sidebar,
  type SidebarArranger,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarItemMenu,
  SidebarTrigger,
  Tag,
  Tooltip,
  useSidebar,
} from "x-govuk-ui";
import { BrandLockup } from "./brand";
import { type ComponentName, catalogue } from "./catalogue";
import { Icon } from "./icon";

/**
 * The Experimental tag as a flask, as tall as a badge, for an experimental component's row in the
 * sidebar and in Customise the sidebar. Screen readers hear "Experimental".
 */
export function ExperimentalMark() {
  return (
    <Tag colour="orange" className="sidebar-experimental">
      <Icon name="flask" size={14} />
      <span className="x-govuk-ui-visually-hidden">Experimental</span>
    </Tag>
  );
}

/** A plain click navigates within the workbench. Modified clicks keep the browser's behaviour. */
export function opensInPlace(event: MouseEvent) {
  return !(event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}

export function WorkbenchSidebar({
  name,
  onNavigate,
  onOpenCommands,
  arranger,
}: {
  /** The component showing, or none on the workbench's own page. */
  name: ComponentName | null;
  onNavigate: (name: ComponentName) => void;
  /** Opens the command menu, which finds any component or action. */
  onOpenCommands: () => void;
  /** How the sidebar is arranged, with the user's own pins, hidden entries and order. */
  arranger: SidebarArranger;
}) {
  const sidebar = useSidebar();
  const { arrangement } = arranger;
  // Each entry has its own menu, at the end of its row, to pin, move or hide it.
  const entry = (key: string) => (
    <SidebarItem
      key={key}
      isActive={key === name}
      action={<SidebarItemMenu arranger={arranger} id={key} />}
      // An experimental component has the Experimental tag at the row's end, as a flask.
      badge={catalogue[key as ComponentName].experimental ? <ExperimentalMark /> : undefined}
      render={
        <a
          href={`/workbench/${key}`}
          onClick={(event) => {
            if (!opensInPlace(event)) return;
            event.preventDefault();
            onNavigate(key as ComponentName);
          }}
        />
      }
    >
      {catalogue[key as ComponentName].name}
    </SidebarItem>
  );

  return (
    <Sidebar
      label="Workbench"
      className="workbench-sidebar"
      collapsible="offcanvas"
      // The preview toolbar has its own trigger.
      collapsedTrigger={false}
      resizable
      defaultWidth={256}
      minWidth={240}
      maxWidth={360}
    >
      <SidebarHeader>
        {/* The brand leads to the site's front page. */}
        <a className="brand" href="/" aria-label="GOV/UK UI">
          <BrandLockup />
        </a>
        {/* Command-K finds any component or action. Small screens rarely have a keyboard, so the
            menu button replaces its shortcut there. */}
        {sidebar.isMobile ? (
          <SidebarTrigger />
        ) : (
          <Tooltip content="Find a component or action">
            <Button
              variant="quiet"
              size="small"
              className="brand-commands"
              aria-label="Open command menu"
              aria-keyshortcuts="Meta+K Control+K"
              data-sound="open"
              onClick={onOpenCommands}
            >
              <Kbd shortcut="K" />
            </Button>
          </Tooltip>
        )}
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Components">
          {/* Pinned components come first, then each group in the chosen order, without those
              hidden. */}
          {arrangement.pinned.length > 0 && (
            <SidebarGroup label="Pinned">{arrangement.pinned.map(entry)}</SidebarGroup>
          )}
          {arrangement.groups.map(
            (group) =>
              arranger.listed(group).length > 0 && (
                <SidebarGroup key={group} label={group}>
                  {arranger.listed(group).map(entry)}
                </SidebarGroup>
              ),
          )}
        </nav>
      </SidebarContent>
      <SidebarFooter className="sidebar-links">
        <a href="https://design-system.service.gov.uk/" target="_blank" rel="noreferrer">
          GOV.UK Design System <Icon name="external" size={13} />
        </a>
        <a href="https://github.com/alphagov/govuk-frontend" target="_blank" rel="noreferrer">
          GOV.UK Frontend <Icon name="external" size={13} />
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
