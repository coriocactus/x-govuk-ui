import { useState } from "react";
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
  // start with the text, and says so beneath each.
  const found: ComboboxOption[] = countries
    .filter((name) => typed.trim() && name.toLowerCase().startsWith(typed.trim().toLowerCase()))
    .map((name) => ({ value: name, label: name, description: "Starts with what you typed" }));
  return (
    <>
      <Combobox
        id="country"
        name="country"
        label={label}
        hint={hint || undefined}
        placeholder={placeholder || undefined}
        items={ownSearch ? found : countries}
        // The service's search has chosen the options already, so the field shows them all.
        filter={ownSearch ? null : undefined}
        inputValue={typed}
        onInputValueChange={setTyped}
        value={country}
        onValueChange={setCountry}
        disabled={disabled}
      />
      <p className="preview-message" role="status">
        {country ? `You chose ${country}.` : ""}
      </p>
    </>
  );
}
