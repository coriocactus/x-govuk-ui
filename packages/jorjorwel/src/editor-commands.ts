import { $createCodeNode, $isCodeNode, CodeNode } from "@lexical/code-core";
import { $createAutoLinkNode, $isLinkNode, $toggleLink, LinkNode } from "@lexical/link";
import {
  $createListItemNode,
  $createListNode,
  $getListDepth,
  $isListItemNode,
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  type ListType,
} from "@lexical/list";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
  QuoteNode,
} from "@lexical/rich-text";
import {
  $ensureForwardRangeSelection,
  $forEachSelectedTextNode,
  $getSelectionStyleValueForProperty,
  $isAtNodeEnd,
  $patchStyleText,
  $setBlocksType,
} from "@lexical/selection";
import { $getTableCellNodeFromLexicalNode } from "@lexical/table";
import {
  $findMatchingParent,
  $getNearestBlockElementAncestorOrThrow,
  $getNearestNodeOfType,
  $lastToFirstIterator,
  $wrapNodeInElement,
} from "@lexical/utils";
import {
  $caretFromPoint,
  $createLineBreakNode,
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getCaretInDirection,
  $getCaretRange,
  $getChildCaret,
  $getRoot,
  $getSelection,
  $getSiblingCaret,
  $isChildCaret,
  $isDecoratorNode,
  $isElementNode,
  $isExtendableTextPointCaret,
  $isLineBreakNode,
  $isNodeSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isRootNode,
  $isRootOrShadowRoot,
  $isSiblingCaret,
  $isTextNode,
  $isTextPointCaret,
  $normalizeCaret,
  $normalizeSelection__EXPERIMENTAL as $normalizeSelection,
  $rewindSiblingCaret,
  $setSelectionFromCaretRange,
  $splitAtPointCaretNext,
  $splitNode,
  type BaseSelection,
  type CaretDirection,
  type ElementNode,
  FORMAT_TEXT_COMMAND,
  getStyleObjectFromCSS,
  type LexicalEditor,
  type LexicalNode,
  type PointCaret,
  type PointType,
  type RangeSelection,
  type SiblingCaret,
} from "lexical";

// The editing commands, and what the toolbar reads of the selection, after Lexxy's. Each runs
// inside one of the editor's updates.

/** What the selection is in, for the toolbar's pressed controls. */
export type EditorFormat = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  subscript: boolean;
  superscript: boolean;
  highlight: boolean;
  link: boolean;
  quote: boolean;
  /** The heading's tag, such as "h2", where the caret is in one. */
  heading: HeadingTagType | null;
  list: ListType | null;
  /** Whether the list is inside another, so Shift Tab can lift it. */
  nested: boolean;
  codeBlock: boolean;
  table: boolean;
  /** The text's colours where the caret is, and the address of the link it is in. */
  colour: string | null;
  background: string | null;
  href: string | null;
};

export const noFormat: EditorFormat = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  subscript: false,
  superscript: false,
  highlight: false,
  link: false,
  quote: false,
  heading: null,
  list: null,
  nested: false,
  codeBlock: false,
  table: false,
  colour: null,
  background: null,
  href: null,
};

/** The list the node is in, if it is in one. */
export function $listTypeOf(node: LexicalNode): ListType | null {
  return $getNearestNodeOfType(node, ListNode)?.getListType() ?? null;
}

/** The heading the node is in, at the top of the document or inside a quotation. */
function $headingOf(node: LexicalNode) {
  return $findMatchingParent(node, $isHeadingNode);
}

/**
 * Whether the selection is in code. Lexical keeps the code format on a selection after its last
 * code character is deleted, so the format counts only where code text or a code block is there.
 */
function $isInCode(selection: RangeSelection, anchor: LexicalNode) {
  if ($getNearestNodeOfType(anchor, CodeNode)) return true;
  if (!selection.hasFormat("code")) return false;
  return $isTextNode(anchor) && anchor.hasFormat("code");
}

/** The selection's formatting, for the toolbar. */
export function $readFormat(): EditorFormat {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return noFormat;
  const anchor = selection.anchor.getNode();
  if (!anchor.getParent() && !$isRootNode(anchor)) return noFormat;
  const top = $isRootNode(anchor) ? null : anchor.getTopLevelElement();
  const list = $listTypeOf(anchor);
  const listNode = $getNearestNodeOfType(anchor, ListNode);
  const link = $getNearestNodeOfType(anchor, LinkNode);
  const styles = $selectionStyles(selection);
  return {
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    strikethrough: selection.hasFormat("strikethrough"),
    underline: selection.hasFormat("underline"),
    code: $isInCode(selection, anchor),
    subscript: selection.hasFormat("subscript"),
    superscript: selection.hasFormat("superscript"),
    highlight: Boolean(styles.colour || styles.background),
    link: link !== null,
    quote: top !== null && $isQuoteNode(top),
    heading: $headingOf(anchor)?.getTag() ?? null,
    list,
    nested: listNode !== null && $getListDepth(listNode) > 1,
    codeBlock: $getNearestNodeOfType(anchor, CodeNode) !== null,
    table: $getTableCellNodeFromLexicalNode(anchor) !== null,
    colour: styles.colour,
    background: styles.background,
    href: link?.getURL() ?? null,
  };
}

