"use client";

import { Combobox as Primitive } from "@base-ui/react/combobox";
import {
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ErrorMessage,
  Field,
  Hint,
  Label,
  present,
  useControlProps,
  useFieldSummary,
  useFormDefault,
} from "./field";
import { trackHighlight } from "./highlight";
import { ChevronIcon, CrossIcon, TickIcon } from "./icons";
import { useLabels } from "./labels";
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
> &
  FieldWords &
  ControlShared;

/** What a field says around its control. */
type FieldWords = {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: ReactNode;
};

/** What both controls take, beside an input's attributes. */
type ControlShared = {
  /** The options to search. */
  items: readonly ComboboxItem[];
  placeholder?: string;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<ComboboxLabels>;
  /** The name the value submits under in a form. */
  name?: string;
  disabled?: boolean;
  id?: string;
  /** Classes for the field. */
  className?: string;
};

/** The words Combobox and Multi-select write, which a LabelsProvider or `labels` can change. */
export type ComboboxLabels = {
  /** Shown when nothing matches what has been typed. */
  empty: string;
  /** Names the button that clears the field. */
  clear: string;
  /** Names the button that shows every option. */
  showAll: string;
  /** Names the button that removes a chosen option, in MultiSelect. */
  remove: (option: string) => string;
};

export const defaultComboboxLabels: ComboboxLabels = {
  empty: "No results found",
  clear: "Clear",
  showAll: "Show all options",
  remove: (option) => `Remove ${option}`,
};

/** The labels of the options sent, for Check your answers. */
function labelsOf(options: readonly ComboboxOption[], sent: FormDataEntryValue[]) {
  return sent
    .filter((value): value is string => typeof value === "string" && value !== "")
    .map((value) => options.find((option) => option.value === value)?.label ?? value);
}

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
 * A field that suggests options as users type, as GOV.UK's accessible autocomplete does, for a
 * long list such as countries. The part of each option that matches is bold. One highlight glides
 * between the options. The arrow keys and Enter choose one. Base UI provides the behaviour.
 *
 * It is a bound Field with a Label, a Hint, an ErrorMessage and a ComboboxControl. Compose those
 * parts yourself to put something between them.
 */
export function Combobox({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  id,
  "aria-describedby": describedBy,
  ...props
}: ComboboxProps) {
  const generated = useId();
  return (
    <Field
      controlId={id ?? `field-${generated}`}
      name={props.name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <Label visuallyHidden={hideLabel}>{label}</Label>
      <Hint>{hint}</Hint>
      <ErrorMessage />
      <ComboboxControl {...props} />
    </Field>
  );
}

export type ComboboxControlProps = Omit<ComboboxProps, keyof FieldWords> & { id?: string };

/**
 * Combobox's control on its own, for a field composed from Field's parts. It is the field that
 * takes typing, with its buttons and its list. In a bound Field, it takes its id, name and
 * descriptions from the field, and Check your answers shows its option's label.
 */
export function ComboboxControl(given: ComboboxControlProps) {
  const {
    items,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    labels: ownLabels,
    name,
    disabled,
    className = "",
    ...props
  } = useControlProps(given);
  const options = useMemo(() => items.map(optionOf), [items]);
  const labels = useLabels("combobox", defaultComboboxLabels, ownLabels);
  useFieldSummary({ answer: (data) => labelsOf(options, name ? data.getAll(name) : []) });
  // A Form can give the field an answer to start with, such as one kept from an earlier visit. A
  // kept answer with nothing in it means that nothing was chosen.
  const saved = useFormDefault(name);
  const find = (wanted: string | null | undefined) =>
    wanted == null ? wanted : (options.find((option) => option.value === wanted) ?? null);
  const [query, setQuery] = useState("");
  const group = useRef<HTMLDivElement>(null);
  return (
    <Primitive.Root
      items={options}
      value={find(value)}
      defaultValue={find(saved ? (saved[0] ?? null) : defaultValue)}
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
        <Primitive.Input {...props} className="x-govuk-ui-input" placeholder={placeholder} />
        <Primitive.Clear className="x-govuk-ui-combobox-button" aria-label={labels.clear}>
          <CrossIcon />
        </Primitive.Clear>
        <Primitive.Trigger className="x-govuk-ui-combobox-button" aria-label={labels.showAll}>
          <ChevronIcon size={16} />
        </Primitive.Trigger>
      </div>
      <Options query={query} emptyText={labels.empty} field={group} />
    </Primitive.Root>
  );
}

export type MultiSelectProps = Shared & {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

/**
 * Lets users choose several options from a long list by typing, such as the languages they
 * speak. Each choice becomes a chip in the field, with a button to remove it, and Backspace in an
 * empty field removes the last. The list stays open, with ticks by the choices.
 *
 * It is a bound Field with a Label, a Hint, an ErrorMessage and a MultiSelectControl. Compose
 * those parts yourself to put something between them.
 */
export function MultiSelect({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  id,
  "aria-describedby": describedBy,
  ...props
}: MultiSelectProps) {
  const generated = useId();
  return (
    <Field
      controlId={id ?? `field-${generated}`}
      name={props.name}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <Label visuallyHidden={hideLabel}>{label}</Label>
      <Hint>{hint}</Hint>
      <ErrorMessage />
      <MultiSelectControl {...props} />
    </Field>
  );
}

export type MultiSelectControlProps = Omit<MultiSelectProps, keyof FieldWords> & { id?: string };

/**
 * MultiSelect's control on its own, for a field composed from Field's parts. It is the field of
 * chips that takes typing, with its list. In a bound Field, it takes its id, name and descriptions
 * from the field, and Check your answers lists the chosen options' labels.
 */
export function MultiSelectControl(given: MultiSelectControlProps) {
  const {
    items,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    labels: ownLabels,
    name,
    disabled,
    className = "",
    ...props
  } = useControlProps(given);
  const options = useMemo(() => items.map(optionOf), [items]);
  const labels = useLabels("combobox", defaultComboboxLabels, ownLabels);
  useFieldSummary({ answer: (data) => labelsOf(options, name ? data.getAll(name) : []) });
  // A Form can give the field its answers to start with, such as ones kept from an earlier visit.
  const saved = useFormDefault(name);
  const findAll = (wanted: string[] | undefined) =>
    wanted?.flatMap((each) => options.filter((option) => option.value === each));
  const [query, setQuery] = useState("");
  const chips = useRef<HTMLDivElement>(null);
  return (
    <Primitive.Root
      multiple
      items={options}
      value={findAll(value)}
      defaultValue={findAll(saved ?? defaultValue)}
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
                    aria-label={labels.remove(option.label)}
                  >
                    <CrossIcon size={12} />
                  </Primitive.ChipRemove>
                </Primitive.Chip>
              ))}
              <Primitive.Input
                {...props}
                className="x-govuk-ui-input"
                placeholder={chosen.length ? undefined : placeholder}
              />
            </>
          )}
        </Primitive.Value>
      </Primitive.Chips>
      <Options query={query} emptyText={labels.empty} field={chips} />
    </Primitive.Root>
  );
}
