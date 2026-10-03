import type { ComponentPropsWithRef, CSSProperties } from "react";

/** @internal */
export type OrbState = "idle" | "listening" | "working";

/** @internal */
export type OrbProps = Omit<ComponentPropsWithRef<"span">, "children"> & {
  /** `idle` keeps it still, `listening` turns it slowly, and `working` turns it quickly. */
  state?: OrbState;
  /** Width and height in pixels. */
  size?: number;
  /** Names the orb for screen readers. Without a label it is decorative and hidden from them. */
  label?: string;
};

/**
 * The mark of an assistant, as in the Editor's AI suggestions, in GOV.UK colours.
 * @internal
 */
export function Orb({
  state = "idle",
  size = 16,
  label,
  className = "",
  style,
  ...props
}: OrbProps) {
  const name = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <span
      {...props}
      {...name}
      className={`x-govuk-ui-orb ${className}`.trim()}
      data-state={state}
      style={{ "--x-govuk-ui-orb-size": `${size}px`, ...style } as CSSProperties}
    />
  );
}
