import { useEffect, useMemo, useRef, useState } from "react";
import { ResultsGroupedByTaxonomy } from "@/types/GroupedResults";
import { Result } from "@/types/BlutilsResult";
import { ResultsPaginationStats } from "@/components/ResultsPaginationStats";
import { ViewType } from "@/types/ViewType";
import { VirtualList, VirtualListHandle } from "@/components/VirtualList";
import {
  RecordHeader,
  RecordItem,
  RECORD_ITEM_ESTIMATED_HEIGHT,
} from "@/components/RecordItem";
import { ConsensusModal } from "../ConsensusModal";
import { SortStatus } from "@/components/SortStatus";
import {
  DEFAULT_SORT,
  nextSort,
  RecordSort,
  sortRecords,
} from "@/functions/sort-records";

interface Props {
  /** Already filtered records (one group per query). */
  records: ResultsGroupedByTaxonomy[];
  /** Number of records before filtering. */
  total: number;
}

export function Table({ records, total }: Props) {
  const [currentQuery, setCurrentQuery] = useState<Result | undefined>(undefined);

  const [sort, setSort] = useState<RecordSort | null>(DEFAULT_SORT);
  const rows: Result[] = useMemo(
    () => sortRecords(records.flatMap((res) => res.chunk), sort),
    [records, sort]
  );

  // A new filter starts from the top of the list.
  const listRef = useRef<VirtualListHandle>(null);
  useEffect(() => {
    listRef.current?.scrollToTop();
  }, [rows]);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col pb-3">
      <div className="mx-3 my-2 flex shrink-0 items-center justify-center gap-3">
        <ResultsPaginationStats
          total={total}
          shown={rows.length}
          groups={rows.length}
          groupedBy={ViewType.Table}
        />
        <SortStatus sort={sort} onReset={() => setSort(null)} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <RecordHeader sort={sort} onSort={(key) => setSort((current) => nextSort(current, key))} />
        <VirtualList
          className="flex-1 [scrollbar-gutter:stable]"
          aria-label="Records"
          listRef={listRef}
          count={rows.length}
          estimateSize={RECORD_ITEM_ESTIMATED_HEIGHT}
          getItemKey={(index) => rows[index].query + "#" + index}
          keyboardNavigation={{ onActivate: (index) => setCurrentQuery(rows[index]) }}
          renderItem={(index, active) => (
            <RecordItem record={rows[index]} onOpenDetails={setCurrentQuery} active={active} />
          )}
        />
      </div>

      <ConsensusModal
        result={currentQuery}
        openModal={!!currentQuery}
        setOpenModal={() => setCurrentQuery(undefined)}
      />
    </div>
  );
}
