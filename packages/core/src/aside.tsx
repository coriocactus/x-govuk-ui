"use client";
import { type ComponentPropsWithRef, type ReactNode, useId } from "react";

export type AsideProps = ComponentPropsWithRef<"aside"> & {
  title: ReactNode;
  headingLevel?: 2 | 3 | 4;
};

/**
 * Content related to the page, beside or after its main content, such as related guidance. It is a
 * complementary landmark, named by its title, under a brand-blue rule, like GOV.UK's related links.
 */
export function Aside({ title, headingLevel = 2, className = "", children, ...props }: AsideProps) {
  const Heading = `h${headingLevel}` as const;
  const id = useId();
  return (
    <aside {...props} className={`x-govuk-ui-aside ${className}`.trim()} aria-labelledby={id}>
      <Heading id={id} className="x-govuk-ui-aside-title">
        {title}
      </Heading>
      {children}
    </aside>
  );
}
