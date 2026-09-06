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
  // Ties break by name, so a fixture whose `name` order happens to agree
  // with the order a test asserts will pass even if the comparator under
  // test is broken - the tie-break silently does the sorting instead. Any
  // fixture testing a non-name key must give its rows `name`s whose
  // alphabetical order CONTRADICTS the asserted order, so a regression in
  // the real comparison can't hide behind the tie-break.
  const stats = [
    col({ name: "b", mean: 2 }),
    col({ name: "a", mean: 10 }),
    col({ name: "c", mean: 1 }),
  ];

  it("returns the original order when unsorted", () => {
    const result = sortStats(stats, null);
    expect(result.map((c) => c.name)).toEqual(["b", "a", "c"]);
    expect(result).not.toBe(stats);
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

  it("breaks ties by column name when both values are null", () => {
    const bothNull = [
      col({ name: "delta", mean: null }),
      col({ name: "alpha", mean: null }),
    ];
    expect(
      sortStats(bothNull, { key: "mean", direction: "ascending" }).map(
        (c) => c.name,
      ),
    ).toEqual(["alpha", "delta"]);
  });

  it("sorts text columns with localeCompare", () => {
    // "apple" vs "Banana": code-unit "<" orders "Banana" first (uppercase
    // sorts before lowercase in ASCII), but localeCompare orders "apple"
    // first. This distinguishes localeCompare from a naive comparison.
    // Names are assigned in reverse ("Banana" -> "a", "apple" -> "b") so the
    // name tie-break, if it fired, would give the opposite of the asserted
    // order - it can't mask a broken comparator here.
    const text = [
      col({ name: "a", mostFrequent: "Banana" }),
      col({ name: "b", mostFrequent: "apple" }),
    ];
    expect(
      sortStats(text, { key: "mostFrequent", direction: "ascending" }).map(
        (c) => c.mostFrequent,
      ),
    ).toEqual(["apple", "Banana"]);
  });

  it("sorts by type, treating it as text", () => {
    // Names ("a", "b") are assigned so their alphabetical order is the
    // opposite of the asserted type order - see the note above `stats`.
    const types = [
      col({ name: "a", type: "text" }),
      col({ name: "b", type: "numeric" }),
    ];
    expect(
      sortStats(types, { key: "type", direction: "ascending" }).map(
        (c) => c.type,
      ),
    ).toEqual(["numeric", "text"]);
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
