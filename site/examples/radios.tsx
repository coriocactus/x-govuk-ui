import { useState } from "react";
import { Input, Radio, Radios } from "x-govuk-ui";

type Props = {
  legend?: string;
  legendSize?: "small" | "medium" | "large";
  hint?: string;
  errorMessage?: string;
  inline?: boolean;
  small?: boolean;
  disabled?: boolean;
  /** Asks for the email address or phone number once that way is chosen. */
  conditional?: boolean;
};

export default function RadiosExample({
  legend = "How would you like to be contacted?",
  legendSize = "medium",
  hint = "Select one option.",
  errorMessage = "",
  inline = false,
  small = false,
  disabled = false,
  conditional = true,
}: Props) {
  const [contact, setContact] = useState<string | null>(null);
  // GOV.UK keeps follow-up questions out of inline radios, which sit side by side.
  const ask = conditional && !inline;
  return (
    <Radios
      id="contact"
      name="contact"
      legend={legend}
      legendSize={legendSize}
      hint={hint || undefined}
      errorMessage={errorMessage || undefined}
      inline={inline}
      small={small}
      disabled={disabled}
      value={contact}
      onValueChange={setContact}
    >
      <Radio
        value="email"
        conditional={ask && <Input label="Email address" type="email" autoComplete="email" />}
      >
        Email
      </Radio>
      <Radio
        value="phone"
        conditional={ask && <Input label="Phone number" type="tel" autoComplete="tel" />}
      >
        Phone
      </Radio>
      <Radio value="post">Post</Radio>
    </Radios>
  );
}
