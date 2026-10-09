import { expect, test } from "bun:test";
import { notes, parse, SECTIONS, stamp } from "../../scripts/changelog";
import { PEERS, patchRange } from "../../scripts/peers";
import { isPatch, releaseManifest } from "../../scripts/release";
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

test("each package takes Base UI and Motion as peers at the patches of the versions it is tested with", async () => {
  const { devDependencies: tested } = await Bun.file("package.json").json();
  const found: string[] = [];
  for (const directory of packages) {
    const manifest = await Bun.file(`${directory}/package.json`).json();
    for (const field of ["dependencies", "peerDependencies", "devDependencies"])
      for (const name of PEERS) {
        const version = manifest[field]?.[name];
        const wanted = field === "peerDependencies" ? patchRange(tested[name]) : tested[name];
        if (version) found.push(`${directory} ${field} ${name}@${version === wanted}`);
      }
  }
  expect(found.filter((entry) => entry.endsWith("@false"))).toEqual([]);
  // Core takes Base UI and Motion as peers, so a service that uses them has one copy of each,
  // whose contexts the library's parts and its own share.
  const core = await Bun.file("packages/core/package.json").json();
  for (const name of PEERS) {
    expect(core.peerDependencies[name]).toBe(patchRange(tested[name]));
    expect(core.dependencies[name]).toBeUndefined();
  }
});

test("each package keeps a changelog that ships with it, with a section for its version", async () => {
  for (const directory of packages) {
    const manifest = await Bun.file(`${directory}/package.json`).json();
    expect(manifest.files).toContain("CHANGELOG.md");
    const text = await Bun.file(`${directory}/CHANGELOG.md`).text();
    expect(text.startsWith("# Changelog\n")).toBe(true);
    const versions = parse(text);
    expect(versions[0]?.heading).toBe("[Unreleased]");
    const released = versions
      .slice(1)
      .map((version) => version.heading.match(/^\[(.+)\] - \d{4}-\d{2}-\d{2}$/)?.[1]);
    expect(released).not.toContain(undefined);
    expect(released[0]).toBe(manifest.version);
    // Newest first.
    const ordered = [...(released as string[])].sort((a, b) => Bun.semver.order(b, a));
    expect(released).toEqual(ordered);
    // Only the sections the changelogs agree on.
    for (const version of versions)
      for (const section of version.sections.keys()) expect(SECTIONS).toContain(section);
  }
});

test("a release stamps the unreleased entries with its version, and leaves the next ones empty", async () => {
  const text =
    "# Changelog\n\n## [Unreleased]\n\n### Fixed\n\n- Fixed a thing.\n\n## [0.2.0] - 2026-10-09\n\nFirst release.\n";
  const stamped = stamp(text, "0.2.1", "2026-10-10");
  expect(stamped).toBe(
    "# Changelog\n\n## [Unreleased]\n\n## [0.2.1] - 2026-10-10\n\n### Fixed\n\n- Fixed a thing.\n\n## [0.2.0] - 2026-10-09\n\nFirst release.\n",
  );
  // A package with nothing of its own still gets its version.
  expect(stamp(stamped, "0.2.2", "2026-10-11")).toContain(
    "## [0.2.2] - 2026-10-11\n\nNo changes of its own.\n\n## [0.2.1]",
  );
  // The GitHub release's notes are each package's entries for the version.
  expect(await notes("0.2.0")).toContain(
    "## x-govuk-ui\n\n### Changed\n\n- Changed the package's description on npm.",
  );
});

test("only a minor version, or a prerelease's own version, may break a service", () => {
  expect(isPatch("0.2.0", "0.2.1")).toBe(true);
  expect(isPatch("0.2.0", "0.3.0")).toBe(false);
  expect(isPatch("0.2.1", "1.0.0")).toBe(false);
  expect(isPatch("0.3.0-next.1", "0.3.0")).toBe(false);
});
