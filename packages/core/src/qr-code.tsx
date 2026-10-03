"use client";

import { type ComponentPropsWithRef, type CSSProperties, useMemo } from "react";
import { encode } from "uqr";

export type QrCodeProps = ComponentPropsWithRef<"svg"> & {
  /** What the code encodes, such as a web address. */
  value: string;
  /** What the code leads to, for screen readers, such as "the fishing licence service". */
  label?: string;
  /** The code's width and height, in pixels. */
  size?: number;
  /** How much of the code can be covered or worn before it stops scanning. */
  errorCorrection?: "L" | "M" | "Q" | "H";
  /**
   * How long the ripple takes, from the first dot growing in the middle to the last in a corner, in
   * milliseconds. 0 shows a new code at once.
   */
  ripple?: number;
};

// uqr marks the three corner squares that phones find the code by.
const CORNER = 2;

/**
 * A scannable code whose modules are dots, and whose three corner squares are rounded rings around
 * a rounded square. It is dark on a white tile in either theme, so phones read it in any light.
 * Each time the value changes, the new dots ripple out from the middle, over `ripple` milliseconds.
 * uqr encodes it.
 */
export function QrCode({
  value,
  label,
  size = 200,
  errorCorrection = "M",
  ripple = 500,
  className = "",
  ...props
}: QrCodeProps) {
  const qr = useMemo(
    () => encode(value, { ecc: errorCorrection, border: 0 }),
    [value, errorCorrection],
  );
  const count = qr.size;
  const middle = (count - 1) / 2;
  const reach = Math.hypot(middle, middle);
  // Each dot waits by its distance from the middle, so the change spreads outwards, and grows for a
  // little more than a third of the ripple's time.
  const spread = Math.max(0, ripple) * 0.62;
  const delay = (x: number, y: number) =>
    `${Math.round((Math.hypot(x - middle, y - middle) / reach) * spread)}ms`;
  const corners = [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ] as const;
  return (
    <svg
      {...props}
      className={`x-govuk-ui-qr-code ${className}`.trim()}
      viewBox={`-2 -2 ${count + 4} ${count + 4}`}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code for ${label ?? value}`}
      data-still={ripple <= 0 || undefined}
      style={
        { "--x-govuk-ui-qr-grow": `${Math.round(Math.max(0, ripple) * 0.38)}ms` } as CSSProperties
      }
    >
      <rect
        className="x-govuk-ui-qr-code-tile"
        x="-2"
        y="-2"
        width={count + 4}
        height={count + 4}
        rx="2.5"
      />
      {/* A new key for each value starts the ripple again. */}
      <g key={value} className="x-govuk-ui-qr-code-modules">
        {qr.data.flatMap((row, y) =>
          row.map((dark, x) =>
            dark && qr.types[y]?.[x] !== CORNER ? (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: A module has only its place in the grid.
                key={`${x}-${y}`}
                cx={x + 0.5}
                cy={y + 0.5}
                r="0.42"
                style={{ animationDelay: delay(x, y) }}
              />
            ) : null,
          ),
        )}
        {corners.map(([x, y]) => (
          <g
            key={`${x}-${y}`}
            style={{ animationDelay: delay(x + 3, y + 3) }}
            className="x-govuk-ui-qr-code-corner"
          >
            <rect
              x={x + 0.5}
              y={y + 0.5}
              width="6"
              height="6"
              rx="1.7"
              fill="none"
              strokeWidth="1"
            />
            <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.9" />
          </g>
        ))}
      </g>
    </svg>
  );
}
