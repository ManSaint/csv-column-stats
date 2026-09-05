import type { ColumnType } from "@/lib/types";

const styles: Record<ColumnType, string> = {
  numeric:
    "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-800",
  text: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
};

export function TypeBadge({ type }: { type: ColumnType }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${styles[type]}`}
    >
      {type === "numeric" ? "Numeric" : "Text"}
    </span>
  );
}
