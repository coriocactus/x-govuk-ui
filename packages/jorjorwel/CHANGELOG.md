# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Fixed

- Fixed Enter and Backspace throwing an error in the Editor when a table's only row is empty. Either key now removes the table. Enter puts the caret at the start of the paragraph after it, if there is one. Otherwise, and after Backspace, the caret is in a new paragraph in the table's place.
- Fixed the Editor's Code and Quotation controls on a selection across a divider or an attachment. Code threw an error, and Quotation moved the divider below the quotation. Each now puts the lines on each side in a block of their own, and the divider stays where it was.

## [0.5.0] - 2026-10-20

### Changed

- Changed the Base UI peer dependency to `~1.8.0 || ~1.9.0`, from `~1.8.0`, so a service can install Base UI 1.9 too.
- Changed the Motion peer dependency to `^14.0.0`, from `~14.0.0`, so a service can install any Motion 14 from 14.0.0, such as the one another of its dependencies needs.

## [0.4.0] - 2026-10-14

### Breaking Changes

- Removed EditorAIPrompt's `submitLabel`, and EditorAISuggestion's `workingLabel`, `replaceLabel`, `discardLabel` and `closeLabel`. Their words are the Editor's labels `aiSend`, `aiWorking`, `aiReplace`, `aiDiscard` and `aiClose`, which the Editor's `labels` or a LabelsProvider's `editor` words give.

### Added

- Added EditorRoot, EditorLabel and EditorBox, the parts of an Editor, for an editor of your own, such as with a part of your own between its hint and its box. EditorRoot makes the editor and takes every prop of Editor's that is not the field's words or the box's. In a bound Field inside it, EditorLabel names the document, and EditorBox holds the toolbar and the document, with the count after it. Outside a bound Field, the label and the box share the editor's own id, so the document is still named. Editor is now built from them, and its markup does not change.
- Added `waiting` to `useEditor`, which says a form was stopped because files are still uploading, so a field of your own can say to wait, as Editor's does.
- Added the Editor's words to LabelsProvider, from x-govuk-ui, as `editor`. The Editor's own `labels` come first, then the nearest provider's, then its English defaults.
- Added the Editor's question and answer to FormSteps' Check your answers. The answer is the document's words, without its markup.
- Added the ability to put an EditorSeparator inside a component of your own, in an EditorToolbar. Each child of the toolbar is one item of its row. One that draws only keylines is a keyline, which the row never starts or ends on. One that draws controls, such as a group of your own, waits behind More whole.

### Changed

- Changed the shadow of the Editor's floating tools, and its AI toolbar's, to follow x-govuk-ui's `--x-govuk-ui-shadow-floating`. They look as they did.
- Changed the Editor's corners, and its AI toolbar's, to follow x-govuk-ui's tokens for corners, such as `--x-govuk-ui-radius-control`. They look as they did.
- Changed the Editor's `errorMessage` to take any React content, as every field's does.
- Changed the Editor's `count` label to take only the words it changes. The rest come from a LabelsProvider's `characterCount` words, which Textarea's count shares, then GOV.UK's.
- Changed the package's page on npm to link to the other four packages.

### Fixed

- Fixed EditorAIToolbar and EditorPrompt dropping a service's own `onMouseDown`, and EditorAIToolbar its `onKeyDown`. A service's handler now runs first, and calling `preventDefault` in it stops what the part would do.

## [0.3.0] - 2026-10-10

No changes of its own.

## [0.2.1] - 2026-10-09

### Changed

- Changed the Base UI and Motion peer dependencies from exact versions to patch ranges, `~1.8.0` and `~14.0.0`, so a service can take their patches without waiting for a release.

## [0.2.0] - 2026-10-09

### Changed

- Changed the package's description on npm.
- Changed the JSDoc and the bundled documentation to call the people who use a service users.

## [0.1.0] - 2026-10-09

First release.
