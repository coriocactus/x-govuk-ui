"use client";

/*
 * Tree, after WAI-ARIA's tree view pattern. Base UI has no tree, so the keys, focus and selection
 * are the library's own. Each branch's group opens and closes on Base UI's Collapsible.
 *
 * - `Tree` is a bound Field with a Label, a Hint, an ErrorMessage and a `TreeControl`.
 * - `TreeControl` is the tree. It keeps which node is chosen and which branches are open, and
 *   handles every key and press for its items, from its root.
 * - `TreeItem` draws one node, with its row and the group of its children. The tree finds each
 *   node from `items`, and its `children` function returns the TreeItem that draws it.
 *
 * The items' markup nests, with each branch's group inside its item, so the browser works out each
 * item's level and place among its siblings. Closed groups stay in the page, hidden until found, as
 * Accordion's sections do, so find in page reaches them. The tree is therefore for hundreds of
 * nodes, not tens of thousands, which would need rows drawn only while they are in view.
 */

import { Collapsible } from "@base-ui/react/collapsible";
import {
  type ComponentPropsWithRef,
  createContext,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
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
  useBoundField,
  useControlProps,
  useFieldSummary,
  useFormDefault,
} from "./field";
import { ChevronIcon, TickIcon } from "./icons";
import { useLabels } from "./labels";
import { useMergedRef } from "./refs";
import { useScopeSound } from "./sound-scope";
import {
  ancestorsOf,
  indexTree,
  isBranch,
  labelHas,
  searchTree,
  type TreeNode,
  visibleValues,
} from "./tree-data";

/** The words Tree writes, which a LabelsProvider or its `labels` can change. */
export type TreeLabels = {
  /**
   * Names the button that opens a branch. Keys open a branch from the item itself, so the button is
   * for a pointer and for a screen reader on a touch screen.
   */
  expand: (label: string) => string;
  /** Names the button that closes a branch. */
  collapse: (label: string) => string;
};

export const defaultTreeLabels: TreeLabels = {
  expand: (label) => `Expand ${label}`,
  collapse: (label) => `Collapse ${label}`,
};

/** The state of the node a TreeItem draws, which the tree's `children` function is given. */
export type TreeItemState = {
  /** How deep the node is, from 1 at the top level. */
  level: number;
  /** Whether the node has children. */
  branch: boolean;
  /** Whether the node's children show. A leaf is never expanded. */
  expanded: boolean;
  /** Whether the node is the chosen one. */
  selected: boolean;
};

type TreeContextValue = {
  labels: TreeLabels;
  render: (node: TreeNode, state: TreeItemState) => ReactNode;
  open: ReadonlySet<string>;
  value: string | null;
  tabStop: string | null;
  choose: "any" | "leaves";
  disabled: boolean;
  /** The text that the matches of a search show in bold. */
  search: string;
  /** The values of the nodes that match a search, or null while the tree does not search. */
  matched: ReadonlySet<string> | null;
  setOpen: (value: string, open: boolean) => void;
  focus: (value: string) => void;
  register: (value: string, element: HTMLLIElement | null) => (() => void) | undefined;
};

const TreeContext = createContext<TreeContextValue | null>(null);

function useTree(part: string) {
  const context = useContext(TreeContext);
  if (!context) throw new Error(`${part} must be inside a Tree.`);
  return context;
}

/** The node a TreeItem draws, which the tree gives it as it walks its items. */
const ItemContext = createContext<(TreeItemState & { node: TreeNode }) | null>(null);

type FieldWords = {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: ReactNode;
};

export type TreeControlProps = Omit<
  ComponentPropsWithRef<"ul">,
  "children" | "defaultValue" | "onChange"
