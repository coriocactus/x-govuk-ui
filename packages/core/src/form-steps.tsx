"use client";

import {
  Children,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
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
import { BackLink } from "./back-link";
import { Button, ButtonGroup } from "./button";
import { useControllableState } from "./controllable-state";
import { FormContext, type FormField, present } from "./field";
import { Form, type FormErrors, type FormProps } from "./form";
import { Kbd } from "./kbd";
import { useLabels } from "./labels";
import { Panel } from "./panel";
import { SummaryList, SummaryListAction, SummaryListRow } from "./summary-list";
import { Tag } from "./tag";

// biome-ignore lint/suspicious/noConfusingVoidType: a step that only saves returns nothing.
type Outcome = FormErrors | void | Promise<FormErrors | void>;

export type FormStepProps = {
  /**
   * A heading for a step that asks several things. A step that asks one thing can leave it out,
   * and its field's own label or legend is the question.
   */
  title?: ReactNode;
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
  /** Added to the step. */
  className?: string;
};

/** One step of FormSteps. It shows nothing itself, because FormSteps shows each step in turn. */
export function FormStep(_props: FormStepProps): ReactNode {
  return null;
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
   * sent.
   */
  checkAnswers?: boolean;
  /** Offers Back from the second step on. */
  back?: boolean;
  /** Shows how far along the form is, such as "Question 2 of 5", or the card's ring. */
  progress?: boolean;
  /**
   * Lists the errors in an Error summary that takes focus, as GOV.UK does. Without it, each field
   * shows only its own message. On by default, except in a card.
   */
  errorSummary?: boolean;
  /** Command or Control with Enter sends the step from anywhere in it. The card shows the keys. */
  keyboardShortcut?: boolean;
  /** Each step is a place in the browser's history, so Back in the browser goes back a step. */
  history?: boolean;
  /**
   * Keeps the answers and the step in local storage under this key, so users continue where they
   * left off. They are cleared once the form is sent. Answers stay in the browser, so leave out
   * anything sensitive.
   */
  storageKey?: string;
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

type Saved = { at: number; passed: number[]; skipped: number[]; answers: [string, string][] };
type Row = {
  step: number;
  label: ReactNode;
  values: ReactNode[];
  id: string;
  skipped?: boolean;
  /** The step's own summary of its answer, in place of the values. */
  own?: ReactNode;
};

function readSaved(key: string | undefined): Saved | null {
  if (!key || typeof localStorage === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as Saved | null;
  } catch {
    return null;
  }
}
function writeSaved(key: string | undefined, saved: Saved | null) {
  if (!key) return;
  try {
    if (saved) localStorage.setItem(key, JSON.stringify(saved));
    else localStorage.removeItem(key);
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
 * Gives a step's fields a Form that also records them for the step, by name, so Check your answers
 * can list each question the step asks.
 */
function StepFields({
  index,
  fields,
  children,
}: {
  index: number;
  fields: RefObject<Map<number, Map<string, FormField>>>;
  children: ReactNode;
}) {
  const form = useContext(FormContext);
  const parent = form?.register;
  const register = useCallback(
    (name: string, field: FormField) => {
      const unregister = parent?.(name, field);
      const own = fields.current.get(index) ?? new Map<string, FormField>();
      fields.current.set(index, own);
      own.set(name, field);
      return () => {
        unregister?.();
        if (own.get(name) === field) own.delete(name);
      };
    },
    [parent, fields, index],
  );
  const value = useMemo(() => form && { ...form, register }, [form, register]);
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
  history: historyOn = false,
  storageKey,
  onComplete,
  step: controlledStep,
  defaultStep = 0,
  onStepChange,
  done: doneContent,
  labels: ownLabels,
  className = "",
  ...formProps
}: FormStepsProps) {
  const labels = useLabels("formSteps", defaultFormStepsLabels, ownLabels);
  const doneLabel = layout === "card" ? labels.answered : labels.sent;
  const steps = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => child.props as FormStepProps);
  const count = steps.length;
  const [saved] = useState(() => readSaved(storageKey));
  const [restored] = useState(() => {
    const answers: Record<string, string[]> = {};
    for (const [name, value] of saved?.answers ?? [])
      answers[name] = [...(answers[name] ?? []), value];
    return answers;
  });
  // Where the form is, as a step's index, or `count` for Check your answers.
  const [at, setAt] = useControllableState(
    controlledStep,
    () => Math.min(saved?.at ?? defaultStep, count),
    onStepChange,
  );
  const [passed, setPassed] = useState(() => new Set(saved?.passed ?? []));
  const [skipped, setSkipped] = useState(() => new Set(saved?.skipped ?? []));
  const [plan, setPlan] = useState(() => steps.map((_, index) => index));
  const [rows, setRows] = useState<Row[]>([]);
  // The fields each step asks, by name, as they register with the Form.
  const stepFields = useRef(new Map<number, Map<string, FormField>>());
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const returning = useRef(false);
  const form = useRef<HTMLFormElement | null>(null);
  const focusNext = useRef<string | null>(null);
  const titleId = useId();
  const historyKey = `x-govuk-ui-form-steps:${storageKey ?? titleId}`;
  const reviewing = at >= count;
  const step = steps[at];

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: the plan is worked out once mounted.
  useLayoutEffect(() => {
    replan();
  }, []);

  /** Keeps the answers and the step, when there is a key. */
  const remember = (where = at, passing = passed, skipping = skipped) => {
    if (!storageKey || !form.current) return;
    const answers = [...new FormData(form.current).entries()].flatMap(([name, value]) =>
      typeof value === "string" ? [[name, value] as [string, string]] : [],
    );
    writeSaved(storageKey, { at: where, passed: [...passing], skipped: [...skipping], answers });
  };
  const rememberSoon = useRef(0);

  const go = (where: number, { push = true, route = replan(), skipping = skipped } = {}) => {
    if (where >= count) setRows(route.flatMap((index) => summaryRows(index, skipping)));
    setAt(where);
    focusNext.current = where >= count ? "summary" : "step";
    if (historyOn && push)
      window.history.pushState({ ...window.history.state, [historyKey]: where }, "");
  };
  const summaryRows = (index: number, skipping: Set<number>): Row[] => {
    if (!form.current) return [];
    const data = new FormData(form.current);
    // The step's questions in the page's order, leaving out any users cannot see.
    const place = (id: string) => document.getElementById(id);
    const asked = [...(stepFields.current.get(index) ?? [])]
      .filter(([, field]) => field.shown?.() !== false)
      .sort(([, a], [, b]) => {
        const [first, second] = [place(a.id), place(b.id)];
        if (!first || !second) return 0;
        return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      });
    const each = asked.map(([name, field]): Row => {
      const values = answersOf(field, name, data);
      return {
        step: index,
        label: field.label,
        values: values.length > 0 ? values : [labels.notAnswered],
        id: field.id,
      };
    });
    if (skipping.has(index))
      return each.map((row) => ({ ...row, values: [labels.skipped], skipped: true }));
    const own = steps[index]?.summary;
    if (own)
      return [
        {
          step: index,
          label: steps[index]?.title ?? each[0]?.label,
          values: [],
          id: each[0]?.id ?? "",
          own: own(data),
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
      if (wanted === "summary")
        return root
          .closest(".x-govuk-ui-form-steps")
          ?.querySelector<HTMLElement>(
            ".x-govuk-ui-form-steps-review-title, .x-govuk-ui-panel-title, .x-govuk-ui-form-steps-summary, .x-govuk-ui-form-steps-done",
          )
          ?.focus();
      if (wanted.startsWith("#")) {
        // A question asked again takes focus at its answer, or at the chosen answer of a group.
        const field = document.getElementById(wanted.slice(1));
        const group = field?.closest("fieldset:not([data-step])");
        return (group?.querySelector<HTMLElement>("input:checked") ?? field)?.focus();
      }
      const current = root.querySelector<HTMLElement>(`[data-step="${at}"]`);
      const heading = layout === "page" ? current?.querySelector<HTMLElement>("h1") : null;
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
        return;
      }
      (
        current?.querySelector<HTMLElement>("input:checked") ??
        current?.querySelector<HTMLElement>(
          "input:not([type=hidden]), textarea, select, button[role=combobox], [tabindex='0']",
        )
      )?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [at, sent]);

  // With history, the browser's Back and Forward move between the steps.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the listener is set once.
  useEffect(() => {
    if (!historyOn) return;
    window.history.replaceState({ ...window.history.state, [historyKey]: at }, "");
    const moved = (event: PopStateEvent) => {
      const where = event.state?.[historyKey];
      if (typeof where === "number") go(where, { push: false });
    };
    window.addEventListener("popstate", moved);
    return () => window.removeEventListener("popstate", moved);
  }, [historyOn, historyKey]);

  const finish = async (data: FormData, skipping = skipped) => {
    const element = form.current;
    if (!onComplete) {
      writeSaved(storageKey, null);
      element?.submit();
      return;
    }
    setBusy(true);
    const errors = await onComplete(data);
    setBusy(false);
    const wrong = Object.entries(errors ?? {}).filter(([, message]) => message);
    if (wrong.length > 0) {
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
    writeSaved(storageKey, null);
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
      if (errors && Object.values(errors).some(Boolean)) return errors;
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
    go(next, { route, skipping });
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
    go(next, { route, skipping });
    remember(next, passing, skipping);
  };

  const previous = plan.filter((index) => index < at).at(-1);
  const goBack = () => {
    returning.current = false;
    if (previous !== undefined) go(previous);
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
  const showSteps = !(sent && doneContent);

  const ring = 2 * Math.PI * 7;
  const progressRing = card && progress && (
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
    back && !sent && previous !== undefined ? (
      card ? (
        <Button variant="outline" size="small" onClick={goBack}>
          {labels.back}
        </Button>
      ) : (
        <BackLink
          className="x-govuk-ui-form-steps-back"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            goBack();
          }}
        >
          {labels.back}
        </BackLink>
      )
    ) : null;

  // The last press sends the answers, with the success sound once they are taken.
  const submit = (
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
  const skipControl =
    step?.optional && !reviewing && !sent ? (
      <Button
        variant={card ? "outline" : "secondary"}
        size={card ? "small" : undefined}
        onClick={skip}
      >
        {labels.skip}
      </Button>
    ) : null;

  const summary = (
    <div className="x-govuk-ui-form-steps-review">
      {/* Once sent, a page says so in a Panel above the answers. */}
      {!card && sent && <Panel title={doneLabel} titleLevel={2} />}
      {!card && !sent && (
        <h2 className="x-govuk-ui-form-steps-review-title" tabIndex={-1}>
          {labels.checkAnswers}
        </h2>
      )}
      <SummaryList
        className="x-govuk-ui-form-steps-summary"
        tabIndex={card ? -1 : undefined}
        noBorder={card}
      >
        {rows.map((row, index) => (
          <SummaryListRow
            key={`${row.step}-${row.id || index}`}
            label={row.label}
            actions={
              <SummaryListAction
                hiddenText={labels.changeAnswer(row.label)}
                // biome-ignore lint/correctness/noChildrenProp: The words are its label.
                children={labels.change}
                onClick={() => {
                  returning.current = true;
                  setSent(false);
                  go(row.step);
                  if (row.id) focusNext.current = `#${row.id}`;
                }}
              />
            }
          >
            {"own" in row
              ? row.own
              : row.values.map((value, place) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: answers are listed in a fixed order.
                    key={place}
                    className="x-govuk-ui-form-steps-answer"
                    data-muted={
                      row.skipped ||
                      (value === labels.notAnswered && row.values.length === 1) ||
                      undefined
                    }
                  >
                    {value}
                  </span>
                ))}
          </SummaryListRow>
        ))}
      </SummaryList>
    </div>
  );

  const body = (
    <div className="x-govuk-ui-form-steps-body">
      {!card && progress && !reviewing && !sent && plan.length > 1 && (
        <p className="x-govuk-ui-form-steps-progress">
          {labels.progress(position + 1, plan.length)}
        </p>
      )}
      {steps.map((each, index) => (
        // Every step stays in the form, so answers are kept as users move back and forth. Steps
        // skipped or not asked are disabled while out of sight, so their answers are not sent.
        <fieldset
          // biome-ignore lint/suspicious/noArrayIndexKey: steps are places in the form's order.
          key={index}
          role="presentation"
          className={`x-govuk-ui-form-step ${each.className ?? ""}`.trim()}
          data-step={index}
          hidden={index !== at || sent}
          disabled={index !== at && (skipped.has(index) || !plan.includes(index))}
        >
          {layout === "page" && title && (
            <span className="x-govuk-ui-form-steps-caption">{title}</span>
          )}
          {each.title &&
            (layout === "page" ? (
              <h1 className="x-govuk-ui-form-step-title">{each.title}</h1>
            ) : (
              <h3 className="x-govuk-ui-form-step-title">{each.title}</h3>
            ))}
          {each.hint && <div className="x-govuk-ui-hint">{each.hint}</div>}
          <div className="x-govuk-ui-form-step-fields">
            <StepFields index={index} fields={stepFields}>
              {each.children}
            </StepFields>
          </div>
        </fieldset>
      ))}
      {(reviewing || sent) && showSteps && summary}
      {sent && doneContent && (
        <div className="x-govuk-ui-form-steps-done" tabIndex={-1}>
          {doneContent}
        </div>
      )}
    </div>
  );

  return (
    <section
      className={`x-govuk-ui-form-steps ${className}`.trim()}
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
        ref={form}
        className="x-govuk-ui-form-steps-form"
        // Pressing anywhere in it that is not a control puts focus in the form, so keys that work
        // across it, such as Choices' letters, reach it.
        tabIndex={-1}
        errorSummary={errorSummary}
        defaultValues={restored}
        validate={(data) => (reviewing || !step?.validate ? {} : step.validate(data))}
        onSubmit={(data) => onSubmit(data)}
        onKeyDown={onKeyDown}
        onInput={() => {
          window.clearTimeout(rememberSoon.current);
          rememberSoon.current = window.setTimeout(() => {
            replan();
            remember();
          }, 300);
        }}
        onChange={() => replan()}
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
            </ButtonGroup>
          )
        )}
      </Form>
    </section>
  );
}
