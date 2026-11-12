/**
 * The documentation for language models and coding agents. `/llms.txt` lists the components, as
 * llmstxt.org describes, each with a page of its own in Markdown at `/llms/<name>.md`.
 * `/llms-full.txt` contains every page in one file. `/docs/` contains the same as data for the MCP
 * server, which the package ships too. Everything is made from the catalogue, the library's API as
 * the compiler reads it, the examples' source and the styling contracts, so it says what the
 * workbench says.
 */
import {
  type ApiFunction,
  type ApiLabels,
  type ApiMember,
  type ApiProp,
  type ApiType,
  readApi,
} from "./api";
import { type ComponentName, catalogue, componentNames, groups, upstreamPage } from "./catalogue";
import { sources } from "./sources";
import { type StylingContract, stylingContracts } from "./styling";

/** A hook, function or constant, as the pages and the records give it. */
export type DocFunction = Omit<ApiFunction, "file">;

/** A type, as the pages and the records give it. */
export type DocType = Omit<ApiType, "file">;

/** One component's words, as the pages and the records give them. */
export type DocWords = Omit<ApiLabels, "file">;

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
  /** The own props of the component's own export, which `parts` gives with every other part's. */
  props: ApiProp[];
  /** Every part, in the source's order, each with the props the library's source declares. */
  parts: {
    name: string;
    doc?: string;
    classes: string[];
    inner: string[];
    /** The exported type of its props, such as `DialogProps`, where they have one. */
    propsType?: string;
    props: ApiProp[];
  }[];
  /** The hooks, functions and constants that go with the component. */
  functions: DocFunction[];
  /**
   * The types that go with the component. Each part's props, and each map of words, has its type
   * by name alone, because the record gives its members as the props and the words.
   */
  types: DocType[];
  /**
   * The words its parts write, by their key in a LabelsProvider's `labels`. A part's own `labels`
   * takes the same words.
   */
  words: DocWords[];
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
  /** The hooks, functions and constants on no component's page, which `usage` lists. */
  functions: DocFunction[];
  components: (Pick<
    ComponentDoc,
    "slug" | "name" | "export" | "package" | "group" | "description"
  > & {
    words: {
      parts: string[];
      props: string[];
      functions: string[];
      classes: string[];
      attributes: string[];
      properties: string[];
      notes: string;
    };
  })[];
};

const summary =
  "x-govuk-ui is a React component library based on the GOV.UK Design System. It is built on Base UI and Motion, and it is not an official GOV.UK project.";

