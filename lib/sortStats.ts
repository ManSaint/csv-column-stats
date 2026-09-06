import type { ColumnStats } from "./types";

/** Every stat field the table can be sorted by. */
export type SortKey = keyof ColumnStats;

export type SortDirection = "ascending" | "descending";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

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

/**
 * Compares two non-null field values, dispatching on their runtime type
 * rather than on the key. A key list would drift from `ColumnStats` as
 * fields are added; the value's own type cannot.
 */
function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return 0;
}

/**
 * Returns a new array. `sort` of null preserves the original CSV column order.
 * Nulls sink to the bottom regardless of direction; ties (both values equal,
 * including both null) break by column name so the result is deterministic.
 */
export function sortStats(
  stats: ColumnStats[],
  sort: SortState | null,
): ColumnStats[] {
  if (sort === null) return [...stats];

  return [...stats].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];

    if (av === null || bv === null) {
      if (av !== bv) return av === null ? 1 : -1;
    } else {
      const primary = compareValues(av, bv);
      if (primary !== 0) {
        return sort.direction === "ascending" ? primary : -primary;
      }
    }

    return a.name.localeCompare(b.name);
  });
}
