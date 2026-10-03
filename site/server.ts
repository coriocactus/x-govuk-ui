import { workbenchPort } from "../scripts/checkout";
import { type ComponentName, componentNames } from "./catalogue";
import index from "./index.html";
import { docsDocuments, llmsDocuments } from "./llms";
import { assets, fontAssets, fontFaces, sources } from "./sources";
import { stylingContracts } from "./styling";

const redirect = (to: string, status: number) =>
  new Response(null, { status, headers: { Location: to } });
const text = (body: string | undefined, kind: "plain" | "markdown") =>
  body === undefined
    ? new Response("Not found", { status: 404 })
    : new Response(body, { headers: { "Content-Type": `text/${kind}; charset=utf-8` } });

// The port is found once for the process. Reloading as files change runs the module again, and
// the server's own port would then be in use, so it would move to another.
const kept = globalThis as { workbenchPort?: number | string };
kept.workbenchPort ??= process.env.PORT ?? (await workbenchPort());

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: kept.workbenchPort,
  development: { hmr: true, console: true },
  routes: {
    "/assets/fonts.css": async () =>
      new Response(await fontFaces("development"), {
        headers: { "Content-Type": "text/css; charset=utf-8" },
      }),
    // The site's front page, the workbench and the workspace. The old component addresses lead to
    // their new ones in the workbench.
    "/": index,
    "/workspace": index,
    "/components/:name": (request) => redirect(`/workbench/${request.params.name}`, 301),
    // Resizable's panels became Tiles.
    "/workbench/resizable": () => redirect("/workbench/tiles", 301),
    "/workbench": index,
    ...Object.fromEntries(componentNames.map((name) => [`/workbench/${name}`, index])),
    ...Object.fromEntries(
      Object.entries({ ...assets, ...fontAssets("development") }).map(([name, path]) => [
        `/assets/${name}`,
        () => new Response(Bun.file(path)),
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(sources).map(([name, path]) => [
        `/source/${name}`,
        () =>
          new Response(Bun.file(path), {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
      ]),
    ),
    // Each component's styling contract and the documentation for language models, read from
    // the current source, so an edit shows on the next request.
    "/styling/:file": async (request) => {
      const name = request.params.file.replace(/\.json$/, "") as ComponentName;
      const contract = componentNames.includes(name) && (await stylingContracts())[name];
      return contract ? Response.json(contract) : new Response("Not found", { status: 404 });
    },
    "/llms.txt": async () => text((await llmsDocuments())["llms.txt"], "plain"),
    "/llms-full.txt": async () => text((await llmsDocuments())["llms-full.txt"], "plain"),
    "/llms/:file": async (request) =>
      text((await llmsDocuments())[`llms/${request.params.file}`], "markdown"),
    "/docs/:file": async (request) => {
      const body = (await docsDocuments())[`docs/${request.params.file}`];
      return body === undefined
        ? new Response("Not found", { status: 404 })
        : new Response(body, { headers: { "Content-Type": "application/json; charset=utf-8" } });
    },
    // Any other address is the app's page for an address the site does not have. A missing
    // file is a plain 404.
    "/source/*": () => new Response("Not found", { status: 404 }),
    "/assets/*": () => new Response("Not found", { status: 404 }),
    "/*": index,
  },
  fetch() {
    return new Response("Not found", { status: 404 });
  },
});
// It listens on every address, so a phone on the network can reach it, but is announced at
// localhost. Browsers copy to the clipboard only from a secure context, which localhost is and an
// address such as 0.0.0.0 is not.
console.log(`x-govuk-ui workbench: http://localhost:${server.port}/`);
