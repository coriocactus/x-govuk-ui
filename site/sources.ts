import { type ComponentName, componentNames } from "./catalogue";

/** Each component's example file. It renders the preview and is shown as the usage code. */
export const sources = Object.fromEntries(
  componentNames.map((name) => [name, `site/examples/${name}.tsx`]),
) as Record<ComponentName, string>;

const transport = "node_modules/govuk-frontend/dist/govuk/assets/fonts";
const roboto = "node_modules/@fontsource-variable/roboto";

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
 * files. The production build is set in Roboto, because the project has no licence to ship GDS
 * Transport or to display it on the site.
 */
export type Mode = "development" | "production";

/** The font files the workbench serves at /assets/fonts/. */
export function fontAssets(mode: Mode): Record<string, string> {
  const [folder, pattern] =
    mode === "development"
      ? [transport, "*.{woff,woff2}"]
      : [`${roboto}/files`, "roboto-*-wght-*.woff2"];
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
 * In production, Fontsource's rules for Roboto, one file for each script so a page downloads only
 * the scripts it shows, and Roboto instead of GDS Transport as the components' font.
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
    ["wght.css", "wght-italic.css"].map((name) => Bun.file(`${roboto}/${name}`).text()),
  );
  const css = rules
    .join("\n")
    .replaceAll("'Roboto Variable'", '"Roboto"')
    .replaceAll("font-display: swap", "font-display: fallback")
    .replaceAll(/url\(\.\/files\/([^)]+)\)/g, 'url("/assets/fonts/$1")');
  if (!css.includes("/assets/fonts/roboto-latin-wght-normal.woff2"))
    throw new Error("Fontsource's Roboto no longer names its files as the workbench expects");
  return `${css}\n:root { --x-govuk-ui-font: "Roboto", "Helvetica Neue", Helvetica, Arial, sans-serif; }\n`;
}
