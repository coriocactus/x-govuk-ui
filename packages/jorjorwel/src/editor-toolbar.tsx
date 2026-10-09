"use client";

import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Toolbar } from "@base-ui/react/toolbar";
import { $createHorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_NORMAL,
  FORMAT_TEXT_COMMAND,
  INDENT_CONTENT_COMMAND,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  OUTDENT_CONTENT_COMMAND,
  REDO_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  type TextFormatType,
  UNDO_COMMAND,
} from "lexical";
import {
  Children,
  type ComponentPropsWithRef,
  type CSSProperties,
  type FormEvent,
  Fragment,
  isValidElement,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  Button,
  type ButtonProps,
  DropdownMenu,
  Input,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  modifierKey,
  Tooltip,
  TooltipGroup,
} from "x-govuk-ui";
import { useMergedRef } from "x-govuk-ui/internal";
import {
  $clearFormatting,
  $insertLink,
  $removeLink,
  $setHeading,
  $setParagraph,
  $toggleCode,
  $toggleCodeBlock,
  $toggleColours,
  $toggleInlineCode,
  $toggleList,
  $toggleQuote,
  type EditorFormat,
} from "./editor-commands";
import { type EditorShared, focusDocument, useEditorContext, useStore } from "./editor-context";
import {
  controlIcons,
  controlShortcuts,
  defaultEditorToolbar,
  type EditorColour,
  type EditorControlKind,
  editorToolbarGroups,
} from "./editor-controls";
import { finalFocusFor } from "./editor-tools";

/** What a control does, and when it shows pressed or can run. */
type ControlSpec = {
  run: (context: EditorShared) => void;
  active?: (format: EditorFormat, context: EditorShared) => boolean;
  can?: (format: EditorFormat, context: EditorShared) => boolean;
};

const update = (run: (editor: LexicalEditor) => void) => (context: EditorShared) =>
  context.editor.update(() => run(context.editor));

const formatText = (format: TextFormatType): ControlSpec => ({
  run: ({ editor }) => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format),
  active: (state) => state[format as keyof EditorFormat] === true,
  can: (state) => !state.codeBlock,
});

const heading = (level: 1 | 2 | 3 | 4 | 5 | 6): ControlSpec => {
  const tag = `h${level}` as const;
  return {
    run: update(() => $setHeading(tag)),
    active: (state) => state.heading === tag,
    can: (_, { options }) => options.headings.includes(tag),
  };
};

/**
 * Every control the editor knows, by kind. The ones with a menu or popover of their own run nothing
 * here.
 */
const controls: Record<EditorControlKind, ControlSpec> = {
  image: {
    run: ({ pickFiles }) => pickFiles?.("image"),
    can: (_, { pickFiles }) => pickFiles !== null,
  },
  file: {
    run: ({ pickFiles }) => pickFiles?.("file"),
    can: (_, { pickFiles }) => pickFiles !== null,
  },
  bold: formatText("bold"),
  italic: formatText("italic"),
  strikethrough: formatText("strikethrough"),
  underline: formatText("underline"),
  subscript: formatText("subscript"),
  superscript: formatText("superscript"),
  format: { run: () => {} },
  highlight: { run: () => {}, can: (state) => !state.codeBlock },
  link: { run: () => {} },
  quote: { run: update(() => $toggleQuote()), active: (state) => state.quote },
  code: {
    run: update((editor) => $toggleCode(editor)),
    active: (state) => state.code || state.codeBlock,
  },
  "inline-code": {
    run: update((editor) => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) $toggleInlineCode(editor, selection);
    }),
    active: (state) => state.code && !state.codeBlock,
    can: (state) => !state.codeBlock,
  },
  "code-block": { run: update(() => $toggleCodeBlock()), active: (state) => state.codeBlock },
  "bullet-list": {
    run: update((editor) => $toggleList(editor, "bullet")),
    active: (state) => state.list === "bullet",
  },
  "numbered-list": {
    run: update((editor) => $toggleList(editor, "number")),
    active: (state) => state.list === "number",
  },
  "check-list": {
    run: update((editor) => $toggleList(editor, "check")),
    active: (state) => state.list === "check",
  },
  table: {
    run: ({ editor }) =>
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        rows: "3",
        columns: "3",
        // A header row, as GOV.UK's tables have, and no header column.
        includeHeaders: { rows: true, columns: false },
      }),
    active: (state) => state.table,
    can: (state) => !state.table,
  },
  divider: { run: update(() => $insertNodeToNearestRoot($createHorizontalRuleNode())) },
  undo: {
    run: ({ editor }) => editor.dispatchCommand(UNDO_COMMAND, undefined),
    can: (_, { history }) => history.get().undo,
  },
  redo: {
    run: ({ editor }) => editor.dispatchCommand(REDO_COMMAND, undefined),
    can: (_, { history }) => history.get().redo,
  },
  paragraph: { run: update(() => $setParagraph()), active: (state) => state.heading === null },
  "heading-1": heading(1),
  "heading-2": heading(2),
  "heading-3": heading(3),
  "heading-4": heading(4),
  "heading-5": heading(5),
  "heading-6": heading(6),
  "clear-formatting": { run: update(() => $clearFormatting()) },
  indent: {
    run: ({ editor }) => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined),
    can: (state) => state.list !== null,
  },
  outdent: {
    run: ({ editor }) => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined),
    can: (state) => state.nested,
  },
  unlink: { run: update(() => $removeLink()), can: (state) => state.link },
  source: {
    run: ({ toggleSource }) => toggleSource(),
    active: (_, { source }) => source,
  },
};

