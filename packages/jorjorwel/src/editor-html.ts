import { $isCodeNode, CodeHighlightNode } from "@lexical/code-core";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  CHECK_LIST,
  type ElementTransformer,
  HEADING,
  type MultilineElementTransformer,
  TRANSFORMERS,
  type Transformer,
} from "@lexical/markdown";
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";
import { $createHeadingNode, type HeadingTagType } from "@lexical/rich-text";
import {
  $createParagraphNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type DOMExportOutput,
  getStyleObjectFromCSS,
  type LexicalEditor,
  type LexicalNode,
  TextNode,
} from "lexical";
import { Marked, type Tokens } from "marked";
import type { EditorValueFormat } from "./editor-context";

// Reading the value into the document, and writing the document out as the value. The value is
// HTML, as Lexxy writes it, without the classes and styles the editor draws with, or Markdown.

/**
 * A text node's HTML. Lexical draws bold as strong and italic as em, then wraps them again in b and
 * i. It draws strikethrough and underline as spans with only the editor's classes. Here each is
 * written once, as the element that means it, and the spans are removed.
 */
function exportText(editor: LexicalEditor, node: LexicalNode): DOMExportOutput {
  const text = node as TextNode;
  const element = text.createDOM(editor._config, editor);
  // The browser writes a colour back as rgb(), so the style is kept as the node stores it.
  if (text.getStyle()) element.setAttribute("style", text.getStyle());
  let result: HTMLElement = element;
  const wrap = (tag: string) => {
    const wrapper = document.createElement(tag);
    wrapper.append(result);
    result = wrapper;
  };
  if (text.hasFormat("bold") && !contains(element, "strong")) wrap("b");
  if (text.hasFormat("italic") && !contains(element, "em")) wrap("i");
  if (text.hasFormat("strikethrough")) wrap("s");
  if (text.hasFormat("underline")) wrap("u");
  return { element: unwrapSpans(result) as HTMLElement };
}

function contains(element: HTMLElement, tag: string) {
  return element.tagName === tag.toUpperCase() || element.querySelector(tag) !== null;
}

/** The element with its spans unwrapped, or only the text when it is all a span. */
function unwrapSpans(element: HTMLElement): Node {
  if (element.tagName === "SPAN" && !element.getAttribute("style"))
    return element.firstChild ?? element;
  for (const span of element.querySelectorAll("span")) span.replaceWith(...span.childNodes);
  return element;
}

/** The HTML export of every node the editor writes as text. @internal */
export const htmlExports = new Map([
  [TextNode, exportText],
  [CodeHighlightNode, exportText],
]);

/** The styles the value keeps, which are a text's colours. The rest is the editor's own drawing. */
const keptStyles = ["color", "background-color"];

/**
 * The document's HTML, without the editor's drawing, which is its classes, directions, white space
 * styles and Lexical's own attributes. A code block's line breaks become its lines again, and a
 * table loses the widths the editor gave its columns.
 */
function cleanHtml(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  const content = template.content;
  for (const element of content.querySelectorAll<HTMLElement>("*")) {
    element.removeAttribute("class");
    element.removeAttribute("dir");
    element.removeAttribute("spellcheck");
    element.removeAttribute("data-lexical-text");
    element.removeAttribute("data-highlight-language");
    element.removeAttribute("tabindex");
    element.removeAttribute("value");
    // Links open in the page they are on, as GOV.UK's do.
    if (element.tagName === "A") {
      element.removeAttribute("rel");
      element.removeAttribute("target");
    }
    for (const name of element.getAttributeNames())
      if (name.startsWith("data-lexical") || name.startsWith("__")) element.removeAttribute(name);
    const style = element.getAttribute("style");
    if (style !== null) {
      // Read as written, so a colour stays the hex it was chosen as, not the browser's rgb() form.
      const declared = getStyleObjectFromCSS(style);
      const kept = keptStyles
        .map((property) => [property, declared[property]] as const)
        .filter(([, value]) => value);
      if (kept.length && (element.tagName === "MARK" || element.tagName === "SPAN"))
        element.setAttribute(
          "style",
          kept.map(([property, value]) => `${property}: ${value}`).join("; "),
        );
      else element.removeAttribute("style");
    }
    if (element.tagName === "LI" && element.getAttribute("role") === "checkbox") {
      element.removeAttribute("role");
      element.parentElement?.setAttribute("data-checklist", "");
    } else if (element.tagName === "LI") element.removeAttribute("aria-checked");
    if (element.tagName === "TD" || element.tagName === "TH") {
      element.removeAttribute("width");
      if (element.getAttribute("colspan") === "1") element.removeAttribute("colspan");
      if (element.getAttribute("rowspan") === "1") element.removeAttribute("rowspan");
    }
  }
  for (const group of content.querySelectorAll("colgroup")) group.remove();
  for (const pre of content.querySelectorAll("pre")) {
    for (const lineBreak of pre.querySelectorAll("br")) lineBreak.replaceWith("\n");
  }
  for (const span of content.querySelectorAll("span:not([style]):not([data-mention])"))
    span.replaceWith(...span.childNodes);
  content.normalize();
  return template.innerHTML;
}

