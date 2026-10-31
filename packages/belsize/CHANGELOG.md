# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Changed

- Changed the actions that `useTilesActions` gives to keep one identity while the Tiles are on the page, so an effect that depends on one runs only once.

## [0.5.0] - 2026-10-20

### Breaking Changes

- Changed TileContent to keep 16 pixels of space around its content, and to stack its parts 20 pixels apart, as a Stack does, in an element inside it, `.x-govuk-ui-tile-body`. With `scroll`, that element is inside the Scroll area. Remove padding of your own, or give `padded={false}` for content that reaches the tile's edges, such as a table that the tile frames. Select the content's parts through `.x-govuk-ui-tile-body`, not as children of `.x-govuk-ui-tile-content`. Put running text that sits loose in it in a paragraph.

### Visual

- Changed TileContent to keep 16 pixels of space around its content, and 20 pixels between its parts.

### Added

- Added `padded` to TileContent, which keeps 16 pixels of space around the content unless it is false.

### Fixed

- Fixed Tiles' styles depending on loading after x-govuk-ui's stylesheet to overrule its rules. They are now in the `x-govuk-ui-extensions` cascade layer, after x-govuk-ui's, as the Editor's are, so they overrule its rules whichever stylesheet loads first. A service's own rules still overrule both.
- Fixed a menu closing as soon as it opened, in Safari, when it was the first thing pressed after a tile was dragged, such as the tile's own menu. Safari leaves the `pointerdown` out of that press, and the Tiles now supplies it.

## [0.4.0] - 2026-10-14

### Visual

- Changed the shadow of a tile being dragged to x-govuk-ui's `--x-govuk-ui-shadow-popup`, which a part lifted as it is dragged has, a little lighter than it was.

### Added

- Added `storage` to Tiles, TilesProvider and `useTilesLayout`, where `storageKey` keeps the arrangement, such as `sessionStorage`, given only in the browser on a page that also renders on a server. By default, it is local storage, as before.
- Added Tiles' words to LabelsProvider, from x-govuk-ui, as `tiles`, and `labels` to Tiles and TilesProvider. Every word Tiles write is a label, such as the buttons' names, the menu's items, the pager's place and what screen readers hear as tiles move. `defaultTilesLabels` are the English words.
- Added `defaultMaximised` and `defaultActive` to Tiles and TilesProvider, for Tiles that keep track themselves from a start you choose.

### Changed

- Changed Tiles' corners to follow x-govuk-ui's tokens for corners, such as `--x-govuk-ui-radius-small`. They look as they did.
- Changed the package's page on npm to link to the other four packages.

## [0.3.0] - 2026-10-10

### Added

- Added `active` to Tiles and TilesProvider, so a service can keep the tile in use itself, with `onActiveChange`. On a small screen, the tile it gives is the one the board shows.

## [0.2.1] - 2026-10-09

No changes of its own.

## [0.2.0] - 2026-10-09

### Changed

- Changed the package's description on npm.
- Changed the JSDoc and the bundled documentation to call the people who use a service users.

## [0.1.0] - 2026-10-09

First release.
