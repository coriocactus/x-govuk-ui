"use client";

import {
  type ComponentPropsWithRef,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AutoHeight } from "./auto-height";
import { ErrorSummary, ErrorSummaryItem } from "./error-summary";
import { FormContext } from "./field";
import { useMergedRef } from "./refs";

/** A message for each answer that needs fixing, keyed by the name its field submits under. */
export type FormErrors = Partial<Record<string, string>>;

export type FormProps = Omit<ComponentPropsWithRef<"form">, "onSubmit"> & {
  /**
   * Checks the answers as the form is sent, and returns a message for each one that needs fixing,
   * such as `{ email: "Enter an email address" }`. `validateWith` makes one from a Standard Schema.
   */
  validate?: (data: FormData) => FormErrors;
  /**
   * Runs when the form is sent and every answer passes. If it returns messages, such as the
   * server's, they show as the form's own messages do. Without it, a form that passes is sent as
   * any form is.
   */
  onSubmit?: (
    data: FormData,
    event: FormEvent<HTMLFormElement>,
    // biome-ignore lint/suspicious/noConfusingVoidType: An onSubmit that only sends returns nothing.
  ) => FormErrors | void | Promise<FormErrors | void>;
  /** The error summary's title. */
  errorTitle?: ReactNode;
  /** Adds "Error: " to the start of the page's title while there are errors, as GOV.UK asks. */
  titlePrefix?: boolean;
  /**
   * Shows the errors in an Error summary above the fields, which takes focus, as GOV.UK does.
   * Without it, each field shows only its own message, and focus goes to the first field that needs
   * fixing. That suits a small form, such as one in a card.
   */
  errorSummary?: boolean;
  /**
   * The answers the fields start with, by the names they submit under, such as answers kept from
   * an earlier visit. A field's own `defaultValue` comes first.
   */
  defaultValues?: Partial<Record<string, string | string[]>>;
};

/**
 * A schema from any library that follows [Standard Schema](https://standardschema.dev), such as
 * Zod, Valibot or ArkType. Only the part `validateWith` uses is described, so no library's types
 * are needed.
 */
export type StandardSchema = {
  readonly "~standard": {
    readonly validate: (value: unknown) => StandardSchemaResult | PromiseLike<StandardSchemaResult>;
  };
};

/** @internal What a Standard Schema's check returns. It has no issues when the answers pass. */
type StandardSchemaResult = {
  readonly issues?:
    | readonly {
        readonly message: string;
        readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined;
      }[]
    | undefined;
};

export type ValidateWithOptions = {
  /**
   * Fields that send a list, such as Checkboxes. Their answers reach the schema as a list however
   * many there are, and as an empty one when none is chosen. Any other field that sends more than
   * one answer under its name sends a list too.
   */
  lists?: readonly string[];
  /**
   * Where a message goes when the schema's check has no path, as a check of the whole form may not
   * have. Better, give such checks the path of the field they are about, so the message shows
   * there.
   */
  root?: string;
};

/**
 * Makes a Form's `validate` from a Standard Schema. The schema checks the answers by name as the
 * form sends them, such as a Date input's `birth-day`, `birth-month` and `birth-year`. Each issue's
 * message goes under the first key of its path. A part's message, such as one under `birth-day`,
 * shows on its field, `birth`. Each field shows its first message.
 *
 * A Form checks its answers as they change, so the schema must check synchronously. Zod's and
 * Valibot's schemas do, unless given an async check. Check anything that waits, such as with a
 * server, in `onSubmit`. Write the messages as GOV.UK does, such as "Enter your date of birth".
 */
export function validateWith(
  schema: StandardSchema,
  { lists = [], root = "form" }: ValidateWithOptions = {},
): (data: FormData) => FormErrors {
  return (data) => {
    const answers: Record<string, unknown> = Object.fromEntries(lists.map((name) => [name, []]));
    for (const name of new Set(data.keys())) {
      const all = data.getAll(name);
      answers[name] = all.length > 1 || lists.includes(name) ? all : all[0];
    }
    const result = schema["~standard"].validate(answers);
    if ("then" in result)
      throw new TypeError(
        "validateWith needs a schema that checks without waiting. Check anything that waits in the Form's onSubmit.",
      );
    const errors: FormErrors = {};
    for (const { message, path } of result.issues ?? []) {
      const first = path?.[0];
      let name = root;
      if (first !== undefined) name = String(typeof first === "object" ? first.key : first);
      errors[name] ??= message;
    }
    return errors;
  };
}

/**
 * @internal The field an error belongs to. It is the field registered under the error's name, or
 * else the field that the name is a part of, as `birth-day` is of `birth`. The longest such name
 * wins.
 */
export function fieldOf(name: string, fields: Iterable<string>) {
  const all = [...fields];
  if (all.includes(name)) return name;
  const owners = all.filter((field) => name.startsWith(`${field}-`));
  return owners.sort((a, b) => b.length - a.length)[0] ?? name;
}

type Problem = { name: string; message: string; id: string };

/** What a field submits, with any parts, such as a date's `{name}-day`, `-month` and `-year`. */
function answer(data: FormData, name: string) {
  return [...data.entries()]
    .filter(([key]) => key === name || key.startsWith(`${name}-`))
    .map(([key, value]: [string, unknown]) =>
      value instanceof File ? `${key}=${value.name}:${value.size}` : `${key}=${value}`,
    )
    .join("&");
}

