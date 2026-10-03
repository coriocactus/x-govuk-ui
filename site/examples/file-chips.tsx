import { useState } from "react";
import { FileChip, FileChips } from "x-govuk-ui";

type Props = { label?: string; links?: boolean; removable?: boolean };

const documents = [
  { name: "Licence fees.pdf", kind: "PDF" },
  { name: "River Wye byelaws.docx", kind: "DOCX" },
  { name: "Catch returns by river and by month, 2021 to 2025.xlsx", kind: "XLSX" },
];

export default function FileChipsExample({
  label = "Documents with this question",
  links = false,
  removable = false,
}: Props) {
  const [items, setItems] = useState(documents);
  return (
    <FileChips label={label}>
      {items.map((document) => (
        <FileChip
          key={document.name}
          name={document.name}
          kind={document.kind}
          render={links ? (props) => <a {...props} href="#documents" /> : undefined}
          onRemove={
            removable ? () => setItems((all) => all.filter((item) => item !== document)) : undefined
          }
        />
      ))}
    </FileChips>
  );
}
