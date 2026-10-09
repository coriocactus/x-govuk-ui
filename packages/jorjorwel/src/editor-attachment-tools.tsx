"use client";

import { Popover } from "@base-ui/react/popover";
import { Toolbar } from "@base-ui/react/toolbar";
import {
  $getNodeByKey,
  $setSelection,
  HISTORY_PUSH_TAG,
  type NodeKey,
  SKIP_DOM_SELECTION_TAG,
} from "lexical";
import {
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button, Textarea } from "x-govuk-ui";
import { select } from "./editor-attachment-figure";
import { attachmentState } from "./editor-attachment-state";
import {
  $isAttachmentNode,
  $isGallery,
  type AttachmentNode,
  EmbedNode,
} from "./editor-attachments";
import { $createNodeSelectionWith, $singleSelectedNode } from "./editor-commands";
import { focusDocument, useEditorContext } from "./editor-context";
import {
  EditorTool,
  type EditorToolPartProps,
  EditorTools,
  useEditorAnchor,
  useEditorRead,
} from "./editor-tools";

// The tools over the selected attachment, which are its description, Remove, and its caption,
// written in a field of its own.

/** The attachment that is the whole selection, if there is one. */
function $selectedAttachment() {
  const node = $singleSelectedNode();
  if (!$isAttachmentNode(node) && !(node instanceof EmbedNode)) return null;
  return {
    key: node.getKey(),
    describable: $isAttachmentNode(node) && node.kind === "image" && !node.__data.upload,
    inline: node.isInline(),
  };
}

const sameSelected = (
  a: ReturnType<typeof $selectedAttachment>,
  b: ReturnType<typeof $selectedAttachment>,
) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.key === b.key &&
    a.describable === b.describable &&
    a.inline === b.inline);

const removeIcon = (
  <svg
    viewBox="0 0 20 20"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />
  </svg>
);

/**
 * The tools over the selected attachment, at its top right corner, as Lexxy's are. They are its
 * description, for an image, and Remove. Alt F10 takes focus to them, and Escape takes it back to
 * the attachment. The description is written in a popover beneath it, and a caption in a field
 * over the caption. `EditorContent` shows them when the editor takes attachments, unless it is
 * given tools of its own.
 */
export function EditorAttachmentTools(props: EditorToolPartProps) {
  const { editor, labels, disabled, readOnly, options } = useEditorContext("EditorAttachmentTools");
  const state = attachmentState(editor);
  const selected = useEditorRead($selectedAttachment, sameSelected);
  const altKey = useSyncExternalStore(state.alt.subscribe, state.alt.get, state.alt.get);
  const element = selected
    ? (editor.getElementByKey(selected.key)?.querySelector<HTMLElement>("figure") ?? null)
    : null;
  const anchor = useEditorAnchor(element, selected);
  const shown = Boolean(selected && anchor && !anchor.hidden && !disabled && !readOnly);
  if (!options.attachments) return null;
  const reselect = (key: string) => {
    editor.getRootElement()?.focus({ preventScroll: true });
    select(editor, key);
  };
  return (
    <>
      {shown && selected && anchor && (
        <EditorTools
          label={labels.attachmentTools}
          anchor={anchor}
          placement="inside"
          {...props}
          className={`x-govuk-ui-editor-attachment-tools ${props.className ?? ""}`.trim()}
          onKeyDown={(event) => {
            props.onKeyDown?.(event);
            if (event.defaultPrevented || event.key !== "Escape") return;
            // Escape gives focus back to the attachment, selected.
            event.preventDefault();
            reselect(selected.key);
          }}
        >
          <div className="x-govuk-ui-editor-tools-group">
            {selected.describable && (
              <Toolbar.Button
                render={
                  <Button
                    variant="quiet"
                    size="small"
                    className="x-govuk-ui-editor-tool x-govuk-ui-editor-alt"
                    aria-haspopup="dialog"
                    onClick={() => state.alt.set(selected.key)}
                  >
                    {labels.altText}
                  </Button>
                }
              />
            )}
            <EditorTool
              label={labels.attachmentRemove}
              icon={removeIcon}
              destructive
              onClick={() => {
                editor.update(() => {
                  const node = $getNodeByKey(selected.key);
                  if (!node) return;
                  node.selectPrevious();
                  node.remove();
                });
                focusDocument(editor);
              }}
            />
          </div>
        </EditorTools>
      )}
      <AltTextPopover
        nodeKey={altKey}
        onClose={() => state.alt.set(null)}
        onClosed={(key) => reselect(key)}
      />
      <CaptionEditor />
    </>
  );
}

/**
 * Where an image's description is written, in a popover beneath it. It stays mounted, so it can
 * close as it opened. However it closes, focus goes back to the image, selected. @internal
 */
