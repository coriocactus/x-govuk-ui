"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { Kbd } from "./kbd";

export type TooltipSide = "top" | "right" | "bottom" | "left";

export type TooltipProps = {
  /** The hint. Tooltips are only visual, so the trigger still needs a matching accessible name. */
  content: ReactNode;
  /** A keyboard shortcut shown after the hint, such as "⌘ B". */
  shortcut?: string;
  side?: TooltipSide;
  disabled?: boolean;
  /** Points the tooltip at its trigger with a small arrow. */
  arrow?: boolean;
  /** The trigger, such as a Button. It receives the tooltip's props and ref. */
  children: ReactElement;
};

export type TooltipGroupProps = {
  /** The side for tooltips in the group that do not choose their own. */
  side?: TooltipSide;
  /** Points the shared tooltip at each trigger with a small arrow that glides with it. */
  arrow?: boolean;
  children: ReactNode;
};

export type TooltipProviderProps = {
  children: ReactNode;
  /** Milliseconds the pointer rests on a trigger before the first tooltip opens. */
  delay?: number;
  /** Milliseconds after the pointer leaves before a tooltip closes. */
  closeDelay?: number;
  /** Milliseconds after one tooltip closes during which the next opens at once. */
  timeout?: number;
};

type Hint = { content: ReactNode; shortcut?: string; side: TooltipSide };
type Group = { handle: BaseTooltip.Handle<Hint>; side: TooltipSide };

const TooltipGroupContext = createContext<Group | null>(null);
const InProvider = createContext(false);
const delay = 60;

/**
 * Shares one opening delay between the tooltips inside it, wherever they are on the page. Once
 * one tooltip has opened, moving to another opens it at once, without the fade. Put it near the
 * root of the application. Tooltips in a TooltipGroup already behave this way, and glide too.
 */
export function TooltipProvider({
  children,
  delay: opening = delay,
  closeDelay = 0,
  timeout = 400,
}: TooltipProviderProps) {
  return (
    <InProvider value={true}>
      <BaseTooltip.Provider delay={opening} closeDelay={closeDelay} timeout={timeout}>
        {children}
      </BaseTooltip.Provider>
    </InProvider>
  );
}

function TooltipPopup({
  side,
  arrow = false,
  children,
}: {
  side: TooltipSide;
  arrow?: boolean;
  children: ReactNode;
}) {
  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        className="x-govuk-ui-tooltip-positioner"
        side={side}
        sideOffset={8}
        collisionPadding={8}
      >
        <BaseTooltip.Popup className="x-govuk-ui-tooltip">
          {arrow && <BaseTooltip.Arrow className="x-govuk-ui-tooltip-arrow" />}
          <BaseTooltip.Viewport className="x-govuk-ui-tooltip-viewport">
            {children}
          </BaseTooltip.Viewport>
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

function TooltipContent({ content, shortcut }: Omit<Hint, "side">) {
  return (
    <span className="x-govuk-ui-tooltip-content">
      {content}
      {shortcut && <Kbd className="x-govuk-ui-tooltip-shortcut">{shortcut}</Kbd>}
    </span>
  );
}

/**
 * Tooltips inside a group share one popup. Moving between their triggers glides the popup to the
 * next trigger and morphs its size and text, instead of closing one tooltip and opening another.
 */
export function TooltipGroup({ side = "top", arrow = false, children }: TooltipGroupProps) {
  const [handle] = useState(() => BaseTooltip.createHandle<Hint>());
  const group = useMemo(() => ({ handle, side }), [handle, side]);
  return (
    <TooltipGroupContext value={group}>
      {children}
      <BaseTooltip.Root handle={handle}>
        {({ payload }) => (
          <TooltipPopup side={payload?.side ?? side} arrow={arrow}>
            {payload && <TooltipContent content={payload.content} shortcut={payload.shortcut} />}
          </TooltipPopup>
        )}
      </BaseTooltip.Root>
    </TooltipGroupContext>
  );
}

/**
 * A short hint that appears while the pointer rests on its trigger or the trigger has focus,
 * such as an icon button's name and its shortcut. In a TooltipGroup, it shares the group's popup.
 * In a TooltipProvider, a tooltip on its own takes the provider's delay.
 */
export function Tooltip({
  content,
  shortcut,
  side,
  disabled = false,
  arrow = false,
  children,
}: TooltipProps) {
  const group = useContext(TooltipGroupContext);
  // A tooltip on its own inside a TooltipProvider takes the provider's delay. A tooltip in a group
  // keeps the group's own short delay, because the group's shared popup already opens at once from
  // one trigger to the next.
  const own = useContext(InProvider) ? undefined : delay;
  const hint = { content, shortcut, side: side ?? group?.side ?? "top" };
  if (group)
    return (
      <BaseTooltip.Trigger
        handle={group.handle}
        payload={hint}
        delay={delay}
        disabled={disabled}
        render={children}
      />
    );
  return (
    <BaseTooltip.Root disabled={disabled}>
      <BaseTooltip.Trigger delay={own} render={children} />
      <TooltipPopup side={hint.side} arrow={arrow}>
        <TooltipContent content={content} shortcut={shortcut} />
      </TooltipPopup>
    </BaseTooltip.Root>
  );
}
