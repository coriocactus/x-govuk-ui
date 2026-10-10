"use client";

import { ScrollArea as Primitive } from "@base-ui/react/scroll-area";
import { motion } from "motion/react";
import {
  type ComponentPropsWithRef,
  type Ref,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useMergedRef } from "./refs";

export type ScrollAreaProps = ComponentPropsWithRef<"div"> & {
  /** Which ways the content scrolls. The other way, it is cut off. */
  orientation?: "vertical" | "horizontal" | "both";
  /**
   * Names the scrolling region. Once the content scrolls, keyboard users reach a named region with
   * Tab, and screen readers announce it. Leave it out when what is inside can take focus, such as a
   * list of links, so the region adds no extra stop.
   */
  label?: string;
  /** The id of an element that names the region, such as a table's caption, instead of `label`. */
  labelledBy?: string;
  /**
   * Fades the edges that have more content beyond them. The fade is a mask, so while the content
   * overflows it also hides anything inside that is drawn outside the region, such as a fixed
   * toast.
   */
  fade?: boolean;
  /** The element that scrolls, for reading or setting its scroll position. */
  viewportRef?: Ref<HTMLDivElement>;
};

/** What can take focus with Tab, as a scrolling region's content might. */
const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

/**
 * A scrolling region with thin scrollbars of its own, the same in every browser. A scrollbar shows
 * while the content moves or the pointer is over the region. It widens under the pointer, and
 * fades away a moment after. The region scrolls natively, so wheel, touch and keyboard scrolling
 * work as usual, and Motion's layout animations inside it allow for the distance scrolled. The
 * region needs a height or a maximum height from its container, and takes its width from it.
 */
export function ScrollArea({
  orientation = "vertical",
  label,
  labelledBy,
  fade = false,
  viewportRef,
  className = "",
  children,
  ref,
  ...props
}: ScrollAreaProps) {
  const root = useRef<HTMLDivElement>(null);
  const merged = useMergedRef(root, ref);
  const viewport = useRef<HTMLDivElement>(null);
  const mergedViewport = useMergedRef(viewport, viewportRef);
  const scrolls = useScrolls(root);
  const holdsFocus = useHoldsFocusable(viewport);
  const named = Boolean(label || labelledBy);
  const vertical = orientation !== "horizontal";
  const horizontal = orientation !== "vertical";
  return (
    <Primitive.Root
      {...props}
      ref={merged}
      className={`x-govuk-ui-scroll-area ${className}`.trim()}
      data-orientation={orientation}
      data-fade={fade || undefined}
    >
      <Primitive.Viewport
        ref={mergedViewport}
        render={<motion.div layoutScroll />}
        className="x-govuk-ui-scroll-area-viewport"
        // A named region is a Tab stop once it scrolls, and is announced by its name. While its
        // content fits, it is neither. Without a name, it is not a Tab stop while something inside
        // can take focus, as in Chrome. Firefox would stop at every scrolling element, so a list of
        // links would have an extra stop in Firefox alone. With nothing inside to focus, the
        // browser decides, so the keyboard can still scroll it where the browser allows.
        role={named && scrolls ? "region" : undefined}
        aria-label={scrolls ? label : undefined}
        aria-labelledby={scrolls ? labelledBy : undefined}
        {...(named ? {} : { tabIndex: holdsFocus ? -1 : undefined })}
        style={{
          overflowX: horizontal ? "scroll" : "hidden",
          overflowY: vertical ? "scroll" : "hidden",
        }}
      >
        <Primitive.Content className="x-govuk-ui-scroll-area-content">{children}</Primitive.Content>
      </Primitive.Viewport>
      <ScrollAreaBars vertical={vertical} horizontal={horizontal} />
    </Primitive.Root>
  );
}

/**
 * The scrollbars, shared with parts that scroll an element of their own, such as Textarea.
 * @internal
 */
export function ScrollAreaBars({
  vertical,
  horizontal,
}: {
  vertical: boolean;
  horizontal: boolean;
}) {
  return (
    <>
      {vertical && (
        <Primitive.Scrollbar orientation="vertical" className="x-govuk-ui-scroll-area-scrollbar">
          <Primitive.Thumb className="x-govuk-ui-scroll-area-thumb" />
        </Primitive.Scrollbar>
      )}
      {horizontal && (
        <Primitive.Scrollbar orientation="horizontal" className="x-govuk-ui-scroll-area-scrollbar">
          <Primitive.Thumb className="x-govuk-ui-scroll-area-thumb" />
        </Primitive.Scrollbar>
      )}
      {vertical && horizontal && <Primitive.Corner className="x-govuk-ui-scroll-area-corner" />}
    </>
  );
}

/**
 * Whether anything inside the element can take focus with Tab, followed as the content changes,
 * such as links added to a list.
 */
function useHoldsFocusable(element: RefObject<HTMLDivElement | null>) {
  const [holds, setHolds] = useState(false);
  useLayoutEffect(() => {
    const current = element.current;
    if (!current) return;
    const read = () => setHolds(current.querySelector(FOCUSABLE) !== null);
    read();
    // The content is searched again only when what changed can take focus, or holds something that
    // can. Searching at every change would walk the whole content at each key typed in a Code
    // block, which is 28,000 elements in a block of 2,000 lines.
    const focusable = (node: Node) =>
      node instanceof Element &&
      (node.matches(FOCUSABLE) || node.querySelector(FOCUSABLE) !== null);
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === "attributes" ||
            [...record.addedNodes].some(focusable) ||
            [...record.removedNodes].some(focusable),
        )
      )
        read();
    });
    observer.observe(current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href", "tabindex", "disabled", "contenteditable", "controls"],
    });
    return () => observer.disconnect();
  }, [element]);
  return holds;
}

/** Whether the content overflows either way, from the attributes Base UI keeps on the root. */
function useScrolls(root: RefObject<HTMLDivElement | null>) {
  const [scrolls, setScrolls] = useState(false);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const read = () =>
      setScrolls(
        element.hasAttribute("data-has-overflow-x") || element.hasAttribute("data-has-overflow-y"),
      );
    read();
    const observer = new MutationObserver(read);
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-has-overflow-x", "data-has-overflow-y"],
    });
    return () => observer.disconnect();
  }, [root]);
  return scrolls;
}
