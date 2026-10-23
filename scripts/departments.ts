// Writes the government departments that two examples show, from GOV.UK's organisations API. Run
// `bun run departments` after a change of government departments or of GOV.UK Frontend.
//
// - The Logo carousel's departments are the ministerial departments GOV.UK lists as live, each in
//   GOV.UK Frontend's colour for it.
// - Tree select's organisations are the same departments, each with the live agencies and public
//   bodies it sponsors, and theirs. A body that two departments sponsor is listed under the first,
//   because each node of a tree has one place.
const carousel = "site/examples/logo-carousel.tsx";
const tree = "site/examples/organisations.ts";
const colours = await Bun.file(
  "node_modules/govuk-frontend/dist/govuk/settings/_colours-organisations.scss",
).text();
const colourOf = (brand: string | null) =>
  brand
    ? colours.match(new RegExp(`"${brand}": \\(\\s*colour: (#[0-9a-f]{6})`, "i"))?.[1]
    : undefined;

type Organisation = {
  id: string;
  title: string;
  format: string;
  details: {
    slug: string;
    abbreviation: string | null;
    govuk_status: string;
    organisation_brand_colour_class_name: string | null;
  };
  child_organisations: { id: string }[];
};
const live = new Map<string, Organisation>();
let next: string | undefined = "https://www.gov.uk/api/organisations";
while (next) {
  const response = await fetch(next, { headers: { "User-Agent": "x-govuk-ui workbench" } });
  if (!response.ok) throw new Error(`${next}: ${response.status}`);
  const page = (await response.json()) as { results: Organisation[]; next_page_url?: string };
  for (const organisation of page.results)
    if (organisation.details.govuk_status === "live") live.set(organisation.id, organisation);
  next = page.next_page_url;
}
const byTitle = (a: Organisation, b: Organisation) => a.title.localeCompare(b.title, "en-GB");
const ministerial = [...live.values()].filter(
  (organisation) => organisation.format === "Ministerial department",
);
if (ministerial.length === 0) throw new Error("GOV.UK listed no ministerial departments.");

// The Logo carousel's departments, in GOV.UK's order.
const departments = ministerial.flatMap((organisation) => {
  const colour = colourOf(organisation.details.organisation_brand_colour_class_name);
  return colour ? [[organisation.title, colour] as const] : [];
});
const source = await Bun.file(carousel).text();
const start = source.indexOf("const departments = [");
const end = source.indexOf("].map(", start);
if (start === -1 || end === -1) throw new Error(`${carousel} has no list of departments to write.`);
const list = departments
  .map(([name, colour]) => `  [${JSON.stringify(name)}, "${colour}"],`)
  .join("\n");
await Bun.write(
  carousel,
  `${source.slice(0, start)}const departments = [\n${list}\n${source.slice(end)}`,
);
console.log(`Wrote ${departments.length} departments to ${carousel}.`);

// Tree select's organisations, one to a line, indented two spaces for each level, as the example's
// module reads them. A body takes its place under the first department that reaches it.
const placed = new Set(ministerial.map((organisation) => organisation.id));
const lines: string[] = [];
const field = (text: string) => {
  if (text.includes("|"))
    throw new Error(`"${text}" has a "|", which the list keeps fields apart by.`);
  return text.trim();
};
// Some bodies give their whole name again as their abbreviation, sometimes after "The".
const bare = (name: string) => name.replace(/^the /i, "").toLowerCase();
const write = (organisation: Organisation, depth: number) => {
  const { slug, abbreviation } = organisation.details;
  const title = field(organisation.title);
  const short =
    abbreviation && bare(field(abbreviation)) !== bare(title) ? ` | ${field(abbreviation)}` : "";
  lines.push(`${"  ".repeat(depth)}${slug} | ${title}${short}`);
  const children = organisation.child_organisations
    .flatMap(({ id }) => {
      const child = live.get(id);
      return child && !placed.has(id) ? [child] : [];
    })
    .sort(byTitle);
  for (const child of children) placed.add(child.id);
  for (const child of children) write(child, depth + 1);
};
for (const department of [...ministerial].sort(byTitle)) write(department, 0);
const module = await Bun.file(tree).text();
const opening = "const listed = `\n";
const from = module.indexOf(opening);
const to = module.indexOf("`;", from);
if (from === -1 || to === -1) throw new Error(`${tree} has no list of organisations to write.`);
await Bun.write(
  tree,
  `${module.slice(0, from + opening.length)}${lines.join("\n")}\n${module.slice(to)}`,
);
console.log(`Wrote ${lines.length} organisations to ${tree}.`);
