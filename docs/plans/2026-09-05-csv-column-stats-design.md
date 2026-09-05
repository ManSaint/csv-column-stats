# csv-column-stats — Design

**Date:** 2026-09-05
**Status:** Approved

## Purpose

A single page where a user pastes or drops a CSV and immediately sees, for every
column: min, max, mean, median, and how many values are missing. Text columns get
type-appropriate stats instead. Everything runs in the browser — nothing is uploaded.

## Architecture

Entirely client-side. No API routes, no server, no uploads.

- **Parsing:** [Papa Parse](https://www.papaparse.com/) handles quoted fields,
  commas-in-quotes, newlines-in-quotes, and header detection.
- **Computation:** a pure `lib/stats.ts` module computes per-column statistics from
  the parsed rows. No React, no I/O — trivially unit-testable.
- **State:** React component state holds the parsed result and any parse error.
- **Render:** a semantic `<table>` shows one row per column.

## Data flow

1. User provides CSV via **paste** (textarea), **drag & drop**, or **file picker**.
   All three resolve to a single raw CSV string fed into one code path.
2. `lib/parseCsv.ts` (Papa Parse wrapper) → `{ headers, rows, errors }`.
3. `lib/stats.ts` walks each column and produces a `ColumnStats` record.
4. `components/StatsTable.tsx` renders the records.

## Type detection & statistics

- **Numeric** — a column is numeric if **every non-missing** value parses as a finite
  number. Such columns report: `min`, `max`, `mean`, `median`, `missing`, `count`.
- **Text** — any column that is not numeric. Reports: `uniqueCount`, `mostFrequent`,
  `missing`, `count`. Numeric stat cells render as "—".
- **Missing** — a cell that is empty or whitespace-only. Counted for every column.
- `count` = number of non-missing values.

## Components (one per file)

| File | Responsibility |
|------|----------------|
| `app/page.tsx` | The screen: input area + results + error/empty states |
| `components/CsvInput.tsx` | Paste / drop / file-pick; emits raw CSV string |
| `components/StatsTable.tsx` | Renders `ColumnStats[]` as a table |
| `lib/stats.ts` | Pure stat computation (`computeStats`, helpers) |
| `lib/parseCsv.ts` | Thin Papa Parse wrapper |
| `lib/types.ts` | `ColumnStats`, `ParsedCsv` types |

## Error handling

- **Empty input** → no table, a gentle prompt to paste or drop a file.
- **Parse errors** (Papa's `errors` array) → inline message naming the problem;
  still render whatever rows parsed if any.
- **Headers but zero data rows** → table with all-zero counts.
- **No rows at all** → clear "no data" state.

## Testing

- **Vitest** unit tests for `lib/stats.ts`: numeric columns, text columns, all-missing,
  mixed numeric/text, single-row, negatives, decimals, even/odd-count median.
- **Playwright E2E**: paste a sample CSV → assert the table shows expected values.
- **Axe a11y**: the route is added to `ROUTES` in `e2e/a11y.spec.ts`.

## Accessibility (WCAG 2.2 AA, per project CLAUDE.md)

- Real `<table>` with `<th scope="col">` / row headers for column names.
- Dropzone wraps a genuine `<input type="file">` — keyboard-reachable, labeled.
- Visible focus ring on all interactive elements.
- Text contrast ≥ 4.5:1; interactive targets ≥ 24×24 px.

## Out of scope for v1

Date-type detection, custom missing-value tokens (NA/null/etc.), delimiter override,
downloading/exporting results, charts. Missing = empty/whitespace only.
