import type { ComponentPropsWithRef, ReactNode } from "react";

export type PanelProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  title: ReactNode;
  /** The title's heading level. A confirmation page's panel contains its main heading. */
  titleLevel?: 1 | 2 | 3;
};

/**
 * GOV.UK's confirmation panel, for the end of a transaction, such as "Application complete" with a
 * reference number. It rises into place and plays the success sound when it appears after the
 * page has loaded.
 */
export function Panel({ title, titleLevel = 1, className = "", children, ...props }: PanelProps) {
  const Title = `h${titleLevel}` as const;
  return (
    <div {...props} className={`x-govuk-ui-panel ${className}`.trim()} data-sound-enter="success">
      <Title className="x-govuk-ui-panel-title">{title}</Title>
      {children && <div className="x-govuk-ui-panel-body">{children}</div>}
    </div>
  );
}
