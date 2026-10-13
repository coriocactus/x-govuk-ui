"use client";

import { type ComponentPropsWithRef, type ReactNode, useEffect, useRef, useState } from "react";
import { AutoHeight } from "./auto-height";
import { Button, ButtonGroup } from "./button";
import { Form } from "./form";
import { useLabels } from "./labels";
import { Textarea } from "./textarea";

export type FeedbackReport = { doing: string; wrong: string };

export type FeedbackProps = Omit<ComponentPropsWithRef<"div">, "onAnswer" | "onReport"> & {
  /** Called with whether the page was useful. */
  onAnswer?: (useful: boolean) => void;
  /** Called with what users were doing and what went wrong. */
  onReport?: (report: FeedbackReport) => void;
  /** The question, in place of its `question` label, "Is this page useful?". */
  question?: ReactNode;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<FeedbackLabels>;
};

/** The words Feedback writes, which a LabelsProvider or its `labels` can change. */
export type FeedbackLabels = {
  /** The question, unless it is given its own. */
  question: ReactNode;
  /** Yes, with what it answers for screen readers. */
  yes: ReactNode;
  /** No, with what it answers for screen readers. */
  no: ReactNode;
  report: ReactNode;
  formTitle: ReactNode;
  formHint: ReactNode;
  doing: ReactNode;
  wrong: ReactNode;
  send: ReactNode;
  cancel: ReactNode;
  thanks: ReactNode;
};

export const defaultFeedbackLabels: FeedbackLabels = {
  question: "Is this page useful?",
  yes: (
    <>
      Yes<span className="x-govuk-ui-visually-hidden"> this page is useful</span>
    </>
  ),
  no: (
    <>
      No<span className="x-govuk-ui-visually-hidden"> this page is not useful</span>
    </>
  ),
  report: "Report a problem with this page",
  formTitle: "Help us improve GOV.UK",
  formHint:
    "Don't include personal or financial information like your National Insurance number or credit card details.",
  doing: "What were you doing?",
  wrong: "What went wrong?",
  send: "Send",
  cancel: "Cancel",
  thanks: "Thank you for your feedback",
};

type Stage = "ask" | "report" | "thanks";

/**
 * GOV.UK's "Is this page useful?" at the foot of a page, with Yes and No, and a button to report a
 * problem. It shows one stage at a time, as GOV.UK's does, so once users answer, the question
 * gives way. Yes turns to thanks. No and the report button turn to a short Form. The Form's Cancel
 * brings the question back, and sending the Form turns to thanks. The thanks take focus, so screen
 * readers hear them. The band eases to each stage's height while its words change at once, with
 * the same AutoHeight as FormSteps' card. The buttons are outline Buttons, which stand out on the
 * tinted band.
 */
export function Feedback({
  onAnswer,
  onReport,
  question: ownQuestion,
  labels: ownLabels,
  className = "",
  ...props
}: FeedbackProps) {
  const labels = useLabels("feedback", defaultFeedbackLabels, ownLabels);
  const question = ownQuestion ?? labels.question;
  const [stage, setStage] = useState<Stage>("ask");
  // What users typed is kept if they cancel and come back.
  const [doing, setDoing] = useState("");
  const [wrong, setWrong] = useState("");
  // The button that opened the form takes focus back if the form is cancelled.
  const opener = useRef<"no" | "report">("report");
  const no = useRef<HTMLButtonElement>(null);
  const report = useRef<HTMLButtonElement>(null);
  const thanks = useRef<HTMLParagraphElement>(null);
  const form = useRef<HTMLFormElement>(null);
  // Focus moves only once users have answered, not as the band first appears.
  const answered = useRef(false);
  useEffect(() => {
    if (!answered.current) return;
    if (stage === "thanks") thanks.current?.focus();
    if (stage === "report") form.current?.querySelector("textarea")?.focus();
    if (stage === "ask") (opener.current === "no" ? no : report).current?.focus();
  }, [stage]);
  const go = (next: Stage) => {
    answered.current = true;
    setStage(next);
  };
  const open = (from: "no" | "report") => {
    opener.current = from;
    go("report");
  };

  return (
    <div {...props} className={`x-govuk-ui-feedback ${className}`.trim()}>
      <AutoHeight>
        {stage === "ask" && (
          <div className="x-govuk-ui-feedback-row">
            {/* The question and its answers stay together, so on a narrow page they keep a row
                of their own above the report button, as GOV.UK's do. */}
            <div className="x-govuk-ui-feedback-answer">
              <h2 className="x-govuk-ui-feedback-question">{question}</h2>
              {/* Yes and No keep together in a row, beside the question or beneath it. */}
              <ButtonGroup stack={false}>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    onAnswer?.(true);
                    go("thanks");
                  }}
                >
                  {labels.yes}
                </Button>
                <Button
                  ref={no}
                  variant="outline"
                  size="small"
                  onClick={() => {
                    onAnswer?.(false);
                    open("no");
                  }}
                >
                  {labels.no}
                </Button>
              </ButtonGroup>
            </div>
            <Button
              ref={report}
              variant="outline"
              size="small"
              className="x-govuk-ui-feedback-report"
              onClick={() => open("report")}
            >
              {labels.report}
            </Button>
          </div>
        )}
        {stage === "report" && (
          <Form
            ref={form}
            className="x-govuk-ui-feedback-form"
            errorSummary={false}
            onSubmit={() => {
              onReport?.({ doing, wrong });
              go("thanks");
            }}
          >
            <h2 className="x-govuk-ui-feedback-form-heading">{labels.formTitle}</h2>
            <p className="x-govuk-ui-feedback-form-hint">{labels.formHint}</p>
            <Textarea
              name="doing"
              label={labels.doing}
              rows={2}
              value={doing}
              onChange={(event) => setDoing(event.target.value)}
            />
            <Textarea
              name="wrong"
              label={labels.wrong}
              rows={2}
              value={wrong}
              onChange={(event) => setWrong(event.target.value)}
            />
            <ButtonGroup>
              <Button type="submit">{labels.send}</Button>
              <Button variant="outline" onClick={() => go("ask")}>
                {labels.cancel}
              </Button>
            </ButtonGroup>
          </Form>
        )}
        {stage === "thanks" && (
          <p ref={thanks} className="x-govuk-ui-feedback-thanks" role="status" tabIndex={-1}>
            {labels.thanks}
          </p>
        )}
      </AutoHeight>
    </div>
  );
}
