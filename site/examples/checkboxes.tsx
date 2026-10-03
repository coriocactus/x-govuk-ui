import { useState } from "react";
import { Checkbox, Checkboxes, ChoiceDivider, Input } from "x-govuk-ui";

type Props = {
  legend?: string;
  legendSize?: "small" | "medium" | "large";
  hint?: string;
  errorMessage?: string;
  small?: boolean;
  disabled?: boolean;
  /** Adds "None of these", which clears the other answers. */
  exclusive?: boolean;
  /** Asks a follow-up question when farm waste is chosen. */
  conditional?: boolean;
};

export default function CheckboxesExample({
  legend = "Which types of waste do you transport?",
  legendSize = "medium",
  hint = "Select all that apply.",
  errorMessage = "",
  small = false,
  disabled = false,
  exclusive = true,
  conditional = true,
}: Props) {
  const [waste, setWaste] = useState<string[]>([]);
  return (
    <Checkboxes
      id="waste"
      name="waste"
      legend={legend}
      legendSize={legendSize}
      hint={hint || undefined}
      errorMessage={errorMessage || undefined}
      small={small}
      disabled={disabled}
      value={waste}
      onValueChange={setWaste}
    >
      <Checkbox value="carcasses">Waste from animal carcasses</Checkbox>
      <Checkbox value="mines">Waste from mines or quarries</Checkbox>
      <Checkbox
        value="farm"
        hint="Including slurry and manure."
        conditional={conditional && <Input label="Farm name" name="farm-name" autoComplete="off" />}
      >
        Farm or agricultural waste
      </Checkbox>
      {exclusive && <ChoiceDivider />}
      {exclusive && (
        <Checkbox value="none" exclusive>
          None of these
        </Checkbox>
      )}
    </Checkboxes>
  );
}
