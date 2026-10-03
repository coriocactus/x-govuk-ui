import { Choices } from "x-govuk-ui";

type Props = {
  markers?: "letters" | "numbers" | "none";
  multiple?: boolean;
  shortcuts?: "page" | "form" | "none";
  /** Adds a last answer to type any other into. */
  other?: boolean;
};

export default function ChoicesExample({
  markers = "letters",
  multiple = false,
  shortcuts = "page",
  other = true,
}: Props) {
  return (
    <Choices
      name="contact"
      legend="How should we contact you about your application?"
      hint={
        markers === "none" || shortcuts === "none"
          ? undefined
          : `Press ${markers === "letters" ? "a letter" : "a number"} to choose.`
      }
      multiple={multiple}
      markers={markers}
      shortcuts={shortcuts}
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
