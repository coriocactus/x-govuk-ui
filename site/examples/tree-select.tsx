import { useState } from "react";
import { type TreeNode, TreeSelect } from "x-govuk-ui";
import { organisations } from "./organisations";

type Props = {
  label?: string;
  hint?: string;
  hideLabel?: boolean;
  placeholder?: string;
  errorMessage?: string;
  disabled?: boolean;
};

/** Finds an organisation by its name, or by the start of its abbreviation, such as APHA. */
const byNameOrAbbreviation = (search: string, node: TreeNode) => {
  const wanted = search.trim().toLowerCase();
  return (
    node.label.toLowerCase().includes(wanted) ||
    Boolean(node.description?.toLowerCase().startsWith(wanted))
  );
};

/** An organisation's name, wherever it is in the tree. */
function nameOf(value: string, nodes: readonly TreeNode[] = organisations): string | undefined {
  for (const node of nodes) {
    if (node.value === value) return node.label;
    const found = node.children && nameOf(value, node.children);
    if (found) return found;
  }
}

export default function TreeSelectExample({
  label = "Which organisation do you work for?",
  hint = "Agencies and public bodies are listed under the department that sponsors them.",
  hideLabel = false,
  placeholder = "Choose an organisation",
  errorMessage = "",
  disabled = false,
}: Props) {
  const [organisation, setOrganisation] = useState<string | null>(null);
  return (
    <>
      <TreeSelect
        id="organisation"
        name="organisation"
        label={label}
        hint={hint || undefined}
        hideLabel={hideLabel}
        placeholder={placeholder || undefined}
        errorMessage={errorMessage || undefined}
        disabled={disabled}
        items={organisations}
        filter={byNameOrAbbreviation}
        value={organisation}
        onValueChange={setOrganisation}
      />
      <p className="preview-message" role="status">
        {organisation ? `You chose ${nameOf(organisation)}.` : ""}
      </p>
    </>
  );
}
