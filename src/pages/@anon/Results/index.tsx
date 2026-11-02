import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlineRefresh } from "react-icons/hi";
import { ResultLoader } from "./elements/ResultLoader";
import { Button } from "flowbite-react";
import { ViewType } from "@/types/ViewType";
import { BlutilsResult, Result } from "@/types/BlutilsResult";
import { ResultsGroupedByTaxonomy } from "@/types/GroupedResults";
import { TableView } from "./elements/TableView";
import { GroupedByTaxonomyView } from "./elements/GroupedByTaxonomyView";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useResultsUrlState } from "@/hooks/use-results-url-state";
import type { ShellContext } from "@/components/Shell";
import { GroupedByQueryView } from "./elements/GroupedByQueryView";
import { wrapKey } from "@/functions/suggest-wrap-characters";
import { FilterBar } from "@/components/FilterBar";
import {
  FilterToken,
  matchesFilter,
  parseFilter,
  serializeFilter,
} from "@/functions/record-filter";
import { buildTaxonomyTree } from "@/functions/taxonomy-tree";
import { buildSuggestionIndex } from "@/functions/filter-suggestions";

const VIEW_LABELS: Record<ViewType, string> = {
  [ViewType.Table]: "Table",
  [ViewType.GroupedByTaxonomy]: "By taxonomy",
  [ViewType.GroupedBySubject]: "By subject",
};

