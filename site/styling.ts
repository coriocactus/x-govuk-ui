/**
 * Each component's styling contract, read from the library's source as the site builds, so it is
 * never out of step. It lists the classes on its parts and on the elements inside them, the data
 * attributes its styles respond to, and the custom properties it reads. A service styles the
 * components through these, from its own stylesheet, which overrides the library's `x-govuk-ui`
 * layer.
 */
import { type ComponentName, componentNames } from "./catalogue";

/** One of a component's exported parts. */
export type StylingPart = {
  /** The part's export, such as `AccordionItem`. */
  name: string;
  /** The classes on the element the part renders, which a `className` of yours joins. */
  classes: string[];
  /** The classes on elements inside the part, reached through the part's own class. */
  inner: string[];
};

/** A data attribute the component's styles respond to. */
export type StylingState = {
  /** Such as `data-open`. */
  attribute: string;
  /**
   * The values its styles match, such as `top` for `data-side`. None for one that is either set or
   * not.
   */
  values: string[];
  /** The classes of the elements it is on. */
  classes: string[];
  /** Whether the library or Base UI sets it, as documented for the Base UI part beneath. */
  by: "x-govuk-ui" | "Base UI";
};

/** A custom property of the component's own. */
export type StylingProperty = {
  /** Such as `--x-govuk-ui-avatar-size`. */
  name: string;
  /** Its value where the component declares it, if it does. */
  value?: string;
  /** The classes of the elements it applies to. */
  classes: string[];
  /**
   * The component writes it on the element itself, from a prop or a measurement, and a value it
   * writes there overrides a stylesheet's.
   */
  inline: boolean;
};

export type StylingContract = {
  parts: StylingPart[];
  states: StylingState[];
  properties: StylingProperty[];
  /** The theme's tokens the component reads, which change every component that reads them. */
  tokens: string[];
};

// Reading the source.

/** Where the quoted text, template or comment starting at `at` ends, or `at` if none does. */
function skip(code: string, at: number): number {
  const char = code[at];
  if (char === "/" && code[at + 1] === "/") {
    const end = code.indexOf("\n", at);
    return end === -1 ? code.length : end;
  }
  if (char === "/" && code[at + 1] === "*") {
    const end = code.indexOf("*/", at + 2);
    return end === -1 ? code.length : end + 2;
  }
  if (char === '"' || char === "'") {
    let index = at + 1;
    while (index < code.length && code[index] !== char) index += code[index] === "\\" ? 2 : 1;
    return index + 1;
  }
  if (char === "`") {
    let index = at + 1;
    while (index < code.length && code[index] !== "`") {
      if (code[index] === "\\") index += 2;
      else if (code[index] === "$" && code[index + 1] === "{") index = close(code, index + 1) + 1;
      else index += 1;
    }
    return index + 1;
  }
  return at;
}

/** The code with its comments left out, so a name a comment mentions is not taken as used. */
function withoutComments(code: string) {
  let kept = "";
  let index = 0;
  while (index < code.length) {
    const end = skip(code, index);
    const comment = code[index] === "/" && (code[index + 1] === "/" || code[index + 1] === "*");
    if (end === index) {
      kept += code[index];
      index += 1;
    } else {
      if (!comment) kept += code.slice(index, end);
      index = end;
    }
  }
  return kept;
}

/**
 * Each of the library's custom properties a value reads, with the fallback it is read with, if any.
 * A fallback can itself read a property, as in `var(--a, var(--b))`, so brackets are matched.
 */
