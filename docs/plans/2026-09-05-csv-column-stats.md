# csv-column-stats Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A single client-side Next.js page that parses a pasted/dropped/picked CSV and shows a per-column statistics table (numeric: min/max/mean/median; text: unique count + most frequent; all columns: missing + non-missing counts).

**Architecture:** Everything runs in the browser — no API routes, no uploads. Papa Parse turns a raw CSV string into rows + headers. A pure `lib/stats.ts` module computes per-column stats from those rows. React component state in `app/page.tsx` holds the parsed result and any error; `components/` render the input and the table.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind CSS v4, Papa Parse, Vitest (unit), Playwright + axe-core (E2E + a11y).

**Design references:** `docs/plans/2026-09-05-csv-column-stats-design.md` and `docs/plans/csv-column-stats-mockup.html` (color tokens, focus ring, badge treatment, Tailwind class list all live in the mockup spec — follow them).

---

## Conventions for every task

- Run all scripts with `bun run <script>` (never bare `bun build` / `bun test`).
- Unit test files sit beside their source: `lib/foo.ts` → `lib/foo.test.ts`.
- Components: one per file under `components/`. Routes only under `app/`. Pure logic under `lib/` with no React imports.
- Each task ends with a commit. The commit gate runs lint + typecheck + test on `git commit` — never pass `--no-verify`. If the gate denies a commit, fix the reported failure and retry.
- TDD: write the failing test, run it red, implement minimally, run it green, commit.

---

## Task 1: Install Papa Parse and its types

**Files:**
- Modify: `package.json` (dependencies)

**Step 1: Add the dependency and dev types**

Papa Parse is plain JavaScript, so its TypeScript types are a separate dev dependency.

Run:
```bash
bun add papaparse
bun add -d @types/papaparse
```

**Step 2: Verify install**

Run: `bun run typecheck`
Expected: PASS (exit 0). No usage yet, so this just confirms nothing broke.

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add papaparse and @types/papaparse"
```

---

## Task 2: Shared types

**Files:**
- Create: `lib/types.ts`

**Step 1: Write the types**

```typescript
export type ColumnType = "numeric" | "text";

export interface ColumnStats {
  name: string;
  type: ColumnType;
  count: number; // non-missing values
  missing: number; // empty or whitespace-only values
  // numeric-only (null for text columns)
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  // text-only (null for numeric columns)
  uniqueCount: number | null;
  mostFrequent: string | null;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  error: string | null;
}
```

**Step 2: Verify**

Run: `bun run typecheck`
Expected: PASS.

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add ColumnStats and ParsedCsv types"
```

---

## Task 3: Stats computation (pure logic, TDD)

This is the heart of the app. Build it test-first.

**Files:**
- Create: `lib/stats.ts`
- Test: `lib/stats.test.ts`

**Behaviour to implement (`computeStats(headers: string[], rows: Record<string, string>[]): ColumnStats[]`):**
- A value is **missing** if it is `undefined`, `null`, empty string, or whitespace-only (`value.trim() === ""`).
- `count` = number of non-missing values in the column; `missing` = number of missing values.
- A column is **numeric** if it has at least one non-missing value AND every non-missing value parses as a finite number (use a helper `toNumber(v: string): number | null` that returns `Number(v.trim())` only when the trimmed string is non-empty and `Number.isFinite`). Otherwise it is **text**. A column whose values are all missing is **text** (numeric stats null).
- Numeric columns: `min`, `max`, `mean` (arithmetic mean, not rounded), `median` (average of the two middle values for even counts; the middle value for odd counts) over the non-missing numeric values. `uniqueCount`/`mostFrequent` are null.
- Text columns: `uniqueCount` = number of distinct non-missing values; `mostFrequent` = the non-missing value with the highest frequency (on a tie, the first one encountered by scan order). `min`/`max`/`mean`/`median` are null.

**Step 1: Write the failing tests**

```typescript
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
    const [c] = cols(
      ["s"],
      [{ s: "a" }, { s: "b" }, { s: "a" }, { s: "" }],
    );
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
});
```

**Step 2: Run tests to verify they fail**

