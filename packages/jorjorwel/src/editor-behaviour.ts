import { $isCodeHighlightNode, CodeNode } from "@lexical/code-core";
import { $isLinkNode } from "@lexical/link";
import { $isListItemNode, ListItemNode, ListNode } from "@lexical/list";
import { $isHeadingNode, $isQuoteNode, QuoteNode } from "@lexical/rich-text";
import { $getNearestNodeOfType, IS_APPLE, mergeRegister } from "@lexical/utils";
import {
  $addUpdateTag,
  $createLineBreakNode,
  $createParagraphNode,
  $createRangeSelectionFromDom,
  $findMatchingParent,
  $getNearestNodeFromDOMNode,
  $getRoot,
  $getSelection,
  $hasUpdateTag,
  $isDecoratorNode,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  $onUpdate,
  $setSelection,
  $splitNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_NORMAL,
  DELETE_CHARACTER_COMMAND,
  HISTORY_MERGE_TAG,
  INDENT_CONTENT_COMMAND,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  isDOMNode,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  OUTDENT_CONTENT_COMMAND,
  ParagraphNode,
  RootNode,
  SELECTION_CHANGE_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  TextNode,
} from "lexical";
import {
  $createNodeSelectionWith,
  $isBlankNode,
  $isCursorOnLastLine,
  $isListItemEmpty,
  $normalizeBlockContainerSelection,
  $singleSelectedNode,
  $trimTrailingBlankNodes,
} from "./editor-commands";
import type { EditorLabels } from "./editor-controls";
import { $isProvisionalParagraphNode, ProvisionalParagraphNode } from "./editor-nodes";

// How the editor behaves as users write, after Lexxy's extensions. Each is registered on the
// Lexical editor, and each returns its own function to unregister it.

/** Ctrl or Cmd with Enter is left to the page, such as to send a form. One line takes no Enter. */
export function registerEnter(editor: LexicalEditor, multiLine: boolean) {
  return editor.registerCommand(
    KEY_ENTER_COMMAND,
    (event) => {
      if (!event) return false;
      if (event.ctrlKey || event.metaKey || !multiLine) {
        event.preventDefault();
        return true;
      }
      return false;
    },
    COMMAND_PRIORITY_NORMAL,
  );
}

// Moving around decorators, such as attachments and dividers, which the caret cannot go into.

function $collapsedAnchor() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  return { node: selection.anchor.getNode(), offset: selection.anchor.offset };
}

function $nextSiblingUp(node: LexicalNode | null) {
  let current = node;
  while (current && current.getNextSibling() === null) current = current.getParent();
  return current?.getNextSibling() ?? null;
}

function $previousSiblingUp(node: LexicalNode | null) {
  let current = node;
  while (current && current.getPreviousSibling() === null) current = current.getParent();
  return current?.getPreviousSibling() ?? null;
}

/** The node just after the caret, if the caret is at the end of what it is in. */
function $nodeAfterCaret() {
  const at = $collapsedAnchor();
  if (!at) return null;
  const { node, offset } = at;
  if ($isTextNode(node)) {
    if (offset !== node.getTextContentSize()) return null;
    const next = node.getNextSibling();
    if ($isDecoratorNode(next)) return next;
    if (next) return null;
    return node.getParent()?.getNextSibling() ?? null;
  }
  if ($isElementNode(node))
    return offset < node.getChildrenSize() ? node.getChildAtIndex(offset) : $nextSiblingUp(node);
  return $nextSiblingUp(node);
}

/** The node just before the caret, if the caret is at the start of what it is in. */
function $nodeBeforeCaret() {
  const at = $collapsedAnchor();
  if (!at) return null;
  const { node, offset } = at;
  if ($isTextNode(node)) {
    if (offset !== 0) return null;
    const previous = node.getPreviousSibling();
    if ($isDecoratorNode(previous)) return previous;
    if (previous) return null;
    return node.getParent()?.getPreviousSibling() ?? null;
  }
  if ($isElementNode(node))
    return offset > 0 ? node.getChildAtIndex(offset - 1) : $previousSiblingUp(node);
  return $previousSiblingUp(node);
}

/** The edge of the selection's DOM range, for telling which line of a block the caret is on. */
function caretRect(editor: LexicalEditor) {
  const selection = editor.getRootElement()?.ownerDocument.getSelection();
  if (!selection?.rangeCount) return null;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return rect.width === 0 && rect.height === 0 ? null : rect;
}

