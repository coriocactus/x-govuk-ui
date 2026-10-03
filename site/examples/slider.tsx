import { useState } from "react";
import { Slider } from "x-govuk-ui";

export default function SliderExample({
  label = "Search radius",
  hint = "How far from your postcode to look.",
  hideLabel = false,
  min = 5,
  max = 50,
  step = 5,
  showValue = true,
  disabled = false,
}) {
  const [radius, setRadius] = useState(10);
  return (
    <Slider
      label={label}
      hint={hint || undefined}
      hideLabel={hideLabel}
      min={min}
      max={max}
      step={step}
      showValue={showValue}
      disabled={disabled}
      format={{ style: "unit", unit: "kilometer" }}
      value={radius}
      onValueChange={setRadius}
    />
  );
}
