"use client";

import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { highlight } from "./code-block";
import { ScrollArea } from "./scroll-area";

export type FileDiffProps = ComponentPropsWithRef<"figure"> & {
  /** The file's path, shown in the header. */
  filename: string;
  before: string;
  after: string;
  /** The language to colour, as Code block takes it. */
  language?: string;
  /** Unchanged lines kept around each change. Longer runs fold away behind a button. */
  context?: number;
  /**
   * Wraps long lines at the diff's width, so it never scrolls sideways. The rest of a wrapped line
   * starts under its code, beside its numbers and sign.
   */
  wrap?: boolean;
  /** The diff's least height, in rows. A row is a line or a fold. */
  rows?: number;
  /** The most rows the diff shows before it scrolls inside. Without it, it shows every row. */
  maxRows?: number;
  /** Actions for the change, such as Accept and Reject, beside the filename. */
  children?: ReactNode;
};

type Kind = "same" | "add" | "remove";
type Line = { kind: Kind; old?: number; new?: number; code: ReactNode[] };
type Piece = { type: "line"; line: Line } | { type: "fold"; id: number; lines: Line[] };

/**
 * Compares two texts by their longest common run of lines, as kept, added and removed lines. The
 * lines the texts share at their start and at their end are kept without comparing them further.
 * The table of common runs has a cell for each pair of lines, so only the lines between them are
 * compared. A one-line change to a file of 3,000 lines then needs a table of a few cells, not one
 * of 9 million, which would block the main thread and take 36 MB.
 */
function diffLines(before: string[], after: string[]) {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  )
    end++;
  const rows = before.length - start - end;
  const columns = after.length - start - end;
  const old = (i: number) => before[start + i];
  const now = (j: number) => after[start + j];
  // common[i][j] is the length of the longest common run from old(i) and now(j) on, up to the
  // shared end.
  const common = Array.from({ length: rows + 1 }, () => new Uint32Array(columns + 1));
  for (let i = rows - 1; i >= 0; i--)
    for (let j = columns - 1; j >= 0; j--)
      common[i]![j] =
        old(i) === now(j)
          ? common[i + 1]![j + 1]! + 1
          : Math.max(common[i + 1]![j]!, common[i]![j + 1]!);
  const result: { kind: Kind; old?: number; new?: number }[] = [];
  for (let line = 0; line < start; line++) result.push({ kind: "same", old: line, new: line });
  let i = 0;
  let j = 0;
  while (i < rows || j < columns) {
    // Where a line changes, the old one comes before the new one.
    if (i < rows && j < columns && old(i) === now(j)) {
      result.push({ kind: "same", old: start + i, new: start + j });
      i++;
      j++;
    } else if (i < rows && (j >= columns || common[i + 1]![j]! >= common[i]![j + 1]!)) {
      result.push({ kind: "remove", old: start + i });
      i++;
    } else {
      result.push({ kind: "add", new: start + j });
      j++;
    }
  }
  for (let line = 0; line < end; line++)
    result.push({ kind: "same", old: start + rows + line, new: start + columns + line });
  return result;
}

/** Keeps the lines near each change and folds the long unchanged runs between them. */
function fold(lines: Line[], context: number): Piece[] {
  const near = lines.map(() => false);
  lines.forEach((line, index) => {
    if (line.kind === "same") return;
    for (
      let k = Math.max(0, index - context);
      k <= Math.min(lines.length - 1, index + context);
      k++
    )
      near[k] = true;
  });
  const pieces: Piece[] = [];
  let run: Line[] = [];
  const flush = () => {
    // A fold of one line would take as much room as the line, so it is shown instead.
    if (run.length === 1) pieces.push({ type: "line", line: run[0]! });
    else if (run.length) pieces.push({ type: "fold", id: pieces.length, lines: run });
    run = [];
  };
  lines.forEach((line, index) => {
    if (near[index]) {
      flush();
      pieces.push({ type: "line", line });
    } else run.push(line);
  });
  flush();
  return pieces;
}

const marks: Record<Kind, { sign: string; words: string }> = {
  same: { sign: " ", words: "" },
  add: { sign: "+", words: "Added: " },
  remove: { sign: "−", words: "Removed: " },
};

