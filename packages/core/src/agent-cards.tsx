"use client";

import { type ComponentPropsWithRef, type ReactNode, useId } from "react";
import { Choices } from "./choices";
import { DateInput } from "./date-input";
import type { FormErrors } from "./form";
import {
  defaultFormStepsLabels,
  FormStep,
  FormSteps,
  type FormStepsLabels,
  type FormStepsProps,
} from "./form-steps";
import { dateFromParts } from "./helpers";
import { Input } from "./input";
import { useLabels, useLocale } from "./labels";
import { Select, SelectItem } from "./select";

export type PlanCardProps = Omit<ComponentPropsWithRef<"section">, "title"> & {
  title: ReactNode;
  /** What the plan will do, in a sentence, such as "I'll change 1 file and run the tests." */
  description?: ReactNode;
  /** The plan's steps, as `ReasoningStep` parts, so they show what is done as the plan runs. */
  children: ReactNode;
  /** Buttons to approve or reject the plan, or what has happened to it. */
  actions?: ReactNode;
  /** Names the kind of card above the title. */
  eyebrow?: ReactNode;
};

/**
 * A plan that an agent asks to run, with its numbered steps and buttons to approve or reject it.
 * The steps are `ReasoningStep` parts from Reasoning steps, so once the plan is approved, they tick
 * off as it runs. The footer keeps its height whatever it contains, so the steps never move.
 */
export function PlanCard({
  title,
  description,
  children,
  actions,
  eyebrow = "Plan",
  className = "",
  ...props
}: PlanCardProps) {
  const heading = useId();
  return (
    <section
      {...props}
      className={`x-govuk-ui-agent-card x-govuk-ui-plan-card ${className}`.trim()}
      aria-labelledby={heading}
    >
      <p className="x-govuk-ui-agent-card-eyebrow">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 4h10M3 8h7M3 12h9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {eyebrow}
      </p>
      <h3 id={heading} className="x-govuk-ui-agent-card-title">
        {title}
      </h3>
      {description && <p className="x-govuk-ui-agent-card-description">{description}</p>}
      <ol className="x-govuk-ui-reasoning-steps x-govuk-ui-plan-card-steps">{children}</ol>
      {actions && <div className="x-govuk-ui-agent-card-footer">{actions}</div>}
    </section>
  );
}

export type QuestionOption = { value: string; label: ReactNode; hint?: ReactNode };

export type Question = {
  /** The name its answer submits under, and its key in the answers. */
  name: string;
  question: ReactNode;
  hint?: ReactNode;
  /**
   * The kind of answer. `"choice"` is a choice from `options`, with a letter or number for each.
   * `"text"` is some words, `"number"` a number and `"date"` a date. `"select"` is one answer from
   * a list of `options`. The default is `"choice"`.
   */
  type?: "choice" | "text" | "number" | "date" | "select";
  /** The answers to choose from, for a choice or a list. */
  options?: readonly QuestionOption[];
  /** For a choice, adds a last answer that takes any words, with these words as its placeholder. */
  other?: string;
  /** For a choice, lets users choose more than one answer. */
  multiple?: boolean;
  /** Removes Skip, so the question must be answered. */
  required?: boolean;
  /**
   * For a date, the earliest and latest dates it accepts, such as today for a date in the past.
   * The calendar and dials offer only the dates between them. A typed date outside them is an
   * error.
   */
  min?: Date;
  max?: Date;
  /** For a date, offers a Calendar to pick it from, beside the fields. */
  calendar?: boolean;
};

/**
 * Each answer, by question name. An answer is the chosen values, the words typed for the other
 * answer, the words or number typed, a date as YYYY-MM-DD, or null for a skipped question.
 */
export type QuestionAnswers = Record<string, string | string[] | null>;

/**
 * The words Question card writes, which a LabelsProvider or its `labels` can change. They are
 * FormSteps' words, with the card's own buttons, and its messages in GOV.UK's words.
 */
