import { packages } from "./stage";

// Sets every package to a new version and makes it public, because the five are released together.
// Each extension takes core at exactly that version, because `x-govuk-ui/internal` changes without
// a release saying so. Then it refreshes bun.lock, from which `bun pm pack` reads the workspace's
// versions. Push main afterwards, and the release workflow stages each package on npm for you to
// approve.
//
//   bun run release 0.2.0

/** A package.json at the version, public, and with core as a peer at the same version. */
export function releaseManifest(manifest: string, version: string) {
  return manifest
    .replace(/^(\s*"version": )"[^"]*"/m, `$1"${version}"`)
    .replace(/^\s*"private": true,\n/m, "")
    .replace(/("x-govuk-ui": )"(?!workspace:)[^"]*"/g, `$1"${version}"`);
}

if (import.meta.main) {
  const version = process.argv[2] ?? "";
  const { version: current } = await Bun.file("packages/core/package.json").json();
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version))
    throw new Error("Give the version, such as: bun run release 0.2.0");
  // The same version again is allowed, for the first release, whose version the packages have.
  if (Bun.semver.order(version, current) < 0) throw new Error(`${version} comes before ${current}`);

  for (const directory of packages) {
    const file = Bun.file(`${directory}/package.json`);
    await Bun.write(file, releaseManifest(await file.text(), version));
  }
  const install = Bun.spawnSync(["bun", "install"], { stdout: "inherit", stderr: "inherit" });
  if (install.exitCode !== 0) throw new Error("bun install failed");
  console.log(
    `Every package is at ${version}. Push main: once its checks pass, the release workflow stages each package on npm for you to approve.`,
  );
}
