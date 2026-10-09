"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef } from "react";
import { isSoundCue, type PlayOptions, type PlaySound, type SoundCue } from "./sound";

export type SoundScopeProps = {
  children: ReactNode;
  /** What plays each cue, such as `useSound`'s function. */
  play: PlaySound;
};
type Cue = [SoundCue, PlayOptions?];

const CONTROL =
  'button, a[href], summary, [role="button"], [role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="tab"], [role="switch"], input[type="checkbox"], input[type="radio"]';
const TOGGLE =
  'input[type="checkbox"], input[type="radio"], [role="switch"], [aria-pressed], [role="menuitemcheckbox"], [role="menuitemradio"]';
const LIST_ITEM =
  '[role="option"], [role="menuitem"], [role="tab"], nav a[href], .x-govuk-ui-sidebar-item';

function isOn(element: Element) {
  if (element instanceof HTMLInputElement) return element.checked;
  return (
    element.getAttribute("aria-checked") === "true" ||
    element.getAttribute("aria-pressed") === "true"
  );
}

/** Raises the pitch for each row down a list, so moving through a menu sounds like steps. */
function rowPitch(element: Element) {
  const row = element.closest("li") ?? element;
  const rows = row.parentElement?.children;
  return rows ? Math.min(Array.prototype.indexOf.call(rows, row), 7) * 55 : 0;
}

/** A toast plays the sound of its outcome. A spinner gives only a quiet tick until it resolves. */
function toastCue(type: string | null): SoundCue {
  if (type === "success" || type === "error" || type === "warning") return type;
  // A promise starts with a swoosh, and plays its result when it resolves.
  return type === "loading" ? "swoosh" : "notification";
}

/**
 * @internal The cue a press on an element plays, chosen by what the element is. It may be a toggle,
 * a warning button, something that opens or closes, a row in a list, or a plain button.
 */
export function cueFor(target: Element): Cue | null {
  if (target.closest(".x-govuk-ui-command-popup")) {
    return target.closest('[role="option"]') ? ["command"] : null;
  }
  const labelled = target.closest("label")?.control ?? target;
  const control = labelled.closest<HTMLElement>(CONTROL);
  if (!control || control.closest('[data-sound="off"]')) return null;
  if (control.matches(':disabled, [aria-disabled="true"], [data-disabled]')) return ["blocked"];
  const named = control.closest<HTMLElement>("[data-sound]")?.dataset.sound;
  if (isSoundCue(named)) return [named];
  if (control.matches(TOGGLE)) return [isOn(control) ? "toggleOff" : "toggleOn"];
  if (control.matches(".x-govuk-ui-button--warning")) return ["destructive"];
  if (control.hasAttribute("popovertarget"))
    return [control.getAttribute("popovertargetaction") === "hide" ? "close" : "open"];
  if (control.matches('.x-govuk-ui-toast-close, [aria-label^="Close"]')) return ["close"];
  if (control.hasAttribute("aria-expanded"))
    return [control.getAttribute("aria-expanded") === "true" ? "close" : "open"];
  if (control.matches(LIST_ITEM)) return ["select", { detune: rowPitch(control) }];
  return ["tap", { velocity: control.matches(".x-govuk-ui-button--quiet") ? 0.78 : 1 }];
}

const ScopeSound = createContext<(cue: SoundCue, options?: PlayOptions) => void>(() => {});

/**
 * Plays a cue through the nearest SoundScope, for changes with no press to respond to, such as a
 * keyboard shortcut or Escape. Outside a SoundScope it does nothing.
 */
export function useScopeSound() {
  return useContext(ScopeSound);
}

/**
 * Plays a cue for each interaction inside it. These are a press on a control, a toggle turning, a
 * surface opening or closing, a value stepping, and outcomes that arrive without a press, such as
 * an error or a success. Put one near the root of the application, with `useSound`'s function.
 */
