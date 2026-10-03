import { $createCodeNode, $isCodeHighlightNode } from "@lexical/code-core";
import {
  $hasUpdateTag,
  $isTextNode,
  type DOMConversionMap,
  getStyleObjectFromCSS,
  type LexicalEditor,
  type LexicalNode,
  PASTE_TAG,
  type TextFormatType,
  TextNode,
} from "lexical";

// Colour, after Lexxy's. Text and its background take the colours the editor offers or permits.
// They are drawn and written as a mark, and read back from the HTML of this editor and others.

/** Whether a style gives text a colour or a background. */
function hasColours(style: string | Record<string, string>) {
  const styles = typeof style === "string" ? getStyleObjectFromCSS(style) : style;
  return Boolean(styles.color || styles["background-color"]);
}

/** Whether a text node was pasted with its colours, which are checked against the editor's. */
const pastedStyles = new WeakSet<TextNode>();

/** Marks text as pasted, for its colours to be checked. */
function markPasted(node: TextNode) {
  pastedStyles.add(node);
}

/** A style for a text's colours, as the editor writes one, or nothing where it has none. */
function colourStyle(colour: string | null | undefined, background: string | null | undefined) {
  return [
    ["color", colour],
    ["background-color", background],
  ]
    .filter(([, value]) => value)
    .map(([property, value]) => `${property}: ${value};`)
    .join(" ");
}

/**
 * Turns a colour a page wrote another way, such as rgb() for a hex, into the colour as the editor
 * offers it, by how the browser reads each. Colours the editor neither offers nor permits are
 * dropped.
 */
function canonicaliser(property: "color" | "background-color", allowed: readonly string[]) {
  const known = new Map<string, string | null>(allowed.map((value) => [value, value]));
  let computed: string[] | null = null;
  const compute = (values: readonly string[]) => {
    const holder = document.createElement("div");
    holder.style.display = "none";
    const elements = values.map((value) => {
      const element = document.createElement("span");
      element.style.setProperty(property, value);
      holder.append(element);
      return element;
    });
    document.body.append(holder);
    const result = elements.map((element) => getComputedStyle(element).getPropertyValue(property));
    holder.remove();
    return result;
  };
  return (value: string | undefined) => {
    if (!value) return null;
    if (known.has(value)) return known.get(value) ?? null;
    computed ??= compute(allowed);
    let index = computed.indexOf(value);
    if (index === -1) index = computed.indexOf(compute([value])[0] ?? "");
    const canonical = index === -1 ? null : (allowed[index] ?? null);
    known.set(value, canonical);
    return canonical;
  };
}

/**
 * Coloured text is drawn as a mark, as Lexxy draws it, so the colours are written out on the mark.
 * The highlight format follows whether the text has colours. Pasted colours are kept only where the
 * editor offers or permits them, under the editor's name for each colour.
 */
export function registerColours(
  editor: LexicalEditor,
  allowed: { text: readonly string[]; background: readonly string[] },
) {
  const colour = canonicaliser("color", allowed.text);
  const background = canonicaliser("background-color", allowed.background);
  const $sync = (node: TextNode) => {
    if (pastedStyles.has(node)) {
      pastedStyles.delete(node);
      const styles = getStyleObjectFromCSS(node.getStyle());
      node.setStyle(colourStyle(colour(styles.color), background(styles["background-color"])));
    }
    if (hasColours(node.getStyle()) !== node.hasFormat("highlight")) node.toggleFormat("highlight");
  };
  return editor.registerNodeTransform(TextNode, (node) => {
    // Code is coloured only by its syntax.
    if (!$isCodeHighlightNode(node)) $sync(node);
  });
}

/** The formats an element's own style gives its text, as a span from another editor does. */
function styledFormats(element: HTMLElement): TextFormatType[] {
  const formats: TextFormatType[] = [...(tagFormats[element.tagName] ?? [])];
  const { fontWeight, fontStyle, textDecoration, verticalAlign } = element.style;
  if (fontWeight === "bold" || Number.parseInt(fontWeight, 10) >= 600) formats.push("bold");
  if (fontStyle === "italic") formats.push("italic");
  if (textDecoration.includes("line-through")) formats.push("strikethrough");
  if (textDecoration.includes("underline")) formats.push("underline");
  if (verticalAlign === "sub") formats.push("subscript");
  if (verticalAlign === "super") formats.push("superscript");
  return formats;
}

const tagFormats: Record<string, TextFormatType[]> = {
  B: ["bold"],
  STRONG: ["bold"],
  EM: ["italic"],
  I: ["italic"],
  DEL: ["strikethrough"],
  S: ["strikethrough"],
  U: ["underline"],
};

/**
 * Text in an element with colours keeps its formats and takes the colours, as Trix and Lexxy
 * write coloured text, and a deletion is struck through, as Trix writes it.
 */
function colouredText(always = false) {
  return (element: HTMLElement) => {
    if (!always && !element.style?.color && !element.style?.backgroundColor) return null;
    return {
      priority: 2 as const,
      conversion: (dom: HTMLElement) => ({
        node: null,
        forChild: (child: LexicalNode) => {
          if (!$isTextNode(child)) return child;
          for (const format of styledFormats(dom))
            if (!child.hasFormat(format)) child.toggleFormat(format);
          return $applyElementColours(child, dom);
        },
      }),
    };
  };
}

/**
 * What the editor reads of HTML beyond Lexical's own, which is coloured text and Trix's code.
 * @internal
 */
export const htmlImports: DOMConversionMap = {
  mark: colouredText(true),
  span: colouredText(),
  strong: colouredText(),
  b: colouredText(),
  em: colouredText(),
  i: colouredText(),
  del: colouredText(true),
  pre: (element: HTMLElement) =>
    element.hasAttribute("language")
      ? {
          priority: 2 as const,
          conversion: (dom: HTMLElement) => ({
            node: $createCodeNode(dom.getAttribute("language")),
          }),
        }
      : null,
};

/**
 * Reads a mark's colours onto its text, as a highlight with its colours. They are read as the HTML
 * wrote them, because the browser would give a hex back as rgb(). @internal
 */
export function $applyElementColours(node: TextNode, element: HTMLElement) {
  const declared = getStyleObjectFromCSS(element.getAttribute("style") ?? "");
  const styles = colourStyle(declared.color, declared["background-color"]);
  if ($hasUpdateTag(PASTE_TAG)) markPasted(node);
  if (styles) node.setStyle(`${node.getStyle()} ${styles}`.trim());
  return node;
}
