"use client";

import {
  $generateJSONFromSelectedNodes,
  $generateNodesFromSerializedNodes,
} from "@lexical/clipboard";
import { $generateNodesFromDOM } from "@lexical/html";
import { $convertToMarkdownString } from "@lexical/markdown";
import {
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_HIGH,
  createEditor,
  KEY_ESCAPE_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type ParagraphNode,
  type PointType,
} from "lexical";
import { AnimatePresence, type MotionStyle, motion } from "motion/react";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Button,
  type ButtonProps,
  Input,
  InsetText,
  RichText,
  ScrollArea,
  TextShimmer,
  useMotionTiming,
  useScopeSound,
} from "x-govuk-ui";
import { AutoHeight, duration, Orb, useMergedRef } from "x-govuk-ui/internal";
import { type EditorShared, focusDocument, useEditorContext } from "./editor-context";
import { $getValue, parseHtml, pastedMarkdownToHtml } from "./editor-html";

// Suggestions from a model for the selected text, as a feature of the Editor. A toolbar comes up
// over the selection, with whatever tools are composed into it. The suggestion replaces the
// selection once it is approved.

export type EditorAIRequest = {
  /** What to do with the selection, from an action or the user's own words. */
  instruction: string;
  /** The tool that sent the request, such as "ask" for the prompt, for routing or analytics. */
  tool?: string;
  /** The selected text, as plain text. */
  text: string;
  /**
   * The selected text as Markdown, with its formatting, such as bold and links, for a model to
   * keep. Markdown cannot express colours and attachments, so they are left out.
   */
  markdown: string;
  /** The whole document when the request was made, in the editor's format. */
  document: string;
  /**
   * Where the selection starts and ends, as offsets in the document's text, as Lexical joins it.
   * They are for telling one request from another, not for reading the document.
   */
  from: number;
  to: number;
  /** Aborted when the user discards the request or makes a new selection. */
  signal: AbortSignal;
};

/**
 * What a model suggests. Text, or a string, is fitted into the selection word by word. The words
 * it keeps keep their formatting, links and colours. The words it changes take the formatting of
 * the text they go into. Markdown replaces the selection as written, with its own formatting, as a
 * model given the request's `markdown` writes it.
 */
export type EditorAIResponse = string | { text: string } | { markdown: string };

/** A suggestion, as the toolbar shows it and `accept` puts it in. */
export type EditorAISuggestionValue = { text: string } | { markdown: string };

export type EditorAIStatus = "idle" | "asking" | "working" | "result" | "error";

/** What custom tools can read and do, through `useEditorAI`. */
export type EditorAIState = {
  status: EditorAIStatus;
  /** The selection the toolbar is acting on, with its offsets in the document's text. */
  selection: { text: string; from: number; to: number } | null;
  suggestion: EditorAISuggestionValue | null;
  error: string | null;
  disabled: boolean;
  /** Opens the prompt, so the user can describe the change. */
  ask: () => void;
  /** Asks for a suggestion for the selection. */
  request: (instruction: string, tool?: string) => void;
  /** Replaces the selection with the suggestion. */
  accept: () => void;
  /** Closes the toolbar and returns to the document. */
  discard: () => void;
};

type Range = { from: number; to: number };
type Selected = Range & { text: string };
/** Where the toolbar goes, from the selection's middle, top and bottom, and which side it takes. */
type Anchor = { x: number; top: number; bottom: number; below: boolean };
type Phase =
  | { kind: "idle" }
  | { kind: "asking" }
  | { kind: "working"; fromPrompt: boolean }
  | { kind: "result"; suggestion: EditorAISuggestionValue; fromPrompt: boolean }
  | { kind: "error"; message: string; fromPrompt: boolean };

/** Everything the parts share. Only the `EditorAIState` part is public. */
type Shared = EditorAIState & {
  toolbar: RefObject<HTMLDivElement | null>;
  prompt: RefObject<HTMLInputElement | null>;
  anchor: Anchor | null;
  /** The prompt shows in place of the tools while asking, and while its request is answered. */
  asking: boolean;
  /** Asks for a suggestion from the prompt. The answer shows in the prompt's place. */
  requestFromPrompt: (instruction: string) => void;
};

const EditorAIContext = createContext<Shared | null>(null);

function useShared() {
  const shared = useContext(EditorAIContext);
  if (!shared) throw new Error("The AI parts must be inside EditorAI.");
  return shared;
}

/** Reads and controls the AI suggestions from a custom tool inside them. */
export function useEditorAI(): EditorAIState {
  return useShared();
}

const SETTLE_MS = 220;
/** How long text that has just replaced a selection stays marked. */
const INSERTED_MS = 1400;

// The document's text, and the points in it, as offsets, so a range survives edits around it as
// the document's nodes come and go.

