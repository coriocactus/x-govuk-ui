"use client";

import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AutoHeight } from "./auto-height";
import { BackLink, type BackLinkProps } from "./back-link";
import { Button, ButtonGroup } from "./button";
import { useControllableState } from "./controllable-state";
import { both, chain } from "./events";
import { FormContext, type FormField, present } from "./field";
import { Form, type FormErrors, type FormProps } from "./form";
import { Kbd } from "./kbd";
import { useLabels } from "./labels";
import { Panel } from "./panel";
import { useLatest, useMergedRef } from "./refs";
import { type Registry, useRegister, useRegistry } from "./registry";
import { stepAnswers } from "./step-answers";
import { browserStorage, type StorageLike } from "./stored-state";
import { SummaryList, SummaryListAction, SummaryListRow } from "./summary-list";
import { Tag } from "./tag";

// biome-ignore lint/suspicious/noConfusingVoidType: a step that only saves returns nothing.
type Outcome = FormErrors | void | Promise<FormErrors | void>;

/**
 * A step's props. The step is a fieldset, which takes every prop of a fieldset's, such as `id`,
 * `style` and data attributes, apart from `disabled` and `hidden`, which FormSteps sets as the
 * step comes and goes.
 */
export type FormStepProps = Omit<
  ComponentPropsWithRef<"fieldset">,
  "title" | "children" | "disabled" | "hidden"
> & {
  /**
   * A heading for a step that asks several things. A step that asks one thing can leave it out,
   * and its field's own label or legend is the question.
   */
  title?: ReactNode;
  /**
   * The level of its `title`'s heading. By default, 1 on a page, where the title is the page's
   * heading, and 3 in a card.
   */
  titleLevel?: 1 | 2 | 3 | 4;
  hint?: ReactNode;
  /** The step's fields, each with a `name`. */
  children: ReactNode;
  /** Checks the step's answers as it is sent, and returns a message for each that needs fixing. */
  validate?: (data: FormData) => FormErrors;
  /**
   * Runs once the step's answers pass, before the next step, such as to save the answers as users
   * go. If it returns messages, such as the server's, the form stays on the step and shows them.
   * The button shows a spinner while it runs.
   */
  onContinue?: (data: FormData) => Outcome;
  /**
   * Asks the step only when this returns true for the answers so far. Otherwise, the step's answers
   * are left out.
   */
  when?: (data: FormData) => boolean;
  /** Offers Skip, which moves on without checking and leaves the step's answers out. */
  optional?: boolean;
  /** The step's words, such as its own `continue` button, in place of the form's. */
  labels?: Partial<Pick<FormStepsLabels, "continue">>;
  /** The step's answer in Check your answers, in place of each field's own answer. */
  summary?: (data: FormData) => ReactNode;
};

/** A step as its FormSteps knows it, by an id of its own, which keeps its fields while it moves. */
type StepEntry = { id: string; props: FormStepProps };

/** What a FormSteps gives its steps, so each can draw itself in its place. */
type StepsHost = {
  registry: Registry<StepEntry>;
  /** A registered step's place among the steps, in the page's order. */
  indexOf: (id: string) => number | null;
  draw: (
    id: string,
    index: number | null,
    props: FormStepProps,
    place: Ref<HTMLFieldSetElement>,
  ) => ReactNode;
};

const StepsContext = createContext<StepsHost | null>(null);

/** A part that a service can place, in place of the one FormSteps draws. */
type Part = "back" | "progress" | "summary";
/** Tells FormSteps that a part of a service's own is on the page, until it calls what it returns. */
type Claim = (part: Part) => () => void;

/** What FormSteps shares with its parts, inside it or in a FormStepsProvider around it. */
type StepsShared = {
  controls: UseFormStepsResult;
  labels: FormStepsLabels;
  layout: "page" | "card";
  /** Whether `done` has taken the place of the steps and their answers. */
  replaced: boolean;
};
const SharedContext = createContext<StepsShared | null>(null);
/**
 * The controls alone, for `useFormSteps`. A page that reads them and draws the form is drawn again
 * only as the form changes, not as its words are given again, such as a function given inline.
 */
const ControlsContext = createContext<UseFormStepsResult | null>(null);
/**
 * The answers, inside the form alone. They change each time they are listed, so they reach only
 * the parts that show them, never a page that draws the form.
 */
const AnswersContext = createContext<UseFormStepsAnswersResult | null>(null);
const ClaimContext = createContext<Claim | null>(null);
/** A FormStepsProvider, which a FormSteps inside it tells where it is, and asks what is placed. */
const ProviderContext = createContext<{
  publish: (shared: StepsShared | null) => void;
  claim: Claim;
  placed: Partial<Record<Part, number>>;
} | null>(null);

/** How many of each part are placed, and a way for each to say so. */
function useClaims() {
  const [placed, setPlaced] = useState<Partial<Record<Part, number>>>({});
  const claim = useCallback<Claim>((part) => {
    setPlaced((now) => ({ ...now, [part]: (now[part] ?? 0) + 1 }));
    return () => setPlaced((now) => ({ ...now, [part]: (now[part] ?? 1) - 1 }));
  }, []);
  return [placed, claim] as const;
}

/** Says that a part of a service's own is on the page, while it is. Null says nothing. */
function useClaim(part: Part | null) {
  const claim = useContext(ClaimContext);
  useLayoutEffect(() => (part ? claim?.(part) : undefined), [claim, part]);
}
/** A step's place among its FormSteps' direct children, read as the server renders. */
const StepIndex = createContext<number | null>(null);

/**
 * One step of FormSteps, which shows it while it is the step on show. It can sit inside a wrapper
 * of your own. FormSteps takes its steps in the page's order.
 *
 * Keep every step on the page, and give a step that applies only to some answers a `when`. A step
 * is known by its place among the others, so a step that comes or goes moves the steps after it.
 */
export function FormStep(props: FormStepProps): ReactNode {
  const host = useContext(StepsContext);
  const direct = useContext(StepIndex);
  const id = useId();
  const place = useRef<HTMLFieldSetElement>(null);
  const element = useMergedRef(place, props.ref);
  const entry = useMemo(() => ({ id, props }), [id, props]);
  useRegister(host?.registry, entry, place);
  if (!host) return null;
  return host.draw(id, host.indexOf(id) ?? direct, props, element);
}

/** Gives each direct child that is a FormStep its place, so the first HTML shows the right step. */
function numberSteps(children: ReactNode) {
  let index = 0;
  return Children.map(children, (child) =>
    isValidElement(child) && child.type === FormStep ? (
      <StepIndex value={index++}>{child}</StepIndex>
    ) : (
      child
    ),
  );
}