/** Whether the document is empty, with no text, attachment, divider or table. */
export function $isDocumentEmpty() {
  const root = $getRoot();
  const visit = (node: LexicalNode): boolean => {
    if ($isDecoratorNode(node)) return false;
    if ($isTextNode(node)) return node.getTextContent().trim() === "";
    if ($isElementNode(node)) {
      if (node.getType() === "table" || node.getType() === "editor-table") return false;
      return node.getChildren().every(visit);
    }
    return true;
  };
  return visit(root);
}

/** A heading shortcut that makes only the headings the editor offers. */
function headingTransformer(headings: readonly HeadingTagType[]): ElementTransformer {
  return {
    ...HEADING,
    replace: (parent, children, match, isImport) => {
      const tag = `h${match[1]?.length ?? 1}` as HeadingTagType;
      if (!isImport && !headings.includes(tag)) return false;
      const node = headings.includes(tag) ? $createHeadingNode(tag) : $createParagraphNode();
      node.append(...children);
      parent.replace(node);
      if (!isImport) node.select(0, 0);
    },
  } as ElementTransformer;
}

/** Three dashes on a line make a divider, like Markdown's rule. */
const DIVIDER: MultilineElementTransformer = {
  type: "multiline-element",
  dependencies: [HorizontalRuleNode],
  regExpStart: /^-{3,}\s?$/,
  export: (node) => ($isHorizontalRuleNode(node) ? "---" : null),
  replace: (parent, _children, _start, _end, _lines, isImport) => {
    const rule = $createHorizontalRuleNode();
    parent.replace(rule);
    if (!isImport) {
      const paragraph = $createParagraphNode();
      rule.insertAfter(paragraph);
      paragraph.select();
    }
  },
};

/** The Markdown the editor reads, writes and turns into formatting as it is typed. @internal */
export function markdownTransformers(
  headings: readonly HeadingTagType[],
  checkLists = false,
): Transformer[] {
  return [
    ...(checkLists ? [CHECK_LIST] : []),
    ...TRANSFORMERS.map((transformer) =>
      transformer === HEADING ? headingTransformer(headings) : transformer,
    ),
    DIVIDER,
  ];
}

/** Parses HTML into a document, inertly, so nothing in it runs. */
export function parseHtml(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}

/**
 * The document's nodes from HTML, without the white space between its blocks, and with loose text
 * put in paragraphs, because the root takes only blocks.
 */
export function $nodesFromHtml(editor: LexicalEditor, html: string) {
  const nodes = $generateNodesFromDOM(editor, parseHtml(html || "<p></p>"));
  return nodes
    .filter(
      (node) =>
        !$isLineBreakNode(node) && !($isTextNode(node) && node.getTextContent().trim() === ""),
    )
    .map((node) =>
      $isTextNode(node) || ($isDecoratorNode(node) && node.isInline())
        ? $createParagraphNode().append(node)
        : node,
    );
}

/** Replaces the document with the value, in its format. */
export function $setValue(
  editor: LexicalEditor,
  value: string,
  format: EditorValueFormat,
  transformers: Transformer[],
) {
  const root = $getRoot();
  root.clear();
  if (format === "markdown") {
    $convertFromMarkdownString(value, transformers);
  } else if (typeof DOMParser !== "undefined") {
    const nodes = $nodesFromHtml(editor, value);
    if (nodes.length) root.append(...nodes);
  }
  if (root.getChildrenSize() === 0) root.append($createParagraphNode());
}

