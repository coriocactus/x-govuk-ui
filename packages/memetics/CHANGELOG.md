# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Breaking Changes

- Removed the 30 pixels of margin beneath BarList, which came from x-govuk-ui's Table. The box it sits in now spaces it, as it spaces a Table. Put it in a box that stacks its parts, such as a GridColumn or a Stack.

### Visual

- Changed Chart's heat map to end at its table, without 30 pixels of margin beneath it. Its source is now 10 pixels beneath the table, as it is beneath any other chart's plot. Each heat map in a ChartSet ends at its table too.

### Fixed

- Fixed the charts' styles depending on loading after x-govuk-ui's stylesheet to overrule its rules. They are now in the `x-govuk-ui-extensions` cascade layer, after x-govuk-ui's, as the Editor's are, so they overrule its rules whichever stylesheet loads first. A service's own rules still overrule both.

## [0.4.0] - 2026-10-14

### Breaking Changes

- Renamed `chartLabels` to `defaultChartLabels`, as every map of words' English defaults are named after its key in a LabelsProvider, such as `defaultPaginationLabels`. Import `defaultChartLabels` instead.

### Visual

- Changed a chart's tooltip's shadow to x-govuk-ui's `--x-govuk-ui-shadow-popup`, which popups have, a little deeper than it was.

### Added

- Added the charts' words to LabelsProvider, from x-govuk-ui, as `chart`. Chart, Chart set, Calendar heat map, Choropleth map, Gauge, Sankey, Sunburst and Treemap take their words from a chart's own `labels`, then the provider's `chart` words, then their own. ChartTable outside a chart takes the provider's `chart` words too. They write figures and dates in their own `locale`, then the provider's `locale`, the page's language for every component. Bar list, Bullet chart, Waffle and Sparkline render on the server, where no provider reaches, so they take their words from `labels` only.

### Changed

- Changed Gauge, Bullet chart and Sparkline to draw themselves in x-govuk-ui's `--x-govuk-ui-duration-draw`. They take as long as they did.
- Changed the charts' corners, such as a chart's tooltip's, to follow x-govuk-ui's tokens for corners, such as `--x-govuk-ui-radius-surface`. They look as they did.
- Changed the package's page on npm to link to the other four packages.

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
