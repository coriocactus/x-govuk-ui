"use client";

import { CodeHighlightNode, CodeNode, registerCodeIndentation } from "@lexical/code-core";
import { createEmptyHistoryState, type HistoryState } from "@lexical/history";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import type { Transformer } from "@lexical/markdown";
import { registerMarkdownShortcuts } from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { HeadingNode, type HeadingTagType, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { mergeRegister } from "@lexical/utils";
import {
  $getRoot,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CLEAR_HISTORY_COMMAND,
  COMMAND_PRIORITY_LOW,
  type EditorThemeClasses,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  type LexicalNodeReplacement,
  SKIP_DOM_SELECTION_TAG,
} from "lexical";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ErrorMessage, Field, Hint, Label, useField, useFormDefault } from "x-govuk-ui";
import { useMergedRef } from "x-govuk-ui/internal";
import { registerAttachments } from "./editor-attachment-behaviour";
import { attachmentState } from "./editor-attachment-state";
import { AttachmentNode, EmbedNode, GalleryNode } from "./editor-attachments";
import {
  registerDecoratorSelection,
  registerEnter,
  registerEscapes,
  registerKeys,
  registerLineSeparators,
  registerLinkOpener,
  registerProvisionalParagraphs,
  registerSelectionLabel,
  registerTripleClick,
} from "./editor-behaviour";
import { registerClipboard } from "./editor-clipboard";
import { registerCodeColours } from "./editor-code";
import { htmlImports, registerColours } from "./editor-colours";
import { $readFormat, type EditorFormat, noFormat } from "./editor-commands";
import { EditorContent, EditorCount, EditorValue, ValidityProxy } from "./editor-content";
import {
  createMentionStore,
  createStore,
  EditorContext,
  type EditorLinkPaste,
  type EditorMarkdownPaste,
  type EditorOptions,
  type EditorShared,
  type EditorUpload,
  type EditorUploadHelpers,
  type EditorValueFormat,
  focusDocument,
  type LinkState,
  useEditorContext,
} from "./editor-context";
import {
  defaultEditorLabels,
  type EditorColour,
  type EditorLabels,
  editorBackgrounds,
  editorColours,
} from "./editor-controls";
import { $getValue, $setValue, htmlExports, markdownTransformers } from "./editor-html";
import { registerLeadingTags } from "./editor-markdown";
import {
  EditorTableNode,
  EscapingCodeNode,
  EscapingListItemNode,
  ProvisionalParagraphNode,
} from "./editor-nodes";
import { MentionNode } from "./editor-prompt";
import { registerTables } from "./editor-tables";
import { EditorToolbar, LinkPopover } from "./editor-toolbar";
import { useUploads } from "./editor-uploads";

export type {
  EditorLinkPaste,
  EditorMarkdownPaste,
  EditorUpload,
  EditorUploadHelpers,
  EditorValueFormat,
};

