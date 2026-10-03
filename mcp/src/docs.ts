/**
 * Where the MCP server reads its documents. It reads the copy inside the project's installed
 * `x-govuk-ui`, so they describe the version it uses, or else the site's copy. `X_GOVUK_UI_DOCS`
 * names another place, a directory or an address, such as a local build's `dist/docs`.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SITE } from "../../site/address";
import type { ComponentDoc, DocsIndex } from "../../site/llms";

/** The site's copy, for a project that has not installed the library. */
export const SITE_DOCS = `${SITE}/docs/`;

export type Docs = {
  /** Where the documents come from, which is a directory or an address. */
  place: string;
  index(): Promise<DocsIndex>;
  component(slug: string): Promise<ComponentDoc>;
};

/** The installed library's documents, searched for from `from` up to the root. */
export function installed(from: string): string | undefined {
  let directory = from;
  while (true) {
    const docs = join(directory, "node_modules", "x-govuk-ui", "dist", "lib", "docs");
    if (existsSync(join(docs, "index.json"))) return docs;
    const parent = dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

/** The documents, each read once, when it is first requested. */
export function openDocs(
  env: Record<string, string | undefined> = process.env,
  from = process.cwd(),
): Docs {
  const place = env.X_GOVUK_UI_DOCS || installed(from) || SITE_DOCS;
  const remote = /^https?:\/\//.test(place);
  const read = async (path: string): Promise<unknown> => {
    if (!remote) return JSON.parse(await readFile(join(place, path), "utf8"));
    const response = await fetch(new URL(path, place.endsWith("/") ? place : `${place}/`));
    if (!response.ok) throw new Error(`${response.status} from ${response.url}`);
    return response.json();
  };
  const cache = new Map<string, Promise<unknown>>();
  const once = (path: string) => {
    let pending = cache.get(path);
    if (!pending) {
      pending = read(path);
      // A failed read is tried again next time, such as when the network is back.
      pending.catch(() => cache.delete(path));
      cache.set(path, pending);
    }
    return pending;
  };
  return {
    place,
    index: () => once("index.json") as Promise<DocsIndex>,
    component: (slug) => once(`${slug}.json`) as Promise<ComponentDoc>,
  };
}