/** The colours where the caret is, from the selection's own style, or from the text it sits in. */
function $selectionStyles(selection: RangeSelection) {
  let styles = getStyleObjectFromCSS(selection.style);
  if (!styles.color && !styles["background-color"]) {
    const anchor = selection.anchor.getNode();
    if ($isTextNode(anchor)) styles = getStyleObjectFromCSS(anchor.getStyle());
  }
  return { colour: styles.color || null, background: styles["background-color"] || null };
}

// Selections and nodes.

export function $createNodeSelectionWith(...nodes: LexicalNode[]) {
  const selection = $createNodeSelection();
  for (const node of nodes) selection.add(node.getKey());
  return selection;
}

/** The single node in a node selection, if it contains exactly one. */
export function $singleSelectedNode(): LexicalNode | null {
  const selection = $getSelection();
  if (!$isNodeSelection(selection)) return null;
  const nodes = selection.getNodes();
  return nodes.length === 1 ? (nodes[0] ?? null) : null;
}

/** A shadow root other than the document's own, such as a table cell. */
export function $isShadowRoot(node: LexicalNode | null | undefined): node is ElementNode {
  return $isElementNode(node) && $isRootOrShadowRoot(node) && !$isRootNode(node);
}

/** A node that can sit at the top of the document, or the parent it needs to sit there. */
export function $makeSafeForRoot(node: LexicalNode): LexicalNode {
  if (($isElementNode(node) || $isDecoratorNode(node)) && !node.isParentRequired()) return node;
  if (node.getParent()) return $wrapNodeInElement(node, () => node.createParentElementNode());
  return node.createParentElementNode().append(node);
}

export function $isAtNodeStart(point: PointType) {
  return point.offset === 0;
}

export function $isAtNodeEdge(point: PointType, atStart: boolean) {
  return atStart ? $isAtNodeStart(point) : $isAtNodeEnd(point);
}

/** Whether a node has nothing in it but white space and line breaks. */
export function $isBlankNode(node: LexicalNode): boolean {
  if (node.getTextContent().trim() !== "") return false;
  if (!$isElementNode(node)) return true;
  return node.getChildren().every((child) => $isLineBreakNode(child) || $isBlankNode(child));
}

export function $trimTrailingBlankNodes(parent: ElementNode) {
  for (const child of $lastToFirstIterator(parent)) {
    if (!$isBlankNode(child)) break;
    child.remove();
  }
}

/**
 * Whether a list item is empty. A decorator, such as a mention, counts as content, even though its
 * text may be invisible.
 */
export function $isListItemEmpty(item: ListItemNode) {
  return item.getChildren().every((child) => {
    if ($isDecoratorNode(child)) return false;
    if ($isLineBreakNode(child)) return true;
    return child.getTextContent().trim() === "";
  });
}

/** Whether the caret is on a block's last line, after its last line break. */
export function $isCursorOnLastLine(selection: RangeSelection) {
  const anchor = selection.anchor.getNode();
  const element = $isElementNode(anchor) ? anchor : anchor.getParentOrThrow();
  const children = element.getChildren();
  if (children.length === 0) return true;
  if (anchor.is(element) && selection.anchor.offset === children.length) return true;
  if (anchor.is(children.at(-1))) return true;
  let lastBreak = -1;
  children.forEach((child, index) => {
    if ($isLineBreakNode(child)) lastBreak = index;
  });
  if (lastBreak === -1) return true;
  return children.findIndex((child) => child.is(anchor)) > lastBreak;
}

/**
 * Lexical inserts at a point inside a block of inline content. A point on a block that contains
 * blocks, such as a quotation of paragraphs, has no inline content, so it is moved down to a leaf
 * first.
 */
export function $isPointOnBlockContainer(point: PointType) {
  if (point.type !== "element") return false;
  const first = point.getNode().getFirstChild();
  return ($isElementNode(first) || $isDecoratorNode(first)) && !first.isInline();
}