/** Each text-bearing node's start in the document's text, as the root's text content joins them. */
function $textMap() {
  const starts = new Map<string, number>();
  const ends = new Map<string, number>();
  let at = 0;
  const visit = (node: LexicalNode) => {
    starts.set(node.getKey(), at);
    if ($isElementNode(node)) {
      const children = node.getChildren();
      children.forEach((child, index) => {
        visit(child);
        if ($isElementNode(child) && !child.isInline() && index < children.length - 1) at += 2;
      });
    } else at += node.getTextContentSize();
    ends.set(node.getKey(), at);
  };
  visit($getRoot());
  return { starts, ends };
}

function $offsetOf(point: PointType, map = $textMap()) {
  const node = point.getNode();
  if (point.type === "text") return (map.starts.get(node.getKey()) ?? 0) + point.offset;
  if (!$isElementNode(node)) return map.starts.get(node.getKey()) ?? 0;
  const child = node.getChildAtIndex(point.offset);
  if (child) return map.starts.get(child.getKey()) ?? 0;
  return map.ends.get(node.getKey()) ?? 0;
}

/** The point at an offset in the document's text, in the text there, or else by its container. */
function $pointAt(offset: number, end: boolean) {
  const map = $textMap();
  let found: { key: string; offset: number; type: "text" | "element" } | null = null;
  const visit = (node: LexicalNode): boolean => {
    const start = map.starts.get(node.getKey()) ?? 0;
    const stop = map.ends.get(node.getKey()) ?? 0;
    if (offset < start || offset > stop) return false;
    if ($isTextNode(node)) {
      // At the boundary between two texts, a start goes in the later one and an end in the earlier.
      if (!end && offset === stop && node.getNextSibling()) return false;
      found = { key: node.getKey(), offset: offset - start, type: "text" };
      return true;
    }
    if ($isElementNode(node)) {
      for (const child of node.getChildren()) if (visit(child)) return true;
      if (!found) {
        const children = node.getChildren();
        const index = children.findIndex(
          (child) => (map.starts.get(child.getKey()) ?? 0) >= offset,
        );
        found = {
          key: node.getKey(),
          offset: index === -1 ? children.length : index,
          type: "element",
        };
      }
      return true;
    }
    if ($isDecoratorNode(node) || $isLineBreakNode(node)) {
      const parent = node.getParent();
      if (!parent) return false;
      found = {
        key: parent.getKey(),
        offset: node.getIndexWithinParent() + (offset > start ? 1 : 0),
        type: "element",
      };
      return true;
    }
    return false;
  };
  visit($getRoot());
  return found as { key: string; offset: number; type: "text" | "element" } | null;
}

/**
 * A selection of a range of the document's text, not yet applied to the document. An empty range
 * is in the text before it, where typing would go.
 */
function $rangeAt({ from, to }: Range) {
  const start = $pointAt(from, from === to);
  const end = $pointAt(to, true);
  if (!start || !end) return null;
  const selection = $createRangeSelection();
  selection.anchor.set(start.key, start.offset, start.type);
  selection.focus.set(end.key, end.offset, end.type);
  return selection;
}

/** Selects a range of the document's text, in an update. */
function $selectRange(range: Range) {
  const selection = $rangeAt(range);
  if (selection) $setSelection(selection);
  return selection;
}

/**
 * A range of the document as Markdown. Lexical writes Markdown only for whole nodes, so the range
 * is copied, as the clipboard copies it, into an off-page editor with the same nodes.
 */
function markdownOf(editor: LexicalEditor, shared: EditorShared, range: Range) {
  const copied = editor.read(() => {
    const selection = $rangeAt(range);
    return selection ? $generateJSONFromSelectedNodes(editor, selection).nodes : null;
  });
  if (!copied) return null;
  const scratch = createEditor({
    namespace: "x-govuk-ui-editor-ai",
    nodes: shared.nodes,
    onError: (error) => {
      throw error;
    },
  });
  scratch.update(
    () => {
      const root = $getRoot();
      // Text copied from inside a block comes as inline nodes, which a paragraph must contain.
      let line: ParagraphNode | null = null;
      for (const node of $generateNodesFromSerializedNodes(copied)) {
        if (($isElementNode(node) || $isDecoratorNode(node)) && !node.isInline()) {
          root.append(node);
          line = null;
          continue;
        }
        if (!line) {
          line = $createParagraphNode();
          root.append(line);
        }
        line.append(node);
      }
    },
    { discrete: true },
  );
  return scratch.read(() => $convertToMarkdownString(shared.transformers));
}

// A suggestion in plain text is fitted into the text it replaces, word by word. The words it keeps
// keep their formatting, links and colours. The words it changes take the formatting of the text
// they go into, as typing would.

/** Splits text into the pieces texts are compared by, which are words, runs of space and marks. */
function pieces(text: string) {
  return text.match(/[\p{L}\p{N}]+|\s+|[^\p{L}\p{N}\s]/gu) ?? [];
}

/** Where each piece starts in its text, and, last, the text's length. */
function starts(list: readonly string[]) {
  const offsets = [0];
  for (const piece of list) offsets.push((offsets.at(-1) ?? 0) + piece.length);
  return offsets;
}

/**
 * The most pairs of pieces compared. Beyond it, what lies between the texts' shared ends is
 * replaced whole. It is enough for a few paragraphs either side.
 */
