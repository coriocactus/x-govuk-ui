"use client";

import { CodeNode } from "@lexical/code-core";
import { $generateNodesFromDOM } from "@lexical/html";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  COMMAND_PRIORITY_CRITICAL,
  DecoratorNode,
  type DOMConversionMap,
  type DOMExportOutput,
  HISTORIC_TAG,
  INPUT_COMMAND,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_SPACE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ScrollArea } from "x-govuk-ui";
import { trackHighlight, useMergedRef } from "x-govuk-ui/internal";
import { $createNodeSelectionWith, $textBefore } from "./editor-commands";
import { useEditorContext, useStore } from "./editor-context";
import { parseHtml } from "./editor-html";

// Prompts, after Lexxy's. Typing a trigger, such as @, opens a menu of suggestions at the caret,
// which typing filters. The chosen suggestion goes into the document, as a mention or as text.

/** A mention as Lexical's JSON stores it, with its prompt's name, its value and its label. */
export type SerializedMentionNode = Spread<
  { kind: string; value: string; label: string },
  SerializedLexicalNode
>;

/**
 * A mention, as a prompt makes one, so a service can put one in itself, such as from a list of its
 * own, in an editor update. It takes the prompt's `name`, and the suggestion's value and label.
 */
export function $createMentionNode(kind: string, value: string, label: string) {
  return new MentionNode(kind, value, label);
}

/** Whether a node is a mention. */
export function $isMentionNode(node: unknown): node is MentionNode {
  return node instanceof MentionNode;
}

/**
 * Something a prompt put in the document, such as a mentioned person. It is drawn whole, as its
 * prompt draws it. It is written as a span that names its prompt and its value, with its label as
 * its text.
 */
export class MentionNode extends DecoratorNode<ReactNode> {
  __kind: string;
  __value: string;
  __label: string;

  static getType() {
    return "mention";
  }

  static clone(node: MentionNode) {
    return new MentionNode(node.__kind, node.__value, node.__label, node.__key);
  }

  static importJSON(json: SerializedMentionNode) {
    return new MentionNode(json.kind, json.value, json.label);
  }

  exportJSON(): SerializedMentionNode {
    return {
      kind: this.__kind,
      value: this.__value,
      label: this.__label,
      type: "mention",
      version: 1,
    };
  }

  constructor(kind: string, value: string, label: string, key?: NodeKey) {
    super(key);
    this.__kind = kind;
    this.__value = value;
    this.__label = label;
  }

  static importDOM(): DOMConversionMap {
    return {
      span: (element: HTMLElement) =>
        element.hasAttribute("data-mention")
          ? {
              priority: 3,
              conversion: (span: HTMLElement) => ({
                node: new MentionNode(
                  span.getAttribute("data-mention") ?? "",
                  span.getAttribute("data-value") ?? "",
                  span.textContent?.trim() ?? "",
                ),
              }),
            }
          : null,
    };
  }

  exportDOM(): DOMExportOutput {
    const span = document.createElement("span");
    span.setAttribute("data-mention", this.__kind);
    span.setAttribute("data-value", this.__value);
    span.textContent = this.__label;
    return { element: span };
  }

  createDOM() {
    const span = document.createElement("span");
    span.className = "x-govuk-ui-editor-mention-slot";
    return span;
  }

  updateDOM() {
    return false;
  }

  isInline() {
    return true;
  }

  isKeyboardSelectable() {
    return true;
  }

  getTextContent() {
    return this.__label;
  }

  get label() {
    return this.__label;
  }

  decorate() {
    return (
      <Mention nodeKey={this.__key} kind={this.__kind} value={this.__value} label={this.__label} />
    );
  }
}

/** A mention as its prompt draws it, or as its label, in a chip. @internal */
function Mention({
  nodeKey,
  kind,
  value,
  label,
}: {
  nodeKey: NodeKey;
  kind: string;
  value: string;
  label: string;
}) {
  const [editor] = useLexicalComposerContext();
  const { mentions } = useEditorContext("Mention");
  const renderers = useStore(mentions);
  const [selected, setSelected] = useState(false);
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) =>
        setSelected(
          editorState.read(() => {
            const selection = $getSelection();
            return $isNodeSelection(selection) && selection.has(nodeKey);
          }),
        ),
      ),
    [editor, nodeKey],
  );
  const draw = renderers.get(kind);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: The arrow keys select a mention, as any node of the document.
    // biome-ignore lint/a11y/useKeyWithClickEvents: The arrow keys select a mention, as any node of the document.
    <span
      className="x-govuk-ui-editor-mention"
      data-mention={kind}
      data-selected={selected || undefined}
      onClick={() =>
        editor.update(() => {
          const node = $getNodeByKey(nodeKey);
          if (node) $setSelection($createNodeSelectionWith(node));
        })
      }
    >
      {draw ? draw({ value, label }) : label}
    </span>
  );
}

