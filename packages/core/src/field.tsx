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
 * - The error message starts with a visually hidden "Error:", the `errors` label's `prefix`.
 *
 * A Field given `controlId` is bound. It gives its parts their ids through context, and each field
 * tells its Form what it asks and how to show its answer, for FormSteps' Check your answers.
 *
 * Base UI's Field assigns the control's id after the page loads, so the ids above would not be in
 * the first HTML and an error summary link could miss. The trade-offs of not using it:
 *
 * - Base UI controls, such as Select or Checkbox, do not connect to these parts by themselves.
 *   In a bound Field, pass the control's props through `useControlProps`. Otherwise, spread
 *   `useField().controlProps` onto the element that takes focus, such as `Select.Trigger`.
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
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useState,
} from "react";
import { defaultErrorLabels } from "./error-summary";
import { useLabels } from "./labels";
import { duration, useMotionTiming } from "./motion";
import { useLatest } from "./refs";

/**
 * Whether content is worth showing. Text of only spaces counts as none.
 * @internal
 */
export const present = (node: ReactNode) =>
  typeof node === "string" ? node.trim() !== "" : Boolean(node) || node === 0;

/**
 * A field as its Form knows it, by the name it submits under. The Form's error summary links to its
 * `id`. FormSteps' Check your answers shows its `label` and its `answer`. The field keeps the object
 * up to date after each render it commits, so the Form reads it only when it needs it.
 */
export type FormField = {
  /** Where the error summary links to. */
  id: string;
  /** The question, as the field's label or legend shows it. */
  label?: ReactNode;
  /**
   * The answer, as Check your answers shows it, from the answers the form would send. A list shows
   * one answer to a line. Without it, the summary shows what the field sends under its name.
   */
  answer?: (data: FormData) => ReactNode;
  /** Whether users can see the field. A follow-up question shows only while its answer is chosen. */
  shown?: () => boolean;
};

/**
 * A Form's errors, by name, a way for its fields to say where they are and what they ask, and the
 * answers its fields start with.
 * @internal
 */
export const FormContext = createContext<{
  errors: Partial<Record<string, ReactNode>>;
  register: (name: string, field: FormField) => () => void;
  defaults?: Partial<Record<string, string[]>>;
} | null>(null);

/**
 * Whether the part of the page around a field shows, such as a follow-up question that opens with
 * its answer. A field outside any such part always shows.
 */
const ShownContext = createContext<() => boolean>(() => true);

export type ShownProviderProps = {
  /** Whether users can see the fields inside. */
  shown: boolean;
  children: ReactNode;
};

/**
 * Tells the fields inside it whether users can see them, such as fields in a disclosure of your
 * own. FormSteps' Check your answers leaves out the answers of fields users cannot see. A field
 * inside a provider that is not shown is not shown either, as in a follow-up question of a
 * follow-up question.
 */
export function ShownProvider({ shown, children }: ShownProviderProps) {
  const around = useContext(ShownContext);
  const now = useLatest(shown);
  const visible = useCallback(() => now.current && around(), [around]);
  return <ShownContext value={visible}>{children}</ShownContext>;
}

/**
 * The answer a field starts with when its Form has one for the field's `name`, such as an answer
 * FormSteps kept from an earlier visit. A field reads it once, as its default, before its own
 * `defaultValue`. A field of your own can use it the same way.
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
  /**
   * The question, for the field's Form, as Check your answers lists it. A bound Field's `Label`
   * or `FieldsetLegend` gives it.
   */
  label?: ReactNode;
  /** The answer, as Check your answers shows it. See `FormField`. */
  answer?: (data: FormData) => ReactNode;
};

