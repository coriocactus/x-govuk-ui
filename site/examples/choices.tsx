import { Choices } from "x-govuk-ui";

type Props = {
  markers?: "letters" | "numbers" | "none";
  multiple?: boolean;
  shortcutScope?: "page" | "form" | "none";
  /** Adds a last answer to type any other into. */
  other?: boolean;
};

export default function ChoicesExample({
  markers = "letters",
  multiple = false,
  shortcutScope = "page",
  other = true,
}: Props) {
  return (
    <Choices
      name="contact"
      legend="How should we contact you about your application?"
      hint={
        markers === "none" || shortcutScope === "none"
          ? undefined
          : `Press ${markers === "letters" ? "a letter" : "a number"} to choose.`
      }
      multiple={multiple}
      markers={markers}
      shortcutScope={shortcutScope}
      other={other ? "Another way…" : undefined}
      options={[
        { value: "email", label: "Email" },
        { value: "text", label: "Text message", hint: "To the mobile number you gave us" },
        { value: "phone", label: "Phone call" },
        { value: "post", label: "Post" },
      ]}
    />
  );
}
