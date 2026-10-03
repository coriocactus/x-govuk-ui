import { useState } from "react";
import { Combobox } from "x-govuk-ui";

type Props = { label?: string; hint?: string; placeholder?: string; disabled?: boolean };

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
}: Props) {
  const [country, setCountry] = useState<string | null>(null);
  return (
    <>
      <Combobox
        id="country"
        name="country"
        label={label}
        hint={hint || undefined}
        placeholder={placeholder || undefined}
        items={countries}
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
