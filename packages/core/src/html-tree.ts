// Reads HTML without a browser, so a document can be shown on the server. A small tokenizer builds
// a tree of the elements a document may contain, with the attributes each may have, and drops the
// rest. Nothing it keeps can run. It keeps no script, style or frame, no event handler, and no
// address whose scheme is not for a web page, an email or a phone number.

/** An element of the tree, or its text. */
export type HtmlNode =
  | { type: "text"; text: string }
  | { type: "element"; tag: string; attributes: Record<string, string>; children: HtmlNode[] };
/** An element of the tree. */
type HtmlElement = HtmlNode & { type: "element" };

/** Elements dropped with all their content, because their content is not part of the document. */
const dropped = new Set([
  "script",
  "style",
  "template",
  "iframe",
  "object",
  "embed",
  "noscript",
  "title",
  "head",
  "svg",
  "math",
  "textarea",
  "select",
  "button",
  "form",
  "input",
]);

/** Elements with no end. */
const voids = new Set(["br", "hr", "img", "col", "source", "wbr", "input", "meta", "link"]);

/**
 * Elements whose children are only other elements. HTML never draws text between a table's rows
 * and cells, and React warns about any it is given there. The tree leaves out the line breaks that
 * Markdown and indented HTML put between them. Other text there stays where it is, instead of
 * being moved before the table, as a browser moves it.
 */
const tableParts = new Set(["table", "thead", "tbody", "tfoot", "tr", "colgroup"]);

/** Elements that end where the next of their kind starts, and the elements that contain them. */
const scopes: Record<string, readonly string[]> = {
  li: ["ul", "ol"],
  tr: ["table", "thead", "tbody", "tfoot"],
  td: ["tr"],
  th: ["tr"],
};

const shared = ["title"];
/** The elements kept, each with the attributes it may have. */
const allowed: Record<string, string[]> = {
  p: [],
  br: [],
  hr: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  strong: [],
  b: [],
  em: [],
  i: [],
  u: [],
  s: [],
  del: [],
  strike: [],
  code: ["data-language"],
  pre: ["data-language", "language"],
  blockquote: [],
  ul: ["data-checklist"],
  ol: ["start"],
  li: ["value", "aria-checked"],
  a: ["href"],
  table: [],
  thead: [],
  tbody: [],
  tfoot: [],
  tr: [],
  th: ["colspan", "rowspan", "scope", "align"],
  td: ["colspan", "rowspan", "align"],
  caption: [],
  figure: [
    "data-attachment",
    "data-content-type",
    "data-filename",
    "data-filesize",
    "data-id",
    "data-embed",
  ],
  figcaption: [],
  img: ["src", "alt", "width", "height"],
  video: ["src", "width", "height", "poster"],
  source: ["src", "type"],
  span: ["style", "data-mention", "data-value"],
  mark: ["style"],
  sub: [],
  sup: [],
  div: ["data-gallery"],
  small: [],
  abbr: [],
  dl: [],
  dt: [],
  dd: [],
};

/** The schemes an address may have, once the browser has read it. */
const schemes = new Set(["http:", "https:", "mailto:", "tel:"]);
/** Images as data, in the formats that cannot contain a script, as SVG can. */
const imageData = /^data:image\/(?:png|gif|jpe?g|webp|avif)[;,]/i;
/** Data a file may be written as, other than markup and scripts, which could run. */
const fileData =
  /^data:(?!(?:text\/(?:html|xml|javascript)|application\/(?:xhtml\+xml|xml|javascript)|image\/svg\+xml)[;,])[\w.+-]+\/[\w.+-]+[;,]/i;

/** An address without the characters a browser drops as it reads one, so both read it the same. */
function asRead(value: string) {
  // Tabs and line breaks anywhere, and control characters and spaces at either end.
  const text = value.replace(/[\t\n\r]/g, "");
  let start = 0;
  let end = text.length;
  while (start < end && text.charCodeAt(start) <= 0x20) start++;
  while (end > start && text.charCodeAt(end - 1) <= 0x20) end--;
  return text.slice(start, end);
}

/**
 * An address made safe to follow or to load, or null where it is not safe. It is read as the
 * browser reads it, so `java&#9;script:` is seen for what it is. Its scheme must be for a web page,
 * an email or a phone number. An image may also be data in a format that cannot run, or a file in
 * the page. A file may also be data of any type except markup and scripts.
 */
export function safeAddress(value: string, { allow }: { allow?: "image" | "file" } = {}) {
  const address = asRead(value);
  if (allow && /^blob:/i.test(address)) return address;
  if (allow === "image" && imageData.test(address)) return address;
  if (allow === "file" && (imageData.test(address) || fileData.test(address))) return address;
  try {
    return schemes.has(new URL(address, "https://x-govuk-ui.invalid/").protocol) ? address : null;
  } catch {
    return null;
  }
}

/** Only the colours of a style are kept, and only as plain colour values. */
function safeStyle(style: string) {
  const kept: string[] = [];
  for (const declaration of style.split(";")) {
    const [property = "", ...rest] = declaration.split(":");
    const name = property.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (
      (name === "color" || name === "background-color") &&
      /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|hsl)a?\([\d\s.,%/]+\))$/i.test(value)
    )
      kept.push(`${name}: ${value}`);
  }
  return kept.join("; ");
}

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  copy: "©",
  pound: "£",
  euro: "€",
  middot: "·",
  bull: "•",
  times: "×",
};

