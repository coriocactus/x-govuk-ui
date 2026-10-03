import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { componentDocs, docsDocuments, llmsDocuments } from "../site/llms";
import { assets, fontAssets, fontFaces, sources } from "../site/sources";
import { stylingContracts } from "../site/styling";
import sass from "./sass";

await rm("dist", { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: ["site/index.html"],
  outdir: "dist",
  publicPath: "/",
  minify: true,
  metafile: true,
  plugins: [sass],
  // The published workbench belongs to no checkout, so it shows no checkout's tag.
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.BUN_PUBLIC_CHECKOUT": "undefined",
  },
});
if (!result.success) throw new AggregateError(result.logs, "Workbench build failed");
await mkdir("dist/source", { recursive: true });
await mkdir("dist/assets", { recursive: true });
await Promise.all(
  Object.entries({ ...assets, ...fontAssets("production") }).map(async ([name, path]) => {
    await mkdir(dirname(`dist/assets/${name}`), { recursive: true });
    await copyFile(path, `dist/assets/${name}`);
  }),
);
await Bun.write("dist/assets/fonts.css", await fontFaces("production"));
await Promise.all(
  Object.entries(sources).map(([name, path]) => copyFile(path, `dist/source/${name}`)),
);
// Each component's styling contract, for the playground's Styling tab, and the documentation for
// language models and the MCP server, all read from the current source.
const contracts = await stylingContracts();
const records = await componentDocs(contracts);
const documents = { ...(await llmsDocuments(records)), ...(await docsDocuments(records)) };
await Promise.all([
  ...Object.entries(contracts).map(([name, contract]) =>
    Bun.write(`dist/styling/${name}.json`, JSON.stringify(contract)),
  ),
  ...Object.entries(documents).map(([path, text]) => Bun.write(`dist/${path}`, text)),
]);
// Sass imports are covered by the checked-in GOV.UK notice.
let notices = await Bun.file("THIRD_PARTY_NOTICES.txt").text();
const dependencyRoots = new Set(
  Object.keys(result.metafile!.inputs).flatMap((path) => {
    const root = path.replaceAll("\\", "/").match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//)?.[1];
    return root ? [root] : [];
  }),
);
for (const root of [...dependencyRoots].sort()) {
  // These packages ship without a licence file. THIRD_PARTY_NOTICES.txt contains their notices.
  const unlicensed = [
    "govuk-frontend",
    "sugar-high",
    "@react-dnd/invariant",
    "@react-dnd/shallowequal",
    "dnd-multi-backend",
    "react-dnd-multi-backend",
    "rdndmb-html5-to-touch",
    "react-dnd-preview",
  ];
  if (unlicensed.some((name) => root.endsWith(`node_modules/${name}`))) continue;
  // Recharts draws with the d3 modules that victory-vendor bundles, each with its own licence.
  // victory-vendor's own notice is in THIRD_PARTY_NOTICES.txt.
  if (root.endsWith("node_modules/victory-vendor")) {
    for (const licence of [...new Bun.Glob("lib-vendor/*/LICENSE").scanSync(root)].sort())
      notices += `\n\n${licence.split("/")[1]}, in victory-vendor\n\n${await Bun.file(`${root}/${licence}`).text()}`;
    continue;
  }
  const licences = [
    ...new Bun.Glob(
      "{LICENSE,LICENSE.md,LICENSE.txt,license,license.md,LICENCE,LICENCE.md}",
    ).scanSync(root),
  ];
  if (!licences.length) throw new Error(`Add a licence notice for ${root}`);
  notices += `\n\n${root.replace(/^.*node_modules\//, "")}\n\n${await Bun.file(`${root}/${licences[0]}`).text()}`;
}
// Roboto's files are served as assets instead of bundled, so its licence is added here.
notices += `\n\nRoboto, from @fontsource-variable/roboto\n\n${await Bun.file("node_modules/@fontsource-variable/roboto/LICENSE").text()}`;
await Bun.write("dist/THIRD_PARTY_NOTICES.txt", notices);
console.log(`Built ${result.outputs.length} assets in dist/`);
