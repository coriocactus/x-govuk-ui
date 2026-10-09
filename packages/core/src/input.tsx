"use client";

import { type ComponentPropsWithRef, type ReactNode, useEffect, useRef, useState } from "react";
import { ErrorMessage, Field, Hint, Label, useField, useFormDefault } from "./field";
import { passwordStrength } from "./helpers";

export type InputProps = Omit<ComponentPropsWithRef<"input">, "prefix"> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: string;
  /**
   * Shown inside the start of the field, such as an icon or "£". Screen readers skip it, so the
   * label or hint must say anything it means.
   */
  prefix?: ReactNode;
  /** Shown inside the end of the field, such as "per item" or a keyboard shortcut. */
  suffix?: ReactNode;
  /**
   * For a password, shows how strong it is beneath the field, as four bars and a word, so users
   * can make it stronger before they continue.
   */
  strength?: boolean;
};

const strengthWords = ["Too short", "Weak", "Fair", "Good", "Strong"];

/**
 * A familiar field, with GOV.UK's label, hint and error. With `type="password"`, it is GOV.UK's
 * password input. A Show button reveals the password, and Hide covers it again. The password is
 * also covered again when its form is sent, so the browser never keeps it in plain text.
 */
export function Input({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  prefix,
  suffix,
  strength = false,
  type = "text",
  id,
  className = "",
  "aria-describedby": describedBy,
  onChange,
  ...props
}: InputProps) {
  const field = useField({
    id,
    name: props.name,
    hint,
    errorMessage,
    "aria-describedby": describedBy,
  });
  const password = type === "password";
  const [shown, setShown] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // A Form can give the field an answer to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(props.name)?.[0];
  const startWith = props.value === undefined ? (props.defaultValue ?? saved) : undefined;
  const [typed, setTyped] = useState(String(props.value ?? startWith ?? ""));
  const value = props.value === undefined ? typed : String(props.value);
  const group = useRef<HTMLDivElement>(null);

  // GOV.UK covers the password as its form is sent, so the browser does not remember it as text.
  useEffect(() => {
    const form = group.current?.closest("form");
    if (!password || !form) return;
    const cover = () => setShown(false);
    form.addEventListener("submit", cover);
    return () => form.removeEventListener("submit", cover);
  }, [password]);

  const score = passwordStrength(value);
  const strengthId = `${field.id}-strength`;
  const control = (
    <input
      type={password && shown ? "text" : type}
      {...props}
      {...field.controlProps}
      aria-describedby={
        password && strength
          ? [field.controlProps["aria-describedby"], strengthId].filter(Boolean).join(" ")
          : field.controlProps["aria-describedby"]
      }
      aria-invalid={field.controlProps["aria-invalid"] ?? props["aria-invalid"]}
      // A password is never corrected or capitalised, as GOV.UK's is not.
      autoCapitalize={password ? "none" : props.autoCapitalize}
      spellCheck={password ? false : props.spellCheck}
      defaultValue={startWith}
      className={`x-govuk-ui-input ${className}`.trim()}
      onChange={(event) => {
        setTyped(event.target.value);
        onChange?.(event);
      }}
    />
  );

  return (
    <Field invalid={field.invalid}>
      <Label htmlFor={field.id} visuallyHidden={hideLabel}>
        {label}
      </Label>
      <Hint id={field.hintId}>{hint}</Hint>
      <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
      {prefix || suffix || password ? (
        // The group draws the field's border, so the prefix and suffix sit inside it.
        // Pressing anywhere in the group focuses the field, as pressing a plain field would.
        <div
          ref={group}
          className="x-govuk-ui-input-group"
          onPointerDown={(event) => {
            const input = event.currentTarget.querySelector("input");
            const target = event.target as Element;
            if (!input || target === input || target.closest("button") || input.disabled) return;
            event.preventDefault();
            input.focus();
          }}
        >
          {prefix && (
            <span className="x-govuk-ui-input-prefix" aria-hidden="true">
              {prefix}
            </span>
          )}
          {control}
          {suffix && (
            <span className="x-govuk-ui-input-suffix" aria-hidden="true">
              {suffix}
            </span>
          )}
          {password && (
            <button
              type="button"
              className="x-govuk-ui-input-reveal"
              aria-controls={field.id}
              aria-label={shown ? "Hide password" : "Show password"}
              disabled={props.disabled}
              onClick={() => {
                setShown(!shown);
                setAnnouncement(shown ? "Your password is hidden" : "Your password is visible");
              }}
            >
              {shown ? "Hide" : "Show"}
            </button>
          )}
        </div>
      ) : (
        control
      )}
      {password && (
        <span className="x-govuk-ui-visually-hidden" aria-live="polite">
          {announcement}
        </span>
      )}
      {password && strength && (
        <div className="x-govuk-ui-password-strength" id={strengthId} data-score={score}>
          <span className="x-govuk-ui-password-strength-bars" aria-hidden="true">
            {[1, 2, 3, 4].map((bar) => (
              <span key={bar} data-on={value && score >= bar ? "" : undefined} />
            ))}
          </span>
          <span className="x-govuk-ui-password-strength-word">
            {value ? `Password strength: ${strengthWords[score]}` : "Password strength"}
          </span>
        </div>
      )}
    </Field>
  );
}
