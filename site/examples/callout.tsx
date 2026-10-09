import { useRef, useState } from "react";
import { Button, Callout, CalloutTrigger, Field, Hint, Label } from "x-govuk-ui";

type Props = {
  variant?: "brand" | "plain";
  side?: "auto" | "top" | "right" | "bottom" | "left";
  /** Milliseconds before the notice closes by itself. 0 keeps it until it is closed. */
  timeout?: number;
  countdown?: boolean;
  /** By default, help closes on a press outside, and the notice stays. */
  closeOnPressOutside?: "default" | "true" | "false";
  closeButton?: boolean;
};

export default function CalloutExample({
  variant = "brand",
  side = "auto",
  timeout = 0,
  countdown = true,
  closeOnPressOutside = "default",
  closeButton = true,
}: Props) {
  const download = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState(true);
  const outside = closeOnPressOutside === "default" ? undefined : closeOnPressOutside === "true";
  return (
    <div className="preview-callout">
      {/* Help that users ask for, from the question mark beside the question. */}
      <Field>
        <div className="preview-callout-label">
          <Label htmlFor="callout-reference">Reference number</Label>
          <Callout
            trigger={<CalloutTrigger label="Help with your reference number" />}
            variant={variant}
            side={side}
            closeOnPressOutside={outside}
            closeButton={closeButton}
            title="Your reference number"
          >
            It’s 12 characters long and starts with LIC. It’s at the top of the letter or email we
            sent you.
          </Callout>
        </div>
        <Hint id="callout-reference-hint">For example, LIC 4821 7730 21</Hint>
        <input
          id="callout-reference"
          className="x-govuk-ui-input preview-callout-input"
          aria-describedby="callout-reference-hint"
          spellCheck={false}
          autoComplete="off"
        />
      </Field>
      <div className="preview-callout-actions">
        <Button>Continue</Button>
        <Button ref={download} variant="secondary">
          Download your answers
        </Button>
      </div>
      {/* A notice that appears by itself, pointing at what is new. */}
      <Callout
        anchor={download}
        open={notice}
        onOpenChange={setNotice}
        variant={variant}
        side={side}
        timeout={timeout}
        countdown={countdown}
        closeOnPressOutside={outside}
        closeButton={closeButton}
        title="New: download your answers"
        actions={
          <Button size="small" onClick={() => setNotice(false)}>
            Got it
          </Button>
        }
      >
        Keep a copy of everything you’ve told us, as a PDF.
      </Callout>
      <p className="preview-callout-again" data-hidden={notice || undefined}>
        <Button variant="link" onClick={() => setNotice(true)} disabled={notice}>
          Show the notice again
        </Button>
      </p>
    </div>
  );
}
