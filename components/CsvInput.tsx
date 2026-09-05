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
