"use client";

import {
  Toast as Primitive,
  type ToastManagerPromiseOptions,
  type ToastManagerUpdateOptions,
} from "@base-ui/react/toast";
import { AnimatePresence, motion } from "motion/react";
import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Countdown } from "./countdown";
import { CrossIcon } from "./icons";
import { duration, easeOut, springs, useMotionTiming } from "./motion";
import { useScopeSound } from "./sound-scope";
import { Spinner } from "./spinner";

type Stage = string | ToastManagerUpdateOptions<object>;

/**
 * Base UI turns a plain string into a description. These toasts lead with a title, so a string
 * becomes the title. Each stage also clears the previous stage's description, so the loading text
 * never lingers beside the result.
 */
const stage = (option: Stage): ToastManagerUpdateOptions<object> =>
  typeof option === "string"
    ? { title: option, description: undefined }
    : { description: undefined, ...option };

/** Base UI's toast manager, with promise stages that replace each other's text. */
export function useToastManager() {
  const manager = Primitive.useToastManager();
  return useMemo(
    () => ({
      ...manager,
      promise: <Value,>(
        promise: Promise<Value>,
        options: ToastManagerPromiseOptions<Value, object>,
      ) => {
        const { loading, success, error } = options;
        return manager.promise(promise, {
          loading: stage(loading),
          success:
            typeof success === "function"
              ? (result: Value) => stage(success(result))
              : stage(success),
          error:
            typeof error === "function" ? (reason: unknown) => stage(error(reason)) : stage(error),
        });
      },
    }),
    [manager],
  );
}

/** Where a stack of toasts can sit in the window. */
export const toastPositions = [
  "top-start",
  "top-center",
  "top-end",
  "bottom-start",
  "bottom-center",
  "bottom-end",
] as const;
export type ToastPosition = (typeof toastPositions)[number];
export type ToastProviderProps = {
  children: ReactNode;
  /** Where the stack sits in the window. */
  position?: ToastPosition;
  /** Milliseconds before a toast closes. Pass `timeout: 0` to a toast to keep it open. */
  timeout?: number;
  /** How many toasts can show at once. Older ones wait until there is room. */
  limit?: number;
  /**
   * How users dismiss a toast with a pointer, by tapping it or by dragging it off the screen.
   * Keyboard users press F6 to reach the stack, then Escape.
   */
  dismiss?: "tap" | "drag";
  /** Shows a close button on every toast. Toasts that never time out always have one. */
  closeButton?: boolean;
  /**
   * Shows the time left on each toast that times out, as a line along its foot in the colour of
   * its type. The line shrinks as the time runs out, and stops while the stack is paused. A toast
   * can choose for itself with `data.countdown`. The line's colour is
   * `--x-govuk-ui-countdown-colour`, and its thickness is `--x-govuk-ui-countdown-height`.
   */
  countdown?: boolean;
};

/**
 * Keeps the toasts for the page, and shows them in a stack at one corner or edge. Open them with
 * `useToastManager`. Each toast leads with its title and shows its type's mark. It can time out, be
 * dismissed by hand, or follow a promise through loading to its result. Base UI provides the
 * behaviour, so keyboard users reach the stack with F6.
 */
export function ToastProvider({
  children,
  position = "top-center",
  timeout = 4000,
  limit = 4,
  dismiss = "tap",
  closeButton = false,
  countdown = true,
}: ToastProviderProps) {
  return (
    <Primitive.Provider timeout={timeout} limit={limit}>
      <ToastRegion
        position={position}
        dismiss={dismiss}
        closeButton={closeButton}
        countdown={countdown}
        timeout={timeout}
      >
        {children}
      </ToastRegion>
    </Primitive.Provider>
  );
}

const glyphs = {
  loading: <Spinner size="small" className="x-govuk-ui-toast-spinner" />,
  success: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path
        d="m4.8 8.3 2.1 2.1 4.3-4.6"
        fill="none"
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth="1.8"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path
        d="m5.5 5.5 5 5m0-5-5 5"
        fill="none"
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth="1.8"
      />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path
        d="M8 4.2v4.6"
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.4" r="1.05" fill="var(--x-govuk-ui-paper)" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="currentColor" />
      <path
        d="M8 7.2v4.4"
        stroke="var(--x-govuk-ui-paper)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="8" cy="4.6" r="1.05" fill="var(--x-govuk-ui-paper)" />
    </svg>
  ),
};
type SwipeDirection = "up" | "down" | "left" | "right";
/** Pixels per millisecond. Faster than this, a short drag counts as a flick. */
const FLICK_SPEED = 0.3;