/** Whether the caret is on the first or last line of the block it is in, as it is drawn. */
function $onEdgeLine(editor: LexicalEditor, node: LexicalNode, edge: "first" | "last") {
  const top = node.getTopLevelElement();
  const element = top && editor.getElementByKey(top.getKey());
  if (!element) return false;
  const caret = caretRect(editor);
  if (!caret) return false;
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let text: Text | null = null;
  if (edge === "first") text = walker.nextNode() as Text | null;
  else while (walker.nextNode()) text = walker.currentNode as Text;
  if (!text?.length) return false;
  const range = element.ownerDocument.createRange();
  range.setStart(text, edge === "first" ? 0 : text.length - 1);
  range.setEnd(text, edge === "first" ? 1 : text.length);
  const rect = range.getBoundingClientRect();
  return Math.abs(caret.top - rect.top) < (rect.height > 0 ? rect.height / 2 : 5);
}

function $topLevelBeforeCaret(editor: LexicalEditor) {
  const at = $collapsedAnchor();
  if (!at) return null;
  const { node, offset } = at;
  if ($isTextNode(node)) {
    if (offset === 0) return $nodeBeforeCaret();
    return $onEdgeLine(editor, node, "first")
      ? (node.getTopLevelElement()?.getPreviousSibling() ?? null)
      : null;
  }
  return $nodeBeforeCaret();
}

function $topLevelAfterCaret(editor: LexicalEditor) {
  const at = $collapsedAnchor();
  if (!at) return null;
  const { node, offset } = at;
  if ($isTextNode(node)) {
    if (offset === node.getTextContentSize()) return $nodeAfterCaret();
    return $onEdgeLine(editor, node, "last")
      ? (node.getTopLevelElement()?.getNextSibling() ?? null)
      : null;
  }
  return $nodeAfterCaret();
}

/**
 * Selects a whole decorator, as a node selection. A move that changes only the selection takes no
 * step in the history, but a move that deletes as it goes does.
 */
function $selectDecorator(node: LexicalNode | null, move = true) {
  if (!$isDecoratorNode(node)) return false;
  if (move) $addUpdateTag(HISTORY_MERGE_TAG);
  $setSelection($createNodeSelectionWith(node));
  return true;
}

/**
 * With the caret beside a decorator, the arrow keys select it, and from a selected decorator they
 * move on. Backspace and Delete select a decorator before they remove it, so nothing is removed by
 * surprise.
 */
