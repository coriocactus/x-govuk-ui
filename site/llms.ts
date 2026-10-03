/**
 * The documentation for language models and coding agents. `/llms.txt` lists the components, as
 * llmstxt.org describes, each with a page of its own in Markdown at `/llms/<name>.md`.
 * `/llms-full.txt` contains every page in one file. `/docs/` contains the same as data for the MCP
 * server, which the package ships too. Everything is made from the catalogue, the parts' JSDoc,
 * the examples' source and the styling contracts, so it says what the workbench says.
 */
import { type ComponentName, catalogue, componentNames, groups, upstreamPage } from "./catalogue";
import { sources } from "./sources";
import { type StylingContract, stylingContracts } from "./styling";

/** A component's documentation as data, for the MCP server. */
export type ComponentDoc = {
  /** Such as `date-input`. */
  slug: ComponentName;
  /** Such as `Date input`. */
  name: string;
  /** The component's export, such as `DateInput`. */
  export: string;
  /**
   * The package it is imported from, which is `x-govuk-ui`, or an extension, which is
   * `@x-govuk-ui/jorjorwel`, `@x-govuk-ui/memetics` or `@x-govuk-ui/belsize`.
   */
  package: string;
  group: string;
  description: string;
  /** GOV.UK's own page for it, if GOV.UK has one. */
  upstream?: string;
  /** A first version whose API may still change. */
  experimental?: boolean;
  builtOn: string;
  /** What it does here, and what the workbench's example shows. */
  notes: string;
  props: { name: string; type: string; default: string; note?: string }[];
  parts: { name: string; doc?: string; classes: string[]; inner: string[] }[];
  styling: StylingContract;
  /** The component's page, as `/llms/<slug>.md` serves it. */
  markdown: string;
};

/** Every component in brief, with the words a search looks through, and the library's version. */
export type DocsIndex = {
  library: "x-govuk-ui";
  version: string;
  /** What every component shares, as `/llms.txt` says it. */
  usage: string;
  components: (Pick<
    ComponentDoc,
    "slug" | "name" | "export" | "package" | "group" | "description"
  > & {
    words: {
      parts: string[];
      props: string[];
      classes: string[];
      attributes: string[];
      properties: string[];
      notes: string;
    };
  })[];
};

const summary =
  "x-govuk-ui is a React component library based on the GOV.UK Design System. It is built on Base UI and Motion, and it is not an official GOV.UK project.";

const usage = `- React 19 and TypeScript. Import the components from \`x-govuk-ui\`, and its stylesheet once, from \`x-govuk-ui/styles.css\`.
- Extensions contain the components with large dependencies, such as \`@x-govuk-ui/memetics\`, the charts. Each is imported by its own name, with its own stylesheet after the library's, such as \`@x-govuk-ui/memetics/styles.css\`. Each component's page says which package it comes from.
- Components are composed from parts with flat names, such as \`AccordionItem\`. Every part that renders an element takes \`className\`, \`ref\` and any attribute of that element, and every link part takes \`render\` for a router's link.
- Fields are built from \`Field\`, \`Label\`, \`Hint\` and \`ErrorMessage\`, with GOV.UK's ids. \`Form\` checks a page of answers when it is sent, by the names the fields send, and shows GOV.UK's error summary. \`validateWith\` makes its check from a Standard Schema, such as one from Zod.
- The styles sit in the \`x-govuk-ui\` cascade layer, so a service's own rules override them. Each component's page lists its classes, the data attributes its styles respond to and its custom properties.
- Overlays stack in the order they open, the last on top, and toasts above them. Give the app's root \`isolation: isolate\`, so nothing in the page rises above an overlay.
- The components are light, as GOV.UK is, and dark under \`data-theme="dark"\`, which \`useTheme\` and \`ThemePicker\` set on the page's root or on one part of the page.
- GOV.UK's crown, wordmark, Royal Arms and GDS Transport are for official GOV.UK services only. The library ships the crown and wordmark, as \`GovukCrown\`, \`GovukWordmark\` and \`GovukLockup\`. It leaves out the GDS Transport font, and the Royal Arms, whose image a service gives by its address.`;

/** A table cell, with its pipes escaped. */
const cell = (text: string) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