function DiffLine({ line, revealed = false }: { line: Line; revealed?: boolean }) {
  const { sign, words } = marks[line.kind];
  return (
    <span
      className="x-govuk-ui-diff-line"
      data-kind={line.kind}
      data-revealed={revealed || undefined}
    >
      <span className="x-govuk-ui-diff-number" aria-hidden="true">
        {line.old === undefined ? "" : line.old + 1}
      </span>
      <span className="x-govuk-ui-diff-number" aria-hidden="true">
        {line.new === undefined ? "" : line.new + 1}
      </span>
      <span className="x-govuk-ui-diff-sign" aria-hidden="true">
        {sign}
      </span>
      <span className="x-govuk-ui-diff-code">
        {words && <span className="x-govuk-ui-visually-hidden">{words}</span>}
        {line.code.length ? line.code : " "}
      </span>
    </span>
  );
}

/**
 * Changes to a file, such as those an agent proposes, as one column of lines. Removed lines are
 * red, with a minus, and added lines are green, with a plus. Both are coloured by their syntax, as
 * Code block colours code. Long unchanged runs fold away behind a button that opens them in place.
 * The header names the file and counts the lines added and removed, beside any actions, such as
 * Accept.
 */
export function FileDiff({
  filename,
  before,
  after,
  language = "tsx",
  context = 3,
  wrap = false,
  rows,
  maxRows,
  children,
  className = "",
  style,
  ...props
}: FileDiffProps) {
  // The lines are compared and coloured only when the texts change, not when the context does.
  const { lines, added, removed, digits } = useMemo(() => {
    const oldLines = before.replace(/\n$/, "").split("\n");
    const newLines = after.replace(/\n$/, "").split("\n");
    const oldCode = highlight(before, language);
    const newCode = highlight(after, language);
    const lines: Line[] = diffLines(oldLines, newLines).map((row) => ({
      ...row,
      code: (row.kind === "add" ? newCode[row.new!] : oldCode[row.old!]) ?? [],
    }));
    return {
      lines,
      added: lines.filter((line) => line.kind === "add").length,
      removed: lines.filter((line) => line.kind === "remove").length,
      digits: String(Math.max(oldLines.length, newLines.length)).length,
    };
  }, [before, after, language]);
  const pieces = useMemo(() => fold(lines, context), [lines, context]);
  const [open, setOpen] = useState<Set<number>>(new Set());
  /** A line as it is, a fold's lines once it is opened, or the button that opens it. */
  const show = (piece: Piece) => {
    if (piece.type === "line")
      return <DiffLine key={`${piece.line.old}-${piece.line.new}`} line={piece.line} />;
    if (open.has(piece.id))
      return piece.lines.map((line) => (
        <DiffLine key={`${line.old}-${line.new}`} line={line} revealed />
      ));
    return (
      <button
        key={`fold-${piece.id}`}
        type="button"
        className="x-govuk-ui-diff-fold"
        onClick={() => setOpen((previous) => new Set(previous).add(piece.id))}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="m5 6 3-3 3 3M5 10l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        Show {piece.lines.length} unchanged lines
      </button>
    );
  };

  return (
    <figure
      {...props}
      className={`x-govuk-ui-file-diff ${className}`.trim()}
      data-wrap={wrap || undefined}
      data-rows={rows ? "" : undefined}
      data-max-rows={maxRows ? "" : undefined}
      style={
        {
          ...style,
          "--x-govuk-ui-diff-rows": rows || undefined,
          "--x-govuk-ui-diff-max-rows": maxRows || undefined,
        } as CSSProperties
      }
    >
      <figcaption className="x-govuk-ui-file-diff-header">
        <span className="x-govuk-ui-file-diff-filename">{filename}</span>
        <span className="x-govuk-ui-file-diff-counts">
          <span className="x-govuk-ui-visually-hidden">
            {added} {added === 1 ? "line" : "lines"} added, {removed} removed
          </span>
          <span aria-hidden="true" data-kind="add">
            +{added}
          </span>
          <span aria-hidden="true" data-kind="remove">
            −{removed}
          </span>
        </span>
        {children && <div className="x-govuk-ui-file-diff-actions">{children}</div>}
      </figcaption>
      <ScrollArea
        orientation={maxRows ? (wrap ? "vertical" : "both") : "horizontal"}
        label={`Changes to ${filename}`}
      >
        <pre
          className="x-govuk-ui-file-diff-code"
          style={{ "--x-govuk-ui-code-digits": digits } as CSSProperties}
        >
          <code>{pieces.map(show)}</code>
        </pre>
      </ScrollArea>
    </figure>
  );
}
