"use client";

import { type ComponentPropsWithRef, type FormEvent, type ReactNode, useState } from "react";
import { Label, useField } from "./field";

export type SearchBoxProps = Omit<
  ComponentPropsWithRef<"form">,
  "defaultValue" | "onValueChange" | "onSearch" | "action" | "name" | "id"
> & {
  /** What the field searches, for screen readers. */
  label?: ReactNode;
  /**
   * Shows the label above the field. It is hidden by default, because the button names the search.
   */
  showLabel?: boolean;
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
  /** Names the search button for screen readers. */
  buttonLabel?: string;
  id?: string;
};

/**
 * A search field with its button attached, like GOV.UK's site search. The field is followed by a
 * brand-blue button with a magnifying glass. It is a search landmark, so screen readers can go
 * straight to it.
 */
export function SearchBox({
  label = "Search",
  showLabel = false,
  placeholder,
  value,
  defaultValue = "",
  onValueChange,
  onSearch,
  action,
  name = "q",
  buttonLabel = "Search",
  id,
  className = "",
  ...props
}: SearchBoxProps) {
  const field = useField({ id });
  const [own, setOwn] = useState(defaultValue);
  const query = value ?? own;
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
      <Label htmlFor={field.id} visuallyHidden={!showLabel}>
        {label}
      </Label>
      <div className="x-govuk-ui-search-box-field">
        <input
          {...field.controlProps}
          type="search"
          name={name}
          className="x-govuk-ui-input x-govuk-ui-search-box-input"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            if (value === undefined) setOwn(event.target.value);
            onValueChange?.(event.target.value);
          }}
        />
        <button type="submit" className="x-govuk-ui-search-box-button" aria-label={buttonLabel}>
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