const shared = `- React 19 and TypeScript. Import the components from \`x-govuk-ui\`, and its stylesheet once, from \`x-govuk-ui/styles.css\`.
- Extensions contain the components with large dependencies, such as \`@x-govuk-ui/memetics\`, the charts. Each is imported by its own name, with its own stylesheet after the library's, such as \`@x-govuk-ui/memetics/styles.css\`. Each component's page says which package it comes from.
- Components are composed from parts with flat names, such as \`AccordionItem\`. Every part that renders an element takes \`className\`, \`ref\` and any attribute of that element, and every link part takes \`render\` for a router's link.
- A page is \`ServicePage\`, or \`Page\` for another layout. ServicePage puts the content in GOV.UK's two-thirds column, with a Back link from \`back\` above it. Put a Back link or Breadcrumbs in \`back\` or \`beforeContent\`, not in the content, so it keeps GOV.UK's space around it. Head a page and its sections with \`Heading\`. Give a page one of \`level\` 1, which is its \`h1\`, and its headings in order.
- No part sets space outside its own box. The box it sits in sets the space between its parts. \`MainWrapper\`, \`GridColumn\`, \`Form\`, \`DialogContent\`, \`SheetContent\`, \`TabsPanel\`, \`SidePanelBody\` and Tiles' \`TileContent\` space their parts already. Inside anything else, such as a \`section\` of your own, set parts one beneath another in a \`Stack\`, and side by side in an \`Inline\`. Their \`gap\` is GOV.UK's spacing scale, from 0 to 9, which is 0, 5, 10, 15, 20, 25, 30, 40, 50 and 60 pixels. \`gap={4}\`, 20 pixels, suits the parts of a card or a panel, and \`gap={6}\`, 30 pixels, the sections of a page. Do not space parts with margins or inline styles. \`--x-govuk-ui-space-page\` and \`--x-govuk-ui-space-surface\` change the space everywhere, and \`--x-govuk-ui-stack-gap\` changes it in one box.
- A box that spaces its parts is a flex column, so put running text in a paragraph, or in \`Prose\`, which spaces headings, paragraphs and lists as GOV.UK does. Text and a link loose in such a box would each take a line. An element of your own around parts, such as a \`form\`, keeps them apart from the box's spacing, so make it a Stack, as \`<Stack gap={4} render={<form />}>\`, or use \`Form\`, which keeps a page's space between its fields.
- Put buttons that belong together in a \`ButtonGroup\`, which stacks them on a phone, and a field with its button in an \`Inline\`. A tile's content keeps 16 pixels of space around it, and \`padded={false}\` lets a table or a chart reach the tile's edges.
- Fields are built from \`Field\`, \`Label\`, \`Hint\` and \`ErrorMessage\`, with GOV.UK's ids. \`Form\` checks a page of answers when it is sent, by the names the fields send, and shows GOV.UK's error summary. \`validateWith\` makes its check from a Standard Schema, such as one from Zod.
- The components write their own words in English, such as Pagination's Previous and Next. \`LabelsProvider\` gives every component inside it the words of a service's language, such as Welsh, by component, with the \`locale\` that dates and numbers are written in. A component's own \`labels\` come first, then the nearest provider's words, then the English defaults. Each component's page lists its words, with their defaults, under the key that a provider's \`labels\` takes them by.
- The styles sit in the \`x-govuk-ui\` cascade layer, and an extension's in \`x-govuk-ui-extensions\`, after it, so a service's own rules override them. Each component's page lists its classes, the data attributes its styles respond to and its custom properties.
- Overlays stack in the order they open, the last on top, and toasts above them. Give the app's root \`isolation: isolate\`, so nothing in the page rises above an overlay.
- The components are light, as GOV.UK is, and dark under \`data-theme="dark"\`, which \`useTheme\` and \`ThemePicker\` set on the page's root or on one part of the page.
- GOV.UK's crown, wordmark, Royal Arms and GDS Transport are for official GOV.UK services only. The library ships the crown and the lock-up, the crown beside the wordmark, as \`GOVUKCrown\` and \`GOVUKLockup\`. It leaves out the GDS Transport font, and the Royal Arms, whose image a service gives by its address.
- Without GDS Transport, the components fall back to Noto Sans, then Arial. Noto Sans is the typeface for a service outside GOV.UK. Windows, macOS and iOS do not have it, so serve it, such as its weights 400 and 700 from \`@fontsource/noto-sans\`, whose family is \`Noto Sans\`, or set \`--x-govuk-ui-font\` to another.`;

/** A table cell, with its pipes escaped. */
const cell = (text: string) => text.replaceAll("|", "\\|").replaceAll("\n", " ");

/** Code in a line of text, such as a type. Code that has a backtick takes two around it. */
const asCode = (text: string) => (text.includes("`") ? `\`\` ${text} \`\`` : `\`${text}\``);

/** The first sentence of a JSDoc comment. */
const firstSentence = (doc = "") => doc.match(/^.*?[.?!](?=\s|$)/s)?.[0] ?? doc;

/** A type's members or a part's props, as a list beneath the item that has them. */
const membersList = (members: readonly ApiMember[]) =>
  members.map(
    ({ name, type, required, doc }) =>
      `    - \`${name}\`, ${asCode(type)}${required ? ", required" : ""}.${doc ? ` ${doc.replaceAll("\n", " ")}` : ""}`,
  );

/**
 * What every component shares, as `/llms.txt` and the MCP server's `get_usage` say it. It ends
 * with whatever the packages export that is on no component's page.
 */
