"use client";

import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type LexicalNode,
  type RangeSelection,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from "lexical";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AttachmentData,
  attachmentState,
  permits,
  type Uploaded,
} from "./editor-attachment-state";
import {
  $createUploadNode,
  $galleryFor,
  $isAttachmentNode,
  $isGallery,
  $isGalleryImage,
  AttachmentNode,
  GalleryNode,
  safeData,
} from "./editor-attachments";
import { $insertAtCursor } from "./editor-commands";
import type { EditorUpload, EditorUploadHelpers } from "./editor-context";

// Storing files, after Lexxy's uploads. Each goes in as a node that waits on its file, drawn from
// the local file meanwhile, and takes its address once `onUpload` gives one.

type UploadOptions = {
  editor: LexicalEditor;
  enabled: boolean;
  permitted: readonly string[] | null;
  onUpload?: (file: File, helpers: EditorUploadHelpers) => Promise<EditorUpload | string>;
  onFileAccept?: (file: File) => boolean;
};

/** How long a file's local image is kept after it is stored, until the stored one has loaded. */
const PREVIEW_MS = 30_000;

/**
 * An attachment already stored, as a service puts one in. It gives where its file is and what kind
 * it is, with whatever else is said of it.
 */
export type EditorAttachment = Partial<AttachmentData> & { src: string; contentType: string };

/**
 * Storing files, after Lexxy's uploads. Each file goes in where the caret is, as a node that waits
 * for its file. The node draws the local file meanwhile, and takes its address once `onUpload`
 * gives one. Several images go in as a gallery, as does an image dropped beside an image. A node
 * removed before its file is stored stops the upload. @internal
 */
export function useUploads({ editor, enabled, permitted, onUpload, onFileAccept }: UploadOptions) {
  const state = attachmentState(editor);
  state.enabled = enabled;
  state.permitted = permitted;
  const accept = useRef(onFileAccept);
  accept.current = onFileAccept;
  state.accept = (file) =>
    permits(state, file.type || "application/octet-stream") && accept.current?.(file) !== false;
  const handler = useRef(onUpload);
  handler.current = onUpload;
  const input = useRef<HTMLInputElement>(null);
  const [accepting, setAccepting] = useState<string | undefined>(undefined);
  // An editor that is removed stops its uploads, because nothing is left to take their addresses.
  useEffect(
    () => () => {
      for (const controller of state.controllers.values()) controller.abort();
      state.controllers.clear();
    },
    [state],
  );

  const settle = (key: string, result: Uploaded | { failed: true }) => {
    state.controllers.delete(key);
    state.results.set(key, result);
    const progress = new Map(state.progress.get());
    const preview = progress.get(key)?.preview;
    progress.delete(key);
    state.progress.set(progress);
    // The node takes its address, without a step in the history, because the upload is not an
    // edit. A node that Undo brings back finds its address by the same key.
    const focused = editor.getRootElement()?.contains(document.activeElement);
    editor.update(
      () => {
        for (const node of $attachmentsWaitingOn(key)) $settle(node, result);
      },
      {
        tag: focused
          ? [HISTORY_MERGE_TAG, SKIP_SCROLL_INTO_VIEW_TAG]
          : [HISTORY_MERGE_TAG, SKIP_SCROLL_INTO_VIEW_TAG, SKIP_DOM_SELECTION_TAG],
      },
    );
    // The file's local image stays until the stored one has loaded.
    if (preview) setTimeout(() => URL.revokeObjectURL(preview), PREVIEW_MS);
  };

  // The upload stops, and the form can be sent again, but the file is kept for Undo.
  state.stop = (key) => {
    state.controllers.get(key)?.abort();
    state.controllers.delete(key);
    const progress = new Map(state.progress.get());
    const entry = progress.get(key);
    if (!entry) return;
    progress.delete(key);
    state.progress.set(progress);
    state.stopped.set(key, entry.file);
    if (entry.preview) URL.revokeObjectURL(entry.preview);
  };

  state.start = (key, file) => {
    const upload = handler.current;
    if (!upload) return settle(key, { failed: true });
    // An image takes its size from the local file at once, so it keeps its space as the stored
    // image loads.
    const preview = state.progress.get().get(key)?.preview;
    if (preview) {
      const image = new Image();
      image.onload = () =>
        editor.update(
          () => {
            for (const node of $attachmentsWaitingOn(key))
              if (!node.__data.width)
                node.patch({ width: image.naturalWidth, height: image.naturalHeight });
          },
          { tag: [HISTORY_MERGE_TAG, SKIP_SCROLL_INTO_VIEW_TAG, SKIP_DOM_SELECTION_TAG] },
        );
      image.src = preview;
    }
    const controller = new AbortController();
    state.controllers.set(key, controller);
    const helpers: EditorUploadHelpers = {
      signal: controller.signal,
      onProgress: (percent) => {
        if (controller.signal.aborted) return;
        const progress = new Map(state.progress.get());
        const current = progress.get(key);
        if (!current) return;
        progress.set(key, { ...current, progress: Math.max(0, Math.min(100, percent)) });
        state.progress.set(progress);
      },
    };
    // Called inside a promise, so an `onUpload` that throws before it returns its own promise fails
    // as one that rejects does, and the file is not left waiting.
    Promise.resolve()
      .then(() => upload(file, helpers))
      .then(
        (stored) => {
          if (controller.signal.aborted) return;
          settle(key, typeof stored === "string" ? { url: stored } : stored);
        },
        (error) => {
          if (controller.signal.aborted) return;
          console.warn(`${file.name} could not be uploaded`, error);
          settle(key, { failed: true });
        },
      );
  };

  // Each is kept from render to render, because the parts share them and would render again.
  const uploadFiles = useCallback(
    (files: readonly File[], { altText }: { altText?: string } = {}) => {
      if (!state.enabled) return;
      const accepted = files.filter((file) => state.accept(file));
      if (accepted.length === 0) return;
      editor.update(() => {
        const nodes = accepted.map((file) => $createUploadNode(file));
        if (altText && nodes.length === 1) nodes[0]?.patch({ altText });
        $insertAttachments(nodes);
        const last = nodes.at(-1);
        if (last?.isAttached()) {
          last.selectNext(0, 0);
          const selection = $getSelection();
          if ($isRangeSelection(selection) && $isShadowRootAnchor(selection)) {
            const paragraph = $createParagraphNode();
            (selection.anchor.getNode() as ElementNode).append(paragraph);
            paragraph.selectStart();
          }
        }
      });
    },
    [editor, state],
  );

  const pickFiles = useCallback((kind: "image" | "file") => {
    setAccepting(kind === "image" ? "image/*,video/*" : undefined);
    requestAnimationFrame(() => input.current?.click());
  }, []);

  // A file that is already stored, such as one from the service's own library, goes in at the caret
  // as any attachment does. Its address is made safe first.
  const insertAttachment = useCallback(
    (data: EditorAttachment) => {
      const safe = safeData(data);
      if (!safe?.src || !state.enabled) return;
      editor.update(() => $insertAttachments([new AttachmentNode(safe)]));
    },
    [editor, state],
  );

  return {
    uploadFiles,
    insertAttachment,
    pickFiles: enabled ? pickFiles : null,
    progress: state.progress,
    input: enabled ? (
      <input
        ref={input}
        type="file"
        multiple
        hidden
        tabIndex={-1}
        accept={accepting}
        onChange={(event) => {
          uploadFiles([...(event.target.files ?? [])]);
          event.target.value = "";
        }}
      />
    ) : null,
  };
}