/** A shortcut as the tooltip shows it, with Mod as this device's modifier key. */
const shown = (shortcut: string | undefined) => shortcut?.replace("Mod", modifierKey());

/**
 * Runs a control's command. A press keeps the caret in the document. A key keeps focus on the
 * toolbar, so users can continue through it, without the document taking the selection back.
 */
function runControl(context: EditorShared, run: () => void, event: MouseEvent) {
  const byKey = event.detail === 0;
  if (byKey) context.editor.update(run, { tag: SKIP_DOM_SELECTION_TAG });
  else {
    run();
    focusDocument(context.editor);
  }
}

export type EditorToolbarProps = ComponentPropsWithRef<"div"> & {
  /** Names the toolbar for screen readers. By default, the editor's `labels` name it. */
  label?: string;
  /**
   * The editor's own controls to show, laid out in `editorToolbarGroups`' order with a keyline
   * between groups and history at the end of the row. By default, `defaultEditorToolbar`, which is
   * Lexxy's, without the file controls when there is no `onUpload`.
   */
  controls?: readonly EditorControlKind[];
  /** Whether the toolbar sticks to the top of the page as a long document scrolls by. */
  sticky?: boolean;
  /** Where it sticks, below a header fixed to the page, as a length. */
  stickyOffset?: number | string;
  /**
   * The controls, as `EditorControl` and `EditorSeparator` parts, instead of `controls`. Those
   * that do not fit in the row wait behind More, as the editor's own do.
   */
  children?: ReactNode;
};

/**
 * The row of controls over the document, as WAI-ARIA's toolbar, with one Tab stop and the arrow
 * keys moving between the controls. Base UI provides the behaviour. Name the editor's own controls
 * in `controls`, compose it from `EditorControl` parts, or leave it to `defaultEditorToolbar`.
 * What does not fit in the row waits behind More, as in Lexxy's.
 */
