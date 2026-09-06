import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

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

/**
 * Scan the current page state with axe and assert zero violations. Prints
 * every violation with its selector before asserting, so a CI failure is
 * actionable without re-running locally.
 */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG_AA)
    .analyze();

  for (const v of violations) {
    console.error(
      `\n[${v.impact ?? "unknown"}] ${v.id} - ${v.help}\n  ${v.helpUrl}\n` +
        v.nodes
          .map((n) => `  at ${n.target.join(" ")}\n    ${n.html}`)
          .join("\n"),
    );
  }

  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
}

for (const route of ROUTES) {
  test(`${route} has no WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(route);
    await expectNoViolations(page);
  });
}

test("the sorted stats table has no WCAG 2.2 AA violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill("alpha,zeta\n1,9\n3,7");
  await page.getByRole("button", { name: "Mean" }).click();

  await expect(
    page.getByRole("columnheader", { name: "Mean" }),
  ).toHaveAttribute("aria-sort", "ascending");

  await expectNoViolations(page);
});

test("a sort button shows a visible focus ring", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill("alpha,zeta\n1,9\n3,7");

  const sortButton = page.getByRole("button", { name: "Mean" });
  await sortButton.focus();
  await expect(sortButton).toBeFocused();

  // toBeFocused() only proves focus moved. Confirm the ring is actually
  // painted on this specific element: it matches :focus-visible, and its
  // computed outline is our authored ring, not just "not none". Chromium's
  // un-styled default focus ring reports outline-style "auto" (which is
  // itself not "none"), so a bare not-"none" check would pass even with no
  // author styling at all - it must be exactly "solid", which is what the
  // focus-visible:outline-2 utility produces.
  const ring = await sortButton.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      matchesFocusVisible: el.matches(":focus-visible"),
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
    };
  });

  expect(ring.matchesFocusVisible).toBe(true);
  expect(ring.outlineStyle).toBe("solid");
  expect(Number.parseFloat(ring.outlineWidth)).toBeGreaterThan(0);
});

test("first interactive element is keyboard reachable with a visible focus ring", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});
