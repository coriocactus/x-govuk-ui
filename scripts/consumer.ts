import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Type-checks a service's code against the packages' builds, as a service installs them. The
// repository's own type check reads the source through path aliases, so it cannot see what the
// builds leave out, such as an extension's words that never reach its types. Run `bun run
// build:lib` first.

const root = resolve(import.meta.dir, "..");
const folder = await mkdtemp(join(tmpdir(), "x-govuk-ui-consumer-"));
try {
  const modules = join(folder, "node_modules");
  await mkdir(join(modules, "@x-govuk-ui"), { recursive: true });
  await mkdir(join(modules, "@types"), { recursive: true });
  const links: [string, string][] = [
    ["packages/core", "x-govuk-ui"],
    ["packages/belsize", "@x-govuk-ui/belsize"],
    ["packages/jorjorwel", "@x-govuk-ui/jorjorwel"],
    ["packages/memetics", "@x-govuk-ui/memetics"],
    ["node_modules/@types/react", "@types/react"],
    ["node_modules/@types/react-dom", "@types/react-dom"],
  ];
  for (const [from, to] of links) await symlink(join(root, from), join(modules, to));
  await Bun.write(join(folder, "app.tsx"), Bun.file(join(root, "tests/consumer/app.tsx")));
  await Bun.write(
    join(folder, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["ES2022", "DOM", "DOM.Iterable"],
        module: "Preserve",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      include: ["app.tsx"],
    }),
  );
  const checked = Bun.spawnSync([join(root, "node_modules/.bin/tsc"), "-p", folder], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if (checked.exitCode !== 0) {
    console.error("A service's code does not type-check against the packages' builds.");
    process.exit(1);
  }
} finally {
  await rm(folder, { recursive: true, force: true });
}
