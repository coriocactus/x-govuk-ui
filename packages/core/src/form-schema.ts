// `validateWith`, and the types of what it takes and returns. The file has no "use client", so a
// server can check the answers again with the schema the Form checks them with. From a client
// module, `validateWith` would be a client reference, which a server cannot call.

import type { FormErrors } from "./form";

/**
 * A schema from any library that follows [Standard Schema](https://standardschema.dev), such as
 * Zod, Valibot or ArkType. `Output` is the type the schema gives the answers that pass. Only the
 * part `validateWith` uses is described, so no library's types are needed.
 */
export type StandardSchema<Output = unknown> = {
  readonly "~standard": {
    readonly validate: (
      value: unknown,
    ) => StandardSchemaResult<Output> | PromiseLike<StandardSchemaResult<Output>>;
  };
};

/**
 * @internal What a Standard Schema's check returns. It is the answers as the schema gives them, or
 * an issue for each answer that needs fixing.
 */
type StandardSchemaResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | {
      readonly issues: readonly {
        readonly message: string;
        readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined;
      }[];
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

/** The check that `validateWith` makes from a schema, which a Form's `validate` takes. */
export type SchemaCheck<Output> = {
  /** Checks the answers, and returns a message for each one that needs fixing. */
  (data: FormData): FormErrors;
  /**
   * The answers as the schema gives them, such as a number the schema makes from an input's text.
   * `answers` reads the `FormData` as the check does. It throws a `TypeError` when any answer needs
   * fixing, so check the answers first. A Form has checked them before it calls `onSubmit`.
   */
  answers: (data: FormData) => Output;
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
 *
 * The check's `answers` gives `onSubmit` the answers as the schema types them:
 *
 * ```tsx
 * const check = validateWith(z.object({ email: z.email("Enter an email address") }));
 *
 * <Form validate={check} onSubmit={(data) => subscribe(check.answers(data).email)}>
 * ```
 *
 * A server can call `validateWith` too, to check the answers again with the same schema.
 */
export function validateWith<Output>(
  schema: StandardSchema<Output>,
  { lists = [], root = "form" }: ValidateWithOptions = {},
): SchemaCheck<Output> {
  // The check and `answers` both read the FormData here, so the schema sees the same answers from
  // each.
  const run = (data: FormData) => {
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
    return result;
  };
  const check = (data: FormData) => {
    const errors: FormErrors = {};
    for (const { message, path } of run(data).issues ?? []) {
      const first = path?.[0];
      let name = root;
      if (first !== undefined) name = String(typeof first === "object" ? first.key : first);
      errors[name] ??= message;
    }
    return errors;
  };
  check.answers = (data: FormData) => {
    const result = run(data);
    if (result.issues)
      throw new TypeError(
        "validateWith's answers needs every answer to pass. Check the answers first, as a Form does before it calls onSubmit.",
      );
    return result.value;
  };
  return check;
}
