"use client";

import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  isValidElement,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useState,
} from "react";
import { Details, type DetailsProps } from "./details";

type FigureContextValue = { titleId: string; register: (change: 1 | -1) => void };
const FigureContext = createContext<FigureContextValue | null>(null);

export type FigureProps = ComponentPropsWithRef<"figure"> & {
  /**
   * The figure's point, in a sentence, which screen readers hear after its title. Give it where
   * the figure's content does not describe itself, such as a table of shaded figures. A chart's
   * plot is a picture with a description of its own.
   */
  description?: string;
};

/**
 * Something shown to make a point, such as a chart, a set of figures or a table. It is set as
 * GOV.UK's statistics set their figures. A short rule and a headline sit over a line that says
 * what is measured. The content follows, then where it comes from, then its figures in a table a
 * reader can open.
 *
 * Build it from `FigureCaption`, `FigureSource` and `FigureData` around any content. Every chart
 * is set in a Figure, as are Stats, so a service can set its own content the same way, or
 * rearrange a chart's parts in it. The caption's headline names the figure. HTML allows a figure
 * one caption, as its first or last child. Give the caption as the first child, either directly or
 * in a component of your own that renders it.
 */
export function Figure({ description, className = "", children, ...props }: FigureProps) {
  const titleId = useId();
  const descriptionId = useId();
  // Where the figure has a caption, the caption's headline names it. A caption among the figure's
  // children is seen at once, even on the server. A caption in a service's own component registers
  // itself once it is on the page. Until then, the browser names the figure by its whole caption,
  // as it names any figure. Without a caption, the figure has no name, instead of a name that
  // points at nothing. Captions are counted, so when one goes, the figure stays named while
  // another is there.
  const [registered, setRegistered] = useState(0);
  const register = useCallback((change: 1 | -1) => setRegistered((count) => count + change), []);
  const captioned =
    registered > 0 ||
    Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === FigureCaption,
    );
  return (
    <FigureContext value={{ titleId, register }}>
      <figure
        aria-labelledby={captioned ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        {...props}
        className={`x-govuk-ui-figure ${className}`.trim()}
      >
        {children}
        {/* The description goes after the content, so a caption given first is the figure's
            first child, as HTML asks. */}
        {description && (
          <span id={descriptionId} className="x-govuk-ui-visually-hidden">
            {description}
          </span>
        )}
      </figure>
    </FigureContext>
  );
}

export type FigureCaptionProps = Omit<ComponentPropsWithRef<"figcaption">, "title"> & {
  /** Says what the figure shows, as a headline, such as "Most anglers buy a yearly licence". */
  title: ReactNode;
  /** What is measured, and in what, such as "Licences sold in 2025, thousands". */
  subtitle?: ReactNode;
};

/**
 * The figure's headline under a short rule in brand blue, and what is measured beneath it. It
 * names the figure for screen readers by its headline.
 */
export function FigureCaption({ title, subtitle, className = "", ...props }: FigureCaptionProps) {
  const figure = useContext(FigureContext);
  const ownId = useId();
  const register = figure?.register;
  useLayoutEffect(() => {
    register?.(1);
    return () => register?.(-1);
  }, [register]);
  return (
    <figcaption {...props} className={`x-govuk-ui-figure-caption ${className}`.trim()}>
      <span className="x-govuk-ui-figure-rule" aria-hidden="true" />
      <span id={figure?.titleId ?? ownId} className="x-govuk-ui-figure-title">
        {title}
      </span>
      {subtitle && <span className="x-govuk-ui-figure-subtitle">{subtitle}</span>}
    </figcaption>
  );
}

export type FigureSourceProps = ComponentPropsWithRef<"p">;

/** Where the figure's content comes from, at its foot, such as "Source: Environment Agency". */
export function FigureSource({ className = "", ...props }: FigureSourceProps) {
  return <p {...props} className={`x-govuk-ui-figure-source ${className}`.trim()} />;
}

export type FigureDataProps = Omit<DetailsProps, "summary"> & {
  /** What opens the figures, such as "Show the figures as a table". */
  summary?: ReactNode;
};

/**
 * The figure's figures as tables, in a Details that a reader opens. GOV.UK asks this of every
 * chart, for people who cannot see it and people who want the exact figures.
 */
export function FigureData({
  summary = "Show the figures as a table",
  className = "",
  ...props
}: FigureDataProps) {
  return (
    <Details
      {...props}
      summary={summary}
      className={`x-govuk-ui-figure-data ${className}`.trim()}
    />
  );
}