const COMPARED = 250_000;

/** A change to a text, as what lies between two of its offsets, and what replaces it. */
type TextEdit = { from: number; to: number; text: string };

/**
 * The changes that turn one text into another, word by word, as offsets in the first. The longest
 * run of pieces the two share in order stays as it is, and only what lies between it changes.
 * @internal
 */
export function textEdits(before: string, after: string): TextEdit[] {
  const a = pieces(before);
  const b = pieces(after);
  const at = starts(a);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  )
    tail++;
  const n = a.length - head - tail;
  const m = b.length - head - tail;
  // The pieces kept between the shared ends, as pairs of indices, then the shared end itself.
  const kept: [number, number][] = [];
  if (n > 0 && m > 0 && n * m <= COMPARED) {
    const width = m + 1;
    const longest = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        longest[i * width + j] =
          a[head + i] === b[head + j]
            ? (longest[(i + 1) * width + j + 1] ?? 0) + 1
            : Math.max(longest[(i + 1) * width + j] ?? 0, longest[i * width + j + 1] ?? 0);
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[head + i] === b[head + j]) {
        kept.push([head + i, head + j]);
        i++;
        j++;
      } else if ((longest[(i + 1) * width + j] ?? 0) >= (longest[i * width + j + 1] ?? 0)) i++;
      else j++;
    }
  }
  kept.push([a.length - tail, b.length - tail]);
  const edits: TextEdit[] = [];
  let i = head;
  let j = head;
  for (const [keptA, keptB] of kept) {
    if (keptA > i || keptB > j)
      edits.push({
        from: at[i] ?? 0,
        to: at[keptA] ?? 0,
        text: b.slice(j, keptB).join(""),
      });
    i = keptA + 1;
    j = keptB + 1;
  }
  return edits;
}

/** A response as a suggestion. A string is text, with its line breaks as the document's. */
function suggestionOf(response: EditorAIResponse): EditorAISuggestionValue {
  if (typeof response !== "string" && "markdown" in response) return response;
  const text = typeof response === "string" ? response : response.text;
  return {
    text: text
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  };
}

/**
 * Replaces a range of the document's text, in the formatting of the text it goes into. Two line
 * breaks start a paragraph, as the document's text joins its blocks, and one line break starts a
 * line.
 */
function $replaceText(range: Range, text: string) {
  const selection = $selectRange(range);
  if (!selection) return;
  const start = selection.anchor.getNode();
  if ($isTextNode(start)) {
    selection.format = start.getFormat();
    selection.style = start.getStyle();
  }
  text.split("\n\n").forEach((block, index) => {
    block.split("\n").forEach((line, row) => {
      const current = $getSelection();
      if (!$isRangeSelection(current)) return;
      if (row) current.insertLineBreak();
      else if (index) current.insertParagraph();
      // The first line replaces the range, even when it is empty.
      const next = $getSelection();
      if ($isRangeSelection(next) && (line || (!index && !row))) next.insertText(line);
    });
  });
}

/** The text in a range of the document, as the request sent it. */
function $textOf({ from, to }: Range) {
  return $getRoot().getTextContent().slice(from, to);
}

/**
 * A range moved through an edit. An edit before the range shifts it, an edit inside stretches or
 * shrinks it, and an edit after leaves it alone. The edit is where the two texts first and last
 * differ.
 */
function moved(range: Range | null, before: string, after: string): Range | null {
  if (!range || before === after) return range;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let tail = 0;
  while (
    tail < before.length - start &&
    tail < after.length - start &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  )
    tail++;
  const oldEnd = before.length - tail;
  const delta = after.length - before.length;
  const map = (position: number, side: "start" | "end") => {
    if (position < start || (position === start && side === "start" && oldEnd > start))
      return position;
    if (position >= oldEnd) return position + delta;
    return side === "start" ? start : after.length - tail;
  };
  return { from: map(range.from, "start"), to: map(range.to, "end") };
}

/** The DOM range of a range of the document's text, for a highlight to draw. */
function domRange(editor: LexicalEditor, range: Range) {
  return editor.read(() => {
    const start = $pointAt(range.from, false);
    const end = $pointAt(range.to, true);
    if (!start || !end) return null;
    const place = (point: { key: string; offset: number; type: "text" | "element" }) => {
      const element = editor.getElementByKey(point.key);
      if (!element) return null;
      if (point.type === "text") {
        const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const text = walker.nextNode();
        return text
          ? ([text, Math.min(point.offset, text.textContent?.length ?? 0)] as const)
          : ([element, 0] as const);
      }
      return [element, Math.min(point.offset, element.childNodes.length)] as const;
    };
    const a = place(start);
    const b = place(end);
    if (!a || !b) return null;
    const dom = document.createRange();
    try {
      dom.setStart(a[0], a[1]);
      dom.setEnd(b[0], b[1]);
    } catch {
      return null;
    }
    return dom;
  });
}

/**
 * Draws ranges of the document with the CSS Custom Highlight API, which colours text without
 * changing the document. Each name is one highlight for every editor on the page.
 */