/** A suggestion a prompt offers. */
export type EditorPromptItem = {
  /** What it stands for, such as a person's id, written out with a mention. */
  value: string;
  /** Its name, as it goes into the document, and as the menu shows it unless it has `content`. */
  label: string;
  /** More words to find it by, such as a person's team, besides its label. */
  search?: string;
  /** How the menu shows it, such as with a picture. */
  content?: ReactNode;
  /** For a prompt that puts in text, the HTML it puts in, instead of its label. */
  html?: string;
};

/** The menu's surface takes the props. The list of suggestions inside it is the prompt's own. */
export type EditorPromptProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** What, typed, opens the prompt, such as "@" or "/". */
  trigger: string;
  /** The prompt's name, written on each mention it makes, such as "person". */
  name: string;
  /**
   * The suggestions, filtered as users type, by matching the start of words in each suggestion's
   * label and `search`. It can instead be a function that loads them once, when the prompt first
   * opens.
   */
  items?: readonly EditorPromptItem[] | (() => Promise<readonly EditorPromptItem[]>);
  /**
   * Finds the suggestions for what has been typed, such as from a service's search, instead of
   * `items`. It is called once typing pauses, and aborted when more is typed.
   */
  search?: (query: string, signal: AbortSignal) => Promise<readonly EditorPromptItem[]>;
  /**
   * What a chosen suggestion becomes. A `mention` is drawn whole and moved as one, as Lexxy's
   * attachments are. `text` goes in as its HTML, to edit like any other text.
   */
  insert?: "mention" | "text";
  /** Lets a search have spaces, such as for full names. Enter and Tab choose. */
  spaceInSearch?: boolean;
  /**
   * What must come before the trigger for it to open the prompt, as a regular expression. By
   * default, the start of a line or a space.
   */
  onlyAt?: string;
  /**
   * Where the menu opens. `auto` opens it below the caret unless there is no space. `top` and
   * `bottom` always open it above or below.
   */
  placement?: "auto" | "top" | "bottom";
  /** Shown when nothing matches. By default, the editor's `labels.nothingFound`. */
  emptyMessage?: string;
  /** Names the menu for screen readers, such as "Team members". By default, from `labels`. */
  label?: string;
  /** How a mention this prompt made is drawn in the document. By default, its label in a chip. */
  renderMention?: (mention: { value: string; label: string }) => ReactNode;
};

