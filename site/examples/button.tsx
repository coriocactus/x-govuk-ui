import { useEffect, useRef, useState } from "react";
import { Button, ButtonGroup, type ButtonProps } from "x-govuk-ui";

type Props = Pick<ButtonProps, "variant" | "size" | "loading" | "disabled"> & {
  children?: string;
  /** Puts a Cancel link button beside it in a ButtonGroup. */
  group?: boolean;
  /** The ButtonGroup's prop, which stacks its buttons on a phone, each the full width. */
  stack?: boolean;
  /** Puts an arrow after the words, laid out the same in every variant. */
  icon?: boolean;
};

/** An arrow pointing on, as the example's icon, in pixels across and with a stroke to suit. */
const arrow = (size: number, strokeWidth: number) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14m-6-6 6 6-6 6" />
  </svg>
);

export default function ButtonExample({
  children = "Save and continue",
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  group = false,
  stack = true,
  icon = false,
}: Props) {
  const iconOnly = size === "icon" || size === "small-icon";
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const button = (
    <Button
      variant={variant}
      size={size}
      // An icon button shows an arrow, and its label becomes its accessible name.
      aria-label={iconOnly ? children : undefined}
      disabled={disabled}
      loading={loading || saving}
      onClick={() => {
        // A simulated save. Nothing is sent.
        setSaving(true);
        setStatus("");
        timer.current = setTimeout(() => {
          setSaving(false);
          setStatus("Progress saved.");
        }, 1200);
      }}
    >
      {iconOnly ? (
        arrow(20, 1.8)
      ) : (
        <>
          {children}
          {icon && arrow(18, 2)}
        </>
      )}
    </Button>
  );

  return (
    <>
      {group ? (
        <ButtonGroup stack={stack}>
          {button}
          <Button variant="link" onClick={() => setStatus("You chose to cancel.")}>
            Cancel
          </Button>
        </ButtonGroup>
      ) : (
        button
      )}
      <p
        className="preview-message"
        role="status"
        data-success={status === "Progress saved." || undefined}
      >
        {status}
      </p>
    </>
  );
}
