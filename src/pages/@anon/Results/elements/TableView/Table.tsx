import { Table as FBTable, Pagination, Dropdown } from "flowbite-react";
import { SearchableHeadCell } from "./SearchableHeadCell";
import { ResultsGroupedByTaxonomy } from "@/types/GroupedResults";
import { Row } from "./Row";
import { useMemo, useState } from "react";
import { ResultsPaginationStats } from "@/components/ResultsPaginationStats";
import { ViewType } from "@/types/ViewType";
import { kebabToPlain } from "@/functions/kebab-to-plain";
import { Result } from "@/types/BlutilsResult";
import { ConsensusModal } from "../ConsensusModal";

interface Props {
  records: ResultsGroupedByTaxonomy[];
  pageSize: number;
  handlePageSize: (size: number) => void;
}

enum NoMatchedAction {
  SHOW_ALSO = "show-also",
  SHOW_ONLY = "show-only",
  OMIT = "omit",
}

export function Table({ records, pageSize, handlePageSize }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [querySearch, setQuerySearch] = useState<string | undefined>(undefined);
  const [subjectSearch, setSubjectSearch] = useState<string | undefined>(
    undefined
  );

  const [noMatchedSearch, setNoMatchedSearch] = useState<NoMatchedAction>(
    NoMatchedAction.SHOW_ALSO
  );

  const [currentQuery, setCurrentQuery] = useState<Result | undefined>(
    undefined
  );

  const handleQueryDetails = (result: Result | undefined) => {
    setCurrentQuery(result);
  };

  function chunk<T>(values: T[], size: number): T[][] {
    return Array.from(new Array(Math.ceil(values.length / size)), (_, i) =>
      values.slice(i * size, i * size + size)
    );
  }

  const filteredRecords = useMemo(() => {
    return records
      .map((res) => ({
        ...res,
        chunk: res.chunk.filter((record) => {
          let queryMatch = false;

          if (noMatchedSearch === NoMatchedAction.SHOW_ONLY) {
            if (record.taxon) return false;
          }

          if (noMatchedSearch === NoMatchedAction.OMIT) {
            if (!record.taxon) return false;
          }

          if (querySearch === undefined && subjectSearch === undefined) {
            return true;
          }

          if (querySearch && subjectSearch) {
            return (
              record.query.toLowerCase().includes(querySearch.toLowerCase()) &&
              record.taxon?.identifier
                .toLowerCase()
                .includes(subjectSearch.toLowerCase())
            );
          }

          if (
            querySearch &&
            record.query.toLowerCase().includes(querySearch.toLowerCase())
          ) {
            queryMatch = true;
          }

          if (
            subjectSearch &&
            record.taxon?.identifier
              .toLowerCase()
              .includes(subjectSearch.toLowerCase())
          ) {
            queryMatch = true;
          }

          return queryMatch;
        }),
      }))
      .filter((res) => res.chunk.length > 0);
  }, [records, noMatchedSearch, querySearch, subjectSearch]);

  const paginatedResults: ResultsGroupedByTaxonomy[][] = useMemo(() => {
    return chunk(filteredRecords, pageSize);
  }, [filteredRecords, pageSize]);

  const currentRecords: ResultsGroupedByTaxonomy[] | undefined = useMemo(() => {
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
    <div>
      <div className="flex flex-wrap justify-center items-baseline gap-8 mb-3 mx-3">
        <ResultsPaginationStats
          total={filteredRecords.length}
          groups={paginatedResults.length}
          groupedBy={ViewType.Table}
        />
        <Dropdown
          color="gray"
          label={"Unmatched > " + noMatchedSearch.toUpperCase()}
        >
          {[
            NoMatchedAction.SHOW_ALSO,
            NoMatchedAction.SHOW_ONLY,
            NoMatchedAction.OMIT,
          ].map((action) => (
            <Dropdown.Item
              key={action}
              onClick={() => setNoMatchedSearch(action)}
            >
              {kebabToPlain(action.valueOf())}
            </Dropdown.Item>
          ))}
        </Dropdown>
        <Dropdown color="gray" label={"Page Size > " + pageSize}>
          {[10, 15, 25, 50, 100].map((size) => (
            <Dropdown.Item key={size} onClick={() => handlePageSize(size)}>
              {size}
            </Dropdown.Item>
          ))}
        </Dropdown>
        <Pagination
          currentPage={currentPage}
          totalPages={paginatedResults.length}
          onPageChange={onPageChange}
        />
      </div>
      <div className="overflow-auto text-gray-900 dark:text-gray-100">
        <FBTable>
          <FBTable.Head className="h-16 text-lg/2">
            <SearchableHeadCell handleSearch={(term) => setQuerySearch(term)}>
              Query
            </SearchableHeadCell>
            <SearchableHeadCell handleSearch={(term) => setSubjectSearch(term)}>
              Proposed Taxon
            </SearchableHeadCell>
            <FBTable.HeadCell className="whitespace-nowrap">
              Rule
            </FBTable.HeadCell>
            <FBTable.HeadCell className="whitespace-nowrap">
              Rank
            </FBTable.HeadCell>
            <FBTable.HeadCell className="whitespace-nowrap">
              Identity (%)
            </FBTable.HeadCell>
            <FBTable.HeadCell className="whitespace-nowrap">
              BitScore
            </FBTable.HeadCell>
            <FBTable.HeadCell className="whitespace-nowrap">
              Composition
            </FBTable.HeadCell>
          </FBTable.Head>
          <FBTable.Body>
            {currentRecords &&
              currentRecords
                .flatMap((res) => res.chunk)
                .map((record, index) => (
                  <Row
                    key={index}
                    record={record}
                    handleQueryDetails={handleQueryDetails}
                  />
                ))}
          </FBTable.Body>
        </FBTable>
      </div>

      <ConsensusModal
        result={currentQuery}
        openModal={!!currentQuery}
        setOpenModal={() => handleQueryDetails(undefined)}
      />
    </div>
  );
}