export type EditorProps = Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange" | "children"
> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: string;
  /**
   * The name the document submits under in a form, in its `format`. In a Form, the editor finds its
   * error by this name.
   */
  name?: string;
  /** The document, in its `format`. Leave it out to let the editor keep track. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * What `value` is read and written as. By default, HTML, as Lexxy writes it. Markdown leaves out
   * what it cannot express, such as a colour or an attachment. An empty document is an empty
   * string. Read once.
   */
  format?: EditorValueFormat;
  /** Shown while the document is empty. */
  placeholder?: string;
  /** The document's least height, in lines of its text. By default, eight, as in Lexxy. */
  rows?: number;
  /**
   * The most lines the document shows before it scrolls inside its box, with the toolbar staying
   * put. Without it, the box grows with the document, as Lexxy's does, and the toolbar sticks to
   * the top of the page as it scrolls by.
   */
  maxRows?: number | null;
  disabled?: boolean;
  readOnly?: boolean;
  /**
   * Says the field must be filled in, and stops a plain form being sent while the document is
   * blank, with the browser's own message. A Form turns the browser's checks off, so check the
   * value by the editor's `name` in the Form's `validate`, as for any field.
   */
  required?: boolean;
  /**
   * Counts the characters, as GOV.UK's character count does, and says how many are left or how
   * many are over. Users can go over the limit, so they can see what to cut. It counts as a
   * textarea would. A line break, or a break between paragraphs, is one character, and a mention is
   * its name. An attachment, which is not text, counts for nothing.
   */
  characterLimit?: number;
  /** Counts words instead of characters. */
  wordLimit?: number;
  /**
   * The count shows once this share of the limit is used, from 0 to 1. By default, it always shows.
   */
  threshold?: number;
  /**
   * Rich text, as Lexxy's `richText`. Without it, the editor takes plain text, with no toolbar.
   * Read once.
   */
  richText?: boolean;
  /** Takes more than one line, as Lexxy's `multiLine`. Without it, Enter does nothing. */
  multiLine?: boolean;
  /**
   * Turns typed Markdown into formatting, such as two hashes and a space into a heading. It also
   * turns pasted Markdown into the document, as Lexxy's `markdown` does.
   */
  markdown?: boolean;
  /** The headings the formatting menu offers and Markdown makes. By default, h2, h3 and h4. */
  headings?: readonly HeadingTagType[];
  /** The colours the colour control offers, for text and its background. By default, GOV.UK's. */
  colours?: { text?: readonly EditorColour[]; background?: readonly EditorColour[] };
  /** Colours kept when pasted, beyond the ones offered, as CSS colours. Others are dropped. */
  permittedColours?: { text?: readonly string[]; background?: readonly string[] };
  /**
   * Takes files, such as images and video, attached where the caret is, from the toolbar, a paste
   * or a drop. It is on whenever there is `onUpload`, as Lexxy's `attachments`. Read once.
   */
  attachments?: boolean;
  /**
   * Stores a file somewhere, and returns where, while the editor shows its progress. Until then, an
   * image shows from the local file. Throw to say it could not be stored. Any form around the
   * editor, a Form or not, is stopped while files are uploading, and the field says to wait.
   */
  onUpload?: (file: File, helpers: EditorUploadHelpers) => Promise<EditorUpload | string>;
  /**
   * The types of file the editor takes, such as `["image/png"]`, or a whole kind, such as
   * `["image/*"]`. By default, any type.
   */
  permittedAttachmentTypes?: readonly string[];
  /** Decides whether a file may go in, before it is stored. Return false to leave it out. */
  onFileAccept?: (file: File) => boolean;
  /** Called with a web address pasted alone, once it is a link, so it can become more. */
  onLinkPaste?: (paste: EditorLinkPaste) => void;
  /** Called with Markdown pasted as text, to change what it makes before it goes in. */
  onMarkdownPaste?: (paste: EditorMarkdownPaste) => void;
  /**
   * Lets lists be checklists, with a box to tick, from the toolbar and from Markdown's `[ ]`. Read
   * once.
   */
  checkLists?: boolean;
  /** Lexical nodes of your own, for a part of yours to put in the document. Read once. */
  nodes?: readonly (Klass<LexicalNode> | LexicalNodeReplacement)[];
  /** The editor's words, such as for a service in Welsh. Words left out stay in English. */
  labels?: Partial<EditorLabels>;
  /** The Lexical editor itself, for commands of your own, such as from a button outside the box. */
  editorRef?: Ref<LexicalEditor | null>;
  /** Puts the caret in the document as the page opens, unless something else has focus. */
  autoFocus?: boolean;
  /**
   * The toolbar, the content and the editor's other parts, such as `EditorToolbar`,
   * `EditorContent`, `EditorPrompt` and the AI parts. By default, the toolbar and the content.
   */
  children?: ReactNode;
};

/**
 * The classes the editor draws the document with, beyond the prose's own elements. Text that is
 * both bold and italic is one strong element, so italic needs a class of its own. Bold needs one
 * too, for text that Lexical draws in another element, such as code.
 */
