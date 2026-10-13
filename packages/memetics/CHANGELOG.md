# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Breaking Changes

- Renamed `chartLabels` to `defaultChartLabels`, as every map of words' English defaults are named after its key in a LabelsProvider, such as `defaultPaginationLabels`. Import `defaultChartLabels` instead.

### Added

- Added the charts' words to LabelsProvider, from x-govuk-ui, as `chart`. Chart, Chart set, Calendar heat map, Choropleth map, Gauge, Sankey, Sunburst and Treemap take their words from a chart's own `labels`, then the provider's `chart` words, then their own. ChartTable outside a chart takes the provider's `chart` words too. They write figures and dates in their own `locale`, then the provider's `locale`, the page's language for every component. Bar list, Bullet chart, Waffle and Sparkline render on the server, where no provider reaches, so they take their words from `labels` only.

### Changed

- Changed the charts' corners, such as a chart's tooltip's, to follow x-govuk-ui's tokens for corners, such as `--x-govuk-ui-radius-surface`. They look as they did.

## [0.3.0] - 2026-10-10

No changes of its own.

## [0.2.1] - 2026-10-09

No changes of its own.

## [0.2.0] - 2026-10-09

### Changed

- Changed the package's description on npm.
- Changed the JSDoc and the bundled documentation to call the people who use a service users.

## [0.1.0] - 2026-10-09

First release.