export function $normalizeBlockContainerSelection(
  selection: BaseSelection | null = $getSelection(),
) {
  if (!$isRangeSelection(selection)) return false;
  if (![selection.anchor, selection.focus].some($isPointOnBlockContainer)) return false;
  $normalizeSelection(selection);
  return true;
}

/** The text before an offset in a node, with blocks joined as Lexical joins them. */
export function $textBefore(target: LexicalNode, offset: number) {
  const parts: string[] = [];
  let done = false;
  const visit = (node: LexicalNode) => {
    if (done) return;
    if (node.is(target)) {
      parts.push(node.getTextContent().slice(0, offset));
      done = true;
      return;
    }
    if ($isElementNode(node)) {
      const children = node.getChildren();
      children.forEach((child, index) => {
        visit(child);
        if (!done && $isElementNode(child) && !child.isInline() && index < children.length - 1)
          parts.push("\n\n");
      });
    } else parts.push(node.getTextContent());
  };
  visit($getRoot());
  return parts.join("");
}

// Blocks.

/**
 * A selection's top-level blocks. A selection across a quotation and its paragraphs gives both,
 * so the ancestors are kept and the blocks inside them dropped.
 */
function $outermost<T extends LexicalNode>(nodes: T[]) {
  return nodes.filter((node) =>
    nodes.every((other) => other === node || !node.getParents().some((parent) => parent.is(other))),
  );
}

function $blocksIn(selection: RangeSelection) {
  return $blockRunsIn(selection).flat();
}

/**
 * The selection's blocks, in runs. A divider or an attachment at the top of the document is in no
 * block, so it ends a run. A command can then change the blocks on each side of it and leave it
 * where it is.
 */
function $blockRunsIn(selection: RangeSelection) {
  const runs: Set<ElementNode>[] = [new Set()];
  for (const node of selection.getNodes()) {
    if ($isRootOrShadowRoot(node)) continue;
    const block = $blockOf(node);
    if (block) runs.at(-1)?.add(block);
    else if (runs.at(-1)?.size) runs.push(new Set());
  }
  return runs.filter((run) => run.size > 0).map((run) => [...run]);
}

/** The block a node is, or is in. The root is no block. */
function $blockOf(node: LexicalNode) {
  return $findMatchingParent(
    node,
    (parent): parent is ElementNode => $isElementNode(parent) && !parent.isInline(),
  );
}

function $topLevelIn(selection: RangeSelection) {
  const elements = new Set<ElementNode>();
  for (const node of selection.getNodes()) {
    const top = node.getTopLevelElement();
    if ($isElementNode(top)) elements.add(top);
  }
  return [...elements];
}

/** Puts a node at the root when the caret is there, as in an empty document. */
function $insertIfAtRoot(node: ElementNode) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return false;
  const anchor = selection.anchor.getNode();
  if (!$isRootOrShadowRoot(anchor)) return false;
  anchor.append(node);
  node.selectEnd();
  return true;
}

/**
 * Moves a node's children out of it, with one paragraph for each run of loose text, and removes it.
 */
function $unwrap(node: ElementNode) {
  const children = node.getChildren();
  if (children.length === 0) node.insertBefore($createParagraphNode());
  for (const child of children) {
    if ($isTextNode(child) && child.getTextContent().trim() !== "") {
      node.insertBefore($createParagraphNode().append(child));
    } else if (!$isLineBreakNode(child)) node.insertBefore(child);
  }
  node.remove();
}

/**
 * Widens a selection to the lines around it, and splits a paragraph at the line breaks at its
 * edges. A block command then acts on the selected lines, not on the whole paragraph they share.
 */
export function $expandSelectionToLines(
  selection: RangeSelection,
  fallback: (node: LexicalNode) => LexicalNode | null = (node) => node.getTopLevelElement(),
) {
  $ensureForwardRangeSelection(selection);
  $shrinkPastBlockEdges(selection);
  const focusCaret = $caretFromPoint(selection.focus, "next");
  const anchorCaret = $caretFromPoint(selection.anchor, "previous");
  // A collapsed caret beside a line break would claim it from both sides.
  const outwardOnly = selection.isCollapsed();
  const focusBreak = $lineBreakBoundary(focusCaret, outwardOnly);
  let anchorBreak = $lineBreakBoundary(anchorCaret, outwardOnly);
  if (focusBreak && anchorBreak && focusBreak.origin.is(anchorBreak.origin)) anchorBreak = null;
  // The focus is split first, so the anchor's break stays where it was.
  const focusOuter = focusBreak && $splitAroundLineBreak(focusBreak);
  const anchorOuter = anchorBreak && $splitAroundLineBreak(anchorBreak);
  const start = anchorOuter?.getNextSibling() ?? fallback(selection.anchor.getNode());
  const end = focusOuter?.getPreviousSibling() ?? fallback(selection.focus.getNode());
  if (!$isElementNode(start) || !$isElementNode(end)) return;
  $setSelectionFromCaretRange(
    $getCaretRange(
      $normalizeCaret($getChildCaret(start, "next")),
      $getCaretInDirection($normalizeCaret($getChildCaret(end, "previous")), "next"),
    ),
  );
}