export type FormStepsProps = Omit<
  FormProps,
  "onSubmit" | "validate" | "children" | "title" | "defaultValues"
> & {
  /** The steps, as FormStep elements, in order. */
  children: ReactNode;
  /**
   * `page` asks as GOV.UK's question pages do, one page after another. `card` is a card set into a
   * page, such as a short survey or an agent's questions, with the title and a ring of progress in
   * its header and the buttons in its footer.
   */
  layout?: "page" | "card";
  /**
   * On a page, the caption above each question, such as the service's name. In a card, its title.
   */
  title?: ReactNode;
  /** Beside the card's title. */
  icon?: ReactNode;
  /**
   * Ends with GOV.UK's Check your answers, with Change for each answer, before the answers are
   * sent. A FormStepsSummary in the form lists the answers in place of its own list.
   */
  checkAnswers?: boolean;
  /**
   * Offers Back from the second step on. A FormStepsBack in the form, or in a FormStepsProvider
   * around it, takes the place of its own.
   */
  back?: boolean;
  /**
   * Shows how far along the form is, such as "Question 2 of 5", or the card's ring. A
   * FormStepsProgress in the form takes the place of either.
   */
  progress?: boolean;
  /**
   * Lists the errors in an Error summary that takes focus, as GOV.UK does. Without it, each field
   * shows only its own message. On by default, except in a card.
   */
  errorSummary?: boolean;
  /** Command or Control with Enter sends the step from anywhere in it. The card shows the keys. */
  keyboardShortcut?: boolean;
  /**
   * Buttons of your own beside Continue, such as GOV.UK's Save and come back later, while the
   * form's buttons show. On a page they come after Continue and Skip, as GOV.UK puts a secondary
   * button. In a card they come before Skip and Continue, which end the footer's row.
   * `useFormSteps` tells them where the form is, such as for a button that one step needs.
   */
  actions?: ReactNode;
  /** Each step is a place in the browser's history, so Back in the browser goes back a step. */
  history?: boolean;
  /**
   * Keeps the answers and the step in `storage` under this key, so users continue where they left
   * off. They come back once the page has loaded, and `onStepChange` is told the step. They are
   * cleared once the form is sent. Answers stay in the browser, so leave out anything sensitive, or
   * keep them only while the tab is open, in `sessionStorage`.
   *
   * Each field comes back through `useFormDefault`, so a field that is controlled keeps its own
   * `value`. A controlled field of your own can read `useFormDefault` to start from its answer.
   */
  storageKey?: string;
  /**
   * Where `storageKey` keeps the answers. By default, local storage. On a page that also renders
   * on the server, give the browser's storage only in the browser, as StorageLike says.
   */
  storage?: StorageLike;
  /**
   * Called with every answer once the last step, or Check your answers, is sent. Answers to steps
   * skipped or not asked are left out. If it returns messages, such as the server's, the form goes
   * back to the first step that has one. Without it, the form is sent as any form is.
   */
  onComplete?: (data: FormData) => Outcome;
  /**
   * The step on show, from 0. The number of steps shows Check your answers. Leave it out to let the
   * form keep track.
   */
  step?: number;
  /** The step it starts on, unless it remembers another under `storageKey`. */
  defaultStep?: number;
  onStepChange?: (step: number) => void;
  /**
   * Shows in place of the steps once the answers are sent. Without it, the answers stay on show,
   * with Change.
   */
  done?: ReactNode;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<FormStepsLabels>;
};

/** The words FormSteps writes, which a LabelsProvider or its `labels` can change. */
export type FormStepsLabels = {
  /** Each step's button. */
  continue: string;
  back: string;
  skip: string;
  /** The last button, which sends the answers. */
  submit: string;
  /** Heads the list of answers before they are sent. */
  checkAnswers: ReactNode;
  /** How far along the form is, such as "Question 2 of 5". */
  progress: (step: number, total: number) => string;
  /** Names the card's ring of progress for screen readers. */
  progressRing: string;
  /** What the card's ring says once every question is answered. */
  allAnswered: string;
  /** Says on a page that the answers have been sent, when there is no `done`. */
  sent: string;
  /** Says in a card that the answers have been sent. */
  answered: string;
  /** Shown for a question that was skipped. */
  skipped: string;
  /** Shown for a question left empty. */
  notAnswered: string;
  /** Each answer's Change. */
  change: string;
  /** Follows Change for screen readers, as in "Change your answer to What is your name?". */
  changeAnswer: (question: ReactNode) => ReactNode;
};

export const defaultFormStepsLabels: FormStepsLabels = {
  continue: "Continue",
  back: "Back",
  skip: "Skip",
  submit: "Submit",
  checkAnswers: "Check your answers",
  progress: (step, total) => `Question ${step} of ${total}`,
  progressRing: "Questions answered",
  allAnswered: "All answered",
  sent: "Your answers have been sent",
  answered: "Answered",
  skipped: "Skipped",
  notAnswered: "Not answered",
  change: "Change",
  changeAnswer: (question) => <>your answer to {question}</>,
};

/**
 * What the form keeps under its key. `empty` names each field that sent nothing, such as a switch
 * that is off or a group with no box ticked, so it comes back empty, not at its own default.
 */
type Saved = {
  at: number;
  passed: number[];
  skipped: number[];
  answers: [string, string][];
  empty: string[];
};

const isNumbers = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((each) => Number.isInteger(each) && each >= 0);
const isAnswers = (value: unknown): value is [string, string][] =>
  Array.isArray(value) &&
  value.every(
    (each) =>
      Array.isArray(each) &&
      each.length === 2 &&
      typeof each[0] === "string" &&
      typeof each[1] === "string",
  );
/** An answer as Check your answers lists it. */
export type FormStepsAnswer = {
  /** The step that asks it, by its place among the steps, from 0. */
  step: number;
  /** The question, from its field's label, or the step's title for a step's own `summary`. */
  question: ReactNode;
  /** The answers, one to a line. None for a question left empty, or on a step that was skipped. */
  values: ReactNode[];
  /** The id of the question's field, which takes focus as Change asks it again. */
  id: string;
  /** Whether its step was skipped. */
  skipped: boolean;
  /** The step's own summary of its answers, from its `summary`, there only for such a step. */
  summary?: ReactNode;
};

