/**
 * The MCP server's tools, over the documents `openDocs` reads. Each tool answers in Markdown or
 * JSON text. A name that matches no component gets the components it may mean.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import packageFile from "../package.json" with { type: "json" };
import type { Docs } from "./docs";
import { resolve, search, section, sections, suggestions } from "./tools";

type Answer = { content: { type: "text"; text: string }[]; isError?: boolean };
const say = (text: string): Answer => ({ content: [{ type: "text", text }] });
const fail = (text: string): Answer => ({ content: [{ type: "text", text }], isError: true });

const component = z
  .string()
  .describe("The component's slug, name or export, such as date-input, Date input or DateInput");

export function createServer(docs: Docs): McpServer {
  const server = new McpServer({ name: "x-govuk-ui", version: packageFile.version });

  /** The component a name means, or an answer saying it matches none. */
  const find = async (name: string) => {
    const index = await docs.index();
    const entry = resolve(index, name);
    if (entry) return { doc: await docs.component(entry.slug) };
    const near = suggestions(index, name);
    return {
      answer: fail(
        `No component is called ${name}.${near.length ? ` Perhaps ${near.join(", ")}.` : ""} list_components lists them all.`,
      ),
    };
  };
  /** Runs a tool, and returns a failure to read the documents as the tool's own error. */
  const safely =
    <Input>(run: (input: Input) => Promise<Answer>) =>
    async (input: Input) => {
      try {
        return await run(input);
      } catch (error) {
        return fail(
          `The documents could not be read from ${docs.place}: ${(error as Error).message}`,
        );
      }
    };

  server.registerTool(
    "get_usage",
    {
      title: "How to use x-govuk-ui",
      description:
        "What every component shares. That is the imports and stylesheet, parts and their className and render props, fields and forms, styling through the cascade layer, the themes, and GOV.UK's branding rules. Read it before writing code with the library.",
    },
    safely(async () => {
      const index = await docs.index();
      return say(`# x-govuk-ui ${index.version}\n\n${index.usage}`);
    }),
  );

  server.registerTool(
    "list_components",
    {
      title: "List the components",
      description:
        "Every component, or those in one group or about a query, each with its slug, group and what it is for.",
      inputSchema: {
        group: z
          .string()
          .optional()
          .describe("A group, such as Form controls, Navigation or AI and agents"),
        query: z.string().optional().describe("Words the components should be about"),
      },
    },
    safely(async ({ group, query }: { group?: string; query?: string }) => {
      const index = await docs.index();
      const wanted = group?.toLowerCase();
      let entries = wanted
        ? index.components.filter((entry) => entry.group.toLowerCase() === wanted)
        : index.components;
      if (group && !entries.length)
        return fail(
          `No group is called ${group}. The groups are ${[...new Set(index.components.map((entry) => entry.group))].join(", ")}.`,
        );
      if (query) {
        // Each match's place in the search's order, looked up once per comparison instead of found
        // by searching the list.
        const rank = new Map(
          search(index, query, index.components.length).map((match, place) => [match.slug, place]),
        );
        entries = entries
          .filter((entry) => rank.has(entry.slug))
          .sort((a, b) => (rank.get(a.slug) ?? 0) - (rank.get(b.slug) ?? 0));
      }
      return say(
        entries.length
          ? entries
              .map(
                (entry) =>
                  `- ${entry.name} (\`${entry.slug}\`, ${entry.group}): ${entry.description}`,
              )
              .join("\n")
          : "No component matches.",
      );
    }),
  );

  server.registerTool(
    "get_component",
    {
      title: "Read a component's page",
      description:
        "A component's page in Markdown, with its description and what it does here, its parts, its props, the workbench's example, and its styling contract. Ask for one section to keep the answer short.",
      inputSchema: {
        name: component,
        section: z
          .enum(sections)
          .optional()
          .describe("One section only, which is about, parts, props, example or styling"),
      },
    },
    safely(
      async ({ name, section: part }: { name: string; section?: (typeof sections)[number] }) => {
        const { doc, answer } = await find(name);
        if (!doc) return answer;
        if (!part) return say(doc.markdown);
        const text = section(doc.markdown, part);
        return text ? say(text) : fail(`${doc.name} has no ${part} section.`);
      },
    ),
  );

  server.registerTool(
    "get_props",
    {
      title: "A component's props",
      description:
        "A component's props as JSON, each with its type, default and note, and its parts, each with its JSDoc.",
      inputSchema: { name: component },
    },
    safely(async ({ name }: { name: string }) => {
      const { doc, answer } = await find(name);
      if (!doc) return answer;
      const parts = doc.parts.map(({ name, doc }) => ({ name, doc }));
      return say(
        JSON.stringify({ name: doc.name, export: doc.export, props: doc.props, parts }, null, 2),
      );
    }),
  );

  server.registerTool(
    "get_styling",
    {
      title: "A component's styling contract",
      description:
        "What a service styles a component through, as JSON. That is its parts' classes and the elements inside them, the data attributes its styles respond to and who sets each, its custom properties, and the theme tokens it reads. The library's rules sit in the x-govuk-ui cascade layer, so a service's own rules override them.",
      inputSchema: { name: component },
    },
    safely(async ({ name }: { name: string }) => {
      const { doc, answer } = await find(name);
      if (!doc) return answer;
      return say(JSON.stringify({ name: doc.name, ...doc.styling }, null, 2));
    }),
  );

  server.registerTool(
    "search_docs",
    {
      title: "Search the components",
      description:
        "The components a query is about, the strongest match first, each with what matched. It searches names, parts, data attributes, custom properties, classes, props, descriptions and notes.",
      inputSchema: {
        query: z.string().describe("Such as date of birth, data-loading or a sidebar that folds"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(25)
          .optional()
          .describe("At most this many. By default, 10"),
      },
    },
    safely(async ({ query, limit }: { query: string; limit?: number }) => {
      const matches = search(await docs.index(), query, limit);
      if (!matches.length) return say("No component matches.");
      return say(
        `${matches
          .map(
            (match) =>
              `- ${match.name} (\`${match.slug}\`): ${match.description} Matched ${match.found.slice(0, 4).join(", ")}.`,
          )
          .join("\n")}\n\nget_component reads one in full.`,
      );
    }),
  );

  return server;
}