export function EditorToolbar({
  label,
  controls: chosen,
  sticky = true,
  stickyOffset,
  className = "",
  style,
  children,
  ref,
  ...props
}: EditorToolbarProps) {
  const { labels, pickFiles, options } = useEditorContext("EditorToolbar");
  const files = pickFiles !== null;
  const items = useMemo(
    () =>
      children === undefined ? controlItems(chosen, files, options.headings) : childItems(children),
    [children, chosen, files, options.headings],
  );
  const toolbar = useRef<HTMLDivElement>(null);
  const toolbarRef = useMergedRef(toolbar, ref);
  const [room, setRoom] = useState<number | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  // The items are measured whenever they change, before the browser paints, all in one wrapping
  // row as the server sends them. After that, the toolbar's own width decides how many fit.
  const signature = items.map((item) => item.key).join(" ");
  const measuring = measured?.signature !== signature;
  useLayoutEffect(() => {
    const element = toolbar.current;
    if (!measuring || !element) return;
    const cells = [...element.querySelectorAll<HTMLElement>(":scope > [data-item]")];
    const plain = element.querySelector<HTMLElement>(
      ":scope > [data-item='control'] > .x-govuk-ui-editor-control:not([data-choice])",
    );
    setMeasured({
      signature,
      widths: cells.map((cell) =>
        cell.dataset.item === "spacer" ? 0 : cell.getBoundingClientRect().width,
      ),
      gap: Number.parseFloat(getComputedStyle(element).columnGap) || 0,
      more: plain?.getBoundingClientRect().width ?? 32,
    });
    setRoom(contentWidth(element));
  });
  // The space is set in a task of its own, not as the browser reports the size. A popover open on
  // the page can render at once while sizes are reported, as Floating UI does, and would render the
  // new space with it. If a control it points at, such as More, goes during the report, the browser
  // cannot report it, and calls that a loop of resize observers.
  useEffect(() => {
    const element = toolbar.current;
    if (!element) return;
    let timer = 0;
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => flushSync(() => setRoom(contentWidth(element))));
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);
  const count = measuring || room === null ? items.length : fitting(items, measured, room);
  const row = items.slice(0, count);
  const rest = trim(items.slice(count).filter((item) => item.role !== "spacer"));
  return (
    <Toolbar.Root
      {...props}
      ref={toolbarRef}
      aria-label={label ?? labels.toolbar}
      className={`x-govuk-ui-editor-toolbar ${className}`.trim()}
      data-sticky={sticky || undefined}
      data-overflow={measuring ? undefined : ""}
      style={{ ...style, ...(sticky && stickyOffset !== undefined ? { top: stickyOffset } : {}) }}
    >
      {/* One tooltip glides along the toolbar as the pointer moves between its controls. */}
      <TooltipGroup side="bottom">
        {row.map((item) =>
          item.role === "spacer" ? (
            <span
              key={item.key}
              className="x-govuk-ui-editor-spacer"
              data-item="spacer"
              aria-hidden="true"
            />
          ) : (
            <div key={item.key} className="x-govuk-ui-editor-item" data-item={item.role}>
              {item.node}
            </div>
          ),
        )}
        {rest.length > 0 && (
          <>
            <span className="x-govuk-ui-editor-spacer" aria-hidden="true" />
            <MoreControl label={labels.more} items={rest} />
          </>
        )}
      </TooltipGroup>
    </Toolbar.Root>
  );
}

/** One thing in a toolbar's row, which is a control, a keyline, or the gap before history. */
type Item = { key: string; role: "control" | "separator" | "spacer"; node: ReactNode };

/** What was measured of a toolbar's items, and for which items. */
type Measured = { signature: string; widths: number[]; gap: number; more: number };

/** The editor's own controls as items, in their groups, with keylines between and history last. */
function controlItems(
  chosen: readonly EditorControlKind[] | undefined,
  files: boolean,
  headings: readonly string[],
): Item[] {
  const included = new Set(
    chosen ??
      defaultEditorToolbar.filter((kind) => {
        if (kind === "image" || kind === "file") return files;
        if (kind.startsWith("heading-")) return headings.includes(`h${kind.slice(-1)}`);
        return true;
      }),
  );
  const groups = editorToolbarGroups
    .map((group) => group.filter((kind) => included.has(kind)))
    .filter((group) => group.length > 0);
  return groups.flatMap((group, index): Item[] => {
    const history = group.includes("undo") || group.includes("redo");
    // History sits at the end of the row, after a gap. Every other group except the first follows a
    // keyline.
    const before: Item[] = [];
    if (history) before.push({ key: "spacer", role: "spacer", node: null });
    else if (index > 0)
      before.push({ key: `separator-${group[0]}`, role: "separator", node: <EditorSeparator /> });
    return [
      ...before,
      ...group.map(
        (kind): Item => ({ key: kind, role: "control", node: <EditorControl kind={kind} /> }),
      ),
    ];
  });
}