export function SoundScope({ children, play }: SoundScopeProps) {
  const scope = useRef<HTMLDivElement>(null);
  const playRef = useRef(play);
  const last = useRef({ at: -Infinity, tickAt: -Infinity });
  const values = useRef(new WeakMap<HTMLInputElement, string>());
  playRef.current = play;

  const emit = useCallback(([cue, options]: Cue, gap = 30) => {
    const now = performance.now();
    if (now - last.current.at < gap) return;
    last.current.at = now;
    // Sound is optional. A blocked or missing audio device must not interrupt the interaction.
    void playRef.current(cue, options).catch(() => {});
  }, []);

  useEffect(() => {
    const element = scope.current;
    if (!element) return;
    // Outcomes arrive without a press, so they are detected from the DOM.
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target;
        if (record.type === "attributes" && target instanceof Element) {
          const value = target.getAttribute(record.attributeName ?? "");
          if (
            record.attributeName === "aria-invalid" &&
            value === "true" &&
            record.oldValue !== "true"
          )
            return emit(["error"], 0);
          if (record.attributeName === "data-success" && value !== null && record.oldValue === null)
            return emit(["success"], 0);
          // A promise toast turning from a spinner into its result.
          if (
            record.attributeName === "data-type" &&
            target.matches(".x-govuk-ui-toast") &&
            value !== record.oldValue
          )
            return emit([toastCue(value)], 0);
        }
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          // Content that arrives by itself, such as a reply, can name its cue with
          // data-sound-enter.
          const entering = node.getAttribute("data-sound-enter");
          if (isSoundCue(entering)) return emit([entering], 0);
          if (node.matches(".x-govuk-ui-toast"))
            return emit([toastCue(node.getAttribute("data-type"))], 0);
        }
      }
    });
    observer.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["aria-invalid", "data-success", "data-type"],
    });
    return () => observer.disconnect();
  }, [emit]);

  const playCue = useCallback(
    (cue: SoundCue, options?: PlayOptions) => emit([cue, options], 0),
    [emit],
  );

  return (
    <ScopeSound value={playCue}>
      <div
        ref={scope}
        className="x-govuk-ui-sound-scope"
        onPointerDownCapture={(event) => {
          const cue = event.button === 0 && event.target instanceof Element && cueFor(event.target);
          if (cue) emit(cue);
        }}
        onKeyDownCapture={(event) => {
          const target = event.target;
          if (event.repeat || !(target instanceof HTMLElement)) return;
          if (event.key === "Enter" && target.getAttribute("aria-activedescendant"))
            return emit([target.closest(".x-govuk-ui-command-popup") ? "command" : "select"]);
          const checkable = target.matches('input[type="checkbox"], input[type="radio"]');
          if (event.key === " " || (event.key === "Enter" && !checkable)) {
            const cue = cueFor(target);
            if (cue) emit(cue);
          }
        }}
        onInputCapture={(event) => {
          const target = event.target;
          // Libraries such as input-otp dispatch synthetic input events to sync their state.
          // Only a user's input that changes the value should make a sound.
          if (!(target instanceof HTMLInputElement) || !event.nativeEvent.isTrusted) return;
          const previous = values.current.get(target) ?? target.defaultValue;
          values.current.set(target, target.value);
          if (previous === target.value) return;
          if (target.type === "range") {
            const now = performance.now();
            if (now - last.current.tickAt < 28) return;
            last.current.tickAt = now;
            const span = Number(target.max || 100) - Number(target.min || 0);
            const position = span ? (Number(target.value) - Number(target.min || 0)) / span : 0;
            void playRef.current("sliderTick", { detune: position * 900 }).catch(() => {});
          } else if (target.closest(".x-govuk-ui-otp")) {
            const deleting = target.value.length < previous.length;
            emit(["key", { detune: target.value.length * 45 - (deleting ? 260 : 0) }], 0);
          }
        }}
        onChangeCapture={(event) => {
          if (!(event.target instanceof HTMLSelectElement)) return;
          const named = event.target.closest<HTMLElement>("[data-sound]")?.dataset.sound;
          if (named !== "off") emit([isSoundCue(named) ? named : "select"]);
        }}
      >
        {children}
      </div>
    </ScopeSound>
  );
}
