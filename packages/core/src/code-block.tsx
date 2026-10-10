"use client";

import {
  type ComponentPropsWithRef,
  type CSSProperties,
  createContext,
  memo,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { type CodeToken, codeTokens } from "./code-tokens";
import { CopyButton, type CopyLabels } from "./copy";
import { ScrollArea } from "./scroll-area";

export type CodeBlockProps = ComponentPropsWithRef<"figure"> & {
  /**
   * Lets users change the code. They type in a text box laid over the coloured code, which is
   * coloured again as they type. The caret, selection, undo and screen reader support are then the
   * browser's own. Tab leaves the box, as it leaves any text box.
   */
  editable?: boolean;
  /** Called with the code as it is typed, in an editable block. */
  onCodeChange?: (code: string) => void;
  /**
   * Attributes for the editable block's text box, such as a `name` to send it with a form, an
   * `id`, `aria-describedby` or a `ref`. The filename or `label` names it, unless it has a name of
   * its own.
   */
  inputProps?: ComponentPropsWithRef<"textarea">;
  /**
   * The language to colour, by name, alias or file extension, such as "tsx", "python", "rb" or
   * "html". Code in a language the block does not know is shown plain.
   */
  language?: string;
  /** Shows a header naming the file, with the actions beside the name. */
  filename?: string;
  /** Names the code for screen readers when there is no filename. */
  label?: string;
  lineNumbers?: boolean;
  /**
   * Wraps long lines at the block's width, so it never scrolls sideways. A wrapped line keeps one
   * number, and the rest of it lines up under its code. An editable block's text box wraps in the
   * same places, so each character still sits on its colour.
   */
  wrap?: boolean;
  /** The block's least height, in lines of code. */
  rows?: number;
  /**
   * The most lines the block shows before it scrolls inside. Without it, the block is as tall as
   * its code, unless its container sets a height.
   */
  maxRows?: number;
  /** Actions for the code, such as `CodeBlockCopy`. */
  children?: ReactNode;
} & (
    | {
        /**
         * The code. In an editable block, it changes only when its owner changes it, in response to
         * `onCodeChange`.
         */
        code: string;
        defaultCode?: never;
      }
    | {
        code?: never;
        /** The code an editable block starts with, which then changes as it is typed. */
        defaultCode: string;
      }
  );

const CodeContext = createContext<string | null>(null);

/**
 * Splits code into lines of runs, each with its kind of code. A final line break ends the last
 * line, unless `open` keeps the empty line after it, where the caret can stand, as a text box
 * does.
 */
function lineTokens(code: string, language: string, open: boolean) {
  const lines: CodeToken[][] = [[]];
  for (const [kind, value] of codeTokens(code, language)) {
    // Comments and template strings can span lines, so tokens are split at each line break.
    value.split("\n").forEach((part, index) => {
      if (index) lines.push([]);
      if (part) lines.at(-1)!.push([kind, part]);
    });
  }
  if (!open && lines.length > 1 && !lines.at(-1)!.length) lines.pop();
  return lines;
}

/** A line's runs as text and coloured spans. */
function drawLine(tokens: CodeToken[]): ReactNode[] {
  return tokens.map(([kind, text], index) =>
    kind === null ? (
      text
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: A run has only its place in the line.
      <span key={index} className={`x-govuk-ui-code-${kind}`}>
        {text}
      </span>
    ),
  );
}

/**
 * Splits highlighted code into lines of text and coloured spans. File diff colours code with it
 * too. A final line break ends the last line, unless `open` keeps the empty line after it, where
 * the caret can stand, as a text box does.
 */
export function highlight(code: string, language: string, open = false) {
  return lineTokens(code, language, open).map(drawLine);
}

/**
 * @internal A line's coloured code. The whole code is coloured again at each key typed, so every
 * line's runs are new each time. A line with the same runs is not drawn or rendered again, so the
 * work for a key is the lines it changed, beyond colouring the code.
 */
const LineCode = memo(
  function LineCode({ tokens }: { tokens: CodeToken[] }) {
    return tokens.length ? drawLine(tokens) : " ";
  },
  (was, now) =>
    was.tokens.length === now.tokens.length &&
    was.tokens.every(
      ([kind, text], index) => kind === now.tokens[index]![0] && text === now.tokens[index]![1],
    ),
);

/**
 * Code coloured by its syntax, with line numbers, in a region that scrolls both ways. Actions
 * such as `CodeBlockCopy` sit in the header beside the filename, or float over the top corner
 * when there is no filename. The block scrolls down once it reaches `maxRows`, or a height its
 * container sets. An editable block is a code editor, which colours the code as it is typed.
 */
export function CodeBlock({
  code: given,
  defaultCode,
  editable = false,
  onCodeChange,
  inputProps,
  language = "tsx",
  filename,
  label,
  lineNumbers = true,
  wrap = false,
  rows,
  maxRows,
  children,
  className = "",
  style,
  ...props
}: CodeBlockProps) {
  const [own, setOwn] = useState(defaultCode ?? "");
  const code = given ?? own;
  const lines = useMemo(() => lineTokens(code, language, editable), [code, language, editable]);
  const name = filename ?? label;
  return (
    <CodeContext value={code}>
      <figure
        {...props}
        className={`x-govuk-ui-code-block ${className}`.trim()}
        data-line-numbers={lineNumbers || undefined}
        data-editable={editable || undefined}
        data-wrap={wrap || undefined}
        data-rows={rows ? "" : undefined}
        data-max-rows={maxRows ? "" : undefined}
        style={
          {
            ...style,
            "--x-govuk-ui-code-rows": rows || undefined,
            "--x-govuk-ui-code-max-rows": maxRows || undefined,
          } as CSSProperties
        }
      >
        {filename ? (
          <figcaption className="x-govuk-ui-code-block-header">
            <span className="x-govuk-ui-code-block-filename">{filename}</span>
            {children && <div className="x-govuk-ui-code-block-actions">{children}</div>}
          </figcaption>
        ) : (
          children && (
            <div className="x-govuk-ui-code-block-actions" data-floating="">
              {children}
            </div>
          )
        )}
        {/* The text box of an editable block is the Tab stop, named as the region would be. */}
        <ScrollArea
          orientation={wrap ? "vertical" : "both"}
          label={editable ? undefined : name}
          fade
        >
          <div
            className="x-govuk-ui-code-block-text"
            style={{ "--x-govuk-ui-code-digits": String(lines.length).length } as CSSProperties}
          >
            {/* An editable block's text box says what the code says, so the colours are hidden
                from screen readers. */}
            <pre className="x-govuk-ui-code-block-code" aria-hidden={editable || undefined}>
              <code>
                {lines.map((line, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: Code lines have positional identities and no component state.
                  <span className="x-govuk-ui-code-line" key={index}>
                    {lineNumbers && (
                      <span className="x-govuk-ui-code-line-number" aria-hidden="true">
                        {index + 1}
                      </span>
                    )}
                    <LineCode tokens={line} />
                  </span>
                ))}
              </code>
            </pre>
            {editable && (
              <textarea
                aria-label={inputProps?.["aria-labelledby"] ? undefined : name}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                wrap={wrap ? "soft" : "off"}
                {...inputProps}
                className={`x-govuk-ui-code-block-input ${inputProps?.className ?? ""}`.trim()}
                value={code}
                onChange={(event) => {
                  inputProps?.onChange?.(event);
                  if (given === undefined) setOwn(event.target.value);
                  onCodeChange?.(event.target.value);
                }}
                // Safari scrolls the box itself to show the caret as a line grows past it, before
                // the code beneath grows. The region takes the scroll instead, and the box goes
                // back over its code, which has grown by then.
                onScroll={(event) => {
                  inputProps?.onScroll?.(event);
                  const box = event.currentTarget;
                  if (!box.scrollLeft && !box.scrollTop) return;
                  box
                    .closest(".x-govuk-ui-scroll-area-viewport")
                    ?.scrollBy(box.scrollLeft, box.scrollTop);
                  box.scrollLeft = 0;
                  box.scrollTop = 0;
                }}
              />
            )}
          </div>
        </ScrollArea>
      </figure>
    </CodeContext>
  );
}

export type CodeBlockCopyProps = CopyLabels;

/** Copies the block's code. The icon turns to a tick for a moment once it is copied. */
export function CodeBlockCopy(labels: CodeBlockCopyProps) {
  const code = useContext(CodeContext);
  if (code === null) throw new Error("CodeBlockCopy must be used inside a CodeBlock.");
  return <CopyButton {...labels} text={() => code} />;
}
