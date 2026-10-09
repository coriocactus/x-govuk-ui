"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  type ComponentPropsWithRef,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { duration, useMotionTiming } from "./motion";
import { OrganisationName } from "./organisation-name";
import { useMergedRef } from "./refs";

/**
 * The least width a logo's place keeps, in ems of the carousel's text, so a name is never crowded.
 */
const LEAST_PLACE = 9;

export type LogoCarouselItem = {
  /** The organisation's name. Screen readers hear it, and it is the logo when there is no image. */
  name: string;
  /** The organisation's logo. Without one, its name shows as GOV.UK sets an organisation's name. */
  logo?: ReactNode;
  /** The colour of the bar beside the name, such as a department's brand colour. */
  colour?: string;
};

export type LogoCarouselProps = ComponentPropsWithRef<"section"> & {
  /** Says who the organisations are, such as "Working with". */
  label: string;
  items: readonly LogoCarouselItem[];
  /**
   * The most logos that show at once. Fewer show where there is less room, such as on a phone, so
   * each keeps room for its name.
   */
  visible?: number;
  /** How long a logo stays before the next takes its place, in milliseconds. */
  interval?: number;
};

/**
 * A wall of logos shown a few at a time, for the governments and public bodies a service works
 * with. Every few seconds, one place turns over. The logo there rolls up and away as the next rises
 * in, and each place takes its turn. It stops while the pointer is over it or something in it has
 * focus. A button pauses it, as moving content must offer. With reduced motion, it starts paused.
 * Screen readers hear every organisation, in a list.
 */
export function LogoCarousel({
  label,
  items,
  visible = 4,
  interval = 2600,
  className = "",
  ref,
  ...props
}: LogoCarouselProps) {
  const timing = useMotionTiming();
  const root = useRef<HTMLElement>(null);
  const merged = useMergedRef(root, ref);
  // As many places as fit the carousel's width at their least width, up to `visible`. The carousel
  // is a container, so its width is its column's, whatever logos it contains.
  const [fits, setFits] = useState(visible);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => {
      const em = Number.parseFloat(getComputedStyle(element).fontSize) || 16;
      setFits(Math.max(1, Math.floor(element.clientWidth / (LEAST_PLACE * em))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const count = Math.min(visible, fits, items.length);
  // The places, each with the logo it shows, and which place turns over next and which logo comes
  // next. They are kept together, so each turn is worked out from the last alone, however many
  // times React calls the update.
  const [state, setState] = useState(() => ({
    slots: Array.from({ length: count }, (_, index) => index),
    turn: 0,
    next: count,
  }));
  const { slots } = state;
  // When the space changes, places go from the end, or new places take logos not already on show.
  useLayoutEffect(() => {
    setState((current) => {
      const { slots } = current;
      if (slots.length === count) return current;
      if (slots.length > count) return { ...current, slots: slots.slice(0, count) };
      const filled = [...slots];
      for (let candidate = 0; filled.length < count && candidate < items.length; candidate++) {
        if (!filled.includes(candidate)) filled.push(candidate);
      }
      return { ...current, slots: filled };
    });
  }, [count, items.length]);
  const [paused, setPaused] = useState(timing.reduced);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (paused || held || items.length <= count) return;
    const timer = setInterval(() => {
      setState(({ slots, turn, next }) => {
        // The next logo not already on show takes the next place.
        let candidate = next % items.length;
        while (slots.includes(candidate)) candidate = (candidate + 1) % items.length;
        const place = turn % count;
        return {
          slots: slots.map((item, index) => (index === place ? candidate : item)),
          turn: turn + 1,
          next: candidate + 1,
        };
      });
    }, interval);
    return () => clearInterval(timer);
  }, [paused, held, items.length, count, interval]);

  return (
    <section
      {...props}
      ref={merged}
      className={`x-govuk-ui-logo-carousel ${className}`.trim()}
      aria-label={label}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false);
      }}
    >
      <div className="x-govuk-ui-logo-carousel-header">
        <p className="x-govuk-ui-logo-carousel-label">{label}</p>
        {items.length > count && (
          <Button
            variant="quiet"
            size="small"
            className="x-govuk-ui-logo-carousel-pause"
            aria-pressed={paused}
            onClick={() => setPaused(!paused)}
          >
            {paused ? "Play" : "Pause"}
            <span className="x-govuk-ui-visually-hidden"> the logos</span>
          </Button>
        )}
      </div>
      <ul className="x-govuk-ui-visually-hidden">
        {items.map((item) => (
          <li key={item.name}>{item.name}</li>
        ))}
      </ul>
      <div
        className="x-govuk-ui-logo-carousel-wall"
        style={{ "--x-govuk-ui-logo-places": count } as CSSProperties}
        aria-hidden="true"
      >
        {slots.map((item, place) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: A place on the wall is known by its position.
          <div key={place} className="x-govuk-ui-logo-carousel-place">
            {/* Every logo is stacked out of sight in the first place. The wall is then as tall as
              the tallest logo, such as the longest name, so no logo is cut short, and the wall
              never changes height as they turn over. */}
            {place === 0 && (
              <div className="x-govuk-ui-logo-carousel-sizer">
                {items.map((each) => (
                  <div key={each.name} className="x-govuk-ui-logo-carousel-logo">
                    <Logo item={each} />
                  </div>
                ))}
              </div>
            )}
            <AnimatePresence initial={false}>
              <motion.div
                key={items[item]?.name}
                className="x-govuk-ui-logo-carousel-logo"
                initial={{ y: "70%", opacity: 0, filter: "blur(4px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: "-70%", opacity: 0, filter: "blur(4px)" }}
                transition={timing.ease(duration.slow + 0.2)}
              >
                {items[item] && <Logo item={items[item]} />}
              </motion.div>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}

/** An organisation's logo, or its name as GOV.UK sets it, beside a bar of its colour. */
function Logo({ item }: { item: LogoCarouselItem }) {
  if (item.logo) return <>{item.logo}</>;
  return (
    <OrganisationName colour={item.colour} size="small" className="x-govuk-ui-logo-carousel-name">
      {item.name}
    </OrganisationName>
  );
}