/**
 * Moves into the next block an end of the selection that sits against the edge of a block it
 * selects nothing of. The browser leaves such an end at the end of the line above a selected
 * paragraph.
 */
function $shrinkPastBlockEdges(selection: RangeSelection) {
  if (selection.isCollapsed()) return;
  const anchorBlock = selection.anchor.getNode().getTopLevelElement();
  const focusBlock = selection.focus.getNode().getTopLevelElement();
  if (!anchorBlock || !focusBlock || anchorBlock.is(focusBlock)) return;
  if ($atBlockBoundary($caretFromPoint(selection.anchor, "next"), anchorBlock)) {
    const next = $elementSibling(anchorBlock, "next");
    if (next) selection.anchor.set(next.getKey(), 0, "element");
  }
  if ($atBlockBoundary($caretFromPoint(selection.focus, "previous"), focusBlock)) {
    const previous = $elementSibling(focusBlock, "previous");
    if (previous) selection.focus.set(previous.getKey(), previous.getChildrenSize(), "element");
  }
  $ensureForwardRangeSelection(selection);
}

/** The nearest sibling that is an element, past decorators, which cannot take a selection. */
function $elementSibling(block: LexicalNode, direction: CaretDirection) {
  let sibling: LexicalNode | null = block;
  do sibling = direction === "next" ? sibling.getNextSibling() : sibling.getPreviousSibling();
  while (sibling && !$isElementNode(sibling));
  return sibling as ElementNode | null;
}

function $atBlockBoundary(caret: PointCaret<CaretDirection>, block: ElementNode) {
  if ($isTextPointCaret(caret) && $isExtendableTextPointCaret(caret)) return false;
  let cursor: PointCaret<CaretDirection> | null = $normalizeCaret(caret);
  while (cursor && block.isParentOf(cursor.origin)) {
    if (cursor.getNodeAtCaret()) return false;
    cursor = cursor.getParentCaret();
  }
  return true;
}

function $lineBreakBoundary(caret: PointCaret<CaretDirection>, outwardOnly: boolean) {
  const paragraph = caret.origin.getTopLevelElement();
  if (!paragraph || !$isParagraphNode(paragraph)) return null;
  const lineBreak =
    (outwardOnly ? null : $inwardEdgeLineBreak(caret, paragraph)) ??
    $outwardLineBreak(caret, paragraph);
  return lineBreak ? $getSiblingCaret(lineBreak, caret.direction) : null;
}

function $inwardEdgeLineBreak(caret: PointCaret<CaretDirection>, paragraph: ElementNode) {
  let candidate: SiblingCaret<LexicalNode, CaretDirection> | null;
  if (
    ($isChildCaret(caret) && caret.origin.is(paragraph)) ||
    ($isTextPointCaret(caret) && $isExtendableTextPointCaret(caret.getFlipped()))
  )
    candidate = null;
  else if ($isSiblingCaret(caret) && caret.getParentAtCaret()?.is(paragraph)) candidate = caret;
  else {
    const child = $childCaretAt(caret, paragraph, true);
    candidate = child
      ? ($rewindSiblingCaret(child) as SiblingCaret<LexicalNode, CaretDirection>)
      : null;
  }
  if (!candidate || !$isLineBreakNode(candidate.origin)) return null;
  return $isLineBreakNode(candidate.getNodeAtCaret()) ? null : candidate.origin;
}

function $outwardLineBreak(caret: PointCaret<CaretDirection>, paragraph: ElementNode) {
  const start = caret.getParentAtCaret()?.is(paragraph)
    ? caret
    : $childCaretAt(caret, paragraph, false);
  if (!start) return null;
  for (const { origin } of start as Iterable<{ origin: LexicalNode }>) {
    if (!origin.getParent()?.is(paragraph)) break;
    if ($isLineBreakNode(origin)) return origin;
  }
  return null;
}

/**
 * The caret among the paragraph's own children that contains the caret given. With `atEdge`, it is
 * found only when the caret sits against the inner edge of everything between.
 */
function $childCaretAt(caret: PointCaret<CaretDirection>, paragraph: ElementNode, atEdge: boolean) {
  let cursor: SiblingCaret<LexicalNode, CaretDirection> | null = caret.getSiblingCaret();
  while (cursor && !cursor.origin.getParent()?.is(paragraph)) {
    if (atEdge && cursor.getNodeAtCaret()) return null;
    cursor = cursor.getParentCaret() as SiblingCaret<LexicalNode, CaretDirection> | null;
  }
  return cursor?.origin.getParent()?.is(paragraph) ? cursor : null;
}

