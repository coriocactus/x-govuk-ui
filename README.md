# x-govuk-ui

React component library based on the GOV.UK Design System, built on Base UI and Motion.

Try each component on [x-govuk-ui.org](https://x-govuk-ui.org/).

This is not an official GOV.UK project.

## Credits

Its components owe ideas, designs and code to other systems:

- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Kobra](https://kobra.systems/)
- [Lexical](https://lexical.dev/)
- [Lexxy](https://github.com/basecamp/lexxy)
- [Mantine](https://mantine.dev/)
- [Recharts](https://recharts.github.io/)
- [Superlogical](https://www.superlogical.com/)
- [react-mosaic](https://github.com/nomcopter/react-mosaic)

The workbench credits each system under the name of each component that owes it. `THIRD_PARTY_NOTICES.txt` gives the licences of the code the library takes.

> I take credit for the synthesis, not the source.

## Get started

The library needs React 19. It takes Base UI and Motion as peer dependencies, which npm installs with it.

```sh
npm install x-govuk-ui
```

Import the stylesheet once, then the components:

```tsx
import "x-govuk-ui/styles.css";
import { Button } from "x-govuk-ui";

export function Continue() {
  return <Button>Save and continue</Button>;
}
```

Give your app's root element `isolation: isolate`, so nothing in the page rises above a dialog or a menu.

Install an extension beside the library, at the same version, and import its stylesheet after the library's:

```sh
npm install x-govuk-ui @x-govuk-ui/memetics
```

```tsx
import "x-govuk-ui/styles.css";
import "@x-govuk-ui/memetics/styles.css";
import { Chart } from "@x-govuk-ui/memetics";
```

[x-govuk-ui.org](https://x-govuk-ui.org/) shows every component, with its props and its code.

## Packages

Each package is on npm. The library is [`x-govuk-ui`](https://www.npmjs.com/package/x-govuk-ui). Its extensions, in the `@x-govuk-ui` scope, contain the components with large dependencies:

- [`@x-govuk-ui/jorjorwel`](https://www.npmjs.com/package/@x-govuk-ui/jorjorwel), the Editor, built on Lexical
- [`@x-govuk-ui/memetics`](https://www.npmjs.com/package/@x-govuk-ui/memetics), the charts, built on Recharts
- [`@x-govuk-ui/belsize`](https://www.npmjs.com/package/@x-govuk-ui/belsize), Tiles, built on react-mosaic

The MCP server, [`@x-govuk-ui/mcp`](https://www.npmjs.com/package/@x-govuk-ui/mcp), is in the same scope.

## Versions

All five packages are released together, at one version. Before 1.0, the version says what a service can expect:

- A minor version, such as 0.3.0, can break what a service relies on. That includes a renamed or removed export, prop or option. It also includes a renamed or removed class, data attribute or custom property in a component's styling contract, and a change to how a part looks.
- A patch version, such as 0.2.1, only fixes and adds.

npm saves a dependency as `^0.2.0`, which takes patches but not the next minor version. A service therefore takes fixes without taking a breaking change. Each package's `CHANGELOG.md` lists what changed in each version, with breaking and visual changes in sections of their own. Read it before you take a new minor version.

## Commands

```sh
# Install the Bun that mise.lock pins, then the locked packages.
mise trust && mise install --locked
bun install --frozen-lockfile

# Run the site, with the front page, /workbench and /workspace, with hot reload.
# It takes localhost:3000, or the next free port, and says which.
# Next time, it takes the same port again.
bun run dev

# Build the site, then serve it from dist/ as it runs when deployed.
# It takes localhost:3005, or the next free port, and says which.
# If PORT is set, it serves there.
bun run build
bun run preview

# Build each package to its dist/lib.
bun run build:lib

# Build the MCP server, @x-govuk-ui/mcp, to mcp/dist.
bun run build:mcp

# Pack each package as a release does, and check it with npm without staging.
bun run stage --dry-run

# Set every package to a new version, then push main.
# Once its checks pass, the release workflow stages each package on npm.
# Each package goes live when you approve it there with 2FA.
bun run release 0.2.0

# Install the browsers. Check lint, types, unit tests and the three builds.
# Run the browser tests in Chromium, Firefox and WebKit.
bunx --bun playwright install chromium firefox webkit
bun run check
```

## Accessibility

The tests check every page of the site. These are the front page, the workbench, the page of each of the 119 components, and the workspace.

- axe checks each page against the WCAG 2.0, 2.1 and 2.2 A and AA rules it runs by default, in Chromium and in WebKit.
- In Chromium, axe checks each page again in the dark theme. It checks that text contrasts with its background, and that links can be told apart from the words around them.
- On each component's page, no box may cut off its text, in Roboto or in a wide typeface. The wide typeface stands in for whatever typeface a service chooses.
- In Chromium, Firefox and WebKit, behaviour tests use the components as users do, with the keyboard and the pointer. They check where focus goes.

Automated tests find some accessibility failures, but not all. Passing them does not mean that the components conform to WCAG.

## For AI tools

The site serves its documentation for language models at [x-govuk-ui.org/llms.txt](https://x-govuk-ui.org/llms.txt). Each component has a Markdown page at `/llms/<name>.md`, and `/llms-full.txt` has every page in one file.

The MCP server in `mcp/` answers an agent's questions about the components. Its six tools are `get_usage`, `list_components`, `search_docs`, `get_component`, `get_props` and `get_styling`. It reads the documents inside the project's installed x-govuk-ui, so they match the project's version. Without an installed copy, it reads the site's documents. `X_GOVUK_UI_DOCS` names another place to read them from, such as a build's `dist/docs`.

```sh
# Add it to Claude Code from a build. Other clients take the same command and arguments.
claude mcp add x-govuk-ui -e X_GOVUK_UI_DOCS=$PWD/dist/docs -- node $PWD/mcp/dist/index.js
```

## Branding

GOV.UK's crown, logotype, Royal Arms and GDS Transport are for official GOV.UK services only. The library deliberately leaves out the GDS Transport font. A GOV.UK service supplies the font itself, and elsewhere the components fall back to Arial.

The site's own mark is GOV/UK, drawn in `site/brand.tsx`. In production, the site is set in Roboto.