function varsIn(value: string): [string, string | undefined][] {
  const found: [string, string | undefined][] = [];
  for (const match of value.matchAll(/var\((--x-govuk-ui-[\w-]+)\s*/g)) {
    const name = match[1] ?? "";
    let at = (match.index ?? 0) + match[0].length;
    if (value[at] !== ",") {
      found.push([name, undefined]);
      continue;
    }
    let depth = 0;
    const start = at + 1;
    for (; at < value.length; at++) {
      if (value[at] === "(") depth++;
      else if (value[at] === ")" && depth-- === 0) break;
    }
    found.push([name, value.slice(start, at).trim()]);
  }
  return found;
}

/** The index of the bracket that closes the one at `at`. */
function close(code: string, at: number): number {
  const pairs: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
  const stack = [pairs[code[at] ?? ""]];
  let index = at + 1;
  while (index < code.length && stack.length) {
    const skipped = skip(code, index);
    if (skipped !== index) {
      index = skipped;
      continue;
    }
    const char = code[index] ?? "";
    if (pairs[char]) stack.push(pairs[char]);
    else if (char === stack.at(-1)) stack.pop();
    index += 1;
  }
  return index - 1;
}

type Tag = { name: string; classes: string[]; root: boolean; passes: boolean };

/**
 * The classes named in a `className`. One ending in a slot, such as
 * `x-govuk-ui-button--${variant}`, is kept as `x-govuk-ui-button--{variant}`. A value straight
 * after a whole class, as in `x-govuk-ui-label${hidden ? " x-govuk-ui-visually-hidden" : ""}`, adds
 * a class of its own.
 */
function classesIn(value: string) {
  // One made wholly from a value, such as `x-govuk-ui-${kind}`, names no class of its own.
  return [...value.matchAll(/x-govuk-ui-[a-z0-9-]*(?:(?<=-)\$\{\s*([\w.]+)[^}]*\})?/g)]
    .map(([whole, slot]) => (slot ? `${whole.slice(0, whole.indexOf("$"))}{${slot}}` : whole))
    .filter((name) => !name.startsWith("x-govuk-ui-{") && name !== "x-govuk-ui-");
}

/**
 * The JSX opening tags in a function's body. For each, its name, the classes in its `className`,
 * whether the caller's `className` joins them, and whether it passes props on, as `{...props}`
 * does. A `className` given as an object's property, as to Base UI's `useRender`, counts as a tag.
 */