const spoken: Partial<Record<string, string>> = { error: "Error: ", warning: "Warning: " };

function Glyph({ type }: { type?: string }) {
  const timing = useMotionTiming();
  const known = type && Object.hasOwn(glyphs, type) ? (type as keyof typeof glyphs) : null;
  return (
    <AnimatePresence initial={false} mode="popLayout">
      {known && (
        <motion.span
          key={known}
          className="x-govuk-ui-toast-glyph"
          data-type={known}
          initial={{ opacity: 0, scale: 0.3, filter: "blur(3px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.3, filter: "blur(3px)" }}
          transition={timing.spring(springs.settle)}
        >
          {glyphs[known]}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/**
 * Crossfades the message when it changes, such as when a promise resolves. The width animates from
 * the old text to the new, so the toast morphs instead of snapping, and the old text stays inside.
 */
function ToastTitle({ title, type }: { title: ReactNode; type?: string }) {
  const timing = useMotionTiming();
  const frame = useRef<HTMLHeadingElement>(null);
  const width = useRef<number | null>(null);
  const key = String(title);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element || !key) return;
    // The outgoing text is already out of the layout here, so this is the new text's width.
    // Fractions are measured too. Ending even a fraction of a pixel short would clip the text,
    // which would then jump back into place when the animation finishes.
    const from = width.current;
    const to = element.getBoundingClientRect().width;
    width.current = to;
    if (from === null || Math.abs(from - to) < 0.5 || timing.reduced) return;
    // Clip instead of showing an ellipsis while the width changes, so growing text is revealed.
    element.dataset.morphing = "";
    const animation = element.animate([{ width: `${from}px` }, { width: `${to}px` }], {
      duration: duration.slow * 1000,
      easing: `cubic-bezier(${easeOut.join(", ")})`,
    });
    const settle = () => delete element.dataset.morphing;
    animation.addEventListener("finish", settle);
    animation.addEventListener("cancel", settle);
  }, [key, timing.reduced]);

  return (
    <Primitive.Title ref={frame} className="x-govuk-ui-toast-title">
      {type && spoken[type] && <span className="x-govuk-ui-visually-hidden">{spoken[type]}</span>}
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={key}
          className="x-govuk-ui-toast-message"
          initial={{ opacity: 0, x: -6, filter: "blur(2px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: 6, filter: "blur(2px)" }}
          transition={timing.spring(springs.settle)}
        >
          {title}
        </motion.span>
      </AnimatePresence>
    </Primitive.Title>
  );
}

function ToastRegion({
  children,
  position,
  dismiss,
  closeButton,
  countdown,
  timeout,
}: {
  children: ReactNode;
  position: ToastPosition;
  dismiss: "tap" | "drag";
  closeButton: boolean;
  countdown: boolean;
  timeout: number;
}) {
  // Kept in state, not a ref, because the portal reads its container on render, and a ref is still
  // empty then.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { toasts, close } = useToastManager();
  const play = useScopeSound();
  // Tapping the toast, or pressing Enter while it has focus, dismisses it. Its own controls, such
  // as the action, keep their usual behaviour.
  const tapToDismiss = (id: string, event: { target: EventTarget; currentTarget: Element }) => {
    if (event.target instanceof Element && event.target.closest("button, a")) return;
    play("close");
    close(id);
  };
  const [side, align] = position.split("-") as ["top" | "bottom", "start" | "center" | "end"];
  // A toast is dragged off sideways, or towards the edge its stack sits at.
  let swipeDirections: SwipeDirection[] = [];
  if (dismiss === "drag") swipeDirections = [side === "top" ? "up" : "down", "left", "right"];

  // Base UI dismisses a toast dragged 40px. A quick flick dismisses it too, however short, in the
  // direction it was thrown.
  const press = useRef<{ x: number; y: number; time: number } | null>(null);
  const flickStart = (event: PointerEvent<HTMLDivElement>) => {
    press.current = { x: event.clientX, y: event.clientY, time: event.timeStamp };
  };
  const flickEnd = (id: string, event: PointerEvent<HTMLDivElement>) => {
    const start = press.current;
    press.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const speed = distance / Math.max(1, event.timeStamp - start.time);
    // Base UI finishes long drags itself.
    if (distance < 8 || distance >= 40 || speed < FLICK_SPEED) return;
    let direction: SwipeDirection;
    if (Math.abs(dx) > Math.abs(dy)) direction = dx > 0 ? "right" : "left";
    else direction = dy > 0 ? "down" : "up";
    if (!swipeDirections.includes(direction)) return;
    event.currentTarget.dataset.flick = direction;
    play("close");
    close(id);
  };
  const front = toasts.find((toast) => toast.transitionStatus !== "ending" && !toast.limited);

  // Toasts behind the front one take its width, so the pile reads as one stack.
  const measureFront = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    let frame = 0;
    // Writing in the next frame keeps the measurement out of the current layout pass.
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        element.parentElement?.style.setProperty(
          "--x-govuk-ui-toast-front-width",
          `${element.offsetWidth}px`,
        ),
      );
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // A toast that times out shows its time running out, unless it or the provider says not to.
  const timeLeft = (toast: (typeof toasts)[number]) => {
    const time = toast.timeout ?? timeout;
    const own = toast.data?.countdown;
    const shown = typeof own === "boolean" ? own : countdown;
    return shown && toast.type !== "loading" && time > 0 ? time : 0;
  };

  // Base UI stops the toasts' time while the window is in the background, so their countdowns
  // stop too.
  useEffect(() => {
    if (!container) return;
    const away = () => container.toggleAttribute("data-window-away", true);
    const back = () => container.toggleAttribute("data-window-away", false);
    window.addEventListener("blur", away);
    window.addEventListener("focus", back);
    return () => {
      window.removeEventListener("blur", away);
      window.removeEventListener("focus", back);
    };
  }, [container]);

  // While a toast's width animates, as the stack fans out or closes up, its text is clipped by the
  // moving edge instead of being cut short with an ellipsis that would flicker.
  useEffect(() => {
    if (!container) return;
    const mark = (resizing: boolean) => (event: TransitionEvent) => {
      const toast = event.target;
      if (event.propertyName !== "width" || !(toast instanceof HTMLElement)) return;
      if (toast.matches(".x-govuk-ui-toast")) toast.toggleAttribute("data-resizing", resizing);
    };
    const start = mark(true);
    const stop = mark(false);
    container.addEventListener("transitionrun", start);
    container.addEventListener("transitionend", stop);
    container.addEventListener("transitioncancel", stop);
    return () => {
      container.removeEventListener("transitionrun", start);
      container.removeEventListener("transitionend", stop);
      container.removeEventListener("transitioncancel", stop);
    };
  }, [container]);

  return (
    <div ref={setContainer} className="x-govuk-ui-toast-scope">
      {children}
      {container && (
        <Primitive.Portal container={container}>
          <Primitive.Viewport
            className="x-govuk-ui-toast-viewport"
            data-side={side}
            data-align={align}
          >
            {toasts.map((toast) => {
              const time = timeLeft(toast);
              return (
                <Primitive.Root
                  key={toast.id}
                  ref={toast.id === front?.id ? measureFront : undefined}
                  toast={toast}
                  className="x-govuk-ui-toast"
                  // A toast can name its own cue with data.sound. Otherwise its type chooses one.
                  data-sound-enter={
                    typeof toast.data?.sound === "string" ? toast.data.sound : undefined
                  }
                  data-dismiss={dismiss}
                  swipeDirection={swipeDirections}
                  onPointerDown={dismiss === "drag" ? flickStart : undefined}
                  onPointerUp={
                    dismiss === "drag" ? (event) => flickEnd(toast.id, event) : undefined
                  }
                  onPointerCancel={() => {
                    press.current = null;
                  }}
                  onClick={dismiss === "tap" ? (event) => tapToDismiss(toast.id, event) : undefined}
                  onKeyDown={
                    dismiss === "tap"
                      ? (event) => {
                          if (event.key === "Enter" && event.target === event.currentTarget)
                            tapToDismiss(toast.id, event);
                        }
                      : undefined
                  }
                >
                  <Primitive.Content className="x-govuk-ui-toast-content">
                    <Glyph type={toast.type} />
                    <ToastTitle title={toast.title} type={toast.type} />
                    {toast.description && (
                      <Primitive.Description className="x-govuk-ui-toast-description" />
                    )}
                    {toast.actionProps && <Primitive.Action className="x-govuk-ui-toast-action" />}
                    {/* A toast that never closes by itself needs a control, not just a gesture. */}
                    {(closeButton || toast.timeout === 0) && toast.type !== "loading" && (
                      <Primitive.Close
                        className="x-govuk-ui-toast-close"
                        aria-label="Dismiss notification"
                      >
                        <CrossIcon />
                      </Primitive.Close>
                    )}
                  </Primitive.Content>
                  {time > 0 && (
                    // It starts again when the toast's type or time changes, as Base UI's timer
                    // does, such as when a promise settles.
                    <Countdown key={`${toast.type}-${time}`} time={time} />
                  )}
                </Primitive.Root>
              );
            })}
          </Primitive.Viewport>
        </Primitive.Portal>
      )}
    </div>
  );
}
