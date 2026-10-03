import { chmod, copyFile, rm } from "node:fs/promises";

// Builds the MCP server in mcp/dist, as one JavaScript file that Node runs, with its licence and
// theirs. The MCP SDK and its dependencies are bundled in, so the package needs no dependencies of
// its own.
await rm("mcp/dist", { recursive: true, force: true });
const result = await Bun.build({
  entrypoints: ["mcp/src/index.ts"],
  outdir: "mcp/dist",
  target: "node",
  format: "esm",
  banner: "#!/usr/bin/env node",
  metafile: true,
});
if (!result.success) throw new AggregateError(result.logs, "The MCP server's build failed");
await chmod("mcp/dist/index.js", 0o755);

let notices = "The x-govuk-ui MCP server bundles these packages, under their own licences.";
const roots = new Set(
  Object.keys(result.metafile?.inputs ?? {}).flatMap((path) => {
    const root = path.replaceAll("\\", "/").match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//)?.[1];
    return root ? [root] : [];
  }),
);
for (const root of [...roots].sort()) {
  const licences = [
    ...new Bun.Glob(
      "{LICENSE,LICENSE.md,LICENSE.txt,license,license.md,LICENCE,LICENCE.md}",
    ).scanSync(root),
  ];
  if (!licences.length) throw new Error(`Add a licence notice for ${root}`);
  notices += `\n\n${root.replace(/^.*node_modules\//, "")}\n\n${await Bun.file(`${root}/${licences[0]}`).text()}`;
}
await Bun.write("mcp/dist/THIRD_PARTY_NOTICES.txt", notices);
await copyFile("LICENSE", "mcp/dist/LICENSE");
const size = Math.round(Bun.file("mcp/dist/index.js").size / 1024);
console.log(`Built the MCP server: mcp/dist/index.js, ${size} KB, bundling ${roots.size} packages`);
