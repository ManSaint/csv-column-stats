import { type Page, expect, test } from "@playwright/test";

const CSV = "alpha,zeta,mid\n1,9,5\n3,7,5\n2,8,5";

/** Body row headers, top to bottom - i.e. the current column order. */
function columnOrder(page: Page) {
  return page.locator("tbody th").allTextContents();
}

test("clicking a header cycles ascending, descending, then back to CSV order", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill(CSV);

  expect(await columnOrder(page)).toEqual(["alpha", "zeta", "mid"]);

  const meanHeader = page.getByRole("columnheader", { name: "Mean" });
  const meanButton = meanHeader.getByRole("button", { name: "Mean" });

  // Means are alpha=2, zeta=8, mid=5.
  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "ascending");
  expect(await columnOrder(page)).toEqual(["alpha", "mid", "zeta"]);

  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "descending");
  expect(await columnOrder(page)).toEqual(["zeta", "mid", "alpha"]);

  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "none");
  expect(await columnOrder(page)).toEqual(["alpha", "zeta", "mid"]);
});

test("only one column reports itself as sorted at a time", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill(CSV);

  await page.getByRole("button", { name: "Mean" }).click();
  await page.getByRole("button", { name: "Column" }).click();

  await expect(page.getByRole("columnheader", { name: "Mean" })).toHaveAttribute(
    "aria-sort",
    "none",
  );
  await expect(
    page.getByRole("columnheader", { name: "Column" }),
  ).toHaveAttribute("aria-sort", "ascending");
  expect(await columnOrder(page)).toEqual(["alpha", "mid", "zeta"]);
});

test("a header is sortable from the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill(CSV);

  const columnHeaderButton = page.getByRole("button", { name: "Column" });
  await columnHeaderButton.focus();
  await expect(columnHeaderButton).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("columnheader", { name: "Column" }),
  ).toHaveAttribute("aria-sort", "ascending");
  expect(await columnOrder(page)).toEqual(["alpha", "mid", "zeta"]);
});
