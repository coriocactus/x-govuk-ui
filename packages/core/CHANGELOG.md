# Changelog

All five x-govuk-ui packages are released together, at one version. A minor version, such as 0.3.0, can break what a service relies on. A patch version, such as 0.2.1, only fixes and adds. [Versions](https://github.com/coriocactus/x-govuk-ui#versions) says what counts as breaking.

## [Unreleased]

### Breaking Changes

- Changed RichText's types so that `html` and `markdown` cannot both be given. TypeScript now reports passing both, which drew only the HTML and ignored the Markdown. Give the document as one or the other.
- Changed DataTable's `maxHeight`, in pixels, to `maxRows`, in rows of data, as CodeBlock, FileDiff and the Editor count their height. Every row is 44 pixels tall, and the headings and the foot take a row each. For a height in pixels, divide it by 44 and take away 2. The default of 440 pixels is `maxRows={8}`, which is still the default.

### Visual

- Changed FileDiff's fold, the row that opens a run of unchanged lines, to be exactly as tall as a line. It loses its 2-pixel margins and its 2 pixels of padding above and below.

### Added

- Added `size` to OrganisationName. `small` sets the name at 15 pixels, with a smaller Royal Arms, for a sidebar or a footer. `medium`, the size of GOV.UK's organisation logo, is the default.
- Added `wrap` to CodeBlock and FileDiff. Long lines break at the block's width, so it never scrolls sideways. The rest of a wrapped line starts under its code, beside its number. An editable CodeBlock's text box breaks its lines in the same places, so each character still sits on its colour.
- Added `minRows` to DataTable, its least height in rows of data. `rows` is already the data.
- Added `rows` and `maxRows` to CodeBlock and FileDiff, for the least height and the most before it scrolls inside. CodeBlock counts lines of code. FileDiff counts rows, each a line or a fold. With both the same, the block is a box of that height.

### Changed

- Changed DataTable to stop at either end of its rows without a bounce. The headings and the foot scroll in the same box as the rows, so a bounce moved them with the rows.
- Changed LogoCarousel to wait while it is off screen or the page is hidden. It turns over again when users can see it.
- Changed FileDiff to keep the lines that both texts start and end with before it compares the rest. Where a changed line could pair with either of two identical lines, such as two closing brackets, it may now pair with the other one. The counts of added and removed lines are the same.

### Fixed

- Fixed the first press with sounds on taking about 100 milliseconds to paint. Making the AudioContext blocks the main thread for about 80 milliseconds in Chromium. The first cue now waits until the press has painted, and then plays.
- Fixed Progress's sweep, for an unknown amount, laying out its track in every frame. The fill now moves by a transform, which the browser animates off the main thread, so it keeps moving while the page is busy.
- Fixed TableBody laying out the table once for each row that moves, as its rows glide to their new places. Sorting a DataTable of 1,000 rows now takes a fifteenth of the time.
- Fixed StreamingText keeping the main thread busy while a long text streams in. Each step renders only the words that change, and the browser works out the style of only a few of them. While 1,500 words stream in, the main thread is busy half as long.
- Fixed RichText parsing its document again each time it renders. It keeps the 100 documents it drew most recently. A conversation whose earlier replies render again each time the newest one grows does a tenth of the work.
- Fixed FileDiff's comparison taking time and memory that grow with the product of the two texts' lengths. A small change to a file of 6,000 lines now shows in a quarter of the time, with a quarter of the memory.
- Fixed ScrollArea, with `fade`, restyling everything inside it at each step of a scroll and each change of its content. Its `--x-govuk-ui-fade-x` and `--x-govuk-ui-fade-y` are now custom properties that are not inherited, so a new fade restyles the viewport alone. On a CPU slowed four times, each step of the wheel in a CodeBlock of 2,000 lines took 140 milliseconds of the main thread. It now takes less than 1.
- Fixed DataTable's vertical scrollbar running the full height of the table, over the headings and the foot. It now runs beside the rows alone.
- Fixed ScrollArea's focus band being covered by what the region contains, such as FileDiff's tinted lines and folds, or DataTable's sticky cells, and hidden by the fade where the content runs on. The region now draws the band over its content.
- Fixed an editable CodeBlock drawing and rendering every line again at each key. It now draws only the lines a key changes, and ScrollArea no longer searches the whole code for something focusable at each key. Typing in a block of 2,000 lines takes a third less time. The Editor's Source view, with the fix to ScrollArea, takes half the time for a long document.

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
