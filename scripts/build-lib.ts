import { copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { docsDocuments } from "../site/llms";
import sass from "./sass";

// Builds each package in its own dist/lib, with one stylesheet, and a JavaScript file and a
// declaration file for each source file, so each keeps its own "use client". Core builds first,
// because its extensions' declarations read core's. Then it checks that each build exports what
// its source does.
const packages = [
  "core",
  ...[...new Bun.Glob("*/package.json").scanSync("packages")]
    .map((path) => path.split("/")[0] ?? "")
    .filter((name) => name !== "core")
    .sort(),
];

// Node resolves a module's imports only with their extensions, and TypeScript emits them as they
// were written, without. Bundlers accept either.
const relative = /(from\s+|import\s*\(\s*)(["'])(\.{1,2}\/[^"']+?)\2/g;

for (const name of packages) {
  const root = `packages/${name}`;
  const out = `${root}/dist/lib`;
  await rm(out, { recursive: true, force: true });

  const tsc = Bun.spawnSync(["bun", "run", "--bun", "tsc", "-p", `${root}/tsconfig.lib.json`], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if (tsc.exitCode !== 0) throw new Error(`The declaration build of ${name} failed`);
  for await (const path of new Bun.Glob("**/*.js").scan({ cwd: out })) {
    const file = Bun.file(`${out}/${path}`);
    const code = await file.text();
    await Bun.write(
      file,
      code.replace(relative, (whole, lead: string, quote: string, specifier: string) =>
        /\.(js|json|css)$/.test(specifier) ? whole : `${lead}${quote}${specifier}.js${quote}`,
      ),
    );
  }

  // The stylesheet. Core's has GOV.UK Frontend's settings compiled in, so a service needs no Sass.
  const css = await Bun.build({
    entrypoints: [`${root}/src/styles.css`],
    outdir: out,
    naming: "[name].[ext]",
    plugins: [sass],
  });
  if (!css.success) throw new AggregateError(css.logs, `The stylesheet build of ${name} failed`);

  await copyFile("LICENSE", `${out}/LICENSE`);
  // The repository's notices ship whole with each package, as one file for all of them. Core
  // bundles GOV.UK Frontend's compiled settings, and jorjorwel contains code ported from Lexxy and
  // Lexical.
  await copyFile("THIRD_PARTY_NOTICES.txt", `${out}/THIRD_PARTY_NOTICES.txt`);
  if (name === "core") {
    // Core bundles the documentation the MCP server reads, so a project's server documents the
    // version it installed.
    await Promise.all(
      Object.entries(await docsDocuments()).map(([path, text]) =>
        Bun.write(`${out}/${path}`, text),
      ),
    );
  }

  // The build must export everything the source does, by the same names.
  const [built, source] = await Promise.all([
    import(resolve(out, "index.js")),
    import(resolve(root, "src/index.ts")),
  ]);
  const missing = Object.keys(source).filter((export_) => !(export_ in built));
  if (missing.length) throw new Error(`${name}'s build is missing exports: ${missing.join(", ")}`);
  const files = [...new Bun.Glob("**/*").scanSync({ cwd: out })].length;
  console.log(`Built ${name}: ${files} files in ${out}, ${Object.keys(built).length} exports`);
}
