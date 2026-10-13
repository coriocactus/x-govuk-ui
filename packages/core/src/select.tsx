"use client";

import { Select as Primitive } from "@base-ui/react/select";
import {
  Children,
  type ComponentPropsWithRef,
  type CSSProperties,
  createContext,
  isValidElement,
  type ReactNode,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useControllableState } from "./controllable-state";
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
import { ChevronIcon, TickIcon } from "./icons";
import { useMergedRef } from "./refs";
import { ScrollArea } from "./scroll-area";

/** A list with more options than this opens beneath the field, as a long list must. */
const SHORT_LIST = 8;

export type SelectProps = Omit<
  ComponentPropsWithRef<"button">,
  "value" | "defaultValue" | "onValueChange" | "name" | "disabled" | "id"
> & {
  label: ReactNode;
  hint?: ReactNode;
  /** Hides the label visually. Screen readers still announce it. */
  hideLabel?: boolean;
  errorMessage?: ReactNode;
  /** The chosen value. Leave it out to let the select keep track. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Shown while nothing is chosen. */
  placeholder?: ReactNode;
  /** The name the value submits under in a form. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** `small` suits dense layouts, such as a settings panel. */
  size?: "medium" | "small";
  id?: string;
  /** The choices, as `SelectItem` parts. */
  children: ReactNode;
  /** Classes for the button that opens the list. */
  className?: string;
};

/**
 * The value whose option shows the tick. It is read as the list opens and kept until it has closed,
 * so choosing an option does not move the tick while the list fades away.
 */
const TickContext = createContext<string | null>(null);

/** Where an item that a Select collects tells it the item's label. */
type Registry = {
  set: (value: string, label: ReactNode) => void;
  /** Removes the item's label, unless another item has given its value a label since. */
  delete: (value: string, label: ReactNode) => void;
};

const LabelRegistry = createContext<Registry | null>(null);

/**
 * The labels of items that the Select cannot read from its children, such as items in a wrapper
 * of your own. Once the page has loaded, `CollectLabels` renders the children again, in an element
 * outside the page. There, each item reports its label and renders nothing. The page's first HTML
 * therefore shows such an item's value, until the labels arrive before the browser first draws the
 * page. A label that changes renders the Select again.
 */
function useItemLabels() {
  const [labels, setLabels] = useState<Readonly<Record<string, ReactNode>>>({});
  const registry = useMemo<Registry>(
    () => ({
      set: (value, label) =>
        setLabels((all) =>
          value in all && all[value] === label ? all : { ...all, [value]: label },
        ),
      delete: (value, label) =>
        setLabels((all) => {
          if (!(value in all) || all[value] !== label) return all;
          const { [value]: _gone, ...rest } = all;
          return rest;
        }),
    }),
    [],
  );
  return { labels, registry };
}

/**
 * Whether any child might hold items that the Select cannot read, such as a wrapper of your own.
 * Only then are the children rendered a second time to collect their labels.
 */
function hasWrappedItems(children: ReactNode) {
  return Children.toArray(children).some(
    (child) => isValidElement(child) && child.type !== SelectItem,
  );
}

/**
 * Renders a Select's items again, outside the page, so each reports its label. The element is made
 * as the page first loads, before it is drawn, so the labels are there before the first paint.
 */
function CollectLabels({ registry, children }: { registry: Registry; children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setHost(document.createElement("div")), []);
  if (!host) return null;
  return createPortal(<LabelRegistry value={registry}>{children}</LabelRegistry>, host);
}

/** An item that a Select collects for its label. It renders nothing. */
function CollectedItem({ value, label }: { value: string; label: ReactNode }) {
  const registry = useContext(LabelRegistry);
  useLayoutEffect(() => {
    if (!registry) return;
    registry.set(value, label);
    return () => registry.delete(value, label);
  }, [registry, value, label]);
  return null;
}

/**
 * The label of each item that is a direct child, read as the Select renders, so it is in the first
 * HTML.
 */
function labelsOf(children: ReactNode) {
  const labels: Record<string, ReactNode> = {};
  Children.forEach(children, (child) => {
    if (isValidElement<SelectItemProps>(child) && child.type === SelectItem)
      labels[child.props.value] = child.props.children;
  });
  return labels;
}

/**
 * The highlight that slides to the option under the pointer or the keys, in the list that scrolls.
 */
function followHighlight(list: HTMLElement | null) {
  return trackHighlight(list, {
    indicator: ".x-govuk-ui-select-highlight",
    item: ".x-govuk-ui-select-item[data-highlighted]",
  });
}

/**
 * A long list opens with the chosen option in the middle, so the options either side show, and
 * its highlight slides between them.
 */
function centreChosen(viewport: HTMLDivElement | null) {
  if (!viewport) return;
  const highlight = followHighlight(viewport);
  const frame = requestAnimationFrame(() => {
    const chosen = viewport.querySelector<HTMLElement>(".x-govuk-ui-select-item[data-selected]");
    if (!chosen) return;
    viewport.scrollTop = chosen.offsetTop - (viewport.clientHeight - chosen.offsetHeight) / 2;
  });
  return () => {
    cancelAnimationFrame(frame);
    highlight?.();
  };
}

/**
 * Lets users choose one option from a list. Base UI provides the behaviour, including keyboard
 * movement and type-ahead. A short list opens with the chosen option over the field, as a native
 * select does on a Mac. A long list, such as of years, opens beneath the field instead, at most 320
 * pixels tall, with the chosen option in the middle. It scrolls in a Scroll area, as Combobox's
 * options do. Compose it from `SelectItem` parts. GOV.UK advises Radios for fewer than about eight
 * choices.
 */
