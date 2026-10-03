import { useState } from "react";
import { Button, StreamingText } from "x-govuk-ui";

type Props = { speed?: number; instant?: boolean };

const reply =
  "You can apply for a provisional driving licence when you're 15 years and 9 months old. Apply online, and have your passport or other identity documents to hand.\n\nMost licences arrive within a week.";

export default function StreamingTextExample({ speed = 30, instant = false }: Props) {
  // Replay starts the text again from its first word.
  const [run, setRun] = useState(0);
  const [complete, setComplete] = useState(false);
  return (
    <div className="preview-streaming">
      <p className="preview-streaming-text">
        <StreamingText
          key={`${run}-${speed}-${instant}`}
          text={reply}
          speed={speed}
          instant={instant}
          onComplete={() => setComplete(true)}
        />
      </p>
      {/* Replay shows once the text is complete. */}
      <Button
        variant="secondary"
        size="small"
        className="preview-replay"
        data-shown={complete || undefined}
        tabIndex={complete ? undefined : -1}
        onClick={() => {
          setComplete(false);
          setRun((count) => count + 1);
        }}
      >
        Replay
      </Button>
    </div>
  );
}
