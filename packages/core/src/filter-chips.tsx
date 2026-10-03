"use client";

import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { AnimatePresence, motion, type TargetAndTransition } from "motion/react";
import {
  type ComponentPropsWithRef,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { duration, useMotionTiming } from "./motion";
import { useMergedRef } from "./refs";

export type FilterChipsProps = Omit<
  ComponentPropsWithRef<"div">,
  "defaultValue" | "onValueChange"
> & {
  children: ReactNode;
  /** Names the filters for screen readers, such as "Filter by status". */
  label: string;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /**
   * Lets any number of chips be on, as for filters. Without it, at most one chip is on. Choosing
   * another chip moves the choice to it, and pressing the chosen chip again leaves none chosen. Use
   * that for a choice that may be left unmade, such as a starting point.
   */
  multiple?: boolean;
  /** `small` suits a panel of settings, such as the workbench's playground. */
  size?: "medium" | "small";
};

type Box = { left: number; top: number; width: number; height: number };
/** A run of chosen chips side by side on one line, drawn as one shape. */
type Run = { key: string; members: string[]; box: Box; from?: Box & { opacity: number } };

const boxOf = (chips: HTMLElement[]): Box => {
  const first = chips[0]!;
  const last = chips.at(-1)!;
  return {
    left: first.offsetLeft,
    top: first.offsetTop,
    width: last.offsetLeft + last.offsetWidth - first.offsetLeft,
    height: first.offsetHeight,
  };
};

/**
 * Filters people turn on and off, such as statuses above a list. Each chip is a toggle button. Any
 * number can be on, or at most one with `multiple` off. Chosen chips side by side join into one
 * shape, drawn behind them. A chip just chosen grows its colour out across its chosen neighbours.
 * A chip just turned off draws the colour back into itself before it fades. Chips never move, and
 * chips on different lines never join. Compose it from `FilterChip`.
 */
export function FilterChips({
  children,
  label,
  value,
  defaultValue = [],
  onValueChange,
  multiple = true,
  size = "medium",
  className = "",
  ref,
  ...props
}: FilterChipsProps) {
  const [own, setOwn] = useState(defaultValue);
  const chosen = value ?? own;
  const group = useRef<HTMLDivElement>(null);
  const timing = useMotionTiming();
  const [runs, setRuns] = useState<Run[]>([]);
  const [settled, setSettled] = useState(true);
  // How each departing shape leaves. It is either drawn back into the chip just turned off, or
  // removed once a growing shape has covered it.
  const exits = useRef(new Map<string, TargetAndTransition>());
  const before = useRef<{ on: Set<string>; runs: Run[] }>({ on: new Set(), runs: [] });
  const count = useRef(0);

  const measure = useCallback(
    (animate: boolean) => {
      const chips = [
        ...(group.current?.querySelectorAll<HTMLElement>(".x-govuk-ui-filter-chip") ?? []),
      ];
      const valueFor = (chip: HTMLElement) => chip.dataset.value ?? "";
      const on = new Set(chips.filter((chip) => chip.hasAttribute("data-pressed")).map(valueFor));
      const groups: HTMLElement[][] = [];
      chips.forEach((chip, index) => {
        if (!on.has(valueFor(chip))) return;
        const last = groups.at(-1);
        const previous = chips[index - 1];
        if (last && previous && last.at(-1) === previous && previous.offsetTop === chip.offsetTop)
          last.push(chip);
        else groups.push([chip]);
      });
      const was = before.current;
      const added = new Set([...on].filter((item) => !was.on.has(item)));
      const removed = new Set([...was.on].filter((item) => !on.has(item)));
      // A chip turned off under the pointer takes the colour off the shape itself, fading from blue
      // to its hover tint. Its shape goes at once, so no blue is left beneath it to show through if
      // the pointer moves off before the fade ends.
      const pointed = animate
        ? chips.find((chip) => removed.has(valueFor(chip)) && chip.matches(":hover"))
        : undefined;
      const pointedRun = pointed && was.runs.find((run) => run.members.includes(valueFor(pointed)));
      if (pointed && !window.matchMedia("(forced-colors: active)").matches) {
        const brand = getComputedStyle(pointed).getPropertyValue("--x-govuk-ui-brand").trim();
        if (!timing.reduced && brand)
          pointed.animate([{ backgroundColor: brand, offset: 0 }], {
            duration: duration.medium * 1000,
            easing: "ease",
          });
      }
      const next = groups.map((members): Run => {
        const values = members.map(valueFor);
        const same = was.runs.find((run) => run.members.join(" ") === values.join(" "));
        if (same) return { ...same, box: boxOf(members), from: undefined };
        const grown = members.filter((chip) => added.has(valueFor(chip)));
        // The chosen chips beside it keep their colour, which draws back off the chip turned off.
        if (
          pointedRun &&
          !grown.length &&
          values.every((item) => pointedRun.members.includes(item))
        )
          return {
            key: `run-${count.current++}`,
            members: values,
            box: boxOf(members),
            from: { ...pointedRun.box, opacity: 1 },
          };
        // A run that gained a chip grows out of that chip. A chip on its own fades in, unless it is
        // under the pointer, where its hover tint fades away over the shape instead.
        const alone =
          grown.length === members.length && !grown.some((chip) => chip.matches(":hover"));
        let from: Run["from"];
        if (animate && grown.length) from = { ...boxOf(grown), opacity: alone ? 0 : 1 };
        return { key: `run-${count.current++}`, members: values, box: boxOf(members), from };
      });
      const slow = duration.medium;
      for (const run of was.runs) {
        if (next.some((kept) => kept.key === run.key)) continue;
        const left = chips.filter(
          (chip) => run.members.includes(valueFor(chip)) && removed.has(valueFor(chip)),
        );
        // A run whose chips are all turned off simply fades. A chip turned off beside others that
        // stay chosen draws the colour back into itself first. The shape under the pointer goes at
        // once. A shape that a growing shape has covered goes once the growing shape has finished.
        const alone = left.length === run.members.length;
        let exit: TargetAndTransition = {
          opacity: 0,
          transition: { duration: 0, delay: timing.reduced ? 0 : slow },
        };
        if (run === pointedRun) exit = { opacity: 0, transition: { duration: 0 } };
        else if (animate && left.length)
          exit = {
            ...boxOf(left),
            opacity: 0,
            transition: {
              ...timing.ease(slow),
              opacity: { ...timing.ease(duration.fast), delay: timing.reduced || alone ? 0 : slow },
            },
          };
        exits.current.set(run.key, exit);
      }
      before.current = { on, runs: next };
      setSettled(!animate);
      setRuns(next);
    },
    [timing],
  );

  // The shapes are drawn in place at first, and move with each choice after.
  const mounted = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The shapes change with the choice.
  useLayoutEffect(() => {
    measure(mounted.current);
    mounted.current = true;
  }, [chosen.join(" ")]);
  useEffect(() => {
    const element = group.current;
    if (!element) return;
    // A new width can rewrap the chips, so the shapes are drawn again in place, without moving.
    const observer = new ResizeObserver(() => measure(false));
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  const mergedRef = useMergedRef(group, ref);
  return (
    <ToggleGroup
      {...props}
      ref={mergedRef}
      className={`x-govuk-ui-filter-chips ${className}`.trim()}
      data-size={size === "small" ? "small" : undefined}
      aria-label={label}
      multiple={multiple}
      value={chosen}
      onValueChange={(next: string[]) => {
        if (value === undefined) setOwn(next);
        onValueChange?.(next);
      }}
    >
      <AnimatePresence initial={false} custom={exits.current}>
        {runs.map((run) => (
          <motion.span
            key={run.key}
            className="x-govuk-ui-filter-chips-track"
            aria-hidden="true"
            custom={exits.current}
            initial={run.from ?? false}
            animate={{ ...run.box, opacity: 1 }}
            exit="leave"
            variants={{
              leave: (leaving: Map<string, TargetAndTransition>) =>
                leaving.get(run.key) ?? { opacity: 0 },
            }}
            transition={settled ? { duration: 0 } : timing.ease(duration.medium)}
          />
        ))}
      </AnimatePresence>
      {children}
    </ToggleGroup>
  );
}

export type FilterChipProps = Omit<ComponentPropsWithRef<"button">, "value" | "disabled"> & {
  value: string;
  children: ReactNode;
  /** How many results the filter would show, such as 12. */
  count?: number;
  disabled?: boolean;
};

/**
 * One filter. When off, it has a plus. When on, it takes the brand-blue shape behind it, and the
 * plus turns into a tick in the same place, so the chip never changes width.
 */
export function FilterChip({
  value,
  children,
  count,
  disabled,
  className = "",
  ...props
}: FilterChipProps) {
  return (
    <Toggle
      {...props}
      className={`x-govuk-ui-filter-chip ${className}`.trim()}
      value={value}
      data-value={value}
      disabled={disabled}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path className="x-govuk-ui-filter-chip-plus" d="M8 3v10M3 8h10" />
        <path className="x-govuk-ui-filter-chip-tick" pathLength={1} d="m3 8.5 3 3 7-7" />
      </svg>
      {children}
      {count !== undefined && <span className="x-govuk-ui-filter-chip-count">{count}</span>}
    </Toggle>
  );
}
