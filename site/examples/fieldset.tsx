import { Fieldset, Input } from "x-govuk-ui";

type Props = {
  legend?: string;
  legendSize?: "small" | "medium" | "large";
  pageHeading?: boolean;
  hint?: string;
  errorMessage?: string;
};

export default function FieldsetExample({
  legend = "What is your address?",
  legendSize = "large",
  pageHeading = false,
  hint = "",
  errorMessage = "",
}: Props) {
  return (
    <Fieldset
      id="address"
      legend={legend}
      legendSize={legendSize}
      pageHeading={pageHeading}
      hint={hint || undefined}
      errorMessage={errorMessage || undefined}
    >
      <div className="preview-stack">
        <Input label="Address line 1" autoComplete="address-line1" />
        <Input label="Address line 2 (optional)" autoComplete="address-line2" />
        <Input label="Town or city" autoComplete="address-level2" />
        <Input label="Postcode" autoComplete="postal-code" className="preview-postcode" />
      </div>
    </Fieldset>
  );
}
