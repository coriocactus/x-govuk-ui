# x-govuk-ui

x-govuk-ui is a React component library based on the GOV.UK Design System, built on Base UI and Motion. It is not an official GOV.UK project.

[x-govuk-ui.org](https://x-govuk-ui.org/) shows every component, with its props and its code.

## Install

```sh
npm install x-govuk-ui
```

The library needs React 19. It is built on Base UI and Motion, and takes each as a peer dependency at one exact version. A service that uses either one itself therefore shares the library's copy. npm installs them, unless `--legacy-peer-deps` tells it not to. In that case, install them yourself, at the versions in `package.json`.

A prerelease is tagged `next`. To try what is coming, install it with `npm install x-govuk-ui@next`.

## Usage

Import the stylesheet once, then the components:

```tsx
import "x-govuk-ui/styles.css";
import { Button } from "x-govuk-ui";

export function Continue() {
  return <Button>Save and continue</Button>;
}
```

The styles are in the `x-govuk-ui` cascade layer, so a service's own rules override them.

## Extensions

The components with large dependencies are in packages of their own. Each is released with this one, at the same version.

- `@x-govuk-ui/jorjorwel`, the Editor, on Lexical
- `@x-govuk-ui/memetics`, the charts, on Recharts
- `@x-govuk-ui/belsize`, Tiles, on react-mosaic

## For AI tools

The site serves its documentation for language models at [x-govuk-ui.org/llms.txt](https://x-govuk-ui.org/llms.txt). `@x-govuk-ui/mcp` answers an agent's questions about the components.

## Licence

x-govuk-ui is under the MIT licence. `dist/lib/THIRD_PARTY_NOTICES.txt` gives the licences of the code it takes from others.
