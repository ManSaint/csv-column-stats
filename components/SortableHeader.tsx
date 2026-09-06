import type { SortDirection } from "@/lib/sortStats";

function sortGlyph(direction: SortDirection | null): string {
  if (direction === null) return "↕";
  return direction === "ascending" ? "▲" : "▼";
}

export function SortableHeader({
  label,
  direction,
  onClick,
}: {
  label: string;
  /** Current sort direction for this column, or null if it isn't the active sort. */
  direction: SortDirection | null;
  onClick: () => void;
}) {
  const active = direction !== null;

  return (
    <th
      scope="col"
      aria-sort={direction ?? "none"}
      className="text-left text-[13px] font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 whitespace-nowrap p-0"
    >
      <button
        type="button"
        onClick={onClick}
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
          {sortGlyph(direction)}
        </span>
      </button>
    </th>
  );
}