export type QuestionCardLabels = FormStepsLabels & {
  /** Asks for a choice in a Select. */
  chooseAnswer: string;
  /** Ends a message for a question that need not be answered. */
  orSkip: string;
  selectAnswer: string;
  enterAnswer: string;
  enterNumber: string;
  /** For words that are not a number. */
  numberLike: string;
  enterDate: string;
  /** For a day, month and year that make no date. */
  realDate: string;
  notAfterToday: string;
  notBeforeToday: string;
  /** For a date after the latest, written in the locale. */
  onOrBefore: (date: string) => string;
  /** For a date before the earliest, written in the locale. */
  onOrAfter: (date: string) => string;
};

export const defaultQuestionCardLabels: QuestionCardLabels = {
  ...defaultFormStepsLabels,
  continue: "Next",
  back: "Previous",
  submit: "Continue",
  chooseAnswer: "Choose an answer",
  orSkip: ", or skip this question",
  selectAnswer: "Select an answer",
  enterAnswer: "Enter your answer",
  enterNumber: "Enter a number",
  numberLike: "Enter a number, like 12",
  enterDate: "Enter a date",
  realDate: "Enter a real date",
  notAfterToday: "The date must be today or in the past",
  notBeforeToday: "The date must be today or in the future",
  onOrBefore: (date) => `The date must be on or before ${date}`,
  onOrAfter: (date) => `The date must be on or after ${date}`,
};

// Question card is FormSteps in its card layout, so it takes FormSteps' other props.
export type QuestionCardProps = Omit<
  FormStepsProps,
  "children" | "title" | "onComplete" | "layout" | "labels"
> & {
  /** The questions, asked one at a time. */
  questions: readonly Question[];
  /** Names the card in its header. */
  title?: ReactNode;
  /**
   * Called with every answer once the last question is answered or skipped. If it returns a
   * promise, such as one that saves the answers, the card waits for it with its button busy. If it
   * returns messages, keyed by the questions' names, the card goes back to the first question that
   * has one.
   */
  onComplete?: (answers: QuestionAnswers) => ReturnType<NonNullable<FormStepsProps["onComplete"]>>;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<QuestionCardLabels>;
  /** What marks each answer to a choice, which is a letter, a number or nothing. */
  markers?: "letters" | "numbers" | "none";
};

const ask = (question: Question) => question.type ?? "choice";

/** What is wrong with an answer, if anything, in GOV.UK's words. */
function problemWith(
  question: Question,
  data: FormData,
  labels: QuestionCardLabels,
  locale: string,
) {
  const value = (name: string) => String(data.get(name) ?? "").trim();
  const or = question.required ? "" : labels.orSkip;
  switch (ask(question)) {
    case "choice":
      return data.getAll(question.name).length || value(`${question.name}-other`)
        ? undefined
        : `${labels.selectAnswer}${or}`;
    case "select":
      return value(question.name) ? undefined : `${labels.selectAnswer}${or}`;
    case "text":
      return value(question.name) ? undefined : `${labels.enterAnswer}${or}`;
    case "number": {
      const typed = value(question.name).replaceAll(",", "");
      if (!typed) return `${labels.enterNumber}${or}`;
      return Number.isFinite(Number(typed)) ? undefined : labels.numberLike;
    }
    case "date": {
      const parts = ["day", "month", "year"].map((part) => value(`${question.name}-${part}`));
      if (parts.every((part) => !part)) return `${labels.enterDate}${or}`;
      const [day = "", month = "", year = ""] = parts;
      const date = dateFromParts({ day, month, year });
      if (!date) return labels.realDate;
      return outOfRange(date, labels, locale, question.min, question.max);
    }
  }
}

const dayOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** What is wrong with a date before the earliest or after the latest, in GOV.UK's words. */
function outOfRange(
  date: Date,
  labels: QuestionCardLabels,
  locale: string,
  min?: Date,
  max?: Date,
) {
  const today = dayOf(new Date()).getTime();
  const long = (when: Date) =>
    when.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  if (max && date > dayOf(max)) {
    return dayOf(max).getTime() === today ? labels.notAfterToday : labels.onOrBefore(long(max));
  }
  if (min && date < dayOf(min)) {
    return dayOf(min).getTime() === today ? labels.notBeforeToday : labels.onOrAfter(long(min));
  }
  return undefined;
}