function $splitAroundLineBreak(caret: SiblingCaret<LexicalNode, CaretDirection>) {
  if (caret.getNodeAtCaret() === null) {
    caret.origin.remove();
    return null;
  }
  const lineBreak = caret.origin;
  $splitAtPointCaretNext($getCaretInDirection($rewindSiblingCaret(caret), "next"));
  const outer = lineBreak.getTopLevelElement();
  lineBreak.remove();
  return outer;
}

/** Splits each selected paragraph at its line breaks, one paragraph per line, as a list needs. */
function $splitParagraphsAtLineBreaks(selection: RangeSelection) {
  for (const element of $topLevelIn(selection)) {
    if (!$isParagraphNode(element)) continue;
    const children = element.getChildren();
    if (!children.some($isLineBreakNode)) continue;
    const groups: LexicalNode[][] = [[]];
    for (const child of children) {
      if ($isLineBreakNode(child)) {
        groups.push([]);
        child.remove();
      } else groups.at(-1)?.push(child);
    }
    for (const group of groups) {
      if (group.length === 0) continue;
      element.insertBefore($createParagraphNode().append(...group));
    }
    if (groups.some((group) => group.length > 0)) element.remove();
  }
}

/** Groups blocks into runs of adjacent siblings. */
function $consecutive(blocks: ElementNode[]) {
  const ordered = [...blocks].sort((a, b) => a.getIndexWithinParent() - b.getIndexWithinParent());
  const groups: ElementNode[][] = [];
  for (const block of ordered) {
    const last = groups.at(-1);
    const previous = last?.at(-1);
    if (previous?.getParent()?.is(block.getParent()) && previous.getNextSibling()?.is(block))
      last?.push(block);
    else groups.push([block]);
  }
  return groups;
}

// The commands.

export function $setParagraph() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  $expandSelectionToLines(selection, (node) => $getNearestBlockElementAncestorOrThrow(node));
  $setBlocksType(selection, () => $createParagraphNode());
}

export function $setHeading(tag: HeadingTagType) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  $expandSelectionToLines(selection);
  $setBlocksType(selection, () => $createHeadingNode(tag));
}

/** Removes the selection's formatting, including marks, colours, links, quotations and headings. */
export function $clearFormatting() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  $forEachSelectedTextNode((node) => {
    node.setFormat(0);
    node.setStyle("");
  });
  $toggleLink(null);
  for (const node of $topLevelIn(selection).filter($isQuoteNode)) $unwrap(node);
  $setBlocksType(selection, () => $createParagraphNode());
}

/** Puts a quotation around the selected blocks, or removes it when they are all quoted already. */
export function $toggleQuote() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  if ($insertIfAtRoot($createQuoteNode())) return;
  const top = $topLevelIn(selection);
  if (top.length > 0 && top.every($isQuoteNode)) {
    for (const node of top) $unwrap(node);
    return;
  }
  for (const node of top.filter($isQuoteNode)) $unwrap(node);
  $expandSelectionToLines(selection);
  // Each run of blocks between dividers or attachments has a quotation of its own, so a divider
  // stays where it was.
  for (const run of $consecutive($topLevelIn(selection))) {
    const quote = $createQuoteNode();
    run[0]?.insertBefore(quote);
    quote.append(...run);
  }
}

/**
 * Toggles code. It is inline code around words selected on one line, or a code block around the
 * selected lines. If they are code already, the code is removed.
 */
export function $toggleCode(editor: LexicalEditor) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  if ($selectsWordsOnOneLine(selection)) return $toggleInlineCode(editor, selection);
  $toggleCodeBlock();
}

export function $toggleInlineCode(editor: LexicalEditor, selection: RangeSelection) {
  if (!selection.isCollapsed()) {
    const texts = selection.getNodes().filter($isTextNode);
    // Code has one typeface, so the words lose their other formatting and become one code element.
    if (!texts.every((node) => node.hasFormat("code"))) $stripFormatting(selection, texts);
  }
  editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
}