> & {
  /**
   * The nodes at the top level, each with its children. Give the same array while the nodes stay
   * the same, because the tree indexes them again when it changes.
   */
  items: readonly TreeNode[];
  /** The chosen node's value. Leave it out to let the tree keep track. */
  value?: string | null;
  /** The value an uncontrolled tree starts with. */
  defaultValue?: string | null;
  /** Called with the node users choose. Users cannot unchoose a node, only choose another. */
  onValueChange?: (value: string) => void;
  /** The values of the open branches. Leave it out to let the tree keep track. */
  expanded?: string[];
  /**
   * The branches an uncontrolled tree starts with open. By default, those around the chosen node,
   * so it shows.
   */
  defaultExpanded?: string[];
  /** Called with the open branches as users open and close them. */
  onExpandedChange?: (expanded: string[]) => void;
  /**
   * Which nodes users can choose. With `leaves`, a branch is a heading for the nodes inside it, and
   * pressing it opens or closes it.
   */
  choose?: "any" | "leaves";
  /**
   * Text to find. The tree then shows the nodes that match, with the branches around them open,
   * and the matching text in bold. A branch that matches keeps all its children. While it searches,
   * the branches users open or close leave `expanded` as it was, for when the search is cleared.
   */
  search?: string;
  /**
   * Whether a node matches the search, as Combobox's `filter` is given the search first. By
   * default, its label contains the text. Give the same function while the search stays the same.
   */
  filter?: (search: string, node: TreeNode) => boolean;
  /** The name the chosen value submits under in a form. */
  name?: string;
  /** Takes the tree out of use. Users can neither move through it nor choose. */
  disabled?: boolean;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<TreeLabels>;
  /**
   * Draws each node, given the node and its state, as a `TreeItem`. By default, a TreeItem with
   * only the node's label. Return the same kind of TreeItem for every node, such as one with an
   * icon, so the rows line up.
   */
  children?: (node: TreeNode, state: TreeItemState) => ReactNode;
};

export type TreeProps = Omit<TreeControlProps, "id"> & FieldWords & { id?: string };

/**
 * Lets users choose one node from a hierarchy, such as a river within its river basin district, or
 * a document within its folder. The arrow keys move through the nodes and open and close branches,
 * and typing a node's first letters moves to it, as WAI-ARIA's tree view pattern says. A branch
 * opens smoothly beneath its row, along a guide line.
 *
 * It is a bound Field with a Label, a Hint, an ErrorMessage and a TreeControl. Compose those parts
 * yourself to put something between them. Its props go to the control.
 *
 * Use it where users find a node by where it is. To find a node by its name, Combobox with each
 * option's place as its `description` is quicker. To choose from a short, flat list, use Radios.
 */
