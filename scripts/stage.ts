import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Builds each package, then stages on npm each one whose version npm does not have yet. A
// maintainer approves it there with 2FA before it goes live. The release workflow runs it, signed
// in to npm by trusted publishing. You run it yourself once, after `npm login`, for the packages'
// first version, because npm links a package to the workflow only once the package exists. With
// --dry-run, it packs and checks every package, private or not, and stages none.

/** Every package's folder, core first, because each extension takes core as a peer. */
export const packages = [
  "packages/core",
  "packages/belsize",
  "packages/jorjorwel",
  "packages/memetics",
  "mcp",
];

/** Whether npm has the version. npm answers E404 for a missing package and a missing version. */
function published(name: string, version: string) {
  const view = Bun.spawnSync(["npm", "view", `${name}@${version}`, "version", "--json"]);
  const answer = view.stdout.toString();
  if (view.exitCode === 0) return answer.trim() !== "";
  if (answer.includes('"E404"')) return false;
  throw new Error(`npm could not say whether it has ${name}@${version}:\n${view.stderr}`);
}

/**
 * The package's tarball. Bun packs it, not npm, because Bun writes out each `workspace:` version.
 */
function pack(directory: string, into: string) {
  const packed = Bun.spawnSync(["bun", "pm", "pack", "--destination", into, "--quiet"], {
    cwd: directory,
    stderr: "inherit",
  });
  if (packed.exitCode !== 0) throw new Error(`Bun could not pack ${directory}`);
  return packed.stdout.toString().trim();
}

function run(command: string[]) {
  const { exitCode } = Bun.spawnSync(command, { stdout: "inherit", stderr: "inherit" });
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed`);
}

if (import.meta.main) {
  const dryRun = process.argv.includes("--dry-run");
  run(["bun", "run", "build:lib"]);
  run(["bun", "run", "build:mcp"]);
  const into = await mkdtemp(join(tmpdir(), "x-govuk-ui-"));
  for (const directory of packages) {
    const manifest = await Bun.file(`${directory}/package.json`).json();
    const { name, version } = manifest;
    // npm stages a private package's tarball all the same, so the flag is checked here.
    if (manifest.private && !dryRun) {
      console.log(`${name} is private, so it is not staged.`);
      continue;
    }
    if (published(name, version)) {
      console.log(`${name}@${version} is on npm already.`);
      continue;
    }
    // A prerelease goes out under the `next` tag, so `latest` stays the last release.
    const tag = version.includes("-") ? "next" : "latest";
    run([
      "npm",
      "stage",
      "publish",
      pack(directory, into),
      "--access",
      "public",
      "--tag",
      tag,
      ...(dryRun ? ["--dry-run"] : []),
    ]);
  }
}
