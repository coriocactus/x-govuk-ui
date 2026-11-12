import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { installed, openDocs } from "../../mcp/src/docs";
import { resolve, search, section, sharedFunctions, suggestions } from "../../mcp/src/tools";
import type { ComponentDoc, DocsIndex } from "../../site/llms";
import { docsDocuments } from "../../site/llms";

// The documents the site and the package build, written where the server reads them. An older
// library's are beside them. They give no part its props, and list no hooks, functions or words.
let place = "";
let older = "";
let index: DocsIndex;
beforeAll(async () => {
  place = await mkdtemp(join(tmpdir(), "x-govuk-ui-docs-"));
  older = await mkdtemp(join(tmpdir(), "x-govuk-ui-docs-older-"));
  const documents = await docsDocuments();
  index = JSON.parse(documents["docs/index.json"] ?? "{}");
  const { functions: _, ...rest } = index;
  const button: ComponentDoc = JSON.parse(documents["docs/button.json"] ?? "{}");
  const { functions, words, ...record } = button;
  await Promise.all([
    ...Object.entries(documents).map(([path, text]) =>
      Bun.write(join(place, path.replace(/^docs\//, "")), text),
    ),
    Bun.write(
      join(older, "index.json"),
      JSON.stringify({
        ...rest,
        components: index.components.map(({ words: { functions, ...words }, ...entry }) => ({
          ...entry,
          words,
        })),
      }),
    ),
    Bun.write(
      join(older, "button.json"),
      JSON.stringify({ ...record, parts: record.parts.map(({ props, ...part }) => part) }),
    ),
  ]);
});
afterAll(() =>
  Promise.all([place, older].map((path) => rm(path, { recursive: true, force: true }))),
);

test("the MCP server finds a component by any of its names, and offers others for a wrong one", () => {
  for (const name of ["date-input", "Date input", "DateInput", "dateinput"])
    expect(resolve(index, name)?.slug).toBe("date-input");
  expect(resolve(index, "datepicker")).toBeUndefined();
  expect(suggestions(index, "datepicker")).toContain("date-input");
});

test("the MCP server answers with one section of a component's page, and searches every component", async () => {
  const button = await openDocs({ X_GOVUK_UI_DOCS: place }).component("button");
  expect(section(button.markdown, "styling")).toStartWith("## Styling\n");
  expect(section(button.markdown, "props")).toContain("| `variant` |");
  const about = section(button.markdown, "about") ?? "";
  expect(about).toStartWith("# Button");
  expect(about).not.toContain("## Props");
  // A page's hooks and functions, and its words, are sections of their own.
  const form = await openDocs({ X_GOVUK_UI_DOCS: place }).component("form");
  expect(section(form.markdown, "functions")).toStartWith("## Hooks and functions\n");
  expect(section(form.markdown, "words")).toContain("### `formSteps`");
  expect(section(form.markdown, "about")).not.toContain("validateWith`\n");
  expect(section(button.markdown, "words")).toBeUndefined();
  // A data attribute finds its component, and a word every component shares finds none above it.
  expect(search(index, "data-loading")[0]?.slug).toBe("button");
  expect(search(index, "x-govuk-ui date of birth")[0]?.slug).toBe("date-input");
  expect(search(index, "--x-govuk-ui-avatar-size")[0]?.slug).toBe("avatar");
  // A hook finds the component whose page has it. One on no page is found by its name.
  expect(search(index, "useFormSteps")[0]?.slug).toBe("form");
  expect(search(index, "useFormSteps")[0]?.found).toContain("function useFormSteps");
  expect(sharedFunctions(index, "what does useLocale give").map((one) => one.name)).toEqual([
    "useLocale",
  ]);
  expect(sharedFunctions(index, "use the locale")).toEqual([]);
});

test("the MCP server reads the installed library's documents, or else the site's", () => {
  expect(installed(tmpdir())).toBeUndefined();
  expect(openDocs({}, tmpdir()).place).toBe("https://x-govuk-ui.org/docs/");
  expect(openDocs({ X_GOVUK_UI_DOCS: place }).place).toBe(place);
});

test("the MCP server answers over stdio, as an agent's client asks", async () => {
  const client = new Client({ name: "test", version: "1" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ["mcp/src/index.ts"],
      env: { X_GOVUK_UI_DOCS: place, PATH: process.env.PATH ?? "" },
      stderr: "ignore",
    }),
  );
  try {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "get_component",
      "get_props",
      "get_styling",
      "get_usage",
      "list_components",
      "search_docs",
    ]);
    const text = async (name: string, args: Record<string, unknown> = {}) => {
      const result = await client.callTool({ name, arguments: args });
      return {
        error: Boolean(result.isError),
        text: (result.content as { text: string }[])[0]?.text ?? "",
      };
    };
    expect((await text("get_component", { name: "Button", section: "styling" })).text).toContain(
      "`data-loading`",
    );
    expect(
      JSON.parse((await text("get_styling", { name: "avatar" })).text).properties,
    ).toContainEqual(expect.objectContaining({ name: "--x-govuk-ui-avatar-size", value: "40px" }));
    const props = JSON.parse((await text("get_props", { name: "Button" })).text);
    expect(props.props[0].name).toBe("variant");
    // Each part has its own props, as the component's own export has them.
    expect(props.parts).toEqual([
      {
        name: "ButtonGroup",
        doc: expect.any(String),
        props: [expect.objectContaining({ name: "stack" })],
      },
      { name: "Button", doc: expect.any(String), props: props.props },
    ]);
    expect((await text("search_docs", { query: "useLocale" })).text).toStartWith(
      "- `useLocale`, from `x-govuk-ui`, is `() => string`, and is on no component's page.",
    );
    expect((await text("list_components", { group: "Media" })).text.split("\n")).toHaveLength(5);
    expect((await text("get_usage")).text).toContain("x-govuk-ui/styles.css");
    const wrong = await text("get_component", { name: "datepicker" });
    expect(wrong).toEqual({ error: true, text: expect.stringContaining("date-input") });
  } finally {
    await client.close();
  }
});

test("the MCP server answers from an older library's documents, which give no part its props", async () => {
  const docs = openDocs({ X_GOVUK_UI_DOCS: older });
  const old = await docs.index();
  expect(search(old, "data-loading")[0]?.slug).toBe("button");
  expect(sharedFunctions(old, "useLocale")).toEqual([]);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ["mcp/src/index.ts"],
      env: { X_GOVUK_UI_DOCS: older, PATH: process.env.PATH ?? "" },
      stderr: "ignore",
    }),
  );
  try {
    const text = async (name: string, args: Record<string, unknown>) => {
      const result = await client.callTool({ name, arguments: args });
      return (result.content as { text: string }[])[0]?.text ?? "";
    };
    const props = JSON.parse(await text("get_props", { name: "Button" }));
    expect(props.props[0].name).toBe("variant");
    expect(props.parts[1]).toEqual({ name: "Button", doc: expect.any(String) });
    expect(await text("search_docs", { query: "useLocale" })).toBe("No component matches.");
    expect(await text("get_component", { name: "Button", section: "words" })).toBe(
      "Button has no words section.",
    );
  } finally {
    await client.close();
  }
});
