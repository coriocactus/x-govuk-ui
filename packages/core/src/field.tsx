"use client";

/*
 * Field parts, which give a control its label, hint and error message.
 *
 * These follow GOV.UK Frontend's form group rather than Base UI's Field. Keep them in step with
 * GOV.UK Frontend's `input`, `hint`, `error-message` and `label` templates:
 *
 * - The order is label, hint, error message, then the control.
 * - The hint's id is `{id}-hint` and the error's id is `{id}-error`. The control is described by
 *   the caller's own ids, then the hint, then the error. GOV.UK's error summary links to `#{id}`.
 * - The error message starts with a visually hidden "Error:".
 *
 * Base UI's Field assigns the control's id after the page loads, so the ids above would not be in
 * the first HTML and an error summary link could miss. The trade-offs of not using it:
 *
 * - Base UI controls, such as Select or Checkbox, do not connect to these parts by themselves.
 *   Spread `useField().controlProps` onto the element that takes focus, such as `Select.Trigger`.
 * - Base UI's `Form` validation is not wired in. The library's own Form validates on submit, as
 *   GOV.UK recommends, and gives each field its message by the field's `name`. Outside a Form, a
 *   service passes each message as `errorMessage`.
 * - If Base UI starts rendering a caller's id in the first HTML, its Field could replace the
 *   inside of `useField` and these parts without changing their props.
 */

import { AnimatePresence, motion } from "motion/react";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
} from "react";
import { duration, useMotionTiming } from "./motion";

/** Whether content is worth showing. Text of only spaces counts as none. */
const present = (node: ReactNode) =>
  typeof node === "string" ? node.trim() !== "" : Boolean(node) || node === 0;

/**
 * A Form's errors, by name, a way for its fields to say where they are, and the answers its fields
 * start with.
 * @internal
 */
export const FormContext = createContext<{
  errors: Partial<Record<string, string>>;
  register: (name: string, id: string) => () => void;
  defaults?: Partial<Record<string, string[]>>;
} | null>(null);

/**
 * The answer a field starts with when its Form has one for the field's `name`, such as an answer
 * FormSteps kept from an earlier visit. A field reads it once, as its default, and its own
 * `defaultValue` comes first. A field of your own can use it the same way.
 */
export function useFormDefault(name: string | undefined): string[] | undefined {
  const form = useContext(FormContext);
  return name ? form?.defaults?.[name] : undefined;
}

export type UseFieldOptions = {
  /** The control's id. One is generated when it is left out. */
  id?: string;
  /** The name the control submits under. In a Form, the field finds its error by it. */
  name?: string;
  /**
   * Where a Form's error summary links to, when it is not the control itself, such as the first
   * box of a date.
   */
  linkTo?: string;
  hint?: ReactNode;
  errorMessage?: ReactNode;
  /** The caller's own descriptions, read before the hint and the error. */
  "aria-describedby"?: string;
};

/** The ids that tie a control to its label, hint and error message, in GOV.UK's scheme. */
export function useField({
  id,
  name,
  linkTo,
  hint,
  errorMessage: own,
  "aria-describedby": describedBy,
}: UseFieldOptions) {
  const generated = useId();
  const controlId = id ?? `field-${generated}`;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  // In a Form, a field shows the form's message for its name, unless it is given one of its own.
  const form = useContext(FormContext);
  const errorMessage = own ?? (name ? form?.errors[name] : undefined);
  const invalid = present(errorMessage);
  const register = form?.register;
  const target = linkTo ?? controlId;
  useEffect(
    () => (name && register ? register(name, target) : undefined),
    [name, target, register],
  );
  return {
    id: controlId,
    hintId,
    errorId,
    invalid,
    /** The message to show, which is the field's own or its Form's. */
    errorMessage,
    /** Spread onto the control, or onto the element that takes focus in a composite control. */
    controlProps: {
      id: controlId,
      "aria-describedby":
        [describedBy, present(hint) && hintId, invalid && errorId].filter(Boolean).join(" ") ||
        undefined,
      "aria-invalid": invalid || undefined,
    },
  };
}

/** Contains a control with its label, hint and error message. */
export function Field({
  invalid = false,
  className = "",
  ...props
}: ComponentPropsWithRef<"div"> & { invalid?: boolean }) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-field ${className}`.trim()}
      data-invalid={invalid || undefined}
    />
  );
}

export type LabelProps = ComponentPropsWithRef<"label"> & {
  /** Hides the label visually. Screen readers still announce it. */
  visuallyHidden?: boolean;
};

/** Names a control. Pass the control's id as `htmlFor`. */
export function Label({ visuallyHidden = false, className = "", ...props }: LabelProps) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: The caller passes htmlFor.
    <label
      {...props}
      className={`x-govuk-ui-label${visuallyHidden ? " x-govuk-ui-visually-hidden" : ""} ${className}`.trim()}
    />
  );
}

/** Guidance between the label and the control. Renders nothing without content. */
export function Hint({ className = "", children, ...props }: ComponentPropsWithRef<"div">) {
  if (!present(children)) return null;
  return (
    <div {...props} className={`x-govuk-ui-hint ${className}`.trim()}>
      {children}
    </div>
  );
}

/** The message is a paragraph with the role and the id, and the paragraph takes the other props. */
export type ErrorMessageProps = ComponentPropsWithRef<"p">;

/**
 * What went wrong and how to fix it, between the hint and the control, as GOV.UK places it. It
 * opens and closes smoothly, so the control moves rather than jumps. GOV.UK's message is not a
 * live region, because its errors arrive with a new page. Ours can appear without a new page, so
 * screen readers announce it. It renders nothing without content.
 */
export function ErrorMessage({ id, children, className = "", ...props }: ErrorMessageProps) {
  const timing = useMotionTiming();
  return (
    <AnimatePresence initial={false}>
      {present(children) && (
        <motion.div
          key="error"
          className={`x-govuk-ui-error-container ${className}`.trim()}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={timing.ease(duration.medium)}
        >
          <p {...props} className="x-govuk-ui-error" id={id} role="alert">
            <span className="x-govuk-ui-visually-hidden">Error: </span>
            {children}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