/** Composed parts as items, with a separator among them recognised by its type. */
function childItems(children: ReactNode): Item[] {
  return Children.toArray(children).map((child, index) => ({
    key: isValidElement(child) && child.key !== null ? String(child.key) : String(index),
    role: isValidElement(child) && child.type === EditorSeparator ? "separator" : "control",
    node: child,
  }));
}

/** An element's width inside its padding, which its items share. */
function contentWidth(element: HTMLElement) {
  const { paddingLeft, paddingRight } = getComputedStyle(element);
  return element.clientWidth - Number.parseFloat(paddingLeft) - Number.parseFloat(paddingRight);
}

/** Items with no keyline or gap at either end. */
function trim(items: Item[]) {
  let start = 0;
  let end = items.length;
  while (start < end && items[start]?.role !== "control") start++;
  while (end > start && items[end - 1]?.role !== "control") end--;
  return items.slice(start, end);
}

/**
 * How many of the items fit in the row, leaving space for More when they do not all fit, and never
 * ending the row on a keyline.
 */
function fitting(items: Item[], measured: Measured | null, room: number) {
  if (!measured) return items.length;
  const { widths, gap, more } = measured;
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
  if (total <= room) return items.length;
  const left = room - more - gap * 2;
  let used = 0;
  let count = 0;
  for (const width of widths) {
    const next = used + (count > 0 ? gap : 0) + width;
    if (next > left) break;
    used = next;
    count++;
  }
  while (count > 0 && items[count - 1]?.role !== "control") count--;
  return count;
}

const moreIcon = (
  <svg
    viewBox="0 0 20 20"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.6}
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4.5 10h.01M10 10h.01M15.5 10h.01" />
  </svg>
);

/**
 * More, at the end of a toolbar too narrow for all its controls. It is a Popover containing the
 * rest, as a toolbar of their own. A control there with its own menu or popover opens it from
 * there.
 */
