import { NumberField } from "@base-ui/react/number-field";
import { useState } from "react";
import { Button, ErrorMessage, Field, Hint, Label, useField } from "x-govuk-ui";

type Props = { label?: string; hint?: string; errorMessage?: string };

/**
 * A field the library does not have yet, built from the Field parts around Base UI's NumberField.
 * useField gives the control its id and descriptions, as Input's own field does.
 */
export default function FieldExample({
  label = "How many people live in your home?",
  hint = "Include yourself and any children.",
  errorMessage = "",
}: Props) {
  const [people, setPeople] = useState<number | null>(1);
  const problem = errorMessage || (people === null ? "Enter the number of people" : "");
  const field = useField({ id: "people", hint, errorMessage: problem });

  return (
    <Field invalid={field.invalid}>
      <Label htmlFor={field.id}>{label}</Label>
      <Hint id={field.hintId}>{hint}</Hint>
      <ErrorMessage id={field.errorId}>{problem}</ErrorMessage>
      <NumberField.Root id={field.id} min={1} max={20} value={people} onValueChange={setPeople}>
        <NumberField.Group className="preview-stepper">
          <NumberField.Decrement
            render={<Button variant="outline" size="icon" aria-label="Fewer people" />}
          >
            −
          </NumberField.Decrement>
          <NumberField.Input
            className="x-govuk-ui-input"
            aria-describedby={field.controlProps["aria-describedby"]}
            aria-invalid={field.controlProps["aria-invalid"]}
          />
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
