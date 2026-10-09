"use client";
import type { LexicalEditor, NodeKey } from "lexical";
import { createStore, type EditorUpload, type UploadProgress } from "./editor-context";

// What an attachment is, and what each editor keeps of its attachments outside the document. That
// is the uploads in progress, each upload's result, and which attachment's caption or description
// is open.

/** What an attachment is, with where its file is, what kind it is, and what is said of it. */
export type AttachmentData = {
  /** Where the file is, as the service stores it. */
  src: string;
  contentType: string;
  fileName: string;
  fileSize: number | null;
  altText: string;
  caption: string;
  width: number | null;
  height: number | null;
  /** An image of a file that is not an image, such as a PDF's first page. */
  preview: string | null;
  /** The service's own name for the file. */
  id: string | null;
  /** The upload this is waiting on, while its file is stored. */
  upload: string | null;
};

/** An attachment with nothing said of it, which reading an attachment fills in. @internal */
export const blank: AttachmentData = {
  src: "",
  contentType: "",
  fileName: "",
  fileSize: null,
  altText: "",
  caption: "",
  width: null,
  height: null,
  preview: null,
  id: null,
  upload: null,
};

/** Images the browser draws, other than SVG, which may contain script. */
export const isImageType = (type: string) => type.startsWith("image/") && !type.includes("svg");
/** Video the browser plays. @internal */
export const isVideoType = (type: string) => type.startsWith("video/");

/**
 * What kind of attachment a file is. It is an image, shown as itself or by its preview, a video, or
 * any other file. @internal
 */
export function attachmentKind({
  contentType,
  preview,
}: Pick<AttachmentData, "contentType" | "preview">): "image" | "video" | "file" {
  if (isImageType(contentType) || preview) return "image";
  if (isVideoType(contentType)) return "video";
  return "file";
}

/** An attachment's file size, as users read one. */
export function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
}

/** A file name's extension, as a file attachment shows its type. @internal */
export function extension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** A number from an attribute, such as an image's width, or null. @internal */
export const number = (value: string | null | undefined) => {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

// What each editor keeps of its attachments outside the document.

/** The result of storing a file. @internal */
export type Uploaded = EditorUpload & { failed?: false };
/** What an editor keeps of its attachments outside the document. */
type AttachmentState = {
  /** Each upload in progress, by its key. */
  progress: ReturnType<typeof createStore<ReadonlyMap<string, UploadProgress>>>;
  /** Each upload that has finished, by its key, so a node brought back by Undo finds its file. */
  results: Map<string, Uploaded | { failed: true }>;
  controllers: Map<string, AbortController>;
  /**
   * Each file whose upload stopped as its node went, by its key, so a node that Undo brings back
   * can start the upload again.
   */
  stopped: Map<string, File>;
  /** The attachment whose caption, or description, is being written. */
  caption: ReturnType<typeof createStore<NodeKey | null>>;
  alt: ReturnType<typeof createStore<NodeKey | null>>;
  /** Whether the editor takes attachments, and of which types. */
  enabled: boolean;
  permitted: readonly string[] | null;
  accept: (file: File) => boolean;
  /** Starts storing a file, for a node made to wait on it. */
  start: (key: string, file: File) => void;
  /** Stops storing a file, as the last node waiting on it goes. */
  stop: (key: string) => void;
};

const states = new WeakMap<LexicalEditor, AttachmentState>();

/** The attachments an editor keeps outside its document. @internal */
export function attachmentState(editor: LexicalEditor): AttachmentState {
  let state = states.get(editor);
  if (!state) {
    state = {
      progress: createStore<ReadonlyMap<string, UploadProgress>>(new Map()),
      results: new Map(),
      controllers: new Map(),
      stopped: new Map(),
      caption: createStore<NodeKey | null>(null),
      alt: createStore<NodeKey | null>(null),
      enabled: false,
      permitted: null,
      accept: () => true,
      start: () => {},
      stop: () => {},
    };
    states.set(editor, state);
  }
  return state;
}

/**
 * Whether a permitted type covers a type. It does when they are the same, or when the permitted
 * type names a whole kind, as `image/*` names every image. An image of an unknown kind, such as one
 * read from a page, is permitted wherever any image is.
 */
function matchesType(permitted: string, type: string) {
  if (permitted === type) return true;
  const [kind, subtype] = permitted.toLowerCase().split("/");
  const [typeKind, typeSubtype] = type.toLowerCase().split("/");
  return kind === typeKind && (subtype === "*" || typeSubtype === "*");
}

/** Whether the editor takes files of a type, as `permittedAttachmentTypes` says. @internal */
export function permits(state: AttachmentState, type: string) {
  return (
    state.enabled &&
    (state.permitted === null || state.permitted.some((permitted) => matchesType(permitted, type)))
  );
}

/** Starts storing a file under a key, and shows it from the local file meanwhile. */
export function beginUpload(state: AttachmentState, key: string, file: File) {
  const preview = isImageType(file.type) ? URL.createObjectURL(file) : null;
  const progress = new Map(state.progress.get());
  progress.set(key, { progress: 0, file, preview });
  state.progress.set(progress);
  queueMicrotask(() => state.start(key, file));
}
