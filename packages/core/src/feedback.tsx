"use client";

import { type ComponentPropsWithRef, useEffect, useRef, useState } from "react";
import { AutoHeight } from "./auto-height";
import { Button, ButtonGroup } from "./button";
import { Form } from "./form";
import { Textarea } from "./textarea";

export type FeedbackReport = { doing: string; wrong: string };

export type FeedbackProps = Omit<ComponentPropsWithRef<"div">, "onAnswer" | "onReport"> & {
  /** Called with whether the page was useful. */
  onAnswer?: (useful: boolean) => void;
  /** Called with what users were doing and what went wrong. */
  onReport?: (report: FeedbackReport) => void;
  /** The question, as GOV.UK asks it at the foot of every page. */
  question?: string;
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
  question = "Is this page useful?",
  className = "",
  ...props
}: FeedbackProps) {
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
                  Yes<span className="x-govuk-ui-visually-hidden"> this page is useful</span>
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
                  No<span className="x-govuk-ui-visually-hidden"> this page is not useful</span>
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
              Report a problem with this page
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
            <h2 className="x-govuk-ui-feedback-form-heading">Help us improve GOV.UK</h2>
            <p className="x-govuk-ui-feedback-form-hint">
              Don't include personal or financial information like your National Insurance number or
              credit card details.
            </p>
            <Textarea
              name="doing"
              label="What were you doing?"
              rows={2}
              value={doing}
              onChange={(event) => setDoing(event.target.value)}
            />
            <Textarea
              name="wrong"
              label="What went wrong?"
              rows={2}
              value={wrong}
              onChange={(event) => setWrong(event.target.value)}
            />
            <ButtonGroup>
              <Button type="submit">Send</Button>
              <Button variant="outline" onClick={() => go("ask")}>
                Cancel
              </Button>
            </ButtonGroup>
          </Form>
        )}
        {stage === "thanks" && (
          <p ref={thanks} className="x-govuk-ui-feedback-thanks" role="status" tabIndex={-1}>
            Thank you for your feedback
          </p>
        )}
      </AutoHeight>
    </div>
  );
}
