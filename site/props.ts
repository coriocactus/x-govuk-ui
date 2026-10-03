/**
 * Each component's props, documented once. A prop with a control appears in the playground and
 * sets the example's prop of the same name. A prop without one is listed for reference.
 */
export type Option = readonly [value: string | number, label: string];

export type Control =
  | { kind: "switch" }
  | { kind: "text"; rows?: number }
  | { kind: "number"; min?: number; step?: number }
  | { kind: "range"; min: number; max: number; step: number }
  | { kind: "select"; options: readonly Option[] }
  | { kind: "checklist"; options: readonly Option[] };

/**
 * What another setting must be for this one to apply. The playground disables a setting whose needs
 * are not met, and says why, such as "Only with `dim` on".
 */
export type Need =
  /** Another setting has one of these values. */
  | { prop: string; is: readonly (string | number | boolean)[] }
  /** Another setting passes a test, described for the reader, such as "a `timeout` above 0". */
  | { prop: string; test: (value: unknown) => boolean; says: string }
  /** The settings together pass a test, described for the reader. */
  | { test: (args: Record<string, unknown>) => boolean; says: string };

export type PropDoc = {
  name: string;
  type: string;
  /** The documented default, such as "false", "Required" or "Optional". */
  default: string;
  control?: Control;
  /** Where the playground starts. */
  value?: unknown;
  /** The component reads this once, so the example starts again when it changes. */
  restart?: boolean;
  /** Explains a control whose effect is not obvious. */
  note?: string;
  /** What other settings must be for this one to apply. All must be met. */
  needs?: readonly Need[];
};

/**
 * A named starting point for the playground, with the settings for one use of the component, such
 * as a Chart's population pyramid. Picking it sets them, over the playground's starting values.
 */
export type Preset = {
  name: string;
  /** The settings it sets, by name, from the component's props and the example's settings. */
  args: Readonly<Record<string, string | number | boolean | readonly string[]>>;
};

/** Needs another setting to be one of these values. */
export const when = (prop: string, ...is: (string | number | boolean)[]): Need => ({ prop, is });
/** Needs a switch on, or off. */
export const whenOn = (prop: string): Need => ({ prop, is: [true] });
export const whenOff = (prop: string): Need => ({ prop, is: [false] });
/** Needs a number above 0. */
export const whenAbove0 = (prop: string): Need => ({
  prop,
  test: (value: unknown) => Number(value) > 0,
  says: `\`${prop}\` above 0`,
});

/** Whether the current settings meet a need. */
export function met(need: Need, args: Record<string, unknown>) {
  if (!("prop" in need)) return need.test(args);
  const value = args[need.prop];
  return "is" in need ? need.is.includes(value as string) : need.test(value);
}

type Extra = Partial<Omit<PropDoc, "name" | "control" | "value">>;

/** A prop without a control, such as a callback, a list of items or a part. */
export const reference = (name: string, type: string, fallback = "Optional"): PropDoc => ({
  name,
  type,
  default: fallback,
});

export const toggle = (name: string, value = false, extra: Extra = {}): PropDoc => ({
  name,
  type: "boolean",
  default: String(value),
  control: { kind: "switch" },
  value,
  ...extra,
});

export const text = (name: string, value: string, extra: Extra & { rows?: number } = {}) => {
  const { rows, ...rest } = extra;
  return {
    name,
    type: "string",
    default: "Optional",
    control: { kind: "text", rows },
    value,
    ...rest,
  } satisfies PropDoc;
};

export const number = (name: string, value: number, extra: Extra & { min?: number } = {}) => {
  const { min, ...rest } = extra;
  return {
    name,
    type: "number",
    default: String(value),
    control: { kind: "number", min },
    value,
    ...rest,
  } satisfies PropDoc;
};

export const range = (name: string, value: number, min: number, max: number, step: number) =>
  ({
    name,
    type: `number from ${min} to ${max}`,
    default: String(value),
    control: { kind: "range", min, max, step },
    value,
  }) satisfies PropDoc;

export const choice = (
  name: string,
  options: readonly Option[],
  value: string | number,
  extra: Extra = {},
) =>
  ({
    name,
    type: options.map(([option]) => option).join(" | "),
    default: String(value),
    control: { kind: "select", options },
    value,
    ...extra,
  }) satisfies PropDoc;

export const checklist = (
  name: string,
  options: readonly Option[],
  value: readonly string[],
  extra: Extra = {},
) =>
  ({
    name,
    type: `(${options.map(([option]) => option).join(" | ")})[]`,
    default: "All",
    control: { kind: "checklist", options },
    value,
    ...extra,
  }) satisfies PropDoc;

/**
 * The preset the settings match, if any. That is the preset whose settings, over the starting ones,
 * equal every current setting. A preset that sets some of what another sets is not mistaken for
 * it. Any change of a setting leaves the preset, because the settings are then the person's own.
 */
export function presetAt(
  presets: readonly Preset[],
  args: Record<string, unknown>,
  start: Record<string, unknown>,
) {
  // A checklist's value is a list, the same list in whatever order its items were chosen.
  const same = (value: unknown, wanted: unknown) =>
    Array.isArray(wanted)
      ? Array.isArray(value) &&
        value.length === wanted.length &&
        wanted.every((item) => value.includes(item))
      : value === wanted;
  return presets.find((preset) => {
    const wanted: Record<string, unknown> = { ...start, ...preset.args };
    return Object.keys({ ...wanted, ...args }).every((name) => same(args[name], wanted[name]));
  });
}

/** The playground's starting values, for every prop and example setting with a control. */
export function startingArgs(props: readonly PropDoc[]) {
  return Object.fromEntries(
    props.filter((prop) => prop.control).map((prop) => [prop.name, prop.value]),
  ) as Record<string, unknown>;
}
