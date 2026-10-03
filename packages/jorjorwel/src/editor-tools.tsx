"use client";

import { Menu } from "@base-ui/react/menu";
import { Toolbar } from "@base-ui/react/toolbar";
import { $isCodeNode, CodeNode } from "@lexical/code-core";
import { $isLinkNode } from "@lexical/link";
import {
  $findCellNode,
  $findTableNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableRowIndexFromTableCellNode,
  TableCellHeaderStates,
  TableCellNode,
} from "@lexical/table";
import { $findMatchingParent, $getNearestNodeOfType } from "@lexical/utils";
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
} from "lexical";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type DependencyList,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Button,
  type ButtonProps,
  DropdownMenu,
  Link,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuSeparator,
  Tooltip,
  TooltipGroup,
} from "x-govuk-ui";
import { codeLanguage, codeLanguages, useMergedRef } from "x-govuk-ui/internal";
import { focusDocument, useEditorContext } from "./editor-context";
import { controlIcons } from "./editor-controls";
import { tableCommands } from "./editor-tables";

// The tools that come up over what the caret is in, after Lexxy's. These are a table's rows and
// columns, and a code block's language. Each sits in the box, over the document, so it scrolls
// with the document.

/** Where an element of the document is in the editor's box, and whether its body shows it. */
export type EditorAnchor = {
  top: number;
  left: number;
  width: number;
  height: number;
  /** Whether it has scrolled out of the body's view, where its tools would float over nothing. */
  hidden: boolean;
};

/**
 * Follows an element of the document, such as one a node of yours draws, for `EditorTools` to float
 * over. It measures the element from the editor's box after each document update, and as the
 * element or the box resizes or the body scrolls. An inline element, such as a link, moves without
 * resizing as the text before it changes, so the updates catch that. `version` stands for the
 * element's content, and a change to it triggers a new measurement.
 */
