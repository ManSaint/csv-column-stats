# Sortable Stats Table Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let the user sort the stats table by clicking any column header, cycling ascending → descending → back to CSV column order.

**Architecture:** All comparison logic lives in a new pure module `lib/sortStats.ts` with no React imports, unit-tested with Vitest. `components/StatsTable.tsx` holds a single piece of `useState` for the sort state, renders each header label inside a real `<button>`, and sets `aria-sort` on the owning `<th>`. No new route, no new dependency, no data-model change.

**Tech Stack:** Bun, Next.js App Router, TypeScript strict, Tailwind CSS v4, Biome, Vitest, Playwright + axe-core.

**Accessibility contract (decided, not negotiable during build):**
- `aria-sort` on the `<th>`: `"ascending"` / `"descending"` on the active column, `"none"` on every other column.
- The clickable element is `<button type="button">` — never a `<div>` with a click handler.
- Direction is signalled by an arrow glyph **and** `aria-sort`, never by colour alone. The glyph is `aria-hidden="true"` so the button's accessible name stays the plain label.
- A glyph is always rendered (a neutral `↕` when inactive) so the header does not reflow on click.
- Visible `focus-visible` ring at ≥3:1 against the header background in both themes.
- Header cells keep `px-4 py-3`, so the full-width button clears 24×24 CSS px.

---

## Task 1: Pure sort module

**Files:**
- Create: `lib/sortStats.ts`
- Create: `lib/sortStats.test.ts`

**Step 1: Write the failing tests**

Write `lib/sortStats.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { type SortState, nextSortState, sortStats } from "./sortStats";
import type { ColumnStats } from "./types";

function col(over: Partial<ColumnStats> & { name: string }): ColumnStats {
  return {
    type: "numeric",
    count: 0,
    missing: 0,
    min: null,
    max: null,
    mean: null,
    median: null,
    uniqueCount: null,
    mostFrequent: null,
    ...over,
  };
}

describe("nextSortState", () => {
  it("starts ascending on a fresh column", () => {
    expect(nextSortState(null, "mean")).toEqual({
      key: "mean",
      direction: "ascending",
    });
  });

  it("goes ascending -> descending on the same column", () => {
    const current: SortState = { key: "mean", direction: "ascending" };
    expect(nextSortState(current, "mean")).toEqual({
      key: "mean",
      direction: "descending",
    });
  });

  it("goes descending -> unsorted on the same column", () => {
    const current: SortState = { key: "mean", direction: "descending" };
    expect(nextSortState(current, "mean")).toBeNull();
  });

  it("restarts ascending when a different column is clicked", () => {
    const current: SortState = { key: "mean", direction: "descending" };
    expect(nextSortState(current, "max")).toEqual({
      key: "max",
      direction: "ascending",
    });
  });
});

describe("sortStats", () => {
  const stats = [
    col({ name: "b", mean: 2 }),
    col({ name: "a", mean: 10 }),
    col({ name: "c", mean: 1 }),
  ];

  it("returns the original order when unsorted", () => {
    expect(sortStats(stats, null).map((c) => c.name)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate the input array", () => {
    const input = [...stats];
    sortStats(input, { key: "mean", direction: "ascending" });
    expect(input.map((c) => c.name)).toEqual(["b", "a", "c"]);
  });

  it("sorts numbers numerically, not lexicographically", () => {
    const numeric = [col({ name: "x", mean: 9 }), col({ name: "y", mean: 10 })];
    expect(
      sortStats(numeric, { key: "mean", direction: "ascending" }).map(
        (c) => c.mean,
      ),
    ).toEqual([9, 10]);
  });

  it("sorts descending", () => {
    expect(
      sortStats(stats, { key: "mean", direction: "descending" }).map(
        (c) => c.name,
      ),
    ).toEqual(["a", "b", "c"]);
  });

  it("puts nulls last when ascending", () => {
    const withNull = [
      col({ name: "n", mean: null }),
      col({ name: "m", mean: 5 }),
    ];
    expect(
      sortStats(withNull, { key: "mean", direction: "ascending" }).map(
        (c) => c.name,
      ),
    ).toEqual(["m", "n"]);
  });

  it("puts nulls last when descending too", () => {
    const withNull = [
      col({ name: "n", mean: null }),
      col({ name: "m", mean: 5 }),
    ];
    expect(
      sortStats(withNull, { key: "mean", direction: "descending" }).map(
        (c) => c.name,
      ),
    ).toEqual(["m", "n"]);
  });

  it("sorts text columns with localeCompare", () => {
    const text = [
      col({ name: "z", mostFrequent: "banana" }),
      col({ name: "y", mostFrequent: "Apple" }),
    ];
    expect(
      sortStats(text, { key: "mostFrequent", direction: "ascending" }).map(
        (c) => c.mostFrequent,
      ),
    ).toEqual(["Apple", "banana"]);
  });

  it("breaks ties by column name ascending", () => {
    const tied = [
      col({ name: "delta", mean: 1 }),
      col({ name: "alpha", mean: 1 }),
    ];
    expect(
      sortStats(tied, { key: "mean", direction: "descending" }).map(
        (c) => c.name,
      ),
    ).toEqual(["alpha", "delta"]);
  });

  it("sorts by the column name itself", () => {
    expect(
      sortStats(stats, { key: "name", direction: "ascending" }).map(
        (c) => c.name,
      ),
    ).toEqual(["a", "b", "c"]);
  });
});
```

