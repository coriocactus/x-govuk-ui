import { useMemo, useState } from "react";
import { Combobox, type ComboboxOption } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Shows the countries a search of the service's own finds, as a server would. */
  ownSearch?: boolean;
};

const countries = [
  "Australia",
  "Austria",
  "Belgium",
  "Brazil",
  "Canada",
  "China",
  "Denmark",
  "France",
  "Germany",
  "Greece",
  "India",
  "Ireland",
  "Italy",
  "Japan",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Poland",
  "Portugal",
  "South Africa",
  "Spain",
  "Sweden",
  "Switzerland",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
];

/** The code a country is sent under, as a server's own key for it. */
const codeOf = (name: string) => name.toLowerCase().replaceAll(" ", "-");

export default function ComboboxExample({
  label = "Which country do you live in?",
  hint = "Start typing, then choose from the list.",
  placeholder = "",
  disabled = false,
  ownSearch = false,
}: Props) {
  const [country, setCountry] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  // A search of the service's own, as a server would answer it. It finds the countries whose names
  // start with the text, and says so beneath each. Each answer is sent under a code, as a server's
  // would be, and the results stay the same array until the text changes.
  const found = useMemo<ComboboxOption[]>(
    () =>
      countries
        .filter((name) => typed.trim() && name.toLowerCase().startsWith(typed.trim().toLowerCase()))
        .map((name) => ({
          value: codeOf(name),
          label: name,
          description: "Starts with what you typed",
        })),
    [typed],
  );
  const chosen = countries.find((name) => country === name || country === codeOf(name));
  return (
    <>
      <Combobox
        id="country"
        name="country"
        label={label}
        hint={hint || undefined}
        placeholder={placeholder || undefined}
        items={ownSearch ? found : countries}
        // The service's search has chosen the options already, so the field shows them all. The
        // field keeps its own text, and tells the search each change.
        filter={ownSearch ? null : undefined}
        onInputValueChange={setTyped}
        value={country}
        onValueChange={setCountry}
        disabled={disabled}
      />
      <p className="preview-message" role="status">
        {chosen ? `You chose ${chosen}.` : ""}
      </p>
    </>
  );
}
