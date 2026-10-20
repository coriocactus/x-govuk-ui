import { apiDiff } from "./api-diff";
import { BREAKING, stamp, unreleased } from "./changelog";
import { packages } from "./stage";

// Sets every package to a new version, because the five are released together. Each extension
// takes core at exactly that version, because `x-govuk-ui/internal` changes without a release
// saying so. It first checks the version against the changes: anything that can break a service
// needs a minor version. Then it stamps each changelog's unreleased entries with the version, and
// refreshes bun.lock, from which `bun pm pack` reads the workspace's versions. If a step after the
// checks fails, every file it changed goes back as it was, so the release can run again. Push main
// afterwards, and the release workflow stages each package on npm for you to approve.
//
//   bun run release 0.3.0

/** A package.json at the version, public, and with core as a peer at the same version. */
export function releaseManifest(manifest: string, version: string) {
  return manifest
    .replace(/^(\s*"version": )"[^"]*"/m, `$1"${version}"`)
    .replace(/^\s*"private": true,\n/m, "")
    .replace(/("x-govuk-ui": )"(?!workspace:)[^"]*"/g, `$1"${version}"`);
}

/** Whether going from one version to another changes only the patch, which must break nothing. */
export function isPatch(from: string, to: string) {
  const [major, minor] = from.split(".");
  const [toMajor, toMinor] = to.split(".");
  return major === toMajor && minor === toMinor;
}

/**
 * The packages whose copy in bun.lock lists core as a peer at another version. bun.lock keeps a
 * copy of each package's dependencies. One `bun install` updates the copy's version, but leaves
 * its peers as they were.
 */
export function stalePeers(lock: string, version: string) {
  const { workspaces } = Bun.JSONC.parse(lock) as {
    workspaces: Record<string, { name: string; peerDependencies?: Record<string, string> }>;
  };
  return Object.values(workspaces)
    .filter(
      ({ peerDependencies: peers }) =>
        peers?.["x-govuk-ui"] !== undefined && peers["x-govuk-ui"] !== version,
    )
    .map(({ name }) => name);
}

function run(command: string[]) {
  const { exitCode } = Bun.spawnSync(command, { stdout: "inherit", stderr: "inherit" });
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed`);
}

if (import.meta.main) {
  const version = process.argv[2] ?? "";
  const { version: current } = await Bun.file("packages/core/package.json").json();
  if (!/^\d+\.\d+\.\d+$/.test(version))
    throw new Error("Give the version, with no prerelease, such as: bun run release 0.3.0");
  if (Bun.semver.order(version, current) <= 0)
    throw new Error(`${version} must come after ${current}`);

  // What the changelogs say, and what the build shows, against the version on npm.
  run(["bun", "run", "build:lib"]);
  const changes = (await apiDiff(current)).filter((change) => change.kind === "breaking");
  const problems: string[] = [];
  for (const directory of packages) {
    const { name } = await Bun.file(`${directory}/package.json`).json();
    const sections = unreleased(await Bun.file(`${directory}/CHANGELOG.md`).text()).map(
      ([section]) => section,
    );
    const breaking = sections.filter((section) => BREAKING.includes(section));
    const found = changes.filter((change) => change.package === name);
    if (breaking.length && isPatch(current, version))
      problems.push(
        `${name}'s changelog lists ${breaking.join(" and ")}, so it needs a minor version.`,
      );
    if (found.length && !sections.includes("Breaking Changes") && !sections.includes("Removed"))
      problems.push(
        `${name} has breaking changes its changelog does not list:\n${found.map((change) => `  - ${change.what}`).join("\n")}`,
      );
    if (found.length && isPatch(current, version))
      problems.push(`${name} has breaking changes, so it needs a minor version.`);
  }
  if (problems.length) throw new Error(`Not released:\n${problems.join("\n")}`);

  const date = new Date().toISOString().slice(0, 10);
  const files = [
    ...packages.flatMap((directory) => [`${directory}/package.json`, `${directory}/CHANGELOG.md`]),
    "bun.lock",
  ];
  const before = new Map<string, string>();
  for (const path of files) before.set(path, await Bun.file(path).text());
  const original = (path: string) => before.get(path) ?? "";
  try {
    for (const directory of packages) {
      const manifest = `${directory}/package.json`;
      await Bun.write(manifest, releaseManifest(original(manifest), version));
      const changelog = `${directory}/CHANGELOG.md`;
      await Bun.write(changelog, stamp(original(changelog), version, date));
    }
    // The first install updates each package's version in bun.lock. Only the second updates the
    // extensions' peer on core there.
    run(["bun", "install"]);
    run(["bun", "install"]);
    const stale = stalePeers(await Bun.file("bun.lock").text(), version);
    if (stale.length)
      throw new Error(
        `bun.lock still lists x-govuk-ui at another version as a peer of ${stale.join(", ")}.`,
      );
  } catch (error) {
    for (const path of files) await Bun.write(path, original(path));
    console.error("Not released. Every file the release changed is back as it was.");
    throw error;
  }
  console.log(
    `Every package is at ${version}, and each changelog is stamped. Push main: once its checks pass, the release workflow stages each package on npm for you to approve.`,
  );
}