function $stripFormatting(selection: RangeSelection, texts: LexicalNode[]) {
  const backward = selection.isBackward();
  const start = backward ? selection.focus : selection.anchor;
  const end = backward ? selection.anchor : selection.focus;
  texts.forEach((node, index) => {
    if (!$isTextNode(node) || node.getFormat() === 0) return;
    const first = index === 0;
    const last = index === texts.length - 1;
    const from = first && start.type === "text" ? start.offset : 0;
    const to = last && end.type === "text" ? end.offset : node.getTextContentSize();
    if (from === 0 && to === node.getTextContentSize()) {
      node.setFormat(0);
      return;
    }
    const parts = node.splitText(from, to);
    const target = from === 0 ? parts[0] : parts[1];
    if (!target) return;
    target.setFormat(0);
    if (first && start.type === "text") start.set(target.getKey(), 0, "text");
    if (last && end.type === "text") end.set(target.getKey(), to - from, "text");
  });
}

function $selectsWordsOnOneLine(selection: RangeSelection) {
  if (selection.isCollapsed()) return false;
  const anchor = selection.anchor.getNode();
  const focus = selection.focus.getNode();
  const top = anchor.getTopLevelElement();
  if (!top?.is(focus.getTopLevelElement())) return false;
  // Anchor and focus in two blocks of one quotation are two lines.
  const anchorBlock = $isElementNode(anchor) ? anchor : anchor.getParent();
  const focusBlock = $isElementNode(focus) ? focus : focus.getParent();
  if (anchorBlock && !anchorBlock.is(focusBlock) && !anchorBlock.is(top)) return false;
  return !selection.getNodes().some($isLineBreakNode);
}

export function $toggleCodeBlock() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  if ($insertIfAtRoot($createCodeNode())) return;
  const blocks = $blocksIn(selection);
  if (blocks.length > 0 && blocks.every($isCodeNode)) {
    for (const node of blocks) $unwrapCodeBlock(node as CodeNode);
    return;
  }
  $expandSelectionToLines(selection);
  // Each run of blocks between dividers or attachments becomes a code block of its own, so a
  // divider stays where it was.
  let code: CodeNode | null = null;
  for (const elements of $blockRunsIn(selection).map($outermost)) {
    const last = elements.at(-1);
    if (!last) continue;
    const block = $createCodeNode();
    last.insertAfter(block);
    // The lines become the code's text, with a line break between blocks.
    const lines = elements.map((element) => element.getTextContent());
    lines.forEach((line, index) => {
      if (index > 0) block.append($createLineBreakNode());
      if (line) block.append($createTextNode(line));
    });
    for (const element of elements) element.remove();
    code = block;
  }
  code?.selectEnd();
}

function $unwrapCodeBlock(code: CodeNode) {
  const lines = code.getTextContent().split("\n");
  for (const line of lines) {
    const paragraph = $createParagraphNode();
    if (line) paragraph.append($createTextNode(line));
    code.insertBefore(paragraph);
  }
  code.remove();
}

/** Lexical's command that makes each kind of list. */
const listCommands = {
  bullet: INSERT_UNORDERED_LIST_COMMAND,
  number: INSERT_ORDERED_LIST_COMMAND,
  check: INSERT_CHECK_LIST_COMMAND,
} satisfies Record<ListType, unknown>;

/** Makes a list of the kind, or removes it when the selection is in a list of that kind already. */
export function $toggleList(editor: LexicalEditor, type: ListType) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  const anchor = selection.anchor.getNode();
  if ($getNearestNodeOfType(anchor, ListItemNode) && $listTypeOf(anchor) === type) {
    $setParagraph();
    return;
  }
  if ($getNearestNodeOfType(anchor, QuoteNode)) {
    for (const group of $consecutive($quotedBlocks(selection))) $wrapInList(group, type);
    return;
  }
  if (!$getNearestNodeOfType(anchor, ListItemNode)) {
    $expandSelectionToLines(selection);
    const current = $getSelection();
    if ($isRangeSelection(current)) $splitParagraphsAtLineBreaks(current);
  }
  editor.dispatchCommand(listCommands[type], undefined);
}

function $quotedBlocks(selection: RangeSelection) {
  return $outermost($blocksIn(selection)).filter((block) => $isQuoteNode(block.getParent()));
}

function $wrapInList(blocks: ElementNode[], type: ListType) {
  const list = $createListNode(type);
  blocks[0]?.insertBefore(list);
  for (const block of blocks) {
    const item = $createListItemNode();
    if ($isListNode(block))
      item.append(
        ...block.getChildren().flatMap((each) => ($isElementNode(each) ? each.getChildren() : [])),
      );
    else item.append(...block.getChildren());
    list.append(item);
    block.remove();
  }
}

/**
 * Links the selection. With nothing selected and no link at the caret, the address goes in as
 * its own text.
 */
