"use client";

import { useRender } from "@base-ui/react/use-render";
import { type ComponentPropsWithRef, type CSSProperties, createContext, useContext } from "react";

export type WidthContainerProps = ComponentPropsWithRef<"div"> & {
  /** The widest its content grows, in pixels or as any CSS length. GOV.UK's is 960 pixels. */
  width?: number | string;
  /**
   * Keeps GOV.UK's space at the sides, 15 pixels on a phone and 30 from tablet width up, whenever
   * the screen is narrower than the container. Turn it off inside something that has its own space.
   */
  gutters?: boolean;
};

/**
 * Keeps a page's content to a comfortable width, in the middle of the screen, as GOV.UK's width
 * container does. A Page puts one between its header and footer.
 */
export function WidthContainer({
  width,
  gutters = true,
  className = "",
  style,
  ...props
}: WidthContainerProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-width-container ${className}`.trim()}
      data-gutters={gutters ? undefined : "none"}
      style={
        width === undefined
          ? style
          : ({
              ...style,
              "--x-govuk-ui-container-width": typeof width === "number" ? `${width}px` : width,
            } as CSSProperties)
      }
    />
  );
}

/** Tells a MainWrapper whether anything sits above it in a Page, such as a back link. */
export const ContentAbove = createContext(false);

export type MainWrapperProps = ComponentPropsWithRef<"main"> & {
  /**
   * `large` leaves more space above. Use it for a page that has nothing above its content, such as
   * a back link or breadcrumbs. In a Page, it is chosen for you.
   */
  size?: "default" | "large";
  /** Renders another element in place of `main`, such as a `div` inside a page that has one. */
  render?: useRender.RenderProp;
};

/**
 * The page's main content, with GOV.UK's spacing above and below. It is the `main` landmark, with
 * the id the skip link goes to.
 */
export function MainWrapper({
  size,
  id = "main-content",
  render,
  className = "",
  ...props
}: MainWrapperProps) {
  const crowded = useContext(ContentAbove);
  // Large unless set otherwise, or unless something sits above it.
  const large = size ? size === "large" : !crowded;
  return useRender({
    defaultTagName: "main",
    render,
    props: {
      ...props,
      id,
      className: `x-govuk-ui-main-wrapper ${className}`.trim(),
      "data-size": large ? "large" : undefined,
    },
  });
}

export type GridRowProps = ComponentPropsWithRef<"div">;

/**
 * A row of GridColumn parts. Columns sit side by side once the row is wide enough, and stack on a
 * phone. They follow the row's own width, so a row in a narrow space stacks even on a wide screen.
 */
export function GridRow({ className = "", ...props }: GridRowProps) {
  return <div {...props} className={`x-govuk-ui-grid-row ${className}`.trim()} />;
}

export type GridColumnProps = ComponentPropsWithRef<"div"> & {
  /** The share of the row it takes. `two-thirds` suits a page's main content. */
  width?: "full" | "three-quarters" | "two-thirds" | "one-half" | "one-third" | "one-quarter";
  /** Where it starts taking its share. Below that, it takes the whole row. */
  from?: "tablet" | "desktop";
};

/** One column of a GridRow, in GOV.UK's shares of the row, as quarters, thirds and halves. */
export function GridColumn({
  width = "full",
  from = "tablet",
  className = "",
  ...props
}: GridColumnProps) {
  return (
    <div
      {...props}
      className={`x-govuk-ui-grid-column ${className}`.trim()}
      data-width={width}
      data-from={from}
    />
  );
}