function $isShadowRootAnchor(selection: RangeSelection) {
  const node = selection.anchor.getNode();
  return $isElementNode(node) && node.isShadowRoot() && node.getType() !== "root";
}

/** Every attachment in the document waiting on an upload. */
export function $attachmentsWaitingOn(key: string) {
  const found: AttachmentNode[] = [];
  const visit = (node: LexicalNode) => {
    if ($isAttachmentNode(node) && node.__data.upload === key) found.push(node);
    if ($isElementNode(node)) for (const child of node.getChildren()) visit(child);
  };
  visit($getRoot());
  return found;
}

/**
 * Gives an attachment its upload's result, which is its address and what the store says of it.
 * @internal
 */
export function $settle(node: AttachmentNode, result: Uploaded | { failed: true }) {
  if (result.failed) return;
  node.patch({
    src: result.url,
    id: result.id ?? null,
    fileName: result.filename ?? node.__data.fileName,
    contentType: result.contentType ?? node.__data.contentType,
    preview: result.preview ?? null,
    width: result.width ?? node.__data.width,
    height: result.height ?? node.__data.height,
    upload: null,
  });
}

/**
 * Puts attachments in at the caret. Several images, or images going in beside an image or a
 * gallery, go into a gallery, and anything else goes after it.
 */
function $insertAttachments(nodes: AttachmentNode[]) {
  const images = nodes.filter($isGalleryImage);
  const selection = $getSelection();
  const selected = selection?.getNodes()[0];
  const onImage = $isGalleryImage(selected) ? selected : null;
  const before = $nodeBeforeCaretAtStart();
  const afterGallery = before && ($isGallery(before) || $isGalleryImage(before)) ? before : null;
  if (images.length < 2 && !onImage && !afterGallery) {
    $insertAtCursor(nodes);
    return;
  }
  let gallery: GalleryNode | null;
  let position: number;
  if (onImage) {
    gallery = $galleryFor(onImage);
    position = onImage.getIndexWithinParent() + 1;
  } else if (afterGallery) {
    gallery = $galleryFor(afterGallery);
    position = gallery?.getChildrenSize() ?? 0;
  } else {
    gallery = new GalleryNode();
    $insertAtCursor([gallery]);
    position = 0;
  }
  if (!gallery) {
    $insertAtCursor(nodes);
    return;
  }
  gallery.splice(position, 0, images);
  let previous: LexicalNode = gallery;
  for (const node of nodes.filter((each) => !images.includes(each)))
    previous = previous.insertAfter(node);
}

/** The node before a caret at the start of a block. */
function $nodeBeforeCaretAtStart() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed() || selection.anchor.offset !== 0)
    return null;
  const node = selection.anchor.getNode();
  const block = $isElementNode(node) ? node : node.getParent();
  if ($isTextNode(node) && node.getPreviousSibling()) return null;
  return block?.getPreviousSibling() ?? null;
}