/** A question's answer, from what the form sends. */
function answerTo(question: Question, data: FormData): string | string[] | null {
  const value = (name: string) => String(data.get(name) ?? "").trim();
  switch (ask(question)) {
    case "choice": {
      const chosen = data.getAll(question.name).map(String);
      const other = value(`${question.name}-other`);
      const all = other ? [...chosen, other] : chosen;
      if (all.length === 0) return question.multiple ? (data.has(question.name) ? [] : null) : null;
      return question.multiple ? all : (all[0] ?? null);
    }
    case "date": {
      const [day = "", month = "", year = ""] = ["day", "month", "year"].map((part) =>
        value(`${question.name}-${part}`),
      );
      const date = dateFromParts({ day, month, year });
      if (!date) return null;
      const pad = (number: number) => String(number).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
    default:
      return value(question.name) || null;
  }
}

/** The field that asks a question, by the kind of answer it wants. */
function fieldFor(
  question: Question,
  markers: QuestionCardProps["markers"],
  labels: QuestionCardLabels,
) {
  const { name, hint } = question;
  switch (ask(question)) {
    case "text":
      return <Input name={name} label={question.question} hint={hint} autoComplete="off" />;
    case "number":
      return (
        <Input
          name={name}
          label={question.question}
          hint={hint}
          inputMode="decimal"
          spellCheck={false}
          autoComplete="off"
          className="x-govuk-ui-question-card-number"
        />
      );
    case "date":
      return (
        <DateInput
          name={name}
          legend={question.question}
          hint={hint}
          min={question.min}
          max={question.max}
          calendar={question.calendar}
        />
      );
    case "select":
      return (
        <Select name={name} label={question.question} hint={hint} placeholder={labels.chooseAnswer}>
          {(question.options ?? []).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </Select>
      );
    default:
      return (
        <Choices
          name={name}
          legend={question.question}
          hint={hint}
          options={question.options ?? []}
          multiple={question.multiple}
          other={question.other}
          markers={markers}
        />
      );
  }
}

const icon = (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path
      d="M3 2.5h10A1.5 1.5 0 0 1 14.5 4v6.5A1.5 1.5 0 0 1 13 12H7l-3.5 2.5V12H3A1.5 1.5 0 0 1 1.5 10.5V4A1.5 1.5 0 0 1 3 2.5ZM4.5 6h7M4.5 8.5h4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Questions that an agent needs answered before it continues, asked one at a time in a card. It is
 * FormSteps in its card layout, made from a list of questions as an agent sends them.
 *
 * A question can ask for a choice from Choices, for words, a number or a date, or for one answer
 * from a list. In a choice, each answer has a letter, and pressing the letter chooses it. A last
 * answer can take any words.
 *
 * Continue, or Command with Enter, moves on. Back goes back. Skip passes over a question that need
 * not be answered. The card eases to each question's height while its words change at once. A ring
 * in the header fills as the questions are answered. When all are done, the card shows the answers
 * in a Summary list, each with Change.
 *
 * As in FormSteps, its `className` and `style` go on the card, and every other prop on its form.
 */
export function QuestionCard({
  questions,
  title = "Questions",
  onComplete,
  labels: ownLabels,
  markers = "letters",
  className = "",
  ...props
}: QuestionCardProps) {
  const labels = useLabels("questionCard", defaultQuestionCardLabels, ownLabels);
  const locale = useLocale();
  return (
    <FormSteps
      {...props}
      layout="card"
      title={title}
      icon={icon}
      className={`x-govuk-ui-question-card ${className}`.trim()}
      checkAnswers={false}
      labels={labels}
      onComplete={(data) =>
        onComplete?.(
          Object.fromEntries(
            questions.map((question) => [question.name, answerTo(question, data)]),
          ),
        )
      }
    >
      {questions.map((question) => (
        <FormStep
          key={question.name}
          optional={!question.required}
          validate={(data): FormErrors => ({
            [question.name]: problemWith(question, data, labels, locale),
          })}
        >
          {fieldFor(question, markers, labels)}
        </FormStep>
      ))}
    </FormSteps>
  );
}
