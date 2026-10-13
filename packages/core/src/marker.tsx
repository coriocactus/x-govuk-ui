"use client";
import { type ComponentPropsWithRef, useEffect, useRef, useState } from "react";

export type MarkerProps = ComponentPropsWithRef<"mark"> & {
  colour?: "yellow" | "blue" | "green" | "pink";
};

/**
 * Highlights words as a marker pen would. The highlight sweeps across them, from the start of the
 * line, the first time they scroll into view. With reduced motion, the highlight appears without
 * the sweep.
 */
export function Marker({ colour = "yellow", className = "", ...props }: MarkerProps) {
  const mark = useRef<HTMLElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const element = mark.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setDrawn(true);
        observer.disconnect();
      },
      { threshold: 1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <mark
      ref={mark}
      {...props}
      className={`x-govuk-ui-marker ${className}`.trim()}
      data-colour={colour}
      data-drawn={drawn || undefined}
    />
  );
}
