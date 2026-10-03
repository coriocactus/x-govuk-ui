import { CodeNode } from "@lexical/code-core";
import { ListItemNode } from "@lexical/list";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $findCellNode,
  $findTableNode,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  TableCellHeaderStates,
  TableCellNode,
  type TableNode,
} from "@lexical/table";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  type ElementNode,
  KEY_BACKSPACE_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
} from "lexical";

// Tables as people write in them, after Lexxy's, and the commands their tools run.

/**
 * How a table behaves as people write in it. Its cells take the theme's colours, whatever was
 * pasted, and a column of headers is marked as one. Enter goes down a column. From the last row, it
 * makes a new row, or leaves the table from an empty row. Backspace in an empty cell goes to the
 * cell before. In the first cell of an empty row, it removes the row.
 */
export function registerTables(editor: LexicalEditor) {
  return mergeRegister(
    editor.registerNodeTransform(TableCellNode, (cell) => {
      if (cell.getBackgroundColor()) cell.setBackgroundColor("");
      const state = cell.getHeaderStyles();
      if (state !== TableCellHeaderStates.ROW) return;
      const row = cell.getParent();
      const table = row?.getParent();
      if (!$isElementNode(row) || !$isElementNode(table)) return;
      const index = row.getChildren().findIndex((each) => each.is(cell));
      const headerRow = row
        .getChildren()
        .every(
          (each) =>
            each instanceof TableCellNode &&
            each.getHeaderStyles() !== TableCellHeaderStates.NO_STATUS,
        );
      const headerColumn = table.getChildren().every((each) => {
        const other = $isElementNode(each) ? each.getChildAtIndex(index) : null;
        return (
          other instanceof TableCellNode &&
          other.getHeaderStyles() !== TableCellHeaderStates.NO_STATUS
        );
      });
      let next = TableCellHeaderStates.NO_STATUS;
      if (headerRow) next |= TableCellHeaderStates.ROW;
      if (headerColumn) next |= TableCellHeaderStates.COLUMN;
      if (next !== state) cell.setHeaderStyles(next, TableCellHeaderStates.BOTH);
    }),
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (!event || event.ctrlKey || event.metaKey || event.shiftKey) return false;
        const at = $tablePlace();
        if (!at) return false;
        const { anchor } = at;
        if ($getNearestNodeOfType(anchor, ListItemNode) || $getNearestNodeOfType(anchor, CodeNode))
          return false;
        event.preventDefault();
        const { table, rows, row, column } = at;
        const last = row === rows.length - 1;
        if (last && $rowEmpty(rows[row])) {
          $deleteTableRowAtSelection();
          const next = table.getNextSibling();
          if (next && $isElementNode(next) && !$isDecoratorNode(next) && next.canInsertTextBefore())
            next.selectStart();
          else {
            const paragraph = $createParagraphNode();
            table.insertAfter(paragraph);
            paragraph.selectStart();
          }
        } else if (last) {
          $insertTableRowAtSelection(true);
          $cellAt(table, row + 1, 0)?.selectEnd();
        } else $cellAt(table, row + 1, column)?.selectEnd();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    ),
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;
        const at = $tablePlace();
        if (!at) return false;
        const { table, rows, row, column, cell } = at;
        if (column === 0 && $rowEmpty(rows[row])) {
          event?.preventDefault();
          $deleteTableRowAtSelection();
          $cellAt(table, Math.max(0, row - 1), -1)?.selectEnd();
          return true;
        }
        const atStart =
          selection.anchor.offset === 0 && !selection.anchor.getNode().getPreviousSibling();
        if (column > 0 && cell.getTextContent().trim() === "" && atStart) {
          event?.preventDefault();
          cell.selectPrevious();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    ),
  );
}

/** Where the caret is in a table, as its anchor, the table, its rows, and the cell's position. */
function $tablePlace() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.anchor.key !== selection.focus.key) return null;
  const anchor = selection.anchor.getNode();
  const cell = $getTableCellNodeFromLexicalNode(anchor);
  const table = cell && ($findTableNode(cell) as TableNode | null);
  if (!cell || !table) return null;
  return {
    anchor,
    table,
    cell,
    rows: table.getChildren() as ElementNode[],
    row: $getTableRowIndexFromTableCellNode(cell),
    column: $getTableColumnIndexFromTableCellNode(cell),
  };
}

function $rowEmpty(row: ElementNode | undefined) {
  return Boolean(row?.getChildren().every((cell) => cell.getTextContent().trim() === ""));
}

function $cellAt(table: TableNode, row: number, column: number) {
  const target = table.getChildAtIndex(row);
  if (!$isElementNode(target)) return null;
  const cell = column < 0 ? target.getLastChild() : target.getChildAtIndex(column);
  return cell instanceof TableCellNode ? cell : null;
}

/** The table commands the table's tools run, on the cell the caret is in. */
export const tableCommands = {
  $rowBefore: () => $insertTableRowAtSelection(false),
  $rowAfter: () => $insertTableRowAtSelection(true),
  $columnBefore: () => $insertTableColumnAtSelection(false),
  $columnAfter: () => $insertTableColumnAtSelection(true),
  $removeRow: () => $deleteTableRowAtSelection(),
  $removeColumn: () => $deleteTableColumnAtSelection(),
  $deleteTable: () => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const table = $findTableNode(selection.anchor.getNode());
    if (!table) return;
    const next = table.getNextSibling() ?? table.getPreviousSibling();
    table.remove();
    if (next && $isElementNode(next)) next.selectStart();
  },
  /** Turns a row or column of headers on or off. */
  $toggleHeader: (kind: "row" | "column") => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const cell = $findCellNode(selection.anchor.getNode());
    const table = cell && $findTableNode(cell);
    if (!cell || !table) return;
    const state = kind === "row" ? TableCellHeaderStates.ROW : TableCellHeaderStates.COLUMN;
    const index =
      kind === "row"
        ? $getTableRowIndexFromTableCellNode(cell)
        : $getTableColumnIndexFromTableCellNode(cell);
    const cells =
      kind === "row"
        ? ((table.getChildAtIndex(index) as ElementNode | null)?.getChildren() ?? [])
        : table
            .getChildren()
            .map((row) => ($isElementNode(row) ? row.getChildAtIndex(index) : null));
    const first = cells[0];
    if (!(first instanceof TableCellNode)) return;
    const next = first.getHeaderStyles() ^ state;
    for (const each of cells) if (each instanceof TableCellNode) each.setHeaderStyles(next, state);
  },
};
