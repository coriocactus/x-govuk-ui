"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { CalendarLabels } from "./calendar";
import type { DateInputLabels } from "./date-input";
import type { ErrorLabels } from "./error-summary";
import type { InputLabels } from "./input";
import type { PaginationLabels } from "./pagination";
import type { TimeInputLabels } from "./time-input";

/**
 * The words each component writes itself, by component, such as Pagination's Previous and Next.
 * Each component's words are a map, typed in its own file, which its `labels` prop takes in part.
 * An extension adds its components' maps to this interface, by augmenting the `x-govuk-ui` module.
 */
export interface ComponentLabels {
  calendar: CalendarLabels;
  dateInput: DateInputLabels;
  errors: ErrorLabels;
  input: InputLabels;
  pagination: PaginationLabels;
  timeInput: TimeInputLabels;
}

/**
 * Words for any components inside a LabelsProvider, by component, with the `locale` that dates and
 * numbers are written in. Each map may give some words and leave the rest to the defaults.
 */
export type Labels = {
  /** The language for dates and numbers, such as "cy" for Welsh. By default, "en-GB". */
  locale?: string;
} & { [Component in keyof ComponentLabels]?: Partial<ComponentLabels[Component]> };

const LabelsContext = createContext<Labels>({});

export type LabelsProviderProps = {
  /** The words to use, by component. A provider inside another adds to its words. */
  labels: Labels;
  children: ReactNode;
};

/**
 * Gives every component inside it the words of a service's language, such as Welsh, in one place.
 * A component's own `labels` prop comes first, then the nearest provider's words, then the
 * component's English defaults.
 */
export function LabelsProvider({ labels, children }: LabelsProviderProps) {
  const outer = useContext(LabelsContext);
  const merged = useMemo(() => {
    const all: Record<string, unknown> = { ...outer };
    for (const [component, words] of Object.entries(labels)) {
      const before = all[component];
      all[component] =
        words && typeof words === "object" && before && typeof before === "object"
          ? { ...before, ...words }
          : words;
    }
    return all as Labels;
  }, [outer, labels]);
  return <LabelsContext value={merged}>{children}</LabelsContext>;
}

/**
 * A component's words, from its own `labels`, then the nearest LabelsProvider, then its defaults.
 * @internal
 */
export function useLabels<Component extends keyof ComponentLabels>(
  component: Component,
  defaults: ComponentLabels[Component],
  own?: Partial<ComponentLabels[Component]>,
): ComponentLabels[Component] {
  const given = useContext(LabelsContext)[component] as
    | Partial<ComponentLabels[Component]>
    | undefined;
  return { ...defaults, ...given, ...own };
}

/** The language that dates and numbers are written in, from the nearest LabelsProvider. */
export function useLocale(): string {
  return useContext(LabelsContext).locale ?? "en-GB";
}
