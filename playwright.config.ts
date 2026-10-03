import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";
import { anyFree } from "./scripts/checkout";

const viewport = { width: 1440, height: 1100 };
// The sweep checks every page once, for accessibility and for text that fits. Everything else is
// behaviour, which each engine does its own way, so it runs in all three.
const sweep = /sweep\.spec\.ts$/;
// Each run serves the site on a free port the system gives it, so runs from any number of
// checkouts, or anything else on the machine, never collide. It is chosen once, as the run starts,
// and the workers, which read the config again, inherit it. When Node runs the config instead of
// Bun, the config asks Bun for the port.
process.env.X_GOVUK_UI_TEST_PORT ??=
  typeof Bun === "undefined"
    ? execFileSync("bun", ["scripts/checkout.ts", "port"], { encoding: "utf8" }).trim()
    : String(anyFree());
const port = process.env.X_GOVUK_UI_TEST_PORT;
const url = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  // One run at a time on this machine. A run from another checkout waits for this one to finish.
  globalSetup: "./tests/browser/lock.ts",
  use: {
    baseURL: url,
    viewport,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Chrome and Edge share Chromium. Safari is WebKit.
  projects: [
    // Axe reads the DOM, which the engines agree on, except that Base UI renders some parts
    // differently in Safari. The sweep therefore runs in Chromium and WebKit, and the fit check,
    // which is the layout's arithmetic, runs only in Chromium.
    { name: "sweep-chromium", testMatch: sweep, use: { ...devices["Desktop Chrome"], viewport } },
    { name: "sweep-webkit", testMatch: sweep, use: { ...devices["Desktop Safari"], viewport } },
    { name: "chromium", testIgnore: sweep, use: { ...devices["Desktop Chrome"], viewport } },
    { name: "firefox", testIgnore: sweep, use: { ...devices["Desktop Firefox"], viewport } },
    { name: "webkit", testIgnore: sweep, use: { ...devices["Desktop Safari"], viewport } },
  ],
  webServer: {
    command: "bun scripts/preview.ts",
    url,
    env: { PORT: port },
    reuseExistingServer: false,
  },
});
