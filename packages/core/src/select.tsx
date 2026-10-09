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
  useRef,
  useState,
} from "react";
import { ErrorMessage, Field, Hint, Label, useField, useFormDefault } from "./field";
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
  errorMessage?: string;
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
  /** Classes for the field. */
  className?: string;
};

/**
 * The value whose option shows the tick. It is read as the list opens and kept until it has closed,
 * so choosing an option does not move the tick while the list fades away.
 */
const TickContext = createContext<string | null>(null);

/** The label of each item, so the chosen one shows in the field. */
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
  value,
  defaultValue: given,
  onValueChange,
  placeholder,
  name,
  required,
  disabled = false,
  size = "medium",
  id,
  children,
  className = "",
  ref,
  ...props
}: SelectProps) {
  const field = useField({ id, name, hint, errorMessage });
  // A Form can give the field an answer to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(name)?.[0];
  const defaultValue = given === undefined ? saved : given;
  const labels = labelsOf(children);
  const long = Object.keys(labels).length > SHORT_LIST;
  const list = <Primitive.List className="x-govuk-ui-select-list">{children}</Primitive.List>;
  // An uncontrolled select keeps its own value, so the tick can be read from it as the list opens.
  const [own, setOwn] = useState(defaultValue ?? null);
  const current = value === undefined ? own : value;
  const [ticked, setTicked] = useState(current);
  // The list is at least as wide as the field. Its width is read from the field's own layout as it
  // opens. Base UI's --anchor-width is not used, because it follows the field on screen. Inside a
  // calendar that shrinks away as it closes, it would resize the list every frame, and the browser
  // would report a loop of resize observers.
  const trigger = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState<number>();
  const choose = (next: string) => {
    setOwn(next);
    onValueChange?.(next);
  };

  const mergedRef = useMergedRef(trigger, ref);
  return (
    <Field invalid={field.invalid}>
      <Label htmlFor={field.id} visuallyHidden={hideLabel}>
        {label}
      </Label>
      <Hint id={field.hintId}>{hint}</Hint>
      <ErrorMessage id={field.errorId}>{field.errorMessage}</ErrorMessage>
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
          {...field.controlProps}
          className={`x-govuk-ui-input x-govuk-ui-select-trigger ${className}`.trim()}
          data-size={size}
        >
          <Primitive.Value className="x-govuk-ui-select-value" placeholder={placeholder} />
          <Primitive.Icon className="x-govuk-ui-select-icon">
            <ChevronIcon size={16} />
          </Primitive.Icon>
        </Primitive.Trigger>
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
    </Field>
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
 */
export function SelectItem({
  value,
  children,
  disabled,
  className = "",
  ...props
}: SelectItemProps) {
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