**Step 2: Run the tests to verify they fail**

Run: `bun run test`
Expected: FAIL — `lib/sortStats.ts` does not exist.

**Step 3: Write the implementation**

Write `lib/sortStats.ts`:

```ts
import type { ColumnStats } from "./types";

/** Every stat field the table can be sorted by. */
export type SortKey = keyof ColumnStats;

export type SortDirection = "ascending" | "descending";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

/** Fields compared as text; every other key is compared numerically. */
const TEXT_KEYS: ReadonlySet<SortKey> = new Set<SortKey>([
  "name",
  "type",
  "mostFrequent",
]);

/**
 * Three-state cycle: unsorted -> ascending -> descending -> unsorted.
 * Clicking a different column always restarts at ascending.
 */
export function nextSortState(
  current: SortState | null,
  key: SortKey,
): SortState | null {
  if (current === null || current.key !== key) {
    return { key, direction: "ascending" };
  }
  if (current.direction === "ascending") {
    return { key, direction: "descending" };
  }
  return null;
}

function compareValues(
  a: ColumnStats[SortKey],
  b: ColumnStats[SortKey],
  key: SortKey,
): number {
  // Nulls sink to the bottom in both directions, so the caller must not
  // negate this part of the comparison.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (TEXT_KEYS.has(key)) return String(a).localeCompare(String(b));
  return Number(a) - Number(b);
}

/**
 * Returns a new array. `sort` of null preserves the original CSV column order.
 * Ties break by column name so the result is deterministic.
 */
export function sortStats(
  stats: ColumnStats[],
  sort: SortState | null,
): ColumnStats[] {
  if (sort === null) return [...stats];

  return [...stats].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];

    // Null handling must survive the direction flip, so branch on it first.
    if (av === null || bv === null) {
      const nulls = compareValues(av, bv, sort.key);
      if (nulls !== 0) return nulls;
    } else {
      const primary = compareValues(av, bv, sort.key);
      if (primary !== 0) {
        return sort.direction === "ascending" ? primary : -primary;
      }
    }

    return a.name.localeCompare(b.name);
  });
}
```

**Step 4: Run the tests to verify they pass**

Run: `bun run test`
Expected: PASS, all files.

Then run `bun run lint` and `bun run typecheck`. Both must exit 0. Fix any failure — never disable a rule.

**Step 5: Commit**

```bash
git add lib/sortStats.ts lib/sortStats.test.ts
git commit -m "feat: add pure three-state sort module for column stats"
```

---

## Task 2: Sortable headers in StatsTable

**Files:**
- Modify: `components/StatsTable.tsx` (replace the `HEADERS` array and the `<thead>` block; the `<tbody>` cells are unchanged apart from iterating the sorted array)

**Step 1: Rewrite the component**