/** The document as its value, or nothing when it is empty, as an empty field submits. */
export function $getValue(
  editor: LexicalEditor,
  format: EditorValueFormat,
  transformers: Transformer[],
) {
  if ($isDocumentEmpty()) return "";
  if (format === "markdown") return $convertToMarkdownString(transformers);
  return cleanHtml($generateHtmlFromNodes(editor, null));
}

// Pasted content.

/**
 * Pasted HTML, made fit for the document before Lexical reads it.
 *
 * - Style sheets are dropped, after the paragraph spacing Word declares in them is copied onto its
 *   paragraphs.
 * - The browser's marker of a selection's last line break is removed.
 * - Placeholder links are unwrapped.
 * - Table cells lose their colours, so they take the theme.
 * - Word's and Outlook's paragraphs of bullets become lists again.
 * - Lists that other sources nest wrongly are put right.
 * - Gmail's emoji images become emoji.
 */
export function formatPastedHtml(doc: Document) {
  inlineParagraphSpacing(doc);
  for (const style of doc.querySelectorAll("style")) style.remove();
  for (const lineBreak of doc.querySelectorAll("br.Apple-interchange-newline"))
    if (atEndOfBody(doc, lineBreak)) lineBreak.remove();
  for (const anchor of doc.querySelectorAll("a")) {
    const href = anchor.getAttribute("href") ?? "";
    if (href === "" || href === "#") anchor.replaceWith(...anchor.childNodes);
  }
  for (const cell of doc.querySelectorAll<HTMLElement>("td, th")) {
    cell.style.removeProperty("background-color");
    cell.style.removeProperty("background");
    cell.style.removeProperty("color");
  }
  rebuildOfficeLists(doc);
  for (const list of doc.querySelectorAll("ol, ul")) {
    let wrapper = wrappedListChild(list);
    while (wrapper) {
      wrapper.replaceWith(...wrapper.childNodes);
      wrapper = wrappedListChild(list);
    }
  }
  for (const list of doc.querySelectorAll("ol, ul"))
    for (const child of [...list.children]) {
      if (child.tagName !== "OL" && child.tagName !== "UL") continue;
      const previous = child.previousElementSibling;
      if (previous?.tagName === "LI") previous.append(child);
    }
  for (const list of doc.querySelectorAll("ol, ul")) {
    let stray = strayListChild(list);
    while (stray) {
      if (stray instanceof Element && stray.querySelector("li"))
        stray.replaceWith(...stray.childNodes);
      else stray.remove();
      stray = strayListChild(list);
    }
  }
  for (const image of doc.querySelectorAll<HTMLImageElement>("img[data-emoji]")) {
    const emoji = image.dataset.emoji;
    if (emoji && emoji === image.alt) image.replaceWith(emoji);
  }
  return doc;
}

function atEndOfBody(doc: Document, node: Node) {
  for (
    let current: Node | null = node;
    current && current !== doc.body;
    current = current.parentNode
  )
    for (let sibling = current.nextSibling; sibling; sibling = sibling.nextSibling)
      if (
        !(
          sibling.nodeType === Node.COMMENT_NODE ||
          (sibling.nodeType === Node.TEXT_NODE && !sibling.textContent?.trim())
        )
      )
        return false;
  return true;
}

function wrappedListChild(list: Element) {
  for (const child of list.children)
    if (
      child.tagName !== "LI" &&
      child.tagName !== "OL" &&
      child.tagName !== "UL" &&
      child.querySelector("li")
    )
      return child;
  return null;
}

function strayListChild(list: Element) {
  for (const child of list.childNodes)
    if (child.nodeType !== Node.ELEMENT_NODE || (child as Element).tagName !== "LI")
      return child as ChildNode;
  return null;
}

/**
 * Word declares paragraph spacing in its style sheet, never inline. The spacing is therefore copied
 * onto each paragraph before the sheet goes, unless the matching rules disagree about it.
 */
