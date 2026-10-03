import { type ReactNode, useEffect, useState } from "react";
import { Button, PlanCard, ReasoningStep, Spinner, Tag } from "x-govuk-ui";

type Props = { title?: string; description?: boolean };

const steps = [
  "Add refused to the application's statuses",
  "Show the decision in the summary",
  "Run the tests",
];

export default function PlanCardExample({
  title = "Show refused applications in the summary",
  description = true,
}: Props) {
  // Approved, the plan runs one step at a time.
  const [state, setState] = useState<"proposed" | "running" | "done" | "rejected">("proposed");
  const [step, setStep] = useState(0);
  // Running, each step takes a moment, then the next starts, until every step is done.
  useEffect(() => {
    if (state !== "running") return;
    const timer = setTimeout(() => {
      if (step < steps.length - 1) setStep(step + 1);
      else {
        setStep(steps.length);
        setState("done");
      }
    }, 1300);
    return () => clearTimeout(timer);
  }, [state, step]);
  const approve = () => {
    setState("running");
    setStep(0);
  };
  const reset = () => {
    setState("proposed");
    setStep(0);
  };
  // The card's actions, which are Approve and Reject while proposed, progress while running, and
  // the outcome with Start again afterwards.
  let actions: ReactNode;
  if (state === "proposed")
    actions = (
      <>
        <Button size="small" onClick={approve}>
          Approve
        </Button>
        <Button size="small" variant="outline" onClick={() => setState("rejected")}>
          Reject
        </Button>
      </>
    );
  else if (state === "running")
    actions = (
      <span className="preview-plan-status" role="status">
        <Spinner size="small" />
        Running step {step + 1} of {steps.length}
      </span>
    );
  else
    actions = (
      <>
        <Tag colour={state === "done" ? "green" : "grey"} variant="outline">
          {state === "done" ? "Done" : "Rejected"}
        </Tag>
        <Button size="small" variant="outline" onClick={reset}>
          Start again
        </Button>
      </>
    );
  // Where each step is. It is done once the plan is, or once the run passes it.
  const statusOf = (index: number) => {
    if (state === "done" || (state === "running" && index < step)) return "done";
    return state === "running" && index === step ? "active" : "pending";
  };
  return (
    <PlanCard
      title={title}
      description={description ? "I'll change 1 file, then run the tests." : undefined}
      actions={actions}
    >
      {steps.map((name, index) => (
        <ReasoningStep key={name} status={statusOf(index)}>
          {name}
        </ReasoningStep>
      ))}
    </PlanCard>
  );
}
