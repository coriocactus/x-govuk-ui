"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";
import type { ComponentPropsWithRef, ReactNode } from "react";

export type TabsProps = ComponentPropsWithRef<"div"> & {
  children: ReactNode;
  /** The open tab. Leave it out to let the tabs keep track. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

/**
 * Sections of related content, one shown at a time, such as an application's details, documents
 * and history. Compose it from `TabsList`, `TabsTrigger` and `TabsPanel`. GOV.UK advises tabs only
 * when people need to switch between sections, not read them in order.
 */
export function Tabs({
  children,
  value,
  defaultValue,
  onValueChange,
  className = "",
  ...props
}: TabsProps) {
  return (
    <Primitive.Root
      {...props}
      className={`x-govuk-ui-tabs ${className}`.trim()}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => onValueChange?.(next as string)}
    >
      {children}
    </Primitive.Root>
  );
}

export type TabsListProps = ComponentPropsWithRef<"div"> & {
  children: ReactNode;
  /** Names the tabs for screen readers, such as "Application". */
  "aria-label"?: string;
};

/**
 * The row of tabs. A bar glides beneath the open one. The arrow keys move between tabs and open
 * each in turn, as GOV.UK's tabs do.
 */
export function TabsList({
  children,
  "aria-label": label,
  className = "",
  ...props
}: TabsListProps) {
  return (
    <Primitive.List
      {...props}
      className={`x-govuk-ui-tabs-list ${className}`.trim()}
      aria-label={label}
      activateOnFocus
    >
      {children}
      <Primitive.Indicator className="x-govuk-ui-tabs-indicator" />
    </Primitive.List>
  );
}

export type TabsTriggerProps = Omit<ComponentPropsWithRef<"button">, "value"> & {
  value: string;
  children: ReactNode;
  disabled?: boolean;
};

/**
 * One tab. The open tab's label is bold. A hidden bold copy of the label keeps every tab at its
 * bold width, so the tabs never shift as another opens.
 */
export function TabsTrigger({
  value,
  children,
  disabled,
  className = "",
  ...props
}: TabsTriggerProps) {
  return (
    <Primitive.Tab
      {...props}
      className={`x-govuk-ui-tabs-trigger ${className}`.trim()}
      value={value}
      disabled={disabled}
    >
      <span className="x-govuk-ui-tabs-label">
        <span>{children}</span>
        <span className="x-govuk-ui-tabs-label-room" aria-hidden="true">
          {children}
        </span>
      </span>
    </Primitive.Tab>
  );
}

export type TabsPanelProps = ComponentPropsWithRef<"div"> & { value: string; children: ReactNode };

/** The content of one tab. It replaces the previous tab's content at once. */
export function TabsPanel({ value, children, className = "", ...props }: TabsPanelProps) {
  return (
    <Primitive.Panel
      {...props}
      className={`x-govuk-ui-tabs-panel ${className}`.trim()}
      value={value}
    >
      {children}
    </Primitive.Panel>
  );
}
