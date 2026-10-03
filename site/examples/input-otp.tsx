import { useEffect, useRef, useState } from "react";
import { InputOTP } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  hideLabel?: boolean;
  maxLength?: number;
  disabled?: boolean;
  /** The code the service sent. A real service checks the entry on its server. */
  code?: string;
};

export default function OneTimeCodeExample({
  label = "Security code",
  hint = "Enter the code we sent to your email address.",
  hideLabel = false,
  maxLength = 6,
  disabled = false,
  code = "482913",
}: Props) {
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState("");
  const [state, setState] = useState<"entering" | "verifying" | "accepted">("entering");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <InputOTP
        label={label}
        hint={hint || undefined}
        hideLabel={hideLabel}
        maxLength={maxLength}
        placeholder={"0".repeat(maxLength)}
        value={value}
        verifying={state === "verifying"}
        success={state === "accepted"}
        errorMessage={problem}
        disabled={disabled}
        onChange={(next) => {
          setValue(next);
          // Typing again starts a new attempt, so the error clears and the ring returns to black.
          setProblem("");
          if (next.length < maxLength) return;
          // Every slot is filled, so the code is checked at once, with no button to press. A
          // service would ask its server.
          setState("verifying");
          timer.current = setTimeout(() => {
            if (next === code) return setState("accepted");
            // A wrong code clears, and the caret returns to the first slot to try again.
            setValue("");
            setState("entering");
            setProblem("The code is incorrect. Check it and try again.");
          }, 900);
        }}
      />
      <p className="preview-message" role="status">
        {state === "accepted" ? "Code accepted. No verification request was sent." : ""}
      </p>
    </>
  );
}
