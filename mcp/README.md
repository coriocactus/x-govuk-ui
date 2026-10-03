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

## Licence

`@x-govuk-ui/mcp` is under the MIT licence. `dist/THIRD_PARTY_NOTICES.txt` gives the licences of the packages it bundles.
