// Writes the Logo carousel example's departments, which are the ministerial departments GOV.UK
// lists as live, each in GOV.UK Frontend's colour for it. Run `bun run departments` after a change
// of government departments or of GOV.UK Frontend.
const example = "site/examples/logo-carousel.tsx";
const colours = await Bun.file(
  "node_modules/govuk-frontend/dist/govuk/settings/_colours-organisations.scss",
).text();
const colourOf = (brand: string | null) =>
  brand
    ? colours.match(new RegExp(`"${brand}": \\(\\s*colour: (#[0-9a-f]{6})`, "i"))?.[1]
    : undefined;

type Organisation = {
  title: string;
  format: string;
  details: { govuk_status: string; organisation_brand_colour_class_name: string | null };
};
const departments: [string, string][] = [];
let next: string | undefined = "https://www.gov.uk/api/organisations";
while (next) {
  const response = await fetch(next, { headers: { "User-Agent": "x-govuk-ui workbench" } });
  if (!response.ok) throw new Error(`${next}: ${response.status}`);
  const page = (await response.json()) as { results: Organisation[]; next_page_url?: string };
  for (const organisation of page.results) {
    if (organisation.format !== "Ministerial department") continue;
    if (organisation.details.govuk_status !== "live") continue;
    const colour = colourOf(organisation.details.organisation_brand_colour_class_name);
    if (colour) departments.push([organisation.title, colour]);
  }
  next = page.next_page_url;
}
if (departments.length === 0) throw new Error("GOV.UK listed no ministerial departments.");

const source = await Bun.file(example).text();
const start = source.indexOf("const departments = [");
const end = source.indexOf("].map(", start);
if (start === -1 || end === -1) throw new Error(`${example} has no list of departments to write.`);
const list = departments
  .map(([name, colour]) => `  [${JSON.stringify(name)}, "${colour}"],`)
  .join("\n");
await Bun.write(
  example,
  `${source.slice(0, start)}const departments = [\n${list}\n${source.slice(end)}`,
);
console.log(`Wrote ${departments.length} departments to ${example}.`);
