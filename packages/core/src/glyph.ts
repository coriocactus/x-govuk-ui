import { Fragment, isValidElement, type ReactNode } from "react";

// Decides whether a small box, such as a key cap, a tag or a badge, shows a single mark. If so,
// the box can be square instead of a little wider than it is tall.

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter() : undefined;

/**
 * Whether text is one character as a reader sees it, such as "K", "⌘", "3" or an emoji with its
 * skin tone, which are several code points. Space around it is not counted. @internal
 */
export function isOneCharacter(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (!segmenter) return Array.from(trimmed).length === 1;
  const characters = segmenter.segment(trimmed)[Symbol.iterator]();
  characters.next();
  return Boolean(characters.next().done);
}

/**
 * Whether children show a single mark, which is one character, or one `svg` or `img` and no text.
 * Text for screen readers alone, in the library's visually hidden class, is not seen, so it is not
 * counted. What a component renders is not known until it renders, so a component counts as more
 * than one mark, even an icon component. @internal
 */
export function isOneGlyph(children: ReactNode) {
  let text = "";
  // Counts the pictures among the children, and notes whether anything else among them shows. A
  // component counts as more than one mark, whatever it renders.
  let pictures = 0;
  let more = false;
  const visit = (node: ReactNode) => {
    if (node === null || node === undefined || typeof node === "boolean") return;
    if (typeof node === "string" || typeof node === "number") {
      text += String(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (!isValidElement(node)) {
      more = true;
      return;
    }
    const props = node.props as { className?: unknown; children?: ReactNode };
    if (
      typeof props.className === "string" &&
      /\bx-govuk-ui-visually-hidden\b/.test(props.className)
    )
      return;
    if (node.type === Fragment) visit(props.children);
    else if (node.type === "svg" || node.type === "img") pictures += 1;
    else more = true;
  };
  visit(children);
  if (more) return false;
  return pictures === 0 ? isOneCharacter(text) : pictures === 1 && !text.trim();
}
