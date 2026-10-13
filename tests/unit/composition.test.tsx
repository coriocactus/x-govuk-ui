/*
 * What each component's parts do with what a service gives them. Every component's example renders
 * on the server, as the workbench first shows it, with every part the packages export watched as it
 * renders. A part that the first render does not show, such as a closed dialog's content, is left
 * to its own tests and to the type check of its props, `tests/types/conventions.ts`.
 *
 * Bun replaces each package for this file alone, because `bun run test` runs each file on its own.
 */

import { expect, mock, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type ComponentType, type CSSProperties, createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Labels, LabelsProviderProps } from "x-govuk-ui";
import { described, elementless, unstyled } from "../types/exceptions";

type Props = Record<string, unknown>;

const packages = [
  "x-govuk-ui",
  "@x-govuk-ui/jorjorwel",
  "@x-govuk-ui/memetics",
  "@x-govuk-ui/belsize",
];

/** Each package's exports as they are, kept before its parts are watched. */
const own: Record<string, Props> = {};
for (const name of packages) own[name] = { ...(await import(name)) };

/** A part is a component, whose name starts with a capital letter. */
const isPart = (name: string, value: unknown) => /^[A-Z]/.test(name) && typeof value === "function";

/** Parts that render no element of their own, which have nowhere to put what they are given. */
const elementFree = new Set<string>([...elementless, ...described]);
const styleFree = new Set<string>(unstyled);

/** Whether parts are given a class, data and a style, each marked with its own number. */
let giving = false;
let given = 0;
/** The part each mark was given to. */
const givenTo = new Map<string, string>();

/**
 * A part that, while `giving`, is given a class, a data attribute and a style, as a service gives
 * them. Empty templates on each side mark what the part renders.
 */
function watched(name: string, Part: ComponentType<Props>) {
  function Watched(props: Props) {
    if (!giving || elementFree.has(name)) return createElement(Part, props);
    const mark = `given-${given++}`;
    givenTo.set(mark, name);
    return createElement(
      Fragment,
      null,
      createElement("template", { "data-from": mark }),
      createElement(Part, {
        ...props,
        className: [props.className, mark].filter(Boolean).join(" "),
        [`data-${mark}`]: "",
        style: styleFree.has(name)
          ? props.style
          : { ...(props.style as CSSProperties), [`--${mark}`]: 1 },
      }),
      createElement("template", { "data-to": mark }),
    );
  }
  return Watched;
}

// Bun replaces each part wherever it is used, so a part that another part renders is watched too.
for (const name of packages)
  mock.module(name, () =>
    Object.fromEntries(
      Object.entries(own[name]).map(([key, value]) => [
        key,
        isPart(key, value) ? watched(key, value as ComponentType<Props>) : value,
      ]),
    ),
  );

// The examples import the packages, so they are imported once the packages are replaced.
const { examples } = await import("../../site/examples");
const { catalogue, componentNames } = await import("../../site/catalogue");
const { startingArgs } = await import("../../site/props");

/** A component's example as the workbench first shows it, muted. */
function exampleOf(name: (typeof componentNames)[number]) {
  const { props, example = [] } = catalogue[name];
  const Example = examples[name] as ComponentType<Props>;
  return createElement(Example, { ...startingArgs([...props, ...example]), muted: true });
}

/** What a part shows. A hidden element and an empty live region show nothing. */
const shown = (html: string) =>
  html
    .replace(/<template data-(?:from|to)="[^"]*"><\/template>/g, "")
    .replace(/<(\w+)[^>]*?(?: hidden=""| role="status"| aria-live="\w+")[^>]*><\/\1>/g, "");