const theme: EditorThemeClasses = {
  text: {
    bold: "x-govuk-ui-editor-bold",
    italic: "x-govuk-ui-editor-italic",
    strikethrough: "x-govuk-ui-editor-strike",
    underline: "x-govuk-ui-editor-underline",
    underlineStrikethrough: "x-govuk-ui-editor-underline-strike",
    code: "x-govuk-ui-editor-inline-code",
  },
  list: {
    nested: { listitem: "x-govuk-ui-editor-nested" },
    checklist: "x-govuk-ui-editor-checklist",
    listitemChecked: "x-govuk-ui-editor-checked",
    listitemUnchecked: "x-govuk-ui-editor-unchecked",
  },
  code: "x-govuk-ui-editor-code",
  codeHighlight: Object.fromEntries(
    ["keyword", "string", "class", "property", "entity", "sign", "comment"].map((kind) => [
      kind,
      `x-govuk-ui-code-${kind}`,
    ]),
  ),
  link: "x-govuk-ui-editor-link",
  hrSelected: "x-govuk-ui-editor-selected",
  tableScrollableWrapper: "x-govuk-ui-editor-table",
  tableCellHeader: "x-govuk-ui-editor-header-cell",
  tableCellSelected: "x-govuk-ui-editor-selected-cell",
  tableSelection: "x-govuk-ui-editor-table-selection",
};

/** The nodes every rich document can contain. */
const richNodes: readonly (Klass<LexicalNode> | LexicalNodeReplacement)[] = [
  HeadingNode,
  QuoteNode,
  ListNode,
  EscapingListItemNode,
  {
    replace: ListItemNode,
    with: (node: ListItemNode) => new EscapingListItemNode(node.getValue(), node.getChecked()),
    withKlass: EscapingListItemNode,
  },
  CodeHighlightNode,
  EscapingCodeNode,
  {
    replace: CodeNode,
    with: (node: CodeNode) => new EscapingCodeNode(node.getLanguage()),
    withKlass: EscapingCodeNode,
  },
  LinkNode,
  AutoLinkNode,
  HorizontalRuleNode,
  EditorTableNode,
  { replace: TableNode, with: () => new EditorTableNode(), withKlass: EditorTableNode },
  TableRowNode,
  TableCellNode,
  ProvisionalParagraphNode,
  AttachmentNode,
  GalleryNode,
  EmbedNode,
  MentionNode,
];

/**
 * A field for rich text, such as a caseworker's note or a letter, built on Lexical, after
 * 37signals' Lexxy and with its defaults. It has a toolbar of formatting over the document, and
 * Markdown shortcuts as users type. It cleans up pasted Markdown, links and Word's lists.
 *
 * Its colours are GOV.UK's. It takes quotations, code coloured by its syntax, lists and tables.
 * Given `onUpload`, it also takes images, video and files, with captions and galleries.
 *
 * It is GOV.UK's form group, with the label, hint and error of any field. It submits with a form,
 * as HTML or as Markdown, and takes part in a Form by its `name`. It counts characters or words as
 * the Textarea does. Compose it from `EditorToolbar` and `EditorContent`, or leave them as the
 * default. Add prompts, such as mentions, with `EditorPrompt`, and suggestions from a model with
 * the AI parts.
 */