function useHighlight(editor: LexicalEditor, name: string, range: Range | null) {
  useEffect(() => {
    const registry = (globalThis as { CSS?: { highlights?: Map<string, Set<AbstractRange>> } }).CSS
      ?.highlights;
    const Highlight = (globalThis as { Highlight?: new () => Set<AbstractRange> }).Highlight;
    if (!range || range.from >= range.to || !registry || !Highlight) return;
    let highlight = registry.get(name);
    if (!highlight) {
      highlight = new Highlight();
      registry.set(name, highlight);
    }
    const shared = highlight;
    let current: AbstractRange | null = null;
    const draw = () => {
      if (current) shared.delete(current);
      current = domRange(editor, range);
      if (current) shared.add(current);
    };
    draw();
    const unregister = editor.registerUpdateListener(draw);
    return () => {
      unregister();
      if (current) shared.delete(current);
    };
  }, [editor, name, range]);
}

/**
 * The edges of the visible part of the page around an element, which is the nearest scrolling area,
 * inside the window. A toolbar beyond them is clipped, because no stacking order can lift it out.
 */
function visibleBounds(element: HTMLElement) {
  const view = element.ownerDocument.defaultView;
  let top = 0;
  let bottom = view?.innerHeight ?? 0;
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY !== "auto" && overflowY !== "scroll") continue;
    const rect = node.getBoundingClientRect();
    top = Math.max(top, rect.top);
    bottom = Math.min(bottom, rect.bottom);
    break;
  }
  return { top, bottom };
}

/** Space below a touch selection for the handles that hang beneath it, in pixels. */
const HANDLES = 28;

/**
 * The toolbar at its tallest, with a suggestion as long as the panel shows before it scrolls, and
 * its gap from the selection, in pixels. It goes above the selection only where it fits at that
 * height.
 */
const TALLEST = 300;

export type EditorAIProps = {
  /**
   * Returns what should replace the selection. Plain text is fitted into the selection word by
   * word. The words it keeps keep their formatting, and the words it changes take the formatting
   * of the text they go into. Markdown with formatting of its own, such as from `markdown`,
   * replaces the selection as written. Throw an Error to show its message.
   */
  onRequestEdit: (request: EditorAIRequest) => Promise<EditorAIResponse>;
  /** Turns the suggestions off, while the Editor stays as it is. */
  disabled?: boolean;
  /** The toolbar, as `EditorAIToolbar`, with its tools, prompt and suggestion. */
  children: ReactNode;
};

/**
 * Suggestions from a model for the text users select, as a feature of the Editor. Put it inside
 * an Editor. When users select some text, a toolbar comes up over it with whatever tools are
 * composed into it. These can be Ask AI with a prompt, actions with fixed instructions, or tools
 * of your own through `useEditorAI`.
 *
 * The selection is kept, and drawn as kept, while the suggestion is written. It moves with the
 * text as the user keeps typing. The suggestion shows in the toolbar for approval, then replaces
 * the selection, keeping the formatting of the words it leaves unchanged. Your application
 * supplies the suggestions.
 */
