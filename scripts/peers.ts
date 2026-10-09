import { packages } from "./stage";

// The packages take Base UI and Motion as peers at a patch range, such as ~1.8.0, so a service can
// take a patch of either without waiting for a release. The repository is tested with one exact
// version of each, which its package.json files pin. The Peers workflow tests each newer patch
// as it comes out:
//
//   bun scripts/peers.ts newer   prints the newest patch of each, if any is newer than the pin
//   bun scripts/peers.ts use     pins the newest patches, to run the checks with them

/** The peers taken at a patch range. */
export const PEERS = ["@base-ui/react", "motion"];

/** The patch range for a version, such as ~1.8.0 for 1.8.0. */
export const patchRange = (version: string) => `~${version}`;

/** The newest version npm has within a range, or undefined. */
function newest(name: string, range: string): string | undefined {
  const view = Bun.spawnSync(["npm", "view", `${name}@${range}`, "version", "--json"]);
  if (view.exitCode !== 0) return undefined;
  const found: string | string[] = JSON.parse(view.stdout.toString());
  return Array.isArray(found) ? found.at(-1) : found;
}

/** Each peer's newest patch, where it is newer than the version the repository pins. */
export async function newerPatches() {
  const { devDependencies: pinned } = await Bun.file("package.json").json();
  const newer: Record<string, string> = {};
  for (const name of PEERS) {
    const latest = newest(name, patchRange(pinned[name]));
    if (latest && Bun.semver.order(latest, pinned[name]) > 0) newer[name] = latest;
  }
  return newer;
}

if (import.meta.main) {
  const command = process.argv[2];
  const newer = await newerPatches();
  if (command === "newer") {
    for (const [name, version] of Object.entries(newer)) console.log(`${name}@${version}`);
  } else if (command === "use") {
    for (const file of [
      "package.json",
      ...packages.map((directory) => `${directory}/package.json`),
    ]) {
      const manifest = await Bun.file(file).json();
      for (const [name, version] of Object.entries(newer))
        if (manifest.devDependencies?.[name]) manifest.devDependencies[name] = version;
      await Bun.write(file, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    console.log(
      Object.keys(newer).length
        ? `Pinned ${Object.entries(newer)
            .map(([name, version]) => `${name}@${version}`)
            .join(", ")}.`
        : "No newer patches.",
    );
  } else throw new Error("Give a command: bun scripts/peers.ts newer, or use");
}
