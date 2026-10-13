"use client";

import { animate } from "motion/react";
import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  isValidElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useControllableState } from "./controllable-state";
import {
  ErrorMessage,
  Field,
  type FieldProps,
  Hint,
  present,
  ShownContext,
  useFormDefault,
} from "./field";
import { FieldsetLegend, type FieldsetProps, FieldsetRoot } from "./fieldset";
import { duration, useMotionTiming } from "./motion";
import { useMergedRef } from "./refs";

/** The dot's jump eases in and out, so it lifts off gently and lands softly. */
const jump = [0.33, 0, 0.25, 1] as const;

/*
 * Radios and Checkboxes share one implementation. Each is a Fieldset of native inputs, so they
 * submit with a form. As in GOV.UK Frontend, the first item's id is the group's id and later items
 * add `-2`, `-3` and so on, so an error summary can link to the group.
 *
 * Both are built from parts, which compose a group of your own:
 *
 * - A root, RadiosRoot or CheckboxesRoot, keeps the group's state and binds its Field to the group's
 *   id.
 * - A ChoiceList holds the answers, and Radios' dot travels between them.
 * - An answer is a ChoiceRoot with its ChoiceControl, ChoiceLabel and ChoiceHint, and a
 *   ChoiceConditional after it for its follow-up question.
 *
 * Each part finds its group through context, so an answer can sit inside a wrapper of your own.
 * The shorthands number their direct children, as GOV.UK does, in the first HTML. An answer they
 * cannot number takes an id of its own, never the first answer's.
 */

type Kind = "checkbox" | "radio";

type Group = {
  kind: Kind;
  name: string;
  /** The group's id, which the first answer takes. */
  idPrefix: string;
  /** The chosen radio's value, which the travelling dot follows. */
  chosen: string | null;
  isChecked: (value: string) => boolean;
  choose: (value: string, checked: boolean, exclusive: boolean) => void;
  registerExclusive: (value: string) => () => void;
  /** Tells the group each answer's control, so it can link its errors to the first one. */
  registerControl: (control: HTMLInputElement | null, id: string) => void;
  /** Each answer's label, by its value, for Check your answers. */
  labels: Map<string, ReactNode>;
  disabled: boolean;
};

const GroupContext = createContext<Group | null>(null);
/** An answer's place among its shorthand's direct children, or null when it was not numbered. */
const ItemIndex = createContext<number | null>(null);

function useGroup() {
  const group = useContext(GroupContext);
  if (!group)
    throw new Error(
      "An answer must be inside Radios or Checkboxes, or a RadiosRoot or a CheckboxesRoot.",
    );
  return group;
}

/** What an answer's parts share, from its `ChoiceRoot`. */
type Answer = {
  controlId: string;
  value: string;
  disabled?: boolean;
  exclusive: boolean;
  hintId?: string;
  conditionalId?: string;
};

const AnswerContext = createContext<Answer | null>(null);

function useAnswer() {
  const answer = useContext(AnswerContext);
  if (!answer) throw new Error("An answer's control, label and hint must be inside a ChoiceRoot.");
  return answer;
}

/** A list's answers' boxes, by value, which the radios' dot lands on. */
type List = { register: (value: string, box: HTMLElement | null) => void };

const ListContext = createContext<List | null>(null);

/**
 * The group's answers, as Check your answers shows them, which are the chosen answers' labels.
 */
function useGroupAnswer(name: string) {
  const [labels] = useState(() => new Map<string, ReactNode>());
  const answer = useCallback(
    (data: FormData) =>
      data.getAll(name).map((value) => labels.get(String(value)) ?? String(value)),
    [labels, name],
  );
  return { labels, answer };
}

/**
 * Where a group's errors link to. It is the group's id, unless no answer has it, as when every
 * answer sits in a wrapper of your own. It is then the first answer's id, in the page's order.
 */
