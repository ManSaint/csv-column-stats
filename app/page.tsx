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
