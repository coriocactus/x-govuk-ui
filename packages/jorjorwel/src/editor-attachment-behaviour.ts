"use client";
import { $isListItemNode, $isListNode } from "@lexical/list";
import { DRAG_DROP_PASTE } from "@lexical/rich-text";
import { mergeRegister } from "@lexical/utils";
import {
  $getChildCaret,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $getSiblingCaret,
  $isDecoratorNode,
  $isParagraphNode,
  $isRangeSelection,
  $nodesOfType,
  $setSelection,
  $splitNode,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  DELETE_CHARACTER_COMMAND,
  DRAGSTART_COMMAND,
  DROP_COMMAND,
  flipDirection,
  HISTORY_MERGE_TAG,
  KEY_DOWN_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  SKIP_DOM_SELECTION_TAG,
  SKIP_SCROLL_INTO_VIEW_TAG,
} from "lexical";
import { attachmentState, beginUpload } from "./editor-attachment-state";
import {
  $galleryFor,
  $isAttachmentNode,
  $isGallery,
  $isGalleryImage,
  AttachmentNode,
  EmbedNode,
} from "./editor-attachments";
import { $caretAfter } from "./editor-behaviour";
import {
  $createNodeSelectionWith,
  $isAtNodeEdge,
  $isBlankNode,
  $singleSelectedNode,
} from "./editor-commands";
import type { EditorLabels } from "./editor-controls";
import { $isProvisionalParagraphNode } from "./editor-nodes";
import { $attachmentsWaitingOn, $settle } from "./editor-uploads";

// What attachments do as people write, after Lexxy's. This covers galleries that gather and part,
// captions reached by Tab, moves by drag and by key, files dropped in, and what screen readers
// hear.

type AttachmentBehaviour = {
  upload: (files: File[]) => void;
  announce: (message: string) => void;
  labels: () => EditorLabels;
};

/**
 * What attachments do as people write, after Lexxy's. An attachment that Lexical put in a paragraph
 * is moved out to stand on its own. Backspace by a gallery takes the image next to it in, and Tab
 * from a selected image edits its caption. A dropped file goes in where it was dropped. An
 * attachment can be dragged to another place, or moved with Alt, Shift and the arrows. Screen
 * readers hear what a selected attachment is. @internal
 */
