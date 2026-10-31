import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Button, Input, InsetText } from "x-govuk-ui";
import { type ComponentName, catalogue, componentNames } from "../../site/catalogue";
import { Credits, everySystem } from "../../site/credits";
import { componentDocs, llmsDocuments } from "../../site/llms";
import { met, presetAt, startingArgs } from "../../site/props";
import { stylingContracts } from "../../site/styling";

test("a component's credits say what inspired it or it was adapted from, then what it is built on", () => {
  const editor = renderToStaticMarkup(<Credits name="editor" />);
  expect(editor.indexOf("Adapted from")).toBeGreaterThan(-1);
  expect(editor.indexOf("Adapted from")).toBeLessThan(editor.indexOf("Built on"));
  expect(editor).toContain('href="https://github.com/basecamp/lexxy"');
  expect(editor).toContain('href="https://lexical.dev/"');
  const chart = renderToStaticMarkup(<Credits name="chart" />);
  expect(chart.indexOf("Inspired by")).toBeLessThan(chart.indexOf("Built on"));
  // The charts are inspired by Mantine as a family, but only those Recharts draws are built on it.
  const gauge = renderToStaticMarkup(<Credits name="gauge" />);
  expect(gauge).toContain("Mantine");
  expect(gauge).not.toContain("Built on");
  // A component that owes nothing says nothing.
  expect(renderToStaticMarkup(<Credits name="button" />)).toBe("");
});

test("the README's credits link every system the library owes, each to its own address", async () => {
  // The section's words and layout are the README's own. It need only link each system, by its
  // name, to the address site/credits.tsx gives it, including GOV.UK's Design System.
  const readme = await Bun.file("README.md").text();
  const section = readme.slice(
    readme.indexOf("## Credits"),
    readme.indexOf("\n## ", readme.indexOf("## Credits") + 1),
  );
  const links = new Map(
    [...section.matchAll(/\[([^\]]+)\]\(([^)\s]+)\)/g)].map(([, name, href]) => [name, href]),
  );
  for (const { name, href } of everySystem()) expect(links.get(name), name).toBe(href);
});

test("components use their own class names rather than GOV.UK Frontend's", () => {
  const html = renderToStaticMarkup(
    <>
      <Button variant="link" size="small">
        Discard
      </Button>
      <Input label="Name" errorMessage="Enter your name." />
      <InsetText>Example</InsetText>
    </>,
  );
  expect(html).toContain(
    'class="x-govuk-ui-button x-govuk-ui-button--link x-govuk-ui-button--small"',
  );
  expect(html).toContain('<div class="x-govuk-ui-inset-text">Example</div>');
  expect(html).not.toMatch(/class="[^"]*\bgovuk-(?!ui-)/);
});

test("every file that uses React's client-only API says it is client code", async () => {
  // Each package's index re-exports from every file, and a service's server components import the
  // index. A server build, such as Next.js's, refuses a file that imports a hook only the browser
  // has, unless the file starts "use client". The build keeps each file's directive.
  const clientOnly = new Set([
    "Component",
    "PureComponent",
    "createContext",
    "useActionState",
    "useDeferredValue",
    "useEffect",
    "useImperativeHandle",
    "useInsertionEffect",
    "useLayoutEffect",
    "useOptimistic",
    "useReducer",
    "useRef",
    "useState",
    "useSyncExternalStore",
    "useTransition",
  ]);
  const unmarked: string[] = [];
  for (const path of new Bun.Glob("packages/*/src/*.{ts,tsx}").scanSync(".")) {
    const code = await Bun.file(path).text();
    const used = [...code.matchAll(/import \{([^}]*)\} from "react"/g)].flatMap((match) =>
      (match[1] ?? "")
        .split(",")
        .map((name) => name.trim())
        .filter((name) => clientOnly.has(name)),
    );
    if (used.length > 0 && !code.trimStart().startsWith('"use client"'))
      unmarked.push(`${path}: ${used.join(", ")}`);
  }
  expect(unmarked).toEqual([]);
});

test("a part keeps a latest value with useLatest, not by writing a ref as it renders", async () => {
  // React can render a part and throw the render away, so a ref written as it renders can hold a
  // value the page never showed. useLatest writes the ref once React keeps the render. The check
  // reads statements indented once, which are in the body of a part or a hook, not in a handler or
  // an effect inside it. A cache written in a condition and read in the same render, such as
  // useTilesLayout's, is left alone.
  const written: string[] = [];
  for (const path of new Bun.Glob("packages/*/src/*.{ts,tsx}").scanSync(".")) {
    const lines = (await Bun.file(path).text()).split("\n");
    lines.forEach((line, index) => {
      if (/^ {2}[\w$]+\.current\s*=[^=]/.test(line)) written.push(`${path}:${index + 1}`);
    });
  }
  expect(written).toEqual([]);
});

