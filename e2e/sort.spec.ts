import { type Page, expect, test } from "@playwright/test";

// alpha, zeta, mid are numeric (means 2, 8, 5); bee and yak are text, each
// with a clear most-frequent value (bee="zzz", yak="aaa") so a sort by
// "Most frequent" has two real strings to compare, not just null ties.
const CSV =
  "alpha,zeta,mid,bee,yak\n1,9,5,zzz,aaa\n3,7,5,zzz,aaa\n2,8,5,abc,xyz";

/** Body row headers, top to bottom - i.e. the current column order. */
function columnOrder(page: Page) {
  return page.locator("tbody th").allTextContents();
}

test("clicking a header cycles ascending, descending, then back to CSV order", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill(CSV);

  expect(await columnOrder(page)).toEqual([
    "alpha",
    "zeta",
    "mid",
    "bee",
    "yak",
  ]);

  const meanHeader = page.getByRole("columnheader", { name: "Mean" });
  const meanButton = meanHeader.getByRole("button", { name: "Mean" });

  // Means are alpha=2, zeta=8, mid=5. bee and yak are text, so their mean is
  // null; nulls sink to the bottom regardless of direction, tie-broken by
  // name (bee < yak alphabetically).
  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "ascending");
  expect(await columnOrder(page)).toEqual([
    "alpha",
    "mid",
    "zeta",
    "bee",
    "yak",
  ]);

  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "descending");
  expect(await columnOrder(page)).toEqual([
    "zeta",
    "mid",
    "alpha",
    "bee",
    "yak",
  ]);

  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "none");
  expect(await columnOrder(page)).toEqual([
    "alpha",
    "zeta",
    "mid",
    "bee",
    "yak",
  ]);
});

test("only one column reports itself as sorted at a time", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill(CSV);

  await page.getByRole("button", { name: "Mean" }).click();
  await page.getByRole("button", { name: "Most frequent" }).click();

  await expect(page.getByRole("columnheader", { name: "Mean" })).toHaveAttribute(
    "aria-sort",
    "none",
  );
  await expect(
    page.getByRole("columnheader", { name: "Most frequent" }),
  ).toHaveAttribute("aria-sort", "ascending");
  // bee's most frequent value is "zzz", yak's is "aaa", so ascending puts
  // yak before bee - the opposite of their alphabetical column-name order
  // (bee < yak), which a name-based tie-break could never produce. alpha,
  // mid and zeta are numeric, so their most-frequent is null; they sink to
  // the bottom, tie-broken by name.
  expect(await columnOrder(page)).toEqual([
    "yak",
    "bee",
    "alpha",
    "mid",
    "zeta",
  ]);
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
  expect(await columnOrder(page)).toEqual([
    "alpha",
    "bee",
    "mid",
    "yak",
    "zeta",
  ]);
});