export function registerAttachments(editor: LexicalEditor, behaviour: AttachmentBehaviour) {
  const state = attachmentState(editor);
  return mergeRegister(
    editor.registerNodeTransform(AttachmentNode, (node) => {
      // An attachment created again, as a moved one is, finds the result of its upload.
      const key = node.__data.upload;
      const result = key ? state.results.get(key) : undefined;
      if (result && !result.failed) $settle(node, result);
      const parent = node.getParent();
      if (!$isParagraphNode(parent)) return;
      if (parent.getChildrenSize() === 1) {
        parent.replace(node);
        return;
      }
      const [top, bottom] = $splitNode(parent, node.getIndexWithinParent());
      top?.insertAfter(node);
      for (const paragraph of [top, bottom]) if (paragraph?.isEmpty()) paragraph.remove();
    }),
    editor.registerMutationListener(AttachmentNode, (mutations, { prevEditorState }) => {
      for (const [key, mutation] of mutations) {
        // Undo and Redo set the whole document, without transforms, so an attachment they bring
        // back is handled here. It finds the result of its upload, or starts its upload again if
        // it stopped as the attachment went. An Undo to before the upload ended updates, not
        // creates, an attachment that stayed in the document, and that attachment finds the
        // result too.
        if (mutation !== "destroyed") {
          const upload = editor
            .getEditorState()
            .read(() => ($getNodeByKey(key) as AttachmentNode | null)?.__data.upload);
          if (!upload || state.controllers.has(upload)) continue;
          const result = state.results.get(upload);
          if (result && !result.failed)
            editor.update(
              () => {
                const node = $getNodeByKey(key);
                if ($isAttachmentNode(node)) $settle(node, result);
              },
              { tag: [HISTORY_MERGE_TAG, SKIP_SCROLL_INTO_VIEW_TAG, SKIP_DOM_SELECTION_TAG] },
            );
          const file = mutation === "created" ? state.stopped.get(upload) : undefined;
          if (!result && file) {
            state.stopped.delete(upload);
            beginUpload(state, upload, file);
          }
          continue;
        }
        const upload = prevEditorState.read(
          () => ($getNodeByKey(key) as AttachmentNode | null)?.__data.upload,
        );
        if (!upload) continue;
        // Only when no other node still waits on it, because a moved node is destroyed and created
        // again.
        const waiting = editor
          .getEditorState()
          .read(() => $attachmentsWaitingOn(upload).length > 0);
        if (waiting) continue;
        state.stop(upload);
      }
    }),
    // When the history is cleared, such as by a form's reset or a value from outside, Undo can no
    // longer bring back an earlier attachment. What only such an attachment would need is then
    // dropped.
    editor.registerCommand(
      CLEAR_HISTORY_COMMAND,
      () => {
        const waiting = editor
          .getEditorState()
          .read(() => $nodesOfType(AttachmentNode).flatMap((node) => node.__data.upload ?? []));
        for (const key of [...state.stopped.keys(), ...state.results.keys()])
          if (!waiting.includes(key)) {
            state.stopped.delete(key);
            state.results.delete(key);
          }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    // Typing with the caret in a gallery, beside its images, types after the gallery, as typing
    // with an image selected does. A gallery contains only images, and Lexical would put the text
    // beside the gallery, at the root, which takes no text, and stop.
    editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const gallery = selection.anchor.getNode();
        if ($isGallery(gallery)) $caretAfter(gallery);
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(DELETE_CHARACTER_COMMAND, $collapseIntoGallery, COMMAND_PRIORITY_NORMAL),
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const node = $singleSelectedNode();
        if (
          event.shiftKey ||
          !$isAttachmentNode(node) ||
          node.kind === "file" ||
          node.__data.upload
        )
          return false;
        event.preventDefault();
        state.caption.set(node.getKey());
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        behaviour.upload(files);
        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    ),
    registerKeyboardMove(editor, behaviour),
    registerDragAndDrop(editor),
    registerDragOver(editor),
  );
}

/** Backspace and Delete by a gallery take the image beside it in, as Lexxy's do. */
function $collapseIntoGallery(backwards: boolean) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;
  const anchor = selection.anchor;
  const node = anchor.getNode();
  if ($isGallery(node) && $isAtNodeEdge(anchor, backwards)) {
    const sibling = backwards ? node.getPreviousSibling() : node.getNextSibling();
    if (node.collapseWith(sibling, backwards)) {
      const offset = backwards ? 1 : node.getChildrenSize() - 1;
      node.select(offset, offset);
      return true;
    }
  }
  if (!backwards) return false;
  // Backspace in an empty paragraph between a gallery and an image joins them.
  if ($isParagraphNode(node) && node.isEmpty()) {
    const gallery = $galleryFor(node.getPreviousSibling());
    if (gallery) {
      const size = gallery.getChildrenSize();
      if (gallery.collapseWith(node.getNextSibling(), false)) {
        gallery.select(size, size);
        node.remove();
        return true;
      }
    }
  }
  // Backspace at a gallery's start goes to the block before, instead of merging the two.
  if ($isGallery(node) && $isAtNodeEdge(anchor, true)) {
    const previous = node.getPreviousSibling();
    if (!previous || $isDecoratorNode(previous)) return false;
    if ($isBlankNode(previous)) previous.remove();
    else previous.selectEnd();
    return true;
  }
  return false;
}

/**
 * Alt, Shift and Up or Down move a selected attachment past the block before or after it, into a
 * gallery beside it, or out of the gallery it is in. Alt, Shift and Left or Right move an image
 * along its gallery. Screen readers hear where it went.
 */
