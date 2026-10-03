import { CodeNode, type SerializedCodeNode } from "@lexical/code-core";
import {
  $isListItemNode,
  $isListNode,
  ListItemNode,
  type SerializedListItemNode,
} from "@lexical/list";
import { $isQuoteNode, QuoteNode } from "@lexical/rich-text";
import { type SerializedTableNode, TableNode } from "@lexical/table";
import { $getNearestNodeOfType } from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $hasUpdateTag,
  $isElementNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $splitNode,
  type BaseSelection,
  type EditorConfig,
  type LexicalNode,
  PASTE_TAG,
  ParagraphNode,
  type RangeSelection,
} from "lexical";
import { $isBlankNode, $isCursorOnLastLine, $trimTrailingBlankNodes } from "./editor-commands";

// The editor's own kinds of node, after Lexxy's. Each changes how Enter, the caret or a table
// behaves where Lexical's own would leave the writer stuck.

/** Whether a caret can go just before or after a node, as it can in text but not by a table. */
function $acceptsCaret(node: LexicalNode | null, side: "before" | "after") {
  return (
    $isElementNode(node) &&
    (side === "before" ? node.canInsertTextBefore() : node.canInsertTextAfter())
  );
}

/**
 * A paragraph that is there only while the caret needs somewhere to be. That is between two blocks
 * that cannot take a caret, such as two tables or two images, or before or after such a block at
 * the document's edge. It is drawn a sliver tall until the caret is in it, and exports nothing. It
 * becomes a paragraph like any other once it is typed in.
 * @internal
 */
export class ProvisionalParagraphNode extends ParagraphNode {
  static getType() {
    return "provisional-paragraph";
  }

  static clone(node: ProvisionalParagraphNode) {
    return new ProvisionalParagraphNode(node.__key);
  }

  static importJSON() {
    return new ProvisionalParagraphNode();
  }

  static importDOM() {
    return null;
  }

  static transform(): (node: LexicalNode) => void {
    return (node) => {
      const paragraph = node as ProvisionalParagraphNode;
      if (paragraph.getTextContentSize() > 0 || paragraph.getChildrenSize() > 0) {
        paragraph.replace($createParagraphNode(), true);
        return;
      }
      paragraph.removeUnlessRequired();
    };
  }

  exportJSON() {
    return { ...super.exportJSON(), type: "provisional-paragraph" };
  }

  static neededBetween(before: LexicalNode | null, after: LexicalNode | null) {
    return !$acceptsCaret(before, "after") && !$acceptsCaret(after, "before");
  }

  createDOM(config: EditorConfig) {
    const element = super.createDOM(config);
    element.classList.add("x-govuk-ui-editor-provisional");
    element.toggleAttribute("data-hidden", !this.isSelected($getSelection()));
    return element;
  }

  updateDOM(previous: this, element: HTMLElement, config: EditorConfig) {
    element.toggleAttribute("data-hidden", !this.isSelected($getSelection()));
    return super.updateDOM(previous, element, config);
  }

  getTextContent() {
    return "";
  }

  exportDOM() {
    return { element: null };
  }

  /**
   * Selected as Lexical sees it, or with a collapsed caret on its parent beside it. The browser
   * draws that caret in the paragraph, because the paragraph has no size of its own.
   */
  isSelected(selection: BaseSelection | null = $getSelection()) {
    if (!selection) return false;
    if (selection.getNodes().some((node) => node.is(this) || this.isParentOf(node))) return true;
    if ($isRangeSelection(selection) && selection.isCollapsed()) {
      const { anchor } = selection;
      const parent = this.getParent();
      if (parent && anchor.type === "element" && anchor.getNode().is(parent)) {
        const index = this.getIndexWithinParent();
        return anchor.offset === index || anchor.offset === index + 1;
      }
    }
    return false;
  }

  get required() {
    const latest = this.getLatest();
    return (
      $isRootOrShadowRoot(latest.getParent()) &&
      ProvisionalParagraphNode.neededBetween(latest.getPreviousSibling(), latest.getNextSibling())
    );
  }

  removeUnlessRequired() {
    if (!this.required) this.remove();
  }
}

export function $isProvisionalParagraphNode(node: unknown): node is ProvisionalParagraphNode {
  return node instanceof ProvisionalParagraphNode;
}

