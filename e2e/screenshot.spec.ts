import { test } from "@playwright/test";

/**
 * Captures the README screenshot. Excluded from the default run - use `bun run screenshot`.
 */
test("capture README screenshot", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "docs/screenshot.png", fullPage: false });
});
