import { NumberField } from "@base-ui/react/number-field";
import { useState } from "react";
import { Button, ErrorMessage, Field, Hint, Label, useControlProps } from "x-govuk-ui";

type Props = { label?: string; hint?: string; errorMessage?: string };

/**
 * A field the library does not have yet, composed from Field's parts around Base UI's
 * NumberField. The Field is bound to the control's id, so its Label, Hint and ErrorMessage take
 * their ids from it, and useControlProps gives the control its descriptions.
 */
export default function FieldExample({
  label = "How many people live in your home?",
  hint = "Include yourself and any children.",
  errorMessage = "",
}: Props) {
  const [people, setPeople] = useState<number | null>(1);
  const problem = errorMessage || (people === null ? "Enter the number of people" : "");

  return (
    <Field controlId="people" hasHint={Boolean(hint)} errorMessage={problem}>
      <Label>{label}</Label>
      <Hint>{hint}</Hint>
      <ErrorMessage />
      <NumberField.Root id="people" min={1} max={20} value={people} onValueChange={setPeople}>
        <NumberField.Group className="preview-stepper">
          <NumberField.Decrement
            render={<Button variant="outline" size="icon" aria-label="Fewer people" />}
          >
            −
          </NumberField.Decrement>
          <PeopleInput />
          <NumberField.Increment
            render={<Button variant="outline" size="icon" aria-label="More people" />}
          >
            +
          </NumberField.Increment>
        </NumberField.Group>
      </NumberField.Root>
    </Field>
  );
}

/** The number's box, described by the field's hint and error. */
function PeopleInput() {
  const { "aria-describedby": describedBy, "aria-invalid": invalid } = useControlProps({});
  return (
    <NumberField.Input
      className="x-govuk-ui-input"
      aria-describedby={describedBy}
      aria-invalid={invalid}
    />
  );
}