function registerKeyboardMove(editor: LexicalEditor, behaviour: AttachmentBehaviour) {
  return editor.registerCommand(
    KEY_DOWN_COMMAND,
    (event) => {
      const node = $singleSelectedNode();
      if (
        !event.altKey ||
        !event.shiftKey ||
        !event.key.startsWith("Arrow") ||
        !$isAttachmentNode(node)
      )
        return false;
      event.preventDefault();
      const moved = behaviour.labels().moved;
      const direction = event.key === "ArrowUp" || event.key === "ArrowLeft" ? "previous" : "next";
      const blocked = direction === "next" ? moved.atEnd : moved.atStart;
      const parent = node.getParent();
      let message = blocked;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const sibling = $getSiblingCaret(node, direction).getNodeAtCaret();
        if ($isGallery(parent) && sibling) {
          $getSiblingCaret(sibling, direction).insert(node);
          message = moved.reordered;
        }
      } else if ($isGallery(parent)) {
        $getSiblingCaret(parent, direction).insert(node);
        message = moved.left;
      } else {
        let target = $getSiblingCaret(node, direction).getNodeAtCaret();
        while (target && $isProvisionalParagraphNode(target))
          target = $getSiblingCaret(target, direction).getNodeAtCaret();
        if ($isGallery(target) && node.galleryImage) {
          $getChildCaret(target, direction).insert(node);
          message = moved.joined;
        } else if ($isGalleryImage(target) && node.galleryImage) {
          if ($galleryFor(target)) {
            $getSiblingCaret(target, flipDirection(direction)).insert(node);
            message = moved.formed;
          }
        } else if (target) {
          $getSiblingCaret(target, direction).insert(node);
          message = direction === "next" ? moved.down : moved.up;
        }
      }
      $setSelection($createNodeSelectionWith(node));
      behaviour.announce(message);
      const key = node.getKey();
      requestAnimationFrame(() =>
        editor.getElementByKey(key)?.scrollIntoView({ block: "nearest" }),
      );
      return true;
    },
    COMMAND_PRIORITY_HIGH,
  );
}

const dragType = "application/x-x-govuk-ui-node-key";

type DropTarget =
  | { type: "gallery" | "reorder"; element: HTMLElement; key: string; position: "before" | "after" }
  | { type: "list" | "block"; element: HTMLElement; position: "before" | "after" };

/**
 * Dragging an attachment to another place, after Lexxy's. It can go onto an image, to make a
 * gallery or join one, along its own gallery, between a list's items, splitting the list, or
 * between blocks. A line shows where it will go.
 */
