"use client";

import { type ComponentPropsWithRef, type RefObject, useLayoutEffect, useRef } from "react";
import { Button } from "./button";
import { useStoredState } from "./stored-state";
import { Tooltip } from "./tooltip";

/** The page's theme, which is light, as GOV.UK is, or dark. */
export type Theme = "light" | "dark";

/**
 * Sets the theme on its element, at once. Transitions are suspended for the frame it changes in.
 * Buttons and switches, which ease their colours under the pointer, then change with the rest of
 * the page, not after it. The attribute that suspends them is removed a frame later, once the new
 * colours are drawn.
 */
function applyTheme(target: HTMLElement, theme: Theme, change: boolean) {
  if (!change) {
    target.dataset.theme = theme;
    return;
  }
  const root = document.documentElement;
  root.dataset.themeChange = "";
  target.dataset.theme = theme;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      delete root.dataset.themeChange;
    }),
  );
}

export type UseThemeOptions = {
  /** Keeps the theme in local storage under this key, for every page of the site. */
  storageKey?: string;
  /** The theme before users choose one. By default, light, as GOV.UK is. */
  defaultTheme?: Theme;
  /**
   * Where `data-theme` goes, which the components' colours follow. By default, it is the page's
   * root. Give a ref for one part of the page, or null to only keep the theme.
   */
  element?: RefObject<HTMLElement | null> | null;
};

/**
 * The page's theme, light or dark, and a way to change it, kept in local storage if you give it a
 * key. A change is instant, everywhere on the page in the same frame.
 */
export function useTheme({ storageKey, defaultTheme = "light", element }: UseThemeOptions = {}) {
  const [stored, setTheme] = useStoredState<Theme>(storageKey, defaultTheme);
  // Anything else kept, such as an older choice of System, falls back to the default.
  const theme: Theme = stored === "light" || stored === "dark" ? stored : defaultTheme;
  const applied = useRef<Theme | null>(null);
  // Set before the page is painted, so it never shows in the other theme.
  useLayoutEffect(() => {
    const target = element === undefined ? document.documentElement : element?.current;
    if (!target) return;
    const previous = applied.current;
    applied.current = theme;
    applyTheme(target, theme, previous !== null && previous !== theme);
  }, [theme, element]);
  return { theme, setTheme };
}

export type ThemePickerLabels = {
  /** Names the button while the theme is light, by what a press does. */
  toDark: string;
  /** Names the button while the theme is dark. */
  toLight: string;
};

const defaultLabels: ThemePickerLabels = {
  toDark: "Switch to dark theme",
  toLight: "Switch to light theme",
};

export type ThemePickerProps = Omit<
  ComponentPropsWithRef<"button">,
  "value" | "defaultValue" | "onChange" | "children"
> & {
  /** The theme, for a picker you keep track of, such as with useTheme. */
  value?: Theme;
  /** Where an uncontrolled picker starts, before users choose. By default, light. */
  defaultValue?: Theme;
  onValueChange?: (theme: Theme) => void;
  /**
   * For an uncontrolled picker, keeps the theme in local storage under this key. An uncontrolled
   * picker sets the page's theme itself, with useTheme.
   */
  storageKey?: string;
  labels?: Partial<ThemePickerLabels>;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.1,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * One button that switches between the light theme and the dark. It shows the current theme, as a
 * sun while it is light and a moon while it is dark. Its name says where a press takes it. When
 * uncontrolled, it sets the page's theme itself, and can keep it in local storage.
 */
export function ThemePicker({
  value,
  defaultValue = "light",
  onValueChange,
  storageKey,
  labels,
  className = "",
  onClick,
  ...props
}: ThemePickerProps) {
  const words = { ...defaultLabels, ...labels };
  const controlled = value !== undefined;
  const own = useTheme({
    storageKey: controlled ? undefined : storageKey,
    defaultTheme: defaultValue,
    element: controlled ? null : undefined,
  });
  const theme = controlled ? value : own.theme;
  const next: Theme = theme === "dark" ? "light" : "dark";
  const choose = (chosen: Theme) => {
    if (!controlled) own.setTheme(chosen);
    onValueChange?.(chosen);
  };

  const name = next === "dark" ? words.toDark : words.toLight;
  return (
    <Tooltip content={name}>
      <Button
        {...props}
        variant="quiet"
        size="small-icon"
        className={`x-govuk-ui-theme-picker ${className}`.trim()}
        aria-label={name}
        data-theme-shown={theme}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) choose(next);
        }}
      >
        {/* Both icons share one spot, so nothing moves around them as they swap. */}
        <span className="x-govuk-ui-theme-picker-icons">
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
            className="x-govuk-ui-theme-picker-moon"
            {...stroke}
          >
            <path d="M13.5 9.75A5.75 5.75 0 0 1 6.25 2.5a5.75 5.75 0 1 0 7.25 7.25Z" />
          </svg>
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
            className="x-govuk-ui-theme-picker-sun"
            {...stroke}
          >
            <circle cx="8" cy="8" r="3" />
            <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
          </svg>
        </span>
      </Button>
    </Tooltip>
  );
}
