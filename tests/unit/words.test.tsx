/*
 * Every word a component writes comes from a LabelsProvider. Each component's example renders on
 * the server, as the workbench first shows it, under a provider that gives every word as a mark,
 * such as ⟦pagination.next⟧. No English default may be left on the page, unless the example writes
 * the same words itself. The test samples each example's first render, so a word that shows only
 * later, such as Copied, is left to the component's own tests. A component that renders on the
 * server takes its words from its props, so its example is left out, as `ownWords` in
 * `tests/types/exceptions.ts` lists.
 */

import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as Belsize from "@x-govuk-ui/belsize";
import * as Jorjorwel from "@x-govuk-ui/jorjorwel";
import * as Memetics from "@x-govuk-ui/memetics";
import { type ComponentType, isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Core from "x-govuk-ui";
import { type Labels, LabelsProvider } from "x-govuk-ui";
import { type ComponentName, catalogue, componentNames } from "../../site/catalogue";
import { examples } from "../../site/examples";
import { startingArgs } from "../../site/props";
import { ownWords } from "../types/exceptions";

/**
 * Every map of words' English defaults, by its key in a LabelsProvider. The type check makes sure
 * that every map's defaults are exported, named by its key. A map's `locale` is no word.
 */
const defaults = Object.entries({ ...Core, ...Jorjorwel, ...Memetics, ...Belsize }).flatMap(
  ([name, value]) => {
    const key = /^default(\w+)Labels$/.exec(name)?.[1];
    if (!key) return [];
    const words = Object.entries(value as Record<string, unknown>).filter(
      ([word]) => word !== "locale",
    );
    return [[`${key[0]?.toLowerCase()}${key.slice(1)}`, words] as const];
  },
);

const decoded = (text: string) =>
  text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * Every word as a mark that says whose it is. A map inside a map, such as Tiles' sides, is marked
 * word by word. A word of a shape the test does not know fails the test.
 */
function markOf(value: unknown, mark: string): unknown {
  if (typeof value === "function") return () => mark;
  if (typeof value === "string" || isValidElement(value)) return mark;
  if (Array.isArray(value)) return value.map((_, index) => `${mark}${index}`);
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(
      Object.entries(value).map(([word, each]) => [word, markOf(each, `${mark}.${word}`)]),
    );
  throw new Error(`The test cannot mark ${mark}, which is neither words nor a function.`);
}
const marked = Object.fromEntries(
  defaults.map(([key, words]) => [
    key,
    Object.fromEntries(words.map(([word, value]) => [word, markOf(value, `⟦${key}.${word}⟧`)])),
  ]),
) as Labels;

/** Words in any language have two lower-case letters together. A name such as GOV.UK does not. */
const isWords = (text: string) => /\p{Ll}{2}/u.test(text);

/** Text with a stand-in for each thing put into it, which a pattern can then find. */
const stand = (index: number) => `\uE000${index}\uE000`;

/** A pattern that finds the English words, whole, in a line of the page. */
const wordsPattern = (words: string) =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${words
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\uE000\d+\uE000/g, ".+?")}(?![\\p{L}\\p{N}])`,
    "u",
  );

/**
 * A word's English, line by line. A sentence that a function writes, such as "Page 3", has a
 * stand-in for what is put into it. Words that are React content give each line of their text.
 */
function englishOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (isValidElement(value))
    return [...renderToStaticMarkup(value).matchAll(/>([^<]+)</g)].map((match) =>
      decoded(match[1] ?? ""),
    );
  if (Array.isArray(value)) return value.flatMap(englishOf);
  if (typeof value === "function")
    try {
      return englishOf(value(...Array.from({ length: value.length }, (_, index) => stand(index))));
    } catch {
      // A function that needs a number or a list, not words, is left out.
      return [];
    }
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(englishOf);
  return [];
}

/** The English defaults, as patterns. */
const english = defaults.flatMap(([key, words]) =>
  words.flatMap(([word, value]) =>
    englishOf(value)
      .filter(isWords)
      .map((text) => ({ name: `${key}.${word}`, text, pattern: wordsPattern(text) })),
  ),
);

/** What a page says: its text, and the attributes that a screen reader or a tooltip reads. */
const said = (html: string) =>
  [
    ...[...html.matchAll(/>([^<]+)</g)].map((match) => match[1] ?? ""),
    ...[
      ...html.matchAll(
        / (?:aria-label|aria-description|aria-roledescription|aria-valuetext|title|alt|placeholder)="([^"]*)"/g,
      ),
    ].map((match) => match[1] ?? ""),
  ].map(decoded);

const examplesFolder = join(import.meta.dir, "../../site/examples");

/**
 * The words an example writes itself: its strings and its JSX text, with those of the files beside
 * it that it imports. Its comments and its names, such as a variable called `close`, are left out,
 * because they are not on the page.
 */
function wordsOf(name: string) {
  const file = join(examplesFolder, `${name}.tsx`);
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf8");
  const beside = [...text.matchAll(/from "\.\/([^"]+)"/g)]
    .map((match) =>
      [".ts", ".tsx"]
        .map((ending) => join(examplesFolder, `${match[1]}${ending}`))
        .find(existsSync),
    )
    .filter((path): path is string => Boolean(path))
    .map((path) => readFileSync(path, "utf8"));
  const source = [text, ...beside]
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
  return [
    ...source.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`([^`]*)`|>([^<>{}]+)</g),
  ].map((match) => match.slice(1).find((part) => part !== undefined) ?? "");
}

