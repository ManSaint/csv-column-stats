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

  // Papa can inject a `__parsed_extra` key on ragged rows; keep only declared
  // headers so rows honor the Record<string, string> contract downstream.
  const rows = result.data.map((row) => {
    const clean: Record<string, string> = {};
    for (const header of headers) clean[header] = row[header] ?? "";
    return clean;
  });

  let error: string | null = null;
  if (result.errors.length > 0) {
    const first = result.errors[0];
    const where = typeof first.row === "number" ? `Row ${first.row + 1}: ` : "";
    error = `${where}${first.message}`;
  }

  return { headers, rows, error };
}
