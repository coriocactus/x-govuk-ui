import { expect, test } from "bun:test";
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

test("an extension declares the cascade layers in core's order, whichever stylesheet loads first", async () => {
  // The first stylesheet to name a layer decides its place, so each must name them all the same
  // way.
  const order = async (path: string) =>
    (await Bun.file(`${import.meta.dir}/../../${path}`).text()).match(/@layer [^;{]+;/)?.[0];
  const core = await order("packages/core/src/layers.css");
  expect(core).toBe("@layer reset, govuk-frontend, x-govuk-ui, x-govuk-ui-extensions;");
  expect(await order("packages/jorjorwel/src/layers.css")).toBe(core);
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