Run: `bun run test`
Expected: FAIL (computeStats not defined / not exported).

**Step 3: Implement `lib/stats.ts`**

```typescript
import type { ColumnStats, ColumnType } from "./types";

function isMissing(value: string | undefined | null): boolean {
  return value === undefined || value === null || value.trim() === "";
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function computeColumn(
  name: string,
  rows: Record<string, string>[],
): ColumnStats {
  const present: string[] = [];
  let missing = 0;
  for (const row of rows) {
    const value = row[name];
    if (isMissing(value)) missing++;
    else present.push(value);
  }

  const numbers = present.map(toNumber);
  const isNumeric = present.length > 0 && numbers.every((n) => n !== null);

  const base = { name, count: present.length, missing };

  if (isNumeric) {
    const nums = (numbers as number[]).slice().sort((a, b) => a - b);
    const sum = nums.reduce((acc, n) => acc + n, 0);
    return {
      ...base,
      type: "numeric" as ColumnType,
      min: nums[0],
      max: nums[nums.length - 1],
      mean: sum / nums.length,
      median: median(nums),
      uniqueCount: null,
      mostFrequent: null,
    };
  }

  const freq = new Map<string, number>();
  for (const value of present) freq.set(value, (freq.get(value) ?? 0) + 1);
  let mostFrequent: string | null = null;
  let best = 0;
  for (const [value, n] of freq) {
    if (n > best) {
      best = n;
      mostFrequent = value;
    }
  }

  return {
    ...base,
    type: "text" as ColumnType,
    min: null,
    max: null,
    mean: null,
    median: null,
    uniqueCount: freq.size,
    mostFrequent,
  };
}

export function computeStats(
  headers: string[],
  rows: Record<string, string>[],
): ColumnStats[] {
  return headers.map((name) => computeColumn(name, rows));
}
```

**Step 4: Run tests to verify they pass**

Run: `bun run test`
Expected: PASS (all cases green).

**Step 5: Commit**

```bash
git add lib/stats.ts lib/stats.test.ts
git commit -m "feat: compute per-column stats"
```

---

## Task 4: CSV parsing wrapper (Papa Parse, TDD)

**Files:**
- Create: `lib/parseCsv.ts`
- Test: `lib/parseCsv.test.ts`

**Verified Papa Parse API (from Context7, package `papaparse` + `@types/papaparse`):**
- Import: `import Papa from "papaparse";`
- Synchronous string parse: `Papa.parse<T>(csvString, config): Papa.ParseResult<T>` returning `{ data: T[]; errors: Papa.ParseError[]; meta: Papa.ParseMeta }`.
- With `header: true`, `data` is an array of objects keyed by the header row, and `meta.fields: string[]` is the ordered header list.
- Config to use: `{ header: true, skipEmptyLines: "greedy", dynamicTyping: false }` — keep values as raw strings so `lib/stats.ts` owns type detection and the "missing" definition; `"greedy"` drops rows that are entirely empty/whitespace so they do not inflate missing counts.
- `Papa.ParseError` has `{ type, code, message, row }`.

**Behaviour to implement (`parseCsv(input: string): ParsedCsv`):**
- Trim the input; if empty, return `{ headers: [], rows: [], error: null }` (empty is not an error — the UI shows an empty state).
- Otherwise call `Papa.parse<Record<string, string>>(input, { header: true, skipEmptyLines: "greedy", dynamicTyping: false })`.
- `headers` = `result.meta.fields ?? []`.
- If `headers.length === 0`, return an error `"Could not find a header row."`.
- If `result.errors.length > 0`, set `error` to a readable message combining the first error's `message` and its `row` (1-based for humans: `row + 2` accounting for header + 0-index — but keep it simple: `"Row ${firstError.row + 1}: ${firstError.message}"`). Still return whatever `rows` parsed.
- `rows` = `result.data`.

**Step 1: Write the failing tests**

```typescript
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
```

**Step 2: Run tests to verify they fail**

Run: `bun run test`
Expected: FAIL (parseCsv not defined).

**Step 3: Implement `lib/parseCsv.ts`**