function inlineParagraphSpacing(doc: Document) {
  const css = [...doc.querySelectorAll("style")].map((style) => style.textContent).join("\n");
  if (!css.trim() || typeof CSSStyleSheet === "undefined") return;
  const sheet = new CSSStyleSheet();
  try {
    sheet.replaceSync(css);
  } catch {
    return;
  }
  const rules = [...sheet.cssRules].filter(
    (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule,
  );
  for (const paragraph of doc.querySelectorAll<HTMLElement>("p"))
    for (const property of ["margin-top", "margin-bottom"]) {
      if (paragraph.style.getPropertyValue(property)) continue;
      const declared = new Set<string>();
      for (const rule of rules) {
        const value = rule.style.getPropertyValue(property);
        try {
          if (value && paragraph.matches(rule.selectorText)) declared.add(value);
        } catch {}
      }
      if (declared.size !== 1) continue;
      // Appended, not set through the style, so Word's own mso- declarations stay for the lists.
      const style = paragraph.getAttribute("style");
      const declaration = `${property}:${[...declared][0]}`;
      paragraph.setAttribute(
        "style",
        style?.trim() ? `${style.replace(/;\s*$/, "")};${declaration}` : declaration,
      );
    }
}

/**
 * Word and Outlook write a list as paragraphs. Each declares its depth in its style, and has its
 * bullet or number as text. Each run of them becomes a list, nested by the declared depths, from
 * the run's own shallowest depth.
 */
function rebuildOfficeLists(doc: Document) {
  const level = (element: Element) => {
    const match = /mso-list:[^;"']*\blevel(\d+)/.exec(element.getAttribute("style") ?? "");
    return match ? Number.parseInt(match[1] ?? "", 10) : null;
  };
  const ignorable = (node: Node) =>
    node.nodeType === Node.COMMENT_NODE ||
    (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim());
  const claimed = new Set<Element>();
  const runs: Element[][] = [];
  for (const paragraph of doc.querySelectorAll("p[style*='mso-list']")) {
    if (claimed.has(paragraph) || level(paragraph) === null) continue;
    const run: Element[] = [];
    let node: Element | null = paragraph;
    while (node) {
      run.push(node);
      claimed.add(node);
      let sibling: Node | null = node.nextSibling;
      while (sibling && ignorable(sibling)) sibling = sibling.nextSibling;
      node = sibling instanceof Element && level(sibling) !== null ? sibling : null;
    }
    runs.push(run);
  }
  for (const run of runs) {
    const levels = run.map((paragraph) => level(paragraph) ?? 1);
    // Found in one pass, because a long pasted list has more levels than a spread can pass as
    // arguments.
    const base = levels.reduce((lowest, each) => Math.min(lowest, each), Number.POSITIVE_INFINITY);
    const roots: Element[] = [];
    const stack: Element[] = [];
    run.forEach((paragraph, index) => {
      const depth = (levels[index] ?? base) - base + 1;
      const marker = paragraph.querySelector("[style*='mso-list:Ignore']")?.textContent ?? "";
      // A bare letter is Courier New's bullet. A counter has a stop or bracket after it.
      const tag = /\d/.test(marker) || /^\(?[A-Za-z]+[.)]/.test(marker) ? "OL" : "UL";
      while (stack.length > depth) stack.pop();
      if (stack.length === depth && stack[depth - 1]?.tagName !== tag) stack.pop();
      while (stack.length < depth) {
        const list = doc.createElement(tag);
        const parent = stack.at(-1);
        if (!parent) roots.push(list);
        else {
          if (!parent.lastElementChild) parent.append(doc.createElement("li"));
          parent.lastElementChild?.append(list);
        }
        stack.push(list);
      }
      for (const ignored of paragraph.querySelectorAll("[style*='mso-list:Ignore']"))
        ignored.remove();
      const item = doc.createElement("li");
      item.append(...paragraph.childNodes);
      stack.at(-1)?.append(item);
    });
    run[0]?.replaceWith(...roots);
    for (const paragraph of run.slice(1)) paragraph.remove();
  }
}

/**
 * Pasted plain text as Markdown, read by a Marked of its own. Line breaks are kept. Indented lines
 * are not taken as code, because nobody indents a note to mean code. A tag that names no element,
 * such as a subtitle's speaker, is kept as text.
 */
const pasteMarked = new Marked({
  breaks: true,
  renderer: {
    html: ({ text }: Tokens.HTML | Tokens.Tag) =>
      text.replace(
        /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g,
        (lexeme, _slash, name: string) =>
          knownElement(name)
            ? lexeme
            : lexeme.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
      ),
  },
}).use({ tokenizer: { code: () => undefined } });

function knownElement(name: string) {
  const tag = name.toLowerCase();
  return !tag.includes("-") && !(document.createElement(tag) instanceof HTMLUnknownElement);
}

export function pastedMarkdownToHtml(text: string) {
  return pasteMarked.parse(text, { async: false }) as string;
}

/**
 * Whether Markdown made only one paragraph of the text. If so, the text is pasted as it was, with
 * its runs of spaces and backslashes kept, as in a Windows path.
 */
export function isPlainParagraph(doc: Document) {
  const elements = [...doc.body.children];
  if (elements.length !== 1) return false;
  const [paragraph] = elements;
  return (
    paragraph?.nodeName === "P" &&
    [...paragraph.childNodes].every(
      (node) => node.nodeType === Node.TEXT_NODE || node.nodeName === "BR",
    )
  );
}

/** Puts a blank paragraph between pasted blocks, except after headings, for `addBlockSpacing`. */
export function addBlockSpacing(doc: Document) {
  const selector =
    "body > :not(h1, h2, h3, h4, h5, h6) + *, blockquote > :not(h1, h2, h3, h4, h5, h6) + *";
  for (const block of doc.querySelectorAll(selector)) {
    const spacer = doc.createElement("p");
    spacer.append(doc.createElement("br"));
    block.before(spacer);
  }
}

/** Whether text is a single web address, as a link pasted alone is. Other schemes stay text. */
export function isAutolinkableUrl(text: string) {
  return /^(?:https?:\/\/|www\.)[^\s]+$/i.test(text);
}

/** Whether the node is inside a code block. @internal */
export function $inCodeBlock(node: LexicalNode | null) {
  for (let current = node; current; current = current.getParent())
    if ($isCodeNode(current)) return true;
  return false;
}

// The source, set out to read.

/**
 * HTML set out to read, as the source shows it. The editor writes it all on one line, so each block
 * goes on a line of its own, indented by how deep it sits, such as a list's items inside the list.
 * The content of a block of text, which is its words and inline markup such as `<strong>` and
 * links, is kept as written, on the block's line. A `<pre>` keeps its lines as they are.
 */
export function formatHtml(html: string, indent = "  "): string {
  type Element = { tag: string; open: string; close: string; children: Node[] };
  type Node = Element | string;
  const root: Element = { tag: "", open: "", close: "", children: [] };
  const stack = [root];
  for (const [token, closing, name] of html.matchAll(
    /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)(?:"[^"]*"|'[^']*'|[^'">])*>|[^<]+|</g,
  )) {
    const top = stack[stack.length - 1] ?? root;
    if (!name) {
      top.children.push(token);
      continue;
    }
    const tag = name.toLowerCase();
    if (closing) {
      // An end tag closes the nearest element of its name, and any elements left open inside it.
      let open = stack.length - 1;
      while (open > 0 && stack[open]?.tag !== tag) open--;
      const element = stack[open];
      if (open > 0 && element) {
        element.close = token;
        stack.length = open;
      }
      continue;
    }
    const element: Element = { tag, open: token, close: "", children: [] };
    top.children.push(element);
    if (!SOURCE_VOIDS.has(tag) && !token.endsWith("/>")) stack.push(element);
  }

  const isBlock = (node: Node): node is Element =>
    typeof node !== "string" && SOURCE_BLOCKS.has(node.tag);
  const inline = (node: Node): string =>
    typeof node === "string" ? node : node.open + node.children.map(inline).join("") + node.close;
  const lines: string[] = [];
  const write = (nodes: readonly Node[], depth: number) => {
    const pad = indent.repeat(depth);
    let run = "";
    // Words between blocks, if any, take a line of their own. Space between blocks is dropped.
    const flush = () => {
      const text = run.trim();
      if (text) lines.push(pad + text);
      run = "";
    };
    for (const node of nodes) {
      if (!isBlock(node)) {
        run += inline(node);
        continue;
      }
      flush();
      if (node.tag === "pre" || !node.children.some(isBlock)) lines.push(pad + inline(node));
      else {
        lines.push(pad + node.open);
        write(node.children, depth + 1);
        if (node.close) lines.push(pad + node.close);
      }
    }
    flush();
  };
  write(root.children, 0);
  return lines.join("\n");
}

/** Elements that take a line of their own in the source. */
const SOURCE_BLOCKS = new Set([
  "address",
  "article",
  "aside",
  "audio",
  "blockquote",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
  "video",
]);

/** Elements that have no end tag. */
const SOURCE_VOIDS = new Set([
  "area",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "source",
  "track",
  "wbr",
]);
