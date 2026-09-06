"use client";

import { type ReactNode, useState } from "react";
import {
  nextSortState,
  type SortKey,
  type SortState,
  sortStats,
} from "@/lib/sortStats";
import type { ColumnStats } from "@/lib/types";
import { SortableHeader } from "./SortableHeader";
import { TypeBadge } from "./TypeBadge";

const NAME_CELL = "text-left font-semibold px-4 py-3 whitespace-nowrap";
const NUMERIC_CELL = "px-4 py-3 font-mono tabular-nums whitespace-nowrap";
const TEXT_CELL = "px-4 py-3 whitespace-nowrap";
const TYPE_CELL = "px-4 py-3";

type ColumnDef = {
  key: SortKey;
  label: string;
  cell: (c: ColumnStats) => ReactNode;
  cellClassName: string;
};

function num(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
}

function text(value: string | null): string {
  return value === null ? "—" : value;
}

// One entry per column drives both the header and the body cell, so a stat
// field can't be wired into the header without a matching body cell (or
// vice versa) — the two can no longer drift out of alignment.
const COLUMNS = [
  {
    key: "name",
    label: "Column",
    cell: (c: ColumnStats) => c.name,
    cellClassName: NAME_CELL,
  },
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
              const direction =
                sort !== null && sort.key === key ? sort.direction : null;
              return (
                <SortableHeader
                  key={key}
                  label={label}
                  direction={direction}
                  onClick={() => setSort((prev) => nextSortState(prev, key))}
                />
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
                  <th key={col.key} scope="row" className={col.cellClassName}>
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
