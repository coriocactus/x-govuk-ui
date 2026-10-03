import { useEffect, useState } from "react";
import { Button, Textarea } from "x-govuk-ui";

export default function TextareaExample({
  label = "Can you provide more detail?",
  hint = "Do not include personal or financial information, like your National Insurance number or credit card details.",
  hideLabel = false,
  placeholder = "For example, what happened and when it started",
  rows = 5,
  resize = "both",
  autoResize = false,
  errorMessage = "",
  disabled = false,
  characterLimit = 200,
}: {
  label?: string;
  hint?: string;
  hideLabel?: boolean;
  placeholder?: string;
  rows?: number;
  resize?: "both" | "vertical" | "horizontal" | "none";
  autoResize?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  /** 0 leaves the count out. */
  characterLimit?: number;
}) {
  const [detail, setDetail] = useState("");
  const [problem, setProblem] = useState(errorMessage);
  const [status, setStatus] = useState("");
  useEffect(() => setProblem(errorMessage), [errorMessage]);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!detail.trim()) {
          setProblem("Enter more detail.");
          setStatus("");
          return;
        }
        if (characterLimit && detail.length > characterLimit) {
          setProblem(`Your answer must be ${characterLimit} characters or fewer.`);
          setStatus("");
          return;
        }
        setProblem("");
        setStatus("Thank you. No information was sent.");
      }}
    >
      <Textarea
        id="more-detail"
        name="more-detail"
        label={label}
        hint={hint || undefined}
        hideLabel={hideLabel}
        placeholder={placeholder || undefined}
        rows={rows}
        resize={resize}
        autoResize={autoResize}
        value={detail}
        onChange={(event) => {
          setDetail(event.target.value);
          setProblem("");
          setStatus("");
        }}
        errorMessage={problem}
        disabled={disabled}
        characterLimit={characterLimit || undefined}
      />
      <div className="preview-actions">
        <Button type="submit" disabled={disabled}>
          Continue
        </Button>
      </div>
      <p className="preview-message" role="status" data-success={status ? "" : undefined}>
        {status}
      </p>
    </form>
  );
}
