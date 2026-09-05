export type ColumnType = "numeric" | "text";

export interface ColumnStats {
  name: string;
  type: ColumnType;
  count: number; // non-missing values
  missing: number; // empty or whitespace-only values
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  uniqueCount: number | null;
  mostFrequent: string | null;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  error: string | null;
}
