import { expect, test } from "bun:test";
import { releaseManifest } from "../../scripts/release";
import { packages } from "../../scripts/stage";

test("a release sets every package to its version, public, with core as a peer at the same", async () => {
  for (const directory of packages) {
    const manifest = await Bun.file(`${directory}/package.json`).text();
    const released = JSON.parse(releaseManifest(manifest, "2.3.4-next.1"));
    expect(released.version).toBe("2.3.4-next.1");
    expect(released.private).toBeUndefined();
    if (released.peerDependencies?.["x-govuk-ui"])
      expect(released.peerDependencies["x-govuk-ui"]).toBe("2.3.4-next.1");
    if (released.devDependencies?.["x-govuk-ui"])
      expect(released.devDependencies["x-govuk-ui"]).toBe("workspace:*");
  }
});

test("each extension takes core at exactly core's version", async () => {
  const { version } = await Bun.file("packages/core/package.json").json();
  for (const directory of packages.filter((path) => path.startsWith("packages/"))) {
    const manifest = await Bun.file(`${directory}/package.json`).json();
    expect(manifest.version).toBe(version);
    if (manifest.peerDependencies?.["x-govuk-ui"])
      expect(manifest.peerDependencies["x-govuk-ui"]).toBe(version);
  }
});

test("each package takes Base UI and Motion at the versions the repository is tested with", async () => {
  const { devDependencies: tested } = await Bun.file("package.json").json();
  const found: string[] = [];
  for (const directory of packages) {
    const manifest = await Bun.file(`${directory}/package.json`).json();
    for (const field of ["dependencies", "peerDependencies", "devDependencies"])
      for (const name of ["@base-ui/react", "motion"]) {
        const version = manifest[field]?.[name];
        if (version) found.push(`${directory} ${field} ${name}@${version === tested[name]}`);
      }
  }
  expect(found.filter((entry) => entry.endsWith("@false"))).toEqual([]);
  // Core takes Base UI and Motion as peers, so a service that uses them has one copy of each,
  // whose contexts the library's parts and its own share.
  const core = await Bun.file("packages/core/package.json").json();
  for (const name of ["@base-ui/react", "motion"]) {
    expect(core.peerDependencies[name]).toBe(tested[name]);
    expect(core.dependencies[name]).toBeUndefined();
  }
});