export function useEditorAnchor(element: HTMLElement | null, version?: unknown) {
  const { editor, box, body } = useEditorContext("useEditorAnchor");
  const [anchor, setAnchor] = useState<EditorAnchor | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The element is measured again when its content changes, which the version stands for.
  useLayoutEffect(() => {
    const frame = box.current;
    if (!element || !frame) {
      setAnchor(null);
      return;
    }
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const outer = frame.getBoundingClientRect();
      const view = body?.getBoundingClientRect();
      const hidden = view ? rect.bottom < view.top || rect.top > view.bottom : false;
      setAnchor((previous) => {
        const next = {
          top: rect.top - outer.top - frame.clientTop,
          left: rect.left - outer.left - frame.clientLeft,
          width: rect.width,
          height: rect.height,
          hidden,
        };
        return previous &&
          previous.top === next.top &&
          previous.left === next.left &&
          previous.width === next.width &&
          previous.height === next.height &&
          previous.hidden === next.hidden
          ? previous
          : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(frame);
    const unregister = editor.registerUpdateListener(measure);
    body?.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      unregister();
      body?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [editor, element, box, body, version]);
  return anchor;
}

/**
 * Reads the editor's state with `read`, using Lexical's `$` functions. It reads again after each
 * editor update, and whenever `deps` change, as a hook's dependencies do, such as a node's key that
 * `read` looks for. It renders again only when what it reads changes, judged by `equal`. It reads
 * the current state without making Lexical finish an update first, so it is safe while React
 * renders.
 */
export function useEditorRead<T>(
  read: () => T,
  equal: (a: T, b: T) => boolean = Object.is,
  deps: DependencyList = [],
) {
  const { editor } = useEditorContext("useEditorRead");
  const reader = useRef(read);
  reader.current = read;
  // What was last read, from which state and with which dependencies. React asks repeatedly, and
  // must get the same value while nothing has changed.
  const last = useRef<{ state: unknown; deps: DependencyList; value: T } | null>(null);
  const subscribe = useCallback(
    (notify: () => void) => editor.registerUpdateListener(() => notify()),
    [editor],
  );
  const snapshot = () => {
    const state = editor.getEditorState();
    const previous = last.current;
    if (
      previous &&
      previous.state === state &&
      previous.deps.length === deps.length &&
      previous.deps.every((each, index) => Object.is(each, deps[index]))
    )
      return previous.value;
    const next = state.read(() => reader.current(), { editor });
    const value = previous && equal(previous.value, next) ? previous.value : next;
    last.current = { state, deps, value };
    return value;
  };
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * Alt F10 takes focus from the document to a floating toolbar while it shows, as WAI-ARIA's
 * editors do. `EditorTools` does this itself.
 */
export function useEditorAltF10(toolbar: { current: HTMLElement | null }, active: boolean) {
  const { editor } = useEditorContext("useEditorAltF10");
  useEffect(() => {
    if (!active) return;
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (!event.altKey || event.key !== "F10") return false;
        const first = toolbar.current?.querySelector<HTMLElement>(
          "a[href], button:not([disabled]), select, input",
        );
        if (!first) return false;
        event.preventDefault();
        first.focus({ focusVisible: true } as FocusOptions);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, toolbar, active]);
}

export type EditorToolsProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  /** Names the toolbar for screen readers. */
  label: string;
  /** What it floats over, from `useEditorAnchor`. */
  anchor: EditorAnchor;
  /**
   * Where the toolbar sits. `above` centres it above the element, as a table's tools are.
   * `inside` puts it in the top right corner, as an attachment's and a code block's are. `below`
   * puts it below the element, from its start, as a link's are.
   */
  placement?: "above" | "inside" | "below";
  children: ReactNode;
};

/**
 * A floating toolbar over an element of the document, for the editor's own tools and yours. It sits
 * in the box, so it scrolls with the document. It is moved there only by a transform, kept inside
 * the box's width. Alt F10 takes focus to it, the arrow keys move along it, and Escape gives focus
 * back to the document. Pressing it keeps the caret where it was. Put `EditorTool`s in it, in
 * groups of `x-govuk-ui-editor-tools-group`, which is the surface the editor's own tools share.
 */
export function EditorTools({
  label,
  anchor,
  placement = "above",
  className = "",
  style,
  ref,
  onKeyDown,
  onMouseDown,
  children,
  ...props
}: EditorToolsProps) {
  const { editor, box } = useEditorContext("EditorTools");
  const toolbar = useRef<HTMLDivElement>(null);
  const toolbarRef = useMergedRef(toolbar, ref);
  useEditorAltF10(toolbar, true);
  return (
    <Toolbar.Root
      {...props}
      ref={toolbarRef}
      aria-label={label}
      className={`x-govuk-ui-editor-tools ${className}`.trim()}
      data-placement={placement}
      style={
        {
          "--x-govuk-ui-editor-anchor-top": `${anchor.top}px`,
          "--x-govuk-ui-editor-anchor-left": `${anchor.left}px`,
          "--x-govuk-ui-editor-anchor-width": `${anchor.width}px`,
          "--x-govuk-ui-editor-anchor-height": `${anchor.height}px`,
          "--x-govuk-ui-editor-box-width": `${box.current?.clientWidth ?? 0}px`,
          ...style,
        } as CSSProperties
      }
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Escape") return;
        event.preventDefault();
        focusDocument(editor);
      }}
      onMouseDown={(event) => {
        onMouseDown?.(event);
        // Fields take focus. Anything else keeps the caret in the document.
        if (!(event.target instanceof Element && event.target.closest("select, input")))
          event.preventDefault();
      }}
    >
      <TooltipGroup side={placement === "below" ? "bottom" : "top"}>{children}</TooltipGroup>
    </Toolbar.Root>
  );
}

/**
 * Where focus goes as a control's menu or popover closes. It goes back to the document, with the
 * caret where it was. If the person came by the keyboard and pressed Escape, it goes back to the
 * control instead, as Lexxy's do. The editor restores its own selection, because the browser would
 * put the caret at the document's start. Base UI asks once the popup has finished closing. By then
 * focus is on the page's body, unless the person has moved it elsewhere, such as to another
 * control, where it stays. @internal
 */
export function finalFocusFor(
  editor: LexicalEditor,
  done: { current: boolean },
  fromDocument?: { current: boolean },
) {
  const free = () => {
    const root = editor.getRootElement();
    const active = root?.ownerDocument.activeElement;
    return !active || active === root?.ownerDocument.body || !!root?.contains(active);
  };
  return (closeType: string) => {
    const back = closeType === "keyboard" && !done.current && !fromDocument?.current;
    done.current = false;
    if (fromDocument) fromDocument.current = false;
    if (back) return true;
    if (free())
      requestAnimationFrame(() => {
        if (free()) focusDocument(editor);
      });
    return false;
  };
}

type TablePlace = {
  table: string;
  cell: string;
  row: number;
  column: number;
  rows: number;
  columns: number;
  /** Whether the cell's row is a header, and, with `columnHeader`, whether its column is. */
  rowHeader: boolean;
  columnHeader: boolean;
};

const samePlace = (a: TablePlace | null, b: TablePlace | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.table === b.table &&
    a.cell === b.cell &&
    a.row === b.row &&
    a.column === b.column &&
    a.rows === b.rows &&
    a.columns === b.columns &&
    a.rowHeader === b.rowHeader &&
    a.columnHeader === b.columnHeader);

/** The cell the caret is in, and its table's size, when the caret is in one cell. */
function $tablePlace(): TablePlace | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || selection.anchor.key !== selection.focus.key) return null;
  const cell = $findCellNode(selection.anchor.getNode());
  const table = cell && $findTableNode(cell);
  if (!cell || !table) return null;
  const rows = table.getChildren();
  const first = rows[0];
  const header = (state: number) => (cell.getHeaderStyles() & state) === state;
  return {
    table: table.getKey(),
    cell: cell.getKey(),
    row: $getTableRowIndexFromTableCellNode(cell),
    column: $getTableColumnIndexFromTableCellNode(cell),
    rows: rows.length,
    columns: $isElementNode(first) ? first.getChildrenSize() : 0,
    rowHeader: header(TableCellHeaderStates.ROW),
    columnHeader: header(TableCellHeaderStates.COLUMN),
  };
}