export function EditorAI({ onRequestEdit, disabled: off = false, children }: EditorAIProps) {
  const context = useEditorContext("EditorAI");
  const { editor, box, options, transformers, labels } = context;
  // While the source shows in the document's place, there is no selection to act on.
  const disabled = off || context.disabled || context.readOnly || context.source;
  const id = useId();
  const toolbar = useRef<HTMLDivElement>(null);
  const prompt = useRef<HTMLInputElement>(null);
  const selected = useRef<Selected | null>(null);
  // After Escape closes a selection's toolbar, the toolbar stays closed until the selection changes
  // or the pointer comes down. Giving the document focus back selects the same text again, and
  // would otherwise reopen it.
  const dismissed = useRef<Range | null>(null);
  const pending = useRef<AbortController | null>(null);
  const dragging = useRef(false);
  const busy = useRef(false);
  // How the last selection was made, so a toolbar for a touch selection keeps clear of the
  // phone's own menu.
  const pointer = useRef("mouse");
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [held, setHeld] = useState<Range | null>(null);
  const [inserted, setInserted] = useState<Range | null>(null);
  busy.current = phase.kind !== "idle";
  useHighlight(editor, "x-govuk-ui-editor-held", held);
  useHighlight(editor, "x-govuk-ui-editor-inserted", inserted);

  // The kept range moves with the text as it is edited around it, and so does the inserted range.
  // The text is read only while there is a range to move, because it is the whole document's text.
  const tracking = held !== null || inserted !== null;
  useEffect(() => {
    if (!tracking) return;
    let text = editor.getEditorState().read(() => $getRoot().getTextContent());
    return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      const next = editorState.read(() => $getRoot().getTextContent());
      if (next === text) return;
      const before = text;
      text = next;
      setHeld((range) => moved(range, before, next));
      setInserted((range) => moved(range, before, next));
    });
  }, [editor, tracking]);

  // Text that has just replaced a selection is marked for a moment.
  useEffect(() => {
    if (!inserted) return;
    const timer = setTimeout(() => setInserted(null), INSERTED_MS);
    return () => clearTimeout(timer);
  }, [inserted]);

  const reset = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
    setHeld(null);
    setPhase({ kind: "idle" });
  }, []);

  // The toolbar follows the selection, and settles before it appears.
  useEffect(() => {
    const element = editor.getRootElement();
    const origin = box.current;
    if (disabled || !element || !origin || !options.richText) return;
    const doc = element.ownerDocument;
    let timer = 0;
    const show = () => {
      const chosen = doc.getSelection();
      if (!chosen?.rangeCount || chosen.isCollapsed) return setAnchor(null);
      const range = chosen.getRangeAt(0);
      if (!element.contains(range.commonAncestorContainer)) return setAnchor(null);
      const picked = editor.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || selection.isCollapsed()) return null;
        const map = $textMap();
        const a = $offsetOf(selection.anchor, map);
        const b = $offsetOf(selection.focus, map);
        const from = Math.min(a, b);
        const to = Math.max(a, b);
        return { from, to, text: $getRoot().getTextContent().slice(from, to) };
      });
      if (!picked?.text.trim()) return setAnchor(null);
      if (dismissed.current?.from === picked.from && dismissed.current.to === picked.to)
        return setAnchor(null);
      dismissed.current = null;
      selected.current = picked;
      const rect = range.getBoundingClientRect();
      const frame = origin.getBoundingClientRect();
      // The toolbar goes above the selection where it fits at its tallest, so a suggestion never
      // grows out of sight. Otherwise it goes below, where there is more space. A selection made
      // by touch has the phone's own menu above it, so the toolbar goes below, clear of its
      // handles.
      const touched = pointer.current === "touch" || pointer.current === "pen";
      const handles = touched ? HANDLES : 0;
      const bounds = visibleBounds(origin);
      const above = rect.top - bounds.top;
      const under = bounds.bottom - rect.bottom - handles;
      setAnchor({
        x: rect.left + rect.width / 2 - frame.left - origin.clientLeft,
        top: rect.top - frame.top - origin.clientTop,
        bottom: rect.bottom + handles - frame.top - origin.clientTop,
        below: touched || (above < TALLEST && under > above),
      });
    };
    const onSelectionChange = () => {
      if (busy.current) return;
      window.clearTimeout(timer);
      setAnchor(null);
      if (!dragging.current) timer = window.setTimeout(show, SETTLE_MS);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && toolbar.current?.contains(event.target)) return;
      pointer.current = event.pointerType;
      dismissed.current = null;
      if (busy.current) {
        reset();
        busy.current = false;
      }
      dragging.current = event.target instanceof Node && element.contains(event.target);
      window.clearTimeout(timer);
      setAnchor(null);
    };
    const onPointerUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(show, 0);
    };
    doc.addEventListener("selectionchange", onSelectionChange);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("pointerup", onPointerUp, true);
    doc.addEventListener("pointercancel", onPointerUp, true);
    return () => {
      window.clearTimeout(timer);
      doc.removeEventListener("selectionchange", onSelectionChange);
      doc.removeEventListener("pointerdown", onPointerDown, true);
      doc.removeEventListener("pointerup", onPointerUp, true);
      doc.removeEventListener("pointercancel", onPointerUp, true);
    };
  }, [disabled, editor, box, options.richText, reset]);

  useEffect(() => () => pending.current?.abort(), []);

  // When the suggestions are turned off, the editor is disabled or read-only, or its source is
  // showing, the toolbar goes, with any request.
  useEffect(() => {
    if (!disabled) return;
    reset();
    setAnchor(null);
  }, [disabled, reset]);

  // The document is described as having suggestions, and Escape in it closes the toolbar.
  const instructionsId = `${id}-instructions`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: The field writes its own description afresh as its hint or error changes, so the instructions join it again.
  useEffect(() => {
    const root = editor.getRootElement();
    if (!root || disabled) return;
    const own = root.getAttribute("aria-describedby") ?? "";
    root.setAttribute("aria-describedby", [own, instructionsId].filter(Boolean).join(" "));
    return () => {
      const now = (root.getAttribute("aria-describedby") ?? "")
        .split(" ")
        .filter((each) => each && each !== instructionsId);
      if (now.length) root.setAttribute("aria-describedby", now.join(" "));
      else root.removeAttribute("aria-describedby");
    };
  }, [editor, disabled, instructionsId, context.describedBy]);

  const hold = () => {
    const target = selected.current;
    if (target) setHeld({ from: target.from, to: target.to });
  };

  const ask = () => {
    if (!selected.current || disabled) return;
    hold();
    setPhase({ kind: "asking" });
    requestAnimationFrame(() => prompt.current?.focus({ preventScroll: true }));
  };

  const request = async (instruction: string, tool?: string, fromPrompt = false) => {
    const target = selected.current;
    if (!target || disabled || !instruction.trim()) return;
    hold();
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setPhase({ kind: "working", fromPrompt });
    try {
      let markdown = target.text;
      try {
        markdown = markdownOf(editor, context, target) ?? markdown;
      } catch {
        // A node Lexical cannot copy leaves the plain text to stand for it.
      }
      const response = await onRequestEdit({
        instruction,
        tool,
        text: target.text,
        markdown,
        document: editor
          .getEditorState()
          .read(() => $getValue(editor, options.format, transformers), { editor }),
        from: target.from,
        to: target.to,
        signal: controller.signal,
      });
      if (!controller.signal.aborted)
        setPhase({ kind: "result", suggestion: suggestionOf(response), fromPrompt });
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase({
        kind: "error",
        fromPrompt,
        message: error instanceof Error && error.message ? error.message : labels.aiFailed,
      });
    }
  };

  const discard = () => {
    const target = selected.current;
    dismissed.current = target ? { from: target.from, to: target.to } : null;
    reset();
    setAnchor(null);
    focusDocument(editor);
  };

  useEffect(() => {
    if (!anchor) return;
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        event.preventDefault();
        discard();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  });

  const accept = () => {
    const target = selected.current;
    if (!target || !held || phase.kind !== "result") return;
    // Never overwrite text the user changed while the suggestion was loading. The kept range has
    // moved with their edits around it, and what is inside it must still be what was sent.
    const now = editor.read(() => $textOf(held));
    if (now !== target.text) {
      setPhase({
        kind: "error",
        fromPrompt: phase.fromPrompt,
        message: labels.aiChanged,
      });
      return;
    }
    // Space at the selection's edges, which a model leaves out, stays as it was.
    const lead = /^\s*/.exec(target.text)?.[0] ?? "";
    const trail = /\S(\s*)$/.exec(target.text)?.[1] ?? "";
    const inner = { from: held.from + lead.length, to: held.to - trail.length };
    const { suggestion } = phase;
    let end = inner.from;
    editor.update(
      () => {
        if ("text" in suggestion) {
          const before = target.text.slice(lead.length, target.text.length - trail.length);
          // From the last change to the first, so each change's offsets stay valid.
          for (const change of textEdits(before, suggestion.text).reverse())
            $replaceText(
              { from: inner.from + change.from, to: inner.from + change.to },
              change.text,
            );
          end = inner.from + suggestion.text.length;
          $selectRange({ from: end, to: end });
          return;
        }
        const selection = $selectRange(inner);
        if (!selection) return;
        const nodes = $generateNodesFromDOM(
          editor,
          parseHtml(pastedMarkdownToHtml(suggestion.markdown)),
        );
        selection.insertNodes(nodes);
        const after = $getSelection();
        if ($isRangeSelection(after)) end = $offsetOf(after.anchor);
      },
      { discrete: true },
    );
    setHeld(null);
    setInserted({ from: inner.from, to: end });
    pending.current?.abort();
    pending.current = null;
    setPhase({ kind: "idle" });
    setAnchor(null);
    focusDocument(editor);
  };

  const target = selected.current;
  const shared: Shared = {
    toolbar,
    prompt,
    anchor,
    disabled,
    status: phase.kind,
    asking: phase.kind === "asking" || (phase.kind !== "idle" && phase.fromPrompt),
    selection: target ? { text: target.text, from: target.from, to: target.to } : null,
    suggestion: phase.kind === "result" ? phase.suggestion : null,
    error: phase.kind === "error" ? phase.message : null,
    ask,
    request: (instruction, tool) => void request(instruction, tool),
    // The prompt's own requests are told apart by where they come from, not by their tool's
    // name, so a tool of yours may be called anything.
    requestFromPrompt: (instruction) => void request(instruction, "ask", true),
    accept,
    discard,
  };
  return (
    <EditorAIContext value={shared}>
      <p id={instructionsId} className="x-govuk-ui-visually-hidden">
        {labels.aiInstructions}
      </p>
      {children}
    </EditorAIContext>
  );
}