Replace the whole of `components/StatsTable.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import {
  type SortKey,
  type SortState,
  nextSortState,
  sortStats,
} from "@/lib/sortStats";
import type { ColumnStats } from "@/lib/types";
import { TypeBadge } from "./TypeBadge";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Column" },
  { key: "type", label: "Type" },
  { key: "min", label: "Min" },
  { key: "max", label: "Max" },
  { key: "mean", label: "Mean" },
  { key: "median", label: "Median" },
  { key: "uniqueCount", label: "Unique" },
  { key: "mostFrequent", label: "Most frequent" },
  { key: "missing", label: "Missing" },
  { key: "count", label: "Non-missing" },
];

function num(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
}

function text(value: string | number | null): string {
  return value === null ? "—" : String(value);
}

export function StatsTable({ stats }: { stats: ColumnStats[] }) {
  const [sort, setSort] = useState<SortState | null>(null);
  const rows = useMemo(() => sortStats(stats, sort), [stats, sort]);

  return (
    <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
      <table className="w-full border-collapse text-sm min-w-[760px]">
        <caption className="sr-only">
          Per-column statistics for the parsed CSV. Each column header is a
          button that sorts the table.
        </caption>
        <thead>
          <tr>
            {COLUMNS.map(({ key, label }) => {
              const active = sort?.key === key;
              return (
                <th
                  key={key}
                  scope="col"
                  aria-sort={active ? sort.direction : "none"}
                  className="text-left text-[13px] font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 whitespace-nowrap p-0"
                >
                  <button
                    type="button"
                    onClick={() => setSort((prev) => nextSortState(prev, key))}
                    className="w-full flex items-center gap-1.5 px-4 py-3 text-left font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
                  >
                    {label}
                    <span
                      aria-hidden="true"
                      className={
                        active
                          ? "w-3 text-center text-slate-900 dark:text-slate-100"
                          : "w-3 text-center text-slate-400 dark:text-slate-500"
                      }
                    >
                      {active
                        ? sort.direction === "ascending"
                          ? "▲"
                          : "▼"
                        : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              key={c.name}
              className="border-b border-slate-200 dark:border-slate-800 last:border-0"
            >
              <th
                scope="row"
                className="text-left font-semibold px-4 py-3 whitespace-nowrap"
              >
                {c.name}
              </th>
              <td className="px-4 py-3">
                <TypeBadge type={c.type} />
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {num(c.min)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {num(c.max)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {num(c.mean)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {num(c.median)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {text(c.uniqueCount)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {text(c.mostFrequent)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {c.missing}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {c.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Notes for the implementer:
- `p-0` moves to the `<th>` and the padding moves onto the `<button>`, so the whole
  header cell is the click target rather than just the text.
- Do not change `<th scope="row">` in the body — the column name stays a row header.
- Do not add colour-only state. The glyph is the visible signal, `aria-sort` the
  programmatic one.

**Step 2: Verify the checks**

Run each and read the output:

```bash
bun run lint
bun run typecheck
bun run test
```

All three must exit 0.

**Step 3: Commit**

```bash
git add components/StatsTable.tsx
git commit -m "feat: sort the stats table by clicking a column header"
```

---

## Task 3: Playwright E2E for the sort interaction

**Files:**
- Create: `e2e/sort.spec.ts`

**Step 1: Write the spec**

Write `e2e/sort.spec.ts`:

```ts
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
```

**Step 2: Run it**

Run: `bun run test:e2e`
Expected: PASS. If a locator is ambiguous (for example `getByRole("button", { name: "Column" })` also matching something in `CsvInput`), scope it with `page.getByRole("table")` rather than loosening the assertion.

**Step 3: Commit**

```bash
git add e2e/sort.spec.ts
git commit -m "test: cover the three-state header sort end to end"
```

---

## Task 4: Accessibility coverage for the sorted state

**Files:**
- Modify: `e2e/a11y.spec.ts` (append a new test; leave `ROUTES` alone)

`ROUTES` is unchanged **because this feature adds no route** — sorting happens on `/`,
which is already listed. What is not yet covered is the table *after* a sort, so add
that scan explicitly.

**Step 1: Append the tests**

Add to the end of `e2e/a11y.spec.ts`:

```ts
test("the sorted stats table has no WCAG 2.2 AA violations", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill("alpha,zeta\n1,9\n3,7");
  await page.getByRole("button", { name: "Mean" }).click();

  await expect(page.getByRole("columnheader", { name: "Mean" })).toHaveAttribute(
    "aria-sort",
    "ascending",
  );

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
});

test("a sort button shows a visible focus ring", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Paste CSV text").fill("alpha,zeta\n1,9\n3,7");

  const sortButton = page.getByRole("button", { name: "Mean" });
  await sortButton.focus();
  await expect(sortButton).toBeFocused();
  await expect(page.locator(":focus-visible")).toBeVisible();
});
```

**Step 2: Run it**

Run: `bun run test:a11y`
Expected: PASS with zero violations. A violation here is a defect in the component, not
in the test — fix `components/StatsTable.tsx`.

**Step 3: Commit**

```bash
git add e2e/a11y.spec.ts
git commit -m "test: scan the sorted stats table against WCAG 2.2 AA"
```

---

## Task 5: README and screenshot

**Files:**
- Modify: `README.md`

**Step 1: Confirm the stub marker is gone**

Run: `grep -c "README-STUB" README.md`
Expected: `0`. If it is non-zero, write the README properly before continuing.

**Step 2: Document the feature**

Edit `README.md` so the feature list and the usage section mention that any column header
can be clicked (or focused and activated with Enter or Space) to sort the table, that a
second activation reverses the order, and that a third restores the original CSV column
order. Keep the existing tone and structure; do not add a new top-level document.

**Step 3: Regenerate the screenshot**

Run: `bun run screenshot`
Expected: exits 0 and rewrites the screenshot the README embeds.

**Step 4: Run the full definition of done**

```bash
bun run lint
bun run typecheck
bun run test
bun run test:e2e
bun run test:a11y
```

Every one must exit 0. Paste the output; do not summarise it as "passing".

**Step 5: Commit**

```bash
git add README.md
git add -A
git commit -m "docs: document header sorting and refresh the screenshot"
```
