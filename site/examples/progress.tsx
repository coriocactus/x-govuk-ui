import { useEffect, useState } from "react";
import { Button, Progress } from "x-govuk-ui";

type Props = {
  showValue?: boolean;
  /** Shows the bar without an amount, as when a task cannot say how far it has got. */
  indeterminate?: boolean;
};

export default function ProgressExample({ showValue = true, indeterminate = false }: Props) {
  const [value, setValue] = useState(0);
  const [running, setRunning] = useState(false);
  // The example uploads in uneven steps, as a real upload does, and stops once it is complete.
  // Each step is chosen here, not inside the update, which React may run twice.
  useEffect(() => {
    if (!running) return;
    if (value >= 100) return setRunning(false);
    const step = 6 + Math.round(Math.random() * 18);
    const timer = setTimeout(() => setValue(Math.min(100, value + step)), 260);
    return () => clearTimeout(timer);
  }, [running, value]);
  return (
    <div className="preview-progress">
      <Progress
        label="Uploading floor-plan.pdf"
        value={indeterminate ? null : value}
        showValue={showValue}
      />
      <Button
        variant="secondary"
        size="small"
        disabled={running || indeterminate}
        onClick={() => {
          setValue(0);
          setRunning(true);
        }}
      >
        {value === 100 ? "Upload again" : "Upload"}
      </Button>
    </div>
  );
}
