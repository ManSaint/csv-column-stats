import type { ColumnStats, ColumnType } from "./types";

function isMissing(value: string | undefined | null): boolean {
  return value === undefined || value === null || value.trim() === "";
}

// Numeric detection uses JS Number() semantics: "1e3" and "0x1" parse as numbers.
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
