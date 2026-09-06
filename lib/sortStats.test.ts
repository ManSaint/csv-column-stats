import { describe, expect, it } from "vitest";
import { nextSortState, type SortState, sortStats } from "./sortStats";
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
