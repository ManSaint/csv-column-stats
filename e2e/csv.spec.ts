import { expect, test } from "@playwright/test";

test("computes and displays column stats from pasted CSV", async ({ page }) => {
  await page.goto("/");

  await page
    .getByLabel("Paste CSV text")
    .fill("name,age\nAda,36\nGrace,\nLin,48");

  await expect(page.getByText(/2 columns · 3 rows/)).toBeVisible();

  const ageRow = page.getByRole("row").filter({ hasText: "age" });
  await expect(ageRow.getByText("Numeric")).toBeVisible();
  await expect(ageRow.getByText("36", { exact: true })).toBeVisible();
  await expect(ageRow.getByText("48", { exact: true })).toBeVisible();

  const nameRow = page.getByRole("row").filter({ hasText: "name" });
  await expect(nameRow.getByText("Text")).toBeVisible();
});

test("shows the empty state before any input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/No data yet/)).toBeVisible();
});

test("shows a warning but still renders stats when a row is ragged", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill("a,b\n1,2\n3,4,5");

  // The error banner appears as a non-blocking warning. (Scoped by text
  // because Next.js also renders its own `role="alert"` route announcer.)
  await expect(
    page.getByRole("alert").filter({ hasText: "Some rows had problems" }),
  ).toBeVisible();
  // ...and the stats table is still rendered for the columns we could read.
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText(/2 columns · 2 rows/)).toBeVisible();
});