export function Tree({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  id,
  "aria-describedby": describedBy,
  ...props
}: TreeProps) {
  const generated = useId();
  return (
    <Field
      controlId={id ?? `field-${generated}`}
      name={props.name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      {/* A label cannot be for a list, so the tree names itself by the label's id. */}
      <Label visuallyHidden={hideLabel} htmlFor={null}>
        {label}
      </Label>
      <Hint>{hint}</Hint>
      <ErrorMessage />
      <TreeControl {...props} />
    </Field>
  );
}

const drawLabel = () => <TreeItem />;

/**
 * The pause, in milliseconds, after which typing starts a new search for a name, as in a native
 * list.
 */
const TYPING = 500;

/**
 * Tree's control on its own, for a field composed from Field's parts, or for a tree outside a
 * form, such as a file browser. It is the tree, with every prop on its list.
 *
 * In a bound Field, it takes its id, name and descriptions from the field, and is named by the
 * field's Label with `htmlFor={null}`. Check your answers shows the chosen node's label. Outside a
 * field, name it with `aria-label` or `aria-labelledby`.
 *
 * Tab reaches one node. It is the one last focused, else the chosen one, else the first. While that
 * node is closed away inside a branch, Tab reaches the nearest branch on show around it.
 */
export function TreeControl(given: TreeControlProps) {
  const {
    items,
    value,
    defaultValue,
    onValueChange,
    expanded,
    defaultExpanded,
    onExpandedChange,
    choose = "any",
    search = "",
    filter,
    name,
    disabled = false,
    labels: ownLabels,
    children: render = drawLabel,
    className = "",
    ref,
    onKeyDown,
    onClick,
    onFocus,
    "aria-label": ariaLabel,
    "aria-labelledby": labelledBy,
    ...props
  } = useControlProps(given);
  const field = useBoundField();
  const labels = useLabels("tree", defaultTreeLabels, ownLabels);
  const play = useScopeSound();
  const index = useMemo(() => indexTree(items), [items]);

  // A Form can give the tree an answer to start with, such as one kept from an earlier visit. A
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

  const [expandedList, setExpanded] = useControllableState<string[]>(
    expanded,
    () => defaultExpanded ?? (current ? ancestorsOf(index, current) : []),
    onExpandedChange,
  );
  const expandedSet = useMemo(() => new Set(expandedList), [expandedList]);

  // While it searches, the tree shows the part that matches, with its own open branches, which
  // start as those around the matches.
  const searching = search.trim() !== "";
  const found = useMemo(
    () => (searching ? searchTree(items, search, filter ?? labelHas) : null),
    [searching, items, search, filter],
  );
  const [searchOpen, setSearchOpen] = useState<{
    search: string;
    items: readonly TreeNode[];
    open: ReadonlySet<string>;
  } | null>(null);
  // Each search starts from the branches around its matches, even one typed before.
  if (searchOpen && (searchOpen.search !== search || searchOpen.items !== items))
    setSearchOpen(null);
  const open: ReadonlySet<string> = found ? (searchOpen?.open ?? found.open) : expandedSet;
  const shown = found?.items ?? items;
  const shownIndex = useMemo(() => (found ? indexTree(found.items) : index), [found, index]);
  const visible = useMemo(() => visibleValues(shown, open), [shown, open]);
  const visibleSet = useMemo(() => new Set(visible), [visible]);

  const setOpen = useCallback(
    (target: string, next: boolean) => {
      if (open.has(target) === next) return;
      const changed = new Set(open);
      if (next) changed.add(target);
      else changed.delete(target);
      if (found) setSearchOpen({ search, items, open: changed });
      else setExpanded([...changed]);
    },
    [open, found, search, items, setExpanded],
  );

  // The node that Tab reaches. It is the one last focused, else the chosen one, else the first,
  // or the nearest branch on show around it, while it is closed away.
  const [active, setActive] = useState<string | null>(null);
  const onShow = (target: string | null) =>
    target === null
      ? undefined
      : [target, ...ancestorsOf(shownIndex, target)].find((each) => visibleSet.has(each));
  const tabStop = disabled ? null : (onShow(active) ?? onShow(current) ?? visible[0] ?? null);

  // Each item's element, to move focus to it, and the node each element draws.
  const elements = useRef(new Map<string, HTMLLIElement>());
  const values = useRef(new WeakMap<Element, string>());
  const register = useCallback((target: string, element: HTMLLIElement | null) => {
    if (!element) return;
    elements.current.set(target, element);
    values.current.set(element, target);
    return () => {
      if (elements.current.get(target) === element) elements.current.delete(target);
    };
  }, []);
  // The item holds its open children too, so the browser would scroll them all into view with it.
  // Only its row is brought into view.
  const focus = useCallback((target: string) => {
    setActive(target);
    const element = elements.current.get(target);
    element?.focus({ preventScroll: true });
    element?.querySelector(".x-govuk-ui-tree-row")?.scrollIntoView({ block: "nearest" });
  }, []);

  const root = useRef<HTMLUListElement>(null);
  const merged = useMergedRef(root, ref);
  /** The node of the item an event came from, if the item is this tree's own. */
  const itemOf = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return null;
    const item = target.closest('[role="treeitem"]');
    if (!item || item.closest('[role="tree"]') !== root.current) return null;
    return values.current.get(item) ?? null;
  };

  const typing = useRef({ text: "", at: Number.NEGATIVE_INFINITY });
  /**
   * Moves to the next node whose label starts with what users typed. A run of one letter goes
   * through the nodes that start with it, one at a time.
   */
  const typeahead = (key: string, from: string, at: number) => {
    const typed = typing.current;
    typed.text = (at - typed.at > TYPING ? "" : typed.text) + key.toLocaleLowerCase();
    typed.at = at;
    const text = typed.text;
    const repeated = [...text].every((letter) => letter === text[0]);
    const wanted = repeated ? (text[0] ?? "") : text;
    const start = visible.indexOf(from) + (repeated ? 1 : 0);
    const order = [...visible.slice(start), ...visible.slice(0, start)];
    const next = order.find((each) =>
      shownIndex.get(each)?.node.label.toLocaleLowerCase().startsWith(wanted),
    );
    if (next) focus(next);
  };

  /** Chooses a node, or opens or closes a branch that cannot be chosen. */
  const activate = (target: string) => {
    const entry = shownIndex.get(target);
    if (!entry || disabled) return;
    if (isBranch(entry.node) && choose === "leaves") return setOpen(target, !open.has(target));
    if (!entry.node.disabled) setCurrent(target);
  };

  // A service's own handler on the tree or an item runs first. Preventing the event's default
  // stops the tree's own action, as `chain` stops a part's, even when the tree has no handler.
  const keys = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.defaultPrevented) return;
    const target = itemOf(event.target);
    if (target === null || disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    // A key that composes a character, as for Japanese, is the input method's.
    if (event.nativeEvent.isComposing) return;
    const entry = shownIndex.get(target);
    if (!entry) return;
    const at = visible.indexOf(target);
    const branch = isBranch(entry.node);
    const isOpen = open.has(target);
    const go = (next: string | undefined) => {
      if (next !== undefined) focus(next);
    };
    const toggle = (next: boolean) => {
      setOpen(target, next);
      play(next ? "open" : "close");
    };
    const typingNow = event.timeStamp - typing.current.at <= TYPING && typing.current.text;
    switch (event.key) {
      case "ArrowDown":
        go(visible[at + 1]);
        break;
      case "ArrowUp":
        go(visible[at - 1]);
        break;
      case "Home":
        go(visible[0]);
        break;
      case "End":
        go(visible.at(-1));
        break;
      case "ArrowRight":
        if (branch && !isOpen) toggle(true);
        else if (branch) go(visible[at + 1]);
        break;
      case "ArrowLeft":
        if (branch && isOpen) toggle(false);
        else go(entry.parent ?? undefined);
        break;
      case "*": {
        // Opens every branch beside the node, as WAI-ARIA's pattern says.
        const siblings = entry.parent ? (shownIndex.get(entry.parent)?.node.children ?? []) : shown;
        const closed = siblings.filter((node) => isBranch(node) && !open.has(node.value));
        if (!closed.length) break;
        const changed = new Set(open);
        for (const node of closed) changed.add(node.value);
        if (found) setSearchOpen({ search, items, open: changed });
        else setExpanded([...changed]);
        play("open");
        break;
      }
      case "Enter":
        activate(target);
        break;
      case " ":
        // A space part way through typing a name, such as "Department for", goes on typing.
        if (typingNow) typeahead(" ", target, event.timeStamp);
        else activate(target);
        break;
      default:
        if (event.key.length !== 1) return;
        typeahead(event.key, target, event.timeStamp);
    }
    event.preventDefault();
  };

  const press = (event: MouseEvent<HTMLUListElement>) => {
    if (event.defaultPrevented) return;
    const target = itemOf(event.target);
    if (target !== null) activate(target);
  };

  const context = useMemo<TreeContextValue>(
    () => ({
      labels,
      render,
      open,
      value: current,
      tabStop,
      choose,
      disabled,
      search: found ? search : "",
      matched: found?.matched ?? null,
      setOpen,
      focus,
      register,
    }),
    [
      labels,
      render,
      open,
      current,
      tabStop,
      choose,
      disabled,
      found,
      search,
      setOpen,
      focus,
      register,
    ],
  );

  return (
    <TreeContext value={context}>
      <ul
        {...props}
        ref={merged}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA's tree is a list with the tree role, so the arrow keys move through it.
        role="tree"
        className={`x-govuk-ui-tree ${className}`.trim()}
        aria-label={ariaLabel}
        aria-labelledby={labelledBy ?? (ariaLabel ? undefined : field?.labelId)}
        aria-disabled={disabled || undefined}
        data-searching={searching || undefined}
        onKeyDown={chain(onKeyDown, keys)}
        onClick={chain(onClick, press)}
        // A Form focuses a field by its id, so the list passes focus on to the item Tab reaches.
        tabIndex={-1}
        onFocus={(event: FocusEvent<HTMLUListElement>) => {
          onFocus?.(event);
          if (event.target === event.currentTarget) {
            if (tabStop !== null) focus(tabStop);
            return;
          }
          const target = itemOf(event.target);
          if (target !== null) setActive(target);
        }}
      >
        <Branch nodes={shown} level={1} />
      </ul>
      {name && <input type="hidden" name={name} value={current ?? ""} disabled={disabled} />}
    </TreeContext>
  );
}

