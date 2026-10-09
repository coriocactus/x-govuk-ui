"use client";

import { ScrollArea as Primitive } from "@base-ui/react/scroll-area";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  type LexicalNode,
} from "lexical";
import {
  type ComponentPropsWithRef,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CodeBlock } from "x-govuk-ui";
import { CharacterCountNote, countWords, ScrollAreaBars, useMergedRef } from "x-govuk-ui/internal";
import { EditorAttachmentTools } from "./editor-attachment-tools";
import { $holdsText } from "./editor-behaviour";
import { focusDocument, type Store, useEditorContext, useStore } from "./editor-context";
import { formatHtml } from "./editor-html";
import { EditorCodeLanguage, EditorLinkTools, EditorTableTools } from "./editor-tools";

// The document and what stands beside it in the field. These are the document's body and source,
// the hidden field a form sends, the check a plain form makes, and the count.

/**
 * The document as a form sends it, in a hidden field under the editor's `name`. It renders on its
 * own as the document is written. @internal
 */
export function EditorValue({ name, text }: { name: string; text: Store<string> }) {
  return <input type="hidden" name={name} value={useStore(text)} />;
}

/**
 * A field that a plain form checks for the editor, because the form cannot check a box of prose.
 * The field has no value of its own. A Form checks the editor's value by its `name` in `validate`,
 * as it does any field's, because it turns the browser's own checks off. @internal
 */
export function ValidityProxy() {
  const { editor, text } = useEditorContext("Editor");
  // An empty document is written as nothing at all.
  const blank = useStore(text).trim() === "";
  return (
    <input
      className="x-govuk-ui-editor-validity"
      tabIndex={-1}
      aria-hidden="true"
      required={blank}
      value=""
      readOnly={false}
      onChange={() => {}}
      // The browser focuses the field it could not send, and the document takes that focus.
      onFocus={() => focusDocument(editor)}
      onInvalid={() => focusDocument(editor)}
    />
  );
}

/** The document's body takes the props, as the element that scrolls. */
export type EditorContentProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /**
   * The tools that float over the document, in the box beside its body. By default, they are the
   * editor's own, which are the table's, the code block's language, the link's and the
   * attachment's. Give `null` for none, or give the editor's own one by one, beside tools of your
   * own made with `EditorTools`. Plain text has none.
   */
  tools?: ReactNode;
};

/**
 * The document itself, where users write. Its body is a scroll area's viewport, so a document
 * capped at `maxRows` scrolls inside the box, with the library's thin scrollbar. The table's tools,
 * the code block's language and a link's tools come up over what the caret is in. An attachment's
 * tools come up over the selected attachment. It can be given `tools` of its own instead. While
 * the source shows, a Code block takes its place.
 */
export function EditorContent({ className = "", style, ref, tools, ...props }: EditorContentProps) {
  const context = useEditorContext("EditorContent");
  const {
    capped,
    source,
    id,
    labelId,
    describedBy,
    invalid,
    required,
    placeholder,
    options,
    setBody,
  } = context;
  const bodyRef = useMergedRef(setBody, ref);
  // The document's last height, so the source can take exactly its place. The callback is kept,
  // because a new one would observe again at every render.
  const height = useRef(0);
  const watched = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (!element.hidden) height.current = element.offsetHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const content = (
    <ContentEditable
      id={id}
      className="x-govuk-ui-editor-content x-govuk-ui-prose"
      ariaLabelledBy={labelId}
      ariaDescribedBy={describedBy}
      ariaInvalid={invalid || undefined}
      ariaRequired={required || undefined}
      ariaMultiline={options.multiLine}
      {...(placeholder
        ? {
            "aria-placeholder": placeholder,
            placeholder: <div className="x-govuk-ui-editor-placeholder">{placeholder}</div>,
          }
        : { placeholder: null })}
    />
  );
  const Plugin = options.richText ? RichTextPlugin : PlainTextPlugin;
  return (
    <>
      <Primitive.Root
        ref={watched}
        className="x-govuk-ui-scroll-area x-govuk-ui-editor-scroll"
        data-orientation="vertical"
        hidden={source}
      >
        {/* biome-ignore lint/a11y/useValidAriaRole: Undefined removes Base UI's role rather than setting one. */}
        <Primitive.Viewport
          ref={bodyRef}
          // The document inside is the Tab stop, so the body is not.
          role={undefined}
          tabIndex={undefined}
          {...props}
          className={`x-govuk-ui-editor-body ${className}`.trim()}
          style={{ ...style, overflowX: "hidden", overflowY: capped ? "auto" : "visible" }}
        >
          <Primitive.Content className="x-govuk-ui-scroll-area-content x-govuk-ui-editor-document">
            <Plugin contentEditable={content} ErrorBoundary={LexicalErrorBoundary} />
          </Primitive.Content>
        </Primitive.Viewport>
        <ScrollAreaBars vertical horizontal={false} />
      </Primitive.Root>
      {source && <EditorSource height={height.current} />}
      {options.richText &&
        !source &&
        (tools === undefined ? (
          <>
            <EditorTableTools />
            <EditorCodeLanguage />
            <EditorLinkTools />
            <EditorAttachmentTools />
          </>
        ) : (
          tools
        ))}
    </>
  );
}

