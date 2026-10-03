import type { CSSProperties } from "react";

/**
 * The checkout this workbench is served from, which `bun run dev` gives Bun to write into the page.
 * The production build has none, so the published workbench shows no tag.
 */
const checkout = process.env.BUN_PUBLIC_CHECKOUT;

/** A colour's relative luminance, as WCAG works it out. */
function luminance(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  const [red, green, blue] = [16, 8, 0].map((shift) => {
    const channel = ((value >> shift) & 0xff) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

/** The contrast between two colours, from 1 to 21. */
function contrast(one: string, other: string) {
  const [lighter, darker] = [luminance(one), luminance(other)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

/** Numbers that look random, but are the same each time for the same name, from mulberry32. */
function seeded(name: string) {
  let seed = 0;
  for (const character of name) seed = (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), seed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

/**
 * A tag's colours on a page. The fill stands out from the page at 3:1, as a shape must, and the
 * text reads on the fill at 4.5:1. Each is drawn at random from the name's own numbers.
 */
function colours(next: () => number, page: string) {
  const colour = () =>
    `#${Math.floor(next() * 0x1000000)
      .toString(16)
      .padStart(6, "0")}`;
  for (;;) {
    const fill = colour();
    if (contrast(fill, page) < 3) continue;
    // Few text colours read on some fills, so a fill that finds none soon gives way.
    for (let tries = 0; tries < 200; tries++) {
      const text = colour();
      if (contrast(text, fill) >= 4.5) return { fill, text };
    }
  }
}

/** The page's colour in each theme, which the tag must stand out from. */
const pages = { light: "#ffffff", dark: "#1b1f22" };

/**
 * The name of the jj workspace this workbench is served from, in capitals, in colours its name
 * decides for each theme. Several workbenches open at once can then be told apart at a glance. It
 * shows only in development.
 */
export function CheckoutTag() {
  if (!checkout) return null;
  const next = seeded(checkout);
  const light = colours(next, pages.light);
  const dark = colours(next, pages.dark);
  return (
    <span
      className="checkout-tag"
      style={
        {
          "--checkout-fill": light.fill,
          "--checkout-text": light.text,
          "--checkout-fill-dark": dark.fill,
          "--checkout-text-dark": dark.text,
        } as CSSProperties
      }
    >
      <span className="visually-hidden">Workspace: </span>
      {checkout}
    </span>
  );
}
