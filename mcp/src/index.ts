/**
 * The x-govuk-ui MCP server, over stdio. Standard output is for the protocol, so any message about
 * the server itself goes to standard error.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { openDocs } from "./docs";
import { createServer } from "./server";

const docs = openDocs();
await createServer(docs).connect(new StdioServerTransport());
console.error(`x-govuk-ui MCP server, reading its documents from ${docs.place}`);
