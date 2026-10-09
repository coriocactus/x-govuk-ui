import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { packages } from "./stage";

// What changed in the packages' API since a version on npm. It compares this checkout's build with
// that version's packages, as npm serves them. It compares each package's exports, and each
// component's documented props and styling contract, from the documentation core ships in
// dist/lib/docs. A removed or narrowed name is breaking. A changed custom property's value is
// probably visual. Run `bun run build:lib` first.
//
//   bun scripts/api-diff.ts 0.2.0

/** One change to a package's API. */
export type ApiChange = {
  /** The package's name, such as `x-govuk-ui`. */
  package: string;
  /** Breaking for a service, probably visual, or added. */
  kind: "breaking" | "visual" | "added";
  /** What changed, in words. */
  what: string;
};

type Prop = { name: string; type: string; default: string };
type Styling = {
  parts: { name: string; classes: string[]; inner: string[] }[];
  states: { attribute: string; values: string[] }[];
  properties: { name: string; value?: string }[];
};
type Doc = { slug: string; name: string; package: string; props: Prop[]; styling: Styling };

/** The names a package's index exports, values and types alike. */
async function exportsOf(directory: string) {
  const file = Bun.file(join(directory, "dist/lib/index.d.ts"));
  if (!(await file.exists())) return new Set<string>();
  const names = new Set<string>();
  for (const [, list] of (await file.text()).matchAll(/export \{([^}]*)\}/g))
    for (const name of (list ?? "").split(","))
      if (name.trim()) names.add(name.trim().replace(/^type /, ""));
  return names;
}

/** Each component's documentation, by its slug, from a copy of core. */
async function docsOf(core: string) {
  const directory = join(core, "dist/lib/docs");
  const docs = new Map<string, Doc>();
  for (const file of await readdir(directory))
    if (file.endsWith(".json") && file !== "index.json") {
      const doc: Doc = await Bun.file(join(directory, file)).json();
      docs.set(doc.slug, doc);
    }
  return docs;
}

/** The choices of a type written as a union of words, such as `primary | secondary`, or none. */
function choices(type: string) {
  const parts = type.split("|").map((part) => part.trim());
  return parts.length > 1 && parts.every((part) => /^[\w-]+$/.test(part)) ? parts : null;
}

/**
 * A component's props, one for each name. The documentation lists some props together, such as
 * `value / defaultValue / onValueChange`, with one type for the group, so a grouped prop is
 * compared by its name alone.
 */
function propsOf(doc: Doc) {
  const props = new Map<string, Prop & { grouped: boolean }>();
  for (const prop of doc.props) {
    const names = prop.name.split(" / ");
    for (const name of names) props.set(name, { ...prop, name, grouped: names.length > 1 });
  }
  return props;
}

/** The changes between two versions of a component's documentation. */
function compareDocs(before: Doc, after: Doc | undefined, add: (change: ApiChange) => void) {
  const where = before.package;
  const breaking = (what: string) => add({ package: where, kind: "breaking", what });
  if (!after) return breaking(`removed ${before.name}`);
  const props = propsOf(after);
  const was = propsOf(before);
  for (const prop of was.values()) {
    const now = props.get(prop.name);
    if (!now) breaking(`removed ${before.name}'s \`${prop.name}\` prop`);
    else if (!prop.grouped && !now.grouped) {
      const was = choices(prop.type);
      const is = choices(now.type);
      const lost = was && is ? was.filter((choice) => !is.includes(choice)) : [];
      if (lost.length)
        breaking(
          `removed ${lost.map((choice) => `\`${choice}\``).join(", ")} from ${before.name}'s \`${prop.name}\``,
        );
      else if (!was && prop.type !== now.type)
        breaking(
          `changed ${before.name}'s \`${prop.name}\` from \`${prop.type}\` to \`${now.type}\``,
        );
      if (prop.default !== now.default)
        breaking(
          `changed ${before.name}'s \`${prop.name}\` default from ${prop.default} to ${now.default}`,
        );
    }
  }
  for (const prop of props.values())
    if (!was.has(prop.name))
      add({ package: where, kind: "added", what: `added ${after.name}'s \`${prop.name}\` prop` });

  const classes = (styling: Styling) =>
    new Set(styling.parts.flatMap((part) => [...part.classes, ...part.inner]));
  const nowClasses = classes(after.styling);
  for (const name of classes(before.styling))
    if (!nowClasses.has(name)) breaking(`removed ${before.name}'s class \`.${name}\``);
  const states = new Map(after.styling.states.map((state) => [state.attribute, state]));
  for (const state of before.styling.states) {
    const now = states.get(state.attribute);
    if (!now) breaking(`removed ${before.name}'s \`${state.attribute}\``);
    else
      for (const value of state.values)
        if (!now.values.includes(value))
          breaking(`removed ${before.name}'s \`${state.attribute}="${value}"\``);
  }
  const properties = new Map(after.styling.properties.map((property) => [property.name, property]));
  for (const property of before.styling.properties) {
    const now = properties.get(property.name);
    if (!now) breaking(`removed ${before.name}'s custom property \`${property.name}\``);
    else if (property.value !== now.value)
      add({
        package: where,
        kind: "visual",
        what: `changed ${before.name}'s \`${property.name}\` from \`${property.value}\` to \`${now.value}\``,
      });
  }
}

/** Every change to the packages' API since a version on npm. Packages not on npm are left out. */
export async function apiDiff(version: string): Promise<ApiChange[]> {
  const into = await mkdtemp(join(tmpdir(), "x-govuk-ui-api-"));
  const changes: ApiChange[] = [];
  const add = (change: ApiChange) => changes.push(change);
  for (const directory of packages) {
    const { name } = await Bun.file(`${directory}/package.json`).json();
    const pack = Bun.spawnSync([
      "npm",
      "pack",
      `${name}@${version}`,
      "--pack-destination",
      into,
      "--silent",
    ]);
    const tarball = pack.stdout.toString().trim().split("\n").at(-1);
    if (pack.exitCode !== 0 || !tarball) continue;
    const unpacked = join(into, name.replace("/", "-"));
    Bun.spawnSync(["mkdir", "-p", unpacked]);
    Bun.spawnSync(["tar", "xzf", join(into, tarball), "-C", unpacked]);
    const published = join(unpacked, "package");

    const [was, is] = await Promise.all([exportsOf(published), exportsOf(directory)]);
    for (const exported of was)
      if (!is.has(exported))
        add({ package: name, kind: "breaking", what: `removed the export \`${exported}\`` });
    for (const exported of is)
      if (!was.has(exported))
        add({ package: name, kind: "added", what: `added the export \`${exported}\`` });

    if (directory === "packages/core") {
      const [before, after] = await Promise.all([docsOf(published), docsOf(directory)]);
      for (const doc of before.values()) compareDocs(doc, after.get(doc.slug), add);
      for (const doc of after.values())
        if (!before.has(doc.slug))
          add({ package: doc.package, kind: "added", what: `added ${doc.name}` });
    }
  }
  return changes;
}

if (import.meta.main) {
  const version = process.argv[2] ?? (await Bun.file("packages/core/package.json").json()).version;
  const changes = await apiDiff(version);
  if (!changes.length) console.log(`No API changes since ${version}.`);
  for (const kind of ["breaking", "visual", "added"] as const) {
    const found = changes.filter((change) => change.kind === kind);
    if (!found.length) continue;
    console.log(
      `\n${{ breaking: "Breaking", visual: "Probably visual", added: "Added" }[kind]} since ${version}:`,
    );
    for (const change of found) console.log(`- ${change.package}: ${change.what}`);
  }
}