export function Editor({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  name,
  value,
  defaultValue,
  onValueChange,
  format = "html",
  placeholder,
  rows = 8,
  maxRows = null,
  disabled = false,
  readOnly = false,
  required = false,
  characterLimit,
  wordLimit,
  threshold = 0,
  richText = true,
  multiLine = true,
  markdown = true,
  headings = ["h2", "h3", "h4"],
  colours,
  permittedColours,
  attachments,
  onUpload,
  permittedAttachmentTypes,
  onFileAccept,
  onLinkPaste,
  onMarkdownPaste,
  checkLists = false,
  nodes = [],
  labels: ownLabels,
  editorRef,
  autoFocus = false,
  id,
  className = "",
  style,
  children,
  ref,
  "aria-describedby": describedBy,
  ...props
}: EditorProps) {
  // A form sent while files are uploading is stopped, and the field says why.
  const [waiting, setWaiting] = useState(false);
  // Kept while each word is the same, because labels given inline are a new object at each render.
  const merged = { ...defaultEditorLabels, ...ownLabels };
  const kept = useRef(merged);
  if (!sameEntries(kept.current, merged)) kept.current = merged;
  const labels = kept.current;
  const field = useField({
    id,
    name,
    hint,
    errorMessage: errorMessage ?? (waiting ? labels.uploadsBusy : undefined),
    "aria-describedby": describedBy,
  });
  const labelId = `${field.id}-label`;
  const countId = `${field.id}-info`;
  const limit = wordLimit ?? characterLimit;
  const unit = wordLimit ? "word" : "character";
  const box = useRef<HTMLDivElement>(null);
  const boxRef = useMergedRef(box, ref);
  // Kept as state, because the floating tools follow its scrolling once it is there.
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  // A Form can give the document to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(name)?.[0];
  const startWith = value ?? defaultValue ?? saved ?? "";
  // The document as written, which the hidden field submits. It is a store, so writing it renders
  // only what shows it, instead of the whole editor at each key.
  const [text] = useState(() => createStore(startWith));
  // What the document has been written as since a `value` came from outside. A `value` that only
  // echoes one of these, however late it comes, is then not set again.
  const emitted = useRef([startWith]);
  const change = useRef(onValueChange);
  change.current = onValueChange;
  const [source, setSource] = useState(false);

  // Read once, because Lexical creates the editor once with its nodes, and the nodes decide what it
  // can contain.
  const [initial] = useState(() => {
    const options = {
      richText,
      format,
      attachments: richText && (attachments ?? Boolean(onUpload)),
      checkLists: richText && checkLists,
      // Plain text has no Markdown, so what would make a heading stays as it was typed.
      transformers: richText ? markdownTransformers(headings, checkLists) : [],
    };
    return {
      ...options,
      config: {
        namespace: "x-govuk-ui-editor",
        theme,
        nodes: richText ? [...richNodes, ...nodes] : [ProvisionalParagraphNode, ...nodes],
        editable: !disabled && !readOnly,
        onError: (error: Error) => {
          throw error;
        },
        html: { export: htmlExports, import: htmlImports },
        editorState: (editor: LexicalEditor) => {
          // What the document takes is known before the value is read into it.
          const state = attachmentState(editor);
          state.enabled = options.attachments;
          state.permitted = permittedAttachmentTypes ?? null;
          $setValue(editor, startWith, options.format, options.transformers);
        },
      },
    };
  });
  const transformers: Transformer[] = initial.transformers;

  // Kept while their contents are the same, because lists given inline are new at each render.
  const optionsKey = JSON.stringify([
    multiLine,
    markdown,
    headings,
    colours,
    permittedColours,
    permittedAttachmentTypes,
  ]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The key stands for the options' contents.
  const options: EditorOptions = useMemo(
    () => ({
      richText: initial.richText,
      multiLine,
      markdown: initial.richText && markdown,
      attachments: initial.attachments,
      headings,
      colours: {
        text: colours?.text ?? editorColours,
        background: colours?.background ?? editorBackgrounds,
      },
      permittedColours: {
        text: permittedColours?.text ?? [],
        background: permittedColours?.background ?? [],
      },
      permittedAttachmentTypes: permittedAttachmentTypes ?? null,
      format: initial.format,
    }),
    [optionsKey, initial],
  );

  const describes =
    [field.controlProps["aria-describedby"], limit ? countId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <LexicalComposer initialConfig={initial.config}>
      <EditorRoot
        field={field}
        labelId={labelId}
        describes={describes}
        labels={labels}
        options={options}
        transformers={transformers}
        nodes={initial.config.nodes}
        checkLists={initial.checkLists}
        box={box}
        body={body}
        setBody={setBody}
        maxRows={maxRows}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        placeholder={placeholder}
        text={text}
        setWaiting={setWaiting}
        emitted={emitted}
        change={change}
        value={value}
        source={source}
        setSource={setSource}
        onUpload={onUpload}
        onFileAccept={onFileAccept}
        onLinkPaste={onLinkPaste}
        onMarkdownPaste={onMarkdownPaste}
        editorRef={editorRef}
        autoFocus={autoFocus}
        initialValue={startWith}
        name={name}
      >
        <Field invalid={field.invalid}>
          {/* The label names the content by id, because a label cannot be for a box of prose.
              Pressing it puts the caret in the document, as pressing a field's label would. */}
          <EditorLabel id={labelId} hidden={hideLabel}>
            {label}
          </EditorLabel>
          <Hint id={field.hintId}>{hint}</Hint>
          <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
          <div
            {...props}
            ref={boxRef}
            className={`x-govuk-ui-editor ${className}`.trim()}
            data-disabled={disabled || undefined}
            data-invalid={field.invalid || undefined}
            data-capped={maxRows !== null || undefined}
            data-source={source || undefined}
            data-plain={!initial.richText || undefined}
            style={
              {
                "--x-govuk-ui-editor-rows": rows,
                "--x-govuk-ui-editor-max-rows": maxRows ?? undefined,
                ...style,
              } as CSSProperties
            }
          >
            {children ?? (
              <>
                {initial.richText && <EditorToolbar />}
                <EditorContent />
              </>
            )}
          </div>
          {name && <EditorValue name={name} text={text} />}
          {limit !== undefined && (
            <EditorCount id={countId} limit={limit} unit={unit} threshold={threshold} />
          )}
        </Field>
      </EditorRoot>
    </LexicalComposer>
  );
}

/** The label, which puts the caret in the document when pressed. @internal */
function EditorLabel({
  id,
  hidden,
  children,
}: {
  id: string;
  hidden: boolean;
  children: ReactNode;
}) {
  const [editor] = useLexicalComposerContext();
  return (
    <Label id={id} visuallyHidden={hidden} onClick={() => focusDocument(editor)}>
      {children}
    </Label>
  );
}

type RootProps = {
  field: ReturnType<typeof useField>;
  labelId: string;
  describes: string | undefined;
  labels: EditorLabels;
  options: EditorOptions;
  transformers: Transformer[];
  nodes: EditorShared["nodes"];
  checkLists: boolean;
  box: RefObject<HTMLDivElement | null>;
  body: HTMLDivElement | null;
  setBody: (body: HTMLDivElement | null) => void;
  maxRows: number | null;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  placeholder: string | undefined;
  text: ReturnType<typeof createStore<string>>;
  setWaiting: (waiting: boolean) => void;
  emitted: RefObject<string[]>;
  change: RefObject<((value: string) => void) | undefined>;
  value: string | undefined;
  source: boolean;
  setSource: (source: boolean) => void;
  onUpload: EditorProps["onUpload"];
  onFileAccept: EditorProps["onFileAccept"];
  onLinkPaste: EditorProps["onLinkPaste"];
  onMarkdownPaste: EditorProps["onMarkdownPaste"];
  editorRef: EditorProps["editorRef"];
  autoFocus: boolean;
  /** The document the editor started with, which a form's reset puts back. */
  initialValue: string;
  /** What the value is sent as. */
  name: string | undefined;
  children: ReactNode;
};

/**
 * Where the caret is on the page, for a popover opened from the document to be placed against. A
 * caret between elements has no size of its own, so the line or the document stands in for it.
 */
function caretRect(editor: LexicalEditor) {
  const root = editor.getRootElement();
  const selection = root?.ownerDocument.getSelection();
  if (!root || !selection?.rangeCount) return root?.getBoundingClientRect() ?? null;
  const range = selection.getRangeAt(0);
  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  if (rect.width || rect.height) return rect;
  const container = range.startContainer;
  const element = container instanceof Element ? container : container.parentElement;
  return (root.contains(element) ? element : root)?.getBoundingClientRect() ?? null;
}

/** Whether two objects have the same values under the same keys, with functions by identity. */
function sameEntries<T extends object>(a: T, b: T) {
  const keys = Object.keys(a) as (keyof T)[];
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]));
}

