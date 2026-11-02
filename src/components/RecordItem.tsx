import { MouseEvent } from "react";
import { Result } from "@/types/BlutilsResult";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import { kebabToSciname } from "@/functions/kebab-to-scientific-name";
import { kebabToPlain } from "@/functions/kebab-to-plain";
import { readableLineage } from "@/functions/record-filter";
import { RecordSort, SortKey } from "@/functions/sort-records";
import { HiArrowSmDown, HiArrowSmUp, HiSelector } from "react-icons/hi";
import { CopyToClipboard } from "./CopyToClipBoard";
import { CompositionBar } from "./CompositionBar";
import { RuleBadge } from "./RuleBadge";

/**
 * Column template shared by the header and every entry, so values line up
 * across records. The scrollbar gutter is reserved on both, so the header
 * stays aligned whether or not the list shows a scrollbar.
 */
export const RECORD_GRID =
  "grid grid-cols-[minmax(0,1fr)_9rem] items-start gap-x-4 gap-y-1 md:grid-cols-[minmax(11rem,2fr)_minmax(10rem,1.5fr)_7rem_10rem] md:gap-x-4 xl:gap-x-6";

// Below `md` the entry is two columns: text stacked on the left, the composition on
// the right spanning the text rows. From `md` every part takes its own column.
const STACKED = "col-start-1 md:col-start-auto";

export const RECORD_ITEM_ESTIMATED_HEIGHT = 84;

const capitalize = (value: string) => value.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

interface RecordHeaderProps {
  /** When `onSort` is set, Query, Taxonomy and Proposed taxon become sort buttons (`sort` null = original order). */
  sort?: RecordSort | null;
  onSort?: (key: SortKey) => void;
}

function SortButton({
  sortKey,
  label,
  sort,
  onSort,
}: {
  sortKey: SortKey;
  label: string;
  sort: RecordSort | null;
  onSort: (key: SortKey) => void;
}) {
  const active = sort?.key === sortKey;
  const Arrow = sort?.direction === "desc" ? HiArrowSmDown : HiArrowSmUp;
  return (
    <button
      type="button"
      aria-label={`Sort by ${label}`}
      aria-pressed={active}
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 uppercase tracking-wide hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${
        active ? "text-gray-900 dark:text-white" : ""
      }`}
    >
      {label}
      {active ? (
        <Arrow aria-hidden className="h-4 w-4" />
      ) : (
        <HiSelector aria-hidden className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}

const ariaSort = (sort: RecordSort | null | undefined, keys: SortKey[]) =>
  sort && keys.includes(sort.key) ? (sort.direction === "asc" ? "ascending" : "descending") : undefined;

export function RecordHeader({ sort, onSort }: RecordHeaderProps = {}) {
  const sortable = sort !== undefined && onSort;
  return (
    <div
      role="row"
      className={`${RECORD_GRID} shrink-0 overflow-hidden px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400 [scrollbar-gutter:stable] dark:text-gray-500 ${
        sortable ? "max-md:flex max-md:flex-wrap max-md:gap-2" : "max-md:hidden"
      }`}
    >
      <div role="columnheader" aria-sort={ariaSort(sort, ["query", "taxonomy"])} className="flex items-center gap-1">
        {sortable ? (
          <>
            <SortButton sortKey="query" label="Query" sort={sort} onSort={onSort} />
            <span aria-hidden>·</span>
            <SortButton sortKey="taxonomy" label="Taxonomy" sort={sort} onSort={onSort} />
          </>
        ) : (
          "Query"
        )}
      </div>
      <div role="columnheader" aria-sort={ariaSort(sort, ["taxon"])}>
        {sortable ? (
          <SortButton sortKey="taxon" label="Proposed taxon" sort={sort} onSort={onSort} />
        ) : (
          "Proposed taxon"
        )}
      </div>
      <div role="columnheader" className="max-md:hidden">
        Rule
      </div>
      <div role="columnheader" className="text-right max-md:hidden">
        Composition
      </div>
    </div>
  );
}

interface Props {
  record: Result;
  onOpenDetails: (record: Result) => void;
  /** Highlighted by keyboard navigation (ArrowUp/ArrowDown). */
  active?: boolean;
}

export function RecordItem({ record, onOpenDetails, active = false }: Props) {
  const taxon = record.taxon;
  const mostProbable = BeanSelectionRules.getMostProbableTaxon(taxon?.consensusBeans);
  const lineage = readableLineage(taxon?.taxonomy);

  // The whole row opens the details, except the rule (its own modal) and the
  // copy icon; a click that ends a text selection does not open it either.
  const openFromRow = () => {
    if (window.getSelection()?.toString()) return;
    onOpenDetails(record);
  };
  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <article
      aria-label={record.query}
      aria-current={active ? "true" : undefined}
      onClick={openFromRow}
      className={`${RECORD_GRID} group cursor-pointer border-b border-gray-200/70 px-4 py-2.5 hover:bg-white dark:border-gray-700/60 dark:hover:bg-gray-800 ${
        active ? "bg-white ring-2 ring-inset ring-gray-400 dark:bg-gray-800 dark:ring-gray-500" : ""
      }`}
    >
      <div className={`min-w-0 ${STACKED}`}>
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="break-all text-left text-lg font-semibold text-gray-900 hover:text-gray-900 hover:underline dark:text-gray-100 dark:hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails(record);
            }}
          >
            {record.query}
          </button>
          <span onClick={stop}>
            <CopyToClipboard text={record.query} />
          </span>
        </div>
        {taxon && (
          <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="shrink-0 rounded bg-gray-100 px-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {kebabToPlain(taxon.reachedRank)}
            </span>
            {lineage && (
              <span className="truncate" title={capitalize(lineage)}>
                {capitalize(lineage).replace(/ > /g, " › ")}
              </span>
            )}
          </div>
        )}
      </div>

      {taxon ? (
        <>
          <div className={`min-w-0 text-gray-900 dark:text-gray-100 ${STACKED}`}>
            <div className="break-words text-lg font-semibold">
              {kebabToSciname(taxon.identifier, taxon.reachedRank)}
            </div>
            {mostProbable.bean && mostProbable.bean.identifier !== taxon.identifier && (
              <div className="truncate text-sm text-gray-600 dark:text-gray-300">
                {kebabToSciname(mostProbable.bean.identifier, mostProbable.bean.rank)}
              </div>
            )}
          </div>
          <div className={STACKED}>
            {/* Also stops clicks bubbling from the rules modal (a portal) to the row. */}
            <span onClick={stop} className="inline-block cursor-auto md:pt-0.5">
              <RuleBadge rule={BeanSelectionRules.getRuleKind(taxon.consensusBeans)} />
            </span>
          </div>
          <div className="col-start-2 row-span-3 row-start-1 flex justify-end md:col-start-auto md:row-span-1 md:row-start-auto">
            <CompositionBar taxon={taxon} />
          </div>
        </>
      ) : (
        <div className={`text-gray-500 dark:text-gray-400 md:col-span-3 ${STACKED}`}>
          No significant match
        </div>
      )}
    </article>
  );
}
