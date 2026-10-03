import { $isCodeNode } from "@lexical/code-core";
import type { TextFormatTransformer, Transformer } from "@lexical/markdown";
import {
  $createRangeSelection,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COLLABORATION_TAG,
  HISTORIC_TAG,
  type LexicalEditor,
} from "lexical";

// Markdown as it is typed, beyond the shortcuts Lexical runs.

/**
 * Lexical formats Markdown as its closing tag is typed. This formats it as the opening tag is
 * typed, before words that already end with the closing tag, such as a backtick before code`.
 */
export function registerLeadingTags(editor: LexicalEditor, transformers: Transformer[]) {
  const formats = transformers
    .filter(
      (transformer): transformer is TextFormatTransformer => transformer.type === "text-format",
    )
    .sort((a, b) => b.tag.length - a.tag.length);
  const loose = /[^\w]/;
  return editor.registerUpdateListener(({ tags, dirtyLeaves, editorState, prevEditorState }) => {
    if (tags.has(HISTORIC_TAG) || tags.has(COLLABORATION_TAG) || editor.isComposing()) return;
    const selection = editorState.read($getSelection);
    const previous = prevEditorState.read($getSelection);
    if (!$isRangeSelection(previous) || !$isRangeSelection(selection) || !selection.isCollapsed())
      return;
    const key = selection.anchor.key;
    const offset = selection.anchor.offset;
    if (!dirtyLeaves.has(key)) return;
    const text = editorState.read(() => {
      const node = $getNodeByKey(key);
      return $isTextNode(node) ? node.getTextContent() : null;
    });
    if (text === null) return;
    const previousOffset = previous.anchor.key === key ? previous.anchor.offset : 0;
    if (offset <= previousOffset) return;
    for (const transformer of formats) {
      const { tag } = transformer;
      const open = offset - tag.length;
      if (open < 0 || text.slice(open, offset) !== tag) continue;
      const char = tag[0];
      if (open > 0 && text[open - 1] === char) continue;
      if (transformer.intraword === false && open > 0 && !loose.test(text[open - 1] ?? ""))
        continue;
      const close = text.indexOf(tag, offset);
      if (close < 0 || close <= offset) continue;
      if (text[close + tag.length] === char || text[close - 1] === char) continue;
      if (text[offset] === " " || text[close - 1] === " ") continue;
      if (
        transformer.intraword === false &&
        text[close + tag.length] &&
        !loose.test(text[close + tag.length] ?? "")
      )
        continue;
      editor.update(() => {
        const node = $getNodeByKey(key);
        if (!$isTextNode(node) || $isCodeNode(node.getParent())) return;
        const inner = text.slice(offset, close);
        node.setTextContent(text.slice(0, open) + inner + text.slice(close + tag.length));
        const range = $createRangeSelection();
        range.anchor.set(key, open, "text");
        range.focus.set(key, open + inner.length, "text");
        $setSelection(range);
        for (const format of transformer.format)
          if (!range.hasFormat(format)) range.formatText(format);
        range.anchor.set(range.focus.key, range.focus.offset, range.focus.type);
        for (const format of transformer.format)
          if (range.hasFormat(format)) range.toggleFormat(format);
      });
      break;
    }
  });
}