for (const name of componentNames)
  test(`${name}'s parts give their element the class, data and style a service gives them`, () => {
    giving = true;
    let html = "";
    try {
      html = renderToStaticMarkup(exampleOf(name));
    } finally {
      giving = false;
    }
    const dropped: string[] = [];
    for (const from of html.matchAll(/<template data-from="([^"]+)"><\/template>/g)) {
      const mark = from[1] ?? "";
      const start = from.index + from[0].length;
      const end = html.indexOf(`<template data-to="${mark}"></template>`, start);
      const inside = shown(html.slice(start, end));
      // A part that shows nothing yet, such as a closed tour, has no element to give them to.
      if (!/<[a-z]/.test(inside)) continue;
      const part = givenTo.get(mark) ?? mark;
      const lost = [
        !new RegExp(`class="(?:[^"]* )?${mark}(?: [^"]*)?"`).test(inside) && "class",
        !inside.includes(`data-${mark}=""`) && "data",
        !styleFree.has(part) && !inside.includes(`--${mark}:1`) && "style",
      ].filter(Boolean);
      if (lost.length) dropped.push(`${part} drops its ${lost.join(" and ")}`);
    }
    expect([...new Set(dropped)]).toEqual([]);
  });

const { LabelsProvider } = own["x-govuk-ui"] as {
  LabelsProvider: ComponentType<LabelsProviderProps>;
};

/**
 * Every map of words' English defaults, by its key in a LabelsProvider. The type check makes sure
 * that every map's defaults are exported, named by its key. A map's `locale` is no word.
 */
const defaults = Object.entries(Object.assign({}, ...Object.values(own)) as Props).flatMap(
  ([name, value]) => {
    const key = /^default(\w+)Labels$/.exec(name)?.[1];
    if (!key) return [];
    const words = Object.entries(value as Props).filter(([word]) => word !== "locale");
    return [[`${key[0]?.toLowerCase()}${key.slice(1)}`, words] as const];
  },
);

/** Every word as a mark that says whose it is, such as ⟦pagination.next⟧. */
const marked = Object.fromEntries(
  defaults.map(([key, words]) => [
    key,
    Object.fromEntries(
      words.map(([word, value]) => {
        const mark = `⟦${key}.${word}⟧`;
        if (typeof value === "function") return [word, () => mark];
        if (Array.isArray(value)) return [word, value.map((_, index) => `${mark}${index}`)];
        return [word, typeof value === "string" ? mark : value];
      }),
    ),
  ]),
);

/** The English words. A name such as GOV.UK, with no lower-case word in it, reads the same in any language. */
const english = new Set(
  defaults.flatMap(([, words]) =>
    words
      .flatMap(([, value]) => [value].flat())
      .filter((value): value is string => typeof value === "string" && /[a-z]{2}/.test(value))
      .map((value) => value.trim()),
  ),
);

const decoded = (text: string) =>
  text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

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
 * An example's source, with the files beside it that it imports, where its own words are. Its
 * comments are left out, because a comment's words are not on the page.
 */
function sourceOf(name: string) {
  const file = join(examplesFolder, `${name}.tsx`);
  if (!existsSync(file)) return "";
  const text = readFileSync(file, "utf8");
  const beside = [...text.matchAll(/from "\.\/([^"]+)"/g)]
    .map((match) =>
      [".ts", ".tsx"]
        .map((ending) => join(examplesFolder, `${match[1]}${ending}`))
        .find(existsSync),
    )
    .filter((path): path is string => Boolean(path))
    .map((path) => readFileSync(path, "utf8"));
  return [text, ...beside]
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

/** Whether a source writes the words, whole, in any case, such as a data key "month" for "Month". */
const writes = (source: string, words: string) =>
  new RegExp(`(?<![A-Za-z])${words.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "i").test(
    source,
  );

for (const name of componentNames)
  test(`${name} takes every word it writes from a LabelsProvider`, () => {
    const html = renderToStaticMarkup(
      <LabelsProvider labels={marked as Labels}>{exampleOf(name)}</LabelsProvider>,
    );
    // An example's own words, such as its questions, are the service's, in any language.
    const source = sourceOf(name);
    const written = said(html).filter((text) => english.has(text) && !writes(source, text));
    expect([...new Set(written)]).toEqual([]);
  });