/** Text as it is compared, in lower case, without its accents. */
const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Where a search starts a word in text, or -1 where it starts none. */
export function matchPosition(text: string, query: string) {
  const wanted = normalise(query);
  if (!wanted) return 0;
  const match = normalise(text).match(
    new RegExp(`(?<![\\p{L}\\p{N}])${wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u"),
  );
  return match?.index ?? -1;
}

/** The most suggestions a menu shows. */
const most = 100;
/** How long typing pauses before a search is sent. */
const SEARCH_MS = 200;
/** The menu at its widest, as its styles set it, and the space it keeps from the window's edge. */
const MENU_WIDTH = 280;
const EDGE = 8;

/** The text being searched for, from the trigger to the caret, and on to the end of its word. */
function $queryAt(trigger: string, spaces: boolean) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  const node = selection.anchor.getNode();
  const offset = selection.anchor.offset;
  if (!$isTextNode(node) || $getNearestNodeOfType(node, CodeNode)) return null;
  const text = node.getTextContent();
  const before = text.slice(0, offset);
  const start = before.lastIndexOf(trigger);
  if (start === -1) return null;
  const typed = before.slice(start + trigger.length);
  if ((spaces ? /\n/ : /[ \n]/).test(typed)) return null;
  // The search continues past the caret to the end of the word, so a trigger typed before a name
  // finds the name. Punctuation between letters, as in O'Connor, is part of the word.
  let end = offset;
  while (end < text.length) {
    const char = text[end] ?? "";
    if (/\s/.test(char)) break;
    if (
      /\p{P}/u.test(char) &&
      !(/[\p{L}\p{N}]/u.test(text[end - 1] ?? "") && /[\p{L}\p{N}]/u.test(text[end + 1] ?? ""))
    )
      break;
    end++;
  }
  return { key: node.getKey(), start, query: text.slice(start + trigger.length, end), end };
}

/**
 * A prompt, such as for mentions or commands, after Lexxy's. Typing its trigger at the start of a
 * line or after a space opens a menu of suggestions at the caret, which typing filters. Up and Down
 * move through them. Enter, Tab or Space chooses one. A comma also chooses one, and is typed after
 * it. Escape closes the menu. Focus stays in the document throughout, and screen readers hear the
 * highlighted suggestion. The suggestions come from `items`, or from a service's `search`.
 */
export function EditorPrompt({
  trigger,
  name,
  items,
  search,
  insert = "mention",
  spaceInSearch = false,
  onlyAt = "^|[ \\n]",
  placement = "auto",
  emptyMessage,
  label,
  renderMention,
  className = "",
  style,
  ref,
  ...props
}: EditorPromptProps) {
  const { editor, labels, mentions, options } = useEditorContext("EditorPrompt");
  const listId = `${useId()}-prompt`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly EditorPromptItem[] | null>(null);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ x: number; y: number; above: boolean } | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  const popupRef = useMergedRef(popup, ref);
  const list = useRef<HTMLUListElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const viewportRef = useMergedRef(viewport, followHighlight);
  const loaded = useRef<readonly EditorPromptItem[] | null>(null);
  const state = useRef({ open, results, active, query });
  state.current = { open, results, active, query };
  const settings = useRef({ trigger, spaceInSearch, onlyAt, insert, name, items, search });
  settings.current = { trigger, spaceInSearch, onlyAt, insert, name, items, search };

  useEffect(() => {
    if (!renderMention) return;
    mentions.set(new Map(mentions.get()).set(name, renderMention));
    return () => {
      const rest = new Map(mentions.get());
      rest.delete(name);
      mentions.set(rest);
    };
  }, [mentions, name, renderMention]);

  const close = useCallback(() => {
    setOpen(false);
    setResults(null);
    setPlace(null);
  }, []);

  /** Puts the suggestion in, replacing the trigger and what was typed after it. */
  const choose = (item: EditorPromptItem | undefined, after = "") => {
    close();
    if (!item) return;
    editor.update(() => {
      const at = $queryAt(settings.current.trigger, settings.current.spaceInSearch);
      if (!at) return;
      const node = $getNodeByKey(at.key);
      if (!$isTextNode(node)) return;
      const text = node.getTextContent();
      const rest = text.slice(at.end);
      // Text put in takes the formatting of the text it goes into, as typing would.
      const styled = (words: string) =>
        $createTextNode(words).setFormat(node.getFormat()).setStyle(node.getStyle());
      let made: LexicalNode[];
      if (settings.current.insert === "mention")
        made = [new MentionNode(settings.current.name, item.value, item.label)];
      else if (item.html === undefined) made = [styled(item.label)];
      else made = $inlineNodesFromHtml(editor, item.html);
      const head = styled(text.slice(0, at.start));
      const tail = styled(`${after}${rest || " "}`);
      node.replace(head);
      let previous: LexicalNode = head;
      for (const each of made) previous = previous.insertAfter(each);
      previous.insertAfter(tail);
      if (!head.getTextContent()) head.remove();
      const offset = after.length + (rest ? 0 : 1);
      tail.select(offset, offset);
    });
    editor.focus();
  };

  // The trigger, typed where it is allowed, opens the menu. Once open, the menu follows the caret's
  // search, and closes when the caret leaves it.
  useEffect(() => {
    const pattern = () => new RegExp(`(?:${settings.current.onlyAt})$`);
    return editor.registerUpdateListener(({ editorState, tags }) => {
      if (tags.has(HISTORIC_TAG)) return;
      const at = editorState.read(() =>
        $queryAt(settings.current.trigger, settings.current.spaceInSearch),
      );
      if (!state.current.open) {
        if (!at) return;
        const opened = editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return false;
          const node = selection.anchor.getNode();
          const offset = selection.anchor.offset;
          if (
            node.getTextContent().slice(offset - settings.current.trigger.length, offset) !==
            settings.current.trigger
          )
            return false;
          return pattern().test($textBefore(node, offset - settings.current.trigger.length));
        });
        if (!opened) return;
        setActive(0);
        setQuery("");
        setOpen(true);
        return;
      }
      if (!at) close();
      else setQuery(at.query);
    });
  }, [editor, close]);

  // The suggestions for the search, filtered here or found by the service.
  useEffect(() => {
    if (!open) return;
    const { items: source, search: find } = settings.current;
    const controller = new AbortController();
    const filter = (all: readonly EditorPromptItem[]) => {
      if (!query) return all.slice(0, most);
      return all
        .map((item) => ({
          item,
          at: Math.min(
            ...[item.label, item.search ?? ""]
              .map((text) => matchPosition(text, query))
              .filter((at) => at >= 0),
            Number.POSITIVE_INFINITY,
          ),
        }))
        .filter(({ at }) => Number.isFinite(at))
        .sort((a, b) => a.at - b.at)
        .slice(0, most)
        .map(({ item }) => item);
    };
    const show = (found: readonly EditorPromptItem[]) => {
      if (controller.signal.aborted) return;
      setResults(found);
      setActive(0);
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (find) {
      timer = setTimeout(() => {
        find(query, controller.signal).then(
          (found) => show(found.slice(0, most)),
          () => {},
        );
      }, SEARCH_MS);
    } else if (typeof source === "function") {
      if (loaded.current) show(filter(loaded.current));
      else
        source().then(
          (all) => {
            loaded.current = all;
            show(filter(all));
          },
          () => show([]),
        );
    } else show(filter(source ?? []));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, query]);

  // While the menu is open, it handles the keys before Lexical does.
  useEffect(() => {
    if (!open) return;
    const handle = (run: (event: KeyboardEvent) => void) => (event: KeyboardEvent | null) => {
      if (!event) return false;
      event.preventDefault();
      event.stopPropagation();
      run(event);
      return true;
    };
    const chosen = () => state.current.results?.[state.current.active];
    const move = (step: number) => {
      const count = state.current.results?.length ?? 0;
      if (count === 0) return;
      setActive((index) => Math.min(count - 1, Math.max(0, index + step)));
    };
    const registered = [
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        handle(() => move(1)),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        handle(() => move(-1)),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        handle(() => choose(chosen())),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_TAB_COMMAND,
        handle(() => choose(chosen())),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        handle(() => close()),
        COMMAND_PRIORITY_CRITICAL,
      ),
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          if (event.key !== ",") return false;
          event.preventDefault();
          choose(chosen(), ",");
          return true;
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    ];
    if (!spaceInSearch)
      registered.push(
        editor.registerCommand(
          KEY_SPACE_COMMAND,
          handle(() => choose(chosen())),
          COMMAND_PRIORITY_CRITICAL,
        ),
        // Android's keyboard types a space without a key event.
        editor.registerCommand(
          INPUT_COMMAND,
          (event) => {
            const input = event as InputEvent;
            if (input.inputType !== "insertText" || input.data !== " ") return false;
            input.preventDefault();
            choose(chosen());
            return true;
          },
          COMMAND_PRIORITY_CRITICAL,
        ),
      );
    return mergeRegister(...registered);
  });

  // The menu goes at the caret, below it, or above it when there is no space or it is told to.
  // biome-ignore lint/correctness/useExhaustiveDependencies: The menu is placed again once its suggestions give it a height.
  useLayoutEffect(() => {
    if (!open) return;
    const root = editor.getRootElement();
    const selection = root?.ownerDocument.getSelection();
    if (!root || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0).cloneRange();
    let rect = range.getBoundingClientRect();
    if (
      rect.width === 0 &&
      rect.height === 0 &&
      range.startContainer.nodeType === Node.TEXT_NODE &&
      range.startOffset > 0
    ) {
      range.setStart(range.startContainer, range.startOffset - 1);
      rect = range.getBoundingClientRect();
    }
    const height = popup.current?.offsetHeight ?? 0;
    const above =
      placement === "top" ||
      (placement === "auto" && rect.bottom + height + 8 > window.innerHeight && rect.top > height);
    setPlace(
      (previous) => previous ?? { x: rect.left, y: above ? rect.top - 4 : rect.bottom + 4, above },
    );
  }, [open, editor, placement, results]);

  // The document says which suggestion is highlighted, as a combobox's would.
  useEffect(() => {
    const root = editor.getRootElement();
    if (!root) return;
    if (!open || !results?.length) {
      root.removeAttribute("aria-controls");
      root.removeAttribute("aria-activedescendant");
      root.removeAttribute("aria-haspopup");
      return;
    }
    root.setAttribute("aria-controls", listId);
    root.setAttribute("aria-activedescendant", `${listId}-${active}`);
    root.setAttribute("aria-haspopup", "listbox");
    // The highlighted suggestion is scrolled into the menu's view, and only the menu scrolls.
    const option = list.current?.querySelector(`#${CSS.escape(`${listId}-${active}`)}`);
    const scroller = viewport.current;
    if (!option || !scroller) return;
    const view = scroller.getBoundingClientRect();
    const item = option.getBoundingClientRect();
    if (item.top < view.top) scroller.scrollTop -= view.top - item.top;
    else if (item.bottom > view.bottom) scroller.scrollTop += item.bottom - view.bottom;
  }, [open, results, active, editor, listId]);

  useEffect(() => () => close(), [close]);

  if (!open || results === null || typeof document === "undefined" || !options.richText)
    return null;
  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: Pressing the menu keeps the caret in the document, as the keys stay there.
    <div
      {...props}
      ref={popupRef}
      className={`x-govuk-ui-floating x-govuk-ui-editor-prompt ${className}`.trim()}
      data-above={place?.above || undefined}
      data-empty={results.length === 0 || undefined}
      style={
        {
          ...style,
          left: Math.max(EDGE, Math.min(place?.x ?? 0, window.innerWidth - MENU_WIDTH - EDGE)),
          top: place?.y ?? 0,
          visibility: place ? undefined : "hidden",
        } as CSSProperties
      }
      onMouseDown={(event) => event.preventDefault()}
    >
      {/* The suggestions scroll in a Scroll area, which fades the edge with more beyond it. */}
      <ScrollArea viewportRef={viewportRef} className="x-govuk-ui-editor-prompt-scroll" fade>
        <span className="x-govuk-ui-editor-prompt-highlight" aria-hidden="true" />
        <ul
          ref={list}
          id={listId}
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: A listbox the document controls through aria-activedescendant, as focus stays in the document.
          role="listbox"
          aria-label={label ?? labels.suggestions}
          className="x-govuk-ui-editor-prompt-list"
        >
          {results.length === 0 ? (
            <li className="x-govuk-ui-editor-prompt-empty" role="presentation">
              {emptyMessage ?? labels.nothingFound}
            </li>
          ) : (
            results.map((item, index) => (
              // biome-ignore lint/a11y/useFocusableInteractive: Focus stays in the document, which names the highlighted option.
              // biome-ignore lint/a11y/useKeyWithClickEvents: The keys are the document's, which keeps focus.
              <li
                key={item.value}
                id={`${listId}-${index}`}
                // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: An option the document highlights through aria-activedescendant.
                role="option"
                aria-selected={index === active}
                data-highlighted={index === active || undefined}
                className="x-govuk-ui-editor-prompt-item"
                onPointerMove={() => setActive(index)}
                onClick={() => choose(item)}
              >
                {item.content ?? item.label}
              </li>
            ))
          )}
        </ul>
      </ScrollArea>
    </div>,
    document.body,
  );
}

/**
 * The highlight that glides to the suggestion under the pointer or the keys, in the menu's
 * viewport, as Combobox's, Select's and the menus' highlights do.
 */
function followHighlight(viewport: HTMLDivElement | null) {
  return trackHighlight(viewport, {
    indicator: ".x-govuk-ui-editor-prompt-highlight",
    item: ".x-govuk-ui-editor-prompt-item[data-highlighted]",
  });
}

/** HTML as inline nodes, to go into a line, as a paragraph's children instead of the paragraph. */
function $inlineNodesFromHtml(editor: LexicalEditor, html: string) {
  return $generateNodesFromDOM(editor, parseHtml(html)).flatMap((node) =>
    $isElementNode(node) && !node.isInline() ? node.getChildren() : [node],
  );
}