function MoreControl({ label, items }: { label: string; items: Item[] }) {
  const [open, setOpen] = useState(false);
  const popup = useRef<HTMLDivElement>(null);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip content={label}>
        <Toolbar.Button
          render={
            <Popover.Trigger
              render={
                <Button
                  variant="quiet"
                  size="small-icon"
                  className="x-govuk-ui-editor-control x-govuk-ui-editor-more"
                  aria-label={label}
                >
                  {moreIcon}
                </Button>
              }
            />
          }
        />
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner
          className="x-govuk-ui-floating-positioner"
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
        >
          <Popover.Popup
            ref={popup}
            className="x-govuk-ui-floating x-govuk-ui-editor-more-popup"
            aria-label={label}
            // The popover takes focus itself, so no control's tooltip opens over the rest. Tab
            // moves on to its controls, and the arrow keys move between them.
            initialFocus={popup}
          >
            <Toolbar.Root aria-label={label} className="x-govuk-ui-editor-overflow">
              <TooltipGroup side="bottom">
                {items.map((item) => (
                  <Fragment key={item.key}>{item.node}</Fragment>
                ))}
              </TooltipGroup>
            </Toolbar.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** A keyline between groups of controls. */
export function EditorSeparator({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return (
    <Toolbar.Separator {...props} className={`x-govuk-ui-editor-separator ${className}`.trim()} />
  );
}

export type EditorControlProps = Omit<ButtonProps, "children"> & {
  /** One of the editor's own controls, with its command, name, icon and shortcut. */
  kind?: EditorControlKind;
  /** Names the control for screen readers and in its tooltip. A `kind` has its own name. */
  label?: string;
  /** Runs the control's command, inside a Lexical editor update. A `kind` has its own command. */
  action?: (editor: LexicalEditor) => void;
  /** Whether the control is on where the caret is, so it shows pressed. */
  active?: (format: EditorFormat) => boolean;
  /** Whether the control can run now. */
  enabled?: (format: EditorFormat) => boolean;
  /** The keys that do the same, such as "Mod B". Mod shows as the device's modifier. */
  shortcut?: string;
  /** The control's icon. A `kind` has its own icon. */
  children?: ReactNode;
};

/**
 * One control in the toolbar. It is a quiet icon Button that runs a command, with its name and
 * shortcut in a tooltip. It shows pressed while its formatting is on where the caret is. Give it a
 * `kind` for one of the editor's own controls, or an `action` of your own.
 */
export function EditorControl({
  kind,
  label: ownLabel,
  action,
  active: ownActive,
  enabled: ownEnabled,
  shortcut: ownShortcut,
  className = "",
  children,
  onClick,
  ...props
}: EditorControlProps) {
  const context = useEditorContext("EditorControl");
  const format = useStore(context.format);
  // History's availability is read here, so the controls that need it render as it changes.
  useStore(context.history);
  const { disabled, readOnly, labels, source } = context;
  const spec = kind ? controls[kind] : undefined;
  const label = ownLabel ?? (kind ? labels[kind] : "");
  const on = ownActive?.(format) ?? spec?.active?.(format, context) ?? false;
  const can = ownEnabled?.(format) ?? spec?.can?.(format, context) ?? true;
  // While the source shows, only the source control is available. A read-only document's source can
  // be shown and read, but not changed.
  const blocked = disabled || (kind !== "source" && (readOnly || source));
  if (kind === "format")
    return <FormatControl {...props} className={className} label={label} blocked={blocked} />;
  if (kind === "highlight")
    return (
      <ColourControl {...props} className={className} label={label} blocked={blocked || !can} />
    );
  if (kind === "link")
    return <LinkControl {...props} className={className} label={label} blocked={blocked} />;
  return (
    <Tooltip
      content={label}
      shortcut={shown(ownShortcut ?? (kind ? controlShortcuts[kind] : undefined))}
    >
      <Toolbar.Button
        // When unavailable, a control stays in the toolbar's arrow-key order.
        disabled={blocked || !can}
        focusableWhenDisabled
        render={
          <Button
            variant="quiet"
            size="small-icon"
            {...props}
            className={`x-govuk-ui-editor-control ${className}`.trim()}
            aria-label={label}
            aria-pressed={ownActive || spec?.active ? on : undefined}
            onClick={(event) => {
              onClick?.(event);
              if (event.defaultPrevented || blocked || !can) return;
              if (action)
                runControl(
                  context,
                  () => context.editor.update(() => action(context.editor)),
                  event,
                );
              else if (spec) runControl(context, () => spec.run(context), event);
            }}
          >
            {children ?? (kind ? controlIcons[kind] : null)}
          </Button>
        }
      />
    </Tooltip>
  );
}

const caret = (
  <svg
    className="x-govuk-ui-editor-caret"
    viewBox="0 0 10 10"
    width="8"
    height="8"
    aria-hidden="true"
  >
    <path d="M1.5 3.5 5 7l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

type ChoiceControlProps = Omit<ButtonProps, "children"> & { label: string; blocked: boolean };

/** A control's button that opens something of its own, with a chevron, as a menu's does. */
function ChoiceButton({
  label,
  icon,
  pressed,
  className = "",
  ...props
}: Omit<ButtonProps, "children"> & { label: string; icon: ReactNode; pressed?: boolean }) {
  return (
    <Button
      variant="quiet"
      size="small-icon"
      {...props}
      className={`x-govuk-ui-editor-control ${className}`.trim()}
      data-choice
      aria-label={label}
      aria-pressed={pressed}
    >
      {icon}
      {caret}
    </Button>
  );
}

/**
 * The formatting menu, as in Lexxy. It offers normal text and each of the editor's headings, as a
 * single choice, and Clear formatting. Focus goes back to the document once one is chosen.
 */
function FormatControl({ label, blocked, className, ...props }: ChoiceControlProps) {
  const context = useEditorContext("EditorControl");
  const { editor, labels, options } = context;
  const format = useStore(context.format);
  const chosen = useRef(false);
  const run = (command: () => void) => {
    chosen.current = true;
    editor.update(command);
  };
  return (
    <DropdownMenu>
      <Tooltip content={label}>
        <Toolbar.Button
          disabled={blocked}
          focusableWhenDisabled
          render={
            <Menu.Trigger
              disabled={blocked}
              render={
                <ChoiceButton
                  {...props}
                  className={className}
                  label={label}
                  icon={controlIcons.format}
                  pressed={format.heading !== null}
                />
              }
            />
          }
        />
      </Tooltip>
      <MenuContent aria-label={label} finalFocus={finalFocusFor(editor, chosen)}>
        <MenuRadioGroup value={format.heading ?? "paragraph"}>
          <MenuRadioItem value="paragraph" closeOnClick onClick={() => run(() => $setParagraph())}>
            {labels.normal}
          </MenuRadioItem>
          {options.headings.map((tag, index) => (
            <MenuRadioItem
              key={tag}
              value={tag}
              closeOnClick
              className="x-govuk-ui-editor-heading-choice"
              data-tag={tag}
              onClick={() => run(() => $setHeading(tag))}
            >
              {labels.heading(tag, index)}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
        <MenuSeparator />
        <MenuItem
          icon={controlIcons["clear-formatting"]}
          onSelect={() => run(() => $clearFormatting())}
        >
          {labels["clear-formatting"]}
        </MenuItem>
      </MenuContent>
    </DropdownMenu>
  );
}

/**
 * The colour control, like Lexxy's highlight. It has swatches for the text's colour and its
 * background, from GOV.UK's palette unless the editor is given others. Choosing a swatch twice
 * removes it again. A last option removes all colour.
 */
function ColourControl({ label, blocked, className, ...props }: ChoiceControlProps) {
  const context = useEditorContext("EditorControl");
  const { editor, labels, options } = context;
  const format = useStore(context.format);
  const [open, setOpen] = useState(false);
  const applied = useRef(false);
  const apply = (styles: { color?: string | null; "background-color"?: string | null }) => {
    editor.update(() => $toggleColours(styles));
    applied.current = true;
    setOpen(false);
  };
  const swatches = (
    legend: string,
    property: "color" | "background-color",
    colours: readonly EditorColour[],
    current: string | null,
  ) => (
    <fieldset className="x-govuk-ui-editor-swatches">
      <legend className="x-govuk-ui-editor-swatches-legend">{legend}</legend>
      {colours.map((colour) => (
        <button
          key={colour.value}
          type="button"
          className="x-govuk-ui-editor-swatch"
          data-property={property}
          style={{ "--x-govuk-ui-editor-swatch": colour.value } as CSSProperties}
          aria-label={colour.name}
          aria-pressed={current === colour.value}
          onClick={() => apply({ [property]: colour.value })}
        />
      ))}
    </fieldset>
  );
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip content={label}>
        <Toolbar.Button
          disabled={blocked}
          focusableWhenDisabled
          render={
            <Popover.Trigger
              disabled={blocked}
              render={
                <ChoiceButton
                  {...props}
                  className={className}
                  label={label}
                  pressed={format.highlight}
                  icon={
                    <span
                      className="x-govuk-ui-editor-colour-icon"
                      style={{
                        color: format.colour ?? undefined,
                        backgroundColor: format.background ?? undefined,
                      }}
                    >
                      {controlIcons.highlight}
                    </span>
                  }
                />
              }
            />
          }
        />
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner
          className="x-govuk-ui-floating-positioner"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
        >
          <Popover.Popup
            className="x-govuk-ui-floating x-govuk-ui-editor-popup"
            aria-label={label}
            finalFocus={finalFocusFor(editor, applied)}
          >
            {swatches(labels.colourText, "color", options.colours.text, format.colour)}
            {swatches(
              labels.colourBackground,
              "background-color",
              options.colours.background,
              format.background,
            )}
            <div className="x-govuk-ui-editor-popup-actions">
              <Button
                type="button"
                variant="link"
                disabled={!format.highlight}
                onClick={() => apply({ color: null, "background-color": null })}
              >
                {labels.colourRemove}
              </Button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** An address as users type one. A domain alone is taken as a web page's address. */
function normaliseAddress(text: string) {
  const address = text.trim();
  if (!address) return null;
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(address)) return address;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(address)) return `https://${address}`;
  try {
    const url = new URL(address);
    return /^(https?|mailto|tel):$/.test(url.protocol) ? address : null;
  } catch {
    return null;
  }
}

/**
 * The link control, as in Lexxy. It opens the editor's link popover beneath it, with the address
 * and Unlink. Mod K opens the same popover from the document, wherever the control is, even behind
 * More, or with no control in the toolbar.
 */
function LinkControl({ label, blocked, className, ...props }: ChoiceControlProps) {
  const context = useEditorContext("EditorControl");
  const format = useStore(context.format);
  const link = useStore(context.link);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <Tooltip content={label} shortcut={shown(controlShortcuts.link)}>
      <Toolbar.Button
        disabled={blocked}
        focusableWhenDisabled
        render={
          <Button
            variant="quiet"
            size="small-icon"
            {...props}
            ref={button}
            className={`x-govuk-ui-editor-control ${className ?? ""}`.trim()}
            aria-label={label}
            aria-pressed={format.link}
            aria-haspopup="dialog"
            aria-expanded={link.open}
            onClick={(event) => {
              props.onClick?.(event);
              if (!event.defaultPrevented && !blocked) context.openLink(button.current);
            }}
          >
            {controlIcons.link}
          </Button>
        }
      />
    </Tooltip>
  );
}

/**
 * The link popover, with the address and Unlink. The address links the selection, goes in as a
 * link where nothing is selected, or changes the link the caret is in. The editor has one link
 * popover. The link control, Mod K and the link's tools all open it, so each works wherever the
 * control is.
 * @internal
 */
export function LinkPopover() {
  const context = useEditorContext("LinkPopover");
  const { editor, labels, disabled, readOnly } = context;
  const state = useStore(context.link);
  const format = useStore(context.format);
  const [address, setAddress] = useState("");
  const [invalid, setInvalid] = useState(false);
  const applied = useRef(false);
  const fromDocument = useRef(false);
  const close = () => context.link.set({ ...context.link.get(), open: false });
  // Each opening starts from the address the caret is in.
  useEffect(() => {
    if (!state.open) return;
    setAddress(context.format.get().href ?? "");
    setInvalid(false);
    fromDocument.current = state.anchor === null;
  }, [state, context.format]);
  // Mod K opens it from the document.
  useEffect(
    () =>
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "k")
            return false;
          if (disabled || readOnly) return false;
          event.preventDefault();
          context.openLink(null);
          return true;
        },
        COMMAND_PRIORITY_NORMAL,
      ),
    [editor, context, disabled, readOnly],
  );
  const apply = (event: FormEvent) => {
    // React sends a submit up through the portal, to a form around the editor, which would then be
    // sent.
    event.preventDefault();
    event.stopPropagation();
    const url = normaliseAddress(address);
    if (!url) {
      setInvalid(true);
      return;
    }
    editor.update(() => $insertLink(url));
    applied.current = true;
    close();
  };
  // Placed against the control while it is there, or else where the caret was, because a control
  // behind More goes as More closes.
  const anchor = () => {
    if (state.anchor?.isConnected) return state.anchor;
    const caret = state.caret;
    return caret ? { getBoundingClientRect: () => caret } : null;
  };
  return (
    <Popover.Root open={state.open} onOpenChange={(next) => !next && close()}>
      <Popover.Portal>
        <Popover.Positioner
          className="x-govuk-ui-floating-positioner"
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
        >
          <Popover.Popup
            className="x-govuk-ui-floating x-govuk-ui-editor-popup"
            aria-label={labels.link}
            finalFocus={finalFocusFor(editor, applied, fromDocument)}
          >
            <form onSubmit={apply} className="x-govuk-ui-editor-link-form" noValidate>
              <Input
                label={labels.linkAddress}
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://"
                value={address}
                errorMessage={invalid ? labels.linkInvalid : undefined}
                onChange={(event) => {
                  setAddress(event.target.value);
                  setInvalid(false);
                }}
              />
              <div className="x-govuk-ui-editor-popup-actions">
                <Button type="submit" size="small">
                  {labels.linkApply}
                </Button>
                {format.link && (
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      editor.update(() => $removeLink());
                      applied.current = true;
                      close();
                    }}
                  >
                    {labels.linkRemove}
                  </Button>
                )}
              </div>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
