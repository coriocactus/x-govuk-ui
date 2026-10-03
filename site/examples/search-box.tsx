import { useState } from "react";
import { SearchBox } from "x-govuk-ui";

type Props = { label?: string; placeholder?: string; showLabel?: boolean };

export default function SearchBoxExample({
  label = "Search GOV.UK",
  placeholder = "",
  showLabel = false,
}: Props) {
  const [searched, setSearched] = useState<string | null>(null);
  // Nothing until a search, then what was searched for, or a prompt after an empty one.
  let message = "";
  if (searched) message = `You searched for “${searched}”.`;
  else if (searched === "") message = "Enter something to search for.";
  return (
    <>
      <SearchBox
        id="site-search"
        label={label}
        showLabel={showLabel}
        placeholder={placeholder || undefined}
        // The example searches in place. A site search goes to its action instead.
        onSearch={setSearched}
      />
      <p className="preview-message" role="status">
        {message}
      </p>
    </>
  );
}
