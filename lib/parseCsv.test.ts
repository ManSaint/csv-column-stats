import { describe, expect, it } from "vitest";
import { parseCsv } from "./parseCsv";

describe("parseCsv", () => {
  it("returns empty result for empty input (not an error)", () => {
    const r = parseCsv("   ");
    expect(r.headers).toEqual([]);
    expect(r.rows).toEqual([]);
    expect(r.error).toBeNull();
  });

  it("parses headers and rows", () => {
    const r = parseCsv("a,b\n1,x\n2,y");
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.rows).toEqual([
      { a: "1", b: "x" },
      { a: "2", b: "y" },
    ]);
    expect(r.error).toBeNull();
  });

  it("handles quoted fields containing commas", () => {
    const r = parseCsv('name,note\n"Doe, John",hi');
    expect(r.rows[0]).toEqual({ name: "Doe, John", note: "hi" });
  });

  it("keeps empty cells as empty strings", () => {
    const r = parseCsv("a,b\n1,\n,2");
    expect(r.rows).toEqual([
      { a: "1", b: "" },
      { a: "", b: "2" },
    ]);
  });

  it("returns headers with zero rows when only a header line is given", () => {
    const r = parseCsv("a,b");
    expect(r.headers).toEqual(["a", "b"]);
    expect(r.rows).toEqual([]);
    expect(r.error).toBeNull();
  });
});
