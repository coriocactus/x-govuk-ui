// The production server, which serves the built site and nothing else, as it is deployed. Run
// `bun run build` first. It needs no source and no packages, only `dist/`.
const index = Bun.file("dist/index.html");
if (!(await index.exists())) throw new Error("Run bun run build before bun run preview.");

// Only the files found here when it starts are served, each at its own path, so no address can
// reach anything else. The package's build in dist/lib is not part of the site.
const files = new Map<string, string>();
for await (const path of new Bun.Glob("**/*").scan({ cwd: "dist", onlyFiles: true })) {
  if (!path.startsWith("lib/")) files.set(`/${path}`, `dist/${path}`);
}
// Every component's example source is published, so the components are known from those.
const componentNames = [...files.keys()]
  .filter((path) => path.startsWith("/source/"))
  .map((path) => path.slice("/source/".length));
// The site's front page, the workbench and the workspace.
for (const path of [
  "/",
  "/workspace",
  "/workbench",
  ...componentNames.map((name) => `/workbench/${name}`),
]) {
  files.set(path, "dist/index.html");
}
// The old component addresses lead to their new ones in the workbench, and Resizable's panels
// became Tiles.
const renamed: Record<string, string> = { resizable: "tiles" };
const moved = (path: string) => {
  const old = path.match(/^\/(components|workbench)\/([^/]+)$/);
  const name = old && (renamed[old[2] ?? ""] ?? old[2] ?? "");
  if (!old || !name || !componentNames.includes(name)) return null;
  return old[1] === "components" || name !== old[2] ? `/workbench/${name}` : null;
};

// The page's two inline scripts, which set the theme and link the fonts before it paints, are
// allowed by their hashes, so no other inline script can run. Styles may be inline, because Base UI
// and Motion write style elements and attributes as they run.
const hash = (code: string) =>
  `'sha256-${new Bun.CryptoHasher("sha256").update(code).digest("base64")}'`;
const inline = [...(await index.text()).matchAll(/<script>([\s\S]*?)<\/script>/g)].map(([, code]) =>
  hash(code ?? ""),
);
const security = {
  "Content-Security-Policy": [
    "default-src 'self'",
    `script-src 'self' ${inline.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    // The workbench's phone preview frames the site's own pages. Nothing else may frame them.
    "frame-ancestors 'self'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // The chat input's dictation listens to the microphone. Nothing else asks for a device.
  "Permissions-Policy": "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
  // Browsers obey it only over HTTPS, which is how the site is served when deployed.
  "Strict-Transport-Security": "max-age=31536000",
  // No Cross-Origin-Opener-Policy. The site opens no windows and has nothing for another to reach.
  // Under that policy, Firefox swaps process as it navigates, and in 5 of 320 test loads the page
  // never finished loading.
};
// The bundler names its files by their contents, so they never change and are cached for good.
// The page itself is checked every time, so a new release shows at once.
const caching = (path: string) =>
  /^\/[a-z]+-[a-z0-9]{8}\.(js|css|svg)$/.test(path)
    ? "public, max-age=31536000, immutable"
    : path.startsWith("/assets/")
      ? "public, max-age=86400"
      : "no-cache";

/** The server, listening on a port. */
const listen = (port: number | string) =>
  Bun.serve({
    hostname: process.env.HOST ?? "127.0.0.1",
    port,
    fetch(request) {
      const path = new URL(request.url).pathname;
      const destination = moved(path);
      if (destination) {
        return new Response(null, { status: 301, headers: { ...security, Location: destination } });
      }
      const file = files.get(path);
      // A missing file is a plain 404. Any other address gets the app's page for an address the
      // site does not have, with the same status.
      if (!file) {
        if (/^\/(source|assets|styling|llms|docs)\//.test(path)) {
          return new Response("Not found", { status: 404, headers: security });
        }
        return new Response(Bun.file("dist/index.html"), {
          status: 404,
          headers: {
            ...security,
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      }
      return new Response(Bun.file(file), {
        headers: {
          ...security,
          "Cache-Control": caching(path),
          ...(path.startsWith("/source/") ? { "Content-Type": "text/plain; charset=utf-8" } : {}),
          ...(path.endsWith(".md") ? { "Content-Type": "text/markdown; charset=utf-8" } : {}),
        },
      });
    },
  });

// Given PORT, it serves there, as a host asks. Without it, it takes the first free port from 3005
// and says which, so a second preview, such as another checkout's, can run beside the first.
const server = (() => {
  if (process.env.PORT) return listen(process.env.PORT);
  for (let port = 3005; port < 3205; port++) {
    try {
      return listen(port);
    } catch {}
  }
  throw new Error("No port is free from 3005 to 3204.");
})();
// It is announced at localhost, as the workbench is, whichever address it listens on.
console.log(`x-govuk-ui production preview: http://localhost:${server.port}/`);
