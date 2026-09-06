import { test } from "@playwright/test";

const SAMPLE_CSV = `name,age,city,score
Ada,36,London,88.5
Grace,,New York,92
Lin,48,,79
Alan,41,Cambridge,73
Katherine,35,Baltimore,`;

/**
 * Captures the README screenshot. Excluded from the default run - use `bun run screenshot`.
 * Fills in sample data and sorts by the Mean column so the capture shows the
 * header-sort feature (ascending arrow, reordered rows, text columns' null
 * mean sinking to the bottom) rather than the empty state.
 */
test("capture README screenshot", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill(SAMPLE_CSV);
  await page.getByRole("button", { name: "Mean" }).click();
  await page.waitForLoadState("networkidle");
  // Full-page: the viewport alone crops the table before its last column.
  await page.screenshot({ path: "docs/screenshot.png", fullPage: true });
});
