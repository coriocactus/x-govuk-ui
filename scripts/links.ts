// Follows every address on the web that the site, the packages and the files shipped beside them
// link to, as a person would, and says which are gone and which have moved. Run `bun run links` now
// and then, because the web changes. Update an address that has moved, and replace one that is
// gone. It reads the source, so an address built from a value, such as GOV.UK's page for each
// component, is built here as the site builds it.
import { catalogue, componentNames, upstreamPage } from "../site/catalogue";

// Where addresses are written, in the site, the packages, the MCP server and the files beside them.
const sources = [
  "site/**/*.{ts,tsx,css,html,md}",
  "packages/*/src/**/*.{ts,tsx,css}",
  "packages/*/package.json",
  "mcp/src/**/*.ts",
  "package.json",
  "README.md",
  "THIRD_PARTY_NOTICES.txt",
];
// What looks like an address but is not one to follow. These are an SVG's namespace, a machine's
// own, a domain kept for examples, and one built from a value in the source, which is built below
// if it is ours.
const notFollowed = [
  /^http:\/\/www\.w3\.org\//,
  /\/\/(localhost|127\.0\.0\.1)[:/]/,
  /\.(invalid|example)\b/,
  /\$\{/,
];
// A name that says who is asking, with where to find out more, as Wikimedia asks scripts to send.
const headers = {
  "User-Agent": "x-govuk-ui link check (https://github.com/coriocactus/x-govuk-ui)",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
};

/** Each address, and every place it is written, as a file and line. */
const found = new Map<string, string[]>();
const note = (address: string, where: string) =>
  found.set(address, [...(found.get(address) ?? []), where]);

for (const pattern of sources)
  for await (const path of new Bun.Glob(pattern).scan({ onlyFiles: true })) {
    if (/(^|\/)(node_modules|dist)\//.test(path)) continue;
    const lines = (await Bun.file(path).text()).split("\n");
    for (const [index, line] of lines.entries())
      for (const [match] of line.matchAll(/https?:\/\/[^\s"'`<>\]\\]+/g)) {
        // A full stop or comma after an address belongs to the sentence. A closing bracket whose
        // pair opens before the address does too, as a Markdown link's does. An address's own
        // brackets pair, as in a photo's file name such as The_Shard_(cropped).jpg.
        let address = match.replace(/[.,;:]+$/, "");
        while (address.endsWith(")") && address.split("(").length < address.split(")").length)
          address = address.slice(0, -1).replace(/[.,;:]+$/, "");
        if (!notFollowed.some((pattern) => pattern.test(address)))
          note(address, `${path}:${index + 1}`);
      }
  }
for (const name of componentNames)
  if (catalogue[name].upstream)
    note(upstreamPage(catalogue[name].upstream), `site/catalogue.ts, ${name}'s upstream`);

type Verdict =
  | { kind: "fine" }
  | { kind: "moved"; to: string }
  | { kind: "gone"; why: string }
  | { kind: "unanswered"; why: string };

// One address read as another would be, as the same page whatever its scheme, a www, a closing
// slash or a fragment.
const same = (address: string) => {
  const url = new URL(address);
  return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}${url.search}`;
};
// Where an address has moved to, if it has. A site's home leading to a page of the same site, such
// as its main page, is the site's entrance, not a move.
const movedTo = (address: string, to: string) => {
  const from = new URL(address);
  const home = from.pathname === "/" && new URL(to).hostname === from.hostname;
  return home || same(to) === same(address) ? null : to;
};

/**
 * Where an address leads. A page that is not found, or a site that does not exist, is gone. A site
 * that refuses the check or does not answer, such as one that admits no scripts, is tried once
 * more. Then it is left for a person to try, because it may well be there.
 */
async function follow(address: string): Promise<Verdict> {
  let why = "";
  for (const attempt of [1, 2]) {
    try {
      const response = await fetch(address, {
        headers,
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
      await response.body?.cancel();
      if (response.ok) {
        const to = movedTo(address, response.url);
        return to ? { kind: "moved", to } : { kind: "fine" };
      }
      if (response.status === 404 || response.status === 410)
        return { kind: "gone", why: String(response.status) };
      why = String(response.status);
    } catch (error) {
      const { code, message } = error as Error & { code?: string };
      if (code === "ENOTFOUND") return { kind: "gone", why: "no such site" };
      why = code ?? message;
    }
    if (attempt === 1) await Bun.sleep(2000);
  }
  return { kind: "unanswered", why };
}

// Each site's addresses are followed one at a time, so no site gets too many requests at once.
// Eight sites are followed at a time.
const bySite = new Map<string, string[]>();
for (const address of found.keys()) {
  const site = new URL(address).hostname;
  bySite.set(site, [...(bySite.get(site) ?? []), address]);
}
const verdicts = new Map<string, Verdict>();
const queue = [...bySite.values()];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    for (let site = queue.shift(); site; site = queue.shift())
      for (const address of site) verdicts.set(address, await follow(address));
  }),
);

/** Each address whose verdict is of the kind, with that verdict. */
const of = <K extends Verdict["kind"]>(kind: K) =>
  [...verdicts].filter(
    (entry): entry is [string, Extract<Verdict, { kind: K }>] => entry[1].kind === kind,
  );
/** Lists the addresses of one kind, each with what `say` makes of its verdict, and where it is. */
const report = <K extends Verdict["kind"]>(
  title: string,
  kind: K,
  say: (verdict: Extract<Verdict, { kind: K }>) => string,
) => {
  const entries = of(kind);
  if (!entries.length) return;
  console.log(`\n${title} (${entries.length}):`);
  for (const [address, verdict] of entries) {
    console.log(`  ${address} ${say(verdict)}`);
    for (const where of found.get(address) ?? []) console.log(`    ${where}`);
  }
};
report("Gone", "gone", (verdict) => `(${verdict.why})`);
report("Moved", "moved", (verdict) => `→ ${verdict.to}`);
report("Unanswered, for a person to try", "unanswered", (verdict) => `(${verdict.why})`);
const gone = of("gone").length;
console.log(
  `\nFollowed ${verdicts.size} addresses: ${of("fine").length} fine, ${of("moved").length} moved, ${gone} gone, ${of("unanswered").length} unanswered.`,
);
if (gone) process.exit(1);