/** A list of nodes, each drawn by the tree's `children` function, with its state. */
function Branch({ nodes, level }: { nodes: readonly TreeNode[]; level: number }) {
  const tree = useTree("A tree's branch");
  return nodes.map((node) => {
    const branch = isBranch(node);
    const state: TreeItemState = {
      level,
      branch,
      expanded: branch && tree.open.has(node.value),
      selected: tree.value === node.value,
    };
    return (
      <ItemContext key={node.value} value={{ ...state, node }}>
        {tree.render(node, state)}
      </ItemContext>
    );
  });
}

/** The label, with the text a search found in bold. */
function Match({ label, search }: { label: string; search: string }) {
  const wanted = search.trim().toLocaleLowerCase();
  const lower = label.toLocaleLowerCase();
  // Lower case can change a label's length, as it does for "İ", so the bold would miss its letters.
  // Such a label shows no bold.
  const at = wanted && lower.length === label.length ? lower.indexOf(wanted) : -1;
  if (at < 0) return label;
  const end = at + wanted.length;
  return (
    <>
      {label.slice(0, at)}
      <mark className="x-govuk-ui-tree-match">{label.slice(at, end)}</mark>
      {label.slice(end)}
    </>
  );
}

export type TreeItemProps = ComponentPropsWithRef<"li"> & {
  /** A picture before the label, such as a folder. Screen readers leave it out. */
  icon?: ReactNode;
  /** Something after the label, such as a count. Screen readers read it after the node's name. */
  badge?: ReactNode;
  /**
   * What the row shows in place of the node's label, such as the label with a Tag. It names the
   * item for screen readers. Typing still finds the node by its label.
   */
  children?: ReactNode;
};

