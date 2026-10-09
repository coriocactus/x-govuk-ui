"use client";

import {
  Children,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AutoHeight } from "./auto-height";
import { BackLink } from "./back-link";
import { Button, ButtonGroup } from "./button";
import { Form, type FormErrors, type FormProps } from "./form";
import { dateFromParts } from "./helpers";
import { Kbd } from "./kbd";
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
  /** The step's button, in place of the form's own. */
  continueLabel?: string;
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
  checkAnswersTitle?: ReactNode;
  /** Offers Back from the second step on. */
  back?: boolean;
  /** Shows how far along the form is, such as "Question 2 of 5", or the card's ring. */
  progress?: boolean;
  progressLabel?: (step: number, total: number) => string;
  /**
   * Lists the errors in an Error summary that takes focus, as GOV.UK does. Without it, each field
   * shows only its own message. On by default, except in a card.
   */
  errorSummary?: boolean;
  /** Command or Control with Enter sends the step from anywhere in it. The card shows the keys. */
  shortcut?: boolean;
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
  onStepChange?: (step: number) => void;
  /**
   * Shows in place of the steps once the answers are sent. Without it, the answers stay on show,
   * with Change.
   */
  done?: ReactNode;
  continueLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  /** The last button, which sends the answers. */
  submitLabel?: string;
  /** Says that the answers have been sent, when there is no `done`. */
  doneLabel?: string;
  /** Shown for a question that was skipped, or left empty. */
  skippedLabel?: string;
  notAnsweredLabel?: string;
};

