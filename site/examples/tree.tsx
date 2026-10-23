import { useState } from "react";
import { Tree, TreeItem, type TreeNode } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  hideLabel?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  /** Shows how many rivers each district has, as each district's badge. */
  counts?: boolean;
};

const slug = (name: string) => name.toLowerCase().replaceAll(" ", "-");

/**
 * A river basin district, with the rivers in it. Each river is sent as its name in lower case. A
 * district has a value of its own, apart from the river it may be named after, such as the Dee.
 */
const district = (label: string, names: string[]): TreeNode => ({
  value: `${slug(label)}-district`,
  label,
  children: names.map((name) => ({ value: slug(name), label: name })),
});

/**
 * England's river basin districts, as the Environment Agency manages them, with some of their
 * rivers.
 */
const rivers: TreeNode[] = [
  district("Anglian", ["Great Ouse", "Nene", "Welland", "Wensum", "Witham", "Yare"]),
  district("Dee", ["Dee"]),
  district("Humber", ["Aire", "Don", "Ouse", "Swale", "Trent", "Ure", "Wharfe"]),
  district("North West", ["Kent", "Lune", "Mersey", "Ribble", "Wyre"]),
  district("Northumbria", ["Aln", "Coquet", "Tees", "Tyne", "Wear"]),
  district("Severn", ["Severn", "Teme", "Usk", "Warwickshire Avon", "Wye"]),
  district("Solway Tweed", ["Eden", "Tweed"]),
  district("South East", ["Adur", "Arun", "Itchen", "Medway", "Test"]),
  district("South West", ["Camel", "Dart", "Exe", "Fowey", "Tamar", "Taw", "Torridge"]),
  district("Thames", ["Cherwell", "Colne", "Kennet", "Lea", "Loddon", "Mole", "Thames", "Wey"]),
];

/** How many rivers a district has, in words. */
const countOf = (district: TreeNode) => {
  const count = district.children?.length ?? 0;
  return count === 1 ? "1 river" : `${count} rivers`;
};

export default function TreeExample({
  label = "Which river did you fish?",
  hint = "Rivers are listed under the river basin district they flow through.",
  hideLabel = false,
  errorMessage = "",
  disabled = false,
  counts = true,
}: Props) {
  const [river, setRiver] = useState<string | null>(null);
  const chosen = rivers.flatMap((each) => each.children ?? []).find((each) => each.value === river);
  return (
    <>
      <Tree
        id="river"
        name="river"
        label={label}
        hint={hint || undefined}
        hideLabel={hideLabel}
        errorMessage={errorMessage || undefined}
        disabled={disabled}
        items={rivers}
        // A district is a heading for its rivers, so pressing it opens it.
        choose="leaves"
        value={river}
        onValueChange={setRiver}
      >
        {(node, { branch }) => <TreeItem badge={counts && branch ? countOf(node) : undefined} />}
      </Tree>
      <p className="preview-message" role="status">
        {chosen ? `You chose the ${chosen.label}.` : ""}
      </p>
    </>
  );
}
