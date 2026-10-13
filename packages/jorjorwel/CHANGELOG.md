# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Breaking Changes

- Removed EditorAIPrompt's `submitLabel`, and EditorAISuggestion's `workingLabel`, `replaceLabel`, `discardLabel` and `closeLabel`. Their words are the Editor's labels `aiSend`, `aiWorking`, `aiReplace`, `aiDiscard` and `aiClose`, which the Editor's `labels` or a LabelsProvider's `editor` words give.

### Added

- Added the Editor's words to LabelsProvider, from x-govuk-ui, as `editor`. The Editor's own `labels` come first, then the nearest provider's, then its English defaults.
- Added the Editor's question and answer to FormSteps' Check your answers. The answer is the document's words, without its markup.
- Added the ability to put an EditorSeparator inside a wrapper of your own, in an EditorToolbar. It is still a keyline, which the toolbar leaves out at either end of its row. The toolbar knows it as a keyline for as long as its item is in the toolbar, so a wrapper that renders an EditorSeparator should always render one.

### Changed

- Changed the Editor's `errorMessage` to take any React content, as every field's does.
- Changed the Editor's `count` label to take only the words it changes. The rest come from a LabelsProvider's `characterCount` words, which Textarea's count shares, then GOV.UK's.

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