/** The ids that tie a control to its label, hint and error message, in GOV.UK's scheme. */
export function useField({
  id,
  name,
  linkTo,
  hint,
  errorMessage: own,
  "aria-describedby": describedBy,
  label,
  answer,
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
  const shown = useContext(ShownContext);
  // One object for the field's life, which the Form keeps. It is brought up to date after each
  // render React commits, so the Form never reads a render that was thrown away.
  const [field] = useState<Entry>(() => {
    const entry: Entry = {
      shown,
      own: { id: controlId, linkTo },
      given: {},
      get id() {
        return entry.own.linkTo ?? entry.given.linkTo?.value ?? entry.own.id;
      },
      get label() {
        return entry.own.label ?? entry.given.label?.value;
      },
      get answer() {
        return entry.own.answer ?? entry.given.answer?.value;
      },
    };
    return entry;
  });
  useLayoutEffect(() => {
    field.own.id = controlId;
    field.own.linkTo = linkTo;
    field.shown = shown;
    field.own.label = label;
    field.own.answer = answer;
  });
  // The field registers as it mounts, before any layout effect of the Form's, such as FormSteps'
  // Check your answers reading the fields as it first appears.
  useLayoutEffect(
    () => (name && register ? register(name, field) : undefined),
    [name, register, field],
  );
  return {
    id: controlId,
    /** What the field tells its Form. Its parts and its control fill in what it was not given. */
    field,
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

/** What a part gave its field, with the part that gave it, which alone may take it back. */
type Given<T> = { owner: object; value: T };

/**
 * A field as `useField` keeps it. Its own label and answer, given to `useField`, come before those
 * its parts give.
 */
type Entry = FormField & {
  own: {
    id: string;
    linkTo?: string;
    label?: ReactNode;
    answer?: (data: FormData) => ReactNode;
  };
  given: {
    linkTo?: Given<string>;
    label?: Given<ReactNode>;
    answer?: Given<(data: FormData) => ReactNode>;
  };
};

/** What a bound Field gives the parts inside it, which is `useField`'s result and its name. */
type Bound = ReturnType<typeof useField> & { name?: string };

/**
 * Gives the bound Field around it its answer, for Check your answers. It renders nothing.
 * @internal
 */
export function FieldAnswer({ answer }: { answer: (data: FormData) => ReactNode }) {
  useFieldSummary({ answer });
  return null;
}

export type FieldSummary = {
  /** The question, such as a label's words. */
  label?: ReactNode;
  /** How the answer shows in Check your answers. See `FormField`. */
  answer?: (data: FormData) => ReactNode;
  /**
   * Where a Form's error summary links to, when it is not the field's control, such as the day of
   * a Date input's control.
   */
  linkTo?: string;
};

/**
 * Tells the bound Field around a part what it asks, such as a label's words, how its control shows
 * its answer, as Select shows its option's label, or where an error links to. Use it in a control
 * of your own. The field's own `label`, `answer` and `linkTo`, given to Field or `useField`, come
 * first. What the part gives goes with it when it leaves the page.
 */
export function useFieldSummary(summary: FieldSummary) {
  const bound = useContext(FieldContext);
  const entry = bound?.field;
  const [owner] = useState(() => ({}));
  // The label and answer change with each render, so they are kept after each one, with no state.
  useLayoutEffect(() => {
    if (!entry) return;
    const { given } = entry;
    if ("label" in summary) given.label = { owner, value: summary.label };
    if ("answer" in summary && summary.answer) given.answer = { owner, value: summary.answer };
    if (summary.linkTo) given.linkTo = { owner, value: summary.linkTo };
    return () => {
      if (given.label?.owner === owner) given.label = undefined;
      if (given.answer?.owner === owner) given.answer = undefined;
      if (given.linkTo?.owner === owner) given.linkTo = undefined;
    };
  });
}

const FieldContext = createContext<Bound | null>(null);

/**
 * Keeps the parts inside from binding to the Field around them, such as the fields of a follow-up
 * question inside a group's Field.
 * @internal
 */
export function Unbound({ children }: { children: ReactNode }) {
  return <FieldContext value={null}>{children}</FieldContext>;
}

/**
 * The bound Field around a part, if there is one. Its parts take their ids from it.
 * @internal
 */
export function useBoundField() {
  return useContext(FieldContext);
}

/** The props a bound Field gives a control. */
export type ControlBinding = {
  id?: string;
  name?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
};

/**
 * A control's props, completed by the bound Field around it, as a shorthand would complete them.
 * Use it for a control of your own in a Field with `controlId`. The field gives the id and name
 * wherever the props leave them out. The control's own descriptions come first, then the field's
 * hint and error. An error makes the control invalid, whatever its props say. Outside a bound
 * Field, the props are returned as given.
 */
export function useControlProps<T extends ControlBinding>(props: T): T & ControlBinding {
  const field = useContext(FieldContext);
  if (!field) return props;
  const described = [props["aria-describedby"], field.controlProps["aria-describedby"]]
    .join(" ")
    .split(" ")
    .filter(Boolean);
  return {
    ...props,
    id: props.id ?? field.controlProps.id,
    name: props.name ?? field.name,
    "aria-describedby": [...new Set(described)].join(" ") || undefined,
    "aria-invalid": field.controlProps["aria-invalid"] ?? props["aria-invalid"],
  };
}

export type FieldProps = ComponentPropsWithRef<"div"> & {
  /** Shows the field as invalid. A bound field works this out from its error, unless it is set. */
  invalid?: boolean;
  /**
   * Binds the field to its control's id. Its `Label`, `Hint`, `ErrorMessage` and control then take
   * their ids and descriptions from it, wherever their own props leave them out. A field composed
   * from its parts then needs no `useField`. Leave it out to give each part its props yourself.
   */
  controlId?: string;
  /** In a bound field, the name the control submits under. In a Form, it finds its error by it. */
  name?: string;
  /** In a bound field, where a Form's error summary links to, when not the control itself. */
  linkTo?: string;
  /**
   * In a bound field, whether it has a hint, so its control is described by the hint's id. The
   * field is told rather than finding out, so the description is in the first HTML.
   */
  hasHint?: boolean;
  /** In a bound field, its own error, which shows in place of its Form's. */
  errorMessage?: ReactNode;
  /** In a bound field, the ids of your own descriptions, read before the hint and the error. */
  describedBy?: string;
  /**
   * In a bound field, the answer, as FormSteps' Check your answers shows it, from the answers the
   * form would send. Without it, the field's control gives it, or else the summary shows what the
   * field sends under its name.
   */
  answer?: (data: FormData) => ReactNode;
  /**
   * In a bound field, the question, as Check your answers lists it, in place of its `Label`'s or
   * `FieldsetLegend`'s words. Give it when the question is not a label, such as a heading of your
   * own.
   */
  label?: ReactNode;
};

/**
 * Contains a control with its label, hint and error message. Bound by `controlId`, it ties them
 * together itself. A Field inside it is never bound to it.
 */
export function Field({
  controlId,
  name,
  linkTo,
  hasHint,
  errorMessage,
  describedBy,
  answer,
  label,
  ...props
}: FieldProps) {
  if (controlId === undefined)
    return (
      <FieldContext value={null}>
        <FieldBox {...props} />
      </FieldContext>
    );
  return (
    <BoundField
      {...props}
      binding={{ id: controlId, name, linkTo, hasHint, errorMessage, describedBy, answer, label }}
    />
  );
}

type Binding = {
  id: string;
  name?: string;
  linkTo?: string;
  hasHint?: boolean;
  errorMessage?: ReactNode;
  describedBy?: string;
  answer?: (data: FormData) => ReactNode;
  label?: ReactNode;
};

/** A Field bound to its control's id, which ties its parts together through context. */
function BoundField({
  binding,
  invalid,
  ...props
}: ComponentPropsWithRef<"div"> & { invalid?: boolean; binding: Binding }) {
  const { id, ...rest } = binding;
  return (
    <FieldBinding controlId={id} {...rest}>
      <BoundBox {...props} invalid={invalid} />
    </FieldBinding>
  );
}

/** A bound Field's box, marked invalid when its field has an error, unless told otherwise. */
function BoundBox({ invalid, ...props }: ComponentPropsWithRef<"div"> & { invalid?: boolean }) {
  const field = useContext(FieldContext);
  return <FieldBox {...props} invalid={invalid ?? field?.invalid} />;
}

export type FieldBindingProps = Pick<
  FieldProps,
  "controlId" | "name" | "linkTo" | "hasHint" | "errorMessage" | "describedBy" | "answer" | "label"
> & {
  /** The control's id, which the parts inside take their ids from. */
  controlId: string;
  children: ReactNode;
};

/**
 * Binds the parts inside to a control's id, as a Field with `controlId` does, without the Field's
 * box. Use it for a field with a layout of its own, as Switch's row is, where the label sits beside
 * the control. Its parts take their ids from it, and the control takes its descriptions through
 * `useControlProps`. Its props are a bound Field's.
 */
export function FieldBinding({ children, controlId, ...binding }: FieldBindingProps) {
  const field = useField({
    id: controlId,
    name: binding.name,
    linkTo: binding.linkTo,
    hint: binding.hasHint || undefined,
    errorMessage: binding.errorMessage,
    "aria-describedby": binding.describedBy,
    answer: binding.answer,
    label: binding.label,
  });
  return <FieldContext value={{ ...field, name: binding.name }}>{children}</FieldContext>;
}

function FieldBox({
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

/** Names a control. Pass the control's id as `htmlFor`, unless a bound Field gives it. */
export function Label({ visuallyHidden = false, className = "", ...props }: LabelProps) {
  const field = useContext(FieldContext);
  useFieldSummary({ label: props.children });
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: The caller or a bound Field passes htmlFor.
    <label
      {...props}
      htmlFor={props.htmlFor ?? field?.id}
      className={`x-govuk-ui-label${visuallyHidden ? " x-govuk-ui-visually-hidden" : ""} ${className}`.trim()}
    />
  );
}

/**
 * A label that names its control through the control's `aria-labelledby`, by the label's own id,
 * instead of by `for`. It suits a control that a label cannot be for, such as a box of prose or a
 * slider's thumb. It looks as Label does, and gives its field its question.
 * @internal
 */
export function NamingLabel({
  visuallyHidden = false,
  className = "",
  ...props
}: Omit<LabelProps, "htmlFor"> & { id: string }) {
  useFieldSummary({ label: props.children });
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: The control names itself by the label's id.
    <label
      {...props}
      className={`x-govuk-ui-label${visuallyHidden ? " x-govuk-ui-visually-hidden" : ""} ${className}`.trim()}
    />
  );
}

/**
 * Guidance between the label and the control. Renders nothing without content. In a bound Field,
 * it takes the field's hint id.
 */
export function Hint({ className = "", children, ...props }: ComponentPropsWithRef<"div">) {
  const field = useContext(FieldContext);
  if (!present(children)) return null;
  return (
    <div
      {...props}
      id={props.id ?? field?.hintId}
      className={`x-govuk-ui-hint ${className}`.trim()}
    >
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
 * screen readers announce it. It renders nothing without content. In a bound Field, it takes the
 * field's error id, and shows the field's own error, or its Form's, when it is given none.
 */
export function ErrorMessage({
  id: ownId,
  children: given,
  className = "",
  ...props
}: ErrorMessageProps) {
  const timing = useMotionTiming();
  const field = useContext(FieldContext);
  const labels = useLabels("error", defaultErrorLabels);
  const id = ownId ?? field?.errorId;
  const children = given ?? field?.errorMessage;
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
            <span className="x-govuk-ui-visually-hidden">{labels.prefix}: </span>
            {children}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
