"use client";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $setSelection,
  type LexicalEditor,
  type NodeKey,
} from "lexical";
import { useEffect, useState, useSyncExternalStore } from "react";
import { parseHtmlTree, renderTree } from "x-govuk-ui/internal";
import {
  type AttachmentData,
  attachmentKind,
  attachmentState,
  extension,
  humanSize,
} from "./editor-attachment-state";
import { $createNodeSelectionWith } from "./editor-commands";
import { useEditorContext } from "./editor-context";
import type { EditorLabels } from "./editor-controls";
import { useEditorRead } from "./editor-tools";

// Attachments as the editor draws them. An image shows under its caption, a video as its first
// frame, a file as its type, name and size, and a page's own HTML in full. A press selects each.

/** Whether the node is selected, as Lexical's node selection says. */
function useSelected(nodeKey: NodeKey) {
  return useEditorRead(
    () => {
      const selection = $getSelection();
      return $isNodeSelection(selection) && selection.has(nodeKey);
    },
    Object.is,
    [nodeKey],
  );
}

/** Selects an attachment whole. @internal */
export function select(editor: LexicalEditor, nodeKey: NodeKey) {
  editor.update(() => {
    const node = $getNodeByKey(nodeKey);
    if (node) $setSelection($createNodeSelectionWith(node));
  });
}

/** An upload's progress, from the editor's store. */
function useUpload(editor: LexicalEditor, key: string | null) {
  const state = attachmentState(editor);
  const progress = useSyncExternalStore(
    state.progress.subscribe,
    state.progress.get,
    state.progress.get,
  );
  return key ? (progress.get(key) ?? null) : null;
}

/**
 * An attachment as the editor draws it. An image is at its own proportions, under its caption,
 * which a press edits. A video shows its first frame, and a file its type, name and size. While its
 * file is being stored, it shows from the local file, with a progress bar. @internal
 */
export function AttachmentFigure({ nodeKey, data }: { nodeKey: NodeKey; data: AttachmentData }) {
  const [editor] = useLexicalComposerContext();
  const state = attachmentState(editor);
  const selected = useSelected(nodeKey);
  const upload = useUpload(editor, data.upload);
  const result = data.upload ? state.results.get(data.upload) : undefined;
  const failed = Boolean(result?.failed);
  const uploading = Boolean(data.upload) && !result;
  const labels = useLabels();
  const kind = attachmentKind(data);
  // An uploaded image shows from the local file until the stored one has loaded, so it does not
  // blink.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (kind !== "image" || !data.src || data.upload) return;
    const image = new Image();
    image.onload = () => setLoaded(true);
    image.src = data.preview ?? data.src;
  }, [kind, data.src, data.preview, data.upload]);
  const local = upload?.preview ?? null;
  const src = loaded || !local ? (data.preview ?? data.src) : local;
  const name = data.fileName || data.src.split("/").pop() || labels.attachment;
  const editable = kind !== "file";
  const size = data.fileSize ?? upload?.file.size ?? null;
  // What the attachment shows, which is its error, its image or its video, or else its type as an
  // icon.
  const media = () => {
    if (failed)
      return (
        <div className="x-govuk-ui-editor-attachment-error" role="alert">
          {labels.uploadFailed(name)}
        </div>
      );
    if (kind === "image" && src)
      return (
        <img
          className="x-govuk-ui-editor-attachment-image"
          src={src}
          alt={data.altText}
          width={data.width ?? undefined}
          height={data.height ?? undefined}
          draggable={false}
        />
      );
    if (kind === "video" && data.src)
      return (
        <video
          className="x-govuk-ui-editor-attachment-video"
          src={data.src}
          preload="metadata"
          muted
        />
      );
    return (
      <span className="x-govuk-ui-editor-attachment-icon">
        {extension(name) || (kind === "image" ? labels.imageType : labels.fileType)}
      </span>
    );
  };
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: The arrow keys select an attachment, as any node of the document.
    <figure
      className="x-govuk-ui-editor-attachment"
      data-kind={kind}
      data-node-key={nodeKey}
      data-selected={selected || undefined}
      data-uploading={uploading || undefined}
      data-failed={failed || undefined}
      data-extension={extension(name) || undefined}
      draggable={!uploading}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("figcaption")) return;
        select(editor, nodeKey);
      }}
    >
      {media()}
      {editable && !uploading && !failed ? (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Tab from the selected attachment writes its caption.
        <figcaption
          className="x-govuk-ui-editor-caption"
          data-placeholder={!data.caption || undefined}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            state.caption.set(nodeKey);
          }}
        >
          <span className="x-govuk-ui-editor-caption-text">{data.caption || name}</span>
        </figcaption>
      ) : (
        <figcaption className="x-govuk-ui-editor-caption" data-file>
          <strong className="x-govuk-ui-editor-attachment-name">{data.caption || name}</strong>
          {size !== null && (
            <span className="x-govuk-ui-editor-attachment-size">{humanSize(size)}</span>
          )}
        </figcaption>
      )}
      {uploading && (
        <progress
          className="x-govuk-ui-editor-attachment-progress"
          max={100}
          value={upload?.progress ?? 0}
          aria-label={name}
        />
      )}
    </figure>
  );
}

/** HTML embedded whole, drawn as Rich text draws it. @internal */
export function EmbedFigure({ nodeKey, html }: { nodeKey: NodeKey; html: string }) {
  const [editor] = useLexicalComposerContext();
  const selected = useSelected(nodeKey);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: The arrow keys select it, as any node of the document.
    <figure
      className="x-govuk-ui-editor-attachment"
      data-kind="embed"
      data-node-key={nodeKey}
      data-selected={selected || undefined}
      draggable
      onClick={() => select(editor, nodeKey)}
    >
      {renderTree(parseHtmlTree(html))}
    </figure>
  );
}

/** The editor's words, inside a decorator. */
function useLabels(): EditorLabels {
  return useEditorContext("Attachment").labels;
}
