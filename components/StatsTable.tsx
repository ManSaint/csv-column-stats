"use client";

import { useMemo, useState } from "react";
import {
  nextSortState,
  type SortKey,
  type SortState,
  sortStats,
} from "@/lib/sortStats";
import type { ColumnStats } from "@/lib/types";
import { TypeBadge } from "./TypeBadge";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Column" },
  { key: "type", label: "Type" },
  { key: "min", label: "Min" },
  { key: "max", label: "Max" },
  { key: "mean", label: "Mean" },
  { key: "median", label: "Median" },
  { key: "uniqueCount", label: "Unique" },
  { key: "mostFrequent", label: "Most frequent" },
  { key: "missing", label: "Missing" },
  { key: "count", label: "Non-missing" },
];

function num(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
}

function text(value: string | number | null): string {
  return value === null ? "—" : String(value);
}

function sortGlyph(sort: SortState | null, key: SortKey): string {
  if (sort === null || sort.key !== key) return "↕";
  return sort.direction === "ascending" ? "▲" : "▼";
}

export function StatsTable({ stats }: { stats: ColumnStats[] }) {
  const [sort, setSort] = useState<SortState | null>(null);
  const rows = useMemo(() => sortStats(stats, sort), [stats, sort]);

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
                    className="w-full flex items-center gap-1.5 px-4 py-3 text-left font-semibold cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
                  >
                    {label}
                    <span
                      aria-hidden="true"
                      className={
                        active
                          ? "w-3 text-center text-slate-900 dark:text-slate-100"
                          : "w-3 text-center text-slate-400 dark:text-slate-500"
                      }
                    >
                      {sortGlyph(sort, key)}
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
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {num(c.min)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {num(c.max)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {num(c.mean)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {num(c.median)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {text(c.uniqueCount)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {text(c.mostFrequent)}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {c.missing}
              </td>
              <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                {c.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