const glyph = (d: string) => (
  <svg
    viewBox="0 0 20 20"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const icons = {
  add: glyph("M10 4v12M4 10h12"),
  remove: glyph("M4 10h12"),
  before: glyph("M10 3v5M7.5 5.5h5M3 10.5h14v6H3z"),
  after: glyph("M3 3.5h14v6H3zM10 12v5M7.5 14.5h5"),
  header: glyph("M3 4.5h14v11H3zM3 8.5h14M3 4.5h14v4H3z"),
  delete: glyph("M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10"),
  edit: glyph("M4 16l.8-3.6L13 4.2a1.5 1.5 0 0 1 2.1 0l.7.7a1.5 1.5 0 0 1 0 2.1L7.6 15.2z"),
};

type Target = "row" | "column" | "table";

/**
 * The table's tools, over the table the caret is in, after Lexxy's. For its rows and for its
 * columns, there is a tool to remove one, a menu of more, and a tool to add one, each saying how
 * many there are. A last tool deletes the table. The cells a tool acts on are tinted while it is
 * under the pointer or focused. Alt F10 takes focus to them, and Escape back to the cell.
 * `EditorContent` shows them unless it is given tools of its own.
 */
export function EditorTableTools(props: EditorToolPartProps) {
  const { editor, labels, disabled, readOnly } = useEditorContext("EditorTableTools");
  const place = useEditorRead($tablePlace, samePlace);
  const element = place ? editor.getElementByKey(place.table) : null;
  const anchor = useEditorAnchor(element, place);
  const [target, setTarget] = useState<Target | null>(null);
  // Whether the menu closed as an item was chosen, so focus goes back to the document.
  const chosen = useRef(false);
  const shown = Boolean(place && anchor && !anchor.hidden && !disabled && !readOnly);

  // The cells the tool under the pointer acts on are tinted, to show what it will do.
  useEffect(() => {
    if (!place || !target) return;
    const cells = editor.read(() => {
      const table = $getNodeByKey(place.table);
      if (!$isElementNode(table)) return [];
      return table.getChildren().flatMap((row, index) => {
        if (!$isElementNode(row)) return [];
        if (target === "row" && index !== place.row) return [];
        return row
          .getChildren()
          .filter((_, column) => target !== "column" || column === place.column)
          .map((cell) => cell.getKey());
      });
    });
    const elements = cells
      .map((key) => editor.getElementByKey(key))
      .filter(Boolean) as HTMLElement[];
    for (const cell of elements) cell.setAttribute("data-tool", target);
    return () => {
      for (const cell of elements) cell.removeAttribute("data-tool");
    };
  }, [editor, place, target]);

  if (!shown || !place || !anchor) return null;
  // Each command runs on the cell the caret is in.
  const act = (command: () => void) => {
    editor.update(() => {
      const cell = $getNodeByKey(place.cell);
      const inside = $getSelection()?.getNodes()[0];
      if (cell instanceof TableCellNode && !(inside && cell.isParentOf(inside))) cell.selectEnd();
      command();
    });
    setTarget(null);
  };
  // A tool gives the caret back to the document, because the tool may go with what it acted on,
  // such as Delete table with the table, and focus with it. A menu's item leaves that to the menu.
  const run = (command: () => void) => {
    act(command);
    focusDocument(editor);
  };
  const choose = (command: () => void) => {
    chosen.current = true;
    act(command);
  };
  const hover = (kind: Target) => ({
    onPointerEnter: () => setTarget(kind),
    onPointerLeave: () => setTarget(null),
    onFocus: () => setTarget(kind),
    onBlur: () => setTarget(null),
  });
  const group = (kind: "row" | "column") => {
    const row = kind === "row";
    const count = row ? place.rows : place.columns;
    return (
      // biome-ignore lint/a11y/useSemanticElements: A group of a toolbar's controls, as WAI-ARIA's toolbar groups them, where a fieldset would bring a border and a legend.
      <div
        className="x-govuk-ui-editor-tools-group"
        role="group"
        aria-label={row ? labels.rowOptions : labels.columnOptions}
      >
        <EditorTool
          label={row ? labels.rowRemove : labels.columnRemove}
          icon={icons.remove}
          disabled={count <= 1}
          {...hover(kind)}
          onClick={() => run(row ? tableCommands.$removeRow : tableCommands.$removeColumn)}
        />
        <DropdownMenu>
          <Toolbar.Button
            render={
              <Menu.Trigger
                render={
                  <Button
                    variant="quiet"
                    size="small"
                    className="x-govuk-ui-editor-tool x-govuk-ui-editor-tool-count"
                    {...hover(kind)}
                  >
                    {row ? labels.rows(count) : labels.columns(count)}
                  </Button>
                }
              />
            }
          />
          <MenuContent align="center" finalFocus={finalFocusFor(editor, chosen)}>
            <MenuItem
              icon={icons.before}
              onSelect={() => choose(row ? tableCommands.$rowBefore : tableCommands.$columnBefore)}
            >
              {row ? labels.rowAddBefore : labels.columnAddBefore}
            </MenuItem>
            <MenuItem
              icon={icons.after}
              onSelect={() => choose(row ? tableCommands.$rowAfter : tableCommands.$columnAfter)}
            >
              {row ? labels.rowAddAfter : labels.columnAddAfter}
            </MenuItem>
            {/* A checked item, so screen readers hear whether the row or column is a header. */}
            <MenuCheckboxItem
              checked={row ? place.rowHeader : place.columnHeader}
              onCheckedChange={() => act(() => tableCommands.$toggleHeader(kind))}
            >
              {row ? labels.rowHeader : labels.columnHeader}
            </MenuCheckboxItem>
            <MenuSeparator />
            <MenuItem
              icon={icons.remove}
              destructive
              disabled={count <= 1}
              onSelect={() => choose(row ? tableCommands.$removeRow : tableCommands.$removeColumn)}
            >
              {row ? labels.rowRemove : labels.columnRemove}
            </MenuItem>
          </MenuContent>
        </DropdownMenu>
        <EditorTool
          label={row ? labels.rowAdd : labels.columnAdd}
          icon={icons.add}
          {...hover(kind)}
          onClick={() => run(row ? tableCommands.$rowAfter : tableCommands.$columnAfter)}
        />
      </div>
    );
  };
  return (
    <EditorTools
      label={labels.tableTools}
      anchor={anchor}
      placement="above"
      {...props}
      className={`x-govuk-ui-editor-table-tools ${props.className ?? ""}`.trim()}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Escape") return;
        // Escape gives the caret back to the cell it was in.
        event.preventDefault();
        editor.update(() => {
          const cell = $getNodeByKey(place.cell);
          if (cell instanceof TableCellNode) cell.selectEnd();
        });
        focusDocument(editor);
      }}
    >
      {group("row")}
      {group("column")}
      <div className="x-govuk-ui-editor-tools-group">
        <EditorTool
          label={labels.tableDelete}
          icon={icons.delete}
          destructive
          {...hover("table")}
          onClick={() => run(tableCommands.$deleteTable)}
        />
      </div>
    </EditorTools>
  );
}

