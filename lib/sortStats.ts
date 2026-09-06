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
