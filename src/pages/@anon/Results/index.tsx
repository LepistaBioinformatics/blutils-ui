import { useMemo, useState } from "react";
import { ResultUpload } from "./elements/ResultUpload";
import { Button, Select } from "flowbite-react";
import { ViewType } from "@/types/ViewType";
import { BlutilsResult, Result } from "@/types/BlutilsResult";
import { GroupedResults } from "@/types/PaginatedResults";
import { TableView } from "./elements/TableView";
import { GroupedView } from "./elements/GroupedView";

export function Results() {
  const [pageSize, setPageSize] = useState(10);
  const [groupedBy, setGroupedBy] = useState<ViewType>(ViewType.Query);
  const [blutilsResult, setBlutilsResult] = useState<BlutilsResult | null>(
    null
  );

  const groupedResults: GroupedResults[] = useMemo(() => {
    if (!blutilsResult) return [];
    const unidentifiedKey = "Unidentified";

    const grouped = blutilsResult.results.reduce((acc, item) => {
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
  }, [blutilsResult, groupedBy]);

  return (
    <div className="min-h-screen pb-32">
      <div>
        <div className="px-5 py-2 border-b-[0.5px] border-b-gray-200 dark:border-b-gray-700 flex gap-8 justify-between items-center">
          <div>
            <Button onClick={() => setBlutilsResult(null)}>Reset</Button>
          </div>

          <Select
            value={groupedBy}
            onChange={(e) => {
              setPageSize(10);
              setGroupedBy(e.target.value as ViewType);
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
      </div>

      <div className="mx-5">
        {blutilsResult ? (
          <>
            {groupedBy === ViewType.Query && groupedResults && (
              <TableView
                records={groupedResults}
                pageSize={pageSize}
                handlePageSize={setPageSize}
              />
            )}

            {groupedBy === ViewType.Subject && groupedResults && (
              <GroupedView results={groupedResults} pageSize={pageSize} />
            )}
          </>
        ) : (
          <ResultUpload resultSetter={setBlutilsResult} />
        )}
      </div>
    </div>
  );
}
