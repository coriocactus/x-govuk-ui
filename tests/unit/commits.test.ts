import { expect, test } from "bun:test";
import { checkMessage } from "../../scripts/commits";

/** The messages of a commit's findings, at one level. */
const found = (message: string, level: "error" | "warning" = "error") =>
  checkMessage(message)
    .filter((finding) => finding.level === level)
    .map((finding) => finding.message);

test("a message that follows the rules has no findings", () => {
  expect(checkMessage("ci(audit): run bun audit each day")).toEqual([]);
  expect(checkMessage("chore(release): 0.4.0\n")).toEqual([]);
  expect(
    checkMessage(
      "feat(home): dot the i of ui with the github mark\n\nThe front page links to the library's source from GitHub's mark, which\nstands over the lock-up's I as its dot.\n",
    ),
  ).toEqual([]);
  // A URL cannot be wrapped, and nor can a trailer that Git or GitHub writes.
  expect(
    checkMessage(
      "docs: link the spec\n\n[conventional]: https://www.conventionalcommits.org/en/v1.0.0/#specification-and-more\nCo-authored-by: Someone With A Long Name <someone.with.a.long.name@users.noreply.github.com>",
    ),
  ).toEqual([]);
});

test("the first line is a type from the table, an optional scope and a lower-case summary", () => {
  expect(found("Add a thing")).toEqual(["The first line is not <type>(<scope>): <summary>."]);
  expect(found("wip")).toEqual(["The first line is not <type>(<scope>): <summary>."]);
  expect(found("feature: add a thing")[0]).toStartWith("feature is not a type.");
  expect(found("style(tabs): widen the gap")[0]).toStartWith("style is for formatting alone.");
  expect(found("fix(Date Input): keep focus")[0]).toStartWith("(Date Input) is not a scope.");
  expect(found("fix(tabs): Keep focus")).toEqual(["The summary is not in lower case."]);
  expect(found("fix(tabs): keep focus.")).toEqual(["The summary ends with a full stop."]);
  expect(found("fix(tabs): ")).toEqual(["The summary is empty."]);
});

test("the first line keeps to 50 characters, and never passes 72", () => {
  const subject = (length: number) => `fix: ${"a".repeat(length - 5)}`;
  expect(checkMessage(subject(50))).toEqual([]);
  expect(found(subject(51), "warning")).toEqual([
    "The first line has 51 characters. Keep it to 50.",
  ]);
  expect(found(subject(51))).toEqual([]);
  expect(found(subject(73))).toEqual(["The first line has 73 characters. The most is 72."]);
});

test("the body follows a blank line and wraps at 72", () => {
  expect(found("fix: keep focus\nbecause it was lost")).toEqual(["The second line is not blank."]);
  const long = "word ".repeat(15).trim();
  expect(found(`fix: keep focus\n\n${long}`)).toEqual([
    `Line 3 has ${long.length} characters. Wrap the body at 72.`,
  ]);
});

test("a breaking change has both ! and a closing BREAKING CHANGE: footer", () => {
  expect(
    checkMessage("feat(tiles)!: rename active\n\nBREAKING CHANGE: use current instead of active."),
  ).toEqual([]);
  expect(found("feat(tiles)!: rename active")[0]).toStartWith("A breaking change ends with");
  expect(
    found("feat(tiles)!: rename active\n\nBREAKING CHANGE: use current.\n\nMore words after it."),
  ).toHaveLength(1);
  expect(found("feat(tiles): rename active\n\nBREAKING CHANGE: use current.")).toEqual([
    "A message with a BREAKING CHANGE: footer has ! before the colon.",
  ]);
});

test("a revert names the commit it undoes", () => {
  expect(found("revert: undo the tab gap")[0]).toStartWith("A revert names the commit");
  expect(checkMessage("revert: undo the tab gap\n\nThis reverts 070ca5b4fd06.")).toEqual([]);
  expect(checkMessage("revert: undo the tab gap\n\nThis reverts yxprokoltylu.")).toEqual([]);
});
