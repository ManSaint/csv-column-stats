"use client";

import { type ReactNode, useState } from "react";
import {
  nextSortState,
  type SortDirection,
  type SortKey,
  type SortState,
  sortStats,
} from "@/lib/sortStats";
import type { ColumnStats } from "@/lib/types";
import { TypeBadge } from "./TypeBadge";

const NUMERIC_CELL = "px-4 py-3 font-mono tabular-nums whitespace-nowrap";
const TEXT_CELL = "px-4 py-3 whitespace-nowrap";
const TYPE_CELL = "px-4 py-3";

type ColumnDef = {
  key: SortKey;
  label: string;
  cell: (c: ColumnStats) => ReactNode;
  cellClassName?: string;
};

function num(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
}

function text(value: string | number | null): string {
  return value === null ? "—" : String(value);
}

// One entry per column drives both the header and the body cell, so a stat
// field can't be wired into the header without a matching body cell (or
// vice versa) — the two can no longer drift out of alignment.
const COLUMNS = [
  { key: "name", label: "Column", cell: (c: ColumnStats) => c.name },
  {
    key: "type",
    label: "Type",
    cell: (c: ColumnStats) => <TypeBadge type={c.type} />,
    cellClassName: TYPE_CELL,
  },
  {
    key: "min",
    label: "Min",
    cell: (c: ColumnStats) => num(c.min),
    cellClassName: NUMERIC_CELL,
  },
  {
    key: "max",
    label: "Max",
    cell: (c: ColumnStats) => num(c.max),
    cellClassName: NUMERIC_CELL,
  },
  {
    key: "mean",
    label: "Mean",
    cell: (c: ColumnStats) => num(c.mean),
    cellClassName: NUMERIC_CELL,
  },
  {
    key: "median",
    label: "Median",
    cell: (c: ColumnStats) => num(c.median),
    cellClassName: NUMERIC_CELL,
  },
  {
    key: "uniqueCount",
    label: "Unique",
    cell: (c: ColumnStats) => num(c.uniqueCount),
    cellClassName: NUMERIC_CELL,
  },
  {
    key: "mostFrequent",
    label: "Most frequent",
    cell: (c: ColumnStats) => text(c.mostFrequent),
    cellClassName: TEXT_CELL,
  },
  {
    key: "missing",
    label: "Missing",
    cell: (c: ColumnStats) => num(c.missing),
    cellClassName: NUMERIC_CELL,
  },
  {
    key: "count",
    label: "Non-missing",
    cell: (c: ColumnStats) => num(c.count),
    cellClassName: NUMERIC_CELL,
  },
] as const satisfies readonly ColumnDef[];

// Compile-time check that every ColumnStats field sortStats can sort by is
// also represented in COLUMNS. If a key is added to SortKey without adding
// a COLUMNS entry, `never` is not assignable to `true` below and the build
// fails, instead of silently rendering one header short of one body cell.
type CoveredKey = (typeof COLUMNS)[number]["key"];
type AllSortKeysCovered = SortKey extends CoveredKey ? true : never;
const _allSortKeysCovered: AllSortKeysCovered = true;
void _allSortKeysCovered;

function sortGlyph(direction: SortDirection | null): string {
  if (direction === null) return "↕";
  return direction === "ascending" ? "▲" : "▼";
}

export function StatsTable({ stats }: { stats: ColumnStats[] }) {
  const [sort, setSort] = useState<SortState | null>(null);
  const rows = sortStats(stats, sort);

  return (
    <div className="overflow-x-auto border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
      <table className="w-full border-collapse text-sm min-w-[760px]">
        <caption className="sr-only">
          Per-column statistics for the parsed CSV. Each column header is a
          button that sorts the table.
        </caption>
        <thead>
          <tr>
            {COLUMNS.map(({ key, label }) => {
              const active = sort !== null && sort.key === key;
              return (
                <th
                  key={key}
                  scope="col"
                  aria-sort={active ? sort.direction : "none"}
                  className="text-left text-[13px] font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 whitespace-nowrap p-0"
                >
                  <button
                    type="button"
                    onClick={() => setSort((prev) => nextSortState(prev, key))}
                    className="w-full flex items-center gap-1.5 px-4 py-3 text-left font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-400"
                  >
                    {label}
                    <span
                      aria-hidden="true"
                      className={`w-3 text-center ${
                        active
                          ? "text-slate-900 dark:text-slate-100"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {sortGlyph(active ? sort.direction : null)}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr
              // papaparse (header: true) de-dupes headers upstream
              // (a,a,a -> a,a_1,a_2), so c.name is unique on the app's only
              // data path — that matters now that rows reorder on sort,
              // since duplicate keys plus reordering is how React reuses
              // the wrong DOM node.
              key={c.name}
              className="border-b border-slate-200 dark:border-slate-800 last:border-0"
            >
              {COLUMNS.map((col) =>
                col.key === "name" ? (
                  <th
                    key={col.key}
                    scope="row"
                    className="text-left font-semibold px-4 py-3 whitespace-nowrap"
                  >
                    {col.cell(c)}
                  </th>
                ) : (
                  <td key={col.key} className={col.cellClassName}>
                    {col.cell(c)}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