export function Select({
  label,
  hint,
  hideLabel = false,
  errorMessage,
  id,
  "aria-describedby": describedBy,
  ...props
}: SelectProps) {
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
      <SelectControl {...props} />
    </Field>
  );
}

export type SelectControlProps = Omit<SelectProps, "label" | "hint" | "hideLabel" | "errorMessage">;

/**
 * Select's control on its own, for a field composed from Field's parts. It is the button that shows
 * the choice, with its list. In a bound Field, it takes its id, name and descriptions from the
 * field.
 */
export function SelectControl(given: SelectControlProps) {
  const {
    value,
    defaultValue: givenDefault,
    onValueChange,
    placeholder,
    name,
    required,
    disabled = false,
    size = "medium",
    children,
    className = "",
    ref,
    ...props
  } = useControlProps(given);
  // A Form can give the field an answer to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(name)?.[0];
  const defaultValue = givenDefault === undefined ? saved : givenDefault;
  const registered = useItemLabels();
  const labels = { ...registered.labels, ...labelsOf(children) };
  // Check your answers shows the chosen option's label, not its value.
  useFieldSummary({
    answer: (data) => {
      const chosen = name ? data.get(name) : null;
      return typeof chosen === "string" && chosen ? (labels[chosen] ?? chosen) : undefined;
    },
  });
  const long = Object.keys(labels).length > SHORT_LIST;
  const list = <Primitive.List className="x-govuk-ui-select-list">{children}</Primitive.List>;
  // An uncontrolled select keeps its own value, so the tick can be read from it as the list opens.
  const [current, choose] = useControllableState<string | null>(
    value,
    defaultValue ?? null,
    (next) => next !== null && onValueChange?.(next),
  );
  const [ticked, setTicked] = useState(current);
  // The list is at least as wide as the field. Its width is read from the field's own layout as it
  // opens. Base UI's --anchor-width is not used, because it follows the field on screen. Inside a
  // calendar that shrinks away as it closes, it would resize the list every frame, and the browser
  // would report a loop of resize observers.
  const trigger = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState<number>();

  const mergedRef = useMergedRef(trigger, ref);
  return (
    <Primitive.Root
      items={labels}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (next !== null) choose(next as string);
      }}
      onOpenChange={(open) => {
        if (!open) return;
        setTicked(current);
        setWidth(trigger.current?.offsetWidth);
      }}
      name={name}
      required={required}
      disabled={disabled}
    >
      <Primitive.Trigger
        {...props}
        ref={mergedRef}
        className={`x-govuk-ui-input x-govuk-ui-select-trigger ${className}`.trim()}
        data-size={size}
      >
        <Primitive.Value className="x-govuk-ui-select-value" placeholder={placeholder} />
        <Primitive.Icon className="x-govuk-ui-select-icon">
          <ChevronIcon size={16} />
        </Primitive.Icon>
      </Primitive.Trigger>
      {hasWrappedItems(children) && (
        <CollectLabels registry={registered.registry}>{children}</CollectLabels>
      )}
      <Primitive.Portal>
        <Primitive.Positioner
          className="x-govuk-ui-select-positioner"
          sideOffset={6}
          alignItemWithTrigger={!long}
        >
          <Primitive.Popup
            // A short list scrolls in the popup itself, where its highlight slides. A long list's
            // highlight is in its Scroll area.
            ref={long ? undefined : followHighlight}
            className="x-govuk-ui-select-popup"
            data-size={size}
            data-long={long || undefined}
            style={
              width ? ({ "--x-govuk-ui-select-width": `${width}px` } as CSSProperties) : undefined
            }
          >
            <TickContext value={ticked}>
              {long ? (
                <ScrollArea viewportRef={centreChosen} className="x-govuk-ui-select-scroll" fade>
                  <span className="x-govuk-ui-select-highlight" aria-hidden="true" />
                  {list}
                </ScrollArea>
              ) : (
                <>
                  <span className="x-govuk-ui-select-highlight" aria-hidden="true" />
                  {list}
                </>
              )}
            </TickContext>
          </Primitive.Popup>
        </Primitive.Positioner>
      </Primitive.Portal>
    </Primitive.Root>
  );
}

export type SelectItemProps = ComponentPropsWithRef<"div"> & {
  value: string;
  children: ReactNode;
  disabled?: boolean;
};

/**
 * One option in a Select. The chosen option shows a tick. Screen readers hear the choice from the
 * option's selected state, so the tick is only decoration.
 *
 * It can sit in a wrapper of your own. The Select shows the chosen option's label while its list is
 * closed, before Base UI has rendered the list. To find the label of an option in a wrapper, the
 * Select renders its children once more, outside the page, once the page has loaded. A wrapper
 * therefore renders twice, so it must only render. Fetch the options outside the Select, not in
 * the wrapper.
 */
export function SelectItem(props: SelectItemProps) {
  const registry = useContext(LabelRegistry);
  if (registry) return <CollectedItem value={props.value} label={props.children} />;
  return <ListedItem {...props} />;
}

function ListedItem({ value, children, disabled, className = "", ...props }: SelectItemProps) {
  const ticked = useContext(TickContext) === value;
  return (
    <Primitive.Item
      {...props}
      value={value}
      disabled={disabled}
      className={`x-govuk-ui-select-item ${className}`.trim()}
    >
      <Primitive.ItemText className="x-govuk-ui-select-item-text">{children}</Primitive.ItemText>
      {ticked && (
        <span className="x-govuk-ui-select-check">
          <TickIcon />
        </span>
      )}
    </Primitive.Item>
  );
}