/** A component's example as the workbench first shows it, muted. */
function exampleOf(name: ComponentName) {
  const { props, example = [] } = catalogue[name];
  const Example = examples[name] as ComponentType<Record<string, unknown>>;
  return <Example {...startingArgs([...props, ...example])} muted />;
}

test("the test knows the English of words that functions write", () => {
  const pageNumber = english.find(({ name }) => name === "pagination.pageNumber");
  expect(pageNumber?.pattern.test("Page 3")).toBe(true);
  expect(pageNumber?.pattern.test("Pages 3")).toBe(false);
});

/** The component an example shows, by its export's name, such as BulletChart for bullet-chart. */
const exportOf = (name: string) =>
  name.replace(/(?:^|-)(\w)/g, (_, letter: string) => letter.toUpperCase());

/** Whether an example writes the words, whole, in any case, with anything put into them. */
const writes = (own: string[], text: string) =>
  text
    .split(/\uE000\d+\uE000/)
    .map((piece) => piece.trim())
    .filter(isWords)
    .every((piece) =>
      own.some(
        (words) =>
          wordsPattern(piece).test(words) || new RegExp(wordsPattern(piece), "iu").test(words),
      ),
    );

for (const name of componentNames.filter((each) => !(exportOf(each) in ownWords)))
  test(`${name} takes every word it writes from a LabelsProvider`, () => {
    const html = renderToStaticMarkup(
      <LabelsProvider labels={marked}>{exampleOf(name)}</LabelsProvider>,
    );
    // An example's own words, such as its questions, are the service's, in any language. A data
    // key, such as "month", can be written as a heading, such as "Month".
    const own = wordsOf(name);
    // A mark, such as ⟦editor.file⟧, is no English.
    const lines = said(html).map((line) => line.replace(/⟦[^⟧]*⟧\d*/g, " "));
    const written = lines.flatMap((line) =>
      english
        .filter(({ pattern }) => pattern.test(line))
        .filter(({ text }) => !writes(own, text))
        .map(
          ({ name: word, text }) =>
            `${word}: ${text.replace(/\uE000\d+\uE000/g, "…")} ⇐ ${line.trim().slice(0, 80)}`,
        ),
    );
    expect([...new Set(written)]).toEqual([]);
  });