function useLinkTarget(groupId: string) {
  const controls = useRef(new Map<HTMLInputElement, string>());
  const [first, setFirst] = useState<string | undefined>(undefined);
  const [changes, setChanges] = useState(0);
  const registerControl = useCallback((control: HTMLInputElement | null, id: string) => {
    if (!control) return;
    controls.current.set(control, id);
    setChanges((count) => count + 1);
    return () => {
      controls.current.delete(control);
      setChanges((count) => count + 1);
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The order is read again as answers come and go.
  useLayoutEffect(() => {
    const all = [...controls.current];
    if (all.some(([, id]) => id === groupId)) return setFirst(undefined);
    all.sort(([a], [b]) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    setFirst(all[0]?.[1]);
  }, [changes, groupId]);
  return { linkTo: first, registerControl };
}

type GroupProps = Omit<FieldsetProps, "children" | "onChange" | "defaultValue"> & {
  children: ReactNode;
  /** The name each input submits under. */
  name: string;
  /** `small` suits dense layouts, such as filters. */
  size?: "medium" | "small";
  disabled?: boolean;
};

/** Gives each item its position, so its id follows the group's. Dividers are not counted. */
function numberItems(children: ReactNode, Item: unknown) {
  let index = 0;
  return Children.map(children, (child) =>
    isValidElement(child) && child.type === Item ? (
      <ItemIndex value={index++}>{child}</ItemIndex>
    ) : (
      child
    ),
  );
}

/** The group's legend, hint, error and list, as Radios and Checkboxes draw them. */
function GroupFieldset({
  legend,
  legendSize,
  pageHeading,
  hint,
  inline,
  size,
  children,
  Item,
  ...fieldset
}: Omit<GroupProps, "name" | "disabled" | "id" | "errorMessage"> & {
  inline?: boolean;
  Item: unknown;
}) {
  return (
    <FieldsetRoot {...fieldset}>
      <FieldsetLegend size={legendSize} pageHeading={pageHeading}>
        {legend}
      </FieldsetLegend>
      <Hint>{hint}</Hint>
      <ErrorMessage />
      <ChoiceList inline={inline} size={size}>
        {numberItems(children, Item)}
      </ChoiceList>
    </FieldsetRoot>
  );
}

type RootProps = Omit<FieldProps, "controlId" | "name" | "onChange" | "defaultValue"> & {
  /**
   * The group's id, which the first answer takes. Its hint is `{controlId}-hint` and its error
   * `{controlId}-error`, and a Form's error summary links to it.
   */
  controlId: string;
  /** The name each answer submits under. In a Form, the group finds its error by it. */
  name: string;
  disabled?: boolean;
};

export type RadiosRootProps = RootProps & {
  /** The chosen value. Leave it out to let the group keep track. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
};

const noExclusive = () => () => {};

/**
 * Radios of your own. It keeps the chosen answer and binds its Field to the group's id. Put a
 * `FieldsetRoot` in it, with a `FieldsetLegend`, a `Hint`, an `ErrorMessage` and a `ChoiceList` of
 * answers, and anything else between them.
 */
export function RadiosRoot({
  controlId,
  name,
  value: controlled,
  defaultValue,
  onValueChange,
  disabled = false,
  linkTo,
  children,
  ...field
}: RadiosRootProps) {
  // A Form can give the group an answer to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(name)?.[0];
  const [value, setValue] = useControllableState<string | null>(
    controlled,
    () => (defaultValue === undefined ? (saved ?? null) : defaultValue),
    (next) => next !== null && onValueChange?.(next),
  );
  const target = useLinkTarget(controlId);
  const summary = useGroupAnswer(name);
  const group: Group = {
    kind: "radio",
    name,
    idPrefix: controlId,
    chosen: value,
    disabled,
    isChecked: (item) => value === item,
    choose: (item) => setValue(item),
    registerExclusive: noExclusive,
    registerControl: target.registerControl,
    labels: summary.labels,
  };
  return (
    <Field
      answer={summary.answer}
      {...field}
      controlId={controlId}
      name={name}
      linkTo={linkTo ?? target.linkTo}
    >
      <GroupContext value={group}>{children}</GroupContext>
    </Field>
  );
}

export type CheckboxesRootProps = RootProps & {
  /** The checked values. Leave it out to let the group keep track. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

/**
 * Checkboxes of your own. It keeps the checked answers and binds its Field to the group's id.
 * Compose it as `RadiosRoot`.
 */
export function CheckboxesRoot({
  controlId,
  name,
  value: controlled,
  defaultValue,
  onValueChange,
  disabled = false,
  linkTo,
  children,
  ...field
}: CheckboxesRootProps) {
  // A Form can give the group its answers to start with, such as ones kept from an earlier visit.
  const saved = useFormDefault(name);
  const [value, set] = useControllableState(
    controlled,
    () => defaultValue ?? saved ?? [],
    onValueChange,
  );
  const exclusive = useRef(new Set<string>());
  const registerExclusive = useCallback((item: string) => {
    exclusive.current.add(item);
    return () => void exclusive.current.delete(item);
  }, []);
  const target = useLinkTarget(controlId);
  const summary = useGroupAnswer(name);
  const group: Group = {
    kind: "checkbox",
    name,
    idPrefix: controlId,
    chosen: null,
    disabled,
    isChecked: (item) => value.includes(item),
    // An exclusive answer, such as "None of these", clears the others, and they clear it.
    choose: (item, checked, isExclusive) => {
      if (!checked) return set(value.filter((each) => each !== item));
      if (isExclusive) return set([item]);
      set([...value.filter((each) => !exclusive.current.has(each)), item]);
    },
    registerExclusive,
    registerControl: target.registerControl,
    labels: summary.labels,
  };
  return (
    <Field
      answer={summary.answer}
      {...field}
      controlId={controlId}
      name={name}
      linkTo={linkTo ?? target.linkTo}
    >
      <GroupContext value={group}>{children}</GroupContext>
    </Field>
  );
}

export type ChoiceListProps = ComponentPropsWithRef<"div"> & {
  /** Sets short answers side by side, such as Yes and No. */
  inline?: boolean;
  /** `small` suits dense layouts, such as filters. */
  size?: "medium" | "small";
};

/**
 * A group's list of answers. Put each `ChoiceRoot` in it, with its `ChoiceConditional` after it,
 * and a `ChoiceDivider` where one goes. In Radios, the dot travels between its answers.
 */
export function ChoiceList({
  inline = false,
  size = "medium",
  className = "",
  children,
  ref,
  ...props
}: ChoiceListProps) {
  const group = useGroup();
  const container = useRef<HTMLDivElement>(null);
  const boxes = useRef(new Map<string, HTMLElement>());
  const [list] = useState<List>(() => ({
    register: (value, box) => {
      if (box) boxes.current.set(value, box);
      else boxes.current.delete(value);
    },
  }));
  const mergedRef = useMergedRef(container, ref);
  return (
    <div
      {...props}
      ref={mergedRef}
      className={`x-govuk-ui-choices ${className}`.trim()}
      data-kind={group.kind}
      data-inline={inline || undefined}
      data-size={size === "small" ? "small" : undefined}
    >
      <ListContext value={list}>{children}</ListContext>
      {group.kind === "radio" && (
        <TravellingDot container={container} boxes={boxes} chosen={group.chosen} />
      )}
    </div>
  );
}

/**
 * One dot for the whole group. It jumps to the chosen radio along one smooth curve, which bulges
 * left down a list and upwards along a row. The dot grows slightly at the top of the jump. It
 * measures its landing place on every frame, so it lands accurately even while a follow-up
 * question opens or closes. It keeps following its radio when the layout moves.
 */
function TravellingDot({
  container,
  boxes,
  chosen,
}: {
  container: RefObject<HTMLDivElement | null>;
  boxes: RefObject<Map<string, HTMLElement>>;
  chosen: string | null;
}) {
  const dot = useRef<HTMLSpanElement>(null);
  const timing = useMotionTiming();
  const at = useRef<{ x: number; y: number } | null>(null);
  const flight = useRef<ReturnType<typeof animate> | null>(null);
  const mounting = useRef(true);

  const measure = useCallback(() => {
    // The dot's own parent is the group. A group that mounts with an answer already chosen measures
    // before the group's ref is attached, but the dot's own ref is already in place. The box is the
    // chosen answer's, among those in this list, never one in a follow-up question's own radios.
    const group = dot.current?.parentElement ?? container.current;
    const box = chosen === null ? null : boxes.current.get(chosen);
    if (!group || !box) return null;
    const outer = group.getBoundingClientRect();
    const inner = box.getBoundingClientRect();
    return { x: inner.left - outer.left, y: inner.top - outer.top };
  }, [container, boxes, chosen]);

  const place = useCallback((x: number, y: number, scale = 1) => {
    if (dot.current) dot.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: The dot moves when the choice changes.
  useLayoutEffect(() => {
    const element = dot.current;
    if (!element) return;
    flight.current?.stop();
    const from = at.current;
    const to = measure();
    // A group that opens with an answer already chosen shows its dot at once, without the dot
    // growing in. This happens when a question opens again so its answer can change.
    const opening = mounting.current;
    mounting.current = false;
    if (!to) {
      at.current = null;
      delete element.dataset.shown;
      return;
    }
    // The first choice appears in place. Later choices jump. A dot already where it belongs stays
    // still, such as when React runs the effect again for the same choice.
    const still = from && Math.hypot(to.x - from.x, to.y - from.y) < 0.5;
    if (!from || still || timing.reduced) {
      at.current = to;
      place(to.x, to.y);
      if (opening) element.style.transition = "none";
      element.dataset.shown = "";
      if (opening) {
        element.getBoundingClientRect();
        element.style.transition = "";
      }
      return;
    }
    element.dataset.shown = "";
    flight.current = animate(0, 1, {
      duration: duration.slow + 0.04,
      ease: jump,
      onUpdate: (t) => {
        const end = measure() ?? to;
        const down = Math.abs(end.y - from.y) >= Math.abs(end.x - from.x);
        const bulge = Math.min(24, Math.max(10, Math.hypot(end.x - from.x, end.y - from.y) * 0.24));
        // A quadratic curve through a point beside the middle of the path.
        const cx = (from.x + end.x) / 2 - (down ? bulge * 2 : 0);
        const cy = (from.y + end.y) / 2 - (down ? 0 : bulge * 2);
        const u = 1 - t;
        const x = u * u * from.x + 2 * u * t * cx + t * t * end.x;
        const y = u * u * from.y + 2 * u * t * cy + t * t * end.y;
        at.current = { x, y };
        place(x, y, 1 + 0.18 * Math.sin(Math.PI * t));
      },
    });
  }, [chosen]);

  // When the layout moves, such as a follow-up question opening, the dot moves with its radio.
  useEffect(() => {
    const group = container.current;
    if (!group) return;
    const observer = new ResizeObserver(() => {
      if (flight.current?.state === "running") return;
      const to = measure();
      if (!to) return;
      at.current = to;
      place(to.x, to.y);
    });
    observer.observe(group);
    return () => observer.disconnect();
  }, [container, measure, place]);

  return <span ref={dot} className="x-govuk-ui-radio-dot" aria-hidden="true" />;
}

export type CheckboxesProps = GroupProps & {
  /** The checked values. Leave it out to let the group keep track. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

/**
 * Lets users choose any number of answers. Compose it from `Checkbox` items. It is a
 * `CheckboxesRoot` with a fieldset and a `ChoiceList`.
 */
export function Checkboxes({
  name,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  id,
  hint,
  errorMessage,
  "aria-describedby": describedBy,
  ...props
}: CheckboxesProps) {
  const generated = useId();
  return (
    <CheckboxesRoot
      controlId={id ?? `${name}-${generated}`}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <GroupFieldset {...props} hint={hint} Item={Checkbox} />
    </CheckboxesRoot>
  );
}

export type RadiosProps = GroupProps & {
  /** The chosen value. Leave it out to let the group keep track. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Sets short answers side by side, such as Yes and No. */
  inline?: boolean;
};

/**
 * Lets users choose one answer. Compose it from `Radio` items. It is a `RadiosRoot` with a
 * fieldset and a `ChoiceList`.
 */
export function Radios({
  name,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  id,
  hint,
  errorMessage,
  "aria-describedby": describedBy,
  ...props
}: RadiosProps) {
  const generated = useId();
  return (
    <RadiosRoot
      controlId={id ?? `${name}-${generated}`}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
      hasHint={present(hint)}
      errorMessage={errorMessage}
      describedBy={describedBy}
    >
      <GroupFieldset {...props} hint={hint} Item={Radio} />
    </RadiosRoot>
  );
}

/**
 * An answer's props. Those for an element, such as `ref` and `data-*`, go on the answer's row,
 * which holds its input, box, label and hint, and not on its follow-up question.
 */
export type ChoiceProps = Omit<ComponentPropsWithRef<"div">, "children"> & {
  value: string;
  /** The answer's label. */
  children: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  /**
   * A follow-up question that opens beneath the item while it is chosen, such as a phone number
   * after choosing "Phone". It stays in the page while closed, so its answers are kept.
   */
  conditional?: ReactNode;
  /**
   * The answer's id. Radios and Checkboxes number their direct children, as GOV.UK does. An answer
   * in a wrapper of your own takes an id of its own, unless it is given one here.
   */
  controlId?: string;
};

function Choice({
  value,
  children,
  hint,
  disabled,
  conditional,
  exclusive = false,
  controlId,
  ...props
}: ChoiceProps & { exclusive?: boolean }) {
  const group = useGroup();
  const index = useContext(ItemIndex);
  const own = useId();
  let id = controlId ?? `${group.idPrefix}-${own}`;
  if (controlId === undefined && index !== null)
    id = index === 0 ? group.idPrefix : `${group.idPrefix}-${index + 1}`;
  return (
    <>
      <ChoiceRoot
        {...props}
        controlId={id}
        value={value}
        disabled={disabled}
        exclusive={exclusive}
        hasHint={present(hint)}
        conditionalId={conditional ? `${id}-conditional` : undefined}
      >
        <ChoiceControl />
        <ChoiceLabel>{children}</ChoiceLabel>
        <ChoiceHint>{hint}</ChoiceHint>
      </ChoiceRoot>
      {conditional && (
        <ChoiceConditional value={value} id={`${id}-conditional`}>
          {conditional}
        </ChoiceConditional>
      )}
    </>
  );
}

export type ChoiceRootProps = ComponentPropsWithRef<"div"> & {
  /** The answer's control's id. The first answer's is the group's own. */
  controlId: string;
  /** What the answer submits. */
  value: string;
  disabled?: boolean;
  /** In Checkboxes, clears the other answers when chosen, as "None of these" does. */
  exclusive?: boolean;
  /**
   * Whether it has a `ChoiceHint`, so its control is described by the hint's id,
   * `{controlId}-hint`. The answer is told rather than finding out, so the description is in the
   * first HTML.
   */
  hasHint?: boolean;
  /** The id of its `ChoiceConditional`, which its control then controls. */
  conditionalId?: string;
};

/**
 * An answer of your own, in a `ChoiceList`. Put a `ChoiceControl`, a `ChoiceLabel` and, if it has
 * one, a `ChoiceHint` in it, in that order. Its follow-up question is a `ChoiceConditional` after
 * it, not inside it.
 */
export function ChoiceRoot({
  controlId,
  value,
  disabled,
  exclusive = false,
  hasHint = false,
  conditionalId,
  className = "",
  ...props
}: ChoiceRootProps) {
  const { registerExclusive } = useGroup();
  useLayoutEffect(
    () => (exclusive ? registerExclusive(value) : undefined),
    [exclusive, registerExclusive, value],
  );
  const answer: Answer = {
    controlId,
    value,
    disabled,
    exclusive,
    hintId: hasHint ? `${controlId}-hint` : undefined,
    conditionalId,
  };
  return (
    <AnswerContext value={answer}>
      <div {...props} className={`x-govuk-ui-choice ${className}`.trim()} />
    </AnswerContext>
  );
}

export type ChoiceControlProps = Omit<
  ComponentPropsWithRef<"input">,
  "type" | "id" | "name" | "value" | "checked" | "defaultChecked" | "disabled" | "aria-controls"
>;

/**
 * An answer's control, which is its native input and the box drawn for it. Its group and its
 * answer give it its type, id, name, value, state and descriptions. Its own `aria-describedby`
 * comes before the answer's hint.
 */
export function ChoiceControl({
  className = "",
  ref,
  onChange,
  "aria-describedby": describedBy,
  ...props
}: ChoiceControlProps) {
  const group = useGroup();
  const answer = useAnswer();
  const list = useContext(ListContext);
  const { registerControl } = group;
  const { controlId } = answer;
  const register = useCallback(
    (control: HTMLInputElement | null) => registerControl(control, controlId),
    [registerControl, controlId],
  );
  const mergedRef = useMergedRef(register, ref);
  return (
    <>
      <input
        {...props}
        ref={mergedRef}
        className={`x-govuk-ui-choice-input ${className}`.trim()}
        type={group.kind}
        id={answer.controlId}
        name={group.name}
        value={answer.value}
        checked={group.isChecked(answer.value)}
        disabled={answer.disabled ?? group.disabled}
        aria-describedby={[describedBy, answer.hintId].filter(Boolean).join(" ") || undefined}
        aria-controls={answer.conditionalId}
        onChange={(event) => {
          onChange?.(event);
          group.choose(answer.value, event.target.checked, answer.exclusive);
        }}
      />
      <span
        ref={(box) => list?.register(answer.value, box)}
        className="x-govuk-ui-choice-box"
        aria-hidden="true"
      >
        {/* The tick draws itself along its stroke as the box is checked. */}
        {group.kind === "checkbox" && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path pathLength={1} d="M5.5 12.5l4.2 4.2L18.5 7.5" />
          </svg>
        )}
      </span>
    </>
  );
}

/** An answer's label, for its control. Check your answers shows it when the answer is chosen. */
export function ChoiceLabel({ className = "", ...props }: ComponentPropsWithRef<"label">) {
  const answer = useAnswer();
  const { labels } = useGroup();
  useLayoutEffect(() => {
    labels.set(answer.value, props.children);
  });
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: The answer gives htmlFor.
    <label
      {...props}
      className={`x-govuk-ui-choice-label ${className}`.trim()}
      htmlFor={props.htmlFor ?? answer.controlId}
    />
  );
}

/** An answer's hint, beneath its label. It renders nothing without content. */
export function ChoiceHint({ className = "", children, ...props }: ComponentPropsWithRef<"div">) {
  const answer = useAnswer();
  if (!present(children)) return null;
  return (
    <div
      {...props}
      className={`x-govuk-ui-hint x-govuk-ui-choice-hint ${className}`.trim()}
      id={props.id ?? `${answer.controlId}-hint`}
    >
      {children}
    </div>
  );
}

export type ChoiceConditionalProps = ComponentPropsWithRef<"div"> & {
  /** The value of the answer it follows, which opens it while chosen. */
  value: string;
  /** Its id, which its answer's `conditionalId` names. */
  id: string;
};

/**
 * An answer's follow-up question, after its `ChoiceRoot`. It opens and closes smoothly while its
 * answer is chosen. When closed, it is inert, so its fields cannot take focus, and it stays in the
 * page, so its answers are kept.
 */
export function ChoiceConditional({
  value,
  id,
  className = "",
  children,
  ...props
}: ChoiceConditionalProps) {
  const group = useGroup();
  const checked = group.isChecked(value);
  // The fields inside show while the answer is chosen and the question around it shows.
  const around = useContext(ShownContext);
  const open = useRef(checked);
  open.current = checked;
  const shown = useCallback(() => open.current && around(), [around]);
  return (
    <div
      {...props}
      className={`x-govuk-ui-conditional ${className}`.trim()}
      id={id}
      data-open={checked || undefined}
      inert={!checked}
    >
      <div className="x-govuk-ui-conditional-inner">
        <div className="x-govuk-ui-conditional-content">
          <ShownContext value={shown}>{children}</ShownContext>
        </div>
      </div>
    </div>
  );
}

export type CheckboxProps = ChoiceProps & {
  /** Clears the other answers when chosen, as "None of these" does. */
  exclusive?: boolean;
};

/** One answer in Checkboxes. */
export function Checkbox(props: CheckboxProps) {
  return <Choice {...props} />;
}

/** One answer in Radios. */
export function Radio(props: ChoiceProps) {
  return <Choice {...props} />;
}

export type ChoiceDividerProps = ComponentPropsWithRef<"div">;

/** Sets an alternative answer apart, usually "or" before "None of these". */
export function ChoiceDivider({ children = "or", className = "", ...props }: ChoiceDividerProps) {
  return (
    <div {...props} className={`x-govuk-ui-choices-divider ${className}`.trim()}>
      {children}
    </div>
  );
}