/**
 * A code block that is left the way a writer expects. Enter on an empty last line leaves it for a
 * paragraph. Enter at its very start puts a paragraph above it. A last line of only spaces stays a
 * line inside it.
 * @internal
 */
export class EscapingCodeNode extends CodeNode {
  static getType() {
    return "escaping-code";
  }

  static clone(node: EscapingCodeNode) {
    return new EscapingCodeNode(node.__language, node.__key);
  }

  static importJSON(json: SerializedCodeNode) {
    return new EscapingCodeNode(json.language).updateFromJSON(json);
  }

  exportJSON() {
    return { ...super.exportJSON(), type: "escaping-code" };
  }

  insertNewAfter(selection: RangeSelection, restoreSelection?: boolean) {
    if ($hasUpdateTag(PASTE_TAG) || !selection.isCollapsed())
      return super.insertNewAfter(selection, restoreSelection);
    const text = this.getTextContent();
    const { anchor } = selection;
    const node = anchor.getNode();
    if (anchor.offset === 0 && (this.is(node) || this.getFirstChild()?.is(node))) {
      this.insertBefore($createParagraphNode());
      return null;
    }
    if ($isCursorOnLastLine(selection)) {
      const lastLine = text.slice(text.lastIndexOf("\n") + 1);
      if (lastLine.length > 0 && lastLine.trim() === "") {
        super.insertNewAfter(selection, restoreSelection);
        this.getLastChild()?.remove();
        return null;
      }
      if (text === "" || text.endsWith("\n")) {
        $trimTrailingBlankNodes(this);
        const paragraph = $createParagraphNode();
        this.insertAfter(paragraph);
        return paragraph;
      }
    }
    return super.insertNewAfter(selection, restoreSelection);
  }
}

/**
 * A list item that, in a list inside a quotation, leaves the list on Enter in an empty item, as
 * Lexical does at the top of the document. It splits the quotation where items follow.
 * @internal
 */
export class EscapingListItemNode extends ListItemNode {
  static getType() {
    return "escaping-list-item";
  }

  static clone(node: EscapingListItemNode) {
    return new EscapingListItemNode(node.__value, node.__checked, node.__key);
  }

  static importJSON(json: SerializedListItemNode) {
    return new EscapingListItemNode().updateFromJSON(json);
  }

  exportJSON() {
    return { ...super.exportJSON(), type: "escaping-list-item" };
  }

  insertNewAfter(selection: RangeSelection, restoreSelection = true) {
    if (this.shouldEscape(selection))
      return this.escape() ?? super.insertNewAfter(selection, restoreSelection);
    return super.insertNewAfter(selection, restoreSelection);
  }

  private shouldEscape(selection: RangeSelection) {
    if ($hasUpdateTag(PASTE_TAG) || !$getNearestNodeOfType(this, QuoteNode)) return false;
    if ($isBlankNode(this)) return true;
    const paragraph = $getNearestNodeOfType(selection.anchor.getNode(), ParagraphNode);
    return Boolean(paragraph && $isBlankNode(paragraph) && $isListItemNode(paragraph.getParent()));
  }

  private escape() {
    const list = this.getParent();
    if (!$isListNode(list)) return null;
    const quote = list.getParent();
    const itemsFollow = this.getNextSiblings().some(
      (sibling) => $isListItemNode(sibling) && !$isBlankNode(sibling),
    );
    if ($isQuoteNode(quote) && itemsFollow) {
      const parts = $splitNode(list, this.getIndexWithinParent());
      this.remove();
      const paragraph = $createParagraphNode();
      parts[0]?.insertAfter(paragraph);
      for (const part of parts) if (part) $trimTrailingBlankNodes(part);
      return paragraph;
    }
    const paragraph = $createParagraphNode();
    list.insertAfter(paragraph);
    this.remove();
    return paragraph;
  }
}

/**
 * A table, which a caret cannot sit just before or after, so a provisional paragraph takes its
 * place there.
 * @internal
 */
export class EditorTableNode extends TableNode {
  static getType() {
    return "editor-table";
  }

  static clone(node: EditorTableNode) {
    return new EditorTableNode(node.__key);
  }

  static importJSON(json: SerializedTableNode) {
    return new EditorTableNode().updateFromJSON(json);
  }

  exportJSON() {
    return { ...super.exportJSON(), type: "editor-table" };
  }

  canInsertTextBefore() {
    return false;
  }

  canInsertTextAfter() {
    return false;
  }
}
