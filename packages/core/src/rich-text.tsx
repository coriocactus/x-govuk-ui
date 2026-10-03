import { Marked } from "marked";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  createElement,
  type ReactNode,
} from "react";
import { codeTokens } from "./code-tokens";
import { type HtmlNode, parseHtmlTree, treeText } from "./html-tree";

// A document drawn as React elements, from HTML or Markdown, so it renders on the server and costs
// nothing in the browser. It can be an assistant's reply, a page's content, or a document from an
// Editor.

const markdown = new Marked({ gfm: true });

/** A style attribute as React takes one, such as `background-color` as `backgroundColor`. */
function styleObject(style: string): CSSProperties {
  const result: Record<string, string> = {};
  for (const declaration of style.split(";")) {
    const [property = "", ...rest] = declaration.split(":");
    const name = property.trim().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    if (name) result[name] = rest.join(":").trim();
  }
  return result as CSSProperties;
}

/** An attribute's name as React takes it. */
const reactNames: Record<string, string> = { colspan: "colSpan", rowspan: "rowSpan" };

/** Elements with no end, which React takes no children for. */
const voids = new Set(["br", "hr", "img", "source", "col"]);

/** Code, coloured by its syntax as Code block colours it, in the language its block names. */
function colouredCode(code: string, language: string | undefined) {
  let at = 0;
  return codeTokens(code, language).map(([kind, text]) => {
    // Each run is keyed by where it starts in the code.
    const key = at;
    at += text.length;
    return kind ? (
      <span key={key} className={`x-govuk-ui-code-${kind}`}>
        {text}
      </span>
    ) : (
      text
    );
  });
}

/** The elements of a document that a Rich text can draw with parts of a service's choosing. */
export type RichTextElement =
  | "a"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "ul"
  | "ol"
  | "li"
  | "blockquote"
  | "pre"
  | "code"
  | "hr"
  | "table"
  | "thead"
  | "tbody"
  | "tr"
  | "th"
  | "td"
  | "img"
  | "figure"
  | "figcaption";

/** What a part that draws an element of the document is given. */
export type RichTextPartProps = {
  /**
   * The element's attributes, as the document gave them and the reader kept them, such as a
   * link's `href`, a code block's `data-language` or a column's `align`.
   */
  attributes: Readonly<Record<string, string>>;
  /** The element's content, already drawn. A rule or an image has no content. */
  children?: ReactNode;
  /** The element's text, such as a code block's code, without its last line break. */
  text: string;
};

/** Parts to draw elements of the document with, each keyed by the element it draws. */
export type RichTextComponents = Partial<
  Record<RichTextElement, (props: RichTextPartProps) => ReactNode>
>;

/** How a tree is drawn, with parts in place of some elements, and its headings moved down. */
type DrawOptions = { components?: RichTextComponents; headingOffset?: number };

/** A heading's tag once moved down the page's outline by the offset, stopping at h6. */
function headingAt(tag: string, offset = 0) {
  const level = /^h([1-6])$/.exec(tag)?.[1];
  return level && offset ? `h${Math.min(6, Number(level) + offset)}` : tag;
}

/** The language a code block names, on itself, or on its code, as Markdown writes it. */
function languageOf({ attributes, children }: HtmlNode & { type: "element" }) {
  const code = children.find((child) => child.type === "element" && child.tag === "code");
  return (
    attributes["data-language"] ??
    attributes.language ??
    (code?.type === "element" ? code.attributes["data-language"] : undefined)
  );
}

/** Draws one node of the tree, keyed by its place among its siblings. */
function draw(node: HtmlNode, key: string, options: DrawOptions): ReactNode {
  if (node.type === "text") return node.text;
  const { attributes, children } = node;
  const tag = headingAt(node.tag, options.headingOffset);
  const part = options.components?.[tag as RichTextElement];
  if (part) {
    let partProps: RichTextPartProps = { attributes, text: treeText(children) };
    if (tag === "pre")
      partProps = {
        attributes: { ...attributes, "data-language": languageOf(node) ?? "" },
        text: partProps.text.replace(/\n$/, ""),
      };
    return createElement(
      part,
      { key, ...partProps },
      ...(voids.has(tag) ? [] : renderTree(children, options)),
    );
  }
  const props: Record<string, unknown> = { key };
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "style") props.style = styleObject(value);
    else if (name === "aria-checked") props["data-checked"] = value;
    else if (name !== "align") props[reactNames[name] ?? name] = value;
  }
  // A column's alignment, as Markdown gives it, overrules the table's own.
  if (attributes.align)
    props.style = { ...(props.style as CSSProperties), textAlign: attributes.align };
  if (tag === "pre") {
    const language = languageOf(node);
    return (
      <pre key={key} data-language={language}>
        <code>{colouredCode(treeText(children).replace(/\n$/, ""), language)}</code>
      </pre>
    );
  }
  if (tag === "table")
    return (
      <div key={key} className="x-govuk-ui-rich-text-table">
        {createElement("table", null, renderTree(children, options))}
      </div>
    );
  if (tag === "div" && "data-gallery" in attributes)
    props["data-count"] = children.filter((child) => child.type === "element").length;
  if (tag === "video") props.controls = true;
  if (tag === "img") props.loading = "lazy";
  if (tag === "code") delete props["data-language"];
  return createElement(tag, props, voids.has(tag) ? undefined : renderTree(children, options));
}

/** Draws a tree of HTML as React elements, as Rich text does. @internal */
export function renderTree(nodes: HtmlNode[], options: DrawOptions = {}): ReactNode[] {
  // The tree is drawn once, from the document, so a node's place among its siblings is its key.
  return nodes.map((node, place) => draw(node, `${place}`, options));
}

export type RichTextProps = ComponentPropsWithRef<"div"> & {
  /** The document as HTML, as an Editor writes it. */
  html?: string;
  /** The document as Markdown, such as an assistant's reply, in place of HTML. */
  markdown?: string;
  /**
   * Parts to draw elements with in place of the plain ones, such as Link for a link, Code block
   * for code, Table's parts for a table, or Inline citation for a reply's source.
   */
  components?: RichTextComponents;
  /**
   * How many levels below its own the document's headings sit in the page, so a reply's top
   * heading does not compete with the page's. Each stops at h6.
   */
  headingOffset?: number;
};

/**
 * A document drawn as React elements, from HTML or from Markdown, so it renders on the server and
 * brings no editor to the browser. It can be an assistant's reply, a page's content from Markdown,
 * or a document written in the Editor.
 *
 * It is set in Prose, with GOV.UK's body text, headings, lists and links. Code is coloured by its
 * syntax, tables scroll across, and images keep their captions. It also draws galleries and
 * mentions. Only what a document may contain is drawn. It draws no script, frame or style except
 * colour, and no link that is not to a web page, an email address or a phone number. `components`
 * draws chosen elements with parts, so a reply's links, code and tables can be the library's own.
 */
export function RichText({
  html,
  markdown: source,
  components,
  headingOffset,
  className = "",
  ...props
}: RichTextProps) {
  const document = html ?? (source ? (markdown.parse(source, { async: false }) as string) : "");
  return (
    <div {...props} className={`x-govuk-ui-rich-text x-govuk-ui-prose ${className}`.trim()}>
      {renderTree(parseHtmlTree(document), { components, headingOffset })}
    </div>
  );
}