```typescript
import Papa from "papaparse";
import type { ParsedCsv } from "./types";

export function parseCsv(input: string): ParsedCsv {
  if (input.trim() === "") {
    return { headers: [], rows: [], error: null };
  }

  const result = Papa.parse<Record<string, string>>(input, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });

  const headers = result.meta.fields ?? [];
  if (headers.length === 0) {
    return { headers: [], rows: [], error: "Could not find a header row." };
  }

  let error: string | null = null;
  if (result.errors.length > 0) {
    const first = result.errors[0];
    const where =
      typeof first.row === "number" ? `Row ${first.row + 1}: ` : "";
    error = `${where}${first.message}`;
  }

  return { headers, rows: result.data, error };
}
```

**Step 4: Run tests to verify they pass**

Run: `bun run test`
Expected: PASS.

**Step 5: Commit**

```bash
git add lib/parseCsv.ts lib/parseCsv.test.ts
git commit -m "feat: add papaparse-based CSV parsing wrapper"
```

---

## Task 5: Type badge component

**Files:**
- Create: `components/TypeBadge.tsx`

Color is never the only signal — the badge always shows the word ("Numeric"/"Text") plus a distinct background/border, per the design spec.

**Step 1: Implement**

```tsx
import type { ColumnType } from "@/lib/types";

const styles: Record<ColumnType, string> = {
  numeric:
    "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800",
  text: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
};

export function TypeBadge({ type }: { type: ColumnType }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${styles[type]}`}
    >
      {type === "numeric" ? "Numeric" : "Text"}
    </span>
  );
}
```

**Step 2: Verify**

Run: `bun run lint && bun run typecheck`
Expected: PASS.

**Step 3: Commit**

```bash
git add components/TypeBadge.tsx
git commit -m "feat: add TypeBadge component"
```

---

## Task 6: Stats table component

**Files:**
- Create: `components/StatsTable.tsx`

Follow the mockup's table spec: real `<table>` with `<caption>`, `<th scope="col">` headers, `<th scope="row">` for the column name, `<td>` for stats, non-applicable cells render the literal `—`, numeric cells use tabular-nums. Wrap the table in a single horizontal-scroll container.

**Step 1: Implement**

```tsx
import type { ColumnStats } from "@/lib/types";
import { TypeBadge } from "./TypeBadge";

const HEADERS = [
  "Column",
  "Type",
  "Min",
  "Max",
  "Mean",
  "Median",
  "Unique",
  "Most frequent",
  "Missing",
  "Non-missing",
];

function num(value: number | null): string {
  if (value === null) return "—";
  // Trim floating noise without forcing decimals on integers.
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4)));
}

function text(value: string | number | null): string {
  return value === null ? "—" : String(value);
}