function usageText({ functions, types }: Pick<LibraryDocs, "functions" | "types">) {
  return [
    shared,
    "- These hooks, functions and constants belong to no one component, so no component's page has them:",
    ...functions.map(
      ({ name, package: from, signature, doc }) =>
        `  - \`${name}\`, from \`${from}\`, is ${asCode(signature)}. ${firstSentence(doc)}`,
    ),
    "- These types are on no component's page:",
    ...types.flatMap(({ name, parameters = "", package: from, doc, members, type }) =>
      members
        ? [
            `  - \`${name}${parameters}\`, from \`${from}\`.${doc ? ` ${firstSentence(doc)}` : ""} Its members:`,
            ...membersList(members),
          ]
        : [
            `  - \`${name}${parameters}\`, from \`${from}\`, is ${asCode(type ?? "")}.${doc ? ` ${firstSentence(doc)}` : ""}`,
          ],
    ),
  ].join("\n");
}

/** A part's own props as a table, or a line where it has none. */
function propsMarkdown(props: readonly ApiProp[]) {
  if (!props.length) return ["It has no props of its own."];
  return [
    "| Prop | Type | Default | What it does |",
    "| --- | --- | --- | --- |",
    ...props.map(({ name, type, required, default: fallback, doc = "" }) => {
      const start = fallback === undefined ? (required ? "Required" : "") : asCode(fallback);
      return `| \`${name}\` | ${cell(asCode(type))} | ${cell(start)} | ${cell(doc)} |`;
    }),
  ];
}

/** A type's members as a table, or the type as the compiler writes it. */
function typeMarkdown({ members, type }: DocType) {
  if (!members) return [asCode(type ?? "")];
  return [
    "| Member | Type | Required | What it is |",
    "| --- | --- | --- | --- |",
    ...members.map(
      ({ name, type, required, doc = "" }) =>
        `| \`${name}\` | ${cell(asCode(type))} | ${required ? "Yes" : "No"} | ${cell(doc)} |`,
    ),
  ];
}

/** A map of words as a table, each word with its English default. */
function wordsMarkdown({ words }: DocWords) {
  return [
    "| Word | Type | Default | What it says |",
    "| --- | --- | --- | --- |",
    ...words.map(({ name, type, default: fallback, code: written, doc = "" }) => {
      const start =
        fallback === undefined
          ? ""
          : asCode(written ? fallback.replace(/\s+/g, " ") : JSON.stringify(fallback));
      return `| \`${name}\` | ${cell(asCode(type))} | ${cell(start)} | ${cell(doc)} |`;
    }),
  ];
}

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
    "Style any part from your own stylesheet. The library's rules sit in the `x-govuk-ui` and `x-govuk-ui-extensions` cascade layers, so yours override them.",
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
  {
    slug,
    parts: allParts,
    functions,
    types,
    words,
    styling,
    package: from,
  }: Omit<ComponentDoc, "markdown">,
  source: string,
) {
  const entry = catalogue[slug];
  const about = [
    `Group: ${entry.group}.`,
    `Built on: ${entry.dependencies}.`,
    from === core
      ? `Import it from \`${from}\`.`
      : `Import it from \`${from}\`, an extension, with its stylesheet, \`${from}/styles.css\`, after x-govuk-ui's.`,
  ];
  if (entry.experimental) about.push("Experimental: a first version whose API may yet change.");
  if (entry.upstream) about.push(`GOV.UK's own: ${upstreamPage(entry.upstream)}`);
  const parts = allParts
    .filter((part) => part.doc)
    .map((part) => `- \`${part.name}\`: ${part.doc}`);
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
    "Each part's own props. A part that renders an element takes that element's attributes too.",
    ...allParts.flatMap((part) => [
      "",
      `### \`${part.name}\``,
      "",
      ...(part.propsType ? [`The type of its props is \`${part.propsType}\`.`, ""] : []),
      ...propsMarkdown(part.props),
    ]),
    "",
    ...(functions.length
      ? [
          "## Hooks, functions and constants",
          ...functions.flatMap(({ name, signature, doc }) => [
            "",
            `### \`${name}\``,
            "",
            asCode(signature),
            ...(doc ? ["", doc] : []),
          ]),
          "",
        ]
      : []),
    ...(types.length
      ? [
          "## Types",
          ...types.flatMap((type) => [
            "",
            `### \`${type.name}${type.parameters ?? ""}\``,
            ...(type.doc ? ["", type.doc] : []),
            "",
            ...typeMarkdown(type),
          ]),
          "",
        ]
      : []),
    ...(words.length
      ? [
          "## Words",
          "",
          "The words its parts write, with their English defaults. Give your own in a `LabelsProvider`, under each key below, or in the `labels` of a part that takes them.",
          ...words.flatMap((map) => [
            "",
            `### \`${map.key}\``,
            "",
            `Their type is \`${map.type}\`, and their defaults are \`${map.defaults}\`.`,
            "",
            ...wordsMarkdown(map),
          ]),
          "",
        ]
      : []),
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
    stylingMarkdown(styling),
    "",
  ].join("\n");
}

