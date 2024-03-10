import { Table as FBTable } from "flowbite-react";
import { SearchableHeadCell } from "../SearchableHeadCell";
import { PaginatedResults } from "@/types/PaginatedResults";
import { Row } from "./Row";

interface Props {
  records: PaginatedResults[];
  handleQuerySearch: (term: string) => void;
  handleSubjectSearch: (term: string) => void;
}

export function Table({
  records,
  handleQuerySearch,
  handleSubjectSearch,
}: Props) {
  return (
    <FBTable>
      <FBTable.Head className="h-16 text-lg/2">
        <SearchableHeadCell handleSearch={(term) => handleQuerySearch(term)}>
          Query
        </SearchableHeadCell>
        <SearchableHeadCell handleSearch={(term) => handleSubjectSearch(term)}>
          Proposed Taxon
        </SearchableHeadCell>
        <FBTable.HeadCell className="whitespace-nowrap">Rank</FBTable.HeadCell>
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
        {records
          .flatMap((res) => res.chunk)
          .map((record, index) => (
            <Row key={index} record={record} />
          ))}
      </FBTable.Body>
    </FBTable>
  );
}
