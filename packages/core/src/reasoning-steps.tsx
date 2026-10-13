"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { type ComponentPropsWithRef, type ReactNode, useEffect, useState } from "react";
import { ChevronIcon, TickIcon } from "./icons";
import { useLabels } from "./labels";
import { Spinner } from "./spinner";
import { TextShimmer } from "./text-shimmer";

export type ReasoningStepsProps = Omit<ComponentPropsWithRef<"div">, "title" | "onOpenChange"> & {
  /** While the assistant is still working, the title shimmers and the steps stay open. */
  active?: boolean;
  /** What the title says while the assistant works, and once it has finished. */
  activeTitle?: ReactNode;
  title?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

/** The words Reasoning steps writes, which a LabelsProvider can change. */
export type ReasoningStepsLabels = {
  /** The title while the work goes on. */
  thinking: string;
  /** The title once the work is done. */
  showSteps: string;
  /** Tells screen readers a step is done. */
  done: string;
  /** Tells screen readers a step is under way. */
  active: string;
  /** Tells screen readers a step has not started. */
  pending: string;
};

export const defaultReasoningStepsLabels: ReasoningStepsLabels = {
  thinking: "Thinking",
  showSteps: "Show the steps",
  done: "Done",
  active: "In progress",
  pending: "Not started",
};

/**
 * The steps an assistant took to reach its answer, behind a title that opens them, such as
 * "Checked 3 sources". While the assistant works, the title shimmers and the steps stay open. They
 * fold away once it has finished. Each step shows whether it is done, under way or still to come,
 * along a line that joins them. It is built on Base UI's Collapsible. Compose it from
 * `ReasoningStep`.
 */
export function ReasoningSteps({
  active = false,
  activeTitle: ownActiveTitle,
  title: ownTitle,
  open,
  defaultOpen,
  onOpenChange,
  children,
  className = "",
  ...props
}: ReasoningStepsProps) {
  const words = useLabels("reasoningSteps", defaultReasoningStepsLabels);
  const activeTitle = ownActiveTitle ?? words.thinking;
  const title = ownTitle ?? words.showSteps;
  const [own, setOwn] = useState(defaultOpen ?? active);
  // The steps open when work starts, and fold away when it ends, unless the reader opens or closes
  // them.
  useEffect(() => setOwn(active), [active]);
  return (
    <Collapsible.Root
      {...props}
      className={`x-govuk-ui-reasoning ${className}`.trim()}
      open={open ?? own}
      onOpenChange={(next) => {
        setOwn(next);
        onOpenChange?.(next);
      }}
      data-active={active || undefined}
    >
      <Collapsible.Trigger className="x-govuk-ui-reasoning-trigger">
        {active ? <TextShimmer>{activeTitle}</TextShimmer> : title}
        <ChevronIcon size={12} strokeWidth={2} />
      </Collapsible.Trigger>
      <Collapsible.Panel className="x-govuk-ui-reasoning-panel">
        <ol className="x-govuk-ui-reasoning-steps">{children}</ol>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

export type ReasoningStepProps = ComponentPropsWithRef<"li"> & {
  status?: "done" | "active" | "pending";
  /** A detail beneath the step, such as the sources it read. */
  detail?: ReactNode;
  children: ReactNode;
};

/** One step, with a tick once done, a spinner while under way, or a hollow dot before it starts. */
export function ReasoningStep({
  status = "done",
  detail,
  children,
  className = "",
  ...props
}: ReasoningStepProps) {
  const words = useLabels("reasoningSteps", defaultReasoningStepsLabels);
  return (
    <li {...props} className={`x-govuk-ui-reasoning-step ${className}`.trim()} data-status={status}>
      <span className="x-govuk-ui-reasoning-mark" aria-hidden="true">
        {status === "done" && <TickIcon size={12} strokeWidth={2.2} />}
        {status === "active" && <Spinner size="small" />}
      </span>
      <span className="x-govuk-ui-reasoning-text">
        <span className="x-govuk-ui-visually-hidden">{words[status]}: </span>
        {children}
        {detail && <span className="x-govuk-ui-reasoning-detail">{detail}</span>}
      </span>
    </li>
  );
}
