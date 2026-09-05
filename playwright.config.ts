import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // One retry locally absorbs genuine flake without hiding a real failure.
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [
    // The default run excludes the screenshot spec so it never churns docs/ in CI.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /screenshot\.spec\.ts/,
    },
    // Opt-in: bun run screenshot
    {
      name: "screenshot",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
      testMatch: /screenshot\.spec\.ts/,
    },
  ],
  // Playwright starts the app itself, so test:e2e works from a cold repo.
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
