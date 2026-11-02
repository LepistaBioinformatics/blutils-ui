import { ResultsGroupedByQuery } from "@/types/GroupedResults";
import { Result } from "@/types/BlutilsResult";
import { ConsensusModal } from "../ConsensusModal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GroupPager, PagerGroup } from "@/components/GroupPager";
import { WrapCharacterControl } from "@/components/WrapCharacterControl";
import { VirtualList, VirtualListHandle } from "@/components/VirtualList";
import {
  RecordHeader,
  RecordItem,
  RECORD_ITEM_ESTIMATED_HEIGHT,
} from "@/components/RecordItem";
import { SortStatus } from "@/components/SortStatus";
import { ChartPanel } from "@/components/charts/ChartPanel";
import type { GroupMode } from "@/hooks/use-results-url-state";
import {
  DEFAULT_SORT,
  nextSort,
  RecordSort,
  sortRecords,
} from "@/functions/sort-records";

interface Props {
  results: ResultsGroupedByQuery[];
  /** Name of the group to show (`?g=`); unknown or missing → first group. */
  group: string | null;
  onGroupChange: (name: string) => void;
  /** List (pager) or Charts (009); charts span every group of the view. */
  mode?: GroupMode;
  chart?: string | null;
  onChartChange?: (id: string) => void;
  /** Open a group from a chart, back in List mode. */
  onOpenGroup?: (name: string) => void;
  onFilterTaxonomy?: (path: string) => void;
  wrapCharacter: string | undefined;
  onWrapCharacterChange: (value: string | undefined) => void;
  /** Queries the wrap character suggestions are computed from. */
  queries: string[];
}

export function Grouped({
  results,
  group: groupName,
  onGroupChange,
  mode = "list",
  chart = null,
  onChartChange,
  onOpenGroup,
  onFilterTaxonomy,
  wrapCharacter,
  onWrapCharacterChange,
  queries,
}: Props) {
  const [currentQuery, setCurrentQuery] = useState<Result | undefined>(
    undefined
  );

  const handleQueryDetails = (result: Result | undefined) => {
    setCurrentQuery(result);
  };

  const found = results.findIndex((result) => result.name === groupName);
  const current = found === -1 ? 0 : found;
  const group = results[current];

  // Same sorting as the Table, applied to the records of the current group;
  // it is kept while moving between groups.
  const [sort, setSort] = useState<RecordSort | null>(DEFAULT_SORT);
  const rows = useMemo(() => (group ? sortRecords(group.chunk, sort) : []), [group, sort]);

  const pagerGroups: PagerGroup[] = results.map((result) => ({
    name: result.name,
    label: result.name,
    count: result.chunk.length,
  }));

  const onNavigate = useCallback(
    (index: number) => onGroupChange(results[index].name),
    [onGroupChange, results]
  );

  // Every group starts at its first record.
  const listRef = useRef<VirtualListHandle>(null);
  useEffect(() => {
    listRef.current?.scrollToTop();
  }, [current]);

  if (!group) return null;

  if (mode === "charts") {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-4 px-1 pt-2 max-md:flex-col">
        {/* The subject charts depend on the wrap character: keep it at hand. */}
        <div className="w-72 shrink-0 max-md:w-full">
          <WrapCharacterControl value={wrapCharacter} onChange={onWrapCharacterChange} queries={queries} />
        </div>
        <ChartPanel
          kind="subject"
          groups={results}
          chart={chart}
          onChartChange={(id) => onChartChange?.(id)}
          onOpenGroup={(name) => (onOpenGroup ?? onGroupChange)(name)}
          onFilterTaxonomy={(path) => onFilterTaxonomy?.(path)}
          groupLabel={(name) => name}
        />
      </div>
    );
  }

  return (
    <>
      <GroupPager
        groups={pagerGroups}
        current={current}
        onNavigate={onNavigate}
        sidebarHeader={
          <WrapCharacterControl
            value={wrapCharacter}
            onChange={onWrapCharacterChange}
            queries={queries}
          />
        }
      >
        <h3 className="mb-2 mt-4 shrink-0 px-4 text-gray-900 dark:text-gray-100">
          <div className="flex items-baseline gap-8">
            {/* Query names are shown verbatim (BUG-U18). */}
            <div className="truncate text-3xl">{group.name}</div>
            <div className="text-lg text-gray-600 dark:text-gray-400">x{group.chunk.length}</div>
          </div>
        </h3>
        {sort && (
          <div className="mb-2 flex shrink-0 items-center gap-3 px-4">
            <SortStatus sort={sort} onReset={() => setSort(null)} />
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <RecordHeader sort={sort} onSort={(key) => setSort((value) => nextSort(value, key))} />
          <VirtualList
            key={group.name}
            className="flex-1 [scrollbar-gutter:stable]"
            aria-label="Group records"
            listRef={listRef}
            count={rows.length}
            estimateSize={RECORD_ITEM_ESTIMATED_HEIGHT}
            keyboardNavigation={{ onActivate: (index) => handleQueryDetails(rows[index]) }}
            renderItem={(index, active) => (
              <RecordItem
                record={rows[index]}
                onOpenDetails={handleQueryDetails}
                active={active}
              />
            )}
          />
        </div>
      </GroupPager>

      <ConsensusModal
        result={currentQuery}
        openModal={!!currentQuery}
        setOpenModal={() => handleQueryDetails(undefined)}
      />
    </>
  );
}
