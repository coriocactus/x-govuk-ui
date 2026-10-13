/*
 * What each component's parts do with what a service gives them. Every component's example renders
 * on the server, as the workbench first shows it, with every part the packages export watched as it
 * renders. Each part is given a class, a data attribute and a style, and all three must reach one
 * element it renders. The test samples each example's first render, so a part that it does not
 * show, such as a closed dialog's content, is left to its own tests and to the type check of its
 * props, `tests/types/conventions.ts`.
 *
 * Bun replaces each package's parts for this file alone, because `bun run test` runs each file on
 * its own. It replaces the exports themselves, so a part that another part renders is watched too.
 * A group that reads its direct children, such as FormSteps for its first HTML, therefore meets
 * each part as if it were in a wrapper of your own, which is the harder case.
 */

import { expect, mock, test } from "bun:test";
import { type ComponentType, type CSSProperties, createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { boxed, described, elementless, unstyled } from "../types/exceptions";

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

/**
 * A part is a component, whose name starts with a capital letter. It is a function, or an object
 * that React renders, such as one made by `memo`. A context is not a part.
 */
const isPart = (name: string, value: unknown) =>
  /^[A-Z]/.test(name) &&
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

/** What each part in the html did not give to one element of its own. */
function lost(html: string) {
  const problems: string[] = [];
  for (const from of html.matchAll(/<template data-from="([^"]+)"><\/template>/g)) {
    const mark = from[1] ?? "";
    const start = from.index + from[0].length;
    const end = html.indexOf(`<template data-to="${mark}"></template>`, start);
    if (end < 0) throw new Error(`The marks of ${mark} are not closed.`);
    const inside = shown(html.slice(start, end));
    // A part that shows nothing yet, such as a closed tour, has no element to give them to.
    if (!/<[a-z]/.test(inside)) continue;
    const part = givenTo.get(mark) ?? mark;
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
