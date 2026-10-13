"use client";

import type { ComponentPropsWithRef, FormEvent, ReactNode } from "react";
import { useControllableState } from "./controllable-state";
import { Label, useField } from "./field";
import { useLabels } from "./labels";

/** The words Search box writes, which a LabelsProvider or its `labels` can change. */
export type SearchBoxLabels = {
  /** What the field searches, for screen readers, unless it is given its own `label`. */
  label: string;
  /** Names the search button for screen readers. */
  button: string;
};

export const defaultSearchBoxLabels: SearchBoxLabels = { label: "Search", button: "Search" };

export type SearchBoxProps = Omit<
  ComponentPropsWithRef<"form">,
  "defaultValue" | "onValueChange" | "onSearch" | "action" | "name" | "id"
> & {
  /** What the field searches, for screen readers. By default, its `label` label, "Search". */
  label?: ReactNode;
  /**
   * Hides the label visually, as it is by default, because the button names the search. Screen
   * readers still announce it.
   */
  hideLabel?: boolean;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /**
   * Runs the search in place. Without it, the form goes to `action`, as a site search does.
   */
  onSearch?: (query: string) => void;
  /** Where the form goes, with the query as `name`. */
  action?: string;
  name?: string;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<SearchBoxLabels>;
  id?: string;
};

/**
 * A search field with its button attached, like GOV.UK's site search. The field is followed by a
 * brand-blue button with a magnifying glass. It is a search landmark, so screen readers can go
 * straight to it.
 */
export function SearchBox({
  label,
  hideLabel = true,
  placeholder,
  value,
  defaultValue = "",
  onValueChange,
  onSearch,
  action,
  name = "q",
  labels: ownLabels,
  id,
  className = "",
  ...props
}: SearchBoxProps) {
  const labels = useLabels("searchBox", defaultSearchBoxLabels, ownLabels);
  const field = useField({ id });
  const [query, setQuery] = useControllableState(value, defaultValue, onValueChange);
  return (
    // biome-ignore lint/a11y/useSemanticElements: A form with the search role is a search landmark in every browser, and submits as a form.
    <form
      {...props}
      role="search"
      className={`x-govuk-ui-search-box ${className}`.trim()}
      action={action}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!onSearch) return;
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <Label htmlFor={field.id} visuallyHidden={hideLabel}>
        {label ?? labels.label}
      </Label>
      <div className="x-govuk-ui-search-box-field">
        <input
          {...field.controlProps}
          type="search"
          name={name}
          className="x-govuk-ui-input x-govuk-ui-search-box-input"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="x-govuk-ui-search-box-button" aria-label={labels.button}>
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5" />
          </svg>
        </button>
      </div>
    </form>
  );
}
