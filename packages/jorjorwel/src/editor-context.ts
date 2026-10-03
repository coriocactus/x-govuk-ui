"use client";

import type { Transformer } from "@lexical/markdown";
import type { HeadingTagType } from "@lexical/rich-text";
import type { Klass, LexicalEditor, LexicalNode, LexicalNodeReplacement } from "lexical";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useSyncExternalStore,
} from "react";
import type { EditorFormat } from "./editor-commands";
import type { EditorColour, EditorLabels } from "./editor-controls";
import type { EditorAttachment } from "./editor-uploads";

// What the Editor's parts share, kept apart from the parts, so each can import it without the
// others.

/** The value's format, which is HTML, as Lexxy writes it, or Markdown, as GOV.UK publishes. */
export type EditorValueFormat = "html" | "markdown";

/** What a stored file is, once it has an address, as `onUpload` gives it back. */
export type EditorUpload = {
  /** Where the file can be fetched from. */
  url: string;
  /** The service's own name for the file, such as a signed id, written out with it. */
  id?: string;
  /** The file's name, if the service changed it. */
  filename?: string;
  /** The file's type, if the service knows it better. */
  contentType?: string;
  /** For a file that is not an image, such as a PDF, an image of it to show in its place. */
  preview?: string;
  width?: number;
  height?: number;
};

/** What `onUpload` is given besides the file. */
export type EditorUploadHelpers = {
  /** Aborted when the attachment is removed from the document before the file is stored. */
  signal: AbortSignal;
  /** Reports how much of the file has been sent, from 0 to 100, for its progress bar. */
  onProgress: (percent: number) => void;
};

/** The editor's options, with Lexxy's defaults where none was given. */
export type EditorOptions = {
  richText: boolean;
  multiLine: boolean;
  markdown: boolean;
  attachments: boolean;
  headings: readonly HeadingTagType[];
  colours: { text: readonly EditorColour[]; background: readonly EditorColour[] };
  permittedColours: { text: readonly string[]; background: readonly string[] };
  permittedAttachmentTypes: readonly string[] | null;
  format: EditorValueFormat;
};

/** What a link pasted alone can become, as `onLinkPaste` is given it. */
export type EditorLinkPaste = {
  /** The address pasted. */
  url: string;
  /**
   * Replaces the link with HTML of your own, such as a preview of the page it leads to. With
   * `attachment`, the HTML goes in whole, as a block that cannot be edited.
   */
  replaceWith: (html: string, options?: { attachment?: boolean }) => void;
  /** Puts HTML of your own below the link, as its own block. */
  insertBelow: (html: string, options?: { attachment?: boolean }) => void;
};

/** Markdown pasted as plain text, as `onMarkdownPaste` is given it before it goes in. */
export type EditorMarkdownPaste = {
  markdown: string;
  /** The HTML Markdown made, as a document, to change before it goes in. */
  document: Document;
  /** Puts a blank line between the pasted blocks, after anything but a heading. */
  addBlockSpacing: () => void;
};

/** A store a part can follow without the rest of the editor rendering again. */
export type Store<T> = { get: () => T; subscribe: (listener: () => void) => () => void };
/** A store a part can write to, as well as follow. */
type WritableStore<T> = Store<T> & { set: (next: T) => void };

/** What the link popover shows, and what it is placed against. */
export type LinkState = {
  open: boolean;
  /** The control that opened it, or null when it opened from the document. */
  anchor: Element | null;
  /** Where the caret was as it opened. Without a control, the popover is placed against it. */
  caret: DOMRect | null;
};

export function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next: T) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** How a mention is drawn, as its prompt's `renderMention` says. */
type MentionRenderer = (mention: { value: string; label: string }) => ReactNode;

/**
 * Each prompt's way of drawing its mentions, by the prompt's name. It is a store, so the mentions
 * already in the document draw again as a prompt joins.
 */
export function createMentionStore() {
  return createStore<ReadonlyMap<string, MentionRenderer>>(new Map());
}

export function useStore<T>(store: Store<T>) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** An upload in progress, as its attachment draws it. */
export type UploadProgress = { progress: number; file: File; preview: string | null };

export type EditorShared = {
  editor: LexicalEditor;
  /** The content's id, which the label names, and the label's own id. */
  id: string;
  labelId: string;
  /** What describes the content, which is the hint, the error and the count. */
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
  placeholder: string | undefined;
  labels: EditorLabels;
  options: EditorOptions;
  /** The nodes the editor was made with, for another editor to read its content with. */
  nodes: readonly (Klass<LexicalNode> | LexicalNodeReplacement)[];
  /** The Markdown the editor reads and writes. */
  transformers: Transformer[];
  disabled: boolean;
  readOnly: boolean;
  /** The box around the document, where the floating tools go. */
  box: RefObject<HTMLDivElement | null>;
  /** The document's scrolling body, which the floating tools follow as it scrolls. */
  body: HTMLDivElement | null;
  setBody: (body: HTMLDivElement | null) => void;
  /** Whether the document scrolls inside its box, instead of growing it. */
  capped: boolean;
  /** The selection's formatting, for the controls. */
  format: Store<EditorFormat>;
  history: Store<{ undo: boolean; redo: boolean }>;
  /** The document as written, which the source shows and edits. */
  text: Store<string>;
  source: boolean;
  toggleSource: () => void;
  editSource: (text: string) => void;
  /** Opens the file picker for images and video, or for any file. */
  pickFiles: ((kind: "image" | "file") => void) | null;
  /** Stores the files and puts them in the document at the caret. */
  uploadFiles: (files: readonly File[], options?: { altText?: string }) => void;
  /** Puts a file already stored in the document at the caret, as an attachment. */
  insertAttachment: (attachment: EditorAttachment) => void;
  /** Each upload in progress, by its key, for its attachment to draw. */
  uploads: Store<ReadonlyMap<string, UploadProgress>>;
  /** Says something to screen readers at once, such as where an attachment moved. */
  announce: (message: string) => void;
  /** The link popover's state, which the link control and its shortcut share. */
  link: WritableStore<LinkState>;
  /**
   * Opens the link popover for the selection, against the control that opened it, or where the
   * caret is when there is no control.
   */
  openLink: (anchor: Element | null) => void;
  /** How each prompt draws what it puts in the document, by the prompt's name. */
  mentions: ReturnType<typeof createMentionStore>;
};

export const EditorContext = createContext<EditorShared | null>(null);

/**
 * Gives the document focus, with the caret where the editor last had it. Lexical sets the
 * document's selection, and leaves the browser to focus the document as it does so. WebKit on Linux
 * does not focus it once a button has taken focus. Once the selection is set, the document is
 * therefore given focus if it has not taken it. Focus comes after the selection, not before,
 * because a document focused with no selection gets a caret at its start, which the editor would
 * take for the person's caret.
 */
export function focusDocument(editor: LexicalEditor) {
  editor.focus(() => {
    const root = editor.getRootElement();
    if (root && !root.contains(root.ownerDocument.activeElement))
      root.focus({ preventScroll: true });
  });
}

export function useEditorContext(part: string) {
  const context = useContext(EditorContext);
  if (!context) throw new Error(`${part} must be inside Editor.`);
  return context;
}