export function Results() {
  const [, setSearchParams] = useSearchParams();
  const {
    view: viewType,
    group,
    filter,
    mode,
    chart,
    setView,
    setGroup,
    setFilter,
    setMode,
    setChart,
    openGroup,
  } = useResultsUrlState();
  // Absent when rendered outside the Shell (tests).
  const shell = useOutletContext<ShellContext | undefined>();
  const [wrapCharacter, setWrapCharacter] = useState<string | undefined>(undefined);

  const [blutilsResult, setBlutilsResult] = useState<BlutilsResult | null>(
    null
  );

  const setFullscreen = shell?.setFullscreen;
  const hasResult = blutilsResult !== null;
  // The views size their virtual lists from a viewport-bounded box. Before the
  // Shell switches to fullscreen that box is unbounded, and a large result
  // would mount every row in one render. Wait for the bounded layout.
  const layoutReady = !shell || shell.fullscreen;
  useEffect(() => {
    if (!setFullscreen) return;
    setFullscreen(hasResult);
    return () => setFullscreen(false);
  }, [setFullscreen, hasResult]);

  const handleReset = () => {
    setBlutilsResult(null);
    setSearchParams({});
  };

  // Rendered in the Shell navbar (frees vertical space); in place without a Shell.
  const resetButton = (
    <Button
      color="dark"
      size="sm"
      className="mr-2"
      title="Close this result and load another file"
      onClick={() => handleReset()}
    >
      <HiOutlineRefresh aria-hidden className="mr-1.5 h-4 w-4" />
      Reset
    </Button>
  );

  const tokens = useMemo(() => parseFilter(filter), [filter]);
  const setTokens = (next: FilterToken[]) => setFilter(serializeFilter(next));
  const addTaxonomyFilter = (path: string) => {
    if (tokens.some((t) => t.kind === "t" && t.value === path)) return;
    setTokens([...tokens, { kind: "t", value: path }]);
  };
  const chartProps = {
    mode,
    chart,
    onChartChange: setChart,
    onOpenGroup: openGroup,
    onFilterTaxonomy: addTaxonomyFilter,
  };

  // The filter applies before grouping, in every view.
  const filteredResults = useMemo(
    () =>
      blutilsResult
        ? blutilsResult.results.filter((result) => matchesFilter(result, tokens))
        : [],
    [blutilsResult, tokens]
  );

  const subjectQueries = useMemo(
    () => filteredResults.map((result) => result.query),
    [filteredResults]
  );

  // Suggest only values that still have records under the active filter.
  const suggestionIndex = useMemo(
    () => (blutilsResult ? buildSuggestionIndex(filteredResults) : undefined),
    [blutilsResult, filteredResults]
  );

  const taxonomyTree = useMemo(
    () => (blutilsResult ? buildTaxonomyTree(blutilsResult.results) : []),
    [blutilsResult]
  );

  const groupedResults: ResultsGroupedByTaxonomy[] = useMemo(() => {
    if (!blutilsResult) return [];
    const unidentifiedKey = "Unidentified";

    const grouped = filteredResults.reduce((acc, item) => {
      let key = undefined;

      if ([ViewType.Table, ViewType.GroupedBySubject].includes(viewType)) {
        key =
          viewType === ViewType.GroupedBySubject
            ? wrapKey(item.query, wrapCharacter)
            : item.query;

      } else if (viewType === ViewType.GroupedByTaxonomy) {
        key = item.taxon ? item.taxon.identifier : unidentifiedKey;

      } else {
        throw new Error("Unknown grouping type");
      }

      if (!key) return acc;

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(item);

      return acc;
    }, {} as Record<string, Result[]>);

    return Object.entries(grouped)
      .map(([name, chunk]) => ({
        name,
        rank: chunk[0].taxon?.reachedRank || "",
        taxonomy: chunk[0].taxon?.taxonomy || "",
        groupedBy: viewType,
        chunk,
      }))
      // The Table keeps the file order (its "original order"); groups sort by name.
      .sort((a, b) => (viewType === ViewType.Table ? 0 : a.name.localeCompare(b.name)));
  }, [blutilsResult, filteredResults, viewType, wrapCharacter]);

  return (
    <div className={hasResult ? "flex h-full min-h-0 flex-col" : "pb-32"}>
      {blutilsResult && (
        <div className="mx-auto w-full max-w-6xl shrink-0 px-5 pb-2 pt-3">
          <FilterBar
            tokens={tokens}
            onChange={setTokens}
            tree={taxonomyTree}
            suggestions={suggestionIndex}
            footer={
              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="group"
                  aria-label="View"
                  className="inline-flex w-full rounded-full bg-gray-100 p-0.5 dark:bg-gray-700 md:w-auto"
                >
                  {[ViewType.Table, ViewType.GroupedByTaxonomy, ViewType.GroupedBySubject].map(
                    (type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={viewType === type}
                        onClick={() => setView(type)}
                        className={`flex-1 whitespace-nowrap rounded-full px-3 py-1 text-sm md:flex-none ${
                          viewType === type
                            ? "bg-white font-semibold text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                        }`}
                      >
                        {VIEW_LABELS[type]}
                      </button>
                    )
                  )}
                </div>
                {viewType !== ViewType.Table && (
                  <div
                    role="group"
                    aria-label="Display"
                    className="inline-flex rounded-full bg-gray-100 p-0.5 dark:bg-gray-700"
                  >
                    {(["list", "charts"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={mode === m}
                        onClick={() => setMode(m)}
                        className={`whitespace-nowrap rounded-full px-3 py-1 text-sm capitalize ${
                          mode === m
                            ? "bg-white font-semibold text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        </div>
      )}

      {blutilsResult &&
        (shell?.navbarActions
          ? createPortal(resetButton, shell.navbarActions)
          : resetButton)}

      <div className={hasResult ? "mx-5 flex min-h-0 flex-1 flex-col" : "mx-5"}>
        {blutilsResult ? (
          layoutReady && (
          <>
            {viewType === ViewType.Table && groupedResults && (
              <TableView records={groupedResults} total={blutilsResult.results.length} />
            )}

            {viewType !== ViewType.Table && groupedResults.length === 0 && (
              <p className="py-10 text-center text-gray-500 dark:text-gray-400">
                No records match the filter.
              </p>
            )}

            {viewType === ViewType.GroupedByTaxonomy && groupedResults.length > 0 && (
              <GroupedByTaxonomyView
                results={groupedResults}
                group={group}
                onGroupChange={setGroup}
                {...chartProps}
              />
            )}

            {viewType === ViewType.GroupedBySubject && groupedResults.length > 0 && (
              <GroupedByQueryView
                results={groupedResults}
                group={group}
                onGroupChange={setGroup}
                {...chartProps}
                wrapCharacter={wrapCharacter}
                onWrapCharacterChange={setWrapCharacter}
                queries={subjectQueries}
              />
            )}
          </>
          )
        ) : (
          <ResultLoader resultSetter={setBlutilsResult} />
        )}
      </div>
    </div>
  );
}
