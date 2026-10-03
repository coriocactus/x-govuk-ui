/**
 * What the MCP server's tools do, apart from the protocol. They find a component by any of its
 * names, cut one section from its page, and search every component.
 */
import type { DocsIndex } from "../../site/llms";

export type Entry = DocsIndex["components"][number];

/**
 * A name without case, spaces or hyphens, so `Date input`, `date-input` and `DateInput` match.
 */
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

/** The component a name means, by its slug, its name or its export. */
export function resolve(index: DocsIndex, name: string): Entry | undefined {
  const wanted = key(name);
  return index.components.find((entry) =>
    [entry.slug, entry.name, entry.export].some((form) => key(form) === wanted),
  );
}

/** The slugs to offer for a name that matches no component. */
export function suggestions(index: DocsIndex, name: string): string[] {
  const wanted = key(name);
  // One name inside the other, or the same start, as `datepicker` starts as `Date input` does.
  const near = index.components.filter((entry) => {
    const own = key(entry.name);
    return (
      wanted.length > 2 &&
      (own.includes(wanted) || wanted.includes(own) || own.slice(0, 4) === wanted.slice(0, 4))
    );
  });
  return (near.length ? near : search(index, name, 3)).slice(0, 3).map((entry) => entry.slug);
}

export const sections = ["about", "parts", "props", "example", "styling"] as const;
export type Section = (typeof sections)[number];
const headings: Record<Exclude<Section, "about">, string> = {
  parts: "Parts",
  props: "Props",
  example: "Example",
  styling: "Styling",
};

/**
 * One section of a component's page. `about` is the page's head and what the component does here,
 * which is everything except its parts, props, example and styling.
 */
export function section(markdown: string, name: Section): string | undefined {
  const chunks = markdown.split(/^(?=## )/m);
  if (name === "about")
    return chunks
      .filter((chunk) => !/^## (Parts|Props|Example|Styling)\n/.test(chunk))
      .join("")
      .trim();
  return chunks.find((chunk) => chunk.startsWith(`## ${headings[name]}\n`))?.trim();
}

export type Match = Entry & {
  /** How strongly it matches, highest first. */
  score: number;
  /** What matched, such as `attribute data-loading`. */
  found: string[];
};

/**
 * The components a query is about, the strongest match first. Each word counts for more in a
 * component's name or parts than in its description or notes. It counts for less the more
 * components it appears in, so a word every component shares, such as `x-govuk-ui`, counts for
 * nothing.
 */
export function search(index: DocsIndex, query: string, limit = 10): Match[] {
  const terms = [...new Set(query.toLowerCase().split(/[^a-z0-9-]+/))].filter(
    (term) => term.replace(/-/g, "").length > 1,
  );
  const scored = new Map<string, Match>();
  for (const term of terms) {
    const hits = index.components.flatMap((entry) => {
      const found: string[] = [];
      let score = 0;
      const look = (what: string, items: readonly string[], exact: number, partial: number) => {
        for (const item of items) {
          const lower = item.toLowerCase();
          if (lower === term) {
            score += exact;
            found.push(`${what} ${item}`);
          } else if (lower.includes(term)) {
            score += partial;
            if (found.length < 6) found.push(`${what} ${item}`);
          }
        }
      };
      look("component", [entry.name, entry.slug, entry.export], 20, 8);
      look("part", entry.words.parts, 10, 4);
      look("attribute", entry.words.attributes, 8, 3);
      look("property", entry.words.properties, 8, 3);
      look("class", entry.words.classes, 6, 2);
      look("prop", entry.words.props, 5, 2);
      if (entry.description.toLowerCase().includes(term)) {
        score += 3;
        found.push("description");
      }
      if (entry.words.notes.toLowerCase().includes(term)) {
        score += 1;
        found.push("notes");
      }
      return score ? [{ entry, score, found }] : [];
    });
    // A word in many components says little about which one is meant.
    const weight = Math.log((index.components.length + 1) / (hits.length + 0.5));
    for (const { entry, score, found } of hits) {
      const match = scored.get(entry.slug) ?? { ...entry, score: 0, found: [] };
      match.score += score * weight;
      match.found.push(...found.filter((what) => !match.found.includes(what)));
      scored.set(entry.slug, match);
    }
  }
  return [...scored.values()]
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
