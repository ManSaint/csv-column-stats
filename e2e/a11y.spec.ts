import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * WCAG 2.2 A + AA gate.
 *
 * axe catches roughly half of real accessibility defects. It cannot judge focus order,
 * keyboard traps, or whether alt text is meaningful. Green here is a floor, not a pass.
 *
 * Add every new route to ROUTES - an unlisted route is not covered.
 */
const ROUTES = ["/"];
const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

for (const route of ROUTES) {
  test(`${route} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(route);
    const { violations } = await new AxeBuilder({ page })
      .withTags(WCAG_AA)
      .analyze();

    // Print every violation with its selector before asserting, so a CI failure is
    // actionable without re-running locally.
    for (const v of violations) {
      console.error(
        `\n[${v.impact ?? "unknown"}] ${v.id} - ${v.help}\n  ${v.helpUrl}\n` +
          v.nodes
            .map((n) => `  at ${n.target.join(" ")}\n    ${n.html}`)
            .join("\n"),
      );
    }

    expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
  });
}

test("first interactive element is keyboard reachable with a visible focus ring", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});