/** Each part's JSDoc, by its export, as plain paragraphs. */
async function partDocs(): Promise<Map<string, string>> {
  const docs = new Map<string, string>();
  for (const file of [...new Bun.Glob("packages/*/src/*.tsx").scanSync(".")]) {
    const code = await Bun.file(file).text();
    for (const [, comment, name] of code.matchAll(
      /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export function (\w+)/g,
    ))
      docs.set(
        name ?? "",
        (comment ?? "")
          .split("\n")
          .map((line) => line.replace(/^\s*\*\s?/, ""))
          .filter((line) => !line.startsWith("@"))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim(),
      );
  }
  return docs;
}

/** Class names as code, with their dots, in a list. */
const selectors = (classes: readonly string[]) => classes.map((one) => `\`.${one}\``).join(", ");

/** A component's styling contract in Markdown. */
export function stylingMarkdown(contract: StylingContract) {
  const lines = [
    "Style any part from your own stylesheet. The library's rules sit in the `x-govuk-ui` cascade layer, so yours override them.",
    "",
    "### Classes",
    "",
    ...contract.parts.map(({ name, classes, inner }) => {
      const own = classes.length ? selectors(classes) : "no element of its own";
      const within = inner.length ? `. Inside: ${selectors(inner)}` : "";
      return `- \`${name}\`: ${own}${within}`;
    }),
  ];
  if (contract.states.length)
    lines.push(
      "",
      "### Data attributes",
      "",
      ...contract.states.map(({ attribute, values, classes, by }) => {
        const quoted = values.map((value) => `\`"${value}"\``).join(" or ");
        const as = values.length ? `, as ${quoted}` : "";
        return `- \`${attribute}\`${as}, on ${selectors(classes)}. Set by ${by}.`;
      }),
    );
  if (contract.properties.length)
    lines.push(
      "",
      "### Custom properties",
      "",
      ...contract.properties.map(({ name, value, classes, inline }) => {
        const worth = value ? `: \`${value}\`` : "";
        const where = classes.length ? `, on ${selectors(classes)}` : "";
        const written = inline
          ? " The component writes it on the element, from a prop or a measurement, and what it writes overrides your stylesheet."
          : "";
        return `- \`${name}\`${worth}${where}.${written}`;
      }),
    );
  if (contract.tokens.length)
    lines.push(
      "",
      "### Theme tokens",
      "",
      `It reads ${contract.tokens.map((token) => `\`${token}\``).join(", ")}. Changing a token changes every component that reads it.`,
    );
  return lines.join("\n");
}

/** The library's own package. Every other package under `packages/` is an extension of it. */
const core = "x-govuk-ui";

/** Which package each export comes from, read from each package's name and index. */
async function exportPackages(): Promise<Map<string, string>> {
  const owners = new Map<string, string>();
  for (const manifest of new Bun.Glob("packages/*/package.json").scanSync(".")) {
    const { name } = await Bun.file(manifest).json();
    const index = await Bun.file(manifest.replace("package.json", "src/index.ts")).text();
    for (const [, names] of index.matchAll(/export\s*\{([^}]*)\}\s*from/g))
      for (const part of (names ?? "").split(","))
        owners.set(
          part
            .replace(/^\s*type\s+/, "")
            .split(" as ")
            .at(-1)
            ?.trim() ?? "",
          name,
        );
  }
  return owners;
}

/** A component's page. */
function componentMarkdown(
  name: ComponentName,
  contract: StylingContract,
  docs: Map<string, string>,
  source: string,
  from: string,
) {
  const entry = catalogue[name];
  const about = [
    `Group: ${entry.group}.`,
    `Built on: ${entry.dependencies}.`,
    from === core
      ? `Import it from \`${from}\`.`
      : `Import it from \`${from}\`, an extension, with its stylesheet, \`${from}/styles.css\`, after x-govuk-ui's.`,
  ];
  if (entry.experimental) about.push("Experimental: a first version whose API may yet change.");
  if (entry.upstream) about.push(`GOV.UK's own: ${upstreamPage(entry.upstream)}`);
  const parts = contract.parts
    .filter((part) => docs.get(part.name))
    .map((part) => `- \`${part.name}\`: ${docs.get(part.name)}`);
  return [
    `# ${entry.name}`,
    "",
    `> ${entry.description}`,
    "",
    about.join(" "),
    "",
    "## What it does here",
    "",
    entry.changes,
    ...(parts.length ? ["", "## Parts", "", ...parts] : []),
    "",
    "## Props",
    "",
    "| Prop | Type | Default |",
    "| --- | --- | --- |",
    ...entry.props.map(
      (prop) =>
        `| \`${prop.name}\` | ${cell(prop.type)}${prop.note ? `. ${cell(prop.note)}` : ""} | ${cell(prop.default)} |`,
    ),
    "",
    "## Example",
    "",
    "The workbench's example, which renders the preview.",
    "",
    "```tsx",
    source.trimEnd(),
    "```",
    "",
    "## Styling",
    "",
    stylingMarkdown(contract),
    "",
  ].join("\n");
}

