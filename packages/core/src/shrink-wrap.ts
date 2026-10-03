"use client";

import { clearCache, prepareWithSegments, walkLineRanges } from "@chenglou/pretext";
import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";

type Prepared = ReturnType<typeof prepareWithSegments>;
const prepared = new Map<string, Prepared>();

// Measures the spaces a line ends with. The browser lets them hang past the edge of the box, so
// they take no space in it, but Pretext counts them in the line's width.
let ruler: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string) {
  ruler ??= document.createElement("canvas").getContext("2d");
  if (!ruler) return 0;
  ruler.font = font;
  return ruler.measureText(text).width;
}

/** Bumps once the page's fonts have loaded, after which text is measured again in its real font. */
function useFontsLoaded() {
  const [loaded, setLoaded] = useState(0);
  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;
    const again = () => {
      // Widths measured before a web font loads are the fallback font's.
      clearCache();
      prepared.clear();
      setLoaded((count) => count + 1);
    };
    document.fonts.ready.then(again);
    document.fonts.addEventListener("loadingdone", again);
    return () => document.fonts.removeEventListener("loadingdone", again);
  }, []);
  return loaded;
}

export type ShrinkWrapOptions = {
  /**
   * The element whose width the text may take a share of. By default, the element's parent, with
   * the element's own max-width as the share.
   */
  container?: () => HTMLElement | null | undefined;
  /** The share of the container's width the element may take, such as 0.8. */
  share?: number;
};

/**
 * The width that wraps an element's text into the same lines as its widest allowed width does, with
 * no space left over at the end of its longest line. CSS can only make a box of several lines as
 * wide as it may be, so a bubble keeps a ragged gap on one side. Pretext measures the lines without
 * asking the browser to lay out the page. It applies only while the element contains plain text,
 * and follows its container's width and the fonts as they load.
 * @internal
 */
export function useShrinkWrap(
  element: RefObject<HTMLElement | null>,
  enabled: boolean,
  options: ShrinkWrapOptions = {},
) {
  const [width, setWidth] = useState<number | null>(null);
  // The page renders again once the fonts load, and the text is measured again in its real font.
  const fonts = useFontsLoaded();
  const settings = useRef(options);
  settings.current = options;
  // The text last measured, so a render that leaves the text alone costs no measuring at all.
  const measured = useRef<string | null>(null);

  const fit = useRef(() => {});
  fit.current = () => {
    const node = element.current;
    const container = settings.current.container
      ? settings.current.container()
      : node?.parentElement;
    if (!node || !container) return;
    const text = node.textContent ?? "";
    measured.current = text;
    if (node.children.length > 0 || !text.trim()) return setWidth(null);
    const style = getComputedStyle(node);
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const sides =
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight) +
      Number.parseFloat(style.borderLeftWidth) +
      Number.parseFloat(style.borderRightWidth);
    // The widest the element may be. It is its share of its container, or its max-width, as a share
    // of its container or in pixels.
    const room = container.clientWidth;
    const share = settings.current.share;
    let cap: number;
    if (share !== undefined) cap = room * share;
    else if (style.maxWidth.endsWith("%")) cap = (room * Number.parseFloat(style.maxWidth)) / 100;
    else cap = Number.parseFloat(style.maxWidth) || room;
    const most = Math.floor(Math.min(room, cap) - sides);
    const key = `${font}|${text}`;
    let lines = prepared.get(key);
    if (!lines) {
      lines = prepareWithSegments(text, font, {
        whiteSpace: style.whiteSpace.startsWith("pre") ? "pre-wrap" : "normal",
      });
      prepared.set(key, lines);
    }
    let widest = 0;
    const { segments } = lines;
    walkLineRanges(lines, most, (line) => {
      let hanging = 0;
      if (line.end.graphemeIndex === 0)
        for (let at = line.end.segmentIndex - 1; at >= line.start.segmentIndex; at--) {
          const segment = segments[at] ?? "";
          if (!/^\s+$/.test(segment)) break;
          hanging += measure(segment, font);
        }
      widest = Math.max(widest, line.width - hanging);
    });
    // Rounded up, and never past the widest allowed, so the browser breaks the lines the same way.
    const next = Math.min(most, Math.ceil(widest)) + sides;
    setWidth((current) => (current === next ? current : next));
  };

  // After a render that changed the text, the text is measured again. Reading the text alone
  // costs no layout, so other renders cost nothing.
  useLayoutEffect(() => {
    if (enabled && element.current?.textContent !== measured.current) fit.current();
  });

  // The container's width is observed once, and the fonts arriving trigger a new measurement.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The fonts arriving measure again.
  useLayoutEffect(() => {
    const node = element.current;
    const container = settings.current.container
      ? settings.current.container()
      : node?.parentElement;
    if (!enabled || !container) return;
    fit.current();
    const observer = new ResizeObserver(() => fit.current());
    observer.observe(container);
    return () => observer.disconnect();
  }, [enabled, fonts]);
  return enabled ? width : null;
}
