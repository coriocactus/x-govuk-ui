import { packages } from "./stage";

// The packages take Base UI and Motion as peers, at the ranges in core's package.json. A wide range
// lets a service share one copy of each with its other dependencies. The lowest version in each
// range is the version the repository pins, so every check tests the oldest version a service may
// have. The Peers workflow tests the newest version each range allows, as it comes out:
//
//   bun scripts/peers.ts newer   prints the newest version of each, if any is newer than the pin
//   bun scripts/peers.ts use     moves the pin, and each range's lowest version, to the newest, to
//                                run the checks with them

/** The peers the packages take at a range. */
export const PEERS = ["@base-ui/react", "motion"];

/**
 * The lowest version a range allows, such as 1.8.0 for `~1.8.0`, `^1.8.0`, `~1.8.0 || ~1.9.0` or
 * `>=1.8.0 <1.10.0`.
 * Undefined for a range of another form, which the unit tests refuse.
 */
export function floorOf(range: string) {
  return range.match(/^(?:~|\^|>=)(\d+\.\d+\.\d+)(?:\s|$)/)?.[1];
}

/** The newest version npm has within a range, or undefined. */
function newest(name: string, range: string): string | undefined {
  const view = Bun.spawnSync(["npm", "view", `${name}@${range}`, "version", "--json"]);
  if (view.exitCode !== 0) return undefined;
  const found: string | string[] = JSON.parse(view.stdout.toString());
  return Array.isArray(found) ? found.sort(Bun.semver.order).at(-1) : found;
}

/** Each peer's newest version within core's range, where it is newer than the pin. */
export async function newerVersions() {
  const { devDependencies: pinned } = await Bun.file("package.json").json();
  const { peerDependencies: ranges } = await Bun.file("packages/core/package.json").json();
  const newer: Record<string, string> = {};
  for (const name of PEERS) {
    const latest = newest(name, ranges[name]);
    if (latest && Bun.semver.order(latest, pinned[name]) > 0) newer[name] = latest;
  }
  return newer;
}

if (import.meta.main) {
  const command = process.argv[2];
  const newer = await newerVersions();
  if (command === "newer") {
    for (const [name, version] of Object.entries(newer)) console.log(`${name}@${version}`);
  } else if (command === "use") {
    for (const file of [
      "package.json",
      ...packages.map((directory) => `${directory}/package.json`),
    ]) {
      const manifest = await Bun.file(file).json();
      for (const [name, version] of Object.entries(newer)) {
        if (manifest.devDependencies?.[name]) manifest.devDependencies[name] = version;
        const range: string | undefined = manifest.peerDependencies?.[name];
        const floor = range && floorOf(range);
        if (range && floor) manifest.peerDependencies[name] = range.replace(floor, version);
      }
      await Bun.write(file, `${JSON.stringify(manifest, null, 2)}\n`);
    }
    console.log(
      Object.keys(newer).length
        ? `Pinned ${Object.entries(newer)
            .map(([name, version]) => `${name}@${version}`)
            .join(", ")}.`
        : "No newer versions.",
    );
  } else throw new Error("Give a command: bun scripts/peers.ts newer, or use");
}