/** The link the caret is in, while it is a caret, not a selection. */
function $caretLink() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  return $findMatchingParent(selection.anchor.getNode(), $isLinkNode)?.getKey() ?? null;
}

/** How long the pointer rests on a link before its tools show, or is away before they go. */
const REST_MS = 300;
const LEAVE_MS = 250;

/** An address as the link's tools show it, without its scheme or a trailing slash. */
const shownAddress = (url: string) =>
  url.replace(/^(https?:\/\/|mailto:|tel:)/i, "").replace(/\/$/, "");

/**
 * The link's tools, under a link the pointer rests on, or the caret is in, so the keyboard reaches
 * them too. They are its address, which opens it in a new tab, and Edit and Unlink. Alt F10 takes
 * focus to them, and Escape back to the document. `EditorContent` shows them unless it is given
 * tools of its own.
 */
export function EditorLinkTools(props: EditorToolPartProps) {
  const { editor, labels, disabled, readOnly, box, openLink } = useEditorContext("EditorLinkTools");
  const caret = useEditorRead($caretLink);
  const [hovered, setHovered] = useState<HTMLAnchorElement | null>(null);
  const [focused, setFocused] = useState(false);
  const toolbar = useRef<HTMLDivElement>(null);
  const toolbarRef = useMergedRef(toolbar, props.ref);
  const timer = useRef(0);
  // The tools stay while the pointer is on them. React reports entering them before the browser
  // reports leaving the document, so the tools are checked as the time runs out.
  const leave = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!toolbar.current?.matches(":hover")) setHovered(null);
    }, LEAVE_MS);
  }, []);

  // The pointer resting on a link shows its tools. Leaving the link for anything but the tools
  // hides them. A touch puts the caret in the link, which shows them.
  useEffect(
    () =>
      editor.registerRootListener((root) => {
        if (!root) return;
        const over = (event: PointerEvent) => {
          if (event.pointerType !== "mouse" || event.buttons) return;
          const link = event.target instanceof Element ? event.target.closest("a") : null;
          if (!link || !root.contains(link)) return leave();
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setHovered(link), REST_MS);
        };
        root.addEventListener("pointerover", over);
        root.addEventListener("pointerleave", leave);
        return () => {
          window.clearTimeout(timer.current);
          root.removeEventListener("pointerover", over);
          root.removeEventListener("pointerleave", leave);
        };
      }),
    [editor, leave],
  );

  // A caret in a link shows its tools only while the editor has focus, so they leave with it.
  useEffect(() => {
    const frame = box.current;
    if (!frame) return;
    const onFocus = () => setFocused(true);
    const onBlur = (event: FocusEvent) =>
      setFocused(event.relatedTarget instanceof Node && frame.contains(event.relatedTarget));
    frame.addEventListener("focusin", onFocus);
    frame.addEventListener("focusout", onBlur);
    return () => {
      frame.removeEventListener("focusin", onFocus);
      frame.removeEventListener("focusout", onBlur);
    };
  }, [box]);

  // The link the pointer rests on, or else the one the caret is in while the editor has focus.
  let element: HTMLElement | null = null;
  if (hovered?.isConnected) element = hovered;
  else if (caret && focused) element = editor.getElementByKey(caret);
  // The address shown follows the document, because it can be edited while the tools show.
  const [, refresh] = useReducer((count: number) => count + 1, 0);
  useEffect(
    () => (element ? editor.registerUpdateListener(() => refresh()) : undefined),
    [editor, element],
  );
  const link = element
    ? editor.getEditorState().read(
        () => {
          const node = $getNearestNodeFromDOMNode(element);
          const found = node && ($isLinkNode(node) ? node : $findMatchingParent(node, $isLinkNode));
          return found
            ? { key: found.getKey(), url: found.getURL(), href: found.sanitizeUrl(found.getURL()) }
            : null;
        },
        { editor },
      )
    : null;
  const anchor = useEditorAnchor(link ? element : null, link?.url);
  const shown = Boolean(link && anchor && !anchor.hidden && !disabled);
  if (!shown || !link || !anchor) return null;

  // Edit and Unlink act on the link with the caret in it, as the link control does.
  const $caretIn = () => {
    const node = $getNodeByKey(link.key);
    if ($isLinkNode(node)) node.selectEnd();
  };
  const edit = () => {
    setHovered(null);
    editor.update($caretIn, { discrete: true });
    openLink(null);
  };
  const unlink = () => {
    setHovered(null);
    editor.update(() => {
      const node = $getNodeByKey(link.key);
      if (!$isLinkNode(node)) return;
      $caretIn();
      for (const child of node.getChildren()) node.insertBefore(child);
      node.remove();
    });
    focusDocument(editor);
  };
  return (
    <EditorTools
      label={labels.linkTools}
      anchor={anchor}
      placement="below"
      {...props}
      ref={toolbarRef}
      className={`x-govuk-ui-editor-link-tools ${props.className ?? ""}`.trim()}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        leave();
      }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (event.key === "Escape") setHovered(null);
      }}
    >
      <div className="x-govuk-ui-editor-tools-group">
        <Toolbar.Link
          render={
            <Link
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              visited={false}
              className="x-govuk-ui-editor-link-address"
              title={link.url}
            />
          }
        >
          <span className="x-govuk-ui-editor-link-text">{shownAddress(link.url)}</span>
          <span className="x-govuk-ui-visually-hidden"> {labels.linkNewTab}</span>
        </Toolbar.Link>
        {!readOnly && (
          <>
            <EditorTool label={labels.linkEdit} icon={icons.edit} onClick={edit} />
            <EditorTool label={labels.linkRemove} icon={controlIcons.unlink} onClick={unlink} />
          </>
        )}
      </div>
    </EditorTools>
  );
}