export function registerDecoratorSelection(editor: LexicalEditor) {
  // An arrow key, without Shift, moves on from a wholly selected node, or selects the decorator
  // beside the caret. With Shift, it extends the selection, which is left to Lexical.
  const arrow =
    (moveFrom: (node: LexicalNode) => void, beside: () => LexicalNode | null) =>
    (event: KeyboardEvent | null): boolean => {
      if (!event || event.shiftKey) return false;
      const node = $singleSelectedNode();
      let handled: boolean;
      if (node) {
        moveFrom(node);
        handled = true;
      } else handled = $selectDecorator(beside());
      if (handled) event.preventDefault();
      return handled;
    };
  return mergeRegister(
    editor.registerCommand(
      KEY_ARROW_LEFT_COMMAND,
      arrow((node) => node.selectPrevious(), $nodeBeforeCaret),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      arrow((node) => node.selectNext(0, 0), $nodeAfterCaret),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      arrow(
        (node) => (node.getTopLevelElement() ?? node).selectPrevious(),
        () => $topLevelBeforeCaret(editor),
      ),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      arrow(
        (node) => (node.getTopLevelElement() ?? node).selectNext(0, 0),
        () => $topLevelAfterCaret(editor),
      ),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      (backwards) => {
        if (backwards && $removeEmptyListItem()) return true;
        const node = backwards ? $nodeBeforeCaret() : $nodeAfterCaret();
        if (!$isDecoratorNode(node)) return false;
        if ($collapseListItemToParagraph(node)) return true;
        const anchor = $getSelection()?.getNodes()[0];
        if ($isElementNode(anchor) && anchor.isEmpty() && !$isRootOrShadowRoot(anchor))
          anchor.remove();
        return $selectDecorator(node, false);
      },
      COMMAND_PRIORITY_LOW,
    ),
    // Typing while a node is wholly selected, such as an attachment or a divider, types after it.
    // Lexical ignores the keys, and the browser has no caret in text to type at. The letters would
    // be lost, or would go in at the document's start where something has put the browser's caret
    // in the text without a press. A character is therefore put in after the node here. Firefox
    // would lose a character typed at a caret moved as its key went down. A dead key or an input
    // method types for itself, at the caret moved after the node.
    editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (!typesText(event)) return false;
        // AltGr, which Windows reports as Ctrl and Alt, types characters such as @ and €. Alt on a
        // Mac also types, but elsewhere it is a shortcut, such as a menu's.
        const altGraph = event.getModifierState("AltGraph");
        if (
          event.metaKey ||
          (event.ctrlKey && !altGraph) ||
          (event.altKey && !altGraph && !IS_APPLE)
        )
          return false;
        const node = $singleSelectedNode();
        if (!node) return false;
        $caretAfter(node);
        if ([...event.key].length !== 1) return false;
        event.preventDefault();
        // In an update of its own, once the caret's move is done, so it is one step in the history
        // with the letters typed after it, as typing in a new line is.
        const text = event.key;
        $onUpdate(() =>
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) selection.insertText(text);
          }),
        );
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    // A press on text after an attachment was selected puts the caret where the press was. Lexical
    // would leave no selection.
    editor.registerCommand(
      CLICK_COMMAND,
      () => {
        if ($isRangeSelection($getSelection())) return false;
        const root = editor.getRootElement();
        const dom = root?.ownerDocument.getSelection() ?? null;
        const anchor = dom?.anchorNode;
        if (!root || !dom || !anchor || !root.contains(anchor)) return false;
        const element = anchor instanceof Element ? anchor : anchor.parentElement;
        if (element?.closest('[contenteditable="false"]')) return false;
        const range = $createRangeSelectionFromDom(dom, editor);
        if (!range) return false;
        // The browser's selection is already where the press was, so it is not set again. Setting
        // it again would swallow the next key that moves it.
        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
        $setSelection(range);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    ),
    // After Tab has taken focus to the toolbar, or to another field, a selection change would pull
    // focus back if it were drawn. It is drawn only when the editor is being given focus.
    editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        // Lexical tags the update that gives the editor focus "focus", but does not export the tag.
        if ($hasUpdateTag("focus")) return false;
        const root = editor.getRootElement();
        const active = root?.ownerDocument.activeElement;
        if (root && active && active !== root.ownerDocument.body && !root.contains(active))
          $addUpdateTag(SKIP_DOM_SELECTION_TAG);
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    ),
    // Chrome sends the caret out of the editor when Up is pressed on Lexical's own caret beside a
    // decorator at the top. It goes to whatever is above. Down at the bottom sends it below.
    editor.registerRootListener((root) => {
      if (!root) return;
      const keydown = (event: KeyboardEvent) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        const caret = root.querySelector("[data-lexical-cursor]");
        if (!caret) return;
        const step = (element: Element | null) =>
          event.key === "ArrowUp" ? element?.previousElementSibling : element?.nextElementSibling;
        let sibling = step(caret);
        while (sibling?.hasAttribute("data-lexical-cursor")) sibling = step(sibling);
        if (!sibling) event.preventDefault();
      };
      root.addEventListener("keydown", keydown, true);
      return () => root.removeEventListener("keydown", keydown, true);
    }),
  );
}

/**
 * Lexical removes the browser's selection while a node is wholly selected, so a screen reader reads
 * whatever is beside it. The selection is put on a hidden label inside the node instead, which says
 * what the node is. It uses the node's own `label`, as an attachment, an embed and a mention have,
 * so a node of yours with a `label` is named too. An attachment with nothing said of it is named
 * as an attachment.
 * @internal
 */
export function registerSelectionLabel(editor: LexicalEditor, labels: () => EditorLabels) {
  const label = document.createElement("span");
  label.className = "x-govuk-ui-editor-fake-selection";
  // The node the selection was last put on. The selection is put there once, as the node is
  // selected, and never pulled back from where the user has since moved it.
  let parked: string | null = null;
  return mergeRegister(
    editor.registerUpdateListener(({ editorState }) => {
      const target = editorState.read(
        () => {
          const node = $singleSelectedNode();
          if (!node || !("label" in node) || typeof node.label !== "string") return null;
          return { key: node.getKey(), label: node.label };
        },
        { editor },
      );
      const container = target && editor.getElementByKey(target.key);
      if (!target || !container) {
        label.remove();
        parked = null;
        return;
      }
      const text = target.label || labels().attachment;
      if (label.textContent !== text) label.textContent = text;
      if (label.parentNode !== container) container.append(label);
      const root = editor.getRootElement();
      if (parked === target.key || !root || root.ownerDocument.activeElement !== root) return;
      const node = label.firstChild;
      if (!node) return;
      parked = target.key;
      const range = root.ownerDocument.createRange();
      range.setStart(node, 0);
      range.setEnd(node, text.length);
      const selection = root.ownerDocument.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }),
    () => label.remove(),
  );
}