/**
 * The document's source, as the field submits it, in an editable Code block, coloured and
 * numbered. It takes the document's place and height, and is read back as the document when the
 * source is left. HTML is set out one block to a line, because the editor writes it all on one
 * line, and the space between blocks is ignored as it is read back. Markdown already has its lines.
 * In a read-only editor, the source can be read but not changed. It renders on its own as it is
 * typed in.
 * @internal
 */
function EditorSource({ height }: { height: number }) {
  const { text, editSource, labelId, labels, options, readOnly } = useEditorContext("EditorSource");
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const value = useStore(text);
  const markdown = options.format === "markdown";
  // What was typed shows as it was typed. Anything else, such as the document as the source opened,
  // or a value the service set while it shows, is set out again.
  const typed = useRef<string | null>(null);
  const shown = value === typed.current || markdown ? value : formatHtml(value);
  useEffect(() => {
    field.current?.focus();
    // The caret starts at the top, as the document's did, wherever the browser put it.
    field.current?.setSelectionRange(0, 0);
  }, []);
  return (
    <CodeBlock
      className="x-govuk-ui-editor-source"
      code={shown}
      language={markdown ? "md" : "html"}
      label={labels.sourceText}
      editable
      onCodeChange={(next) => {
        typed.current = next;
        editSource(next);
      }}
      inputProps={{
        ref: field,
        id,
        readOnly,
        // Named by the field's label, then as its source.
        "aria-labelledby": `${labelId} ${id}`,
        "aria-label": labels.sourceText,
        ...{ "data-format": options.format },
      }}
      style={{ height: height || undefined }}
    />
  );
}

/**
 * The document's text as a user counts it, as a textarea's would be. It counts the words, and one
 * character for each line break and each break between blocks. An attachment is not text, so it
 * counts for nothing, and a mention counts as its name. It is null for a node that is not text.
 */
function $countedText(node: LexicalNode): string | null {
  if ($isTextNode(node) || $isLineBreakNode(node)) return node.getTextContent();
  if ($isDecoratorNode(node))
    return node.isInline() && $holdsText(node.getParent()) ? node.getTextContent() : null;
  if (!$isElementNode(node)) return null;
  const parts = node.getChildren().map($countedText);
  if (node.isInline() || $holdsText(node)) return parts.join("");
  return parts.filter((part) => part !== null).join("\n");
}

type EditorCountProps = {
  id: string;
  limit: number;
  unit: "character" | "word";
  threshold: number;
};

/**
 * GOV.UK's character count beneath the document, saying how many characters or words are left.
 * The Editor shows one itself when it has a limit. @internal
 */
export function EditorCount({ id, limit, unit, threshold }: EditorCountProps) {
  const { editor, box, labels } = useEditorContext("EditorCount");
  const [count, setCount] = useState(0);
  useEffect(() => {
    const measure = () => {
      const text = editor.getEditorState().read(() => $countedText($getRoot()) ?? "", { editor });
      const counted = unit === "word" ? countWords(text) : text.length;
      setCount(counted);
      // The box's edge turns red past the limit, without a render of the box's own.
      box.current?.toggleAttribute("data-over-limit", counted > limit);
    };
    measure();
    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size > 0 || dirtyLeaves.size > 0) measure();
    });
  }, [editor, unit, limit, box]);
  return (
    <div className="x-govuk-ui-editor-count">
      <CharacterCountNote
        id={id}
        limit={limit}
        count={count}
        unit={unit}
        threshold={threshold}
        words={labels.count}
      />
    </div>
  );
}
