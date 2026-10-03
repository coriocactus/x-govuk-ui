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
  useState,
} from "react";
import { springs, useMotionTiming } from "./motion";

type GroupContextValue = { id: string; multiple: boolean; value: readonly string[] };
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
};

/**
 * A row of options pressed in place, such as a view switcher. Compose it from `ToggleGroupItem`.
 */
export function ToggleGroup({
  children,
  value: controlled,
  defaultValue = [],
  onValueChange,
  multiple = false,
  disabled = false,
  size = "medium",
  className = "",
  ...props
}: ToggleGroupProps) {
  const id = useId();
  const [own, setOwn] = useState<string[]>(defaultValue);
  const value = controlled ?? own;
  return (
    <GroupContext value={{ id, multiple, value }}>
      <Primitive
        {...props}
        className={`x-govuk-ui-toggle-group ${className}`.trim()}
        data-size={size}
        value={value}
        multiple={multiple}
        disabled={disabled}
        onValueChange={(next: string[]) => {
          // One item always stays pressed unless the group allows several.
          if (!multiple && next.length === 0) return;
          if (controlled === undefined) setOwn(next);
          onValueChange?.(next);
        }}
      >
        {children}
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