function tags(body: string): Tag[] {
  const found: Tag[] = [];
  for (const start of body.matchAll(/<([A-Za-z][\w.]*)/g)) {
    // The tag runs to the first `>` outside its braces and quotes.
    let index = (start.index ?? 0) + start[0].length;
    while (index < body.length && body[index] !== ">") {
      const skipped = skip(body, index);
      if (skipped !== index) index = skipped;
      else if (body[index] === "{") index = close(body, index) + 1;
      else if (body[index] === "<" || body[index] === ";") break;
      else index += 1;
    }
    const tag = body.slice(start.index, index);
    const className = tag.match(/\bclassName=(\{[\s\S]*|"[^"]*")/)?.[1] ?? "";
    const value = className.startsWith("{")
      ? className.slice(0, close(className, 0) + 1)
      : className;
    found.push({
      name: start[1] ?? "",
      classes: classesIn(value),
      root: /\{[\s\S]*\bclassName\b/.test(value),
      passes: /\{\s*\.\.\./.test(tag) || /\bclassName=\{\s*className\s*\}/.test(tag),
    });
  }
  for (const property of body.matchAll(/\bclassName:\s*(`(?:[^`\\]|\\.)*`|"[^"]*")/g)) {
    const value = property[1] ?? "";
    found.push({
      name: "",
      classes: classesIn(value),
      root: /\bclassName\b/.test(value),
      passes: false,
    });
  }
  return found;
}

type Source = {
  file: string;
  code: string;
  /**
   * Each function, by name. `exported` is a part a package exports. `shared` is one exported from
   * its file but from no package, for other files of the library to render, as memetics' charts
   * share their frame.
   */
  functions: Map<string, { body: string; exported: boolean; shared: boolean }>;
};

/** Each library source file's components, exported or not, by name, with their bodies. */
async function readSources(): Promise<Source[]> {
  const files = [...new Bun.Glob("packages/*/src/*.tsx").scanSync(".")].sort();
  // What each package publishes, by the file it comes from. These are the names in each
  // `export { … } from` of its index, without the types, so a word in a comment, or a type,
  // publishes nothing.
  const published = new Set<string>();
  for (const index of new Bun.Glob("packages/*/src/index.ts").scanSync(".")) {
    const folder = index.slice(0, index.lastIndexOf("/"));
    const code = withoutComments(await Bun.file(index).text());
    for (const [, names, from] of code.matchAll(/export\s*\{([^}]*)\}\s*from\s*"\.\/([\w-]+)"/g))
      for (const name of (names ?? "").split(","))
        if (!/^\s*type\s/.test(name) && name.trim())
          published.add(
            `${folder}/${from}.tsx:${name
              .trim()
              .split(/\s+as\s+/)
              .at(-1)}`,
          );
  }
  return Promise.all(
    files.map(async (file) => {
      const code = withoutComments(await Bun.file(file).text());
      const functions: Source["functions"] = new Map();
      for (const match of code.matchAll(/^(export )?function ([A-Z]\w*)\s*(?:<[^(]*>)?\(/gm)) {
        const params = (match.index ?? 0) + match[0].length - 1;
        const open = code.indexOf("{", close(code, params));
        const name = match[2] ?? "";
        functions.set(name, {
          body: code.slice(open, close(code, open) + 1),
          exported: Boolean(match[1]) && published.has(`${file}:${name}`),
          shared: Boolean(match[1]) && !published.has(`${file}:${name}`),
        });
      }
      return { file, code, functions };
    }),
  );
}

/**
 * A part's classes, from the element it renders and the elements inside, through the functions it
 * renders. The function it hands its props or `className` to is its root, as `ChoiceGroup` is
 * `Radios`'s, and the `Fieldset` in turn is `ChoiceGroup`'s, in another file. A root part also
 * given classes of its own joins them to its root's, as a Chart's `Figure` does. A function the
 * library does not export, of its own file or shared from another, is inside it. Another part's
 * own elements are that part's to describe. `visited` gathers the functions of every file it reads.
 */
function resolve(
  functions: Source["functions"],
  name: string,
  parts: Map<string, Source["functions"]>,
  seen = new Set<string>(),
  visited = new Set<Source["functions"]>(),
): { classes: string[]; inner: string[] } {
  const own = functions.get(name);
  if (!own || seen.has(name)) return { classes: [], inner: [] };
  seen.add(name);
  visited.add(functions);
  const found = tags(own.body);
  const root = found.find((tag) => tag.root && tag.classes.length);
  let classes = root?.classes ?? [];
  const inner = found.flatMap((tag) => (tag === root ? [] : tag.classes));
  for (const tag of found) {
    if (tag.name === name) continue;
    const local = functions.has(tag.name);
    const home = local ? functions : parts.get(tag.name);
    if (!home) continue;
    const inside = !home.get(tag.name)?.exported;
    // Only what is inside the part says where its data attributes come from.
    const rendered = resolve(home, tag.name, parts, new Set(seen), inside ? visited : new Set());
    if (!classes.length && tag.passes && rendered.classes.length) {
      classes = rendered.classes;
      if (local || inside) inner.push(...rendered.inner);
    } else if (tag === root && tag.passes) {
      // A root that is another part, given the props passed on and classes of its own, renders the
      // other part's root with both, as a Chart's figure is a Figure.
      classes = [...new Set([...classes, ...rendered.classes])];
      if (local || inside) inner.push(...rendered.inner);
    } else if (inside) inner.push(...rendered.classes, ...rendered.inner);
  }
  return { classes, inner: [...new Set(inner)].filter((value) => !classes.includes(value)) };
}

// Reading the stylesheets.

type Rule = { selectors: string[]; declarations: [string, string][]; file: string };

/** The style rules in a stylesheet, inside any at-rule except keyframes and font faces. */
function rules(css: string, file: string): Rule[] {
  const found: Rule[] = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("{", index);
    if (open === -1) break;
    const prelude = text.slice(index, open).trim();
    const end = close(text, open);
    const block = text.slice(open + 1, end);
    if (prelude.startsWith("@")) {
      if (!/^@(keyframes|font-face|property)/.test(prelude)) found.push(...rules(block, file));
    } else if (prelude) {
      found.push({
        selectors: split(prelude, ","),
        declarations: split(block, ";").flatMap((line) => {
          const colon = line.indexOf(":");
          return colon > 0
            ? [[line.slice(0, colon).trim(), line.slice(colon + 1).trim()] as [string, string]]
            : [];
        }),
        file,
      });
    }
    index = end + 1;
  }
  return found;
}

/** A list split at the separators outside brackets and quotes. */
function split(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"' || char === "'") index = skip(text, index) - 1;
    else if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (char === separator && depth === 0) {
      parts.push(text.slice(from, index).trim());
      from = index + 1;
    }
  }
  parts.push(text.slice(from).trim());
  return parts.filter(Boolean);
}

/**
 * The compound selectors of a selector, the subject last, each with its classes and the data
 * attributes it matches. Those inside `:has()` are its descendants', so they are left out.
 */
function compounds(selector: string) {
  const list: string[] = [];
  let depth = 0;
  let from = 0;
  for (let index = 0; index < selector.length; index++) {
    const char = selector[index] ?? "";
    if (char === '"' || char === "'") index = skip(selector, index) - 1;
    else if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth -= 1;
    else if (depth === 0 && /[\s>+~]/.test(char)) {
      list.push(selector.slice(from, index));
      from = index + 1;
    }
  }
  list.push(selector.slice(from));
  return list
    .filter((part) => part.trim())
    .map((part) => {
      const own = part.replace(/:has\((?:[^()]|\([^()]*\))*\)/g, "");
      return {
        classes: [...own.matchAll(/\.(x-govuk-ui-[\w-]+)/g)].map(([, name]) => name ?? ""),
        data: [...own.matchAll(/\[(data-[\w-]+)(?:[~^$|*]?="([^"]*)")?\]/g)].map(
          ([, name, value]) => ({ name: name ?? "", value }),
        ),
      };
    });
}

// The contract.

/** The custom properties of the theme, which every component shares. */
async function themeTokens(): Promise<Set<string>> {
  const base = await Bun.file("packages/core/src/styles/base.css").text();
  const scss = await Bun.file("packages/core/src/govuk-frontend.scss").text();
  const tokens = new Set([...base.matchAll(/(--x-govuk-ui-[\w-]+)\s*:/g)].map(([, name]) => name));
  tokens.add("--x-govuk-ui-font");
  tokens.add("--x-govuk-ui-white");
  for (const [, colour, variants] of scss.matchAll(/"([a-z]+)":\s*\(([^)]*)\)/g))
    for (const [, variant] of (variants ?? "").matchAll(/"([\w-]+)"/g))
      tokens.add(
        variant === "primary" ? `--x-govuk-ui-${colour}` : `--x-govuk-ui-${colour}-${variant}`,
      );
  return new Set([...tokens].filter((token): token is string => Boolean(token)));
}

/** Every component's styling contract. */
export async function stylingContracts(): Promise<Record<ComponentName, StylingContract>> {
  const sources = await readSources();
  const sheets = [...new Bun.Glob("packages/*/src/styles/*.css").scanSync(".")].sort();
  const allRules = (
    await Promise.all(sheets.map(async (file) => rules(await Bun.file(file).text(), file)))
  ).flat();
  const tokens = await themeTokens();
  // The data attributes each file sets, in JSX, as properties, or on an element as it runs.
  const setIn = new Map(
    sources.map(({ file, code }) => [
      file,
      new Set([
        ...[...code.matchAll(/[\s"'](data-[a-z-]+)["']?\s*[=:,)]/g)].map(([, name]) => name),
        ...[...code.matchAll(/\.dataset\.(\w+)/g)].map(
          ([, name]) =>
            `data-${(name ?? "").replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
        ),
      ]),
    ]),
  );
  const inline = new Set(
    sources.flatMap(({ code }) =>
      [...code.matchAll(/["'`](--x-govuk-ui-[\w-]+)["'`]/g)].map(([, name]) => name),
    ),
  );

  // Each component is the export named as its slug is, such as InputOTP for input-otp.
  const flat = (name: string) => name.toLowerCase().replaceAll("-", "");
  const exportOf = new Map<ComponentName, string>();
  const fileOf = new Map<ComponentName, string>();
  for (const component of componentNames)
    for (const { file, functions } of sources)
      for (const [name, { exported }] of functions)
        if (exported && flat(name) === flat(component)) {
          exportOf.set(component, name);
          fileOf.set(component, file);
        }
  // A part belongs to the component whose name starts its own, the longest such name, as
  // InputOTPSlot belongs to InputOTP, not Input. A part with no such name, such as Label or
  // MenuItem, belongs to the components of its own file, or those of them whose examples use it,
  // as MenuItem does to Dropdown menu and Context menu. A part in a file with no component belongs
  // to the components whose examples use it.
  const examples = new Map(
    await Promise.all(
      componentNames.map(
        async (component) =>
          [
            component,
            new Set(
              [
                ...(await Bun.file(`site/examples/${component}.tsx`).text()).matchAll(
                  /import\s*\{([^}]*)\}\s*from\s*"(?:x-govuk-ui|@x-govuk-ui\/(?:jorjorwel|memetics|belsize))"/g,
                ),
              ].flatMap(([, names]) =>
                (names ?? "").split(",").map((name) => name.replace(/^\s*type\s+/, "").trim()),
              ),
            ),
          ] as const,
      ),
    ),
  );
  const owners = (part: string, file: string): ComponentName[] => {
    const named = componentNames
      .filter((component) => part.startsWith(exportOf.get(component) ?? "\0"))
      .sort((a, b) => (exportOf.get(b)?.length ?? 0) - (exportOf.get(a)?.length ?? 0));
    if (named[0]) return [named[0]];
    const using = (list: readonly ComponentName[]) =>
      list.filter((component) => examples.get(component)?.has(part));
    const housed = componentNames.filter((component) => fileOf.get(component) === file);
    if (housed.length === 1) return housed;
    if (housed.length) return using(housed).length ? using(housed) : housed;
    return using(componentNames);
  };

  // Every exported or shared part, by name, for a part that renders one in another file.
  const parts = new Map(
    sources.flatMap(({ functions }) =>
      [...functions].flatMap(([name, { exported, shared }]) =>
        exported || shared ? [[name, functions] as const] : [],
      ),
    ),
  );
  const fileOfFunctions = new Map(sources.map(({ file, functions }) => [functions, file]));
  const contracts = {} as Record<ComponentName, StylingContract>;
  const files = new Map<ComponentName, Set<string>>();
  for (const component of componentNames) {
    contracts[component] = emptyContract();
    files.set(component, new Set());
  }
  for (const { file, functions } of sources)
    for (const [name, { exported }] of functions) {
      if (!exported) continue;
      const visited = new Set<Source["functions"]>();
      const { classes, inner } = resolve(functions, name, parts, new Set(), visited);
      if (!classes.length && !inner.length) continue;
      for (const component of owners(name, file)) {
        contracts[component].parts.push({ name, classes, inner });
        for (const read of visited) files.get(component)?.add(fileOfFunctions.get(read) ?? file);
      }
    }
  // An element inside a part that is another component's, such as a Visually hidden, is that
  // component's to describe.
  for (const component of componentNames) {
    const others = new Set(
      componentNames.flatMap((other) =>
        other === component ? [] : contracts[other].parts.flatMap((part) => part.classes),
      ),
    );
    for (const part of contracts[component].parts)
      part.inner = part.inner.filter((name) => !others.has(name));
  }

  for (const component of componentNames) {
    const contract = contracts[component];
    const own = contract.parts.flatMap((part) => [...part.classes, ...part.inner]);
    // A class with a slot, such as x-govuk-ui-button--{variant}, matches each class it makes.
    const fixed = own.filter((name) => !name.includes("{"));
    const stems = own.flatMap((name) =>
      name.includes("{") ? [name.slice(0, name.indexOf("{"))] : [],
    );
    const mine = (name: string) =>
      fixed.includes(name) || stems.some((stem) => name.startsWith(stem));
    const states = new Map<string, StylingState>();
    // A data attribute is the library's if a file of the component's parts sets it, and Base UI's
    // otherwise.
    const ours = new Set(
      [...(files.get(component) ?? [])].flatMap((file) => [...(setIn.get(file) ?? [])]),
    );
    // The custom properties its own rules read, each with a value. The value is where it is
    // declared on the outermost of the component's elements, or else the fallback it is read with,
    // or else where it is declared anywhere, such as on the page's root.
    const read = new Map<string, string | undefined>();
    const declared = new Map<string, { value: string; classes: string[]; depth: number }>();
    for (const rule of allRules)
      for (const selector of rule.selectors) {
        const parts = compounds(selector);
        // A rule that names another component's class, such as one for a Button in a Chat input,
        // belongs to that component, and is about how the two go together.
        if (parts.some((part) => part.classes.some((name) => !mine(name)))) continue;
        for (const part of parts) {
          const classes = part.classes.filter(mine);
          if (!classes.length) continue;
          for (const { name, value } of part.data) {
            if (name === "data-theme") continue;
            const state = states.get(name) ?? {
              attribute: name,
              values: [],
              classes: [],
              by: ours.has(name) ? "x-govuk-ui" : "Base UI",
            };
            if (value !== undefined && !state.values.includes(value)) state.values.push(value);
            for (const name of classes) if (!state.classes.includes(name)) state.classes.push(name);
            states.set(name, state);
          }
        }
        const classes = parts.at(-1)?.classes.filter(mine) ?? [];
        if (!classes.length) continue;
        for (const [property, value] of rule.declarations) {
          for (const [used, fallback] of varsIn(value))
            if (!read.get(used)) read.set(used, fallback);
          if (!property.startsWith("--x-govuk-ui-")) continue;
          const known = declared.get(property);
          if (!known || parts.length < known.depth)
            declared.set(property, { value, classes, depth: parts.length });
        }
      }
    const properties: StylingProperty[] = [];
    for (const [name, fallback] of read) {
      if (tokens.has(name)) continue;
      const own = declared.get(name);
      const anywhere = allRules
        .flatMap((rule) =>
          rule.declarations
            .filter(([property]) => property === name)
            .map(([, value]) => ({
              value,
              depth: Math.min(...rule.selectors.map((one) => compounds(one).length)),
            })),
        )
        .sort((a, b) => a.depth - b.depth)[0];
      properties.push({
        name,
        value: own?.value ?? fallback ?? anywhere?.value,
        classes: own?.classes ?? [],
        inline: inline.has(name),
      });
    }
    contract.states = [...states.values()].sort((a, b) => a.attribute.localeCompare(b.attribute));
    contract.properties = properties.sort((a, b) => a.name.localeCompare(b.name));
    contract.tokens = [...read.keys()].filter((name) => tokens.has(name)).sort();
  }
  return contracts;
}

function emptyContract(): StylingContract {
  return { parts: [], states: [], properties: [], tokens: [] };
}

if (import.meta.main) {
  const contracts = await stylingContracts();
  const name = process.argv[2] as ComponentName | undefined;
  console.log(JSON.stringify(name ? contracts[name] : contracts, null, 2));
}
