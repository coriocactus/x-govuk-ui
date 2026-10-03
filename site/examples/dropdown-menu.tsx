import { type ReactNode, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSubmenu,
} from "x-govuk-ui";

type Props = {
  /** Shows an icon beside each action. */
  icons?: boolean;
  /** Shows the shortcut for Edit and Duplicate. */
  shortcuts?: boolean;
};

const icon = (path: string): ReactNode => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d={path} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const icons = {
  view: icon("M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"),
  edit: icon("M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4"),
  duplicate: icon("M8 8h12v12H8zM16 8V4H4v12h4"),
  download: icon("M12 4v11m0 0-4-4m4 4 4-4M5 20h14"),
  withdraw: icon("M5 7h14M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"),
};

export default function DropdownMenuExample({ icons: showIcons = true, shortcuts = true }: Props) {
  const [chosen, setChosen] = useState("");
  const [notify, setNotify] = useState(true);
  const action = (name: string) => () => setChosen(name);
  const show = (name: keyof typeof icons) => (showIcons ? icons[name] : undefined);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>Application actions</DropdownMenuTrigger>
        <MenuContent>
          <MenuItem icon={show("view")} onSelect={action("View")}>
            View application
          </MenuItem>
          <MenuItem
            icon={show("edit")}
            shortcut={shortcuts ? "⌘ E" : undefined}
            onSelect={action("Edit")}
          >
            Edit answers
          </MenuItem>
          <MenuItem
            icon={show("duplicate")}
            shortcut={shortcuts ? "⌘ D" : undefined}
            onSelect={action("Duplicate")}
          >
            Duplicate
          </MenuItem>
          <MenuSubmenu label="Download" icon={show("download")}>
            <MenuItem onSelect={action("Download as PDF")}>PDF</MenuItem>
            <MenuItem onSelect={action("Download as a spreadsheet")}>Spreadsheet (CSV)</MenuItem>
            <MenuItem onSelect={action("Download as a Word document")}>Word document</MenuItem>
          </MenuSubmenu>
          <MenuSeparator />
          <MenuCheckboxItem checked={notify} onCheckedChange={setNotify}>
            Email me about changes
          </MenuCheckboxItem>
          <MenuSeparator />
          <MenuItem icon={show("withdraw")} destructive onSelect={action("Withdraw")}>
            Withdraw application
          </MenuItem>
        </MenuContent>
      </DropdownMenu>
      <p className="preview-message" role="status">
        {chosen ? `You chose ${chosen}.` : ""}
      </p>
    </>
  );
}
