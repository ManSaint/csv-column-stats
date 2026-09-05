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
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)));
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
