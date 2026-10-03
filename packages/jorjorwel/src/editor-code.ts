import {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  $isCodeNode,
  CodeHighlightNode,
  CodeNode,
} from "@lexical/code-core";
import { mergeRegister } from "@lexical/utils";
import {
  $createLineBreakNode,
  $createTabNode,
  $createTextNode,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTabNode,
  $isTextNode,
  $onUpdate,
  type LexicalEditor,
  type LexicalNode,
  TextNode,
} from "lexical";
import { codeTokens } from "x-govuk-ui/internal";
import { EscapingCodeNode } from "./editor-nodes";

// Code blocks coloured by their syntax with sugar-high, as Code block colours code.

/** sugar-high's kind for each token, as a CodeHighlightNode's type. */
function $tokenNodes(code: string, language: string | null | undefined) {
  const nodes: LexicalNode[] = [];
  for (const [kind, text] of codeTokens(code, language)) {
    for (const part of text.split(/(\n|\t)/)) {
      if (part === "\n") nodes.push($createLineBreakNode());
      else if (part === "\t") nodes.push($createTabNode());
      else if (part) nodes.push($createCodeHighlightNode(part, kind ?? undefined));
    }
  }
  return nodes;
}

function sameToken(a: LexicalNode | undefined, b: LexicalNode | undefined) {
  if ($isCodeHighlightNode(a) && $isCodeHighlightNode(b))
    return (
      a.getTextContent() === b.getTextContent() && a.getHighlightType() === b.getHighlightType()
    );
  return ($isTabNode(a) && $isTabNode(b)) || ($isLineBreakNode(a) && $isLineBreakNode(b));
}

/**
 * Colours each code block by its syntax, with sugar-high, as Code block colours code, in the
 * language its fence or its picker names. As code is typed, the block's tokens are worked out
 * again and only those that changed are replaced, with the caret kept where it was, after
 * Lexical's Prism highlighter.
 */
export function registerCodeColours(editor: LexicalEditor) {
  const busy = new Set<string>();
  let scheduled = false;
  const $highlight = (code: CodeNode) => {
    const key = code.getKey();
    if (busy.has(key)) return;
    busy.add(key);
    if (!scheduled) {
      scheduled = true;
      $onUpdate(() => {
        scheduled = false;
        busy.clear();
      });
    }
    const selection = $getSelection();
    let offset: number | null = null;
    let onLineBreak: number | null = null;
    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const node = anchor.getNode();
      if (node.is(code) || code.isParentOf(node)) {
        if (anchor.type === "element" && $isLineBreakNode(code.getChildAtIndex(anchor.offset - 1)))
          onLineBreak = anchor.offset;
        else
          offset =
            anchor.offset +
            node
              .getPreviousSiblings()
              .reduce((sum, sibling) => sum + sibling.getTextContentSize(), 0);
      }
    }
    const next = $tokenNodes(code.getTextContent(), code.getLanguage());
    const previous = code.getChildren();
    let from = 0;
    while (from < previous.length && sameToken(previous[from], next[from])) from++;
    let trailing = 0;
    const most = Math.min(previous.length, next.length) - from;
    while (
      trailing < most &&
      sameToken(previous[previous.length - 1 - trailing], next[next.length - 1 - trailing])
    )
      trailing++;
    const replacing = next.slice(from, next.length - trailing);
    if (from === previous.length - trailing && replacing.length === 0) return;
    code.splice(from, previous.length - trailing - from, replacing);
    if (onLineBreak !== null) {
      code.select(onLineBreak, onLineBreak);
      return;
    }
    if (offset === null) return;
    let left = offset;
    const children = code.getChildren();
    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if ($isTextNode(child)) {
        const size = child.getTextContentSize();
        if (size >= left) {
          child.select(left, left);
          return;
        }
        left -= size;
      } else if ($isLineBreakNode(child)) {
        if (left === 0) {
          code.select(index, index);
          return;
        }
        left -= 1;
      }
    }
    code.select(children.length, children.length);
  };
  const $text = (node: TextNode) => {
    const parent = node.getParent();
    if ($isCodeNode(parent)) $highlight(parent);
    else if ($isCodeHighlightNode(node))
      node.replace($createTextNode(node.getTextContent()).setFormat(node.getFormat()));
  };
  return mergeRegister(
    editor.registerNodeTransform(CodeNode, $highlight),
    editor.registerNodeTransform(EscapingCodeNode, $highlight),
    editor.registerNodeTransform(TextNode, $text),
    editor.registerNodeTransform(CodeHighlightNode, $text),
  );
}
