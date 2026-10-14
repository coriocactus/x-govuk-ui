# @x-govuk-ui/mcp

`@x-govuk-ui/mcp` is an MCP server for the documentation of [x-govuk-ui](https://x-govuk-ui.org/).

- Its tools are `get_usage`, `list_components`, `search_docs`, `get_component`, `get_props` and `get_styling`.
- It reads the documentation inside the `x-govuk-ui` installed in the project it starts in.
- Without an installed copy, it reads the documentation at https://x-govuk-ui.org/.
- `X_GOVUK_UI_DOCS` names another place to read from, either a directory or an address.

```sh
# Add it to Claude Code. Other clients take the same command.
claude mcp add x-govuk-ui -- npx -y @x-govuk-ui/mcp
```

It needs Node 20 or later.

## Other packages

`@x-govuk-ui/mcp` is released with four other packages, at the same version:

- [`x-govuk-ui`](https://www.npmjs.com/package/x-govuk-ui), the library
- [`@x-govuk-ui/jorjorwel`](https://www.npmjs.com/package/@x-govuk-ui/jorjorwel), the Editor, on Lexical
- [`@x-govuk-ui/memetics`](https://www.npmjs.com/package/@x-govuk-ui/memetics), the charts, on Recharts
- [`@x-govuk-ui/belsize`](https://www.npmjs.com/package/@x-govuk-ui/belsize), Tiles, on react-mosaic

## Licence

`@x-govuk-ui/mcp` is under the MIT licence. `dist/THIRD_PARTY_NOTICES.txt` gives the licences of the packages it bundles.