/**
 * One node of a tree, which the tree's `children` function returns. It finds its node by context,
 * so it can sit in a component of your own, or be rendered by another part, as in
 * `<ContextMenuTrigger render={<TreeItem />} />`. It must be the element the tree draws for the
 * node, with no element of your own around it.
 *
 * Its row shows a button to open a branch, the icon, the label, the node's description, the badge
 * and a tick on the chosen node. Beneath the row, a branch's children open in a group along a guide
 * line. Its `className`, `style` and every other prop go on the item, which takes focus.
 */
export function TreeItem({ icon, badge, children, className = "", ref, ...props }: TreeItemProps) {
  const tree = useTree("TreeItem");
  const item = useContext(ItemContext);
  if (!item) throw new Error("TreeItem must be drawn by a Tree's children function.");
  const { node, level, branch, expanded, selected } = item;
  const id = useId();
  const own = useCallback(
    (element: HTMLLIElement | null) => tree.register(node.value, element),
    [tree.register, node.value],
  );
  const merged = useMergedRef(own, ref);
  const disabled = tree.disabled || Boolean(node.disabled);
  // A branch that cannot be chosen opens and closes instead, as its sound says.
  const choosable = !(branch && tree.choose === "leaves");
  const cue = choosable ? "select" : expanded ? "close" : "open";
  const describedBy = [
    props["aria-describedby"],
    node.description && `${id}-description`,
    present(badge) && `${id}-badge`,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <li
      data-sound={cue}
      {...props}
      ref={merged}
      role="treeitem"
      className={`x-govuk-ui-tree-item ${className}`.trim()}
      // The item holds its children, so its name is its label alone, unless it is given its own.
      aria-labelledby={
        props["aria-labelledby"] ?? (props["aria-label"] ? undefined : `${id}-label`)
      }
      aria-describedby={describedBy || undefined}
      aria-expanded={branch ? expanded : undefined}
      aria-selected={choosable ? selected : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={tree.tabStop === node.value ? 0 : -1}
      data-selected={selected || undefined}
      data-disabled={disabled || undefined}
    >
      <div className="x-govuk-ui-tree-row">
        {branch ? (
          <button
            type="button"
            // Keys open a branch from its item, so the button stays out of the tab order.
            tabIndex={-1}
            className="x-govuk-ui-tree-toggle"
            aria-label={
              expanded ? tree.labels.collapse(node.label) : tree.labels.expand(node.label)
            }
            data-sound={expanded ? "close" : "open"}
            disabled={tree.disabled}
            onClick={(event) => {
              // The press opens the branch alone, not the item's own action too.
              event.preventDefault();
              tree.setOpen(node.value, !expanded);
              tree.focus(node.value);
            }}
          >
            <ChevronIcon direction="right" size={16} />
          </button>
        ) : (
          <span className="x-govuk-ui-tree-toggle" data-leaf="" />
        )}
        {icon && (
          <span className="x-govuk-ui-tree-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="x-govuk-ui-tree-text">
          <span id={`${id}-label`} className="x-govuk-ui-tree-label">
            {children ??
              (tree.matched?.has(node.value) ? (
                <Match label={node.label} search={tree.search} />
              ) : (
                node.label
              ))}
          </span>
          {node.description && (
            <span id={`${id}-description`} className="x-govuk-ui-tree-description">
              {node.description}
            </span>
          )}
        </span>
        {present(badge) && (
          <span id={`${id}-badge`} className="x-govuk-ui-tree-badge">
            {badge}
          </span>
        )}
        {choosable && selected && (
          <span className="x-govuk-ui-tree-tick">
            <TickIcon />
          </span>
        )}
      </div>
      {branch && (
        <Collapsible.Root
          className="x-govuk-ui-tree-fold"
          open={expanded}
          // Find in page opens a closed branch to show what it found.
          onOpenChange={(next) => tree.setOpen(node.value, next)}
        >
          <Collapsible.Panel
            className="x-govuk-ui-tree-group"
            // biome-ignore lint/a11y/useSemanticElements: A branch's children are a list with the group role, as WAI-ARIA's tree has it.
            render={<ul role="group" />}
            hiddenUntilFound
          >
            <Branch nodes={node.children ?? []} level={level + 1} />
          </Collapsible.Panel>
        </Collapsible.Root>
      )}
    </li>
  );
}
