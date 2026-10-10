// Checks each commit's message against the repository's rules for commit messages, which follow
// Conventional Commits 1.0.0 and the 50/72 rule. jj runs no Git hooks, so nothing checks a message
// as it is written. This script checks the commits instead, before they are pushed and in CI.
//
//   bun run commits            checks each commit after origin/main, up to HEAD
//   bun run commits <range>    checks the commits in a Git range, such as abc123..def456
//
// In a jj workspace, HEAD is the working copy's parent, so the commits checked are the finished
// ones. Each problem is an error, except a first line of 51 to 72 characters, which is a warning.
// Dependabot writes its own messages, with long lines it generates, so its commits are left out.

/** The types a commit may have. Each commit has one. */
export const TYPES = [
  "feat",
  "fix",
  "perf",
  "refactor",
  "test",
  "docs",
  "build",
  "ci",
  "chore",
  "revert",
] as const;

/** A commit message's first line. A scope is a component's file, a package's folder or an area. */
const SUBJECT = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<breaking>!)?: (?<summary>.*)$/;
const SCOPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A line that cannot be wrapped, so it may run past 72 characters. */
const UNBREAKABLE = /^\S+$|https?:\/\/|^[\w-]+-by: /;
const BREAKING_FOOTER = "BREAKING CHANGE: ";

export type Finding = { level: "error" | "warning"; message: string };

/** What is wrong with a commit message, if anything. */
export function checkMessage(text: string): Finding[] {
  const findings: Finding[] = [];
  const error = (message: string) => findings.push({ level: "error", message });
  const lines = text.replace(/\n+$/, "").split("\n");
  const [subject = "", second, ...rest] = lines;

  if (subject.length > 72)
    error(`The first line has ${subject.length} characters. The most is 72.`);
  else if (subject.length > 50)
    findings.push({
      level: "warning",
      message: `The first line has ${subject.length} characters. Keep it to 50.`,
    });

  const parts = SUBJECT.exec(subject)?.groups;
  if (!parts) {
    error("The first line is not <type>(<scope>): <summary>.");
  } else {
    const { type = "", scope, breaking, summary = "" } = parts;
    if (type === "style")
      error("style is for formatting alone. A change to how a part looks is feat or fix.");
    else if (!(TYPES as readonly string[]).includes(type))
      error(`${type} is not a type. Use one of ${TYPES.join(", ")}.`);
    if (scope !== undefined && !SCOPE.test(scope))
      error(`(${scope}) is not a scope. Name a file, a package or an area, such as date-input.`);
    if (!summary.trim()) error("The summary is empty.");
    if (/[A-Z]/.test(summary)) error("The summary is not in lower case.");
    if (summary.endsWith(".")) error("The summary ends with a full stop.");
    const paragraphs = lines.join("\n").split(/\n\s*\n/);
    const footer = paragraphs.length > 1 && paragraphs.at(-1)?.startsWith(BREAKING_FOOTER);
    if (breaking && !footer)
      error(
        "A breaking change ends with a BREAKING CHANGE: footer, which says what to do instead.",
      );
    if (!breaking && rest.some((line) => line.startsWith(BREAKING_FOOTER)))
      error("A message with a BREAKING CHANGE: footer has ! before the colon.");
    if (type === "revert" && !rest.some((line) => /\b[0-9a-f]{8,40}\b|\b[k-z]{8,32}\b/.test(line)))
      error("A revert names the commit it undoes by its commit ID, in the body.");
  }

  if (second !== undefined && second !== "") error("The second line is not blank.");
  for (const [index, line] of rest.entries())
    if (line.length > 72 && !UNBREAKABLE.test(line))
      error(`Line ${index + 3} has ${line.length} characters. Wrap the body at 72.`);
  return findings;
}

type Commit = { id: string; author: string; message: string };

/** The commits in a Git range, oldest first, without merges. */
function commitsIn(range: string): Commit[] {
  const log = Bun.spawnSync([
    "git",
    "log",
    "--no-merges",
    "--reverse",
    "--format=%H%x1f%an%x1f%B%x1e",
    range,
  ]);
  if (log.exitCode !== 0) throw new Error(log.stderr.toString().trim());
  return log.stdout
    .toString()
    .split("\x1e")
    .map((record) => record.replace(/^\n/, ""))
    .filter(Boolean)
    .map((record) => {
      const [id = "", author = "", message = ""] = record.split("\x1f");
      return { id, author, message };
    });
}

if (import.meta.main) {
  const range = process.argv[2] ?? "origin/main..HEAD";
  const commits = commitsIn(range).filter((commit) => commit.author !== "dependabot[bot]");
  let errors = 0;
  for (const commit of commits) {
    const findings = checkMessage(commit.message);
    if (findings.length === 0) continue;
    console.log(`${commit.id.slice(0, 8)} ${commit.message.split("\n")[0]}`);
    for (const finding of findings) console.log(`  ${finding.level}: ${finding.message}`);
    errors += findings.filter((finding) => finding.level === "error").length;
  }
  const checked = `${commits.length} ${commits.length === 1 ? "commit" : "commits"} in ${range}`;
  console.log(errors ? `${errors} errors in ${checked}.` : `Checked ${checked}.`);
  if (errors) process.exitCode = 1;
}