/**
 * GOV.UK's pattern for a question page, as one component. Each field inside takes part by its
 * `name`. When the form is sent, `validate` checks every answer. If any need fixing, the form stays
 * on the page. An Error summary opens above the fields and takes focus, and each field shows its
 * own message. The summary lists the messages in the fields' order, and each links to its field.
 * Fixing an answer clears its message and its line in the summary at once. The summary folds away
 * once nothing is wrong. The fields stack with GOV.UK's spacing between them. The browser's own
 * validation is off, as GOV.UK advises.
 */
export function Form({
  validate,
  onSubmit,
  errorTitle = "There is a problem",
  titlePrefix = true,
  errorSummary = true,
  defaultValues,
  className = "",
  ref,
  children,
  onInput,
  onChange,
  onClick,
  onKeyUp,
  ...props
}: FormProps) {
  const form = useRef<HTMLFormElement | null>(null);
  const mergedRef = useMergedRef(form, ref);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [attempt, setAttempt] = useState(0);
  // Where each field is, by its name, so the summary can link to it.
  const ids = useRef(new Map<string, string>());
  // The answers when the errors were found, so the form can tell which have changed since.
  const found = useRef<FormData | null>(null);

  const register = useCallback((name: string, id: string) => {
    ids.current.set(name, id);
    return () => {
      if (ids.current.get(name) === id) ids.current.delete(name);
    };
  }, []);
  // Fields read their starting answers once, so the first ones given are the ones kept.
  const [defaults] = useState(() =>
    Object.fromEntries(
      Object.entries(defaultValues ?? {}).flatMap(([name, value]) => {
        if (value === undefined) return [];
        return [[name, Array.isArray(value) ? value : [value]]];
      }),
    ),
  );
  const context = useMemo(
    () => ({
      errors: Object.fromEntries(problems.map(({ name, message }) => [name, message])),
      register,
      defaults,
    }),
    [problems, register, defaults],
  );

  /** Shows the errors, in the order of their fields, and says whether there were any. */
  const show = (errors: FormErrors, data: FormData) => {
    const owned = new Map<string, string>();
    for (const [name, message] of Object.entries(errors)) {
      const field = fieldOf(name, ids.current.keys());
      if (message && !owned.has(field)) owned.set(field, message);
    }
    const listed = [...owned].map(([name, message]) => ({
      name,
      message,
      id: ids.current.get(name) ?? name,
    }));
    const place = (problem: Problem) => document.getElementById(problem.id);
    listed.sort((a, b) => {
      const [first, second] = [place(a), place(b)];
      if (!first || !second) return 0;
      return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    found.current = data;
    setProblems(listed);
    if (listed.length > 0) setAttempt((count) => count + 1);
    // Without a summary to take focus, the first field that needs fixing does.
    const first = listed[0];
    if (first && !errorSummary)
      requestAnimationFrame(() => document.getElementById(first.id)?.focus());
    return listed.length > 0;
  };

  // An answer that has changed and now passes loses its error at once. One that still fails keeps
  // its message until the form is sent again.
  const recheck = () => {
    if (problems.length === 0) return;
    requestAnimationFrame(() => {
      const element = form.current;
      const before = found.current;
      if (!element || !before) return;
      const data = new FormData(element);
      const now = Object.entries(validate?.(data) ?? {}).flatMap(([name, message]) =>
        message ? [fieldOf(name, ids.current.keys())] : [],
      );
      setProblems((current) => {
        const next = current.filter(
          ({ name }) => answer(data, name) === answer(before, name) || now.includes(name),
        );
        return next.length === current.length ? current : next;
      });
    });
  };

  const failing = problems.length > 0;
  useEffect(() => {
    if (!titlePrefix || !failing) return;
    document.title = `Error: ${document.title}`;
    return () => {
      if (document.title.startsWith("Error: ")) document.title = document.title.slice(7);
    };
  }, [titlePrefix, failing]);

  return (
    <FormContext value={context}>
      <form
        noValidate
        {...props}
        ref={mergedRef}
        className={`x-govuk-ui-form ${className}`.trim()}
        onSubmit={async (event) => {
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const data = new FormData(event.currentTarget, submitter);
          let checked: FormErrors;
          try {
            checked = validate?.(data) ?? {};
          } catch (error) {
            // A check that cannot run must not let the answers go unchecked.
            event.preventDefault();
            throw error;
          }
          if (show(checked, data)) return event.preventDefault();
          // A form without onSubmit is sent as any form is, such as to the server.
          if (!onSubmit) return;
          event.preventDefault();
          const errors = await onSubmit(data, event);
          if (errors) show(errors, data);
        }}
        onInput={(event) => {
          onInput?.(event);
          recheck();
        }}
        onChange={(event) => {
          onChange?.(event);
          recheck();
        }}
        // Some answers change without an input event, such as a choice from a Select's list.
        onClick={(event) => {
          onClick?.(event);
          recheck();
        }}
        onKeyUp={(event) => {
          onKeyUp?.(event);
          recheck();
        }}
      >
        {/* The summary opens above the fields, and the fields move down smoothly to make room. */}
        <AutoHeight className="x-govuk-ui-form-summary">
          {failing && errorSummary && (
            <div key={attempt} data-sound-enter="error">
              <ErrorSummary title={errorTitle}>
                {problems.map(({ name, message, id }) => (
                  <ErrorSummaryItem key={name} href={`#${id}`}>
                    {message}
                  </ErrorSummaryItem>
                ))}
              </ErrorSummary>
            </div>
          )}
        </AutoHeight>
        <div className="x-govuk-ui-form-fields">{children}</div>
      </form>
    </FormContext>
  );
}
