import { Separator } from "x-govuk-ui";

type Props = {
  orientation?: "horizontal" | "vertical";
  spacing?: "none" | "small" | "medium" | "large";
};

export default function SeparatorExample({
  orientation = "horizontal",
  spacing = "medium",
}: Props) {
  if (orientation === "vertical")
    return (
      <p className="preview-inline-links">
        <a href="#help">Help</a>
        <Separator orientation="vertical" />
        <a href="#privacy">Privacy</a>
        <Separator orientation="vertical" />
        <a href="#cookies">Cookies</a>
      </p>
    );
  return (
    <div className="preview-prose">
      <h2>Before you start</h2>
      <p>You’ll need your National Insurance number and your passport.</p>
      <Separator spacing={spacing} />
      <h2>What happens next</h2>
      <p>We’ll email you within 5 working days.</p>
    </div>
  );
}
