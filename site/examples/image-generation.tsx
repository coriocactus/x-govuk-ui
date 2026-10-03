import { useEffect, useState } from "react";
import { Button, ImageGeneration } from "x-govuk-ui";

type Props = { seconds?: number; progress?: boolean; preview?: boolean };

const photo = "/assets/photos/battersea-power-station.jpg";

export default function ImageGenerationExample({
  seconds = 6,
  progress: reports = false,
  preview: previews = false,
}: Props) {
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(0);
  const [made, setMade] = useState(false);
  const [rough, setRough] = useState(false);
  // A pretend service. It works for a while, in uneven steps, and sends the image when it is done.
  // Some services report how far along they are, and a few send a rough preview partway through.
  useEffect(() => {
    if (run === 0) return;
    setMade(false);
    setRough(false);
    setDone(0);
    let share = 0;
    const timer = setInterval(() => {
      share = Math.min(1, share + (0.6 + Math.random()) * (0.12 / seconds));
      setDone(share);
      if (share > 0.45) setRough(true);
      if (share >= 1) {
        clearInterval(timer);
        setMade(true);
      }
    }, 120);
    return () => clearInterval(timer);
  }, [run, seconds]);

  const working = run > 0 && !made;
  return (
    <div className="preview-image-generation">
      <p className="preview-image-prompt">
        “A poster of Battersea Power Station at dusk, for a walking tour.”
      </p>
      <ImageGeneration
        src={made ? photo : undefined}
        preview={previews && rough ? photo : undefined}
        alt="Battersea Power Station's four white chimneys over the Thames"
        width={960}
        height={640}
        progress={reports && run > 0 ? done : undefined}
        label={run === 0 ? "Ready to create the poster" : "Creating the poster"}
      />
      <div className="preview-image-actions">
        <Button variant="outline" size="small" disabled={working} onClick={() => setRun(run + 1)}>
          {run === 0 ? "Create the poster" : "Create it again"}
        </Button>
        <span className="preview-image-credit">Photo by Alberto Pascual</span>
      </div>
    </div>
  );
}
