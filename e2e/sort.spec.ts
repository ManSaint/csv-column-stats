import { expect, type Locator, type Page, test } from "@playwright/test";

// alpha, zeta, mid are numeric (means 2, 8, 5); bee and yak are text, each
// with a clear most-frequent value (bee="zzz", yak="aaa") so a sort by
// "Most frequent" has two real strings to compare, not just null ties.
const CSV =
  "alpha,zeta,mid,bee,yak\n1,9,5,zzz,aaa\n3,7,5,zzz,aaa\n2,8,5,abc,xyz";

/** Body row headers, top to bottom - i.e. the current column order. */
function columnOrder(page: Page) {
  return page.locator("tbody th").allTextContents();
}

/** The always-rendered sort glyph inside a header cell's button. */
function headerGlyph(header: Locator) {
  return header.locator('span[aria-hidden="true"]');
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill(CSV);
});

test("clicking a header cycles ascending, descending, then back to CSV order", async ({
  page,
}) => {
  expect(await columnOrder(page)).toEqual([
    "alpha",
    "zeta",
    "mid",
    "bee",
    "yak",
  ]);

  const meanHeader = page.getByRole("columnheader", { name: "Mean" });
  const meanButton = meanHeader.getByRole("button", { name: "Mean" });
  // A header not involved in this sort: its glyph must stay neutral
  // throughout, proving the glyph is rendered per-column, not just for
  // whichever header happens to be active.
  const columnHeader = page.getByRole("columnheader", { name: "Column" });

  // The glyph is always rendered, even before any column has been sorted.
  await expect(headerGlyph(meanHeader)).toHaveText("↕");

  // Means are alpha=2, zeta=8, mid=5. bee and yak are text, so their mean is
  // null; nulls sink to the bottom regardless of direction, tie-broken by
  // name (bee < yak alphabetically).
  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "ascending");
  await expect(headerGlyph(meanHeader)).toHaveText("▲");
  await expect(headerGlyph(columnHeader)).toHaveText("↕");
  expect(await columnOrder(page)).toEqual([
    "alpha",
    "mid",
    "zeta",
    "bee",
    "yak",
  ]);

  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "descending");
  await expect(headerGlyph(meanHeader)).toHaveText("▼");
  await expect(headerGlyph(columnHeader)).toHaveText("↕");
  expect(await columnOrder(page)).toEqual([
    "zeta",
    "mid",
    "alpha",
    "bee",
    "yak",
  ]);

  await meanButton.click();
  await expect(meanHeader).toHaveAttribute("aria-sort", "none");
  await expect(headerGlyph(meanHeader)).toHaveText("↕");
  expect(await columnOrder(page)).toEqual([
    "alpha",
    "zeta",
    "mid",
    "bee",
    "yak",
  ]);
});

test("only one column reports itself as sorted at a time", async ({ page }) => {
  await page.getByRole("button", { name: "Mean" }).click();
  await page.getByRole("button", { name: "Most frequent" }).click();

  await expect(
    page.getByRole("columnheader", { name: "Mean" }),
  ).toHaveAttribute("aria-sort", "none");
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