/**
 * Whether a key types. It does for a character, a dead key that starts one, or a key an input
 * method takes, as a phone's keyboard sends every key.
 */
function typesText(event: KeyboardEvent) {
  return (
    [...event.key].length === 1 ||
    event.key === "Dead" ||
    event.isComposing ||
    event.keyCode === 229
  );
}

/** Whether a node contains a line of text, as a paragraph, heading or list item does. @internal */
export function $holdsText(node: LexicalNode | null) {
  return (
    $isParagraphNode(node) || $isHeadingNode(node) || $isQuoteNode(node) || $isListItemNode(node)
  );
}

/**
 * Puts the caret after a wholly selected node, where typing continues. After a node in a line, such
 * as a mention, that is the same line. After a block, such as an attachment, a divider or an
 * image's gallery, it is the empty line already there, or a new one. The letters then start a line
 * of their own, instead of joining the next. @internal
 */
export function $caretAfter(node: LexicalNode) {
  const parent = node.getParent();
  if (node.isInline() && $holdsText(parent)) {
    node.selectNext(0, 0);
    return;
  }
  const block = node.isInline() && parent ? parent : node;
  const next = block.getNextSibling();
  if ($isParagraphNode(next) && next.isEmpty()) {
    next.selectStart();
    return;
  }
  // A line of its own would not belong inside a list item, for example, so the caret moves on.
  if (!$isRootOrShadowRoot(block.getParent())) {
    block.selectNext(0, 0);
    return;
  }
  const line = $createParagraphNode();
  block.insertAfter(line);
  line.select();
}

/**
 * Backspace in an empty list item with items after it removes it, and the caret goes to the end
 * of the item before, instead of the item becoming a paragraph above the list. At the top of a
 * list, it becomes a paragraph above the list, as users expect. Inside a quotation, it is removed.
 */
function $removeEmptyListItem() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const item = $getNearestNodeOfType(selection.anchor.getNode(), ListItemNode);
  if (!item || !$isListItemEmpty(item)) return false;
  const next = item.getNextSibling();
  const list = $getNearestNodeOfType(item, ListNode);
  if (!next || !list) return false;
  const previous = item.getPreviousSibling();
  if (previous) previous.selectEnd();
  else if ($isQuoteNode(list.getParent())) next.selectStart();
  else {
    const paragraph = $createParagraphNode();
    list.insertBefore(paragraph);
    paragraph.selectStart();
  }
  item.remove();
  return true;
}

/**
 * Backspace at the start of a list that follows an attachment makes the item a paragraph. It does
 * not select the attachment. A list after an attachment can then be undone.
 */
function $collapseListItemToParagraph(decorator: LexicalNode) {
  const anchor = $getSelection()?.getNodes()[0];
  const item = anchor && $getNearestNodeOfType(anchor, ListItemNode);
  if (!item || item.isParentOf(decorator)) return false;
  const list = $getNearestNodeOfType(item, ListNode);
  if (!list) return false;
  const paragraph = $createParagraphNode().append(...item.getChildren());
  list.insertBefore(paragraph);
  if (list.getChildrenSize() === 1) list.remove();
  else item.remove();
  paragraph.selectStart();
  return true;
}

/**
 * The keys that format as users type. Right at the end of inline code leaves the code. Tab indents
 * a list item, and Shift Tab lifts a nested one. Enter in a quotation of paragraphs finds a
 * paragraph to go in.
 */