export function $insertLink(url: string) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  const anchor = selection.anchor.getNode();
  if (selection.isCollapsed() && !$getNearestNodeOfType(anchor, LinkNode)) {
    const link = $createAutoLinkNode(url).append($createTextNode(url));
    selection.insertNodes([link]);
    return;
  }
  // A link the caret is in takes the new address, and a selection becomes one link.
  const link = $findMatchingParent(anchor, $isLinkNode);
  if (selection.isCollapsed() && link) {
    link.setURL(url);
    return;
  }
  $toggleLink(null);
  $toggleLink(url);
}

export function $removeLink() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  const link = $findMatchingParent(selection.anchor.getNode(), $isLinkNode);
  if (selection.isCollapsed() && link) {
    for (const child of link.getChildren()) link.insertBefore(child);
    link.remove();
    return;
  }
  $toggleLink(null);
}

/** Sets the colours of the selection. A colour that is already there is removed, as a toggle. */
export function $toggleColours(styles: {
  color?: string | null;
  "background-color"?: string | null;
}) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;
  const patch: Record<string, string | null> = {};
  for (const [property, value] of Object.entries(styles)) {
    const old = $getSelectionStyleValueForProperty(selection, property, "\u0000");
    patch[property] = value == null || old === value ? null : value;
  }
  $patchStyleText(selection, patch);
}

/**
 * Puts nodes in at the caret, as Lexxy does where Lexical's own insertion would go wrong.
 *
 * - After a selected attachment, they go after it, not over it.
 * - Into a table cell, they go through a paragraph of their own.
 * - After a code block, they go when code cannot contain them.
 * - Around a list, they go by splitting it, when they are blocks that a list item cannot contain,
 *   such as an image.
 * - Into a block inside another, such as a paragraph in a quotation, blocks go in beside it.
 */
export function $insertAtCursor(nodes: LexicalNode[]) {
  let selection = $getSelection();
  if (!selection || ($isNodeSelection(selection) && selection.getNodes().length === 0))
    selection = $getRoot().selectEnd();
  if ($isNodeSelection(selection)) {
    let last = selection.getNodes().at(-1);
    for (const node of nodes) {
      if (!last) break;
      const placed = last.is(last.getTopLevelElement()) ? $makeSafeForRoot(node) : node;
      last = last.insertAfter(placed);
    }
    return;
  }
  if (!$isRangeSelection(selection)) return;
  const anchor = selection.anchor.getNode();
  if ($isShadowRoot(anchor)) {
    const paragraph = $createParagraphNode();
    anchor.append(paragraph);
    paragraph.selectStart().insertNodes(nodes);
    return;
  }
  const code = $getNearestNodeOfType(anchor, CodeNode);
  if (code) {
    if (!selection.isCollapsed()) selection.removeText();
    const text: LexicalNode[] = nodes.filter((node) => $isTextNode(node) || $isLineBreakNode(node));
    const rest = nodes.filter((node) => !text.includes(node));
    if (text.length) {
      const current = $getSelection();
      if ($isRangeSelection(current))
        current.insertNodes(
          text.map(
            (node): LexicalNode =>
              $isTextNode(node) ? $createTextNode(node.getTextContent()) : node,
          ),
        );
    }
    let previous: LexicalNode = code;
    for (const node of rest) previous = previous.insertAfter($makeSafeForRoot(node));
    if (rest.length) previous.selectEnd();
    return;
  }
  const item = $getNearestNodeOfType(anchor, ListItemNode);
  if (item && nodes.some((node) => $isDecoratorNode(node) && !node.isInline())) {
    $insertAroundList(selection, nodes);
    return;
  }
  $normalizeBlockContainerSelection(selection);
  if (!$insertBesideNestedBlock(selection, nodes)) selection.insertNodes(nodes);
}

/**
 * Puts blocks in beside the block the caret is in, where that block is inside another, such as a
 * paragraph in a quotation. Since Lexical 0.50, `insertNodes` turns blocks put in there into that
 * block's text, so two pasted paragraphs would become one line. Here the block is split at the
 * caret instead, as Lexical splits a block at the top of the document. The first block put in joins
 * the words before the caret, and the words after the caret join the last.
 *
 * It returns false, and puts nothing in, where the caret is in no such block. A list item and a
 * table cell's paragraph are left to Lexical, which keeps blocks whole there. @internal
 */
