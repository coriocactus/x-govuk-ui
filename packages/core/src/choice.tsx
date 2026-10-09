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
import { useFormDefault } from "./field";
import { Fieldset, type FieldsetProps } from "./fieldset";
import { duration, useMotionTiming } from "./motion";

/** The dot's jump eases in and out, so it lifts off gently and lands softly. */
const jump = [0.33, 0, 0.25, 1] as const;

/*
 * Radios and Checkboxes share one implementation. Each is a Fieldset of native inputs, so they
 * submit with a form. As in GOV.UK Frontend, the first item's id is the group's id and later items
 * add `-2`, `-3` and so on, so an error summary can link to the group.
 */

type Kind = "checkbox" | "radio";

type Group = {
  kind: Kind;
  name: string;
  idPrefix: string;
  isChecked: (value: string) => boolean;
  choose: (value: string, checked: boolean, exclusive: boolean) => void;
  registerExclusive: (value: string) => () => void;
  disabled: boolean;
};

const GroupContext = createContext<Group | null>(null);
const ItemIndex = createContext(0);

function useGroup() {
  const group = useContext(GroupContext);
  if (!group) throw new Error("Checkbox must be inside Checkboxes, and Radio inside Radios.");
  return group;
}

type GroupProps = Omit<FieldsetProps, "children" | "onChange" | "defaultValue"> & {
  children: ReactNode;
  /** The name each input submits under. */
  name: string;
  /** Smaller inputs, for dense layouts such as filters. */
  small?: boolean;
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

function ChoiceGroup({
  kind,
  group,
  inline = false,
  small = false,
  children,
  chosen,
  Item,
  ...fieldset
}: Omit<GroupProps, "name" | "disabled"> & {
  kind: Kind;
  group: Group;
  inline?: boolean;
  /** The chosen radio's value, which the travelling dot follows. */
  chosen?: string | null;
  Item: unknown;
}) {
  const container = useRef<HTMLDivElement>(null);
  return (
    <Fieldset {...fieldset} id={group.idPrefix} name={group.name}>
      <div
        ref={container}
        className="x-govuk-ui-choices"
        data-kind={kind}
        data-inline={inline || undefined}
        data-small={small || undefined}
      >
        <GroupContext value={group}>{numberItems(children, Item)}</GroupContext>
        {kind === "radio" && <TravellingDot container={container} chosen={chosen ?? null} />}
      </div>
    </Fieldset>
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
  chosen,
}: {
  container: RefObject<HTMLDivElement | null>;
  chosen: string | null;
}) {
  const dot = useRef<HTMLSpanElement>(null);
  const timing = useMotionTiming();
  const at = useRef<{ x: number; y: number } | null>(null);
  const flight = useRef<ReturnType<typeof animate> | null>(null);
  const mounting = useRef(true);

  const measure = useCallback(() => {
    // The dot's own parent is the group. A group that mounts with an answer already chosen measures
    // before the group's ref is attached, but the dot's own ref is already in place.
    const group = dot.current?.parentElement ?? container.current;
    const box = group?.querySelector<HTMLElement>(
      ".x-govuk-ui-choice-input:checked + .x-govuk-ui-choice-box",
    );
    if (!group || !box) return null;
    const outer = group.getBoundingClientRect();
    const inner = box.getBoundingClientRect();
    return { x: inner.left - outer.left, y: inner.top - outer.top };
  }, [container]);

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

/** Lets users choose any number of answers. Compose it from `Checkbox` items. */
export function Checkboxes({
  name,
  value: controlled,
  defaultValue,
  onValueChange,
  disabled = false,
  id,
  ...props
}: CheckboxesProps) {
  const generated = useId();
  // A Form can give the group its answers to start with, such as ones kept from an earlier visit.
  const saved = useFormDefault(name);
  const [own, setOwn] = useState(() => defaultValue ?? saved ?? []);
  const value = controlled ?? own;
  const exclusive = useRef(new Set<string>());
  const registerExclusive = useCallback((item: string) => {
    exclusive.current.add(item);
    return () => void exclusive.current.delete(item);
  }, []);
  const set = (next: string[]) => {
    if (controlled === undefined) setOwn(next);
    onValueChange?.(next);
  };
  const group: Group = {
    kind: "checkbox",
    name,
    idPrefix: id ?? `${name}-${generated}`,
    disabled,
    isChecked: (item) => value.includes(item),
    // An exclusive answer, such as "None of these", clears the others, and they clear it.
    choose: (item, checked, isExclusive) => {
      if (!checked) return set(value.filter((each) => each !== item));
      if (isExclusive) return set([item]);
      set([...value.filter((each) => !exclusive.current.has(each)), item]);
    },
    registerExclusive,
  };
  return <ChoiceGroup kind="checkbox" group={group} Item={Checkbox} {...props} />;
}

export type RadiosProps = GroupProps & {
  /** The chosen value. Leave it out to let the group keep track. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Sets short answers side by side, such as Yes and No. */
  inline?: boolean;
};

const noExclusive = () => () => {};

/** Lets users choose one answer. Compose it from `Radio` items. */
export function Radios({
  name,
  value: controlled,
  defaultValue,
  onValueChange,
  disabled = false,
  id,
  ...props
}: RadiosProps) {
  const generated = useId();
  // A Form can give the group an answer to start with, such as one kept from an earlier visit.
  const saved = useFormDefault(name)?.[0];
  const [own, setOwn] = useState(() =>
    defaultValue === undefined ? (saved ?? null) : defaultValue,
  );
  const value = controlled === undefined ? own : controlled;
  const group: Group = {
    kind: "radio",
    name,
    idPrefix: id ?? `${name}-${generated}`,
    disabled,
    isChecked: (item) => value === item,
    choose: (item) => {
      if (controlled === undefined) setOwn(item);
      onValueChange?.(item);
    },
    registerExclusive: noExclusive,
  };
  return <ChoiceGroup kind="radio" group={group} chosen={value} Item={Radio} {...props} />;
}

export type ChoiceProps = {
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
  className?: string;
};

function Choice({
  value,
  children,
  hint,
  disabled,
  conditional,
  exclusive = false,
  className = "",
}: ChoiceProps & { exclusive?: boolean }) {
  const group = useGroup();
  const index = useContext(ItemIndex);
  const id = index === 0 ? group.idPrefix : `${group.idPrefix}-${index + 1}`;
  const checked = group.isChecked(value);
  const { registerExclusive } = group;
  useLayoutEffect(
    () => (exclusive ? registerExclusive(value) : undefined),
    [exclusive, registerExclusive, value],
  );
  return (
    <>
      <div className={`x-govuk-ui-choice ${className}`.trim()}>
        <input
          className="x-govuk-ui-choice-input"
          type={group.kind}
          id={id}
          name={group.name}
          value={value}
          checked={checked}
          disabled={disabled ?? group.disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-controls={conditional ? `${id}-conditional` : undefined}
          onChange={(event) => group.choose(value, event.target.checked, exclusive)}
        />
        <span className="x-govuk-ui-choice-box" aria-hidden="true">
          {/* The tick draws itself along its stroke as the box is checked. */}
          {group.kind === "checkbox" && (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path pathLength={1} d="M5.5 12.5l4.2 4.2L18.5 7.5" />
            </svg>
          )}
        </span>
        <label className="x-govuk-ui-choice-label" htmlFor={id}>
          {children}
        </label>
        {hint && (
          <div className="x-govuk-ui-hint x-govuk-ui-choice-hint" id={`${id}-hint`}>
            {hint}
          </div>
        )}
      </div>
      {conditional && (
        // It opens and closes smoothly. When closed, it is inert, so its fields cannot take focus.
        <div
          className="x-govuk-ui-conditional"
          id={`${id}-conditional`}
          data-open={checked || undefined}
          inert={!checked}
        >
          <div className="x-govuk-ui-conditional-inner">
            <div className="x-govuk-ui-conditional-content">{conditional}</div>
          </div>
        </div>
      )}
    </>
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