/** Every component's documentation, and whatever the packages export that is on no page. */
export type LibraryDocs = {
  /** In the sidebar's order. */
  components: ComponentDoc[];
  /** The hooks, functions and constants on no component's page. */
  functions: DocFunction[];
  /** The types on no component's page. */
  types: DocType[];
};

/**
 * The library's documentation. A component's page has every part the styling contract gives the
 * component, with each part's own props.
 *
 * - A hook, function or constant is on the page of each component with a part declared in its
 *   source file, and on each page whose entry in the catalogue names it.
 * - A type is on the page of each component with a part declared in its source file. It is also on
 *   each page that names it, in a prop's type, a hook's signature, a word's type or another type
 *   there, so a page that gives `items` as `TreeNode[]` says what a `TreeNode` has. The type of a
 *   part's props, or of a map of words, is not shown again, because the page gives its members as
 *   the props or the words.
 * - A map of words is on the page of each component with a part that takes it in `labels`. Many
 *   parts take their words from a LabelsProvider alone, so no `labels` says which map is theirs.
 *   A map that no part takes in `labels` is on the page of each component with a part declared in
 *   the file that declares the map's defaults.
 */
export async function libraryDocs(
  contracts?: Record<ComponentName, StylingContract>,
): Promise<LibraryDocs> {
  const [styling, api, docs, owners] = await Promise.all([
    contracts ?? stylingContracts(),
    readApi(),
    partDocs(),
    exportPackages(),
  ]);
  const flat = (name: string) => name.toLowerCase().replaceAll("-", "");
  const taken = new Set(Object.values(api.components).flatMap((part) => part.labels));
  // The types a page gives by name alone, with its parts' props and its words.
  const given = new Set([
    ...Object.values(api.components).map((part) => part.propsType),
    ...api.labels.map((map) => map.type),
  ]);
  const types = new Map(
    api.types.flatMap((type) => (given.has(type.name) ? [] : [[type.name, type]])),
  );
  const components = await Promise.all(
    componentNames.map(async (slug) => {
      const entry = catalogue[slug];
      const contract = styling[slug];
      const source = await Bun.file(sources[slug]).text();
      // In the source's order, which is each file's own, and the files by name.
      const parts = [
        ...contract.parts,
        ...contract.unstyled.map((name) => ({ name, classes: [], inner: [] })),
      ]
        .map((part) => ({ ...part, ...api.components[part.name] }))
        .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.at - b.at));
      const exported =
        parts.find((part) => flat(part.name) === flat(slug))?.name ??
        parts[0]?.name ??
        entry.name.replaceAll(" ", "");
      const from = owners.get(exported) ?? core;
      const files = new Set(parts.map((part) => part.file));
      const takes = new Set(parts.flatMap((part) => part.labels));
      const values = api.functions.filter(
        ({ name, file }) => files.has(file) || entry.shows?.some((one) => one === name),
      );
      const words = api.labels.filter(
        ({ key, file }) => takes.has(key) || (!taken.has(key) && files.has(file)),
      );
      // The types the page names, and the types those name in turn.
      const named = new Set<string>();
      const read = (texts: readonly (string | undefined)[]) => {
        for (const name of texts.flatMap((text) => text?.match(/[\w$]+/g) ?? [])) {
          const type = types.get(name);
          if (!type || named.has(name)) continue;
          named.add(name);
          read(type.members?.map((member) => member.type) ?? [type.type]);
        }
      };
      read([
        ...parts.flatMap((part) => part.props.map((prop) => prop.type)),
        ...values.map((value) => value.signature),
        ...words.flatMap((map) => map.words.map((word) => word.type)),
        ...api.types.flatMap(({ name, file }) => (files.has(file) ? [name] : [])),
      ]);
      const record = {
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
        props: parts.find((part) => part.name === exported)?.props ?? [],
        parts: parts.map(({ name, classes, inner, propsType, props }) => ({
          name,
          doc: docs.get(name),
          classes,
          inner,
          ...(propsType && { propsType }),
          props,
        })),
        functions: values.map(({ file, ...rest }) => rest),
        types: api.types.filter(({ name }) => named.has(name)).map(({ file, ...rest }) => rest),
        words: words.map(({ file, ...rest }) => rest),
        styling: contract,
      };
      return { ...record, markdown: componentMarkdown(record, source) };
    }),
  );
  const shown = new Set(
    components.flatMap((doc) => [...doc.functions, ...doc.types].map(({ name }) => name)),
  );
  return {
    components,
    functions: api.functions
      .filter(({ name }) => !shown.has(name))
      .map(({ file, ...rest }) => rest),
    types: [...types.values()]
      .filter(({ name }) => !shown.has(name))
      .map(({ file, ...rest }) => rest),
  };
}

