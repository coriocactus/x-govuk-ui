"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup as Primitive } from "@base-ui/react/toggle-group";
import { motion } from "motion/react";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useLayoutEffect,
  useState,
} from "react";
import { useControllableState } from "./controllable-state";
import { useField, useFormDefault } from "./field";
import { springs, useMotionTiming } from "./motion";

type GroupContextValue = {
  id: string;
  multiple: boolean;
  value: readonly string[];
  /** Each item's words, by its value, for Check your answers. */
  labels: Map<string, ReactNode>;
};
const GroupContext = createContext<GroupContextValue | null>(null);

export type ToggleGroupProps = Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onChange" | "children"
> & {
  children: ReactNode;
  /** The pressed items. Leave it out to let the group keep track. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /**
   * Lets several items be pressed at once, as a text toolbar's Bold and Italic can be. Without it,
   * exactly one item is pressed, and a highlight glides to it.
   */
  multiple?: boolean;
  disabled?: boolean;
  /** `small` suits toolbars. */
  size?: "medium" | "small";
  /** Names the group for screen readers, such as "Preview width". */
  "aria-label"?: string;
  /**
   * The name the pressed items submit under, each as its value, so the group takes part in a form.
   * In a Form, its error summary links to the group, and Check your answers lists its items' words.
   */
  name?: string;
};

/**
 * A row of options pressed in place, such as a view switcher. Compose it from `ToggleGroupItem`.
 */
export function ToggleGroup({
  children,
  value: controlled,
  defaultValue,
  onValueChange,
  multiple = false,
  disabled = false,
  size = "medium",
  name,
  id: ownId,
  className = "",
  ...props
}: ToggleGroupProps) {
  const id = useId();
  // A Form can give the group its answers to start with, such as ones kept from an earlier visit.
  const saved = useFormDefault(name);
  const [value, setValue] = useControllableState(
    controlled,
    () => defaultValue ?? saved ?? [],
    onValueChange,
  );
  const [labels] = useState(() => new Map<string, ReactNode>());
  const field = useField({
    id: ownId,
    name,
    label: props["aria-label"],
    answer: (data) => (name ? data.getAll(name).map((each) => labels.get(String(each))) : []),
  });
  return (
    <GroupContext value={{ id, multiple, value, labels }}>
      <Primitive
        {...props}
        id={name || ownId ? field.id : undefined}
        className={`x-govuk-ui-toggle-group ${className}`.trim()}
        data-size={size}
        value={value}
        multiple={multiple}
        disabled={disabled}
        onValueChange={(next: string[]) => {
          // One item always stays pressed unless the group allows several.
          if (!multiple && next.length === 0) return;
          setValue(next);
        }}
      >
        {children}
        {name &&
          value.map((each) => (
            <input key={each} type="hidden" name={name} value={each} disabled={disabled} />
          ))}
      </Primitive>
    </GroupContext>
  );
}

export type ToggleGroupItemProps = Omit<ComponentPropsWithRef<"button">, "value"> & {
  value: string;
  /** Name an item that shows only an icon with `aria-label`. */
  children: ReactNode;
};

/** One option in a ToggleGroup. */
export function ToggleGroupItem({
  value,
  children,
  className = "",
  ...props
}: ToggleGroupItemProps) {
  const group = useContext(GroupContext);
  if (!group) throw new Error("ToggleGroupItem must be inside ToggleGroup.");
  const timing = useMotionTiming();
  const pressed = group.value.includes(value);
  const { labels } = group;
  useLayoutEffect(() => {
    labels.set(value, children);
    return () => {
      if (labels.get(value) === children) labels.delete(value);
    };
  });
  return (
    <Toggle {...props} value={value} className={`x-govuk-ui-toggle ${className}`.trim()}>
      {pressed && !group.multiple && (
        <motion.span
          className="x-govuk-ui-toggle-indicator"
          aria-hidden="true"
          layoutId={`${group.id}-indicator`}
          transition={timing.spring(springs.glide)}
        />
      )}
      <span className="x-govuk-ui-toggle-content">{children}</span>
    </Toggle>
  );
}
