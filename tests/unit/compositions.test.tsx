import { expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { type Compiled, componentFrom, partsOf } from "../../site/composition";
import { compiledComposition, compositions } from "../../site/sources";

// What each view Piscine Assist composes says first, from the workspace's data as it starts.
const opening: Record<string, string[]> = {
  application: ["Needs a decision", "1 October 1956", "Issue licence", "Ask for proof of age"],
  decisions: ["3 applications need a decision", "Liz Truss", "RL-48207: paid twice"],
  refund: ["Which payment do you want to refund?", "£24.50 at 10:02am on 29 September 2026"],
  licences: ["12-month licences have risen for 6 weeks in a row", "460"],
};

test("each composition compiles to a script the page loads, and draws as its source does", async () => {
  expect(Object.keys(compositions).sort()).toEqual(Object.keys(opening).sort());
  // Every script is written before any is imported, because Bun reads a folder's files once.
  const folder = await mkdtemp(join(tmpdir(), "compositions-"));
  const file = (name: string) => join(folder, `${name}.mjs`);
  for (const [name, path] of Object.entries(compositions))
    await writeFile(file(name), await compiledComposition(path));
  for (const [name, path] of Object.entries(compositions)) {
    // The page imports the compiled script and gives it the modules it imports.
    const Compiled = componentFrom((await import(file(name))) as Compiled, name);
    const Source = ((await import(`../../${path}`)) as { default: ComponentType }).default;
    const drawn = renderToStaticMarkup(<Compiled />);
    expect(drawn, name).toBe(renderToStaticMarkup(<Source />));
    for (const words of opening[name] ?? []) expect(drawn, name).toContain(words);
  }
});

test("a composition that imports anything but the library and the data does not compile", async () => {
  const folder = await mkdtemp(join(tmpdir(), "compositions-"));
  const file = join(folder, "fetches.tsx");
  await writeFile(file, 'import { readFile } from "node:fs";\nexport default () => readFile;\n');
  await expect(compiledComposition(file)).rejects.toThrow("which a composition cannot import");
});

test("a composition's parts are the names it imports from the library and its extensions", () => {
  expect(
    partsOf(`import { useState } from "react";
import { Chart } from "@x-govuk-ui/memetics";
import {
  Button,
  type TagColour,
  SummaryList,
} from "x-govuk-ui";
import { money } from "../workspace-data";`),
  ).toEqual(["Button", "Chart", "SummaryList"]);
});

test("a compiled composition with no component, or with an import the page lacks, is an error", () => {
  expect(() => componentFrom({ default: () => ({}) }, "empty")).toThrow(
    "The composition empty exports no component.",
  );
  expect(() =>
    componentFrom(
      {
        default: (require) => {
          require("constructor");
          return {};
        },
      },
      "inherited",
    ),
  ).toThrow("A composition cannot import constructor.");
});
