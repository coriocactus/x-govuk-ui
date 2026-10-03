import { Kbd } from "x-govuk-ui";

// A shortcut held with Command or Control shows this device's key, ⌘ on a Mac or Ctrl elsewhere.
const shortcuts = [
  ["Open the command menu", { shortcut: "K" }],
  ["Save your progress", { shortcut: "S" }],
  ["Collapse or expand the sidebar", { shortcut: "B" }],
  ["Close a menu or dialog", { children: "Esc" }],
] as const;

export default function KbdExample({ outline = false }: { outline?: boolean }) {
  return (
    <dl className="preview-shortcuts">
      {shortcuts.map(([action, keys]) => (
        <div key={action}>
          <dt>{action}</dt>
          <dd>
            <Kbd variant={outline ? "outline" : "subtle"} {...keys} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
