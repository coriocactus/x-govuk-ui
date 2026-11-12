// `validateWith`, and the types of the schema and options it takes. The file has no "use client", so
// a server can check the answers again with the schema the Form checks them with. From a client
// module, `validateWith` would be a client reference, which a server cannot call.

import type { FormErrors } from "./form";

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