/** The MCP server's documents, by their paths, `docs/index.json` and each `docs/<slug>.json`. */
export async function docsDocuments(library?: LibraryDocs): Promise<Record<string, string>> {
  const { components: all, functions, types } = library ?? (await libraryDocs());
  const { version } = await Bun.file("packages/core/package.json").json();
  const index: DocsIndex = {
    library: "x-govuk-ui",
    version,
    usage: usageText({ functions, types }),
    functions,
    components: all.map((doc) => ({
      slug: doc.slug,
      name: doc.name,
      export: doc.export,
      package: doc.package,
      group: doc.group,
      description: doc.description,
      words: {
        parts: doc.parts.map((part) => part.name),
        props: [...new Set(doc.parts.flatMap((part) => part.props.map((prop) => prop.name)))],
        functions: doc.functions.map(({ name }) => name),
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

/** A part's own props, as the playground lists those it has no control for. */
export type PartProps = { name: string; props: ApiProp[] };

/** Each part's own props, for the playground, by the path the site serves them at. */
export function propsDocuments({ components }: LibraryDocs): Record<string, string> {
  return Object.fromEntries(
    components.map(({ slug, parts }) => [
      `props/${slug}.json`,
      JSON.stringify(parts.map(({ name, props }): PartProps => ({ name, props }))),
    ]),
  );
}

/**
 * Every document for language models, by the path the site serves it at, which is `llms.txt`,
 * `llms-full.txt` or a component's `llms/<name>.md`.
 */
export async function llmsDocuments(library?: LibraryDocs): Promise<Record<string, string>> {
  const { components: all, functions, types } = library ?? (await libraryDocs());
  const usage = usageText({ functions, types });
  const pages = Object.fromEntries(all.map((doc) => [doc.slug, doc.markdown])) as Record<
    ComponentName,
    string
  >;
  const index = [
    "# x-govuk-ui",
    "",
    `> ${summary}`,
    "",
    `It has ${componentNames.length} components for GOV.UK services. Each page below gives a component's description, its parts and each part's props, its hooks, functions, constants and types, its words, an example and its styling contract.`,
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
