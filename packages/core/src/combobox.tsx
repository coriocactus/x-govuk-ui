"use client";

import { Combobox as Primitive } from "@base-ui/react/combobox";
import {
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
  useMemo,
  useRef,
  useState,
} from "react";
import { ErrorMessage, Field, Hint, Label, useField, useFormDefault } from "./field";
import { trackHighlight } from "./highlight";
import { ChevronIcon, CrossIcon, TickIcon } from "./icons";
import { ScrollArea } from "./scroll-area";

export type ComboboxOption = { value: string; label: string };
/** An option as a value and its label, or as text that is both. */
export type ComboboxItem = string | ComboboxOption;

const optionOf = (item: ComboboxItem): ComboboxOption =>
  typeof item === "string" ? { value: item, label: item } : item;

// Both are an input in a field, and take an input's attributes, as Input does.
type Shared = Omit<
  ComponentPropsWithRef<"input">,
  "value" | "defaultValue" | "onChange" | "id" | "name" | "disabled" | "placeholder" | "size"
> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: string;
  /** The options to search. */
  items: readonly ComboboxItem[];
  placeholder?: string;
  /** Shown when nothing matches what has been typed. */
  emptyText?: string;
  /** The name the value submits under in a form. */
  name?: string;
  disabled?: boolean;
  id?: string;
  /** Classes for the field. */
  className?: string;
};

/** The part of an option's label that matches what was typed, in bold. */
function Match({ label, query }: { label: string; query: string }) {
  const at = query ? label.toLowerCase().indexOf(query.trim().toLowerCase()) : -1;
  if (at < 0 || !query.trim()) return <>{label}</>;
  const end = at + query.trim().length;
  return (
    <>
      {label.slice(0, at)}
      <mark className="x-govuk-ui-combobox-match">{label.slice(at, end)}</mark>
      {label.slice(end)}
    </>
  );
}

/**
 * The highlight that glides to the option under the pointer or the keys, in the list's viewport.
 */
function followHighlight(viewport: HTMLDivElement | null) {
  return trackHighlight(viewport, {
    indicator: ".x-govuk-ui-combobox-highlight",
    item: ".x-govuk-ui-combobox-item[data-highlighted]",
  });
}

/**
 * The floating list, as wide as the field it opens from. The width is read from the field's own
 * layout as the list opens. Base UI's --anchor-width is not used, because it follows the field on
 * screen, and a dialog that shrinks away as it closes would then resize the list every frame.
 */
function Options({
  query,
  emptyText,
  field,
}: {
  query: string;
  emptyText: string;
  field: RefObject<HTMLDivElement | null>;
}) {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        className="x-govuk-ui-floating-positioner"
        sideOffset={6}
        anchor={field}
      >
        <Primitive.Popup
          ref={(popup) => {
            const width = field.current?.offsetWidth;
            if (popup && width)
              popup.style.setProperty("--x-govuk-ui-combobox-width", `${width}px`);
          }}
          className="x-govuk-ui-floating x-govuk-ui-combobox-popup"
        >
          {/* The options scroll in a Scroll area, which fades the edge with more beyond it. */}
          <ScrollArea viewportRef={followHighlight} className="x-govuk-ui-combobox-scroll" fade>
            <span className="x-govuk-ui-combobox-highlight" aria-hidden="true" />
            <Primitive.Empty className="x-govuk-ui-combobox-empty">{emptyText}</Primitive.Empty>
            <Primitive.List className="x-govuk-ui-combobox-list">
              {(option: ComboboxOption) => (
                <Primitive.Item
                  key={option.value}
                  value={option}
                  className="x-govuk-ui-combobox-item"
                >
                  <span className="x-govuk-ui-combobox-label">
                    <Match label={option.label} query={query} />
                  </span>
                  <Primitive.ItemIndicator className="x-govuk-ui-combobox-tick">
                    <TickIcon />
                  </Primitive.ItemIndicator>
                </Primitive.Item>
              )}
            </Primitive.List>
          </ScrollArea>
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}

export type ComboboxProps = Shared & {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
};

/**
 * A field that suggests options as people type, as GOV.UK's accessible autocomplete does, for a
 * long list such as countries. The part of each option that matches is bold. One highlight glides
 * between the options. The arrow keys and Enter choose one. Base UI provides the behaviour.
 */