export type EditorToolProps = Omit<ButtonProps, "children" | "variant" | "size" | "onClick"> & {
  /** Names the tool, in its tooltip and for screen readers. */
  label: string;
  icon: ReactNode;
  /** Turns red under the pointer, for a tool that removes something. */
  destructive?: boolean;
  onClick: () => void;
};

/**
 * One of a floating toolbar's icon buttons, named in its tooltip, as the editor's own tools are.
 * Put it in `EditorTools`. A disabled tool can still be reached, so its tooltip says what it is.
 */
export function EditorTool({
  label,
  icon,
  destructive = false,
  disabled = false,
  className = "",
  onClick,
  ...props
}: EditorToolProps) {
  return (
    <Tooltip content={label}>
      <Toolbar.Button
        disabled={disabled}
        focusableWhenDisabled
        render={
          <Button
            {...props}
            variant="quiet"
            size="small-icon"
            className={`x-govuk-ui-editor-tool ${className}`.trim()}
            data-destructive={destructive || undefined}
            aria-label={label}
            onClick={() => {
              if (!disabled) onClick();
            }}
          >
            {icon}
          </Button>
        }
      />
    </Tooltip>
  );
}

/** What each of the editor's own tools takes, beyond what it decides itself. */
export type EditorToolPartProps = Omit<
  EditorToolsProps,
  "label" | "anchor" | "placement" | "children"
