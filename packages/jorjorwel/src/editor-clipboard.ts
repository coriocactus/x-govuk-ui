import { $insertDataTransferForRichText } from "@lexical/clipboard";
import { $generateNodesFromDOM } from "@lexical/html";
import { $createLinkNode, $isLinkNode, $toggleLink } from "@lexical/link";
import { mergeRegister } from "@lexical/utils";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $onUpdate,
  $setSelection,
  COMMAND_PRIORITY_NORMAL,
  type LexicalEditor,
  type LexicalNode,
  PASTE_COMMAND,
  PASTE_TAG,
  SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from "lexical";
import { EmbedNode } from "./editor-attachments";
import { $insertAtCursor } from "./editor-commands";
import type { EditorLinkPaste, EditorMarkdownPaste } from "./editor-context";
import {
  $inCodeBlock,
  addBlockSpacing,
  formatPastedHtml,
  isAutolinkableUrl,
  isPlainParagraph,
  parseHtml,
  pastedMarkdownToHtml,
} from "./editor-html";

type ClipboardOptions = {
  markdown: boolean;
  attachments: boolean;
  /** Stores files and puts them at the caret, with a description for an image copied alone. */
  upload: (files: File[], altText?: string) => void;
  onLinkPaste: (paste: EditorLinkPaste) => void;
  onMarkdownPaste: (paste: EditorMarkdownPaste) => void;
};

/**
 * Pasting, after Lexxy's. Into code, anything goes in as plain text. A web address alone goes in as
 * a link, or as the link of the selected words. Plain text is read as Markdown, unless it is only a
 * paragraph. HTML from another page or from Word is cleaned up first. Files go in as attachments.
 */
export function registerClipboard(editor: LexicalEditor, options: ClipboardOptions) {
  const linkPasted = (key: string, url: string) =>
    options.onLinkPaste({
      url,
      replaceWith: (html, { attachment = false } = {}) =>
        editor.update(() => {
          const node = $getNodeByKey(key);
          if (!node) return;
          const selection = $getSelection();
          const selected =
            $isRangeSelection(selection) &&
            selection.getNodes().some((each) => each.is(node) || each.getParent()?.is(node));
          if (selected) $setSelection(null);
          const replacement = $htmlNode(editor, html, attachment);
          node.replace(replacement);
          if (selected) replacement.selectEnd();
        }),
      insertBelow: (html, { attachment = false } = {}) =>
        editor.update(() => {
          const node = $getNodeByKey(key);
          if (!node) return;
          (node.getTopLevelElement() ?? node).insertAfter($htmlNode(editor, html, attachment));
        }),
    });

  const pasteUrl = (url: string) => {
    let key: string | null = null;
    // An address that starts www. is a web page's address, as the browser would read it, not a
    // path.
    const href = /^www\./i.test(url) ? `https://${url}` : url;
    editor.update(
      () => {
        key = $linkSelection(href, url);
      },
      { tag: PASTE_TAG },
    );
    if (key) linkPasted(key, href);
  };

  const pasteText = (text: string) =>
    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        text.split(/\r\n|\r|\n/).forEach((line, index) => {
          if (index > 0) paragraph.append($createLineBreakNode());
          paragraph.append($createTextNode(line));
        });
        $insertAtCursor([paragraph]);
      },
      { tag: PASTE_TAG },
    );

  const pasteDocument = (doc: Document) =>
    editor.update(
      () => {
        formatPastedHtml(doc);
        // As its nodes read the HTML, they leave out what the editor does not take, such as
        // attachments without onUpload. Loose text stays loose, to join the line it goes into.
        const nodes = $generateNodesFromDOM(editor, doc);
        const selection = $getSelection();
        const handled =
          selection !== null &&
          editor.dispatchCommand(SELECTION_INSERT_CLIPBOARD_NODES_COMMAND, { nodes, selection });
        if (!handled) $insertAtCursor(nodes);
      },
      { tag: PASTE_TAG },
    );

  const pasteMarkdown = (text: string) => {
    const doc = parseHtml(pastedMarkdownToHtml(text));
    if (isPlainParagraph(doc)) return pasteText(text);
    options.onMarkdownPaste({
      markdown: text,
      document: doc,
      addBlockSpacing: () => addBlockSpacing(doc),
    });
    pasteDocument(doc);
  };

  /** Keeps the page where it is, as Safari scrolls to the top after a pasted attachment. */
  const uploadKeepingScroll = (files: File[], altText?: string) => {
    const { scrollX, scrollY } = window;
    options.upload(files, altText);
    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
      editor.focus();
    });
  };

  return mergeRegister(
    editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const data = (event as ClipboardEvent).clipboardData;
        if (!data) return false;
        const types = [...data.types];
        const lexical = types.includes("application/x-lexical-editor");
        const inCode = editor.read(() => {
          const selection = $getSelection();
          return $isRangeSelection(selection) && $inCodeBlock(selection.anchor.getNode());
        });
        if (inCode) {
          event.preventDefault();
          const text = data.getData("text/plain");
          if (text)
            editor.update(
              () => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) selection.insertRawText(text);
              },
              { tag: PASTE_TAG },
            );
          return true;
        }
        const plainOnly = types.length === 1 && types[0] === "text/plain";
        if (plainOnly || isUrlOnly(data, lexical)) {
          event.preventDefault();
          const text = data.getData("text/plain") || data.getData("text/uri-list");
          const url = text.trim();
          if (isAutolinkableUrl(url)) pasteUrl(url);
          else if (options.markdown) pasteMarkdown(text);
          else
            editor.update(
              () => $insertDataTransferForRichText(data, $getSelection() as never, editor),
              {
                tag: PASTE_TAG,
              },
            );
          return true;
        }
        const html = data.getData("text/html");
        const files = [...data.files];
        // An image copied from a page comes as its file and its HTML, and the file is stored.
        const image = options.attachments && files.length ? copiedImage(html) : null;
        if (image) {
          event.preventDefault();
          uploadKeepingScroll(files, image.getAttribute("alt") ?? undefined);
          return true;
        }
        // HTML is cleaned up whether or not the editor takes attachments, because most HTML pasted
        // from Word, Outlook and Gmail has no attachments.
        if (html && !lexical) {
          event.preventDefault();
          pasteDocument(parseHtml(html));
          return true;
        }
        if (!options.attachments) return false;
        if (files.length) {
          event.preventDefault();
          uploadKeepingScroll(files);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL,
    ),
    // A link copied alone, such as from a page, goes in as a link to its address, with the address
    // as its text. It tells the page, as a link typed as text does.
    editor.registerCommand(
      SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
      ({ nodes, selection }) => {
        const url = bareUrl(nodes);
        if (!url || !$isRangeSelection(selection)) return false;
        const key = $linkSelection(url, url, selection);
        if (key) $onUpdate(() => linkPasted(key, url));
        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    ),
  );
}

