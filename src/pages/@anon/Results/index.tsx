import { useMemo, useState } from "react";
import { ResultUpload } from "./elements/ResultUpload";
import { Button, Pagination, Select } from "flowbite-react";
import { ViewType } from "@/types/ViewType";
import { BlutilsResult, Result } from "@/types/BlutilsResult";
import { PaginatedResults } from "@/types/PaginatedResults";
import { TableView } from "./elements/TableView";
import { GroupedView } from "./elements/GroupedView";
import { ConsensusModal } from "./elements/ConsensusModal";

export function Results() {
  const [blutilsResult, setBlutilsResult] = useState<BlutilsResult | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [groupedBy, setGroupedBy] = useState<ViewType>(ViewType.Query);
  const [currentQuery, setCurrentQuery] = useState<Result | undefined>(
    undefined
  );

  const [querySearch, setQuerySearch] = useState<string | undefined>(undefined);
  const [subjectSearch, setSubjectSearch] = useState<string | undefined>(
    undefined
  );

  const handleQueryDetails = (result: Result | undefined) => {
    setCurrentQuery(result);
  };

  const filteredResults = useMemo(() => {
    if (!blutilsResult) return undefined;

    return {
      ...blutilsResult,
      results: blutilsResult.results.filter((item) => {
        if (querySearch) {
          if (!item.query.includes(querySearch)) return false;
        }

        if (subjectSearch) {
          if (!item.taxon?.identifier.includes(subjectSearch)) return false;
        }

        return true;
      }),
    };
  }, [blutilsResult, querySearch, subjectSearch]);

  const groupedResults: PaginatedResults[] = useMemo(() => {
    if (!filteredResults) return [];
    const unidentifiedKey = "Unidentified";

    const grouped = filteredResults.results.reduce((acc, item) => {
      let key = undefined;
      if (groupedBy === ViewType.Query) {
        key = item.query;
      } else if (groupedBy === ViewType.Subject) {
        if (!item.taxon) key = unidentifiedKey;
        key = item.taxon?.identifier;
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
        groupedBy,
        chunk,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredResults, groupedBy]);

  function chunk<T>(values: T[], size: number): T[][] {
    return Array.from(new Array(Math.ceil(values.length / size)), (_, i) =>
      values.slice(i * size, i * size + size)
    );
  }

  const paginatedResults: PaginatedResults[][] = useMemo(() => {
    return chunk(groupedResults, pageSize);
  }, [groupedResults, pageSize]);

  const currentRecords: PaginatedResults[] | undefined = useMemo(() => {
    if (paginatedResults.length === 0) return undefined;

    if (currentPage < paginatedResults.length) {
      return paginatedResults[currentPage - 1];
    }

    return paginatedResults[paginatedResults.length - 1];
  }, [currentPage, paginatedResults]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen pb-32">
      <div className="m-8">
        {blutilsResult ? (
          <>
            <div>
              <div className="my-5 flex gap-8 justify-between items-center">
                <div>
                  <Button onClick={() => setBlutilsResult(null)}>Reset</Button>
                </div>

                <div
                  className={`-mt-1 ${
                    groupedBy !== ViewType.Query ? "hidden" : ""
                  }`}
                >
                  <Pagination
                    currentPage={currentPage}
                    totalPages={paginatedResults.length}
                    onPageChange={onPageChange}
                  />
                </div>

                <Select
                  value={groupedBy}
                  onChange={(e) => {
                    setGroupedBy(e.target.value as ViewType);
                    setCurrentPage(1);
                  }}
                >
                  <option value={ViewType.Query}>
                    {ViewType.Query.valueOf().toUpperCase()}
                  </option>
                  <option value={ViewType.Subject}>
                    {ViewType.Subject.valueOf().toUpperCase()}
                  </option>
                </Select>
              </div>

              <div>
                <table className="text-gray-400 dark:text-gray-600 text-sm">
                  <tbody>
                    <tr className="flex gap-2">
                      <td className="text-gray-500 font-bold">
                        {blutilsResult?.results.length}
                      </td>
                      <td>in</td>
                      <td className="text-gray-500 font-bold">
                        {groupedBy === ViewType.Query
                          ? paginatedResults.length
                          : groupedResults.length}
                      </td>
                      <td>
                        {groupedBy === ViewType.Query ? "pages" : "groups"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {groupedBy === ViewType.Query && (
              <div className="overflow-auto text-gray-900 dark:text-gray-100">
                {currentRecords && (
                  <TableView
                    records={currentRecords}
                    handleQuerySearch={setQuerySearch}
                    handleSubjectSearch={setSubjectSearch}
                  />
                )}
              </div>
            )}

            {groupedBy === ViewType.Subject &&
              groupedResults &&
              groupedResults.map((group, index) => (
                <GroupedView
                  key={index}
                  result={group}
                  handleQueryDetails={handleQueryDetails}
                  pageSize={pageSize}
                />
              ))}
          </>
        ) : (
          <ResultUpload resultSetter={setBlutilsResult} />
        )}
      </div>

      <ConsensusModal
        result={currentQuery}
        openModal={!!currentQuery}
        setOpenModal={() => handleQueryDetails(undefined)}
      />
    </div>
  );
}
