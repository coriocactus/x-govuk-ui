# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Added

- Added `size` to OrganisationName. `small` sets the name at 15 pixels, with a smaller Royal Arms, for a sidebar or a footer. `medium`, the size of GOV.UK's organisation logo, is the default.

## [0.2.1] - 2026-10-09

### Changed

- Changed the Base UI and Motion peer dependencies from exact versions to patch ranges, `~1.8.0` and `~14.0.0`, so a service can take their patches without waiting for a release.

### Fixed

- Fixed SidebarText's JSDoc not saying that it keeps the open sidebar's width only as a direct child of SidebarHeader or SidebarFooter.
- Fixed the styling contract cutting a custom property's value short where it ended in a bracket, such as `var(--x-govuk-ui-text)`. The workbench's Styling tab, `llms.txt` and the MCP server all showed the shortened value.

## [0.2.0] - 2026-10-09

### Changed

- Changed the package's description on npm.
- Changed the JSDoc and the bundled documentation to call the people who use a service users.

## [0.1.0] - 2026-10-09

First release.
