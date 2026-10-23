/*
 * The model behind Tree and Tree select, as plain functions of a tree's nodes. The file has no
 * "use client", so a server can work out what a tree shows, such as every branch to open.
 *
 * A tree takes its nodes as data, in `items`. Typing, searching, Check your answers and the keys
 * all need every node before the tree draws, including the nodes in closed branches.
 */

/** One node of a tree, as Tree and Tree select take their `items`. */
export type TreeNode = {
  /**
   * The node's value, which the tree sends with a form and names the node by. It must be unique in
   * the whole tree. A thing that appears in two places needs a value for each place.
   */
  value: string;
  /** The node's name, as plain text, so typing, searching and Check your answers can read it. */
  label: string;
  /** A line beneath the label, such as what kind of thing the node is. */
  description?: string;
  /** Users can reach, open and read it, but not choose it. */
  disabled?: boolean;
  /** The nodes inside it. A node with children is a branch, and a node without is a leaf. */
  children?: readonly TreeNode[];
};

/**
 * Whether a node has nodes inside it.
 * @internal
 */
export const isBranch = (node: TreeNode) => Boolean(node.children?.length);

/** Every branch's value, in the order they read, such as to open the whole tree. */
export function treeBranches(items: readonly TreeNode[]): string[] {
  const values: string[] = [];
  const walk = (nodes: readonly TreeNode[]) => {
    for (const node of nodes) {
      if (!isBranch(node)) continue;
      values.push(node.value);
      walk(node.children ?? []);
    }
  };
  walk(items);
  return values;
}

/**
 * Where each node is, by its value. It gives the node itself, its parent's value, and how deep the
 * node is, from 1 at the top level.
 * @internal
 */
export type TreeIndex = ReadonlyMap<
  string,
  { node: TreeNode; parent: string | null; level: number }
>;

/** @internal */
export function indexTree(items: readonly TreeNode[]): TreeIndex {
  const index = new Map<string, { node: TreeNode; parent: string | null; level: number }>();
  const walk = (nodes: readonly TreeNode[], parent: string | null, level: number) => {
    for (const node of nodes) {
      index.set(node.value, { node, parent, level });
      if (node.children) walk(node.children, node.value, level + 1);
    }
  };
  walk(items, null, 1);
  return index;
}

/**
 * The values of a node's ancestors, from its parent to the top level. A value the index does not
 * know has none.
 * @internal
 */
export function ancestorsOf(index: TreeIndex, value: string): string[] {
  const ancestors: string[] = [];
  for (let parent = index.get(value)?.parent; parent; parent = index.get(parent)?.parent)
    ancestors.push(parent);
  return ancestors;
}

/**
 * The values of the nodes on show, in the order they read. An open branch's children follow it,
 * and a closed branch's are left out.
 * @internal
 */
export function visibleValues(items: readonly TreeNode[], open: ReadonlySet<string>): string[] {
  const values: string[] = [];
  const walk = (nodes: readonly TreeNode[]) => {
    for (const node of nodes) {
      values.push(node.value);
      if (node.children && open.has(node.value)) walk(node.children);
    }
  };
  walk(items);
  return values;
}

/**
 * Whether a node's label has the search in it, ignoring case, as Combobox matches its options.
 * @internal
 */
export function labelHas(search: string, node: TreeNode) {
  return node.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

/**
 * The part of a tree that a search finds. It keeps each node that matches, with every node inside
 * it, so users can still open a branch that matched. It keeps the ancestors of each match too, so
 * each match shows where it is, and opens them. An ancestor kept only for a match inside it is not
 * a match itself.
 * @internal
 */
export function searchTree(
  items: readonly TreeNode[],
  search: string,
  matches: (search: string, node: TreeNode) => boolean,
): { items: readonly TreeNode[]; matched: ReadonlySet<string>; open: ReadonlySet<string> } {
  const matched = new Set<string>();
  const open = new Set<string>();
  // Returns the nodes kept from `nodes`, and whether any of them is or holds a match.
  const walk = (nodes: readonly TreeNode[]): TreeNode[] => {
    const kept: TreeNode[] = [];
    for (const node of nodes) {
      const own = matches(search, node);
      if (own) matched.add(node.value);
      const children = node.children ? walk(node.children) : [];
      // A match inside opens the node, so the match shows.
      if (children.length) open.add(node.value);
      // A node that matches keeps every node inside it, whether they match or not.
      if (own) kept.push(node);
      else if (children.length) kept.push({ ...node, children });
    }
    return kept;
  };
  return { items: walk(items), matched, open };
}
