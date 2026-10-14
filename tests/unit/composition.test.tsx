/*
 * What each component's parts do with what a service gives them. Every component's example renders
 * on the server, as the workbench first shows it, with every part the packages export watched as it
 * renders. Each part is given a class, a data attribute and a style, and all three must reach one
 * element it renders. The test samples each example's first render. A part that it does not show,
 * such as a closed dialog's content, is listed in `unchecked` in `tests/types/exceptions.ts`, with
 * the reason, and is left to its own tests and to the type check of its props.
 *
 * The test checks what reaches the element, not `ref`, handlers or `aria-*`, which a server render
 * cannot show apart from the data attribute.
 *
 * Bun replaces each package's parts for this file alone, because `bun run test` runs each file on
 * its own. It replaces them inside the packages too, so a part that another part renders is
 * watched. A group that finds its parts by type among its children, as Radios does for its first
 * HTML, therefore still finds them. A part in a wrapper of a service's own is left to the browser
 * tests of the examples that wrap their parts, such as Form's and Select's.
 */

import { expect, mock, test } from "bun:test";
import { type ComponentType, type CSSProperties, createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { boxed, described, elementless, unchecked, unstyled } from "../types/exceptions";

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

/** Whether a function is a class that React does not render, such as one of Lexical's nodes. */
const isOtherClass = (value: unknown) =>
  typeof value === "function" &&
  /^class[\s{]/.test(Function.prototype.toString.call(value)) &&
  !(value as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent;

/**
 * A part is a component, whose name starts with a capital letter. It is a function, or an object
 * that React renders, such as one made by `memo`. A context is not a part, nor is a class that
 * React does not render, such as the Editor's MentionNode.
 */
const isPart = (name: string, value: unknown) =>
  /^[A-Z]/.test(name) &&
  !isOtherClass(value) &&
  (typeof value === "function" ||
    (typeof value === "object" &&
      value !== null &&
      [Symbol.for("react.memo"), Symbol.for("react.forward_ref")].includes(
        (value as { $$typeof?: symbol }).$$typeof as symbol,
      )));

/** Parts that render no element of their own, which have nowhere to put what they are given. */
const elementFree = new Set<string>([...elementless, ...described]);
const styleFree = new Set<string>(unstyled);
const boxes = new Set<string>(boxed);

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

for (const name of packages)
  mock.module(name, () =>
    Object.fromEntries(
      Object.entries(own[name] ?? {}).map(([key, value]) => [
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

/** Renders while every part is given its marks. */
function rendered(element: Parameters<typeof renderToStaticMarkup>[0]) {
  giving = true;
  try {
    return renderToStaticMarkup(element);
  } finally {
    giving = false;
  }
}

/** What a part shows. A hidden element and an empty live region show nothing. */
const shown = (html: string) =>
  html
    .replace(/<template data-(?:from|to)="[^"]*"><\/template>/g, "")
    .replace(/<(\w+)[^>]*?(?: hidden=""| role="status"| aria-live="\w+")[^>]*><\/\1>/g, "");

/** The opening tag in the html that has the attribute, if one does. */
const tagWith = (html: string, attribute: string) =>
  html.match(new RegExp(`<[a-z][^>]* ${attribute}[^>]*>`))?.[0];

/**
 * Each part in the html that shows an element, with its mark and what it shows. A part that shows
 * nothing yet, such as a closed tour, has no element to give its marks to.
 */
function* partsShown(html: string) {
  for (const from of html.matchAll(/<template data-from="([^"]+)"><\/template>/g)) {
    const mark = from[1] ?? "";
    const start = from.index + from[0].length;
    const end = html.indexOf(`<template data-to="${mark}"></template>`, start);
    if (end < 0) throw new Error(`The marks of ${mark} are not closed.`);
    const inside = shown(html.slice(start, end));
    if (/<[a-z]/.test(inside)) yield { part: givenTo.get(mark) ?? mark, mark, inside };
  }
}

/** What each part in the html did not give to one element of its own. */
function lost(html: string) {
  const problems: string[] = [];
  for (const { part, mark, inside } of partsShown(html)) {
    const hasClass = (tag: string) => new RegExp(`class="(?:[^"]* )?${mark}(?: [^"]*)?"`).test(tag);
    const hasStyle = (tag: string) => styleFree.has(part) || tag.includes(`--${mark}:1`);
    const hasData = (tag: string) => tag.includes(`data-${mark}=""`);
    // A boxed part's class and style go on its box, and the rest on its control. Every other part
    // gives all three to the element with its data attribute.
    const checks = { data: hasData, class: hasClass, style: hasStyle };
    const together: (keyof typeof checks)[] = boxes.has(part)
      ? ["class", "style"]
      : ["data", "class", "style"];
    const element = tagWith(
      inside,
      boxes.has(part) ? `class="(?:[^"]* )?${mark}[ "]` : `data-${mark}=""`,
    );
    for (const what of Object.keys(checks) as (keyof typeof checks)[]) {
      const has = checks[what];
      if (!has(inside)) problems.push(`${part} drops its ${what}`);
      else if (element && together.includes(what) && !has(element))
        problems.push(`${part} puts its ${what} on another element`);
    }
  }
  return [...new Set(problems)];
}

test("the test finds a part that drops what it is given, and watches parts inside parts", () => {
  // A part of the test's own that keeps only the class, as a careless part would.
  const Careless = watched("Careless", ({ className }: Props) =>
    createElement("div", { className: className as string }),
  );
  expect(lost(rendered(createElement(Careless)))).toEqual([
    "Careless drops its data",
    "Careless drops its style",
  ]);
  // Input renders InputControl, which Bun's replacement reaches too.
  rendered(exampleOf("input"));
  expect([...givenTo.values()]).toContain("InputControl");
});

for (const name of componentNames)
  test(`${name}'s parts give one element the class, data and style a service gives them`, () => {
    expect(lost(rendered(exampleOf(name)))).toEqual([]);
  });

test("every part is checked here, or listed with the reason it is not", () => {
  const checked = new Set<string>();
  for (const name of componentNames)
    for (const { part } of partsShown(rendered(exampleOf(name)))) checked.add(part);
  const listed = new Set<string>(Object.values(unchecked).flat());
  const parts = packages
    .flatMap((name) => Object.entries(own[name] ?? {}))
    .filter(([name, value]) => isPart(name, value) && !elementFree.has(name))
    .map(([name]) => name);
  // A part neither checked nor listed is new. Its example should show it, or the list say why not.
  expect(parts.filter((part) => !checked.has(part) && !listed.has(part))).toEqual([]);
  // A listed part that an example now shows leaves the list.
  expect([...listed].filter((part) => checked.has(part))).toEqual([]);
});