function AltTextPopover({
  nodeKey,
  onClose,
  onClosed,
}: {
  nodeKey: NodeKey | null;
  onClose: () => void;
  onClosed: (key: NodeKey) => void;
}) {
  const { editor, labels } = useEditorContext("AltTextPopover");
  // The image it is for, kept as it closes, so it stays beneath that image.
  const [shown, setShown] = useState<NodeKey | null>(nodeKey);
  const [text, setText] = useState("");
  useEffect(() => {
    if (nodeKey === null) return;
    setShown(nodeKey);
    setText(
      editor
        .getEditorState()
        .read(() => ($getNodeByKey(nodeKey) as AttachmentNode | null)?.__data.altText) ?? "",
    );
  }, [editor, nodeKey]);
  const figure = shown ? (editor.getElementByKey(shown)?.querySelector("figure") ?? null) : null;
  const save = () => {
    const description = text.trim();
    if (shown)
      editor.update(
        () => {
          const node = $getNodeByKey(shown);
          if ($isAttachmentNode(node) && node.__data.altText !== description)
            node.patch({ altText: description });
        },
        { tag: [HISTORY_PUSH_TAG, SKIP_DOM_SELECTION_TAG] },
      );
    onClose();
  };
  if (!shown) return null;
  return (
    <Popover.Root
      open={nodeKey !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Popover.Portal>
        <Popover.Positioner
          className="x-govuk-ui-floating-positioner"
          anchor={figure}
          side="bottom"
          align="center"
          sideOffset={8}
          collisionPadding={8}
        >
          <Popover.Popup
            className="x-govuk-ui-floating x-govuk-ui-editor-popup"
            aria-label={labels.altText}
            // Focus goes back to the image, selected, unless the user has moved focus elsewhere
            // by the time the popover has closed, such as by pressing the text.
            finalFocus={() => {
              requestAnimationFrame(() => {
                const active = document.activeElement;
                if (!active || active === document.body) onClosed(shown);
              });
              return false;
            }}
          >
            <form
              className="x-govuk-ui-editor-alt-form"
              onSubmit={(event) => {
                // React sends a submit up through the portal, to a form around the editor.
                event.preventDefault();
                event.stopPropagation();
                save();
              }}
            >
              <Textarea
                label={labels.altText}
                hint={labels.altTextHint}
                rows={2}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    save();
                  }
                }}
              />
              <div className="x-govuk-ui-editor-popup-actions">
                <Button type="submit" size="small">
                  {labels.altTextSave}
                </Button>
                <Button type="button" variant="link" onClick={onClose}>
                  {labels.altTextCancel}
                </Button>
              </div>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * The caption being written, in a field over the attachment's caption, outside the document, so
 * screen readers hear it as a field of its own, as in Lexxy. It is kept when the field is left.
 * Enter moves on after the attachment, and Escape goes back to it. @internal
 */
function CaptionEditor() {
  const { editor, labels } = useEditorContext("CaptionEditor");
  const state = attachmentState(editor);
  const key = useSyncExternalStore(state.caption.subscribe, state.caption.get, state.caption.get);
  const caption = key
    ? (editor.getElementByKey(key)?.querySelector<HTMLElement>("figcaption") ?? null)
    : null;
  const version = useEditorRead(() => (key ? $getNodeByKey(key)?.getLatest() : null), Object.is, [
    key,
  ]);
  const anchor = useEditorAnchor(caption, version);
  const field = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [video, setVideo] = useState(false);
  useLayoutEffect(() => {
    if (!key) return;
    const node = editor.read(() => $getNodeByKey(key));
    if (!$isAttachmentNode(node)) {
      state.caption.set(null);
      return;
    }
    setText(node.__data.caption);
    setVideo(node.kind === "video");
    caption?.setAttribute("data-editing", "");
    caption?.scrollIntoView({ block: "nearest", inline: "nearest" });
    requestAnimationFrame(() => field.current?.focus({ preventScroll: true }));
    return () => caption?.removeAttribute("data-editing");
  }, [key, editor, caption, state.caption]);
  // The field is as tall as what is written in it, and the caption beneath keeps its space.
  useLayoutEffect(() => {
    const element = field.current;
    if (!element || !caption) return;
    element.style.height = "0px";
    element.style.height = `${element.scrollHeight}px`;
    caption.style.minHeight = `${element.scrollHeight}px`;
    return () => {
      caption.style.minHeight = "";
    };
  });
  if (!key || !anchor || !caption) return null;
  const save = (then?: (node: AttachmentNode) => void) => {
    const value = text;
    state.caption.set(null);
    editor.update(
      () => {
        const node = $getNodeByKey(key);
        if (!$isAttachmentNode(node)) return;
        if (node.__data.caption !== value) node.patch({ caption: value });
        then?.(node);
      },
      // The caption is a step of its own in the history. Leaving it by key also selects what comes
      // next, which Lexical folds into that step as a change of selection only.
      { tag: then ? undefined : SKIP_DOM_SELECTION_TAG, discrete: true },
    );
  };
  return (
    <textarea
      ref={field}
      className="x-govuk-ui-editor-caption-field"
      aria-label={video ? labels.videoCaption : labels.imageCaption}
      placeholder={labels.captionPlaceholder}
      rows={1}
      value={text}
      style={
        {
          "--x-govuk-ui-editor-anchor-left": `${anchor.left}px`,
          "--x-govuk-ui-editor-anchor-top": `${anchor.top}px`,
          width: anchor.width,
        } as CSSProperties
      }
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        if (state.caption.get() === key) save();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        if (event.key !== "Enter" && event.key !== "Escape") return;
        event.preventDefault();
        const enter = event.key === "Enter";
        editor.getRootElement()?.focus({ preventScroll: true });
        save((node) => {
          if (!enter) {
            $setSelection($createNodeSelectionWith(node));
            return;
          }
          const parent = node.getParent();
          if ($isGallery(parent) && !node.getNextSibling()) parent.selectNext(0, 0);
          else node.selectNext(0, 0);
        });
      }}
    />
  );
}