type Saved = { at: number; passed: number[]; skipped: number[]; answers: [string, string][] };
type Row = {
  step: number;
  label: string;
  values: string[];
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
 * The words of a label, legend or answer, without hints, markers or words only screen readers hear.
 */
function wordsOf(element: Element | null | undefined) {
  if (!element) return "";
  const copy = element.cloneNode(true) as Element;
  for (const extra of copy.querySelectorAll(
    '[aria-hidden="true"], .x-govuk-ui-hint, .x-govuk-ui-choice-list-hint, .x-govuk-ui-choice-hint, .x-govuk-ui-visually-hidden, input, .x-govuk-ui-conditional',
  ))
    extra.remove();
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Whether something is hidden by a part of its step, not by the step being out of sight. */
function hiddenWithin(element: Element, step: Element) {
  const hidden = element.closest("[hidden]");
  return Boolean(hidden && hidden !== step && step.contains(hidden));
}

/**
 * The answers on a step, with a row for each question, in the order the questions come. Each group
 * of radios, checkboxes, choices, date or time goes under its legend. Each other field goes under
 * its label.
 */
function rowsOf(step: HTMLElement, index: number, notAnswered: string): Row[] {
  const rows: Row[] = [];
  const grouped = new Set<Element>();
  const controls = step.querySelectorAll<HTMLInputElement>(
    "input:not([type=hidden]):not([type=button]):not([type=submit]), textarea, select",
  );
  for (const control of controls) {
    // Skip what is hidden within the step, such as inside a closed follow-up question, or a Base UI
    // control's own input that keeps its value out of sight. The step itself may be out of sight.
    if (
      hiddenWithin(control, step) ||
      control.closest(".x-govuk-ui-conditional:not([data-open])") ||
      control.matches('[aria-hidden="true"], [tabindex="-1"]')
    )
      continue;
    const group = control.closest(
      ".x-govuk-ui-fieldset:has(> .x-govuk-ui-choices, > .x-govuk-ui-choice-list, .x-govuk-ui-date-input, .x-govuk-ui-time-input)",
    );
    const inChoices =
      control.matches("[type=radio], [type=checkbox], .x-govuk-ui-choice-list-other") ||
      control.closest(".x-govuk-ui-date-input, .x-govuk-ui-time-input");
    if (group && inChoices) {
      if (grouped.has(group)) continue;
      grouped.add(group);
      const legend = wordsOf(group.querySelector(":scope > legend"));
      const values: string[] = [];
      // A time's box is a date's box too, so the time is looked for first.
      const time = group.querySelector(".x-govuk-ui-time-input");
      const date = time ? null : group.querySelector(".x-govuk-ui-date-input");
      if (time) {
        const parts = [...time.querySelectorAll<HTMLInputElement>("input")].map((part) =>
          part.value.trim(),
        );
        if (parts[0])
          values.push(`${parts[0]}:${parts[1] || "00"}${parts[2] ? ` ${parts[2]}` : ""}`);
      } else if (date) {
        const [day, month, year] = [...date.querySelectorAll<HTMLInputElement>("input")].map(
          (part) => part.value.trim(),
        );
        if (day || month || year) {
          const real = dateFromParts({ day: day ?? "", month: month ?? "", year: year ?? "" });
          values.push(
            real
              ? `${real.getDate()} ${MONTHS[real.getMonth()]} ${real.getFullYear()}`
              : [day, month, year].join("/"),
          );
        }
      } else {
        for (const choice of group.querySelectorAll<HTMLInputElement>(
          "input[type=radio]:checked, input[type=checkbox]:checked",
        ))
          if (choice.closest(".x-govuk-ui-fieldset") === group)
            values.push(wordsOf(choice.labels?.[0]));
        const other = group.querySelector<HTMLInputElement>(".x-govuk-ui-choice-list-other[name]");
        if (other?.value.trim()) values.push(other.value.trim());
      }
      const first = group.querySelector<HTMLElement>("input");
      rows.push({ step: index, label: legend, values, id: first?.id ?? "" });
      continue;
    }
    // A Select shows its choice in its trigger, and a hidden input keeps its value.
    const label =
      wordsOf(control.labels?.[0]) ||
      control.getAttribute("aria-label") ||
      wordsOf(document.getElementById(control.getAttribute("aria-labelledby") ?? ""));
    const shown = control.value;
    rows.push({ step: index, label, values: shown.trim() ? [shown.trim()] : [], id: control.id });
  }
  // Each Select, whose value is in a hidden input beside the button that shows it.
  for (const select of step.querySelectorAll(".x-govuk-ui-select-trigger")) {
    if (hiddenWithin(select, step) || select.closest(".x-govuk-ui-conditional:not([data-open])"))
      continue;
    const field = select.closest(".x-govuk-ui-field");
    const hidden = field?.querySelector<HTMLInputElement>("input[type=hidden][name]");
    rows.push({
      step: index,
      label: wordsOf(field?.querySelector("label")),
      values: hidden?.value ? [wordsOf(select.querySelector(".x-govuk-ui-select-value"))] : [],
      id: select.id,
    });
  }
  for (const row of rows) if (row.values.length === 0) row.values = [notAnswered];
  return rows;
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
  checkAnswersTitle = "Check your answers",
  back = true,
  progress = true,
  progressLabel = (step, total) => `Question ${step} of ${total}`,
  errorSummary = layout !== "card",
  shortcut = true,
  history: historyOn = false,
  storageKey,
  onComplete,
  onStepChange,
  done: doneContent,
  continueLabel = "Continue",
  backLabel = "Back",
  skipLabel = "Skip",
  submitLabel = "Submit",
  doneLabel = layout === "card" ? "Answered" : "Your answers have been sent",
  skippedLabel = "Skipped",
  notAnsweredLabel = "Not answered",
  className = "",
  ...formProps
}: FormStepsProps) {
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
  const [at, setAt] = useState(() => Math.min(saved?.at ?? 0, count));
  const [passed, setPassed] = useState(() => new Set(saved?.passed ?? []));
  const [skipped, setSkipped] = useState(() => new Set(saved?.skipped ?? []));
  const [plan, setPlan] = useState(() => steps.map((_, index) => index));
  const [rows, setRows] = useState<Row[]>([]);
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
    onStepChange?.(where);
    focusNext.current = where >= count ? "summary" : "step";
    if (historyOn && push)
      window.history.pushState({ ...window.history.state, [historyKey]: where }, "");
  };
  const summaryRows = (index: number, skipping: Set<number>): Row[] => {
    const element = form.current?.querySelector<HTMLElement>(`[data-step="${index}"]`);
    if (!element) return [];
    const each = rowsOf(element, index, notAnsweredLabel);
    if (skipping.has(index))
      return each.map((row) => ({ ...row, values: [skippedLabel], skipped: true }));
    const own = steps[index]?.summary;
    if (own && form.current) {
      const title = steps[index]?.title;
      const label = typeof title === "string" ? title : each[0]?.label;
      return [
        {
          step: index,
          label: label ?? "",
          values: [],
          id: each[0]?.id ?? "",
          own: own(new FormData(form.current)),
        },
      ];
    }
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
        const group = field?.closest(".x-govuk-ui-fieldset");
        return (group?.querySelector<HTMLElement>("input:checked") ?? field)?.focus();
      }
      const current = root.querySelector<HTMLElement>(`[data-step="${at}"]`);
      const heading =
        layout === "page" ? current?.querySelector<HTMLElement>("h1, .x-govuk-ui-legend h1") : null;
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
    if (!shortcut || event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  const position = reviewing ? plan.length : plan.indexOf(at);
  const settled = plan.filter((index) => passed.has(index) || skipped.has(index)).length;
  const last = !checkAnswers && plan.at(-1) === at;
  const label = reviewing || last ? submitLabel : (step?.continueLabel ?? continueLabel);
  const card = layout === "card";
  const showSteps = !(sent && doneContent);

  const ring = 2 * Math.PI * 7;
  const progressRing = card && progress && (
    <span
      className="x-govuk-ui-form-steps-ring"
      role="progressbar"
      aria-label="Questions answered"
      aria-valuemin={0}
      aria-valuemax={plan.length}
      aria-valuenow={sent ? plan.length : settled}
      aria-valuetext={sent || reviewing ? "All answered" : progressLabel(position + 1, plan.length)}
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
          {backLabel}
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
          {backLabel}
        </BackLink>
      )
    ) : null;

  // The last press sends the answers, with the success sound once they are taken.
  const submit = (
    <Button
      type="submit"
      size={card ? "small" : undefined}
      loading={busy}
      aria-keyshortcuts={shortcut ? "Meta+Enter Control+Enter" : undefined}
    >
      {label}
      {card && shortcut && (
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
        {skipLabel}
      </Button>
    ) : null;

  const summary = (
    <div className="x-govuk-ui-form-steps-review">
      {/* Once sent, a page says so in a Panel above the answers. */}
      {!card && sent && <Panel title={doneLabel} titleLevel={2} />}
      {!card && !sent && (
        <h2 className="x-govuk-ui-form-steps-review-title" tabIndex={-1}>
          {checkAnswersTitle}
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
                hiddenText={`your answer to ${row.label}`}
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
              : row.values.map((value) => (
                  <span
                    // An answer is listed once, so its words name it.
                    key={value}
                    className="x-govuk-ui-form-steps-answer"
                    data-muted={
                      row.skipped ||
                      (value === notAnsweredLabel && row.values.length === 1) ||
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
        <p className="x-govuk-ui-form-steps-progress">{progressLabel(position + 1, plan.length)}</p>
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
          <div className="x-govuk-ui-form-step-fields">{each.children}</div>
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
