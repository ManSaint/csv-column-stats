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
  // next dev's <nextjs-portal> renders its dev-tools badge as a fixed overlay;
  // hide it so the capture doesn't include tooling that isn't part of the app.
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
  // fullPage captures the whole page height; it cannot expand the table's
  // own overflow-x-auto scroller, so the right-hand columns are clipped at
  // any viewport - that's inherent to the layout, not a screenshot setting.
  await page.screenshot({ path: "docs/screenshot.png", fullPage: true });
});
