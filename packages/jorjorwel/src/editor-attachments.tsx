"use client";
import { $getNearestNodeOfType, $wrapNodeInElement } from "@lexical/utils";
import {
  $createParagraphNode,
  $getEditor,
  $getNearestRootOrShadowRoot,
  $hasUpdateTag,
  $splitNode,
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  ElementNode,
  type LexicalNode,
  type NodeKey,
  PASTE_TAG,
  type RangeSelection,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { ReactNode } from "react";
import { parseHtmlTree, safeAddress, treeText, treeToDom } from "x-govuk-ui/internal";
import { AttachmentFigure, EmbedFigure } from "./editor-attachment-figure";
import {
  type AttachmentData,
  attachmentKind,
  attachmentState,
  beginUpload,
  blank,
  isImageType,
  number,
  permits,
} from "./editor-attachment-state";
import { $makeSafeForRoot } from "./editor-commands";

// Attachments, after Lexxy's. These are images, video and files, stored as they go in, with a
// caption and a description, and galleries of images side by side. This file contains their
// nodes. What they are, and what each editor keeps of them, is in editor-attachment-state.ts.
//
// - editor-attachment-figure.tsx draws them.
// - editor-uploads.tsx stores them.
// - editor-attachment-behaviour.ts sets their behaviour.
// - editor-attachment-tools.tsx has their tools.

/** A node that waits for a file to be stored, and shows it meanwhile. @internal */
export function $createUploadNode(file: File) {
  const editor = $getEditor();
  const state = attachmentState(editor);
  const key = `upload-${Math.random().toString(36).slice(2, 10)}`;
  beginUpload(state, key, file);
  return new AttachmentNode({
    contentType: file.type,
    fileName: file.name,
    fileSize: file.size,
    upload: key,
  });
}

// The nodes.

/** An attachment as Lexical's JSON stores it. */
type SerializedAttachmentNode = Spread<AttachmentData, SerializedLexicalNode>;

/**
 * An attachment's addresses made safe, as they go into the document from HTML or JSON. It is null
 * where its file's address is not a safe address, as `javascript:` is not. Its preview must be the
 * page's own.
 @internal
 */
export function safeData<T extends Partial<AttachmentData>>(data: T): T | null {
  const src = data.src ? safeAddress(data.src, { allow: "file" }) : data.src;
  if (src === null) return null;
  const preview = data.preview ? safeAddress(data.preview, { allow: "image" }) : data.preview;
  return { ...data, src, preview };
}

function $attachmentFrom(given: Partial<AttachmentData>): DOMConversionOutput {
  const state = attachmentState($getEditor());
  const data = safeData(given);
  if (!data) return { node: null };
  const contentType = data.contentType || "application/octet-stream";
  if (!permits(state, contentType)) return { node: null };
  // An image pasted as data, as Google Docs gives one, is stored, instead of being written into the
  // document whole.
  if ($hasUpdateTag(PASTE_TAG) && /^data:image\/[^,]*;base64,/i.test(data.src ?? "")) {
    const file = fileFromData(data.src ?? "");
    if (file && state.accept(file)) return { node: $createUploadNode(file) };
    return { node: null };
  }
  return { node: new AttachmentNode({ ...data, contentType }) };
}

function fileFromData(uri: string) {
  try {
    const [header = "", body = ""] = uri.split(",");
    const type = /^data:(image\/[A-Za-z0-9][A-Za-z0-9!#$&\-^_.+]*)/.exec(header)?.[1];
    if (!type) return null;
    const bytes = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
    return new File([bytes], `pasted-image-${Date.now()}.${type.split("/")[1] ?? "png"}`, { type });
  } catch {
    return null;
  }
}

/**
 * An attachment in the document, which is an image, a video or a file, drawn by `AttachmentFigure`.
 * It stands as a block of its own, or inline in a gallery. @internal
 */
export class AttachmentNode extends DecoratorNode<ReactNode> {
  __data: AttachmentData;

  static getType() {
    return "attachment";
  }

  static clone(node: AttachmentNode) {
    return new AttachmentNode(node.__data, node.__key);
  }

  static importJSON(json: SerializedAttachmentNode) {
    const { type: _type, version: _version, ...given } = json;
    return new AttachmentNode(safeData(given) ?? { ...given, src: "", preview: null });
  }

  exportJSON(): SerializedAttachmentNode {
    return { ...this.__data, type: "attachment", version: 1 };
  }

  constructor(data: Partial<AttachmentData> = {}, key?: NodeKey) {
    super(key);
    this.__data = { ...blank, ...data };
  }

  static importDOM(): DOMConversionMap {
    return {
      figure: (element: HTMLElement) => {
        const media = element.querySelector("img, video");
        if (!element.hasAttribute("data-attachment") && !media) return null;
        return {
          priority: 2,
          conversion: (figure: HTMLElement) => {
            const image = figure.querySelector("img");
            const video = figure.querySelector("video");
            const link = figure.querySelector("a");
            let type = figure.getAttribute("data-content-type");
            if (!type) {
              if (image) type = "image/*";
              else if (video) type = "video/*";
              else type = "application/octet-stream";
            }
            const src =
              (isImageType(type) || image ? image?.getAttribute("src") : null) ??
              video?.getAttribute("src") ??
              video?.querySelector("source")?.getAttribute("src") ??
              link?.getAttribute("href") ??
              "";
            const fileName =
              figure.getAttribute("data-filename") ??
              link?.textContent?.trim() ??
              src.split("/").pop() ??
              "";
            return $attachmentFrom({
              src,
              contentType: type,
              fileName,
              fileSize: number(figure.getAttribute("data-filesize")),
              altText: image?.getAttribute("alt") ?? "",
              caption: figure.querySelector("figcaption")?.textContent?.trim() ?? "",
              width: number(image?.getAttribute("width")),
              height: number(image?.getAttribute("height")),
              preview: !isImageType(type) && image ? image.getAttribute("src") : null,
              id: figure.getAttribute("data-id"),
            });
          },
        };
      },
      img: () => ({
        priority: 1,
        conversion: (image: HTMLElement) =>
          $attachmentFrom({
            src: image.getAttribute("src") ?? "",
            contentType: "image/*",
            fileName: (image.getAttribute("src") ?? "").split("/").pop()?.split("?")[0] ?? "",
            altText: image.getAttribute("alt") ?? "",
            width: number(image.getAttribute("width")),
            height: number(image.getAttribute("height")),
          }),
      }),
      video: () => ({
        priority: 1,
        conversion: (video: HTMLElement) => {
          const src =
            video.getAttribute("src") ?? video.querySelector("source")?.getAttribute("src") ?? "";
          return $attachmentFrom({
            src,
            contentType: video.querySelector("source")?.getAttribute("type") ?? "video/*",
            fileName: src.split("/").pop() ?? "",
          });
        },
      }),
      // Lexxy's and Action Text's own attachment element, so a document from Rails reads in.
      "action-text-attachment": (element: HTMLElement) =>
        element.getAttribute("url")
          ? {
              priority: 1,
              conversion: (attachment: HTMLElement) =>
                $attachmentFrom({
                  src: attachment.getAttribute("url") ?? "",
                  contentType: attachment.getAttribute("content-type") ?? "",
                  fileName: attachment.getAttribute("filename") ?? "",
                  fileSize: number(attachment.getAttribute("filesize")),
                  altText: attachment.getAttribute("alt") ?? "",
                  caption: attachment.getAttribute("caption") ?? "",
                  width: number(attachment.getAttribute("width")),
                  height: number(attachment.getAttribute("height")),
                  id: attachment.getAttribute("sgid"),
                }),
            }
          : null,
    };
  }

  get kind() {
    return attachmentKind(this.__data);
  }

  /** Whether it can sit in a gallery, which is when it is an image that is drawn. */
  get galleryImage() {
    return isImageType(this.__data.contentType);
  }

  /** What screen readers hear of it while it is selected. */
  get label() {
    const { caption, altText, fileName } = this.__data;
    if (caption && altText && altText !== caption && altText !== fileName)
      return `${caption}. ${altText}`;
    return caption || altText || fileName;
  }

  patch(next: Partial<AttachmentData>) {
    const writable = this.getWritable();
    writable.__data = { ...writable.__data, ...next };
    return writable;
  }

  isInline(): boolean {
    if (!this.isAttached()) return false;
    const parent = this.getParent();
    return parent !== null && !parent.is($getNearestRootOrShadowRoot(this));
  }

  isKeyboardSelectable() {
    return true;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element: HTMLElement = document.createElement(this.isInline() ? "span" : "div");
    element.className = "x-govuk-ui-editor-attachment-slot";
    return element;
  }

  updateDOM(_previous: AttachmentNode, element: HTMLElement): boolean {
    return (element.tagName === "SPAN") !== this.isInline();
  }

  getTextContent() {
    const { caption, fileName } = this.getLatest().__data;
    return `[${caption || fileName}]\n\n`;
  }

  exportDOM(): DOMExportOutput {
    const data = this.getLatest().__data;
    if (data.upload) return { element: null };
    const figure = document.createElement("figure");
    figure.setAttribute("data-attachment", "");
    figure.setAttribute("data-content-type", data.contentType);
    if (data.fileName) figure.setAttribute("data-filename", data.fileName);
    if (data.fileSize !== null) figure.setAttribute("data-filesize", String(data.fileSize));
    if (data.id) figure.setAttribute("data-id", data.id);
    const kind = this.kind;
    if (kind === "image") {
      const image = document.createElement("img");
      image.setAttribute("src", data.preview ?? data.src);
      image.setAttribute("alt", data.altText);
      if (data.width) image.setAttribute("width", String(data.width));
      if (data.height) image.setAttribute("height", String(data.height));
      figure.append(image);
      if (data.preview) {
        const link = document.createElement("a");
        link.href = data.src;
        link.textContent = data.fileName;
        figure.append(link);
      }
    } else if (kind === "video") {
      const video = document.createElement("video");
      video.setAttribute("src", data.src);
      video.setAttribute("controls", "");
      figure.append(video);
    } else {
      const link = document.createElement("a");
      link.setAttribute("href", data.src);
      link.textContent = data.fileName || data.src;
      figure.append(link);
    }
    if (data.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = data.caption;
      figure.append(caption);
    }
    return { element: figure };
  }

  decorate() {
    return <AttachmentFigure nodeKey={this.__key} data={this.__data} />;
  }
}

/** @internal */
export function $isAttachmentNode(node: unknown): node is AttachmentNode {
  return node instanceof AttachmentNode;
}

/** An image that can join a gallery. */
export function $isGalleryImage(node: LexicalNode | null | undefined): node is AttachmentNode {
  return $isAttachmentNode(node) && node.galleryImage;
}

/**
 * Images side by side, as a gallery, after Lexxy's. A gallery of one becomes its image, and an
 * empty gallery is removed. Anything but an image in a gallery is put after it, splitting it.
 * @internal
 */
export class GalleryNode extends ElementNode {
  static getType() {
    return "gallery";
  }

  static clone(node: GalleryNode) {
    return new GalleryNode(node.__key);
  }

  static importJSON() {
    return new GalleryNode();
  }

  exportJSON() {
    return { ...super.exportJSON(), type: "gallery", version: 1 };
  }

  static transform(): (node: LexicalNode) => void {
    return (node) => {
      const gallery = node as GalleryNode;
      if (gallery.isEmpty()) {
        gallery.replace($createParagraphNode());
        return;
      }
      if (gallery.getChildrenSize() === 1) {
        const child = gallery.getFirstChild();
        if (child) gallery.replace($makeSafeForRoot(child));
        return;
      }
      for (const child of gallery.getChildren()) {
        if ($isGalleryImage(child)) continue;
        const popped = $makeSafeForRoot(child);
        const [top, bottom] = $splitNode(gallery, popped.getIndexWithinParent());
        top?.insertAfter(popped);
        popped.selectEnd();
        if (bottom?.isEmpty()) bottom.remove();
        break;
      }
    };
  }

  static importDOM(): DOMConversionMap {
    return {
      div: (element: HTMLElement) => {
        const attachments = element.querySelectorAll(
          ":scope > figure, :scope > img, :scope > action-text-attachment",
        );
        const gallery =
          element.hasAttribute("data-gallery") ||
          element.classList.contains("attachment-gallery") ||
          (element.textContent?.trim() === "" &&
            attachments.length > 0 &&
            element.children.length === attachments.length);
        return gallery ? { priority: 2, conversion: () => ({ node: new GalleryNode() }) } : null;
      },
    };
  }

  createDOM() {
    const element = document.createElement("div");
    element.className = "x-govuk-ui-editor-gallery";
    element.dataset.count = String(this.getChildrenSize());
    return element;
  }

  updateDOM(_previous: GalleryNode, element: HTMLElement) {
    element.dataset.count = String(this.getChildrenSize());
    return false;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("div");
    element.setAttribute("data-gallery", "");
    return { element };
  }

  canBeEmpty() {
    return true;
  }

  collapseAtStart() {
    return true;
  }

  canInsertTextBefore() {
    return false;
  }

  canInsertTextAfter() {
    return false;
  }

  insertNewAfter(selection: RangeSelection, restoreSelection?: boolean) {
    // Enter before the last image moves it out of the gallery, after a paragraph for the caret.
    const anchor = selection.anchor;
    if (anchor.getNode().is(this) && anchor.offset === this.getChildrenSize() - 1) {
      const paragraph = $createParagraphNode();
      this.insertAfter(paragraph, false);
      const last = this.getLastChild();
      if (last) paragraph.insertAfter(last, false);
      paragraph.selectEnd();
      return null;
    }
    const gallery = new GalleryNode();
    this.insertAfter(gallery, restoreSelection);
    return gallery;
  }

  /** Takes in a neighbouring image, or the images of a neighbouring gallery. */
  collapseWith(node: LexicalNode | null, backwards: boolean) {
    if (!node || !($isGallery(node) || $isGalleryImage(node))) return false;
    const images = $isGallery(node) ? node.getChildren() : [node];
    if (backwards) this.splice(0, 0, images);
    else this.append(...images);
    if ($isGallery(node)) node.remove();
    return true;
  }
}

/** @internal */
export function $isGallery(node: unknown): node is GalleryNode {
  return node instanceof GalleryNode;
}

/** The gallery an image is in, or a new one around it. */
export function $galleryFor(node: LexicalNode | null | undefined) {
  if (!$isGalleryImage(node) && !$isGallery(node)) return null;
  if ($isGallery(node)) return node;
  return (
    $getNearestNodeOfType(node, GalleryNode) ??
    ($wrapNodeInElement(node, () => new GalleryNode()) as GalleryNode)
  );
}

/**
 * HTML from the page itself, put in whole as a block that cannot be edited, such as a preview of a
 * pasted link. It is drawn as Rich text draws HTML, with only what a document may contain.
 * @internal
 */
export class EmbedNode extends DecoratorNode<ReactNode> {
  __html: string;

  static getType() {
    return "embed";
  }

  static clone(node: EmbedNode) {
    return new EmbedNode(node.__html, node.__key);
  }

  static importJSON(json: SerializedLexicalNode & { html: string }) {
    return new EmbedNode(json.html);
  }

  exportJSON() {
    return { html: this.__html, type: "embed", version: 1 };
  }

  constructor(html: string, key?: NodeKey) {
    super(key);
    this.__html = html;
  }

  static importDOM(): DOMConversionMap {
    return {
      figure: (element: HTMLElement) =>
        element.hasAttribute("data-embed")
          ? {
              priority: 3,
              conversion: (figure: HTMLElement) => ({ node: new EmbedNode(figure.innerHTML) }),
            }
          : null,
    };
  }

  createDOM() {
    const element = document.createElement("div");
    element.className = "x-govuk-ui-editor-attachment-slot";
    return element;
  }

  updateDOM() {
    return false;
  }

  isKeyboardSelectable() {
    return true;
  }

  getTextContent() {
    return `${embedText(this.__html)}\n\n`;
  }

  get label() {
    return embedText(this.__html);
  }

  exportDOM(): DOMExportOutput {
    const figure = document.createElement("figure");
    figure.setAttribute("data-embed", "");
    figure.append(...treeToDom(parseHtmlTree(this.__html), document));
    return { element: figure };
  }

  decorate() {
    return <EmbedFigure nodeKey={this.__key} html={this.__html} />;
  }
}

/** An embed's text, as a reader would read it. */
const embedText = (html: string) => treeText(parseHtmlTree(html)).trim();
