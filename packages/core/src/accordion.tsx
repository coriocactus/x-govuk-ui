"use client";

import { Accordion as Primitive } from "@base-ui/react/accordion";
import {
  type ComponentPropsWithRef,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

type AccordionContextValue = {
  headingLevel: HeadingLevel;
  value: string[];
  values: string[];
  setValue: (value: string[]) => void;
  register: (value: string) => () => void;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion(part: string) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error(`${part} must be inside Accordion.`);
  return context;
}

export type AccordionProps = Omit<
  Primitive.Root.Props<string>,
  "className" | "render" | "value" | "defaultValue" | "onValueChange"
> & {
  className?: string;
  /** The open sections. Leave it out to let the accordion keep track. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** The heading level of each section's title, as in GOV.UK's accordion. */
  headingLevel?: HeadingLevel;
};

/**
 * Sections that users open to read. Compose it from `AccordionItem`, `AccordionTrigger` and
 * `AccordionPanel`, and add `AccordionShowAll` above the sections for GOV.UK's "Show all sections".
 */
export function Accordion({
  value: controlled,
  defaultValue = [],
  onValueChange,
  headingLevel = 3,
  className = "",
  children,
  ...props
}: AccordionProps) {
  const [own, setOwn] = useState(defaultValue);
  const [values, setValues] = useState<string[]>([]);
  const value = controlled ?? own;
  const setValue = useCallback(
    (next: string[]) => {
      if (controlled === undefined) setOwn(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );
  // Each item registers its value, so Show all knows every section.
  const register = useCallback((item: string) => {
    setValues((current) => [...current, item]);
    return () => setValues((current) => current.filter((each) => each !== item));
  }, []);
  const context = useMemo(
    () => ({ headingLevel, value, values, setValue, register }),
    [headingLevel, value, values, setValue, register],
  );

  return (
    <AccordionContext value={context}>
      <Primitive.Root
        {...props}
        value={value}
        onValueChange={(next) => setValue(next)}
        className={`x-govuk-ui-accordion ${className}`.trim()}
      >
        {children}
      </Primitive.Root>
    </AccordionContext>
  );
}

export type AccordionItemProps = Omit<Primitive.Item.Props, "className" | "value"> & {
  value: string;
  className?: string;
};

/** One section, with a trigger and its panel. */
export function AccordionItem({ value, className = "", ...props }: AccordionItemProps) {
  const { register } = useAccordion("AccordionItem");
  useLayoutEffect(() => register(value), [register, value]);
  return (
    <Primitive.Item
      {...props}
      value={value}
      className={`x-govuk-ui-accordion-item ${className}`.trim()}
    />
  );
}

export type AccordionTriggerProps = Omit<Primitive.Trigger.Props, "className"> & {
  className?: string;
  /** A line beneath the title that sums up the section. Screen readers hear it with the title. */
  summary?: ReactNode;
};

/** The section's title, as a heading that contains the button. */
export function AccordionTrigger({
  summary,
  className = "",
  children,
  ...props
}: AccordionTriggerProps) {
  const { headingLevel } = useAccordion("AccordionTrigger");
  const Heading = `h${headingLevel}` as const;
  return (
    <Primitive.Header className="x-govuk-ui-accordion-heading" render={<Heading />}>
      <Primitive.Trigger {...props} className={`x-govuk-ui-accordion-trigger ${className}`.trim()}>
        <span className="x-govuk-ui-accordion-title">
          {children}
          {summary && <span className="x-govuk-ui-accordion-summary">{summary}</span>}
        </span>
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
          <path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </Primitive.Trigger>
    </Primitive.Header>
  );
}

export type AccordionPanelProps = Omit<Primitive.Panel.Props, "className"> & {
  className?: string;
};

/**
 * The section's content. It opens and closes smoothly. As in GOV.UK, a closed panel stays in the
 * page, so the browser's find in page can reach its text and opens the section.
 */
export function AccordionPanel({
  hiddenUntilFound = true,
  className = "",
  children,
  ...props
}: AccordionPanelProps) {
  return (
    <Primitive.Panel
      {...props}
      hiddenUntilFound={hiddenUntilFound}
      className={`x-govuk-ui-accordion-panel ${className}`.trim()}
    >
      <div className="x-govuk-ui-accordion-content">{children}</div>
    </Primitive.Panel>
  );
}

export type AccordionShowAllProps = Omit<
  ComponentPropsWithRef<"button">,
  "children" | "onClick" | "type"
> & {
  showLabel?: string;
  hideLabel?: string;
};

/**
 * GOV.UK's "Show all sections". It opens every section, or closes them all once they are open.
 * Use it with `multiple`, so more than one section can be open.
 */
export function AccordionShowAll({
  showLabel = "Show all sections",
  hideLabel = "Hide all sections",
  className = "",
  ...props
}: AccordionShowAllProps) {
  const { value, values, setValue } = useAccordion("AccordionShowAll");
  const allOpen = values.length > 0 && values.every((each) => value.includes(each));
  return (
    <button
      type="button"
      {...props}
      className={`x-govuk-ui-accordion-show-all ${className}`.trim()}
      aria-expanded={allOpen}
      onClick={() => setValue(allOpen ? [] : values)}
    >
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
        <path d="m5 8 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      {allOpen ? hideLabel : showLabel}
    </button>
  );
}
