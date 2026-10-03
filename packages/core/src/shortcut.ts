/** The modifier for shortcuts on this device, which is ⌘ on Apple devices and Ctrl elsewhere. */
export function modifierKey() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)
    ? "⌘"
    : "Ctrl";
}

/** A Command-or-Control shortcut as people type it on this device, such as "⌘ K". */
export function shortcutKeys(key: string) {
  return `${modifierKey()} ${key.toUpperCase()}`;
}