/** Text with its character references read, as the browser reads them. */
function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code =
        name[1]?.toLowerCase() === "x"
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : whole;
    }
    return entities[name.toLowerCase()] ?? whole;
  });
}

/** An element's attributes, read from its start tag. */
function readAttributes(source: string) {
  const attributes: Record<string, string> = {};
  for (const match of source.matchAll(
    /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
  )) {
    const name = (match[1] ?? "").toLowerCase();
    attributes[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

/** The attributes an element may keep, with its addresses and style made safe. */
function keep(tag: string, attributes: Record<string, string>) {
  const kept: Record<string, string> = {};
  for (const name of [...(allowed[tag] ?? []), ...shared]) {
    const value = attributes[name];
    if (value === undefined) continue;
    if (name === "href" || name === "src" || name === "poster") {
      const address = safeAddress(value, name === "href" ? {} : { allow: "image" });
      if (address !== null) kept[name] = address;
      continue;
    }
    if (name === "style") {
      const style = safeStyle(value);
      if (style) kept.style = style;
      continue;
    }
    kept[name] = value;
  }
  // Markdown names a code block's language in its code's class.
  const language = tag === "code" && /\blanguage-([\w+#-]+)/.exec(attributes.class ?? "")?.[1];
  if (language) kept["data-language"] = language;
  // A column's alignment is one of three words, and no other.
  if (kept.align && !/^(left|center|right)$/.test(kept.align)) delete kept.align;
  // Trix and Lexxy give a gallery a class that marks it as one.
  if (tag === "div" && /\battachment-gallery\b/.test(attributes.class ?? ""))
    kept["data-gallery"] = "";
  return kept;
}

/**
 * HTML as a tree of the elements a document may contain. An element it does not keep leaves its
 * text in the tree. The exceptions are elements whose content is not part of the document, which
 * are dropped whole.
 */
export function parseHtmlTree(html: string): HtmlNode[] {
  const root: HtmlElement = { type: "element", tag: "", attributes: {}, children: [] };
  // Each open element, and whether it is kept. Text inside a dropped one is skipped.
  const stack: { node: HtmlElement; tag: string; kept: boolean; dropping: boolean }[] = [
    { node: root, tag: "", kept: true, dropping: false },
  ];
  const top = () => stack[stack.length - 1]!;
  const lastIndex = (test: (entry: (typeof stack)[number]) => boolean) => {
    for (let index = stack.length - 1; index >= 0; index--) if (test(stack[index]!)) return index;
    return -1;
  };
  const parent = () => {
    for (let index = stack.length - 1; index >= 0; index--)
      if (stack[index]?.kept) return stack[index]!.node;
    return root;
  };
  const pattern =
    /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\?[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|[^<]+|</g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: The tokenizer reads one token a turn.
  while ((match = pattern.exec(html))) {
    const [whole, closing, name, rest] = match;
    if (name === undefined) {
      if (whole.startsWith("<!") || whole.startsWith("<?")) continue;
      if (top().dropping) continue;
      const text = decodeEntities(whole);
      const into = parent();
      // HTML's whitespace is these five characters, so a no-break space between cells is kept.
      if (!text || (tableParts.has(into.tag) && /^[\t\n\f\r ]*$/.test(text))) continue;
      into.children.push({ type: "text", text });
      continue;
    }
    const tag = name.toLowerCase();
    if (closing) {
      const index = lastIndex((entry) => entry.tag === tag);
      if (index > 0) stack.length = index;
      continue;
    }
    if (top().dropping) {
      if (!voids.has(tag) && !rest?.trim().endsWith("/"))
        stack.push({ node: parent(), tag, kept: false, dropping: true });
      continue;
    }
    // A paragraph ends where a block starts, and a list item, cell or row where the next does.
    if (/^(p|div|h[1-6]|ul|ol|table|blockquote|pre|figure|hr)$/.test(tag)) {
      const open = lastIndex((entry) => entry.tag === "p");
      if (open > 0) stack.length = open;
    }
    const scope = scopes[tag];
    if (scope) {
      const open = lastIndex((entry) => entry.tag === tag || scope.includes(entry.tag));
      if (open > 0 && stack[open]?.tag === tag) stack.length = open;
    }
    if (dropped.has(tag)) {
      if (!voids.has(tag)) stack.push({ node: parent(), tag, kept: false, dropping: true });
      continue;
    }
    const kept = tag in allowed;
    const element: HtmlElement = {
      type: "element",
      tag,
      attributes: kept ? keep(tag, readAttributes(rest ?? "")) : {},
      children: [],
    };
    if (kept) parent().children.push(element);
    if (!voids.has(tag) && !rest?.trim().endsWith("/"))
      stack.push({ node: element, tag, kept, dropping: false });
  }
  return root.children;
}

/** The text of a tree, as its reader would read it. */
export function treeText(nodes: HtmlNode[]): string {
  return nodes.map((node) => (node.type === "text" ? node.text : treeText(node.children))).join("");
}

/** Builds the tree as DOM nodes, for a browser to put in a page or to write out. */
export function treeToDom(nodes: HtmlNode[], doc: Document): Node[] {
  return nodes.map((node) => {
    if (node.type === "text") return doc.createTextNode(node.text);
    const element = doc.createElement(node.tag);
    for (const [name, value] of Object.entries(node.attributes)) element.setAttribute(name, value);
    element.append(...treeToDom(node.children, doc));
    return element;
  });
}
