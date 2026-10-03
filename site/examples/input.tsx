import { useEffect, useRef, useState } from "react";
import { Button, Input } from "x-govuk-ui";

type Props = {
  label?: string;
  hint?: string;
  hideLabel?: boolean;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  errorMessage?: string;
  disabled?: boolean;
  readOnly?: boolean;
  /** Adds a password field, as a sign-up form has, with or without its strength. */
  password?: "off" | "show" | "strength";
};

export default function InputExample({
  label = "Email address",
  hint = "We’ll only use this to contact you about your application.",
  hideLabel = false,
  placeholder = "you@example.com",
  prefix = "",
  suffix = "",
  errorMessage = "",
  disabled = false,
  readOnly = false,
  password = "off",
}: Props) {
  const field = useRef<HTMLInputElement>(null);
  const secret = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [problem, setProblem] = useState(errorMessage);
  const [passwordProblem, setPasswordProblem] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => setProblem(errorMessage), [errorMessage]);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!field.current?.validity.valid) {
          setProblem(
            field.current?.validity.valueMissing
              ? "Enter your email address."
              : "Enter an email address in the correct format.",
          );
          setStatus("");
          field.current?.focus();
          return;
        }
        if (password !== "off" && (secret.current?.value.length ?? 0) < 8) {
          setPasswordProblem("Enter a password that is at least 8 characters long.");
          setStatus("");
          secret.current?.focus();
          return;
        }
        setProblem("");
        setStatus(
          password === "off"
            ? "Your email address is ready to use. No information was sent."
            : "Your account details are ready to use. No information was sent.",
        );
      }}
    >
      <Input
        ref={field}
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        label={label}
        hideLabel={hideLabel}
        hint={hint || undefined}
        placeholder={placeholder}
        prefix={prefix || undefined}
        suffix={suffix || undefined}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setProblem("");
          setStatus("");
        }}
        errorMessage={problem}
        disabled={disabled}
        readOnly={readOnly}
      />
      {password !== "off" && (
        <div className="preview-field-gap">
          <Input
            ref={secret}
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            label="Create a password"
            hint="It must be at least 8 characters long."
            strength={password === "strength"}
            onChange={() => {
              setPasswordProblem("");
              setStatus("");
            }}
            errorMessage={passwordProblem}
            disabled={disabled}
          />
        </div>
      )}
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
