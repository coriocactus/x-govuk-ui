"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useFormDefault } from "./field";
import { Fieldset, type FieldsetProps } from "./fieldset";
import { Kbd } from "./kbd";
import { useScopeSound } from "./sound-scope";

export type ChoicesOption = { value: string; label: ReactNode; hint?: ReactNode };

export type ChoicesProps = Omit<
  FieldsetProps,
  "children" | "onChange" | "defaultValue" | "name" | "onKeyDown"
> & {
  /**
   * The name the answers submit under. Words typed for the other answer submit as `{name}-other`.
   */
  name: string;
  options: readonly ChoicesOption[];
  /** Lets people choose more than one answer. */
  multiple?: boolean;
  /** Adds a last answer that takes any words, with these words as its placeholder. */
  other?: string;
  /** What marks each answer, which is a letter, a number from 1 to 9, or nothing. */
  markers?: "letters" | "numbers" | "none";
  /**
   * Where pressing an answer's letter or number chooses it. With `page`, the default, the keys work
   * anywhere on the page while these are the only choices on show and nobody is typing, as in a
   * survey. With `form`, they work only within the choices' form. With `none`, they do not work.
   */
  shortcuts?: "page" | "form" | "none";
  /** The chosen values. Leave it out to let the answers keep track. */
  value?: string[];
  defaultValue?: string[];
  /** Called with the chosen values, and the words typed for the other answer. */
  onValueChange?: (value: string[], other: string) => void;
  disabled?: boolean;
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Places that take typing or keys of their own, where a letter is not an answer. */
const OWN_KEYS =
  'input:not([type=radio], [type=checkbox]), textarea, select, [contenteditable=""], [contenteditable="true"], [role=combobox], [role=listbox], [role=option], [role=menu], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=textbox], [role=searchbox], [role=grid], [role=tree], [role=slider], [role=spinbutton]';

/**
 * Whether a key pressed outside the choices belongs to them. It does when focus is not in other
 * choices or somewhere with keys of its own, and these are the only choices on show in their scope.
 */
function heardFrom(target: Element, own: Element, scope: HTMLElement | Document) {
  if (target.closest(".x-govuk-ui-choice-list") || target.closest(OWN_KEYS)) return false;
  // An open dialog or menu elsewhere takes the keys.
  const away = target.closest("[role=dialog], [role=alertdialog], [role=menu]");
  if (away && !away.contains(own)) return false;
  const shown = [...scope.querySelectorAll(".x-govuk-ui-choice-list")].filter(
    (group) => !group.closest("[hidden], [inert]") && group.getClientRects().length > 0,
  );
  return shown.length === 1 && shown[0] === own;
}

/** Stands for the other answer among the chosen values. */
const OTHER = "\u0000other";

/**
 * Answers to pick from, each a row with a letter or a number, for a question asked quickly, such
 * as an agent's. Pressing an answer's letter or number chooses it. Enter on a chosen answer sends
 * its form. A last answer can take any words. The answers are native radios or checkboxes in a
 * Fieldset, so they submit with a form and take part in a Form by their name. They start with any
 * answer a Form kept. For a service's own questions, use GOV.UK's Radios and Checkboxes.
 */
export function Choices({
  name,
  options,
  multiple = false,
  other,
  markers = "letters",
  shortcuts = "page",
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  id,
  className = "",
  ...fieldset
}: ChoicesProps) {
  const generated = useId();
  const groupId = id ?? `${name}-${generated}`;
  const play = useScopeSound();
  const list = useRef<HTMLDivElement>(null);
  // A Form can give the answers to start with, such as ones kept from an earlier visit.
  const saved = useFormDefault(name);
  const savedOther = useFormDefault(`${name}-other`)?.[0] ?? "";
  const [own, setOwn] = useState<string[]>(() => [
    ...(defaultValue ?? saved ?? []),
    ...(savedOther ? [OTHER] : []),
  ]);
  const [words, setWords] = useState(savedOther);
  const chosen = value ?? own.filter((each) => each !== OTHER);
  // When controlled, the other answer is chosen while it has words.
  const otherChosen = value ? words.trim() !== "" : own.includes(OTHER);

  const keyOf = (index: number) => {
    if (markers === "letters") return LETTERS[index] ?? null;
    if (markers === "numbers") return index < 9 ? String(index + 1) : null;
    return null;
  };

  const set = (next: string[], typed = words) => {
    if (value === undefined) setOwn(next);
    onValueChange?.(
      next.filter((each) => each !== OTHER),
      next.includes(OTHER) ? typed.trim() : "",
    );
  };
  const current = value ? [...value, ...(otherChosen ? [OTHER] : [])] : own;
  const choose = (item: string, on: boolean, typed = words) => {
    const rest = current.filter((each) => each !== item);
    if (multiple) set(on ? [...rest, item] : rest, typed);
    else set(on ? [item] : [], typed);
  };

  const onKeyDown = (event: globalThis.KeyboardEvent, inside: boolean) => {
    const target = event.target as HTMLElement;
    // Enter on a chosen answer sends the form, as it would from a field.
    if (
      inside &&
      event.key === "Enter" &&
      !event.metaKey &&
      !event.ctrlKey &&
      target.matches("input[type=radio], input[type=checkbox]")
    ) {
      const form = target.closest("form");
      if (!form) return;
      event.preventDefault();
      form.requestSubmit();
      return;
    }
    if (shortcuts === "none" || disabled || target.matches("input[type=text]")) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
    const pressed = event.key.toUpperCase();
    const index = options.findIndex((_, place) => keyOf(place) === pressed);
    const option = options[index];
    if (option) {
      event.preventDefault();
      const on = !(multiple && chosen.includes(option.value));
      choose(option.value, on);
      play(on ? "select" : "toggleOff");
      list.current
        ?.querySelector<HTMLElement>(`input[value="${CSS.escape(option.value)}"]`)
        ?.focus();
    } else if (other && keyOf(options.length) === pressed) {
      event.preventDefault();
      list.current?.querySelector<HTMLElement>(".x-govuk-ui-choice-list-other")?.focus();
    }
  };

  // Within the choices, the keys always work. Beyond them, across the page or the form, they work
  // while these are the only choices on show there. Focus must also not be somewhere that takes
  // typing or keys of its own, such as a field, a menu or a list.
  const handler = useRef(onKeyDown);
  handler.current = onKeyDown;
  useEffect(() => {
    const own = list.current;
    if (!own || shortcuts === "none") return;
    const scope: HTMLElement | Document =
      shortcuts === "page" ? document : (own.closest("form") ?? own);
    const listen = (event: globalThis.KeyboardEvent) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const inside = own.contains(event.target);
      if (!inside && !heardFrom(event.target, own, scope)) return;
      handler.current(event, inside);
    };
    scope.addEventListener("keydown", listen as EventListener);
    return () => scope.removeEventListener("keydown", listen as EventListener);
  }, [shortcuts]);

  const otherKey = other ? keyOf(options.length) : null;
  return (
    <Fieldset {...fieldset} id={groupId} name={name} className={className}>
      {/* The list takes focus itself when someone leaves the other answer's field with Escape,
          so the letters and numbers choose again. */}
      <div ref={list} className="x-govuk-ui-choice-list" data-markers={markers} tabIndex={-1}>
        {options.map((option, index) => {
          const on = chosen.includes(option.value);
          const key = keyOf(index);
          return (
            <label
              key={option.value}
              className="x-govuk-ui-choice-list-item"
              data-checked={on || undefined}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                // The first answer has the group's id, so an error summary links to it.
                id={index === 0 ? groupId : `${groupId}-${index + 1}`}
                name={name}
                value={option.value}
                checked={on}
                disabled={disabled}
                aria-keyshortcuts={(shortcuts !== "none" && key) || undefined}
                onChange={(event) => choose(option.value, event.target.checked)}
              />
              {markers !== "none" && (
                <Kbd aria-hidden="true" className="x-govuk-ui-choice-list-key">
                  {key ?? ""}
                </Kbd>
              )}
              <span className="x-govuk-ui-choice-list-label">
                {option.label}
                {option.hint && <span className="x-govuk-ui-choice-list-hint">{option.hint}</span>}
              </span>
            </label>
          );
        })}
        {other && (
          <div
            className="x-govuk-ui-choice-list-item"
            data-other=""
            data-checked={otherChosen || undefined}
          >
            {markers !== "none" && (
              <Kbd aria-hidden="true" className="x-govuk-ui-choice-list-key">
                {otherKey ?? ""}
              </Kbd>
            )}
            {/* Typing an answer chooses it, and emptying the field lets it go again. Its words
                are only sent while it is chosen. */}
            <input
              type="text"
              className="x-govuk-ui-choice-list-other"
              name={otherChosen ? `${name}-other` : undefined}
              aria-label={other}
              aria-keyshortcuts={(shortcuts !== "none" && otherKey) || undefined}
              placeholder={other}
              autoComplete="off"
              disabled={disabled}
              value={words}
              onKeyDown={(event) => {
                // Escape leaves the field, so the keys choose again. A second Escape goes to
                // whatever contains the choices, such as a dialog.
                if (event.key !== "Escape") return;
                event.preventDefault();
                event.stopPropagation();
                list.current?.focus();
              }}
              onChange={(event) => {
                const typed = event.target.value;
                setWords(typed);
                choose(OTHER, typed.trim() !== "", typed);
              }}
            />
          </div>
        )}
      </div>
    </Fieldset>
  );
}

/** Choices marked A, B, C, each chosen by pressing its letter. */
export function LetteredChoices(props: Omit<ChoicesProps, "markers">) {
  return <Choices {...props} markers="letters" />;
}

/** Choices marked 1, 2, 3, each chosen by pressing its number, for up to nine answers. */
export function NumberedChoices(props: Omit<ChoicesProps, "markers">) {
  return <Choices {...props} markers="numbers" />;
}
