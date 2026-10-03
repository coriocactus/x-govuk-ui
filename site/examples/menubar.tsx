import { useState } from "react";
import {
  DropdownMenu,
  Menubar,
  MenubarTrigger,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSubmenu,
} from "x-govuk-ui";

export default function MenubarExample() {
  const [chosen, setChosen] = useState("");
  const [ruler, setRuler] = useState(true);
  const [zoom, setZoom] = useState("100");
  const run = (name: string) => () => setChosen(`You chose ${name}.`);
  return (
    <div className="preview-menubar">
      <Menubar aria-label="Document">
        <DropdownMenu>
          <MenubarTrigger>File</MenubarTrigger>
          <MenuContent>
            <MenuItem onSelect={run("New")} shortcut="⌘ N">
              New
            </MenuItem>
            <MenuItem onSelect={run("Open")} shortcut="⌘ O">
              Open
            </MenuItem>
            <MenuItem onSelect={run("Save")} shortcut="⌘ S">
              Save
            </MenuItem>
            <MenuSeparator />
            <MenuSubmenu label="Export">
              <MenuItem onSelect={run("Export as PDF")}>PDF</MenuItem>
              <MenuItem onSelect={run("Export as ODT")}>OpenDocument</MenuItem>
            </MenuSubmenu>
          </MenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <MenubarTrigger>Edit</MenubarTrigger>
          <MenuContent>
            <MenuItem onSelect={run("Undo")} shortcut="⌘ Z">
              Undo
            </MenuItem>
            <MenuItem onSelect={run("Redo")} shortcut="⇧ ⌘ Z">
              Redo
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={run("Copy")} shortcut="⌘ C">
              Copy
            </MenuItem>
            <MenuItem onSelect={run("Paste")} shortcut="⌘ V">
              Paste
            </MenuItem>
          </MenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenuContent>
            <MenuCheckboxItem checked={ruler} onCheckedChange={setRuler}>
              Show the ruler
            </MenuCheckboxItem>
            <MenuSeparator />
            <MenuRadioGroup label="Zoom" value={zoom} onValueChange={setZoom}>
              <MenuRadioItem value="75">75%</MenuRadioItem>
              <MenuRadioItem value="100">100%</MenuRadioItem>
              <MenuRadioItem value="150">150%</MenuRadioItem>
            </MenuRadioGroup>
          </MenuContent>
        </DropdownMenu>
      </Menubar>
      <p className="preview-message" role="status">
        {chosen}
      </p>
    </div>
  );
}
