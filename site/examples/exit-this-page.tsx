import { ExitThisPage } from "x-govuk-ui";

type Props = { href?: string };

// In a service, href is an ordinary site such as BBC Weather. Here it is the next component.
export default function ExitThisPageExample({ href = "/workbench/checkboxes" }: Props) {
  return (
    <div className="preview-exit">
      <ExitThisPage href={href} />
      <p className="preview-hint">Press the button, or press Shift three times.</p>
    </div>
  );
}
