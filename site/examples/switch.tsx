import { useState } from "react";
import { Switch } from "x-govuk-ui";

export default function SwitchExample({
  label = "Email notifications",
  hint = "We’ll email you when your application changes.",
  hideLabel = false,
  disabled = false,
}) {
  const [on, setOn] = useState(true);
  return (
    <>
      <Switch
        label={label}
        hint={hint || undefined}
        hideLabel={hideLabel}
        disabled={disabled}
        checked={on}
        onCheckedChange={setOn}
      />
      <p className="preview-message" role="status">
        {on ? "Email notifications are on." : "Email notifications are off."}
      </p>
    </>
  );
}
