import type { ComponentPropsWithRef, ReactNode } from "react";
import { Tag, type TagColour } from "./tag";

export type PhaseBannerProps = ComponentPropsWithRef<"div"> & {
  /** The phase, such as Alpha or Beta. */
  tag?: ReactNode;
  tagColour?: TagColour;
  children: ReactNode;
};

/**
 * Tells people a service is still being worked on, with a way to give feedback, under the header.
 * The phase is a Tag.
 */
export function PhaseBanner({
  tag = "Beta",
  tagColour = "blue",
  className = "",
  children,
  ...props
}: PhaseBannerProps) {
  return (
    <div {...props} className={`x-govuk-ui-phase-banner ${className}`.trim()}>
      <p className="x-govuk-ui-phase-banner-content">
        <Tag colour={tagColour} className="x-govuk-ui-phase-banner-tag">
          {tag}
        </Tag>
        <span className="x-govuk-ui-phase-banner-text">{children}</span>
      </p>
    </div>
  );
}