test("every custom property the library declares starts x-govuk-ui-", async () => {
  // Reading another library's property, such as GOV.UK Frontend's palette or Base UI's
  // --anchor-width, is fine. Declaring one, in a stylesheet or from a component, names it ours.
  const declared: string[] = [];
  for (const path of new Bun.Glob("packages/*/src/styles/*.css").scanSync(".")) {
    const css = await Bun.file(path).text();
    for (const match of css.matchAll(/^\s*(--[a-zA-Z][\w-]*)\s*:/gm))
      declared.push(`${path}: ${match[1]}`);
  }
  for (const path of new Bun.Glob("packages/*/src/*.{ts,tsx}").scanSync(".")) {
    const code = await Bun.file(path).text();
    for (const match of code.matchAll(
      /(?:["']|setProperty\(\s*["'])(--[a-zA-Z][\w-]*)["']\s*[:,]/g,
    ))
      declared.push(`${path}: ${match[1]}`);
  }
  expect(declared.length).toBeGreaterThan(50);
  expect(declared.filter((entry) => !entry.includes(": --x-govuk-ui-"))).toEqual([]);
});

test("each extension declares the cascade layers in core's order, and puts its styles in its own layer", async () => {
  // The first stylesheet to name a layer decides its place, so each must name them all the same
  // way.
  const text = (path: string) => Bun.file(`${import.meta.dir}/../../${path}`).text();
  const order = async (path: string) => (await text(path)).match(/@layer [^;{]+;/)?.[0];
  const core = await order("packages/core/src/layers.css");
  expect(core).toBe("@layer reset, govuk-frontend, x-govuk-ui, x-govuk-ui-extensions;");
  const extensions = [...new Bun.Glob("packages/*/src/styles.css").scanSync(".")]
    .map((path) => path.split("/")[1] ?? "")
    .filter((name) => name !== "core")
    .sort();
  expect(extensions).toEqual(["belsize", "jorjorwel", "memetics"]);
  for (const name of extensions) {
    expect(await order(`packages/${name}/src/layers.css`)).toBe(core);
    // The order comes first, and every stylesheet after it is in the extensions' layer, so an
    // extension's rules overrule core's at the same specificity, whichever loads first.
    const imports = [
      ...(await text(`packages/${name}/src/styles.css`)).matchAll(/@import [^;]+;/g),
    ].map(([line]) => line);
    expect(imports[0]).toBe('@import "./layers.css";');
    expect(imports.slice(1).every((line) => line.endsWith("layer(x-govuk-ui-extensions);"))).toBe(
      true,
    );
  }
});

// Each component's props keep the library's conventions, such as taking `className` and `ref`, and
// giving each idea one name. `tests/types/conventions.ts` checks them against the exported types,
// as part of `bun run typecheck`.

test("each component lists each prop once, and each example setting once", () => {
  // The playground keys each row by its name. A name listed twice, such as a prop left behind when
  // it moved to another part, shows twice and makes React warn.
  const twice: string[] = [];
  for (const [key, entry] of Object.entries(catalogue))
    for (const [list, docs] of [
      ["props", entry.props],
      ["example", ("example" in entry && entry.example) || []],
    ] as const) {
      const seen = new Set<string>();
      for (const { name } of docs) {
        if (seen.has(name)) twice.push(`${key} ${list}: ${name}`);
        seen.add(name);
      }
    }
  expect(twice).toEqual([]);
});

test("each part the catalogue lists by its props names every prop the part declares itself", async () => {
  // The catalogue writes a part's props by hand, as `{ a, b }`, so a prop added to the part must
  // be added there too. A prop the part takes from another type, such as Base UI's, is not read.
  const own = new Map<string, string[]>();
  for (const path of new Bun.Glob("packages/*/src/*.tsx").scanSync(".")) {
    const lines = (await Bun.file(path).text()).split("\n");
    lines.forEach((line, at) => {
      const part = line.match(/^export type (\w+)Props =/)?.[1];
      if (!part) return;
      const keys: string[] = [];
      let depth = 0;
      for (const next of lines.slice(at)) {
        const key = depth === 1 && next.match(/^ {2}(\w+)\??:/)?.[1];
        if (key) keys.push(key);
        for (const character of next) depth += character === "{" ? 1 : character === "}" ? -1 : 0;
        if (depth === 0 && next.trimEnd().endsWith(";")) break;
      }
      own.set(part, keys);
    });
  }
  const listed = new Map<string, Set<string>>();
  for (const entry of Object.values(catalogue))
    for (const { name, type, default: fallback } of entry.props)
      if (fallback === "Part" && type.startsWith("{"))
        for (const prop of type.slice(1, -1).split(/[,|]/))
          listed.set(
            name,
            (listed.get(name) ?? new Set()).add(prop.trim().split(/[?:\s]/)[0] ?? ""),
          );
  const missing = [...listed].flatMap(([part, props]) =>
    (own.get(part) ?? [])
      .filter((prop) => !["children", "className", "style", "ref"].includes(prop))
      .filter((prop) => !props.has(prop))
      .map((prop) => `${part}: ${prop}`),
  );
  expect(listed.size).toBeGreaterThan(80);
  expect(missing).toEqual([]);
});

test("every playground setting that needs another names one of its component's settings", () => {
  const wrong: string[] = [];
  for (const [key, entry] of Object.entries(catalogue)) {
    const all = [...entry.props, ...(("example" in entry && entry.example) || [])];
    const names = new Set(all.map((prop) => prop.name));
    for (const prop of all)
      for (const need of prop.needs ?? [])
        if ("prop" in need && !names.has(need.prop))
          wrong.push(`${key}.${prop.name} → ${need.prop}`);
  }
  expect(wrong).toEqual([]);
});

test("every example's settings are settings of its component, each a value its control allows, and none is where the playground starts", () => {
  const wrong: string[] = [];
  for (const [key, entry] of Object.entries(catalogue)) {
    const all = [...entry.props, ...(("example" in entry && entry.example) || [])];
    for (const preset of ("presets" in entry && entry.presets) || [])
      for (const [name, value] of Object.entries(preset.args)) {
        const control = all.find((prop) => prop.name === name && prop.control)?.control;
        const options = control && "options" in control ? control.options : [];
        let allowed: boolean;
        switch (control?.kind) {
          case "select":
            allowed = options.some(([option]) => option === value);
            break;
          case "checklist":
            allowed =
              Array.isArray(value) &&
              value.every((item) => options.some(([option]) => option === item));
            break;
          case "switch":
            allowed = typeof value === "boolean";
            break;
          default:
            allowed = control !== undefined && !Array.isArray(value);
        }
        if (!allowed) wrong.push(`${key}: ${preset.name} → ${name}`);
      }
  }
  // Each setting an example sets applies with the others it sets, or setting it would do nothing.
  for (const [key, entry] of Object.entries(catalogue)) {
    const all = [...entry.props, ...(("example" in entry && entry.example) || [])];
    for (const preset of ("presets" in entry && entry.presets) || []) {
      const args = { ...startingArgs(all), ...preset.args };
      for (const name of Object.keys(preset.args))
        for (const need of all.find((prop) => prop.name === name && prop.control)?.needs ?? [])
          if (!met(need, args)) wrong.push(`${key}: ${preset.name} → ${name} does not apply`);
    }
  }
  // An example the playground starts at would show as chosen before anyone chose it.
  for (const [key, entry] of Object.entries(catalogue)) {
    const all = [...entry.props, ...(("example" in entry && entry.example) || [])];
    const presets = ("presets" in entry && entry.presets) || [];
    const start = startingArgs(all);
    const at = presetAt(presets, start, start);
    if (at) wrong.push(`${key}: ${at.name} is where the playground starts`);
    // Picking an example shows it as chosen, never another that sets some of the same props.
    for (const preset of presets) {
      const chosen = presetAt(presets, { ...start, ...preset.args }, start);
      if (chosen !== preset) wrong.push(`${key}: ${preset.name} shows as ${chosen?.name}`);
    }
  }
  expect(wrong).toEqual([]);
});

// The site reads the styling contract and the documentation for language models from the source,
// once for both tests.
const contracts = stylingContracts();

test("every component's styling contract names its parts, read rightly from the source", async () => {
  const all = await contracts;
  expect(componentNames.filter((name) => all[name].parts.length === 0)).toEqual([]);
  // A part's own classes, one with a slot, and an element inside it.
  const button = all.button.parts.find((part) => part.name === "Button");
  expect(button?.classes).toEqual([
    "x-govuk-ui-button",
    "x-govuk-ui-button--{variant}",
    "x-govuk-ui-button--{size}",
  ]);
  expect(button?.inner).toContain("x-govuk-ui-button-label");
  // A part whose class is another part's, as Radios hands its className to the choices' group.
  expect(all.radios.parts.find((part) => part.name === "Radios")?.classes.length).toBeGreaterThan(
    0,
  );
  // The data attributes, set by the library, by Base UI, or by the library at run time.
  const state = (name: ComponentName, attribute: string) =>
    all[name].states.find((one) => one.attribute === attribute)?.by;
  expect(state("button", "data-loading")).toBe("x-govuk-ui");
  expect(state("tooltip", "data-side")).toBe("Base UI");
  expect(state("message-scroller", "data-found")).toBe("x-govuk-ui");
  // A custom property with its value, and one the component writes itself.
  const property = (name: ComponentName, property: string) =>
    all[name].properties.find((one) => one.name === property);
  expect(property("avatar", "--x-govuk-ui-avatar-size")?.value).toBe("40px");
  expect(property("message-scroller", "--x-govuk-ui-message-scroller-footer")?.inline).toBe(true);
});

test("the documentation for language models lists every component, each page with its example and styling", async () => {
  const documents = await llmsDocuments(await componentDocs(await contracts));
  for (const name of componentNames) {
    expect(documents["llms.txt"]).toContain(`(/llms/${name}.md)`);
    expect(documents[`llms/${name}.md`]).toContain("## Styling");
    expect(documents[`llms/${name}.md`]).toContain("```tsx");
  }
  expect(documents["llms-full.txt"]).toContain("## Button");
});

/**
 * The index just past the bracket that closes the one at `at`, skipping strings and templates. It
 * reads code that Bun has transpiled, where JSX's words are strings.
 */
function closeOf(code: string, at: number): number {
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const open: string[] = [];
  for (let index = at; index < code.length; index++) {
    const char = code[index] ?? "";
    if (char === '"' || char === "'") index = endOfString(code, index);
    else if (char === "`") {
      for (index++; index < code.length && code[index] !== "`"; index++) {
        if (code[index] === "\\") index++;
        else if (code[index] === "$" && code[index + 1] === "{")
          index = closeOf(code, index + 1) - 1;
      }
    } else if (pairs[char]) open.push(pairs[char] ?? "");
    else if (char === open.at(-1)) {
      open.pop();
      if (!open.length) return index + 1;
    }
  }
  return code.length;
}

/** The index of the quote that ends the string starting at `at`. */
function endOfString(code: string, at: number) {
  let index = at + 1;
  while (index < code.length && code[index] !== code[at]) index += code[index] === "\\" ? 2 : 1;
  return index;
}

/** The entries of an object pattern, such as `{ ref, onClick: click, ...props }`. */
function entriesOf(pattern: string) {
  const inner = pattern.slice(1, -1);
  const entries: string[] = [];
  let start = 0;
  for (let index = 0; index < inner.length; index++) {
    const char = inner[index] ?? "";
    if (char === '"' || char === "'") index = endOfString(inner, index);
    else if ("`([{".includes(char)) index = closeOf(inner, index) - 1;
    else if (char === ",") {
      entries.push(inner.slice(start, index).trim());
      start = index + 1;
    }
  }
  return [...entries, inner.slice(start).trim()].filter(Boolean);
}

test("every part that takes a ref or a handler out of its props uses it", () => {
  // A part that takes `ref` or an `on…` handler out of the props it spreads, and never uses it
  // again, drops it. React 19 passes `ref` as a prop, so only a part that takes it out can lose
  // it. A part may take a prop out only to keep it off its element, and read it from its props.
  const transpiler = new Bun.Transpiler({
    loader: "tsx",
    tsconfig: { compilerOptions: { jsx: "react" } },
  });
  const dropped: string[] = [];
  for (const file of new Bun.Glob("packages/*/src/*.tsx").scanSync(".")) {
    const code = transpiler.transformSync(readFileSync(file, "utf8"));
    for (const found of code.matchAll(/export function ([A-Z]\w*)\s*\(/g)) {
      const open = found.index + found[0].length - 1;
      const end = closeOf(code, open);
      const params = code.slice(open + 1, end - 1).trim();
      const bodyOpen = code.indexOf("{", end);
      let body = code.slice(bodyOpen, closeOf(code, bodyOpen));
      // The props are taken apart in the parameter, or in the body from the parameter.
      let pattern = params.startsWith("{") ? params.slice(0, closeOf(params, 0)) : undefined;
      if (!pattern && /^\w+$/.test(params))
        for (const taken of body.matchAll(/(?:const|let)\s*\{/g)) {
          const start = taken.index + taken[0].length - 1;
          const finish = closeOf(body, start);
          if (new RegExp(`^\\s*=\\s*[^;]*\\b${params}\\b`).test(body.slice(finish))) {
            pattern = body.slice(start, finish);
            body = body.slice(0, taken.index) + body.slice(finish);
            break;
          }
        }
      for (const entry of pattern ? entriesOf(pattern) : []) {
        const [key = "", name] = (entry.split("=")[0] ?? "").split(":").map((side) => side.trim());
        if (key !== "ref" && !/^on[A-Z]\w*$/.test(key)) continue;
        const used = new RegExp(`\\b${name || key}\\b`).test(body);
        const read = /^\w+$/.test(params) && new RegExp(`\\b${params}\\.${key}\\b`).test(body);
        if (!used && !read) dropped.push(`${found[1]} drops ${key}`);
      }
    }
  }
  expect(dropped).toEqual([]);
});