>;

/** The code block the caret is in, and the language it names, as the picker lists it. */
function $codeBlock() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  const code = $getNearestNodeOfType(selection.anchor.getNode(), CodeNode);
  if (!code) return null;
  return { key: code.getKey(), language: codeLanguage(code.getLanguage()) ?? "" };
}

const sameBlock = (a: ReturnType<typeof $codeBlock>, b: ReturnType<typeof $codeBlock>) =>
  a === b || (a !== null && b !== null && a.key === b.key && a.language === b.language);

/** The languages' names as people know them. */
const languageNames: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  css: "CSS",
  python: "Python",
  c: "C",
  go: "Go",
  java: "Java",
  rust: "Rust",
  json: "JSON",
  diff: "Diff",
  shell: "Shell",
  cpp: "C++",
  csharp: "C#",
  sql: "SQL",
  html: "HTML",
  vue: "Vue",
  svelte: "Svelte",
  yaml: "YAML",
  markdown: "Markdown",
  ruby: "Ruby",
  kotlin: "Kotlin",
  swift: "Swift",
  php: "PHP",
  toml: "TOML",
  powershell: "PowerShell",
  dockerfile: "Dockerfile",
  graphql: "GraphQL",
  hcl: "HCL",
  zig: "Zig",
  lua: "Lua",
};