export function Combobox({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  emptyText = "No results found",
  name,
  disabled,
  id,
  className = "",
  ...props
}: ComboboxProps) {
  const field = useField({ id, name, hint, errorMessage });
  // A Form can give the field an answer to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(name)?.[0];
  const options = useMemo(() => items.map(optionOf), [items]);
  const find = (wanted: string | null | undefined) =>
    wanted == null ? wanted : (options.find((option) => option.value === wanted) ?? null);
  const [query, setQuery] = useState("");
  const group = useRef<HTMLDivElement>(null);
  return (
    <Field invalid={field.invalid}>
      <Label htmlFor={field.id} visuallyHidden={hideLabel}>
        {label}
      </Label>
      <Hint id={field.hintId}>{hint}</Hint>
      <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
      <Primitive.Root
        items={options}
        value={find(value)}
        defaultValue={find(defaultValue === undefined ? saved : defaultValue)}
        onValueChange={(next) => onValueChange?.((next as ComboboxOption | null)?.value ?? null)}
        onInputValueChange={setQuery}
        itemToStringLabel={(option: ComboboxOption) => option.label}
        itemToStringValue={(option: ComboboxOption) => option.value}
        name={name}
        disabled={disabled}
      >
        <div
          ref={group}
          className={`x-govuk-ui-input-group x-govuk-ui-combobox-field ${className}`.trim()}
        >
          <Primitive.Input
            {...props}
            {...field.controlProps}
            className="x-govuk-ui-input"
            placeholder={placeholder}
          />
          <Primitive.Clear className="x-govuk-ui-combobox-button" aria-label="Clear">
            <CrossIcon />
          </Primitive.Clear>
          <Primitive.Trigger className="x-govuk-ui-combobox-button" aria-label="Show all options">
            <ChevronIcon size={16} />
          </Primitive.Trigger>
        </div>
        <Options query={query} emptyText={emptyText} field={group} />
      </Primitive.Root>
    </Field>
  );
}

export type MultiSelectProps = Shared & {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

/**
 * Lets people choose several options from a long list by typing, such as the languages they
 * speak. Each choice becomes a chip in the field, with a button to remove it, and Backspace in an
 * empty field removes the last. The list stays open, with ticks by the choices.
 */
export function MultiSelect({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  emptyText = "No results found",
  name,
  disabled,
  id,
  className = "",
  ...props
}: MultiSelectProps) {
  const field = useField({ id, name, hint, errorMessage });
  // A Form can give the field its answers to start with, such as ones kept from an earlier visit.
  const saved = useFormDefault(name);
  const options = useMemo(() => items.map(optionOf), [items]);
  const findAll = (wanted: string[] | undefined) =>
    wanted?.flatMap((each) => options.filter((option) => option.value === each));
  const [query, setQuery] = useState("");
  const chips = useRef<HTMLDivElement>(null);
  return (
    <Field invalid={field.invalid}>
      <Label htmlFor={field.id} visuallyHidden={hideLabel}>
        {label}
      </Label>
      <Hint id={field.hintId}>{hint}</Hint>
      <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
      <Primitive.Root
        multiple
        items={options}
        value={findAll(value)}
        defaultValue={findAll(defaultValue ?? saved)}
        onValueChange={(next) =>
          onValueChange?.((next as ComboboxOption[]).map((option) => option.value))
        }
        onInputValueChange={setQuery}
        itemToStringLabel={(option: ComboboxOption) => option.label}
        itemToStringValue={(option: ComboboxOption) => option.value}
        name={name}
        disabled={disabled}
      >
        <Primitive.Chips
          ref={chips}
          className={`x-govuk-ui-input-group x-govuk-ui-multi-select-field ${className}`.trim()}
        >
          <Primitive.Value>
            {(chosen: ComboboxOption[]) => (
              <>
                {chosen.map((option) => (
                  <Primitive.Chip key={option.value} className="x-govuk-ui-chip">
                    {option.label}
                    <Primitive.ChipRemove
                      className="x-govuk-ui-chip-remove"
                      aria-label={`Remove ${option.label}`}
                    >
                      <CrossIcon size={12} />
                    </Primitive.ChipRemove>
                  </Primitive.Chip>
                ))}
                <Primitive.Input
                  {...props}
                  {...field.controlProps}
                  className="x-govuk-ui-input"
                  placeholder={chosen.length ? undefined : placeholder}
                />
              </>
            )}
          </Primitive.Value>
        </Primitive.Chips>
        <Options query={query} emptyText={emptyText} field={chips} />
      </Primitive.Root>
    </Field>
  );
}