/**
 * A div's props, except those Motion uses for its own animation. The toolbar's and the
 * suggestion's types are the library's own, so a release of Motion does not change them.
 */
type MotionDivProps = Omit<
  ComponentPropsWithRef<"div">,
  "children" | "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
>;

export type EditorAIToolbarProps = MotionDivProps & {
  /** Names the toolbar for screen readers. By default, the editor's `labels.aiToolbar`. */
  label?: string;
  children: ReactNode;
};

/**
 * Floats above the selection, or below it when there is no space. It contains the tools, the prompt
 * and the suggestion, in any order the design needs, and is as wide as whichever of them shows.
 */
export function EditorAIToolbar({
  label,
  children,
  className = "",
  style,
  ref,
  ...props
}: EditorAIToolbarProps) {
  const shared = useShared();
  const { labels, box } = useEditorContext("EditorAIToolbar");
  const play = useScopeSound();
  const timing = useMotionTiming();
  const { anchor, toolbar, asking } = shared;
  // The toolbar is as wide as what it shows, which is the tools, the prompt while asking, or a
  // wider suggestion beneath. The rows and suggestion keep their own width, so each can be
  // measured.
  const [size, setSize] = useState<{ width: number; first: boolean } | null>(null);
  useLayoutEffect(() => {
    const element = toolbar.current;
    if (!anchor || !element) {
      setSize(null);
      return;
    }
    const measure = () => {
      const row = element.querySelector<HTMLElement>(
        asking ? ".x-govuk-ui-editor-ai-prompt" : ".x-govuk-ui-editor-ai-tools",
      );
      const panel = element.querySelectorAll<HTMLElement>(".x-govuk-ui-editor-ai-panel > div > *");
      const inside = Math.max(row?.offsetWidth ?? 0, ...[...panel].map((item) => item.offsetWidth));
      const border = element.offsetWidth - element.clientWidth;
      // The first width of each appearance applies at once. Later ones ease.
      setSize((previous) => ({ width: inside + border, first: previous === null }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const part of element.querySelectorAll(
      ".x-govuk-ui-editor-ai-tools, .x-govuk-ui-editor-ai-prompt, .x-govuk-ui-editor-ai-panel > div",
    ))
      observer.observe(part);
    return () => observer.disconnect();
  }, [anchor, toolbar, asking]);
  const width = size?.width ?? 0;
  const mergedRef = useMergedRef(toolbar, ref);
  return (
    <AnimatePresence>
      {anchor && (
        <motion.div
          key="toolbar"
          {...props}
          ref={mergedRef}
          // A group, not a toolbar, because its tools are Tab stops of their own, not reached with
          // arrow keys.
          role="group"
          aria-label={label ?? labels.aiToolbar}
          className={`x-govuk-ui-editor-ai-toolbar ${className}`.trim()}
          data-below={anchor.below || undefined}
          data-asking={asking || undefined}
          // It centres on the selection, but stays inside the editor, and its rows wrap within it.
          style={{
            ...(style as MotionStyle),
            ...({
              "--x-govuk-ui-editor-ai-room": `${box.current?.clientWidth ?? 440}px`,
            } as MotionStyle),
            left: `clamp(${width / 2}px, ${anchor.x}px, calc(100% - ${width / 2}px))`,
            top: anchor.below ? anchor.bottom : anchor.top,
          }}
          initial={{ opacity: 0, scale: 0.96, y: anchor.below ? -6 : 6, filter: "blur(4px)" }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            filter: "blur(0px)",
            ...(size && { width: size.width }),
          }}
          exit={{
            opacity: 0,
            scale: 0.98,
            y: anchor.below ? -2 : 2,
            transition: timing.ease(duration.fast),
          }}
          transition={{
            ...timing.ease(duration.medium),
            width: size?.first ? { duration: 0 } : timing.ease(duration.medium),
          }}
          // Keep the document selection when pressing a tool. Fields still take focus.
          onMouseDown={(event) => {
            if (!(event.target instanceof Element && event.target.closest("input, select")))
              event.preventDefault();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            // Escape closes the toolbar without a press, so the editor plays its own sound.
            play("close");
            shared.discard();
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type EditorAIToolsProps = ComponentPropsWithRef<"div"> & { children: ReactNode };

/** The row of tools. The prompt takes its place while the user describes a change. */
export function EditorAITools({ children, className = "", ...props }: EditorAIToolsProps) {
  const shared = useShared();
  return (
    <div
      {...props}
      className={`x-govuk-ui-editor-ai-tools ${className}`.trim()}
      inert={shared.asking}
    >
      {children}
    </div>
  );
}

export type EditorAIToolProps = ButtonProps & {
  /** Shown before the label. */
  icon?: ReactNode;
};

/** Opens the prompt. It shows the Orb, unless given another icon, and `labels.aiAsk` as text. */
export function EditorAIAsk({
  children,
  icon,
  className = "",
  onClick,
  ...props
}: EditorAIToolProps) {
  const shared = useShared();
  const { labels } = useEditorContext("EditorAIAsk");
  return (
    <Button
      variant="quiet"
      data-sound="open"
      {...props}
      className={`x-govuk-ui-editor-ai-tool x-govuk-ui-editor-ai-ask ${className}`.trim()}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) shared.ask();
      }}
    >
      {icon === undefined ? <Orb /> : icon}
      {children ?? labels.aiAsk}
    </Button>
  );
}

export type EditorAIActionProps = EditorAIToolProps & {
  /** Sent as the request's instruction, such as "Make this shorter". */
  instruction: string;
  /** Sent as the request's tool. */
  tool?: string;
};

/** Asks for a suggestion with a fixed instruction, such as "Make this shorter". */
export function EditorAIAction({
  instruction,
  tool,
  icon,
  children,
  className = "",
  onClick,
  ...props
}: EditorAIActionProps) {
  const shared = useShared();
  return (
    <Button
      variant="quiet"
      data-sound="command"
      {...props}
      className={`x-govuk-ui-editor-ai-tool ${className}`.trim()}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) shared.request(instruction, tool);
      }}
    >
      {icon}
      {children}
    </Button>
  );
}

/** A keyline between groups of tools. */
export function EditorAISeparator({ className = "", ...props }: ComponentPropsWithRef<"span">) {
  return (
    <span
      {...props}
      className={`x-govuk-ui-editor-ai-divider ${className}`.trim()}
      aria-hidden="true"
    />
  );
}

export type EditorAIPromptProps = ComponentPropsWithRef<"div"> & {
  /** Names the field for screen readers. By default, the editor's `labels.aiPrompt`. */
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  /** Shown before the field. By default, the Orb. */
  icon?: ReactNode;
};

/**
 * Where the user describes the change they want, with an Input and a Button. `EditorAIAsk` opens
 * it. It is not a form, because it sits inside the form around the editor. Enter or the Button
 * sends it.
 */
export function EditorAIPrompt({
  label,
  placeholder,
  submitLabel,
  icon,
  className = "",
  ...props
}: EditorAIPromptProps) {
  const shared = useShared();
  const { labels } = useEditorContext("EditorAIPrompt");
  const working = shared.status === "working";
  const send = () => {
    const instruction = shared.prompt.current?.value.trim();
    if (instruction && !working) shared.requestFromPrompt(instruction);
  };
  return (
    <div
      {...props}
      className={`x-govuk-ui-editor-ai-prompt ${className}`.trim()}
      inert={!shared.asking}
    >
      <Input
        ref={shared.prompt}
        label={label ?? labels.aiPrompt}
        hideLabel
        placeholder={placeholder ?? labels.aiPromptPlaceholder}
        autoComplete="off"
        readOnly={working}
        prefix={icon === undefined ? <Orb state={working ? "working" : "listening"} /> : icon}
        onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          // Enter would send the form around the editor.
          event.preventDefault();
          send();
        }}
      />
      <Button
        type="button"
        size="small-icon"
        className="x-govuk-ui-editor-ai-send"
        aria-label={submitLabel ?? labels.aiSend}
        data-sound="command"
        onClick={send}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </Button>
    </div>
  );
}