export function registerKeys(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      KEY_ARROW_RIGHT_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        if (!selection.hasFormat("code")) return false;
        const anchor = selection.anchor.getNode();
        if ($getNearestNodeOfType(anchor, CodeNode)) return false;
        if (!$isTextNode(anchor) || selection.anchor.offset !== anchor.getTextContentSize())
          return false;
        if (anchor.getNextSibling() !== null) return false;
        event?.preventDefault();
        selection.toggleFormat("code");
        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    ),
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;
        const anchor = selection.anchor.getNode();
        if (!$getNearestNodeOfType(anchor, ListItemNode)) return false;
        const list = $getNearestNodeOfType(anchor, ListNode);
        const nested = list?.getParent() && $isListItemNode(list.getParent());
        if (event.shiftKey && !nested) return false;
        event.preventDefault();
        return editor.dispatchCommand(
          event.shiftKey ? OUTDENT_CONTENT_COMMAND : INDENT_CONTENT_COMMAND,
          undefined,
        );
      },
      COMMAND_PRIORITY_NORMAL,
    ),
    editor.registerCommand(
      INSERT_LINE_BREAK_COMMAND,
      () => {
        $normalizeBlockContainerSelection();
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        $normalizeBlockContainerSelection();
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    // Lexical keeps the code format on the caret after the last code character is deleted, so what
    // is typed next would be code. The format is removed once no code text remains.
    editor.registerUpdateListener(({ editorState, tags }) => {
      if (tags.has(HISTORY_MERGE_TAG) || tags.has(SKIP_DOM_SELECTION_TAG)) return;
      const stale = editorState.read(() => {
        const selection = $getSelection();
        if (
          !$isRangeSelection(selection) ||
          !selection.isCollapsed() ||
          !selection.hasFormat("code")
        )
          return false;
        const anchor = selection.anchor.getNode();
        return (
          !$getNearestNodeOfType(anchor, CodeNode) &&
          !($isTextNode(anchor) && anchor.hasFormat("code"))
        );
      });
      if (!stale) return;
      setTimeout(() =>
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && selection.hasFormat("code")) {
            const anchor = selection.anchor.getNode();
            if (!($isTextNode(anchor) && anchor.hasFormat("code"))) selection.toggleFormat("code");
          }
        }),
      );
    }),
  );
}

/**
 * Leaving a quotation and a code block as users expect. Enter on a blank line in a quotation
 * leaves it, splitting it if lines follow, and Enter at its start puts a paragraph before it. Down
 * on a code block's last line, with nothing after it, adds a paragraph to go to.
 */
export function registerEscapes(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => $escapeBeforeQuote() || $escapeBlankQuoteLine(),
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const code = $getNearestNodeOfType(selection.anchor.getNode(), CodeNode);
        if (!code || code.getNextSibling() || !$isCursorOnLastLine(selection)) return false;
        event?.preventDefault();
        const paragraph = $createParagraphNode();
        code.insertAfter(paragraph);
        paragraph.selectEnd();
        return true;
      },
      COMMAND_PRIORITY_NORMAL,
    ),
    editor.registerNodeTransform(QuoteNode, (quote) => {
      if (!quote.isEmpty()) return;
      const paragraph = $createParagraphNode();
      quote.append(paragraph);
      const selection = $getSelection();
      if ($isRangeSelection(selection) && quote.isParentOf(selection.anchor.getNode()))
        paragraph.select();
    }),
  );
}

function $escapeBeforeQuote() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed() || selection.anchor.offset !== 0)
    return false;
  const paragraph = $getNearestNodeOfType(selection.anchor.getNode(), ParagraphNode);
  if (!paragraph || $isBlankNode(paragraph) || paragraph.getPreviousSibling()) return false;
  const quote = paragraph.getParent();
  if (!$isQuoteNode(quote)) return false;
  quote.insertBefore($createParagraphNode());
  return true;
}

function $escapeBlankQuoteLine() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;
  const paragraph = $getNearestNodeOfType(selection.anchor.getNode(), ParagraphNode);
  if (!paragraph || !$isBlankNode(paragraph)) return false;
  const quote = paragraph.getParent();
  if (!$isQuoteNode(quote)) return false;
  const following = paragraph.getNextSiblings().filter((sibling) => !$isBlankNode(sibling));
  if (following.length > 0) {
    const parts = $splitNode(quote, paragraph.getIndexWithinParent());
    parts[0]?.insertAfter(paragraph);
    for (const part of parts) if (part) $trimTrailingBlankNodes(part);
    paragraph.selectEnd();
  } else {
    quote.insertAfter(paragraph);
    paragraph.selectStart();
  }
  return true;
}

