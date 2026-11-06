"use client";

/*
 * Tree select, a field whose list of choices is a tree. Its button opens a popup, on Base UI's
 * Popover, with a search field above a TreeControl. The tree takes focus, so its keys, its
 * announcements and its markup are the Tree's own.
 *
 * Mantine's TreeSelect lists the nodes as a combobox's options instead, each with its level and
 * whether it is open. An option cannot say either, so screen readers would hear a flat list, and
 * axe fails the markup. Base UI's Combobox cannot hold a tree, which its maintainers say waits for
 * a tree of Base UI's own.
 */

import { Popover as Primitive } from "@base-ui/react/popover";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useControllableState } from "./controllable-state";
import { chain } from "./events";
import {
  ErrorMessage,
  Field,
  Hint,
  Label,
  present,
  Unbound,
  useControlProps,
  useFieldSummary,
  useFormDefault,
} from "./field";
import { ChevronIcon, SearchIcon } from "./icons";
import { useLabels } from "./labels";
import { useOverlaySound } from "./overlay";
import { useMergedRef } from "./refs";
import { ScrollArea } from "./scroll-area";
import { useScopeSound } from "./sound-scope";
import { TreeControl, type TreeItemState } from "./tree";
import { indexTree, isBranch, labelHas, searchTree, type TreeNode } from "./tree-data";

/** The words Tree select writes, which a LabelsProvider or its `labels` can change. */
export type TreeSelectLabels = {
  /** Names the field that finds nodes by their labels, and shows in it until users type. */
  search: string;
  /** Shown when nothing matches what has been typed. */
  empty: string;
  /** Tells screen readers how many nodes match what has been typed. */
  results: (count: number) => string;
};

export const defaultTreeSelectLabels: TreeSelectLabels = {
  search: "Search",
  empty: "No results found",
  results: (count) => (count === 1 ? "1 result" : `${count} results`),
};

/**
 * A tree with more nodes than this has a search field above it, as a Select's list this long opens
 * beneath its field.
 */
const SHORT_TREE = 8;

type FieldWords = {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: ReactNode;
};

export type TreeSelectControlProps = Omit<
  ComponentPropsWithRef<"button">,
  "value" | "defaultValue" | "children" | "name" | "disabled" | "id"
> & {
  /**
   * The nodes at the top level, each with its children. Give the same array while the nodes stay
   * the same.
   */
  items: readonly TreeNode[];
  /** The chosen node's value. Leave it out to let the field keep track. */
  value?: string | null;
  /** The value an uncontrolled field starts with. */
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /**
   * Which nodes users can choose, as Tree's `choose` says. By default, only leaves, so pressing a
   * branch opens it and the popup stays open.
   */
  choose?: "any" | "leaves";
  /**
   * Whether a node matches what users type in the search, as Combobox's `filter` is given the
   * search first. By default, its label contains the text.
   */
  filter?: (search: string, node: TreeNode) => boolean;
  /** Shown while nothing is chosen. */
  placeholder?: ReactNode;
  /** The name the chosen value submits under in a form. */
  name?: string;
  disabled?: boolean;
  id?: string;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<TreeSelectLabels>;
  /** Draws each node in the popup's tree, as a `TreeItem`, as Tree's `children` does. */
  children?: (node: TreeNode, state: TreeItemState) => ReactNode;
};

export type TreeSelectProps = Omit<TreeSelectControlProps, "id"> & FieldWords & { id?: string };

/**
 * Lets users choose one node from a hierarchy that is too long to show on the page, such as the
 * organisation they work for, within its department. It looks like a Select. Its popup shows the
 * hierarchy as a Tree, opened to the chosen node. A tree of more than eight nodes has a search
 * field above it, which shows the nodes that match and where each is.
 *
 * It is a bound Field with a Label, a Hint, an ErrorMessage and a TreeSelectControl. Compose those
 * parts yourself to put something between them. Its props go to the control.
 *
 * Use it where users find a node by where it is. To find a node by its name, Combobox with each
 * option's place as its `description` is quicker.
 */