/** The suggestion's words. By default, each comes from the editor's `labels`. */
export type EditorAISuggestionProps = MotionDivProps & {
  workingLabel?: ReactNode;
  replaceLabel?: ReactNode;
  discardLabel?: ReactNode;
  closeLabel?: ReactNode;
};

/**
 * Shows progress, then the suggestion in Inset text with Replace and Discard buttons, or what went
 * wrong. A suggestion in Markdown is shown formatted, as it will go in. It grows to fit, so
 * nothing jumps into place.
 */
export function EditorAISuggestion({
  workingLabel,
  replaceLabel,
  discardLabel,
  closeLabel,
  className = "",
  ...props
}: EditorAISuggestionProps) {
  const shared = useShared();
  const { labels } = useEditorContext("EditorAISuggestion");
  const { suggestion } = shared;
  const timing = useMotionTiming();
  const settle = {
    initial: { opacity: 0, y: 4, filter: "blur(2px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -4, filter: "blur(3px)" },
    transition: timing.ease(duration.medium),
  };
  return (
    <AutoHeight {...props} className={`x-govuk-ui-editor-ai-panel ${className}`.trim()}>
      <AnimatePresence mode="popLayout" initial={false}>
        {shared.status === "working" && (
          <motion.p key="working" className="x-govuk-ui-editor-ai-status" role="status" {...settle}>
            <Orb state="working" size={14} />
            <TextShimmer>{workingLabel ?? labels.aiWorking}</TextShimmer>
          </motion.p>
        )}
        {suggestion !== null && (
          <motion.div
            key="result"
            className="x-govuk-ui-editor-ai-result"
            data-sound-enter="notification"
            {...settle}
          >
            {/* A long suggestion scrolls, so the toolbar keeps to a height it has space for. */}
            <InsetText className="x-govuk-ui-editor-ai-proposal" role="status">
              <ScrollArea className="x-govuk-ui-editor-ai-proposal-scroll" fade>
                {"text" in suggestion ? (
                  suggestion.text
                ) : (
                  <RichText
                    markdown={suggestion.markdown}
                    className="x-govuk-ui-editor-ai-markdown"
                  />
                )}
              </ScrollArea>
            </InsetText>
            <div className="x-govuk-ui-editor-ai-choices">
              <Button size="small" data-sound="success" onClick={shared.accept}>
                {replaceLabel ?? labels.aiReplace}
              </Button>
              <Button variant="link" data-sound="close" onClick={shared.discard}>
                {discardLabel ?? labels.aiDiscard}
              </Button>
            </div>
          </motion.div>
        )}
        {shared.error !== null && (
          <motion.div
            key="error"
            className="x-govuk-ui-editor-ai-result"
            data-sound-enter="error"
            {...settle}
          >
            <InsetText className="x-govuk-ui-editor-ai-error" role="alert">
              {shared.error}
            </InsetText>
            <div className="x-govuk-ui-editor-ai-choices">
              <Button variant="link" data-sound="close" onClick={shared.discard}>
                {closeLabel ?? labels.aiClose}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AutoHeight>
  );
}
