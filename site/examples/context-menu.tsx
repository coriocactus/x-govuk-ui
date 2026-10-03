import { useState } from "react";
import { ContextMenu, ContextMenuTrigger, MenuContent, MenuItem, MenuSeparator } from "x-govuk-ui";

const documents = [
  { name: "passport-scan.pdf", detail: "PDF, 1.2 MB, added 3 June" },
  { name: "proof-of-address.jpg", detail: "Image, 640 KB, added 3 June" },
  { name: "floor-plan.pdf", detail: "PDF, 2.8 MB, added 5 June" },
];

export default function ContextMenuExample() {
  const [chosen, setChosen] = useState("");
  return (
    <>
      <p className="preview-hint">Right-click a document, or press and hold it.</p>
      <ul className="preview-documents">
        {documents.map((document) => (
          <li key={document.name}>
            <ContextMenu>
              <ContextMenuTrigger className="preview-document">
                <strong>{document.name}</strong>
                <span>{document.detail}</span>
              </ContextMenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => setChosen(`Open ${document.name}`)}>Open</MenuItem>
                <MenuItem onSelect={() => setChosen(`Rename ${document.name}`)}>Rename</MenuItem>
                <MenuItem onSelect={() => setChosen(`Download ${document.name}`)}>
                  Download
                </MenuItem>
                <MenuSeparator />
                <MenuItem destructive onSelect={() => setChosen(`Remove ${document.name}`)}>
                  Remove
                </MenuItem>
              </MenuContent>
            </ContextMenu>
          </li>
        ))}
      </ul>
      <p className="preview-message" role="status">
        {chosen ? `You chose ${chosen}.` : ""}
      </p>
    </>
  );
}
