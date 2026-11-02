import { HiX } from "react-icons/hi";
import { RecordSort, SortKey } from "@/functions/sort-records";

const SORT_LABELS: Record<SortKey, string> = {
  query: "Query",
  taxon: "Proposed taxon",
  taxonomy: "Taxonomy",
};

interface Props {
  sort: RecordSort | null;
  onReset: () => void;
}

/** "Sorted by …" plus an "Original order" button while a sort is active. */
export function SortStatus({ sort, onReset }: Props) {
  if (!sort) return null;
  return (
    <>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Sorted by {SORT_LABELS[sort.key]}, {sort.direction === "asc" ? "A → Z" : "Z → A"}
      </span>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-gray-700 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
      >
        <HiX aria-hidden className="h-3.5 w-3.5" />
        Original order
      </button>
    </>
  );
}
