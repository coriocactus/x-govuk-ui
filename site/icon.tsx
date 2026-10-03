/**
 * The site's icons, for the workbench and the workspace alike, drawn with one stroke on a 24-pixel
 * grid.
 */
const paths = {
  external: "M14 3h7v7m0-7L10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5",
  copy: "M8 8h13v13H8zM16 8V3H3v13h5",
  check: "m5 12 4 4L19 6",
  reset: "M3 10a9 9 0 1 1 2 8M3 3v7h7",
  moon: "M20 15A9 9 0 0 1 9 4 9 9 0 1 0 20 15Z",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  sound: "M3 9h4l5-5v16l-5-5H3zm13-2a7 7 0 0 1 0 10m3-13a11 11 0 0 1 0 16",
  muted: "M3 9h4l5-5v16l-5-5H3zm13 0 5 6m-5 0 5-6",
  previous: "m15 6-6 6 6 6",
  next: "m9 6 6 6-6 6",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  close: "m6 6 12 12M6 18 18 6",
  // The workbench's phone preview, as an upright phone with its home bar.
  phone:
    "M8.5 2.5h7a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM10.5 18.5h3",
  hide: "M3 4h18v16H3zM3 14h18m-12 3 3 2 3-2",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18",
  pin: "M9 3h6l-1 6 3.5 3.5h-11L10 9zM12 12.5V21",
  arrange: "M4 6h9M4 12h9M4 18h9M18 4v16m-3-3 3 3 3-3M15 7l3-3 3 3",
  overview: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  hidden:
    "M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 8.5 4 9.5 6a12 12 0 0 1-2.4 3.2M6.5 7.6A12 12 0 0 0 2.5 12c1 2 4.5 6 9.5 6a9 9 0 0 0 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2",
  // The workspace's parts and the caseworker's menu.
  applications: "M6 3h9l5 5v13H6zM15 3v5h5M9 13h7M9 17h7",
  payments: "M3 6h18v12H3zM3 10h18M7 15h4",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  sales: "M3 20h18M6 16v-5m4 5V6m4 10v-4m4 4V9",
  performance: "M3 16a9 9 0 0 1 18 0m-9 0 4-5",
  content: "M5 4h14v16H5zM8 9h8m-8 4h8m-8 4h4",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  notifications: "M6 17v-6a6 6 0 0 1 12 0v6l2 2H4zm4 4a2 2 0 0 0 4 0",
  keyboard: "M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01",
  "sign-out": "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  sidebar: "M3 4h18v16H3zM9 4v16",
  // Piscine Assist's icon, a fish facing left, with its tail to the right.
  fish: "M15.5 12C13.3 8 10.6 5.5 7.5 5.5 4.4 5.5 2.5 8.5 2 12c.5 3.5 2.4 6.5 5.5 6.5 3.1 0 5.8-2.5 8-6.5zm0 0L22 6.5v11zM6.5 10.5h.01",
  // A row's state, as a Grouped table's band marks it, which is decided, waiting or still to do.
  decided: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 12.3l2.4 2.4 4.6-4.9",
  circle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  flask:
    "M9 3h6M10 3v6.5L4.6 18.2A1.8 1.8 0 0 0 6.1 21h11.8a1.8 1.8 0 0 0 1.5-2.8L14 9.5V3M7 15h10",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
