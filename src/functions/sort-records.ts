import { Result } from "@/types/BlutilsResult";
import { readableLineage } from "./record-filter";

export type SortKey = "query" | "taxon" | "taxonomy";
export type SortDirection = "asc" | "desc";

export interface RecordSort {
  key: SortKey;
  direction: SortDirection;
}

/** No sort: the records keep the order of the loaded file. */
export const DEFAULT_SORT: RecordSort | null = null;

// Natural order, so SRR1.2 comes before SRR1.10.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function sortValue(result: Result, key: SortKey): string | undefined {
  switch (key) {
    case "query":
      return result.query;
    case "taxon":
      return result.taxon?.identifier.replace(/-/g, " ");
    case "taxonomy":
      return readableLineage(result.taxon?.taxonomy) || undefined;
  }
}

/**
 * Sorted copy of `records`. Records without a value for the key (no match,
 * no taxonomy) always go last, whatever the direction; ties keep the query
 * order.
 */
export function sortRecords(records: Result[], sort: RecordSort | null): Result[] {
  if (!sort) return records;
  const sign = sort.direction === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va === undefined || vb === undefined) {
      if (va !== vb) return va === undefined ? 1 : -1;
    } else {
      const byValue = collator.compare(va, vb);
      if (byValue !== 0) return sign * byValue;
    }
    return collator.compare(a.query, b.query);
  });
}

/**
 * Next sort after clicking `key`: a new key starts ascending; the same key
 * goes ascending → descending → original order (null).
 */
export function nextSort(current: RecordSort | null, key: SortKey): RecordSort | null {
  if (!current || current.key !== key) return { key, direction: "asc" };
  return current.direction === "asc" ? { key, direction: "desc" } : null;
}