/** What `useFormSteps` gives a part of your own, such as a button beside Continue. */
export type UseFormStepsResult = {
  /** The step on show, by its place among the steps, from 0. `count` is Check your answers. */
  step: number;
  /** How many steps there are, whether they apply or not. */
  count: number;
  /** Where the step on show comes among the steps that apply, from 0. */
  position: number;
  /** How many steps apply to the answers so far. */
  total: number;
  /** How many of the steps that apply are answered or skipped. */
  settled: number;
  /** Whether Check your answers is on show, before the answers are sent. */
  reviewing: boolean;
  /** Whether the answers have been sent. */
  sent: boolean;
  /** Whether a step's `onContinue`, or `onComplete`, is running. */
  busy: boolean;
  /** Goes back to the step before that applies. Null on the first step, and once sent. */
  back: (() => void) | null;
  /** Skips the step on show. Null unless the step is `optional`. */
  skip: (() => void) | null;
  /**
   * The answers as the form would send them now, leaving out steps that were skipped or do not
   * apply, such as for Save and come back later. Null before the form is drawn.
   */
  data: () => FormData | null;
};

export type UseFormStepsAnswersOptions = {
  /**
   * Says that the part lists the answers in place of the form's own list. While it is on the page,
   * FormSteps lists no answers of its own, as it does beside a FormStepsSummary.
   */
  summary?: boolean;
};

/** What `useFormStepsAnswers` gives a list of the answers of your own. */
export type UseFormStepsAnswersResult = {
  /** The answers Check your answers lists, in order. None until it shows. */
  answers: FormStepsAnswer[];
  /** Asks an answer's question again, then comes back to Check your answers. */
  change: (answer: FormStepsAnswer) => void;
};

const noAnswers: FormStepsAnswer[] = [];

/** What was kept under the key, or null when there is nothing, or nothing this form wrote. */
function readSaved(key: string | undefined, storage: StorageLike | null): Saved | null {
  if (!key || !storage) return null;
  try {
    const saved: unknown = JSON.parse(storage.getItem(key) ?? "null");
    if (typeof saved !== "object" || saved === null) return null;
    const { at, passed, skipped, answers, empty = [] } = saved as Record<string, unknown>;
    if (typeof at !== "number" || !Number.isInteger(at) || at < 0) return null;
    if (!isNumbers(passed) || !isNumbers(skipped) || !isAnswers(answers)) return null;
    if (!Array.isArray(empty) || !empty.every((name) => typeof name === "string")) return null;
    return { at, passed, skipped, answers, empty };
  } catch {
    return null;
  }
}
function writeSaved(key: string | undefined, storage: StorageLike | null, saved: Saved | null) {
  if (!key || !storage) return;
  try {
    if (saved) storage.setItem(key, JSON.stringify(saved));
    else storage.removeItem(key);
  } catch {
    // Storage can be full or blocked. The form still works for this visit.
  }
}

/**
 * A field's answer as Check your answers lists it, one answer to a line. A field that says how to
 * show its answer, such as Select with its option's label, does so. Otherwise the answer is what
 * the field sends under its name, with a file by its name.
 */
function answersOf(field: FormField, name: string, data: FormData): ReactNode[] {
  if (field.answer) {
    const given = field.answer(data);
    const list = Array.isArray(given) ? given : [given];
    return list.filter((each) => present(each));
  }
  return data
    .getAll(name)
    .map((value) => (typeof value === "string" ? value.trim() : value.name))
    .filter(Boolean);
}

/**
 * Moves focus to the first element that takes it, passing over any out of sight. An element that
 * cannot take focus, such as a heading, is made to take it from a script alone.
 */
function focusFirst(elements: (HTMLElement | null | undefined)[]) {
  for (const element of elements) {
    if (!element) continue;
    if (!element.hasAttribute("tabindex") && element.tabIndex < 0) element.tabIndex = -1;
    element.focus();
    if (element.ownerDocument.activeElement === element) return;
  }
}

/**
 * Gives a step's fields a Form that also records them for the step, by name, so Check your answers
 * can list each question the step asks.
 */
function StepFields({
  step,
  fields,
  changed,
  children,
}: {
  /** The step's own id, which stays the same while the step moves among the others. */
  step: string;
  fields: RefObject<Map<string, Map<string, FormField>>>;
  /** Told when a field's question or answer changes. */
  changed: () => void;
  children: ReactNode;
}) {
  const form = useContext(FormContext);
  const parent = form?.register;
  const register = useCallback(
    (name: string, field: FormField) => {
      const unregister = parent?.(name, field);
      const own = fields.current.get(step) ?? new Map<string, FormField>();
      fields.current.set(step, own);
      own.set(name, field);
      return () => {
        unregister?.();
        if (own.get(name) === field) own.delete(name);
        // A question that leaves, such as one a wrapper of your own stops rendering, leaves Check
        // your answers too.
        changed();
      };
    },
    [parent, fields, step, changed],
  );
  const value = useMemo(() => form && { ...form, register, changed }, [form, register, changed]);
  return <FormContext value={value}>{children}</FormContext>;
}

/**
 * A form in steps, shown one at a time, such as GOV.UK's question pages, or a short survey or an
 * agent's questions in a card. Each step contains any fields, which take part by their names, as
 * they do in a Form.
 *
 * Continue checks only the step's answers, and shows what to fix as Form does. It then runs the
 * step's own `onContinue`, such as to save the answers. The next step that applies then comes,
 * passing over any step whose `when` returns false. Back goes to the step before, with its answers
 * as they were. The form can end with Check your answers, worked out from the fields' labels and
 * answers. There, Change asks a question again and then returns.
 *
 * Its progress, its Back, its errors, its keys and its history can each be turned on or off. With
 * a `storageKey`, it remembers how far users got. Focus moves to each step as it comes, and a card
 * eases to each step's height.
 *
 * Its Back link, its progress and its list of answers are parts too: FormStepsBack,
 * FormStepsProgress and FormStepsSummary. Each one you place takes the place of the form's own. A
 * card's own Back is a button and its progress a ring, which the parts replace with a link and
 * words. `actions` puts buttons of your own beside Continue, and `useFormSteps` gives a part of
 * your own where the form is. A part among the steps is found as the server renders. One in a
 * wrapper of your own, or outside the form, is found once the page has loaded, so the first HTML
 * can show the form's own as well.
 *
 * Its `className` and `style` go on the section that users see, around the title, the progress
 * and the form. Every other prop, including `ref`, goes on the form, as a Form's do.
 */
