import { describe, expect, it } from "vitest";
import { computeStats } from "./stats";

const cols = (headers: string[], rows: Record<string, string>[]) =>
  computeStats(headers, rows);

describe("computeStats", () => {
  it("computes numeric stats for a numeric column (odd count)", () => {
    const [c] = cols(["n"], [{ n: "1" }, { n: "2" }, { n: "3" }]);
    expect(c.type).toBe("numeric");
    expect(c.count).toBe(3);
    expect(c.missing).toBe(0);
    expect(c.min).toBe(1);
    expect(c.max).toBe(3);
    expect(c.mean).toBe(2);
    expect(c.median).toBe(2);
  });

  it("computes median as the average of the two middle values (even count)", () => {
    const [c] = cols(["n"], [{ n: "1" }, { n: "2" }, { n: "3" }, { n: "4" }]);
    expect(c.median).toBe(2.5);
  });

  it("handles negatives and decimals", () => {
    const [c] = cols(["n"], [{ n: "-2.5" }, { n: "0" }, { n: "2.5" }]);
    expect(c.min).toBe(-2.5);
    expect(c.max).toBe(2.5);
    expect(c.mean).toBe(0);
  });

  it("counts missing (empty and whitespace) and excludes them from stats", () => {
    const [c] = cols(["n"], [{ n: "10" }, { n: "" }, { n: "  " }, { n: "20" }]);
    expect(c.count).toBe(2);
    expect(c.missing).toBe(2);
    expect(c.mean).toBe(15);
    expect(c.type).toBe("numeric");
  });

  it("treats a column with any non-numeric value as text", () => {
    const [c] = cols(["s"], [{ s: "1" }, { s: "apple" }, { s: "3" }]);
    expect(c.type).toBe("text");
    expect(c.min).toBeNull();
    expect(c.mean).toBeNull();
    expect(c.uniqueCount).toBe(3);
  });

  it("computes unique count and most frequent for text columns", () => {
    const [c] = cols(["s"], [{ s: "a" }, { s: "b" }, { s: "a" }, { s: "" }]);
    expect(c.count).toBe(3);
    expect(c.missing).toBe(1);
    expect(c.uniqueCount).toBe(2);
    expect(c.mostFrequent).toBe("a");
  });

  it("treats an all-missing column as text with null stats", () => {
    const [c] = cols(["x"], [{ x: "" }, { x: "  " }]);
    expect(c.type).toBe("text");
    expect(c.count).toBe(0);
    expect(c.missing).toBe(2);
    expect(c.min).toBeNull();
    expect(c.uniqueCount).toBe(0);
    expect(c.mostFrequent).toBeNull();
  });

  it("handles a single-row numeric column", () => {
    const [c] = cols(["n"], [{ n: "42" }]);
    expect(c.min).toBe(42);
    expect(c.max).toBe(42);
    expect(c.mean).toBe(42);
    expect(c.median).toBe(42);
  });

  it("returns one entry per header, preserving order", () => {
    const result = cols(["b", "a"], [{ b: "1", a: "x" }]);
    expect(result.map((c) => c.name)).toEqual(["b", "a"]);
  });

  it("breaks mostFrequent ties by first-encountered value", () => {
    const [c] = cols(["s"], [{ s: "b" }, { s: "a" }, { s: "b" }, { s: "a" }]);
    expect(c.mostFrequent).toBe("b");
  });
});
