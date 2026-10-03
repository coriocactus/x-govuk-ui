import { useEffect, useState } from "react";
import { Button, ReasoningStep, ReasoningSteps } from "x-govuk-ui";

type Props = { details?: boolean };

const steps = [
  { name: "Read the question", detail: "Can I renew my passport online?" },
  { name: "Searched GOV.UK", detail: "Found 3 pages about passports" },
  { name: "Checked the eligibility rules", detail: "Renew or replace your adult passport" },
  { name: "Wrote the answer", detail: "In plain English" },
];

export default function ReasoningStepsExample({ details = true }: Props) {
  // The steps run once, one at a time, then fold away. Replay runs them again.
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const active = step < steps.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Each replay starts the steps again.
  useEffect(() => {
    setStep(0);
    // The interval counts the steps itself and stops after the last, so it sets only the count.
    // React may call a state updater more than once, so an updater that stopped the timer would
    // stop it at every call.
    let reached = 0;
    const timer = setInterval(() => {
      reached += 1;
      setStep(reached);
      if (reached >= steps.length) clearInterval(timer);
    }, 1400);
    return () => clearInterval(timer);
  }, [run]);
  // Where each step is. All are done in the unseen copy, and in the live one as far as the run has
  // got.
  const statusOf = (live: boolean, index: number) => {
    if (!live || index < step) return "done";
    return index === step ? "active" : "pending";
  };
  const list = (live: boolean) =>
    steps.map((item, index) => (
      <ReasoningStep
        key={item.name}
        status={statusOf(live, index)}
        detail={details && (!live || index <= step) ? item.detail : undefined}
      >
        {item.name}
      </ReasoningStep>
    ));
  return (
    // An unseen copy of the open steps and Replay keeps the example's height, so it stays centred
    // and still as the steps fold away. Replay then shows just beneath the folded title.
    <div className="preview-reasoning">
      <div className="preview-reasoning-room" aria-hidden="true">
        <ReasoningSteps open title="Checked 3 pages">
          {list(false)}
        </ReasoningSteps>
        <Button variant="secondary" size="small" tabIndex={-1}>
          Replay
        </Button>
      </div>
      <div className="preview-reasoning-live">
        <ReasoningSteps active={active} activeTitle="Checking GOV.UK" title="Checked 3 pages">
          {list(true)}
        </ReasoningSteps>
        {/* Replay shows once the steps are done. */}
        <Button
          variant="secondary"
          size="small"
          className="preview-replay"
          data-shown={!active || undefined}
          tabIndex={active ? -1 : undefined}
          onClick={() => setRun(run + 1)}
        >
          Replay
        </Button>
      </div>
    </div>
  );
}