export function FormSteps({
  children,
  layout = "page",
  title,
  icon,
  checkAnswers = true,
  back = true,
  progress = true,
  errorSummary = layout !== "card",
  keyboardShortcut = true,
  actions,
  history: historyOn = false,
  storageKey,
  storage: ownStorage,
  onComplete,
  step: controlledStep,
  defaultStep = 0,
  onStepChange,
  done: doneContent,
  labels: ownLabels,
  className = "",
  style,
  onKeyDown: givenKeyDown,
  onInput: givenInput,
  onChange: givenChange,
  onClick: givenClick,
  onKeyUp: givenKeyUp,
  ref,
  ...formProps
}: FormStepsProps) {
  const labels = useLabels("formSteps", defaultFormStepsLabels, ownLabels);
  const doneLabel = layout === "card" ? labels.answered : labels.sent;
  // Each step registers itself once it renders, in the page's order. Until then, as the server
  // renders, the steps are the direct children.
  const { items: registered, registry } = useRegistry<StepEntry>();
  const direct = Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === FormStep)
    .map((child) => (child as { props: FormStepProps }).props);
  const steps = registered.length > 0 ? registered.map((entry) => entry.props) : direct;
  const count = steps.length;
  // The first HTML is the same on the server and in the browser, so answers kept in the browser
  // are restored once the page has loaded. The form then starts again with them, before the
  // browser paints.
  const [restored, setRestored] = useState<{ answers: Record<string, string[]>; round: number }>({
    answers: {},
    round: 0,
  });
  // Where the form is, as a step's index, or `count` for Check your answers. It is kept as asked
  // for, and kept within the steps as it is read, because steps in a wrapper of your own are not
  // all known until they register.
  const [wanted, setAt] = useControllableState(controlledStep, defaultStep, onStepChange);
  const at = Math.max(0, Math.min(wanted, count));
  const [passed, setPassed] = useState(() => new Set<number>());
  const [skipped, setSkipped] = useState(() => new Set<number>());
  const [plan, setPlan] = useState(() => steps.map((_, index) => index));
  const [rows, setRows] = useState<FormStepsAnswer[]>([]);
  const rememberSoon = useRef(0);
  // Whether the answers are kept, which they are not while they are sent or once they are.
  const keeping = useRef(true);
  // Whether the answers are being sent, read as a press comes, before the form draws itself busy.
  const sending = useRef(false);
  // The fields each step asks, by the step's id and the field's name, as they register.
  const stepFields = useRef(new Map<string, Map<string, FormField>>());
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const returning = useRef(false);
  const form = useRef<HTMLFormElement | null>(null);
  const formRef = useMergedRef(form, ref);
  const focusNext = useRef<string | null>(null);
  const titleId = useId();
  const historyKey = `x-govuk-ui-form-steps:${storageKey ?? titleId}`;
  // Before any step is known, as when every step is in a wrapper of your own, nothing shows.
  const ready = count > 0;
  const reviewing = ready && at >= count;
  const step = steps[at];
  // Check your answers lists the answers again when a field's question or answer changes while it
  // shows, such as when a Select's labels arrive from items in a wrapper after a restore.
  const [summaries, setSummaries] = useState(0);
  const listing = useLatest(reviewing && !sent);
  const fieldChanged = useCallback(() => {
    if (listing.current) setSummaries((count) => count + 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: answers are restored once, as the form first mounts.
  useLayoutEffect(() => {
    const saved = readSaved(storageKey, ownStorage ?? browserStorage());
    if (!saved) return;
    const answers: Record<string, string[]> = {};
    for (const name of saved.empty) answers[name] = [];
    for (const [name, value] of saved.answers) answers[name] = [...(answers[name] ?? []), value];
    setPassed(new Set(saved.passed));
    setSkipped(new Set(saved.skipped));
    // A form whose step is controlled is told the kept step, so it can take it.
    setAt(saved.at);
    setRestored({ answers, round: 1 });
  }, []);

  /** The steps that apply to the answers so far, in order, leaving out a step being skipped. */
  const planFor = (leaving?: number) => {
    const element = form.current;
    if (!element) return steps.map((_, index) => index);
    const data = new FormData(element);
    if (leaving !== undefined)
      for (const field of element.querySelectorAll<HTMLInputElement>(
        `[data-step="${leaving}"] [name]`,
      ))
        data.delete(field.name);
    return steps.flatMap((each, index) => (!each.when || each.when(data) ? [index] : []));
  };
  const replan = (leaving?: number) => {
    const next = planFor(leaving);
    setPlan((current) => (current.join() === next.join() ? current : next));
    return next;
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: the plan is worked out once mounted, again as steps come and go, and again with restored answers.
  useLayoutEffect(() => {
    replan();
  }, [count, restored.round]);

  /**
   * Keeps the answers and the step, when there is a key. Keeping them now cancels keeping them a
   * moment after a change. Answers being sent, or sent, are not kept, so a reload never brings back
   * a form that has gone.
   */
  const remember = (where = at, passing = passed, skipping = skipped) => {
    window.clearTimeout(rememberSoon.current);
    rememberSoon.current = 0;
    const element = form.current;
    if (!keeping.current || !storageKey || !element) return;
    // The answers of the steps that apply now, even before the page shows them so.
    const applies = planFor().filter((index) => !skipping.has(index));
    const sent = stepAnswers(element, applies);
    const answers = sent.flatMap(([name, value]) =>
      typeof value === "string" ? [[name, value] as [string, string]] : [],
    );
    // A field that sends nothing is kept as empty, so it comes back empty. A field on a step that
    // was skipped or does not apply sends nothing because its answers are left out, so it is not
    // kept, and comes back at its own default.
    const live = new Set(applies.map((index) => registered[index]?.id));
    const names = new Set(
      [...stepFields.current]
        .filter(([id]) => live.has(id))
        .flatMap(([, fields]) => [...fields.keys()]),
    );
    const given = new Set(sent.map(([name]) => name));
    const empty = [...names].filter((name) => !given.has(name));
    writeSaved(storageKey, ownStorage ?? browserStorage(), {
      at: where,
      passed: [...passing],
      skipped: [...skipping],
      answers,
      empty,
    });
  };

  // Answers are kept a moment after the last change, once React has drawn it, such as in a hidden
  // input that a control fills from its state. They are kept with the form as it is then, not as
  // it was at the change. A page that closes or reloads within that moment, or a form that leaves
  // it, keeps them at once.
  const later = useLatest(() => {
    replan();
    remember();
  });
  const keepSoon = () => {
    if (!keeping.current) return;
    window.clearTimeout(rememberSoon.current);
    rememberSoon.current = window.setTimeout(() => later.current(), 300);
  };
  useLayoutEffect(() => {
    const flush = () => {
      if (rememberSoon.current) later.current();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const go = (where: number, { push = true } = {}) => {
    replan();
    setAt(where);
    focusNext.current = where >= count ? "summary" : "step";
    if (historyOn && push)
      window.history.pushState({ ...window.history.state, [historyKey]: where }, "");
  };
  const summaryRows = (index: number, skipping: Set<number>): FormStepsAnswer[] => {
    if (!form.current) return [];
    const data = new FormData(form.current);
    // The step's questions in the page's order, leaving out any users cannot see.
    const place = (id: string) => document.getElementById(id);
    const id = registered[index]?.id;
    const asked = [...((id && stepFields.current.get(id)) || [])]
      .filter(([, field]) => field.shown?.() !== false)
      .sort(([, a], [, b]) => {
        const [first, second] = [place(a.id), place(b.id)];
        if (!first || !second) return 0;
        return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
    const each = asked.map(
      ([name, field]): FormStepsAnswer => ({
        step: index,
        question: field.label,
        values: answersOf(field, name, data),
        id: field.id,
        skipped: false,
      }),
    );
    if (skipping.has(index)) return each.map((row) => ({ ...row, values: [], skipped: true }));
    const own = steps[index]?.summary;
    if (own)
      return [
        {
          step: index,
          question: steps[index]?.title ?? each[0]?.question,
          values: [],
          id: each[0]?.id ?? "",
          skipped: false,
          summary: own(data),
        },
      ];
    return each;
  };

  /** The next step that applies and has not been answered, or Check your answers. */
  const following = (
    from: number,
    route: number[],
    passing: Set<number>,
    skipping: Set<number>,
  ) => {
    const later = route.filter((index) => index > from);
    if (returning.current) {
      const missing = later.find((index) => !passing.has(index) && !skipping.has(index));
      if (missing !== undefined) return missing;
      returning.current = false;
      return count;
    }
    return later[0] ?? count;
  };

  // Each step takes focus as it comes, so screen readers start at the question. In a card, the
  // step's first answer takes focus, or the chosen answer if there is one. On a page, the step's
  // heading takes focus. Focus moves a frame after the change, once the press that caused it is
  // over, because Safari focuses the nearest focusable ancestor of a pressed button.
  // biome-ignore lint/correctness/useExhaustiveDependencies: focus moves after each change of place.
  useEffect(() => {
    const wanted = focusNext.current;
    if (!wanted) return;
    focusNext.current = null;
    const frame = requestAnimationFrame(() => {
      const root = form.current;
      if (!root) return;
      if (wanted === "summary") {
        const section = root.closest<HTMLElement>(".x-govuk-ui-form-steps");
        const all = (selector: string) => [
          ...(section?.querySelectorAll<HTMLElement>(selector) ?? []),
        ];
        // On a page, the page's heading takes focus, such as Check your answers, a heading of your
        // own above the answers, or the Panel once they are sent. The steps' own are out of sight.
        // Otherwise the first heading of the answers does, or the answers themselves.
        focusFirst([
          ...(layout === "page" ? all("h1") : []),
          ...all(
            ".x-govuk-ui-form-steps-review-title, .x-govuk-ui-form-steps-summary, .x-govuk-ui-form-steps-done",
          ),
        ]);
        return;
      }
      if (wanted.startsWith("#")) {
        // A question asked again takes focus at its answer, or at the chosen answer of a group.
        const field = document.getElementById(wanted.slice(1));
        const group = field?.closest("fieldset:not([data-step])");
        return (group?.querySelector<HTMLElement>("input:checked") ?? field)?.focus();
      }
      const current = root.querySelector<HTMLElement>(`[data-step="${at}"]`);
      // On a page, the step's title takes focus at whatever level it is, or else its question's
      // heading.
      // In a card, the step's chosen answer takes focus, or else its first.
      const headings =
        layout === "page"
          ? [
              current?.querySelector<HTMLElement>(":scope > .x-govuk-ui-form-step-title"),
              current?.querySelector<HTMLElement>("h1"),
            ]
          : [];
      focusFirst([
        ...headings,
        current?.querySelector<HTMLElement>("input:checked"),
        ...(current?.querySelectorAll<HTMLElement>(
          "input:not([type=hidden]), textarea, select, button[role=combobox], [tabindex='0']",
        ) ?? []),
      ]);
    });
    return () => cancelAnimationFrame(frame);
  }, [at, sent]);

  // Check your answers lists the answers each time the form comes to it, however it does, such as
  // by Continue, by a `step` given by the page, or by answers restored from an earlier visit. It
  // lists them again as the steps register, because restored answers start the form again, and the
  // steps register anew after it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the answers are listed as the form arrives, and as its steps register.
  useLayoutEffect(() => {
    if (reviewing && !sent) setRows(planFor().flatMap((index) => summaryRows(index, skipped)));
  }, [reviewing, sent, restored.round, registered, summaries]);

  // With history, the browser's current entry always records the step the form is on. Continue and
  // Back add an entry first. Otherwise the step changes in place, such as when the steps in a
  // wrapper of your own register and the step asked for is known, or answers are restored.
  useEffect(() => {
    if (historyOn) window.history.replaceState({ ...window.history.state, [historyKey]: at }, "");
  }, [historyOn, historyKey, at]);
  // The browser's Back and Forward move between the steps. The listener is set once, and calls the
  // latest go.
  const goNow = useLatest(go);
  useEffect(() => {
    if (!historyOn) return;
    const moved = (event: PopStateEvent) => {
      const where = event.state?.[historyKey];
      if (typeof where === "number") goNow.current(where, { push: false });
    };
    window.addEventListener("popstate", moved);
    return () => window.removeEventListener("popstate", moved);
  }, [historyOn, historyKey]);

  const finish = async (data: FormData, skipping = skipped) => {
    const element = form.current;
    window.clearTimeout(rememberSoon.current);
    rememberSoon.current = 0;
    keeping.current = false;
    if (!onComplete) {
      writeSaved(storageKey, ownStorage ?? browserStorage(), null);
      element?.submit();
      return;
    }
    setBusy(true);
    sending.current = true;
    const errors = await onComplete(data);
    sending.current = false;
    setBusy(false);
    const wrong = Object.entries(errors ?? {}).filter(([, message]) => present(message));
    if (wrong.length > 0) {
      // The answers are kept again, as the form goes back to them, including any change that was
      // waiting to be kept as they were sent.
      keeping.current = true;
      keepSoon();
      // The form goes back to the first step with something to fix.
      const first = plan.find((index) =>
        wrong.some(([name]) =>
          element?.querySelector(
            `[data-step="${index}"] [name="${CSS.escape(name)}"], [data-step="${index}"] [name^="${CSS.escape(name)}-"]`,
          ),
        ),
      );
      if (first !== undefined) {
        returning.current = true;
        setAt(first);
        focusNext.current = "step";
      }
      return errors ?? undefined;
    }
    // Anything that asked to keep the answers while they were sent, such as a press, keeps nothing.
    window.clearTimeout(rememberSoon.current);
    rememberSoon.current = 0;
    keeping.current = false;
    writeSaved(storageKey, ownStorage ?? browserStorage(), null);
    // The answers stay on show once sent, unless something else takes their place.
    setRows(planFor().flatMap((index) => summaryRows(index, skipping)));
    setSent(true);
    focusNext.current = "summary";
  };

  const onSubmit = async (data: FormData) => {
    if (busy) return;
    if (reviewing) return finish(data);
    const own = step?.onContinue;
    if (own) {
      setBusy(true);
      const errors = await own(data);
      setBusy(false);
      if (errors && Object.values(errors).some(present)) return errors;
    }
    const passing = new Set(passed).add(at);
    const skipping = new Set(skipped);
    skipping.delete(at);
    setPassed(passing);
    setSkipped(skipping);
    const route = replan();
    const next = following(at, route, passing, skipping);
    if (next >= count && !checkAnswers) {
      // The last step sends the answers, without Check your answers.
      return finish(data, skipping);
    }
    go(next);
    remember(next, passing, skipping);
  };

  const skip = () => {
    const skipping = new Set(skipped).add(at);
    const passing = new Set(passed);
    passing.delete(at);
    setSkipped(skipping);
    setPassed(passing);
    // The skipped step's answers are left out at once, so the steps after follow from the rest.
    const route = replan(at);
    const next = following(at, route, passing, skipping);
    if (next >= count && !checkAnswers) {
      const element = form.current;
      if (!element) return;
      const data = new FormData(element);
      for (const field of element.querySelectorAll<HTMLInputElement>(`[data-step="${at}"] [name]`))
        data.delete(field.name);
      void finish(data, skipping);
      return;
    }
    // The skipped step is disabled once the form renders again, so its answers stay out of the
    // plan and Check your answers.
    setAt(next);
    focusNext.current = next >= count ? "summary" : "step";
    if (historyOn) window.history.pushState({ ...window.history.state, [historyKey]: next }, "");
    remember(next, passing, skipping);
  };

  const previous = plan.filter((index) => index < at).at(-1);
  const goBack = () => {
    returning.current = false;
    if (previous !== undefined) go(previous);
  };
  // Change asks the question again, then comes back to Check your answers.
  const change = (row: FormStepsAnswer) => {
    // While the answers are sent, they cannot change.
    if (sending.current) return;
    returning.current = true;
    keeping.current = true;
    setSent(false);
    go(row.step);
    if (row.id) focusNext.current = `#${row.id}`;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (!keyboardShortcut || event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  const position = reviewing ? plan.length : plan.indexOf(at);
  const settled = plan.filter((index) => passed.has(index) || skipped.has(index)).length;
  const last = !checkAnswers && plan.at(-1) === at;
  const label = reviewing || last ? labels.submit : (step?.labels?.continue ?? labels.continue);
  const card = layout === "card";
  const replaced = sent && Boolean(doneContent);

  // The parts read the form through stable functions, so a FormStepsProvider is told of a change
  // only when the form changes.
  const latest = useLatest({ goBack, skip, change });
  const backNow = useCallback(() => latest.current.goBack(), []);
  const skipNow = useCallback(() => latest.current.skip(), []);
  const changeNow = useCallback((row: FormStepsAnswer) => latest.current.change(row), []);
  // Steps skipped or not asked are disabled, so the form leaves their answers out.
  const dataNow = useCallback(() => (form.current ? new FormData(form.current) : null), []);
  const canGoBack = !sent && previous !== undefined;
  const canSkip = Boolean(step?.optional) && !reviewing && !sent;
  const listed = reviewing || sent ? rows : noAnswers;
  const controls = useMemo<UseFormStepsResult>(
    () => ({
      step: at,
      count,
      position,
      total: plan.length,
      settled,
      reviewing: reviewing && !sent,
      sent,
      busy,
      back: canGoBack ? backNow : null,
      skip: canSkip ? skipNow : null,
      data: dataNow,
    }),
    [
      at,
      count,
      position,
      plan.length,
      settled,
      reviewing,
      sent,
      busy,
      canGoBack,
      canSkip,
      backNow,
      skipNow,
      dataNow,
    ],
  );
  const answers = useMemo(() => ({ answers: listed, change: changeNow }), [listed, changeNow]);
  const shared = useMemo(
    () => ({ controls, labels, layout, replaced }),
    [controls, labels, layout, replaced],
  );
  // A FormStepsProvider around the form is told where it is, so parts outside it can show it.
  const provider = useContext(ProviderContext);
  const publish = provider?.publish;
  useLayoutEffect(() => publish?.(shared), [publish, shared]);
  useLayoutEffect(() => () => publish?.(null), [publish]);
  // Each part a service places takes the place of the form's own. A part among the form's
  // children is known as the server renders too, so the first HTML draws it once.
  const [ownPlaced, ownClaim] = useClaims();
  const placed = provider?.placed ?? ownPlaced;
  const claim = provider?.claim ?? ownClaim;
  const types = Children.toArray(children).flatMap((child) =>
    isValidElement(child) ? [child.type] : [],
  );
  const drawBack = back && !placed.back && !types.includes(FormStepsBack);
  const drawProgress = progress && !placed.progress && !types.includes(FormStepsProgress);
  const drawSummary = !placed.summary && !types.includes(FormStepsSummary);

  const ring = 2 * Math.PI * 7;
  const progressRing = card && drawProgress && (
    <span
      className="x-govuk-ui-form-steps-ring"
      role="progressbar"
      aria-label={labels.progressRing}
      aria-valuemin={0}
      aria-valuemax={plan.length}
      aria-valuenow={sent ? plan.length : settled}
      aria-valuetext={
        sent || reviewing ? labels.allAnswered : labels.progress(position + 1, plan.length)
      }
    >
      <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
        <circle className="x-govuk-ui-form-steps-ring-track" cx="9" cy="9" r="7" />
        <circle
          className="x-govuk-ui-form-steps-ring-fill"
          cx="9"
          cy="9"
          r="7"
          strokeDasharray={ring}
          strokeDashoffset={ring * (1 - (sent ? 1 : settled / Math.max(1, plan.length)))}
        />
      </svg>
    </span>
  );

  const backControl =
    drawBack && canGoBack ? (
      card ? (
        <Button variant="outline" size="small" onClick={goBack}>
          {labels.back}
        </Button>
      ) : (
        <StepsBack />
      )
    ) : null;

  // The last press sends the answers, with the success sound once they are taken.
  const submit = ready && (
    <Button
      type="submit"
      size={card ? "small" : undefined}
      loading={busy}
      aria-keyshortcuts={keyboardShortcut ? "Meta+Enter Control+Enter" : undefined}
    >
      {label}
      {card && keyboardShortcut && (
        <Kbd aria-hidden="true" className="x-govuk-ui-form-steps-shortcut" shortcut="↵" />
      )}
    </Button>
  );
  const skipControl = canSkip ? (
    <Button
      variant={card ? "outline" : "secondary"}
      size={card ? "small" : undefined}
      onClick={skip}
    >
      {labels.skip}
    </Button>
  ) : null;

  // Every step stays in the form, so answers are kept as users move back and forth. Steps
  // skipped or not asked are disabled while out of sight, so their answers are not sent. A step
  // whose place is not known yet stays out of sight until it registers.
  const host: StepsHost = {
    registry,
    indexOf: (id) => {
      const index = registered.findIndex((entry) => entry.id === id);
      return index < 0 ? null : index;
    },
    draw: (id, index, each, place) => {
      // The step's own options, which FormSteps reads, and the fieldset's props, which it draws.
      const {
        title: stepTitle,
        titleLevel = layout === "page" ? 1 : 3,
        hint,
        children: fields,
        validate: _validate,
        onContinue: _onContinue,
        when: _when,
        optional: _optional,
        labels: _labels,
        summary: _summary,
        ref: _ref,
        className = "",
        ...props
      } = each;
      const Title = `h${titleLevel}` as const;
      return (
        <fieldset
          role="presentation"
          {...props}
          ref={place}
          className={`x-govuk-ui-form-step ${className}`.trim()}
          data-step={index ?? undefined}
          hidden={index !== at || sent}
          disabled={index !== null && index !== at && (skipped.has(index) || !plan.includes(index))}
        >
          {layout === "page" && title && (
            <span className="x-govuk-ui-form-steps-caption">{title}</span>
          )}
          {stepTitle && <Title className="x-govuk-ui-form-step-title">{stepTitle}</Title>}
          {hint && <div className="x-govuk-ui-hint">{hint}</div>}
          <div className="x-govuk-ui-form-step-fields">
            <StepFields step={id} fields={stepFields} changed={fieldChanged}>
              {fields}
            </StepFields>
          </div>
        </fieldset>
      );
    },
  };

  const body = (
    <div className="x-govuk-ui-form-steps-body">
      {!card && drawProgress && <StepsProgress />}
      {/* On a page, once the answers are sent, a Panel above them says so, as GOV.UK's
          confirmation page does. */}
      {!card && sent && !replaced && <Panel title={doneLabel} />}
      <StepsContext value={host}>{numberSteps(children)}</StepsContext>
      {drawSummary && <StepsSummary />}
      {sent && doneContent && (
        <div className="x-govuk-ui-form-steps-done" tabIndex={-1}>
          {doneContent}
        </div>
      )}
    </div>
  );

  return (
    // The parts inside the form claim their places from it, or from a FormStepsProvider around it.
    // A FormSteps inside one of the steps answers to no FormStepsProvider of the form's.
    <ProviderContext value={null}>
      <ClaimContext value={claim}>
        <ControlsContext value={controls}>
          <AnswersContext value={answers}>
            <SharedContext value={shared}>
              <section
                className={`x-govuk-ui-form-steps ${className}`.trim()}
                style={style}
                data-layout={layout}
                data-done={sent || undefined}
                // SoundScope plays the success sound as the answers are taken.
                data-success={sent || undefined}
                aria-labelledby={card && title ? titleId : undefined}
              >
                {card && (
                  <header className="x-govuk-ui-form-steps-header">
                    {icon && <span className="x-govuk-ui-form-steps-icon">{icon}</span>}
                    <h3 id={titleId} className="x-govuk-ui-form-steps-title">
                      {title}
                    </h3>
                    {progressRing}
                  </header>
                )}
                {!card && backControl}
                <Form
                  {...formProps}
                  // Restored answers start the form again, because each field reads its answer once.
                  key={restored.round}
                  ref={formRef}
                  className="x-govuk-ui-form-steps-form"
                  // Pressing anywhere in it that is not a control puts focus in the form, so keys that work
                  // across it, such as Choices' letters, reach it.
                  tabIndex={-1}
                  errorSummary={errorSummary}
                  defaultValues={restored.answers}
                  validate={(data) => (reviewing || !step?.validate ? {} : step.validate(data))}
                  onSubmit={(data) => onSubmit(data)}
                  onKeyDown={chain(givenKeyDown, onKeyDown)}
                  // Keeping the answers and working out the steps again follow every change, whatever a
                  // service's own handlers do. A control that sends its value from a hidden input, such as a
                  // slider or a toggle group, changes it with a key or a press, not with typing.
                  onInput={both(givenInput, keepSoon)}
                  onChange={both(givenChange, () => {
                    replan();
                    keepSoon();
                  })}
                  onClick={both(givenClick, keepSoon)}
                  onKeyUp={both(givenKeyUp, keepSoon)}
                >
                  {card ? <AutoHeight>{body}</AutoHeight> : body}
                  {card ? (
                    <div className="x-govuk-ui-form-steps-footer">
                      {sent ? (
                        <Tag colour="green">{doneLabel}</Tag>
                      ) : (
                        <>
                          {backControl}
                          <span className="x-govuk-ui-form-steps-gap" />
                          {actions}
                          {skipControl}
                          {submit}
                        </>
                      )}
                    </div>
                  ) : (
                    !sent && (
                      <ButtonGroup className="x-govuk-ui-form-steps-buttons">
                        {submit}
                        {skipControl}
                        {actions}
                      </ButtonGroup>
                    )
                  )}
                </Form>
              </section>
            </SharedContext>
          </AnswersContext>
        </ControlsContext>
      </ClaimContext>
    </ProviderContext>
  );
}

export type FormStepsProviderProps = {
  /** The FormSteps, and its parts placed outside it. */
  children: ReactNode;
};

/**
 * Lets FormStepsBack and FormStepsProgress sit outside the FormSteps inside it, such as a
 * FormStepsBack in a ServicePage's `back`, above the page's main content, where GOV.UK puts a Back
 * link.
 * `useFormSteps` reads the form there too. Put it around one FormSteps and its parts. It renders no
 * element.
 *
 * The form tells it where it is once the page has loaded, so a part outside the form shows nothing
 * in the first HTML. Give ServicePage's `back` a FormStepsBack only while `useFormSteps().back` is
 * there, so the page keeps no empty place for it.
 */
export function FormStepsProvider({ children }: FormStepsProviderProps) {
  const [shared, publish] = useState<StepsShared | null>(null);
  const [placed, claim] = useClaims();
  const provider = useMemo(() => ({ publish, claim, placed }), [claim, placed]);
  return (
    <ProviderContext value={provider}>
      <ClaimContext value={claim}>
        <ControlsContext value={shared?.controls ?? null}>
          <SharedContext value={shared}>{children}</SharedContext>
        </ControlsContext>
      </ClaimContext>
    </ProviderContext>
  );
}

/**
 * Where the FormSteps around it is, and ways to move it on, for a part of your own, such as a
 * button beside Continue or a heading above the answers. It reads a FormStepsProvider too. Null
 * outside both.
 */
export function useFormSteps(): UseFormStepsResult | null {
  return useContext(ControlsContext);
}

/**
 * The answers Check your answers lists, and Change, for a list of your own, as FormStepsSummary
 * lists them. Null outside the form, as a FormStepsProvider does not carry them. Read it in the
 * part that lists them, not in one that draws the steps, which would list them again each time.
 *
 * As the answers come, focus moves to the form's first `h1` on a page, or else to a heading with
 * the class `x-govuk-ui-form-steps-review-title`. Give your list one, or move focus to it yourself.
 * The words FormStepsSummary writes for an answer skipped or not given come from
 * `useLabels("formSteps", defaultFormStepsLabels)`.
 */
export function useFormStepsAnswers({
  summary = false,
}: UseFormStepsAnswersOptions = {}): UseFormStepsAnswersResult | null {
  const answers = useContext(AnswersContext);
  // A list that has no answers to show, outside the form, takes the form's own list's place from
  // nothing.
  useClaim(summary && answers ? "summary" : null);
  return answers;
}

export type FormStepsBackProps = Omit<BackLinkProps, "href" | "render" | "children">;

/** The form's Back link, as FormSteps draws it. @internal */
function StepsBack({ className = "", onClick, ...props }: FormStepsBackProps) {
  const shared = useContext(SharedContext);
  const back = shared?.controls.back;
  if (!shared || !back) return null;
  return (
    <BackLink
      {...props}
      href="#"
      className={`x-govuk-ui-form-steps-back ${className}`.trim()}
      onClick={chain(onClick, (event) => {
        event.preventDefault();
        back();
      })}
    >
      {shared.labels.back}
    </BackLink>
  );
}

/**
 * The form's Back link, which goes back to the step before that applies. It shows from the second
 * step on, until the answers are sent. While one is in the form, or in a FormStepsProvider around
 * it, FormSteps draws no Back of its own.
 */
export function FormStepsBack(props: FormStepsBackProps) {
  useClaim("back");
  return <StepsBack {...props} />;
}

export type FormStepsProgressProps = Omit<ComponentPropsWithRef<"p">, "children">;

/** How far along the form is, as FormSteps draws it. @internal */
function StepsProgress({ className = "", ...props }: FormStepsProgressProps) {
  const shared = useContext(SharedContext);
  if (!shared) return null;
  const { position, total, reviewing, sent } = shared.controls;
  if (reviewing || sent || total < 2) return null;
  return (
    <p {...props} className={`x-govuk-ui-form-steps-progress ${className}`.trim()}>
      {shared.labels.progress(position + 1, total)}
    </p>
  );
}

/**
 * How far along the form is, such as "Question 2 of 5", among the steps that apply to the answers
 * so far. It shows while two steps or more apply, until Check your answers. While one is in the
 * form, FormSteps draws no progress of its own, neither these words nor a card's ring.
 */
export function FormStepsProgress(props: FormStepsProgressProps) {
  useClaim("progress");
  return <StepsProgress {...props} />;
}

export type FormStepsSummaryProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  /**
   * The heading above the answers. By default, on a page, its `checkAnswers` label, "Check your
   * answers", until the answers are sent. Give null for none, such as below a heading of your own.
   */
  title?: ReactNode;
  /**
   * The level of its heading. By default, 1 on a page, as the page's heading, and 3 in a card. A
   * section beneath a heading of your own takes 2.
   */
  titleLevel?: 1 | 2 | 3 | 4;
  /**
   * The steps whose answers it lists, by their places among the steps, from 0, such as a section
   * of the form. By default, every step that applies.
   */
  steps?: readonly number[];
  /** Rows of your own after the answers, as SummaryListRow parts. */
  children?: ReactNode;
};

/** The answers, as FormSteps lists them. @internal */
function StepsSummary({
  claims = false,
  title,
  titleLevel,
  steps: only,
  children,
  className = "",
  ...props
}: FormStepsSummaryProps & {
  /** Whether it takes the form's own list's place, as a FormStepsSummary does. */
  claims?: boolean;
}) {
  const shared = useContext(SharedContext);
  const listed = useFormStepsAnswers({ summary: claims });
  if (!shared || !listed) return null;
  const { controls, labels, layout, replaced } = shared;
  const { reviewing, sent } = controls;
  const { answers, change } = listed;
  if (!(reviewing || sent) || replaced) return null;
  const card = layout === "card";
  const rows = only ? answers.filter((answer) => only.includes(answer.step)) : answers;
  if (only && rows.length === 0 && !children) return null;
  const heading = title === undefined ? (card || sent ? null : labels.checkAnswers) : title;
  const Heading = `h${titleLevel ?? (card ? 3 : 1)}` as const;
  return (
    <div {...props} className={`x-govuk-ui-form-steps-review ${className}`.trim()}>
      {present(heading) && (
        <Heading className="x-govuk-ui-form-steps-review-title" tabIndex={-1}>
          {heading}
        </Heading>
      )}
      <SummaryList
        className="x-govuk-ui-form-steps-summary"
        tabIndex={card ? -1 : undefined}
        noBorder={card}
      >
        {rows.map((row, index) => {
          const muted = row.skipped || row.values.length === 0;
          const values = row.skipped
            ? [labels.skipped]
            : row.values.length > 0
              ? row.values
              : [labels.notAnswered];
          return (
            <SummaryListRow
              key={`${row.step}-${row.id || index}`}
              label={row.question}
              actions={
                <SummaryListAction
                  hiddenText={labels.changeAnswer(row.question)}
                  // biome-ignore lint/correctness/noChildrenProp: The words are its label.
                  children={labels.change}
                  onClick={() => change(row)}
                />
              }
            >
              {"summary" in row
                ? row.summary
                : values.map((value, place) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: answers are listed in a fixed order.
                      key={place}
                      className="x-govuk-ui-form-steps-answer"
                      data-muted={muted || undefined}
                    >
                      {value}
                    </span>
                  ))}
            </SummaryListRow>
          );
        })}
        {children}
      </SummaryList>
    </div>
  );
}

/**
 * The answers as Check your answers lists them, each with Change, where you place it among the
 * form's steps. It shows on Check your answers, and stays once the answers are sent. Give each of
 * several a `title` and the `steps` of a section, as GOV.UK lists a long form's answers. While one
 * is in the form, FormSteps lists no answers of its own. Put it inside the form, because a
 * FormStepsProvider does not carry the answers.
 */
export function FormStepsSummary(props: FormStepsSummaryProps) {
  return <StepsSummary {...props} claims />;
}
