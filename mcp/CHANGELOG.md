# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Added

- Added each part's own props to `get_props`, with each prop's type, default and JSDoc, where the project's x-govuk-ui gives them. The records of x-govuk-ui up to 0.6.0 give only the component's props, and the server still answers from them.
- Added `functions` and `words` to the sections `get_component` gives, for a component's hooks and functions, and for its words with their English defaults.
- Added hooks and functions to what `search_docs` searches. A hook or function finds the component whose page has it. One that belongs to no one component, such as `useLocale`, is found by its name, with its signature.

## [0.6.0] - 2026-11-09

### Fixed

- Fixed the server bundling zod 4.6.5 and fast-uri 3.1.8, which have security advisories. It now bundles zod 4.6.6 and fast-uri 3.1.9.

## [0.5.0] - 2026-10-20

No changes of its own.

## [0.4.0] - 2026-10-14

### Changed

- Changed the package's page on npm to link to the other four packages.

## [0.3.0] - 2026-10-10

No changes of its own.

## [0.2.1] - 2026-10-09

No changes of its own.

## [0.2.0] - 2026-10-09

### Changed

- Changed the package's description on npm.

## [0.1.0] - 2026-10-09

First release.
