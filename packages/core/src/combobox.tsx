"use client";

import { Combobox as Primitive } from "@base-ui/react/combobox";
import {
  type ComponentPropsWithRef,
  type ReactNode,
  type RefObject,
  useCallback,
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

export type ComboboxOption = {
  value: string;
  label: string;
  /** A line beneath the label in the list, such as a code or a place. */
  description?: string;
};
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
  /**
   * Whether an option matches what users type, as CommandMenu's `filter` is given the search
   * first. By default, its label contains the text. Give null where `items` are already the
   * matches, such as options a server found for the text, so the field shows them all. Give the
   * same array while the results stay the same, because Base UI puts the chosen option's label back
   * in the input as `items` change before users type. The field keeps each option it has shown, so
   * a chosen option stays chosen when new results leave it out.
   */
  filter?: ((search: string, option: ComboboxOption) => boolean) | null;
  /**
   * The text in the input. Leave it out to let the field keep track. Combobox's then starts with
   * the chosen option's label, and MultiSelect's empty.
   */
  inputValue?: string;
  /**
   * The text an uncontrolled field starts with. By default, Combobox's chosen option's label, or
   * nothing in MultiSelect.
   */
  defaultInputValue?: string;
  /** Called as the text changes, such as to ask a server for options that match it. */
  onInputValueChange?: (inputValue: string) => void;
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

/** The labels of the options sent, for Check your answers, from each option the field has shown. */
function labelsOf(known: Map<string, ComboboxOption>, sent: FormDataEntryValue[]) {
  return sent
    .filter((value): value is string => typeof value === "string" && value !== "")
    .map((value) => known.get(value)?.label ?? value);
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
  // A stable ref, which React does not attach again as the text changes, so the field is measured
  // once as the list opens, not again for each key.
  const measure = useCallback(
    (popup: HTMLDivElement | null) => {
      if (!popup) return;
      const width = field.current?.offsetWidth;
      if (width) popup.style.setProperty("--x-govuk-ui-combobox-width", `${width}px`);
    },
    [field],
  );
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        className="x-govuk-ui-floating-positioner"
        sideOffset={6}
        anchor={field}
      >
        <Primitive.Popup ref={measure} className="x-govuk-ui-floating x-govuk-ui-combobox-popup">
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
                    {option.description && (
                      <span className="x-govuk-ui-combobox-description">{option.description}</span>
                    )}
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
  /**
   * The chosen option's value. Leave it out to let the field keep track. The option must be among
   * `items` at least once, such as at first, so the field knows its label.
   */
  value?: string | null;
  /** The value an uncontrolled field starts with, of an option among the first `items`. */
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
};

/**
 * A field that suggests options as users type, as GOV.UK's accessible autocomplete does, for a
 * long list such as countries. The part of each option that matches is bold. One highlight glides
 * between the options. The arrow keys and Enter choose one. Base UI provides the behaviour.
 *
 * It is a bound Field with a Label, a Hint, an ErrorMessage and a ComboboxControl. Compose those
 * parts yourself to put something between them. Its props go to the control, which puts its
 * `className` and `style` on its box and every other prop on its input.
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

/** How Base UI reads an option, by its label and its value, in both controls. */
const optionKeys = {
  itemToStringLabel: (option: ComboboxOption) => option.label,
  itemToStringValue: (option: ComboboxOption) => option.value,
  isItemEqualToValue: (item: ComboboxOption, chosen: ComboboxOption) => item.value === chosen.value,
};

/**
 * Every option the field has been given, each by its value. A chosen option stays chosen when
 * `items` change and leave it out, such as when a server's results for a new search come. An
 * option given again as a new object with the same label is kept as the object first given,
 * because Base UI takes a chosen option of a new identity as a new choice, and puts its label in
 * the input over what users are typing. The kept object gives only the label, so a description
 * that differs makes no new choice.
 */
function useKnownOptions(options: readonly ComboboxOption[]) {
  const [known] = useState(() => new Map<string, ComboboxOption>());
  for (const option of options) {
    const kept = known.get(option.value);
    if (kept?.label !== option.label) known.set(option.value, option);
  }
  return known;
}

/**
 * What the field passes to Base UI about the search, and the text to show in bold in each option.
 * Base UI starts the input with the chosen option's label only when it is given neither text, so
 * each is passed only when a service gives it. The text users type is followed alongside.
 */
function useSearch(
  inputValue: string | undefined,
  defaultInputValue: string | undefined,
  onInputValueChange: ((inputValue: string) => void) | undefined,
  filter: ControlShared["filter"],
) {
  const [typed, setTyped] = useState(inputValue ?? defaultInputValue ?? "");
  return {
    query: inputValue ?? typed,
    root: {
      ...(inputValue !== undefined && { inputValue }),
      ...(defaultInputValue !== undefined && { defaultInputValue }),
      onInputValueChange: (next: string) => {
        setTyped(next);
        onInputValueChange?.(next);
      },
      ...(filter !== undefined && {
        filter: filter && ((option: ComboboxOption, text: string) => filter(text, option)),
      }),
    },
  };
}

export type ComboboxControlProps = Omit<ComboboxProps, keyof FieldWords> & { id?: string };

/**
 * Combobox's control on its own, for a field composed from Field's parts. It is the field that
 * takes typing, with its buttons and its list. In a bound Field, it takes its id, name and
 * descriptions from the field, and Check your answers shows its option's label. Its `className`
 * and `style` go on the box around the input and its buttons. Every other prop, including `ref`,
 * goes on the input, which takes focus.
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
    filter,
    inputValue,
    defaultInputValue,
    onInputValueChange,
    className = "",
    style,
    ...props
  } = useControlProps(given);
  const options = useMemo(() => items.map(optionOf), [items]);
  const labels = useLabels("combobox", defaultComboboxLabels, ownLabels);
  const known = useKnownOptions(options);
  useFieldSummary({ answer: (data) => labelsOf(known, name ? data.getAll(name) : []) });
  // A Form can give the field an answer to start with, such as one kept from an earlier visit. A
  // kept answer with nothing in it means that nothing was chosen.
  const saved = useFormDefault(name);
  const find = (wanted: string | null | undefined) =>
    wanted == null ? wanted : (known.get(wanted) ?? null);
  const search = useSearch(inputValue, defaultInputValue, onInputValueChange, filter);
  const group = useRef<HTMLDivElement>(null);
  return (
    <Primitive.Root
      items={options}
      value={find(value)}
      defaultValue={find(saved ? (saved[0] ?? null) : defaultValue)}
      onValueChange={(next) => onValueChange?.((next as ComboboxOption | null)?.value ?? null)}
      {...search.root}
      {...optionKeys}
      name={name}
      disabled={disabled}
    >
      <div
        ref={group}
        className={`x-govuk-ui-input-group x-govuk-ui-combobox-field ${className}`.trim()}
        style={style}
      >
        <Primitive.Input {...props} className="x-govuk-ui-input" placeholder={placeholder} />
        <Primitive.Clear className="x-govuk-ui-combobox-button" aria-label={labels.clear}>
          <CrossIcon />
        </Primitive.Clear>
        <Primitive.Trigger className="x-govuk-ui-combobox-button" aria-label={labels.showAll}>
          <ChevronIcon size={16} />
        </Primitive.Trigger>
      </div>
      <Options query={search.query} emptyText={labels.empty} field={group} />
    </Primitive.Root>
  );
}

export type MultiSelectProps = Shared & {
  /**
   * The chosen options' values. Leave it out to let the field keep track. Each option must be
   * among `items` at least once, such as at first, so the field knows its label.
   */
  value?: string[];
  /** The values an uncontrolled field starts with, of options among the first `items`. */
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

/**
 * Lets users choose several options from a long list by typing, such as the languages they
 * speak. Each choice becomes a chip in the field, with a button to remove it, and Backspace in an
 * empty field removes the last. The list stays open, with ticks by the choices.
 *
 * It is a bound Field with a Label, a Hint, an ErrorMessage and a MultiSelectControl. Compose
 * those parts yourself to put something between them. Its props go to the control, which puts its
 * `className` and `style` on its box of chips and every other prop on its input.
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
 * from the field, and Check your answers lists the chosen options' labels. Its `className` and
 * `style` go on the box of chips. Every other prop, including `ref`, goes on the input, which
 * takes focus.
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
    filter,
    inputValue,
    defaultInputValue,
    onInputValueChange,
    className = "",
    style,
    ...props
  } = useControlProps(given);
  const options = useMemo(() => items.map(optionOf), [items]);
  const labels = useLabels("combobox", defaultComboboxLabels, ownLabels);
  const known = useKnownOptions(options);
  useFieldSummary({ answer: (data) => labelsOf(known, name ? data.getAll(name) : []) });
  // A Form can give the field its answers to start with, such as ones kept from an earlier visit.
  const saved = useFormDefault(name);
  const findAll = (wanted: string[] | undefined) =>
    wanted?.flatMap((each) => known.get(each) ?? []);
  const search = useSearch(inputValue, defaultInputValue, onInputValueChange, filter);
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
      {...search.root}
      {...optionKeys}
      name={name}
      disabled={disabled}
    >
      <Primitive.Chips
        ref={chips}
        className={`x-govuk-ui-input-group x-govuk-ui-multi-select-field ${className}`.trim()}
        style={style}
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
      <Options query={search.query} emptyText={labels.empty} field={chips} />
    </Primitive.Root>
  );
}