/** Puts in and takes out the provisional paragraphs the caret needs between blocks. */
export function registerProvisionalParagraphs(editor: LexicalEditor) {
  const $all = () => $getRoot().getChildren().filter($isProvisionalParagraphNode);
  return mergeRegister(
    editor.registerNodeTransform(RootNode, (root) => {
      const selection = $getSelection();
      const anchor = $isRangeSelection(selection) ? selection.anchor : null;
      const beforeCaret =
        anchor && $isRootOrShadowRoot(anchor.getNode())
          ? root.getChildAtIndex(anchor.offset - 1)
          : null;
      if (ProvisionalParagraphNode.neededBetween(null, root.getFirstChild()))
        root.getFirstChild()?.insertBefore(new ProvisionalParagraphNode());
      for (const node of root.getChildren()) {
        if (!ProvisionalParagraphNode.neededBetween(node, node.getNextSibling())) continue;
        node.insertAfter(new ProvisionalParagraphNode());
        if (beforeCaret && node.is(beforeCaret)) node.selectNext();
      }
      for (const paragraph of $all()) paragraph.removeUnlessRequired();
    }),
    // Whether one shows depends on the selection. The selection changes without the document
    // changing, so this is drawn only on the page. Marking the paragraphs as changed would merge
    // each edit's step in the history into the step before. Lexical reports a new selection in the
    // update that made it.
    editor.registerUpdateListener(({ editorState }) =>
      editorState.read(
        () => {
          const selection = $getSelection();
          for (const paragraph of $all())
            editor
              .getElementByKey(paragraph.getKey())
              ?.toggleAttribute("data-hidden", !paragraph.isSelected(selection));
        },
        { editor },
      ),
    ),
  );
}

/**
 * A line separator in text, such as the one macOS text replacement types, becomes a line break. A
 * separator inside text would survive nowhere else.
 */
export function registerLineSeparators(editor: LexicalEditor) {
  const separators = /\r\n|[\n\r\u2028\u2029]/;
  return editor.registerNodeTransform(TextNode, (node) => {
    if ($isCodeHighlightNode(node) || $getNearestNodeOfType(node, CodeNode)) return;
    const match = node.getTextContent().match(separators);
    if (!match || match.index === undefined) return;
    const parts =
      match.index === 0
        ? node.splitText(match[0].length)
        : node.splitText(match.index, match.index + match[0].length);
    const separator = match.index === 0 ? parts[0] : parts[1];
    separator?.replace($createLineBreakNode());
  });
}

/**
 * Cmd or Ctrl with a press opens a link in the document in a new tab, as does the middle button.
 * While the key is held, the box is marked, so its stylesheet can show that links can be opened.
 */
export function registerLinkOpener(editor: LexicalEditor, box: () => HTMLElement | null) {
  const modified = (event: MouseEvent | KeyboardEvent) =>
    IS_APPLE ? event.metaKey : event.ctrlKey;
  const $open = (target: EventTarget | null) => {
    if (!isDOMNode(target)) return false;
    const node = $getNearestNodeFromDOMNode(target);
    const link = node && $findMatchingParent(node, $isLinkNode);
    if (!link) return false;
    window.open(link.sanitizeUrl(link.getURL()), "_blank", "noopener,noreferrer");
    return true;
  };
  const mark = (event: KeyboardEvent | MouseEvent) =>
    box()?.toggleAttribute("data-links-openable", modified(event));
  window.addEventListener("keydown", mark);
  window.addEventListener("keyup", mark);
  return mergeRegister(
    editor.registerCommand(
      CLICK_COMMAND,
      (event) => modified(event) && $open(event.target),
      COMMAND_PRIORITY_NORMAL,
    ),
    editor.registerRootListener((root) => {
      if (!root) return;
      const auxclick = (event: MouseEvent) => {
        if (event.button === 1) editor.read(() => $open(event.target));
      };
      root.addEventListener("auxclick", auxclick);
      return () => root.removeEventListener("auxclick", auxclick);
    }),
    () => {
      window.removeEventListener("keydown", mark);
      window.removeEventListener("keyup", mark);
    },
  );
}

/**
 * Lexical selects a whole block on a triple press, which breaks headings and table cells. The
 * browser's own selection, of the pressed paragraph, is kept instead.
 */
export function registerTripleClick(editor: LexicalEditor) {
  return editor.registerRootListener((root) => {
    if (!root) return;
    const click = (event: MouseEvent) => {
      if (event.detail === 3) event.stopPropagation();
    };
    root.addEventListener("click", click, true);
    return () => root.removeEventListener("click", click, true);
  });
}
