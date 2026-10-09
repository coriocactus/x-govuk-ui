import { packages } from "./stage";

// Each package's CHANGELOG.md. Entries go under `## [Unreleased]` as changes land. A release
// stamps them with the version and the date, and the GitHub release shows them as its notes.
//
//   bun scripts/changelog.ts notes 0.3.0

/** The sections a version's entries go in, in this order. */
export const SECTIONS = ["Breaking Changes", "Visual", "Added", "Changed", "Fixed", "Removed"];

/** Sections whose entries need a minor version, because they can break a service. */
export const BREAKING = ["Breaking Changes", "Visual", "Removed"];

/** One version's entries, or the unreleased ones, by section. */
export type Entries = { heading: string; sections: Map<string, string> };

/** Every version in a changelog, newest first, with the unreleased entries first of all. */
export function parse(text: string): Entries[] {
  const versions: Entries[] = [];
  let section = "";
  for (const line of text.split("\n")) {
    const version = line.match(/^## (.+)$/);
    const heading = line.match(/^### (.+)$/);
    if (version) {
      versions.push({ heading: version[1] ?? "", sections: new Map() });
      section = "";
    } else if (heading && versions.length) {
      section = heading[1] ?? "";
      versions.at(-1)?.sections.set(section, "");
    } else if (section && versions.length) {
      const sections = versions.at(-1)?.sections;
      sections?.set(section, `${sections.get(section) ?? ""}${line}\n`);
    }
  }
  for (const version of versions)
    for (const [name, body] of version.sections) version.sections.set(name, body.trim());
  return versions;
}

/** The unreleased entries' sections that have any entries. */
export function unreleased(text: string) {
  const entries = parse(text).find((version) => version.heading === "[Unreleased]");
  return [...(entries?.sections ?? new Map<string, string>())].filter(([, body]) => body);
}

/**
 * The changelog with its unreleased entries stamped with the version and the date, under an empty
 * `## [Unreleased]` for the next ones. A package with no entries of its own says so.
 */
export function stamp(text: string, version: string, date: string) {
  const start = text.indexOf("## [Unreleased]");
  if (start < 0) throw new Error("A changelog has no ## [Unreleased] section");
  const after = text.indexOf("\n## ", start + 1);
  const end = after < 0 ? text.length : after + 1;
  const body = text.slice(start + "## [Unreleased]".length, end).trim();
  const entries = body || "No changes of its own.";
  return `${text.slice(0, start)}## [Unreleased]\n\n## [${version}] - ${date}\n\n${entries}\n\n${text.slice(end)}`.replace(
    /\n{3,}/g,
    "\n\n",
  );
}

/** A version's entries in every package, as the GitHub release's notes. */
export async function notes(version: string) {
  const parts: string[] = [];
  for (const directory of packages) {
    const { name } = await Bun.file(`${directory}/package.json`).json();
    const text = await Bun.file(`${directory}/CHANGELOG.md`).text();
    const entries = parse(text).find((entry) => entry.heading.startsWith(`[${version}]`));
    const sections = [...(entries?.sections ?? [])].filter(([, body]) => body);
    if (!sections.length) continue;
    parts.push(
      `## ${name}\n\n${sections.map(([section, body]) => `### ${section}\n\n${body}`).join("\n\n")}`,
    );
  }
  return parts.length ? parts.join("\n\n") : "No changes.";
}

if (import.meta.main) {
  const [command, version] = process.argv.slice(2);
  if (command !== "notes" || !version)
    throw new Error("Give the version, such as: bun scripts/changelog.ts notes 0.3.0");
  console.log(await notes(version));
}
