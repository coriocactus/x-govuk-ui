"use client";

import {
  Children,
  type ComponentPropsWithRef,
  createContext,
  isValidElement,
  type ReactNode,
  type RefObject,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, type ButtonProps } from "./button";
import { useMotionTiming } from "./motion";

type CarouselContextValue = {
  viewport: RefObject<HTMLDivElement | null>;
  index: number;
  count: number;
  setIndex: (index: number) => void;
  setCount: (count: number) => void;
  /** Scrolls to a slide, and the position follows once it arrives. */
  go: (index: number) => void;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);
const SlideContext = createContext<{ index: number; count: number }>({ index: 0, count: 0 });

function useCarousel(part: string) {
  const context = useContext(CarouselContext);
  if (!context) throw new Error(`${part} must be inside Carousel.`);
  return context;
}

export type CarouselProps = ComponentPropsWithRef<"section"> & {
  /** Names the carousel for screen readers. It is not shown. */
  label: string;
  children: ReactNode;
};

/**
 * Related content to move through, one slide at a time. Compose it from `CarouselViewport` and
 * `CarouselSlide`, then `CarouselControls` with `CarouselPrevious`, `CarouselPosition` and
 * `CarouselNext`. There is no autoplay or looping.
 */
export function Carousel({ label, children, className = "", ...props }: CarouselProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const timing = useMotionTiming();
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const current = Math.min(index, Math.max(0, count - 1));
  const context = useMemo(
    () => ({
      viewport,
      index: current,
      count,
      setIndex,
      setCount,
      go: (next: number) => {
        const element = viewport.current;
        if (!element) return;
        const direction = getComputedStyle(element).direction === "rtl" ? -1 : 1;
        element.scrollTo({
          left: direction * next * element.clientWidth,
          behavior: timing.reduced ? "instant" : "smooth",
        });
      },
    }),
    [current, count, timing.reduced],
  );
  return (
    <CarouselContext value={context}>
      <section
        {...props}
        className={`x-govuk-ui-carousel ${className}`.trim()}
        aria-label={label}
        aria-roledescription="carousel"
      >
        {children}
      </section>
    </CarouselContext>
  );
}

export type CarouselViewportProps = ComponentPropsWithRef<"div"> & { children: ReactNode };

/** The slides, side by side. Native scrolling moves them with touch, a trackpad or the keyboard. */
export function CarouselViewport({ children, className = "", ...props }: CarouselViewportProps) {
  const carousel = useCarousel("CarouselViewport");
  const slides = Children.toArray(children);
  const { setCount } = carousel;
  useLayoutEffect(() => setCount(slides.length), [setCount, slides.length]);
  return (
    <div
      {...props}
      ref={carousel.viewport}
      className={`x-govuk-ui-carousel-viewport ${className}`.trim()}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Native horizontal scrolling needs keyboard focus.
      tabIndex={0}
      onScroll={(event) => {
        const element = event.currentTarget;
        if (element.clientWidth)
          carousel.setIndex(Math.round(Math.abs(element.scrollLeft) / element.clientWidth));
      }}
    >
      {slides.map((slide, index) => (
        // Each slide learns its position, so it can be announced as "2 of 3".
        <SlideContext
          key={isValidElement(slide) && slide.key !== null ? slide.key : index}
          value={{ index, count: slides.length }}
        >
          {slide}
        </SlideContext>
      ))}
      {!slides.length && <p>No slides available.</p>}
    </div>
  );
}

export type CarouselSlideProps = ComponentPropsWithRef<"div"> & {
  /** Names the slide for screen readers, after its position, such as "2 of 3: Your community". */
  label: string;
};

/** One slide. */
export function CarouselSlide({ label, className = "", ...props }: CarouselSlideProps) {
  const { index, count } = useContext(SlideContext);
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA carousel slides are groups, not form fieldsets.
    <div
      {...props}
      className={`x-govuk-ui-carousel-slide ${className}`.trim()}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}: ${label}`}
    />
  );
}

/** Lays out the buttons and the position beneath the slides. */
export function CarouselControls({ className = "", ...props }: ComponentPropsWithRef<"div">) {
  return <div {...props} className={`x-govuk-ui-carousel-controls ${className}`.trim()} />;
}

const arrow = (path: string) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);

/** The arrows are Buttons, and take a Button's props. */
export type CarouselButtonProps = Omit<ButtonProps, "children"> & { label?: string };

/** Moves to the previous slide. It is unavailable on the first. */
export function CarouselPrevious({ label = "Previous slide", ...props }: CarouselButtonProps) {
  const carousel = useCarousel("CarouselPrevious");
  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label={label}
      {...props}
      data-sound="tick"
      disabled={carousel.index === 0}
      onClick={() => carousel.go(carousel.index - 1)}
    >
      {arrow("M19 12H5m6-6-6 6 6 6")}
    </Button>
  );
}

/** Moves to the next slide. It is unavailable on the last. */
export function CarouselNext({ label = "Next slide", ...props }: CarouselButtonProps) {
  const carousel = useCarousel("CarouselNext");
  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label={label}
      {...props}
      data-sound="tick"
      disabled={carousel.index >= carousel.count - 1}
      onClick={() => carousel.go(carousel.index + 1)}
    >
      {arrow("M5 12h14m-6-6 6 6-6 6")}
    </Button>
  );
}

/** Where the person is, such as "2 of 3". Screen readers hear it change. */
export function CarouselPosition({ className = "", ...props }: ComponentPropsWithRef<"span">) {
  const { index, count } = useCarousel("CarouselPosition");
  return (
    <span
      {...props}
      className={`x-govuk-ui-carousel-position ${className}`.trim()}
      aria-live="polite"
      aria-atomic="true"
    >
      {count ? `${index + 1} of ${count}` : "0 slides"}
    </span>
  );
}