/** Every component's documentation, in the sidebar's order. */
export async function componentDocs(
  contracts?: Record<ComponentName, StylingContract>,
): Promise<ComponentDoc[]> {
  const styling = contracts ?? (await stylingContracts());
  const docs = await partDocs();
  const owners = await exportPackages();
  const flat = (name: string) => name.toLowerCase().replaceAll("-", "");
  return Promise.all(
    componentNames.map(async (slug) => {
      const entry = catalogue[slug];
      const contract = styling[slug];
      const source = await Bun.file(sources[slug]).text();
      const exported =
        contract.parts.find((part) => flat(part.name) === flat(slug))?.name ??
        contract.parts[0]?.name ??
        entry.name.replaceAll(" ", "");
      const from = owners.get(exported) ?? core;
      return {
        slug,
        name: entry.name,
        export: exported,
        package: from,
        group: entry.group,
        description: entry.description,
        ...(entry.upstream && {
          upstream: upstreamPage(entry.upstream),
        }),
        ...(entry.experimental && { experimental: true }),
        builtOn: entry.dependencies,
        notes: entry.changes,
        props: entry.props.map(({ name, type, default: fallback, note }) => ({
          name,
          type,
          default: fallback,
          ...(note && { note }),
        })),
        parts: contract.parts.map((part) => ({ ...part, doc: docs.get(part.name) })),
        styling: contract,
        markdown: componentMarkdown(slug, contract, docs, source, from),
      };
    }),
  );
}

/** The MCP server's documents, by their paths, `docs/index.json` and each `docs/<slug>.json`. */
export async function docsDocuments(records?: ComponentDoc[]): Promise<Record<string, string>> {
  const all = records ?? (await componentDocs());
  const { version } = await Bun.file("packages/core/package.json").json();
  const index: DocsIndex = {
    library: "x-govuk-ui",
    version,
    usage,
    components: all.map((doc) => ({
      slug: doc.slug,
      name: doc.name,
      export: doc.export,
      package: doc.package,
      group: doc.group,
      description: doc.description,
      words: {
        parts: doc.parts.map((part) => part.name),
        props: doc.props.map((prop) => prop.name),
        classes: doc.parts.flatMap((part) => [...part.classes, ...part.inner]),
        attributes: doc.styling.states.map((state) => state.attribute),
        properties: doc.styling.properties.map((property) => property.name),
        notes: doc.notes,
      },
    })),
  };
  return {
    "docs/index.json": JSON.stringify(index),
    ...Object.fromEntries(all.map((doc) => [`docs/${doc.slug}.json`, JSON.stringify(doc)])),
  };
}

/**
 * Every document for language models, by the path the site serves it at, which is `llms.txt`,
 * `llms-full.txt` or a component's `llms/<name>.md`.
 */
export async function llmsDocuments(records?: ComponentDoc[]): Promise<Record<string, string>> {
  const all = records ?? (await componentDocs());
  const pages = Object.fromEntries(all.map((doc) => [doc.slug, doc.markdown])) as Record<
    ComponentName,
    string
  >;
  const index = [
    "# x-govuk-ui",
    "",
    `> ${summary}`,
    "",
    `It has ${componentNames.length} components for GOV.UK services. Each page below gives a component's description, parts, props, an example and its styling contract.`,
    "",
    usage,
    ...groups.flatMap((group) => [
      "",
      `## ${group}`,
      "",
      ...componentNames
        .filter((name) => catalogue[name].group === group)
        .map(
          (name) => `- [${catalogue[name].name}](/llms/${name}.md): ${catalogue[name].description}`,
        ),
    ]),
    "",
    "## Optional",
    "",
    "- [Every page in one file](/llms-full.txt): the pages above, one after another.",
    "",
  ].join("\n");
  const full = [
    "# x-govuk-ui",
    "",
    `> ${summary}`,
    "",
    usage,
    "",
    ...componentNames.map((name) => pages[name].replace(/^#/gm, "##")),
  ].join("\n");
  return {
    "llms.txt": index,
    "llms-full.txt": full,
    ...Object.fromEntries(componentNames.map((name) => [`llms/${name}.md`, pages[name]])),
  };
}
