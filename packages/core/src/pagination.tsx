"use client";

import { LayoutGroup, motion } from "motion/react";
import {
  type ComponentPropsWithRef,
  type MouseEvent,
  type ReactNode,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Anchor, type AnchorProps } from "./anchor";
import { pagesAround } from "./helpers";
import { springs, useMotionTiming } from "./motion";
import { useMergedRef } from "./refs";

/**
 * How much the pagination shows for the space it has. `words` shows Previous and Next in words,
 * with seven page slots. `arrows` shows them as arrows only. `few` shows arrows with five narrower
 * slots. Each keeps one width from page to page.
 */
type Fit = "words" | "arrows" | "few";
// A slot's width, and a link's padding and arrow, as pagination.css sets them. Five slots are the
// last resort, so their width is never measured.
const SLOT = 46;
const ARROW_LINK = 2 * 5 + 15;
const ARROW_GAP = 10;

export type PaginationProps = Omit<ComponentPropsWithRef<"nav">, "onPageChange" | "aria-label"> & {
  /** The current page, from 1. */
  page: number;
  pageCount: number;
  /** The address of each page, such as `(page) => \`?page=${page}\``. */
  href: (page: number) => string;
  /**
   * Runs when a link is followed. Call `event.preventDefault()` to change the page in place, as a
   * single-page application does.
   */
  onPageChange?: (page: number, event: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Renders a router's link in place of each anchor, given each page's address as `href`, such as
   * `(props) => <RouterLink to={props.href} {...props} />`.
   */
  render?: AnchorProps["render"];
  /**
   * Shows only Previous and Next, stacked, each with the title of its page, for content split
   * across a few pages, such as a guide.
   */
  block?: boolean;
  /** In block mode, the titles of the previous and next pages. */
  previousLabel?: ReactNode;
  nextLabel?: ReactNode;
  "aria-label"?: string;
};

/**
 * Links to the pages of a long list, like GOV.UK's pagination. It shows Previous and Next, and the
 * page numbers around the current one, with ellipses for the rest. The numbers take slots of one
 * width. At either end, Previous or Next is disabled instead of removed. The pagination therefore
 * never changes width as the page changes.
 *
 * It fills the width it is given and fits within it. Short of space, Previous and Next become
 * arrows, named for screen readers, and then seven slots become five. The current page's fill
 * glides to the new number when the page changes in place. Each number plays a note a step
 * higher.
 */
export function Pagination({
  page,
  pageCount,
  href,
  onPageChange,
  render,
  block = false,
  previousLabel,
  nextLabel,
  "aria-label": label = "Pagination",
  className = "",
  ref,
  ...props
}: PaginationProps) {
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const merged = useMergedRef(root, ref);
  // The space is the pagination's own width, which its content does not set. What each fit needs
  // is worked out from the slots' widths and the words' own widths, measured in the page's font.
  const [fit, setFit] = useState<Fit>("words");
  useLayoutEffect(() => {
    const nav = root.current;
    if (block || !nav) return;
    const measure = () => {
      const words = Array.from(
        nav.querySelectorAll<HTMLElement>(".x-govuk-ui-pagination-measure > *"),
        (word) => word.offsetWidth,
      );
      const gap = Number.parseFloat(getComputedStyle(nav).columnGap) || 0;
      const links = 2 * ARROW_LINK + 2 * gap;
      const needs = {
        words: links + 2 * ARROW_GAP + words.reduce((sum, width) => sum + width, 0) + 7 * SLOT,
        arrows: links + 7 * SLOT,
      };
      const room = nav.clientWidth;
      if (room >= needs.words) setFit("words");
      else if (room >= needs.arrows) setFit("arrows");
      else setFit("few");
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    const measurer = nav.querySelector(".x-govuk-ui-pagination-measure");
    if (measurer) observer.observe(measurer);
    return () => observer.disconnect();
  }, [block]);
  const timing = useMotionTiming();
  const follow = (target: number) => (event: MouseEvent<HTMLAnchorElement>) =>
    onPageChange?.(target, event);
  // Previous and Next always keep their places. At either end, the one that leads nowhere is
  // disabled instead of removed, so nothing beside it moves. In block mode it is left out, as
  // GOV.UK leaves it out, so the first page has no gap where Previous would be.
  const step = (direction: "previous" | "next") => {
    const target = direction === "previous" ? page - 1 : page + 1;
    const enabled = target >= 1 && target <= pageCount;
    const label = direction === "previous" ? previousLabel : nextLabel;
    return (
      <div
        className={`x-govuk-ui-pagination-${direction}`}
        data-hidden={(block && !enabled) || undefined}
      >
        <Anchor
          render={enabled ? render : undefined}
          className="x-govuk-ui-pagination-link"
          href={enabled ? href(target) : undefined}
          rel={enabled ? (direction === "previous" ? "prev" : "next") : undefined}
          // A link without an address is not a link to assistive technology, so it is named as a
          // disabled one.
          role={enabled ? undefined : "link"}
          aria-disabled={enabled ? undefined : true}
          onClick={enabled ? follow(target) : undefined}
        >
          <svg viewBox="0 0 15 13" width="15" height="13" aria-hidden="true">
            <path d={direction === "previous" ? previousArrow : nextArrow} />
          </svg>
          <span className="x-govuk-ui-pagination-title">
            {direction === "previous" ? "Previous" : "Next"}
            <span className="x-govuk-ui-visually-hidden"> page</span>
          </span>
          {/* In block mode the title's line is kept when there is no title, so the pagination
              keeps its height from page to page. */}
          {block &&
            (label && enabled ? (
              <span className="x-govuk-ui-pagination-label">{label}</span>
            ) : (
              <span className="x-govuk-ui-pagination-label" aria-hidden="true">
                {"\u00a0"}
              </span>
            ))}
        </Anchor>
      </div>
    );
  };
  return (
    <nav
      {...props}
      ref={merged}
      className={`x-govuk-ui-pagination ${className}`.trim()}
      aria-label={label}
      data-block={block || undefined}
      data-fit={block ? undefined : fit}
    >
      {/* Previous and Next in words, out of sight, so what they need is known in any fit. */}
      {!block && (
        <span className="x-govuk-ui-pagination-measure" aria-hidden="true">
          <span className="x-govuk-ui-pagination-title">Previous</span>
          <span className="x-govuk-ui-pagination-title">Next</span>
        </span>
      )}
      {step("previous")}
      {!block && (
        <ul className="x-govuk-ui-pagination-list">
          <LayoutGroup id={id}>
            {pagesAround(page, pageCount, fit === "few" ? 5 : 7).map((item, index) =>
              item === null ? (
                <li
                  key={index < 3 ? "gap-start" : "gap-end"}
                  className="x-govuk-ui-pagination-ellipsis"
                  aria-hidden="true"
                >
                  ⋯
                </li>
              ) : (
                <li
                  key={item}
                  className="x-govuk-ui-pagination-item"
                  data-current={item === page || undefined}
                >
                  {item === page && (
                    <motion.span
                      layoutId="current"
                      className="x-govuk-ui-pagination-fill"
                      aria-hidden="true"
                      transition={timing.spring(springs.glide)}
                    />
                  )}
                  <Anchor
                    render={render}
                    className="x-govuk-ui-pagination-number"
                    href={href(item)}
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                    onClick={follow(item)}
                  >
                    {item}
                  </Anchor>
                </li>
              ),
            )}
          </LayoutGroup>
        </ul>
      )}
      {step("next")}
    </nav>
  );
}

const previousArrow =
  "m6.5938-0.0078125-6.7266 6.7266 6.7441 6.4062 1.377-1.449-4.1856-3.9768h12.896v-2h-12.984l4.2931-4.293-1.414-1.414z";
const nextArrow =
  "m8.107-0.0078125-1.4136 1.414 4.2926 4.293h-12.986v2h12.896l-4.1855 3.9766 1.377 1.4492 6.7441-6.4062-6.7246-6.7266z";
