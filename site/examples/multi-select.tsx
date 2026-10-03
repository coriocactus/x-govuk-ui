import { useState } from "react";
import { MultiSelect } from "x-govuk-ui";

type Props = { label?: string; hint?: string; placeholder?: string; disabled?: boolean };

const languages = [
  { value: "ar", label: "Arabic" },
  { value: "bn", label: "Bengali" },
  { value: "zh", label: "Chinese" },
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "gu", label: "Gujarati" },
  { value: "it", label: "Italian" },
  { value: "pl", label: "Polish" },
  { value: "pt", label: "Portuguese" },
  { value: "pa", label: "Punjabi" },
  { value: "ro", label: "Romanian" },
  { value: "es", label: "Spanish" },
  { value: "ta", label: "Tamil" },
  { value: "ur", label: "Urdu" },
  { value: "cy", label: "Welsh" },
];

export default function MultiSelectExample({
  label = "Which languages do you speak?",
  hint = "Choose all that apply.",
  placeholder = "Start typing a language",
  disabled = false,
}: Props) {
  const [chosen, setChosen] = useState<string[]>(["en"]);
  return (
    <>
      <MultiSelect
        id="languages"
        name="languages"
        label={label}
        hint={hint || undefined}
        placeholder={placeholder || undefined}
        items={languages}
        value={chosen}
        onValueChange={setChosen}
        disabled={disabled}
      />
      <p className="preview-message" role="status">
        {chosen.length
          ? `${chosen.length} ${chosen.length === 1 ? "language" : "languages"} chosen.`
          : ""}
      </p>
    </>
  );
}