function registerDragAndDrop(editor: LexicalEditor) {
  let dragged: string | null = null;
  let frame = 0;
  const clear = () => {
    for (const element of editor.getRootElement()?.querySelectorAll("[data-drop]") ?? [])
      element.removeAttribute("data-drop");
  };
  const cleanup = () => {
    clear();
    if (dragged)
      editor
        .getRootElement()
        ?.querySelector(`[data-node-key="${dragged}"]`)
        ?.removeAttribute("data-dragging");
    dragged = null;
    cancelAnimationFrame(frame);
  };
  const horizontal = (element: Element, x: number) => {
    const rect = element.getBoundingClientRect();
    return x < rect.left + rect.width / 2 ? ("before" as const) : ("after" as const);
  };
  const vertical = (element: Element, y: number) => {
    const rect = element.getBoundingClientRect();
    return y < rect.top + rect.height / 2 ? ("before" as const) : ("after" as const);
  };
  const resolve = (event: DragEvent): DropTarget | null => {
    const root = editor.getRootElement();
    const element = root?.ownerDocument.elementFromPoint(event.clientX, event.clientY);
    if (!root || !element || !root.contains(element)) return null;
    const figure = element.closest<HTMLElement>('figure[data-kind="image"][data-node-key]');
    const gallery = element.closest<HTMLElement>(".x-govuk-ui-editor-gallery");
    if (figure && figure.dataset.nodeKey !== dragged) {
      const own = gallery?.querySelector(`[data-node-key="${dragged}"]`);
      return {
        type: own ? "reorder" : "gallery",
        element: figure,
        key: figure.dataset.nodeKey ?? "",
        position: horizontal(figure, event.clientX),
      };
    }
    if (figure && gallery) return null;
    if (gallery) {
      const figures = [...gallery.querySelectorAll<HTMLElement>("figure[data-node-key]")];
      const nearest = figures.sort(
        (a, b) =>
          Math.abs(event.clientX - (a.getBoundingClientRect().left + a.offsetWidth / 2)) -
          Math.abs(event.clientX - (b.getBoundingClientRect().left + b.offsetWidth / 2)),
      )[0];
      if (!nearest || nearest.dataset.nodeKey === dragged) return null;
      return {
        type: "reorder",
        element: nearest,
        key: nearest.dataset.nodeKey ?? "",
        position: horizontal(nearest, event.clientX),
      };
    }
    const item = element.closest<HTMLElement>("li");
    if (item && root.contains(item))
      return { type: "list", element: item, position: vertical(item, event.clientY) };
    let block: Element | null = element;
    while (block && block.parentElement !== root) block = block.parentElement;
    if (!block) {
      block =
        [...root.children].sort((a, b) => {
          const distance = (child: Element) => {
            const rect = child.getBoundingClientRect();
            return Math.min(
              Math.abs(event.clientY - rect.top),
              Math.abs(event.clientY - rect.bottom),
            );
          };
          return distance(a) - distance(b);
        })[0] ?? null;
    }
    if (!(block instanceof HTMLElement)) return null;
    const position = vertical(block, event.clientY);
    if (position === "before" && block.previousElementSibling instanceof HTMLElement)
      return { type: "block", element: block.previousElementSibling, position: "after" };
    return { type: "block", element: block, position };
  };
  const dragover = (event: DragEvent) => {
    if (!dragged) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      clear();
      const target = resolve(event);
      if (!target) return;
      const axis = target.type === "gallery" || target.type === "reorder" ? "side" : "line";
      target.element.setAttribute("data-drop", `${axis}-${target.position}`);
    });
  };
  const $drop = (key: string, target: DropTarget) => {
    const node = $getNodeByKey(key);
    if (!$isAttachmentNode(node) && !(node instanceof EmbedNode)) return;
    if (target.type === "gallery" || target.type === "reorder") {
      const other = $getNodeByKey(target.key);
      if (
        !$isAttachmentNode(other) ||
        other.is(node) ||
        !$isAttachmentNode(node) ||
        !node.galleryImage
      )
        return;
      node.remove();
      if (target.type === "gallery") $galleryFor(other);
      if (target.position === "before") other.insertBefore(node);
      else other.insertAfter(node);
    } else if (target.type === "list") {
      const item = $getNearestNodeFromDOMNode(target.element);
      const list = item?.getParent();
      if (!$isListItemNode(item) || !$isListNode(list)) return;
      const children = list.getChildren();
      const index =
        children.findIndex((child) => child.is(item)) + (target.position === "after" ? 1 : 0);
      node.remove();
      if (index === 0) list.insertBefore(node);
      else if (index >= children.length) list.insertAfter(node);
      else $splitNode(list, index)[1]?.insertBefore(node);
    } else {
      const found = $getNearestNodeFromDOMNode(target.element);
      const block = found?.getTopLevelElement() ?? found;
      if (!block || block.is(node)) return;
      node.remove();
      if (target.position === "before") block.insertBefore(node);
      else block.insertAfter(node);
    }
    // No selection, so no second step in the history for it.
    $setSelection(null);
  };
  return mergeRegister(
    editor.registerCommand(
      DRAGSTART_COMMAND,
      (event) => {
        const figure = (event.target as Element | null)?.closest?.("figure[data-node-key]");
        if (!(figure instanceof HTMLElement) || (event.target as Element).closest("textarea"))
          return false;
        dragged = figure.dataset.nodeKey ?? null;
        if (!dragged || !event.dataTransfer) return false;
        event.dataTransfer.setData(dragType, dragged);
        event.dataTransfer.effectAllowed = "move";
        requestAnimationFrame(() => figure.setAttribute("data-dragging", ""));
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      DROP_COMMAND,
      (event) => {
        if (!dragged) return false;
        event.preventDefault();
        const target = resolve(event);
        const key = dragged;
        cleanup();
        if (target) $drop(key, target);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerRootListener((root) => {
      if (!root) return;
      root.addEventListener("dragover", dragover);
      root.addEventListener("dragend", cleanup);
      return () => {
        root.removeEventListener("dragover", dragover);
        root.removeEventListener("dragend", cleanup);
      };
    }),
    cleanup,
  );
}

/** Marks the box while files are being dragged over it. */
function registerDragOver(editor: LexicalEditor) {
  return editor.registerRootListener((root) => {
    if (!root) return;
    let count = 0;
    const box = () => root.closest(".x-govuk-ui-editor");
    const external = (event: DragEvent) =>
      event.dataTransfer?.types.includes("Files") && !event.dataTransfer.types.includes(dragType);
    const enter = (event: DragEvent) => {
      if (!external(event)) return;
      count++;
      box()?.setAttribute("data-drag-over", "");
    };
    const leave = (event: DragEvent) => {
      if (!external(event)) return;
      count = Math.max(0, count - 1);
      if (count === 0) box()?.removeAttribute("data-drag-over");
    };
    const drop = () => {
      count = 0;
      box()?.removeAttribute("data-drag-over");
    };
    root.addEventListener("dragenter", enter);
    root.addEventListener("dragleave", leave);
    root.addEventListener("drop", drop);
    return () => {
      root.removeEventListener("dragenter", enter);
      root.removeEventListener("dragleave", leave);
      root.removeEventListener("drop", drop);
    };
  });
}