/**
 * Links the selected words to an address. With nothing selected, it puts the address in as a link,
 * with `text` as its words. Returns the new link's key, or nothing where words were linked or there
 * was no selection.
 */
function $linkSelection(href: string, text: string, selection = $getSelection()) {
  if (!$isRangeSelection(selection)) return null;
  if (!selection.isCollapsed()) {
    $toggleLink(null);
    $toggleLink(href);
    return null;
  }
  const link = $createLinkNode(href).append($createTextNode(text));
  $insertAtCursor([link]);
  return link.getKey();
}

/** HTML from the page itself, as nodes, or whole as an embed that cannot be edited. */
function $htmlNode(editor: LexicalEditor, html: string, attachment: boolean): LexicalNode {
  if (attachment) return new EmbedNode(html);
  const [first] = $generateNodesFromDOM(editor, parseHtml(html));
  return first ?? $createParagraphNode();
}

/**
 * Whether what was copied is a web address alone, in whichever form the browser gives it. That may
 * be a URI list, plain text, or HTML that is only a link to it.
 */
function isUrlOnly(data: DataTransfer, lexical: boolean) {
  if (lexical) return false;
  const types = [...data.types];
  if (types.includes("text/uri-list"))
    return types.every((type) => type === "text/plain" || type === "text/uri-list");
  if (data.files.length) return false;
  const text = data.getData("text/plain").trim();
  if (!isAutolinkableUrl(text)) return false;
  const html = data.getData("text/html");
  if (!html) return true;
  const doc = parseHtml(html);
  if (doc.body.textContent?.trim() !== text) return false;
  const links = doc.body.querySelectorAll("a");
  return links.length === 0 || (links.length === 1 && links[0]?.getAttribute("href") === text);
}

function copiedImage(html: string) {
  if (!html) return null;
  const children = [...parseHtml(html).body.children];
  return children.length === 1 && children[0]?.tagName === "IMG" ? children[0] : null;
}

/** The address of a link pasted alone whose text is its address. */
function bareUrl(nodes: LexicalNode[]) {
  if (nodes.length !== 1) return null;
  let node: LexicalNode | undefined = nodes[0];
  if ($isParagraphNode(node)) {
    const children = node.getChildren();
    node = children.length === 1 ? children[0] : undefined;
  }
  if (!$isLinkNode(node)) return null;
  const url = node.getURL();
  return url && node.getTextContent() === url ? url : null;
}
