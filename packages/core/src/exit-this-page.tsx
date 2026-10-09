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

export type ExitThisPageProps = Omit<ComponentPropsWithRef<"div">, "onExit"> & {
  /** Where the page goes, which is a site that looks ordinary, such as a weather forecast. */
  href?: string;
  /**
   * Runs in place of leaving, for a single-page application that clears its state first, or a
   * demonstration. The page is not covered.
   */
  onExit?: () => void;
  children?: ReactNode;
  /** What screen readers hear as each Shift press counts, and when they stop counting. */
  activatedText?: string;
  timedOutText?: string;
  pressTwoMoreTimesText?: string;
  pressOneMoreTimeText?: string;
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
  activatedText = "Loading.",
  timedOutText = "Exit this page expired.",
  pressTwoMoreTimesText = "Shift, press 2 more times to exit.",
  pressOneMoreTimeText = "Shift, press 1 more time to exit.",
  className = "",
  ...props
}: ExitThisPageProps) {
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
          setStatus(count.current === 1 ? pressTwoMoreTimesText : pressOneMoreTimeText);
          pressTimer.current = setTimeout(() => {
            count.current = 0;
            setPresses(0);
            setStatus(timedOutText);
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
  }, [exit, pressOneMoreTimeText, pressTwoMoreTimesText, timedOutText]);

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
        <span className="x-govuk-ui-button-label">
          {children ?? (
            <>
              <span className="x-govuk-ui-visually-hidden">Emergency</span> Exit this page
            </>
          )}
        </span>
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
            {activatedText}
          </div>,
          document.body,
        )}
    </div>
  );
}