export function TreeSelect({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  id,
  "aria-describedby": describedBy,
  ...props
}: TreeSelectProps) {
  const generated = useId();
  return (
    <Field
      controlId={id ?? `field-${generated}`}
      name={props.name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <Label visuallyHidden={hideLabel}>{label}</Label>
      <Hint>{hint}</Hint>
      <ErrorMessage />
      <TreeSelectControl {...props} />
    </Field>
  );
}

/**
 * The button's name, as its label or its own `aria-label` gives it, to name the popup and its tree
 * after the question. The popup cannot name itself by the button's id, because a combobox read as
 * part of a name gives its value, not its label.
 */
function nameOf(button: HTMLButtonElement | null) {
  if (!button) return undefined;
  const own = button.getAttribute("aria-label");
  if (own) return own;
  const ids = button.getAttribute("aria-labelledby")?.split(" ");
  const names = ids
    ? ids.map((each) => button.ownerDocument.getElementById(each))
    : [...(button.labels ?? [])];
  return (
    names
      .map((each) => each?.textContent?.trim())
      .filter(Boolean)
      .join(" ") || undefined
  );
}

/**
 * Tree select's control on its own, for a field composed from Field's parts. It is the button that
 * shows the choice, with its popup. In a bound Field, it takes its id, name and descriptions from
 * the field, and Check your answers shows the chosen node's label. Every prop, including
 * `className`, `style` and `ref`, goes on the button.
 *
 * The button is a combobox, as Select's is, so screen readers read its label and then its value.
 * A press or the up or down arrow opens its popup, which is a dialog. Focus starts in the search field, or on the chosen node on a touch screen,
 * where the keyboard would cover the tree. The Down arrow and Enter move from the search to the
 * tree, and the Up arrow from the tree's first node goes back. Choosing closes the popup.
 */
export function TreeSelectControl(given: TreeSelectControlProps) {
  const {
    items,
    value,
    defaultValue,
    onValueChange,
    choose = "leaves",
    filter,
    placeholder,
    name,
    disabled = false,
    labels: ownLabels,
    children,
    className = "",
    ref,
    onKeyDown,
    ...props
  } = useControlProps(given);
  const labels = useLabels("treeSelect", defaultTreeSelectLabels, ownLabels);
  const index = useMemo(() => indexTree(items), [items]);
  // A Form can give the field an answer to start with, such as one kept from an earlier visit. A
  // kept answer with nothing in it means that nothing was chosen.
  const saved = useFormDefault(name);
  const [current, setCurrent] = useControllableState<string | null>(
    value,
    saved ? saved[0] || null : (defaultValue ?? null),
    (next) => {
      if (next !== null) onValueChange?.(next);
    },
  );
  useFieldSummary({
    answer: (data) => {
      const sent = name ? data.get(name) : null;
      return typeof sent === "string" && sent ? (index.get(sent)?.node.label ?? sent) : undefined;
    },
  });

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Read from the button as the popup opens, so the popup is as wide as the field, at least, and
  // named after its question.
  const [opened, setOpened] = useState<{ width?: number; name?: string }>({});
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const merged = useMergedRef(trigger, ref);
  const sound = useOverlaySound();
  const play = useScopeSound();

  const searchable = index.size > SHORT_TREE;
  // How many nodes match, for screen readers. Only the ones users can choose count, so a branch
  // listed again inside itself counts once. A search that finds only branches counts them.
  const matches = useMemo(() => {
    if (!search.trim()) return null;
    const matched = [...searchTree(items, search, filter ?? labelHas).matched];
    const choosable = matched.filter((each) => {
      const node = index.get(each)?.node;
      return choose === "any" || (node !== undefined && !isBranch(node));
    });
    return choosable.length || matched.length;
  }, [items, index, search, filter, choose]);
  const chosen = current === null ? undefined : index.get(current)?.node;
  // The node in the tree that Tab reaches, which the popup's keys move to.
  const tabStop = () =>
    popup.current?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]') ?? null;

  const change = (next: boolean) => {
    if (next) setOpened({ width: trigger.current?.offsetWidth, name: nameOf(trigger.current) });
    else setSearch("");
    setOpen(next);
  };

  return (
    <Primitive.Root
      open={open}
      onOpenChange={(next, details) => {
        sound(next, details.reason);
        change(next);
      }}
    >
      <Primitive.Trigger
        {...props}
        ref={merged}
        role="combobox"
        disabled={disabled}
        // The arrow keys open the popup, as they open a Select's list.
        onKeyDown={chain(onKeyDown, (event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          if (open) return;
          change(true);
          play("open");
        })}
        className={`x-govuk-ui-input x-govuk-ui-select-trigger x-govuk-ui-tree-select-trigger ${className}`.trim()}
      >
        <span className="x-govuk-ui-select-value" data-placeholder={chosen ? undefined : ""}>
          {chosen?.label ?? placeholder}
        </span>
        <span className="x-govuk-ui-select-icon">
          <ChevronIcon size={16} />
        </span>
      </Primitive.Trigger>
      {name && <input type="hidden" name={name} value={current ?? ""} disabled={disabled} />}
      <Primitive.Portal>
        <Primitive.Positioner
          className="x-govuk-ui-floating-positioner"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
        >
          <Primitive.Popup
            ref={popup}
            className="x-govuk-ui-floating x-govuk-ui-tree-select-popup"
            aria-label={opened.name}
            style={
              opened.width
                ? ({ "--x-govuk-ui-tree-select-width": `${opened.width}px` } as CSSProperties)
                : undefined
            }
            initialFocus={(type) => (type !== "touch" && searchField.current) || tabStop() || true}
          >
            {searchable && (
              <div className="x-govuk-ui-tree-select-search">
                <SearchIcon />
                <input
                  ref={searchField}
                  className="x-govuk-ui-tree-select-input"
                  aria-label={labels.search}
                  placeholder={labels.search}
                  autoComplete="off"
                  spellCheck={false}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowDown" && event.key !== "Enter") return;
                    const node = tabStop();
                    if (!node) return;
                    event.preventDefault();
                    node.focus();
                  }}
                />
              </div>
            )}
            {matches !== 0 && (
              <ScrollArea className="x-govuk-ui-tree-select-scroll" fade>
                {/* The tree inside is the popup's, not the field's, so it takes no id or name. */}
                <Unbound>
                  <TreeControl
                    items={items}
                    value={current}
                    onValueChange={(next) => {
                      setCurrent(next);
                      setOpen(false);
                      setSearch("");
                    }}
                    choose={choose}
                    search={search}
                    filter={filter}
                    aria-label={opened.name}
                    onKeyDown={(event) => {
                      const first = popup.current?.querySelector('[role="treeitem"]');
                      if (event.key !== "ArrowUp" || event.target !== first) return;
                      if (!searchField.current) return;
                      event.preventDefault();
                      searchField.current.focus();
                    }}
                  >
                    {children}
                  </TreeControl>
                </Unbound>
              </ScrollArea>
            )}
            {/* One status says how many nodes a search finds, or that it finds none. */}
            <p
              role="status"
              className={
                matches === 0 ? "x-govuk-ui-tree-select-empty" : "x-govuk-ui-visually-hidden"
              }
            >
              {matches === 0 ? labels.empty : matches === null ? "" : labels.results(matches)}
            </p>
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