export function $insertBesideNestedBlock(selection: RangeSelection, nodes: LexicalNode[]) {
  if (!$nestedBlockAt(selection)) return false;
  if (!nodes.some($isBlock)) {
    selection.insertNodes(nodes);
    return true;
  }
  if (!selection.isCollapsed()) selection.removeText();
  const target = $nestedBlockAt(selection);
  if (!target) {
    selection.insertNodes(nodes);
    return true;
  }
  const blocks = $asBlocks(nodes);
  const last = blocks.at(-1);
  const end = $isElementNode(last) ? (last.getLastDescendant() ?? last) : last;
  const trailing = target.isEmpty() ? null : selection.insertParagraph();
  const rest = [...blocks];
  const first = rest[0];
  if ($holdsLine(first) && !first.isEmpty() && (!target.isEmpty() || target.canMergeWhenEmpty())) {
    target.append(...first.getChildren());
    rest.shift();
  }
  let previous: LexicalNode = target;
  for (const block of rest) previous = previous.insertAfter(block);
  // A list, a table or a quotation put in last stays whole, and the words after the caret stay in
  // a line of their own after it. With no words after the caret, there is no line.
  const lastLine = $holdsLine(last) && end ? $blockOf(end) : null;
  if (trailing && lastLine) {
    lastLine.append(...trailing.getChildren());
    trailing.remove();
  } else if (trailing?.isEmpty()) trailing.remove();
  if (target.isEmpty()) target.remove();
  end?.selectEnd();
  // A line break just before the caret parted the words on each side of it. The words after the
  // caret have moved on, so the break would only leave a blank line.
  const lastChild = target.isAttached() ? target.getLastChild() : null;
  if ($isLineBreakNode(lastChild) && !lastLine?.is(target)) lastChild.remove();
  return true;
}

function $isBlock(node: LexicalNode) {
  return ($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline();
}

/** The block the caret is in, where that block is inside another block. */
function $nestedBlockAt(selection: RangeSelection) {
  const block = $blockOf(selection.anchor.getNode());
  const parent = block?.getParent();
  if (!block || block.isParentRequired() || !parent || $isRootOrShadowRoot(parent)) return null;
  return block;
}

/** Whether a node is a block of words, such as a paragraph or a heading, and not of other blocks. */
function $holdsLine(node: LexicalNode | undefined): node is ElementNode {
  if (!$isElementNode(node) || node.isInline() || $isRootOrShadowRoot(node)) return false;
  const child = node.getFirstChild();
  return child === null || $isTextNode(child) || $isLineBreakNode(child) || child.isInline();
}

/** The nodes as blocks, with each run of words and other inline nodes in a paragraph. */
function $asBlocks(nodes: LexicalNode[]) {
  const blocks: LexicalNode[] = [];
  let paragraph: ElementNode | null = null;
  for (const node of nodes) {
    if ($isBlock(node)) {
      blocks.push(node);
      paragraph = null;
    } else {
      if (!paragraph) {
        paragraph = $createParagraphNode();
        blocks.push(paragraph);
      }
      paragraph.append(node);
    }
  }
  return blocks;
}

function $insertAroundList(selection: RangeSelection, nodes: LexicalNode[]) {
  if (!selection.isCollapsed()) selection.removeText();
  const anchor = selection.anchor.getNode();
  const outer = [anchor, ...anchor.getParents()].reverse().find($isListNode);
  if (!outer) {
    selection.insertNodes(nodes);
    return;
  }
  const top = [anchor, ...anchor.getParents()].find(
    (ancestor) => $isListItemNode(ancestor) && ancestor.getParent()?.is(outer),
  );
  // A blank item is only the place to insert, as after Enter to leave a list. An item with words
  // stays in the list, and the block goes after it.
  const after = top && $isBlankNode(top) ? top.getPreviousSibling() : top;
  let index = selection.anchor.offset;
  if (top) index = after ? after.getIndexWithinParent() + 1 : 0;
  const [before, rest] = $splitList(outer, index);
  if (top && $isBlankNode(top)) top.remove();
  let previous: LexicalNode = before ?? rest;
  for (const node of nodes) previous = previous.insertAfter(node);
  for (const half of [before, rest]) if (half) $removeEmptyLists(half);
  nodes.at(-1)?.selectNext();
}

/**
 * Splits a list before the item at an index. Lexical's `$splitNode` splits every block up to the
 * top of the document, so a list in a quotation splits the quotation too. Given an index past the
 * list's last item, `$splitNode` would put the whole list in the second half, and what goes between
 * would go before the list. The quotation is split after the list instead.
 */
function $splitList(list: ElementNode, index: number): [ElementNode | null, ElementNode] {
  const parent = list.getParent();
  if (index < list.getChildrenSize() || !parent || $isRootOrShadowRoot(parent))
    return $splitNode(list, index);
  return $splitList(parent, list.getIndexWithinParent() + 1);
}

/** Removes the lists a split left empty, and the quotations they leave empty. */
function $removeEmptyLists(node: LexicalNode) {
  if (!$isElementNode(node)) return;
  for (const child of node.getChildren()) $removeEmptyLists(child);
  if (($isListNode(node) || $isQuoteNode(node)) && node.isEmpty()) node.remove();
}
