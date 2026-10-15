import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.DOCS_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.(rec|setup)\.ts$/,
  outputDir: "./.out/test-results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    locale: "en-GB",
    timezoneId: "Europe/Berlin",
    colorScheme: "light",
    actionTimeout: 15_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts$/ },
    {
      name: "desktop",
      testMatch: /specs\/desktop\/.*\.rec\.ts$/,
      dependencies: ["setup"],
      use: {
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "mobile",
      testMatch: /specs\/mobile\/.*\.rec\.ts$/,
      dependencies: ["setup"],
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
      },
    },
  ],
});