export function StatsTable({ stats }: { stats: ColumnStats[] }) {
  return (
    <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
      <table className="w-full border-collapse text-sm min-w-[760px]">
        <caption className="sr-only">
          Per-column statistics for the parsed CSV
        </caption>
        <thead>
          <tr>
            {HEADERS.map((h) => (
              <th
                key={h}
                scope="col"
                className="text-left text-[13px] font-semibold text-slate-600 dark:text-slate-400 px-4 py-3 border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((c) => (
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
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{num(c.min)}</td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{num(c.max)}</td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{num(c.mean)}</td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{num(c.median)}</td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{text(c.uniqueCount)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{text(c.mostFrequent)}</td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{c.missing}</td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">{c.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Verify**

Run: `bun run lint && bun run typecheck`
Expected: PASS.

**Step 3: Commit**

```bash
git add components/StatsTable.tsx
git commit -m "feat: add StatsTable component"
```

---

## Task 7: CSV input component

**Files:**
- Create: `components/CsvInput.tsx`

Supports paste (textarea), drag-and-drop, and file pick — all resolving to one raw CSV string handed to `onCsv(text: string)`. The dropzone `<label>` wraps a real `<input type="file">` (visually hidden with `sr-only`, kept tabbable). A file read uses `file.text()`. This is a client component.

**Step 1: Implement**

```tsx
"use client";

import { useId, useRef, useState } from "react";

export function CsvInput({ onCsv }: { onCsv: (text: string) => void }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteId = useId();
  const fileId = useId();

  async function readFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    setPasted(text);
    onCsv(text);
  }

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-6 flex flex-col gap-5">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-slate-600 dark:text-slate-400">
        Provide a CSV
      </h2>

      <div className="flex flex-col gap-2">
        <label htmlFor={pasteId} className="text-sm font-medium">
          Paste CSV text
        </label>
        <textarea
          id={pasteId}
          value={pasted}
          onChange={(e) => {
            setPasted(e.target.value);
            onCsv(e.target.value);
          }}
          placeholder={"name,age,city\nAda,36,London\nGrace,,New York"}
          className="w-full min-h-[140px] resize-y rounded-lg border border-slate-400 dark:border-slate-600 px-3.5 py-3 font-mono text-[13px] bg-white dark:bg-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400"
        />
      </div>

      <div className="text-center text-sm text-slate-500">or</div>

      <label
        htmlFor={fileId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files[0];
          if (file) void readFile(file);
        }}
        className={`flex flex-col items-center justify-center gap-2.5 text-center border-2 rounded-[10px] p-7 cursor-pointer bg-slate-50 dark:bg-slate-800/50 transition-colors duration-150 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-indigo-600 ${
          dragActive
            ? "border-solid border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30"
            : "border-dashed border-slate-400 dark:border-slate-600 hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
        }`}
      >
        <span className="font-medium">Drop a .csv file here</span>
        <span className="text-sm text-slate-500">or use the button below</span>
        <input
          ref={fileInputRef}
          id={fileId}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-lg border border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Choose file
        </button>
        {fileName && (
          <span className="min-h-6 inline-flex items-center text-sm text-slate-600 dark:text-slate-400">
            {fileName}
          </span>
        )}
      </div>
    </section>
  );
}
```

**Step 2: Verify**

Run: `bun run lint && bun run typecheck`
Expected: PASS.

**Step 3: Commit**

```bash
git add components/CsvInput.tsx
git commit -m "feat: add CsvInput component with paste, drop, and file pick"
```

---

## Task 8: Wire the page

**Files:**
- Modify: `app/page.tsx` (replace the scaffold entirely)

Client component. Holds the raw CSV string; derives parsed result + stats; renders header, `CsvInput`, and one of empty / error / results states. The footer states the privacy guarantee.

**Step 1: Implement `app/page.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { CsvInput } from "@/components/CsvInput";
import { StatsTable } from "@/components/StatsTable";
import { parseCsv } from "@/lib/parseCsv";
import { computeStats } from "@/lib/stats";

export default function Home() {
  const [csv, setCsv] = useState("");

  const parsed = useMemo(() => parseCsv(csv), [csv]);
  const stats = useMemo(
    () => computeStats(parsed.headers, parsed.rows),
    [parsed],
  );

  const hasData = parsed.headers.length > 0;

  return (
    <main className="mx-auto max-w-[840px] px-5 py-12 pb-24 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[1.25] font-bold tracking-[-0.01em]">
          CSV Column Stats
        </h1>
        <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400 max-w-[60ch]">
          Paste or drop a CSV to see each column&apos;s min, max, mean, median,
          and how many values are missing.
        </p>
      </header>

      <CsvInput onCsv={setCsv} />

      {parsed.error && (
        <div
          role="alert"
          className="flex gap-3 items-start bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-[10px] px-4 py-3.5 text-red-700 dark:text-red-300 text-sm"
        >
          <span className="font-semibold">Could not parse that CSV.</span>
          <span>{parsed.error}</span>
        </div>
      )}

      {!parsed.error &&
        (hasData ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-slate-600 dark:text-slate-400">
              Results · {stats.length} columns · {parsed.rows.length} rows
            </h2>
            <StatsTable stats={stats} />
          </section>
        ) : (
          <div
            aria-live="polite"
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center text-slate-500"
          >
            No data yet. Paste CSV text or drop a .csv file above.
          </div>
        ))}

      <footer className="text-xs text-slate-500">
        Runs entirely in your browser. Nothing is uploaded.
      </footer>
    </main>
  );
}
```

**Step 2: Verify build and checks**

Run: `bun run lint && bun run typecheck && bun run test`
Expected: PASS.

**Step 3: Manual smoke (optional but encouraged)**

Run: `bun run dev`, open the page, paste `name,age\nAda,36\nGrace,\n` and confirm a two-row table appears with `age` numeric and one missing value. Stop the server.

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire CSV input to stats table on the home page"
```

---

## Task 9: Playwright E2E test

**Files:**
- Modify: `e2e/smoke.spec.ts` (or Create `e2e/csv.spec.ts` if smoke should stay generic — prefer a dedicated spec)
- Create: `e2e/csv.spec.ts`

**Step 1: Write the E2E test**

```typescript
import { expect, test } from "@playwright/test";

test("computes and displays column stats from pasted CSV", async ({ page }) => {
  await page.goto("/");

  await page
    .getByLabel("Paste CSV text")
    .fill("name,age\nAda,36\nGrace,\nLin,48");

  // Results header reflects parsed shape.
  await expect(page.getByText(/2 columns · 3 rows/)).toBeVisible();

  // The 'age' row: numeric type, min 36, max 48, one missing.
  const ageRow = page.getByRole("row").filter({ hasText: "age" });
  await expect(ageRow.getByText("Numeric")).toBeVisible();
  await expect(ageRow.getByText("36", { exact: true })).toBeVisible();
  await expect(ageRow.getByText("48", { exact: true })).toBeVisible();

  // The 'name' row is text with 3 unique values.
  const nameRow = page.getByRole("row").filter({ hasText: "name" });
  await expect(nameRow.getByText("Text")).toBeVisible();
});

test("shows the empty state before any input", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/No data yet/)).toBeVisible();
});
```

**Step 2: Run the E2E test**

Run: `bun run test:e2e`
Expected: PASS. If selectors are ambiguous, tighten them (e.g. scope to the results table) rather than loosening assertions.

**Step 3: Commit**

```bash
git add e2e/csv.spec.ts
git commit -m "test: add e2e coverage for CSV stats flow"
```

---

## Task 10: Accessibility — add the route to the a11y sweep

**Files:**
- Modify: `e2e/a11y.spec.ts` (add `/` to the `ROUTES` array if not already present)

**Step 1: Ensure `/` is in `ROUTES`**

Open `e2e/a11y.spec.ts` and confirm the `ROUTES` array includes `"/"`. If it already does, no code change is needed — proceed to run the sweep.

**Step 2: Run the a11y sweep**

Run: `bun run test:a11y`
Expected: PASS (0 axe violations, WCAG 2.2 AA). If a violation appears, fix the component (contrast, labels, semantics) — do not suppress the rule.

**Step 3: Commit (only if a file changed)**

```bash
git add e2e/a11y.spec.ts
git commit -m "test: cover home route in a11y sweep"
```

If nothing changed because `/` was already covered, skip the commit and note it.

---

## Task 11: README — remove the stub

**Files:**
- Modify: `README.md` (must no longer contain the `README-STUB` marker)
- Create: `docs/screenshot.png` (a screenshot of the working page)

**Step 1: Capture a screenshot**

Run `bun run dev`, load the page with sample data pasted, and capture a screenshot to `docs/screenshot.png` (Playwright or the browser tool). Stop the server.

**Step 2: Rewrite `README.md`**

Write a real README: one-paragraph description of what the app does, a screenshot embed (`![CSV Column Stats](docs/screenshot.png)`), how to run it (`bun install`, `bun run dev`), how to run the checks (`bun run test`, `bun run test:e2e`, `bun run test:a11y`), and a one-line note that it is fully client-side. Ensure the `README-STUB` marker is gone.

**Step 3: Verify the stub is gone**

Run: `grep -c "README-STUB" README.md`
Expected: `0`.

**Step 4: Commit**

```bash
git add README.md docs/screenshot.png
git commit -m "docs: write real README with screenshot"
```

---

## Definition of done (verify before finishing)

1. `bun run lint` exits 0
2. `bun run typecheck` exits 0
3. `bun run test` exits 0
4. `bun run test:e2e` exits 0
5. `bun run test:a11y` exits 0
6. `grep -c "README-STUB" README.md` returns 0