/** The most written-out values that the editor waits to hear back from its owner. */
const ECHOES = 50;

/** Tags an update that sets the document from its value, so it is not written out again. */
const VALUE_TAG = "x-govuk-ui-value";

/** How long a message for screen readers stays in the page, once announced. */
const SPOKEN_MS = 1000;

/**
 * Records what the document was written as, unless it was last written the same way. A value its
 * owner never gives back, such as when the owner keeps its own, is forgotten after a while.
 * @internal
 */
function emit(emitted: RefObject<string[]>, next: string) {
  const written = emitted.current;
  if (written.at(-1) === next) return false;
  written.push(next);
  if (written.length > ECHOES) written.splice(0, written.length - ECHOES);
  return true;
}

/**
 * Everything inside the composer, which creates the editor. That is what the parts share, and the
 * behaviour registered on the editor. @internal
 */
function EditorRoot({
  field,
  labelId,
  describes,
  labels,
  options,
  transformers,
  nodes,
  checkLists,
  box,
  body,
  setBody,
  maxRows,
  disabled,
  readOnly,
  required,
  placeholder,
  text,
  setWaiting,
  emitted,
  change,
  value,
  source,
  setSource,
  onUpload,
  onFileAccept,
  onLinkPaste,
  onMarkdownPaste,
  editorRef,
  autoFocus,
  initialValue,
  name,
  children,
}: RootProps) {
  const [editor] = useLexicalComposerContext();
  useImperativeHandle<LexicalEditor | null, LexicalEditor | null>(editorRef, () => editor, [
    editor,
  ]);
  const [format] = useState(() => createStore(noFormat));
  const [history] = useState(() => createStore({ undo: false, redo: false }));
  const [historyState] = useState<HistoryState>(createEmptyHistoryState);
  const [link] = useState(() =>
    createStore<LinkState>({
      open: false,
      anchor: null,
      caret: null,
    }),
  );
  const openLink = useCallback(
    (anchor: Element | null) => {
      link.set({ open: true, anchor, caret: caretRect(editor) });
    },
    [editor, link],
  );
  const [mentions] = useState(createMentionStore);
  const live = useRef<HTMLSpanElement>(null);
  const announce = useCallback((message: string) => {
    if (!message) return;
    const notify = (
      document as Document & { ariaNotify?: (text: string, options?: object) => void }
    ).ariaNotify;
    if (typeof notify === "function") return notify.call(document, message, { priority: "high" });
    const region = live.current;
    if (!region) return;
    const spoken = document.createElement("div");
    spoken.textContent = message;
    region.append(spoken);
    setTimeout(() => spoken.remove(), SPOKEN_MS);
  }, []);
  const uploads = useUploads({
    editor,
    enabled: options.attachments,
    permitted: options.permittedAttachmentTypes,
    onUpload,
    onFileAccept,
  });

  // The caret goes in as the page opens, if nothing else on it has focus.
  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => {
      if (document.activeElement === document.body || !document.activeElement) editor.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, autoFocus]);

  // A form's reset puts back the document the editor started with, without a step to undo, as a
  // field's reset does. A controlled editor's owner resets its value.
  const reset = useRef({ value, initialValue });
  reset.current = { value, initialValue };
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      if (reset.current.value !== undefined) return;
      const start = reset.current.initialValue;
      emitted.current = [start];
      text.set(start);
      editor.update(() => $setValue(editor, start, options.format, transformers), {
        tag: [VALUE_TAG, SKIP_DOM_SELECTION_TAG],
      });
      editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [editor, box, emitted, text, options.format, transformers]);

  // Lexical keeps the editor's editability as it was created, so a change is passed to it.
  useEffect(() => {
    editor.setEditable(!disabled && !readOnly);
  }, [editor, disabled, readOnly]);

  // The value follows the document. It is written out once a frame, not at each key, because it is
  // the whole document. It is written at once where it is read sooner. That is as a form's data is
  // gathered, by sending it, by `form.submit()` or by `new FormData(form)`. It is also as the page
  // is hidden, where frames stop, and as the editor is removed.
  const pending = useRef(0);
  const flush = useCallback(() => {
    if (!pending.current) return;
    cancelAnimationFrame(pending.current);
    pending.current = 0;
    const next = editor
      .getEditorState()
      .read(() => $getValue(editor, options.format, transformers), { editor });
    if (!emit(emitted, next)) return;
    text.set(next);
    change.current?.(next);
  }, [editor, options.format, transformers, emitted, text, change]);
  useEffect(() => {
    const form = box.current?.closest("form");
    const doc = box.current?.ownerDocument;
    // The form's data takes the value itself, because the hidden field has it only once React
    // renders.
    const onFormData = (event: FormDataEvent) => {
      flush();
      if (name) event.formData.set(name, text.get());
    };
    // Files still uploading stop the form being sent, before any of the page's handlers sees it.
    const onSubmit = (event: SubmitEvent) => {
      if (uploadsRef.current.get().size === 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setWaiting(true);
      focusDocument(editor);
    };
    const onHidden = () => {
      if (doc?.visibilityState === "hidden") flush();
    };
    form?.addEventListener("formdata", onFormData);
    form?.addEventListener("submit", onSubmit, { capture: true });
    doc?.addEventListener("visibilitychange", onHidden);
    return () => {
      form?.removeEventListener("formdata", onFormData);
      form?.removeEventListener("submit", onSubmit, { capture: true });
      doc?.removeEventListener("visibilitychange", onHidden);
      flush();
    };
  }, [editor, box, flush, text, setWaiting, name]);
  const uploadsRef = useRef(uploads.progress);
  uploadsRef.current = uploads.progress;
  // The field stops saying to wait once every file is stored.
  useEffect(
    () =>
      uploads.progress.subscribe(() => {
        if (uploads.progress.get().size === 0) setWaiting(false);
      }),
    [uploads.progress, setWaiting],
  );

  // The toolbar follows the selection and history.
  useEffect(() => {
    // The controls render again only when what they show has changed.
    const follow = (next: EditorFormat) => {
      const current = format.get();
      if ((Object.keys(next) as (keyof EditorFormat)[]).some((key) => next[key] !== current[key]))
        format.set(next);
    };
    follow(editor.getEditorState().read(() => $readFormat(), { editor }));
    return mergeRegister(
      editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves, tags }) => {
        follow(editorState.read(() => $readFormat(), { editor }));
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        if (tags.has(VALUE_TAG)) return;
        if (pending.current) return;
        // A hidden page draws no frames, so its value, such as an upload's address, is written
        // at once.
        if (editor.getRootElement()?.ownerDocument.visibilityState === "hidden") {
          pending.current = -1;
          flush();
          return;
        }
        pending.current = requestAnimationFrame(() => {
          pending.current = -1;
          flush();
        });
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (undo) => {
          history.set({ ...history.get(), undo });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (redo) => {
          history.set({ ...history.get(), redo });
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, format, history, flush]);

  // A `value` from outside replaces the document. A value the document wrote is its owner echoing
  // it back, which may come after more typing, because React renders after the document changes. If
  // it were set again, it would undo what was typed since.
  useEffect(() => {
    if (value === undefined) return;
    const echo = emitted.current.lastIndexOf(value);
    if (echo !== -1) {
      emitted.current.splice(0, echo);
      return;
    }
    // The value replaces what was typed but not yet written out.
    cancelAnimationFrame(pending.current);
    pending.current = 0;
    emitted.current = [value];
    text.set(value);
    const focused = editor.getRootElement()?.contains(document.activeElement);
    editor.update(
      () => {
        $setValue(editor, value, options.format, transformers);
        if (focused) $getRoot().selectEnd();
      },
      { tag: focused ? VALUE_TAG : [VALUE_TAG, SKIP_DOM_SELECTION_TAG] },
    );
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
  }, [editor, value, options.format, transformers, emitted, text]);

  // The behaviour Lexxy adds to Lexical's, registered once the editor's options are known.
  const { richText, multiLine, markdown, attachments } = options;
  // Kept by their contents, because they come as new lists with each render.
  const coloursKey = JSON.stringify([
    [...options.colours.text.map((colour) => colour.value), ...options.permittedColours.text],
    [
      ...options.colours.background.map((colour) => colour.value),
      ...options.permittedColours.background,
    ],
  ]);
  const allowedColours = useMemo(() => {
    const [text = [], background = []] = JSON.parse(coloursKey) as string[][];
    return { text, background };
  }, [coloursKey]);
  const paste = useRef({ onLinkPaste, onMarkdownPaste });
  paste.current = { onLinkPaste, onMarkdownPaste };
  const upload = useRef(uploads.uploadFiles);
  upload.current = uploads.uploadFiles;
  const announceRef = useRef(announce);
  announceRef.current = announce;
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  useEffect(() => {
    const registered = [
      registerEnter(editor, multiLine),
      registerLineSeparators(editor),
      registerTripleClick(editor),
      registerProvisionalParagraphs(editor),
    ];
    if (richText)
      registered.push(
        registerKeys(editor),
        registerEscapes(editor),
        registerDecoratorSelection(editor),
        registerSelectionLabel(editor, () => labelsRef.current),
        registerLinkOpener(editor, () => box.current),
        registerColours(editor, allowedColours),
        registerCodeColours(editor),
        registerCodeIndentation(editor),
        registerTables(editor),
        registerClipboard(editor, {
          markdown,
          attachments,
          upload: (files, altText) => upload.current(files, { altText }),
          onLinkPaste: (detail) => paste.current.onLinkPaste?.(detail),
          onMarkdownPaste: (detail) => paste.current.onMarkdownPaste?.(detail),
        }),
      );
    if (richText && attachments)
      registered.push(
        registerAttachments(editor, {
          upload: (files) => upload.current(files),
          announce: (message) => announceRef.current(message),
          labels: () => labelsRef.current,
        }),
      );
    if (richText && markdown)
      registered.push(
        registerMarkdownShortcuts(editor, transformers),
        registerLeadingTags(editor, transformers),
      );
    return mergeRegister(...registered);
  }, [editor, richText, multiLine, markdown, attachments, allowedColours, transformers, box]);

  const toggleSource = useCallback(() => {
    if (source) {
      // What was typed as source is read back as the document, and written out again as the editor
      // would write it. Read-only source was never changed.
      if (!readOnly)
        editor.update(() => $setValue(editor, text.get(), options.format, transformers));
      setSource(false);
      requestAnimationFrame(() => focusDocument(editor));
    } else {
      // The source shows the current document, written out now.
      flush();
      setSource(true);
    }
  }, [editor, source, setSource, text, options.format, transformers, flush, readOnly]);
  const editSource = useCallback(
    (next: string) => {
      if (!emit(emitted, next)) return;
      text.set(next);
      change.current?.(next);
    },
    [emitted, text, change],
  );

  // The parts render again only when what they share changes, not at every key.
  const capped = maxRows !== null;
  const shared: EditorShared = useMemo(
    () => ({
      editor,
      id: field.id,
      labelId,
      describedBy: describes,
      invalid: field.invalid,
      required,
      placeholder,
      labels,
      options,
      nodes,
      transformers,
      disabled,
      readOnly,
      box,
      body,
      setBody,
      capped,
      format,
      history,
      text,
      source,
      toggleSource,
      editSource,
      pickFiles: uploads.pickFiles,
      uploadFiles: uploads.uploadFiles,
      insertAttachment: uploads.insertAttachment,
      uploads: uploads.progress,
      announce,
      link,
      openLink,
      mentions,
    }),
    [
      editor,
      field.id,
      labelId,
      describes,
      field.invalid,
      required,
      placeholder,
      labels,
      options,
      nodes,
      transformers,
      disabled,
      readOnly,
      box,
      body,
      setBody,
      capped,
      format,
      history,
      text,
      source,
      toggleSource,
      editSource,
      uploads.pickFiles,
      uploads.uploadFiles,
      uploads.insertAttachment,
      uploads.progress,
      announce,
      link,
      openLink,
      mentions,
    ],
  );
  return (
    <EditorContext value={shared}>
      {children}
      <HistoryPlugin externalHistoryState={historyState} />
      {options.richText && (
        <>
          <ListPlugin />
          {checkLists && <CheckListPlugin />}
          <TablePlugin hasCellMerge={false} hasCellBackgroundColor={false} hasHorizontalScroll />
          <LinkPopover />
        </>
      )}
      {uploads.input}
      {/* What the editor announces about its attachments, where the browser has no ariaNotify. */}
      <span ref={live} className="x-govuk-ui-visually-hidden" aria-live="assertive" />
      {/* Stops a plain form being sent while the document is blank and required, with the
          browser's own message, as Lexxy's form control does. */}
      {required && <ValidityProxy />}
    </EditorContext>
  );
}

/**
 * What a part of your own inside an Editor can reach, such as a control that runs a command of
 * yours, or a floating tool over a node of yours. It returns:
 *
 * - the Lexical editor
 * - the editor's words and options
 * - whether it can be edited now
 * - what screen readers hear
 * - attachments, stored by `onUpload` or already stored, such as from the service's own library
 * - whether the source shows in place of the document, and a way to show or hide it, as the
 *   Source control has
 */
export function useEditor() {
  const {
    editor,
    labels,
    options,
    disabled,
    readOnly,
    announce,
    uploadFiles,
    insertAttachment,
    source,
    toggleSource,
  } = useEditorContext("useEditor");
  return {
    editor,
    labels,
    options,
    disabled,
    readOnly,
    announce,
    uploadFiles,
    insertAttachment,
    source,
    toggleSource,
  };
}