/** Every language the block can be coloured in, by its common name, sorted by that name. */
const languageChoices = codeLanguages
  .filter((language) => language !== "plaintext")
  .map((language) => [language, languageNames[language] ?? language] as const)
  .sort((a, b) => a[1].localeCompare(b[1]));

/**
 * The code block's language, in a list at its top right corner while the caret is in it, as in
 * Lexxy. It lists plain text first, then every language the block can be coloured in. Alt F10
 * takes focus to it. `EditorContent` shows it unless it is given tools of its own.
 */
export function EditorCodeLanguage(props: EditorToolPartProps) {
  const { editor, labels, disabled, readOnly } = useEditorContext("EditorCodeLanguage");
  const block = useEditorRead($codeBlock, sameBlock);
  const element = block ? editor.getElementByKey(block.key) : null;
  const anchor = useEditorAnchor(element, block);
  if (!block || !anchor || anchor.hidden || disabled || readOnly) return null;
  return (
    <EditorTools
      label={labels.codeLanguage}
      anchor={anchor}
      placement="inside"
      {...props}
      className={`x-govuk-ui-editor-language ${props.className ?? ""}`.trim()}
    >
      <select
        aria-label={labels.codeLanguage}
        className="x-govuk-ui-editor-language-select"
        value={block.language}
        onChange={(event) => {
          const language = event.target.value;
          editor.update(() => {
            const code = $getNodeByKey(block.key);
            if ($isCodeNode(code)) code.setLanguage(language || null);
          });
        }}
      >
        <option value="">{labels.plainText}</option>
        {languageChoices.map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
    </EditorTools>
  );
}
