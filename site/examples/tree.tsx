import { useState } from "react";
import { FileIcon, Tree, TreeItem, type TreeNode } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  hideLabel?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  choose?: "leaves" | "any";
  /** Shows how many letters are in each folder, as its badge. */
  counts?: boolean;
};

const slug = (name: string) => name.toLowerCase().replaceAll(" ", "-");

/** A folder of letters and other folders. It has a value of its own, apart from every letter's. */
const folder = (label: string, children: TreeNode[]): TreeNode => ({
  value: `${slug(label)}-folder`,
  label,
  children,
});

/** A letter, sent as its name in lower case. */
const letter = (label: string): TreeNode => ({ value: slug(label), label });

/**
 * The letters a caseworker sends about rod fishing licences, kept in folders by what they are
 * about, as GOV.UK Notify keeps its templates.
 */
const letters: TreeNode[] = [
  folder("Applications", [
    folder("Decisions", [letter("Application approved"), letter("Application refused")]),
    letter("Information needed"),
    letter("Application withdrawn"),
  ]),
  folder("Licences", [
    folder("Issued", [
      letter("Licence issued"),
      letter("Senior licence issued"),
      letter("Junior licence issued"),
    ]),
    folder("Renewals", [letter("Licence about to expire"), letter("Licence expired")]),
    letter("Replacement licence sent"),
  ]),
  folder("Payments", [
    folder("Refunds", [
      folder("Part refunds", [letter("Part refund sent"), letter("Part refund explained")]),
      letter("Refund sent"),
      letter("Refund refused"),
    ]),
    letter("Payment received"),
    letter("Payment failed"),
  ]),
];

/** How many letters are in a folder and the folders inside it, in words. */
const countOf = (node: TreeNode) => {
  const count = (each: TreeNode): number =>
    (each.children ?? []).reduce((total, child) => total + (child.children ? count(child) : 1), 0);
  const letters = count(node);
  return letters === 1 ? "1 letter" : `${letters} letters`;
};

/** A node's name, wherever it is in the tree. */
function nameOf(value: string, nodes: readonly TreeNode[] = letters): string | undefined {
  for (const node of nodes) {
    if (node.value === value) return node.label;
    const found = node.children && nameOf(value, node.children);
    if (found) return found;
  }
}

/** A folder, drawn open while its letters show. A service brings its own icons. */
const folderIcon = (open: boolean) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {open ? (
      <>
        <path d="M1.5 12.5v-9h4l1.5 1.5h6v2" />
        <path d="M1.5 12.5 3.5 7h11l-2 5.5z" />
      </>
    ) : (
      <path d="M1.5 3.5h4l1.5 1.5h7.5v7.5h-13z" />
    )}
  </svg>
);

export default function TreeExample({
  label = "Which letter do you want to send?",
  hint = "Letters are kept in folders by what they are about.",
  hideLabel = false,
  errorMessage = "",
  disabled = false,
  choose = "leaves",
  counts = true,
}: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <>
      <Tree
        id="letter"
        name="letter"
        label={label}
        hint={hint || undefined}
        hideLabel={hideLabel}
        errorMessage={errorMessage || undefined}
        disabled={disabled}
        items={letters}
        choose={choose}
        // The tree opens three deep, so users see how the folders nest.
        defaultExpanded={["licences-folder", "issued-folder"]}
        value={chosen}
        onValueChange={setChosen}
      >
        {(node, { branch, expanded }) => (
          <TreeItem
            icon={branch ? folderIcon(expanded) : <FileIcon size={16} />}
            badge={counts && branch ? countOf(node) : undefined}
          />
        )}
      </Tree>
      <p className="preview-message" role="status">
        {chosen ? `You chose ‘${nameOf(chosen)}’.` : ""}
      </p>
    </>
  );
}
