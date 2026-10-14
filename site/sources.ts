import { type ComponentName, componentNames } from "./catalogue";
import { composable } from "./composable";

/** Each component's example file. It renders the preview and is shown as the usage code. */
export const sources = Object.fromEntries(
  componentNames.map((name) => [name, `site/examples/${name}.tsx`]),
) as Record<ComponentName, string>;

/**
 * The views Piscine Assist composes in the workspace, by name. Each is a file of JSX, as an agent
 * writes one, which the page shows as it is written and then draws.
 */
export const compositions = Object.fromEntries(
  [...new Bun.Glob("*.tsx").scanSync("site/compositions")]
    .sort()
    .map((file) => [file.replace(/\.tsx$/, ""), `site/compositions/${file}`]),
);

/**
 * A composition compiled for the page. It is a module whose default export takes a `require` for
 * the modules the composition imports, and returns the composition's exports. The page loads it
 * from the site, as it loads its own scripts, so the site's Content Security Policy needs no
 * `unsafe-eval`.
 *
 * An import of anything but `composable` fails here, before the page sees it. The check reads the
 * imports the code names, so it is an allowlist for the site's own files, not a sandbox. A
 * composition runs with the page's rights, as any of the site's scripts does.
 */
export async function compiledComposition(path: string) {
  const result = await Bun.build({
    entrypoints: [path],
    throw: false,
    format: "cjs",
    target: "browser",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [
      {
        name: "composable",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.kind === "entry-point-build") return undefined;
            if ((composable as readonly string[]).includes(args.path))
              return { path: args.path, external: true };
            throw new Error(`${path} imports ${args.path}, which a composition cannot import`);
          });
        },
      },
    ],
  });
  if (!result.success)
    throw new Error(`${path} did not compile: ${result.logs.map((log) => log.message).join("; ")}`);
  const code = await result.outputs[0]!.text();
  return `export default function (require) {
var module = { exports: {} }, exports = module.exports;
${code}
return module.exports;
}
`;
}

const transport = "node_modules/govuk-frontend/dist/govuk/assets/fonts";
const noto = "node_modules/@fontsource-variable/noto-sans";

export const assets: Record<string, string> = {
  // Photos of London from Wikimedia Commons, for the examples' cards, carousel and lightbox.
  ...Object.fromEntries(
    [...new Bun.Glob("*.jpg").scanSync("site/assets/photos")].map((file) => [
      `photos/${file}`,
      `site/assets/photos/${file}`,
    ]),
  ),
  // The Royal Arms above Crown copyright in the footer, at the path GOV.UK Frontend uses.
  "images/govuk-crest.svg": "node_modules/govuk-frontend/dist/govuk/assets/images/govuk-crest.svg",
};

/**
 * Where the workbench runs. Local development is set in GDS Transport, from GOV.UK Frontend's
 * files. The production build is set in Noto Sans, the typeface for a service outside GOV.UK,
 * because the project has no licence to ship GDS Transport or to display it on the site.
 */
export type Mode = "development" | "production";

/** The font files the workbench serves at /assets/fonts/. */
export function fontAssets(mode: Mode): Record<string, string> {
  const [folder, pattern] =
    mode === "development"
      ? [transport, "*.{woff,woff2}"]
      : [`${noto}/files`, "noto-sans-*-wght-*.woff2"];
  return Object.fromEntries(
    [...new Bun.Glob(pattern).scanSync(folder)].map((file) => [
      `fonts/${file}`,
      `${folder}/${file}`,
    ]),
  );
}

/**
 * The workbench's /assets/fonts.css. In development, @font-face rules for the GDS Transport files
 * GOV.UK Frontend ships, generated from the files themselves so their hashed names stay correct.
 * In production, Fontsource's rules for Noto Sans, one file for each script so a page downloads
 * only the scripts it shows, and Noto Sans instead of GDS Transport as the components' font.
 */
export async function fontFaces(mode: Mode) {
  if (mode === "development") {
    const files = Object.keys(fontAssets(mode));
    const faces = Object.entries({ light: 400, bold: 700 }).map(([name, weight]) => {
      const own = files
        .filter((key) => key.startsWith(`fonts/${name}-`))
        .sort((a, b) => Number(b.endsWith(".woff2")) - Number(a.endsWith(".woff2")));
      if (!own.length)
        throw new Error(`GOV.UK Frontend no longer ships the ${name} GDS Transport font`);
      const src = own
        .map(
          (file) =>
            `url("/assets/${file}") format("${file.endsWith(".woff2") ? "woff2" : "woff"}")`,
        )
        .join(", ");
      return `@font-face { font-family: "GDS Transport"; font-style: normal; font-weight: ${weight}; font-display: fallback; src: ${src}; }`;
    });
    return `${faces.join("\n")}\n`;
  }
  const rules = await Promise.all(
    ["wght.css", "wght-italic.css"].map((name) => Bun.file(`${noto}/${name}`).text()),
  );
  const css = rules
    .join("\n")
    .replaceAll("'Noto Sans Variable'", '"Noto Sans"')
    .replaceAll("font-display: swap", "font-display: fallback")
    .replaceAll(/url\(\.\/files\/([^)]+)\)/g, 'url("/assets/fonts/$1")');
  if (!css.includes("/assets/fonts/noto-sans-latin-wght-normal.woff2"))
    throw new Error("Fontsource's Noto Sans no longer names its files as the workbench expects");
  return `${css}\n:root { --x-govuk-ui-font: "Noto Sans", Arial, sans-serif; }\n`;
}
