import { defineConfig, devices } from "@playwright/test";

const isCI = process.env.CI === "true";

export default defineConfig({
  testDir: "./test/e2e",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: isCI ? 2 : 0,
  forbidOnly: isCI,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./coverage/playwright", open: "never" }],
  ],
  use: {
    baseURL: process.env.PHOTO_E2E_BASE_URL ?? "http://localhost:4000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  outputDir: "./.playwright-output",
  webServer: {
    command: "pnpm dev --port 4000",
    url: "http://localhost:4000",
    reuseExistingServer: !isCI,
  },
});
