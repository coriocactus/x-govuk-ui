"use client";

import {
  type ComponentPropsWithRef,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  ErrorMessage,
  Field,
  Hint,
  Label,
  present,
  useControlProps,
  useFieldSummary,
  useFormDefault,
} from "./field";
import { passwordStrength } from "./helpers";
import { useLabels } from "./labels";

export type InputProps = Omit<ComponentPropsWithRef<"input">, "prefix"> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: ReactNode;
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
  /** Its words for a password, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<InputLabels>;
};

/** The words Input writes for a password, which a LabelsProvider or its `labels` can change. */
export type InputLabels = {
  show: string;
  hide: string;
  /** Names the Show button for screen readers. */
  showPassword: string;
  /** Names the Hide button for screen readers. */
  hidePassword: string;
  /** Tells screen readers that the password shows. */
  passwordShown: string;
  /** Tells screen readers that the password is covered again. */
  passwordHidden: string;
  /** Heads the strength meter. */
  strength: string;
  /** The strength meter's word for each score, from too short to strong. */
  strengths: readonly [string, string, string, string, string];
  /** Stands for a password in FormSteps' Check your answers, which never shows it. */
  passwordAnswer: string;
};

export const defaultInputLabels: InputLabels = {
  show: "Show",
  hide: "Hide",
  showPassword: "Show password",
  hidePassword: "Hide password",
  passwordShown: "Your password is visible",
  passwordHidden: "Your password is hidden",
  strength: "Password strength",
  strengths: ["Too short", "Weak", "Fair", "Good", "Strong"],
  passwordAnswer: "••••••••",
};

/**
 * A familiar field, with GOV.UK's label, hint and error. With `type="password"`, it is GOV.UK's
 * password input. A Show button reveals the password, and Hide covers it again. The password is
 * also covered again when its form is sent, so the browser never keeps it in plain text.
 *
 * It is a bound Field with a Label, a Hint, an ErrorMessage and an InputControl. Compose those
 * parts yourself to put something between the hint and the control, or beside the control.
 */
export function Input({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  id,
  "aria-describedby": describedBy,
  ...props
}: InputProps) {
  const generated = useId();
  return (
    <Field
      controlId={id ?? `field-${generated}`}
      name={props.name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <Label visuallyHidden={hideLabel}>{label}</Label>
      <Hint>{hint}</Hint>
      <ErrorMessage />
      <InputControl {...props} />
    </Field>
  );
}

export type InputControlProps = Omit<ComponentPropsWithRef<"input">, "prefix"> &
  Pick<InputProps, "prefix" | "suffix" | "strength" | "labels">;

/**
 * Input's control on its own, for a field composed from Field's parts. It is the text box, with its
 * prefix and suffix, and, for a password, the Show button and the strength meter. In a bound Field,
 * it takes its id, name and descriptions from the field.
 */
export function InputControl(given: InputControlProps) {
  const {
    prefix,
    suffix,
    strength = false,
    labels: ownLabels,
    type = "text",
    className = "",
    onChange,
    ...props
  } = useControlProps(given);
  const labels = useLabels("input", defaultInputLabels, ownLabels);
  // The Show button and the strength meter name the box by its id, so it always has one.
  const generated = useId();
  const controlId = props.id ?? `input-${generated}`;
  const password = type === "password";
  const [shown, setShown] = useState(false);
  // Check your answers lists a password as covered, whether or not it shows in its box.
  const covered = labels.passwordAnswer;
  useFieldSummary({ answer: password ? () => covered : undefined });
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
  const strengthId = `${controlId}-strength`;
  const control = (
    <input
      type={password && shown ? "text" : type}
      {...props}
      id={controlId}
      aria-describedby={
        password && strength
          ? [props["aria-describedby"], strengthId].filter(Boolean).join(" ")
          : props["aria-describedby"]
      }
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
    <>
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
              aria-controls={controlId}
              aria-label={shown ? labels.hidePassword : labels.showPassword}
              disabled={props.disabled}
              onClick={() => {
                setShown(!shown);
                setAnnouncement(shown ? labels.passwordHidden : labels.passwordShown);
              }}
            >
              {shown ? labels.hide : labels.show}
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
            {value ? `${labels.strength}: ${labels.strengths[score]}` : labels.strength}
          </span>
        </div>
      )}
    </>
  );
}
