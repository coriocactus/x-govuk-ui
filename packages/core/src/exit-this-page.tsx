"use client";

import {
  type ComponentPropsWithRef,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useLabels } from "./labels";
import { useLatest } from "./refs";

export type ExitThisPageProps = Omit<ComponentPropsWithRef<"div">, "onExit"> & {
  /** Where the page goes, which is a site that looks ordinary, such as a weather forecast. */
  href?: string;
  /**
   * Runs in place of leaving, for a single-page application that clears its state first, or a
   * demonstration. The page is not covered.
   */
  onExit?: () => void;
  children?: ReactNode;
  /** Its words, in place of a LabelsProvider's or the defaults. */
  labels?: Partial<ExitThisPageLabels>;
};

/** The words Exit this page writes, which a LabelsProvider or its `labels` can change. */
export type ExitThisPageLabels = {
  /** The button's words, which screen readers hear after a hidden "Emergency". */
  button: ReactNode;
  /** What screen readers hear as the page leaves. */
  activated: string;
  /** What screen readers hear when the Shift presses stop counting. */
  timedOut: string;
  /** What screen readers hear after the first and second Shift presses. */
  pressTwoMoreTimes: string;
  pressOneMoreTime: string;
};

export const defaultExitThisPageLabels: ExitThisPageLabels = {
  button: (
    <>
      <span className="x-govuk-ui-visually-hidden">Emergency</span> Exit this page
    </>
  ),
  activated: "Loading.",
  timedOut: "Exit this page expired.",
  pressTwoMoreTimes: "Shift, press 2 more times to exit.",
  pressOneMoreTime: "Shift, press 1 more time to exit.",
};

const SHIFT_WINDOW = 5000;

/**
 * GOV.UK's Exit this page. It is a red button that leaves the service at once for an ordinary site,
 * for users who may be at risk if someone sees what they are reading. Pressing Shift three times
 * does the same, and three dots under the button count the presses. The page is covered as it
 * leaves. It makes no sound, because a sound could give it away.
 */
export function ExitThisPage({
  href = "https://www.bbc.co.uk/weather",
  onExit,
  children,
  labels: ownLabels,
  className = "",
  ...props
}: ExitThisPageProps) {
  const labels = useLabels("exitThisPage", defaultExitThisPageLabels, ownLabels);
  // The words are read as the keys are pressed, so a new object each render restarts nothing.
  const words = useLatest(labels);
  const [presses, setPresses] = useState(0);
  const [status, setStatus] = useState("");
  const [leaving, setLeaving] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const statusTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastWasModified = useRef(false);
  const count = useRef(0);

  const exit = useCallback(() => {
    clearTimeout(pressTimer.current);
    count.current = 0;
    setPresses(0);
    setStatus("");
    if (onExit) return onExit();
    setLeaving(true);
    window.location.href = href;
  }, [href, onExit]);

  // Shift pressed three times within five seconds leaves the page. Other keys in between start the
  // count again, so typing a capital letter does not count.
  useEffect(() => {
    const keyup = (event: KeyboardEvent) => {
      if (event.key === "Shift" && !lastWasModified.current) {
        count.current += 1;
        clearTimeout(pressTimer.current);
        clearTimeout(statusTimer.current);
        if (count.current >= 3) exit();
        else {
          setPresses(count.current);
          setStatus(
            count.current === 1 ? words.current.pressTwoMoreTimes : words.current.pressOneMoreTime,
          );
          pressTimer.current = setTimeout(() => {
            count.current = 0;
            setPresses(0);
            setStatus(words.current.timedOut);
            statusTimer.current = setTimeout(() => setStatus(""), SHIFT_WINDOW);
          }, SHIFT_WINDOW);
        }
      } else if (count.current) {
        count.current = 0;
        setPresses(0);
        clearTimeout(pressTimer.current);
      }
      lastWasModified.current = event.shiftKey;
    };
    document.addEventListener("keyup", keyup, true);
    // Coming back to the page from the browser's history shows it as it was.
    const shown = () => setLeaving(false);
    window.addEventListener("pageshow", shown);
    return () => {
      document.removeEventListener("keyup", keyup, true);
      window.removeEventListener("pageshow", shown);
      clearTimeout(pressTimer.current);
      clearTimeout(statusTimer.current);
    };
  }, [exit]);

  return (
    <div {...props} className={`x-govuk-ui-exit-this-page ${className}`.trim()}>
      <a
        href={href}
        rel="nofollow noreferrer"
        className="x-govuk-ui-button x-govuk-ui-button--warning x-govuk-ui-exit-this-page-button"
        data-sound="off"
        onClick={(event) => {
          event.preventDefault();
          exit();
        }}
      >
        <span className="x-govuk-ui-button-label">{children ?? labels.button}</span>
        <span
          className="x-govuk-ui-exit-this-page-indicator"
          aria-hidden="true"
          data-shown={presses > 0 || undefined}
        >
          {[0, 1, 2].map((index) => (
            <span key={index} data-on={index < presses || undefined} />
          ))}
        </span>
      </a>
      <span className="x-govuk-ui-visually-hidden" role="status">
        {status}
      </span>
      {leaving &&
        createPortal(
          <div className="x-govuk-ui-exit-this-page-overlay" role="alert">
            {labels.activated}
          </div>,
          document.body,
        )}
    </div>
  );
}
