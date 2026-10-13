/*
 * A service's own code, as it meets the packages' published types. `scripts/consumer.ts` checks it
 * against each package's build, without the repository's links to the source. What only the source
 * shows, such as an extension's words that never reach its build's types, fails here.
 */

import { Tiles } from "@x-govuk-ui/belsize";
import { Editor } from "@x-govuk-ui/jorjorwel";
import { Chart } from "@x-govuk-ui/memetics";
import { type ComponentPropsWithRef, useRef } from "react";
import {
  defaultPaginationLabels,
  FieldBinding,
  Hint,
  Label,
  type Labels,
  LabelsProvider,
  useBoundField,
  useControllableState,
  useLabels,
  useMergedRef,
} from "x-govuk-ui";

/** Every package's words, in one provider, as a Welsh service gives them. */
export const welsh: Labels = {
  locale: "cy",
  pagination: { previous: "Blaenorol" },
  chart: { showTable: "Dangos y tabl" },
  tiles: { tidy: "Tacluso'r teils" },
  editor: { bold: "Trwm" },
};

export function Page() {
  // A component of the service's own takes its words the same way.
  const { previous } = useLabels("pagination", defaultPaginationLabels);
  return (
    <LabelsProvider labels={welsh}>
      <p>{previous}</p>
      {[Editor, Chart, Tiles].length}
    </LabelsProvider>
  );
}

// A component that does not exist has no words.
// @ts-expect-error
export const nowhere: Labels = { nothing: {} };

// The page's language is the provider's own `locale`, not the charts'.
// @ts-expect-error
export const twice: Labels = { chart: { locale: "cy" } };

/**
 * A field of the service's own, from the public parts alone: a value that is controlled or not, a
 * ref kept beside its own, and a label that names the control by its id.
 */
export function Dial({
  value,
  defaultValue = 0,
  onValueChange,
  ref,
  ...props
}: Omit<ComponentPropsWithRef<"div">, "defaultValue"> & {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
}) {
  const [current, set] = useControllableState(value, defaultValue, onValueChange);
  const own = useRef<HTMLDivElement>(null);
  const merged = useMergedRef(own, ref);
  const field = useBoundField();
  return (
    <div
      {...props}
      ref={merged}
      role="slider"
      tabIndex={0}
      aria-valuenow={current}
      aria-labelledby={field?.labelId}
      onKeyDown={() => set(current + 1)}
    />
  );
}

export function DialField() {
  return (
    <FieldBinding controlId="ease" name="ease">
      <Label htmlFor={null}>How easy was it?</Label>
      <Hint>From 1 to 5</Hint>
      <Dial />
    </FieldBinding>
  );
}
