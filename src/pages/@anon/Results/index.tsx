import { MdCopyAll } from "react-icons/md";
import { Fragment, useMemo, useState } from "react";
import { BlutilsResult, Result } from "../../../types/BlutilsResult";
import { ResultUpload } from "./elements/ResultUpload";
import {
  Button,
  Modal,
  Pagination,
  Select,
  Table,
  Tooltip,
} from "flowbite-react";
import { kebabToPlain } from "../../../functions/kebab-to-plain";
import { TaxonomyCell } from "./elements/TaxonomyCell";
import {
  kebabToSciname,
  kebabToScinameString,
} from "../../../functions/kebab-to-scientific-name";
import { SEQUENCIAL_COLORS } from "../../../constants/sequencial-colors";
import { FaPlus } from "react-icons/fa6";
import SectionScroller from "./elements/SectionScroller";

const OCCURRENCES_MAX_SIZE = 200;

interface PaginatedResults {
  name: string;
  rank: string;
  taxonomy: string;
  groupedBy: ViewType;
  chunk: Result[];
}

enum ViewType {
  Query = "table",
  Subject = "grouped",
}

export function Results() {
  const groupedSectionHeight = 40;

  const [result, setResult] = useState<BlutilsResult | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [groupedBy, setGroupedBy] = useState<ViewType>(ViewType.Query);
  const [currentQuery, setCurrentQuery] = useState<Result | undefined>(
    undefined
  );

  const handleQueryDetails = (result: Result | undefined) => {
    setCurrentQuery(result);
  };

  const groupedResults: PaginatedResults[] = useMemo(() => {
    if (!result) return [];

    const grouped = result.results.reduce((acc, item) => {
      let key = undefined;
      if (groupedBy === ViewType.Query) {
        key = item.query;
      } else if (groupedBy === ViewType.Subject) {
        key = item.taxon?.identifier;
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
  }, [result, groupedBy]);

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
      return paginatedResults[currentPage];
    }

    return paginatedResults[paginatedResults.length - 1];
  }, [currentPage, paginatedResults]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  const chunkSize = 5;

  return (
    <div className="min-h-screen pb-32">
      <div className="m-8">
        {result ? (
          <>
            <div>
              <div className="my-5 flex gap-8 justify-between items-center">
                <div>
                  <Button onClick={() => setResult(null)}>Reset</Button>
                </div>

                <div
                  className={`-mt-1 ${
                    groupedBy !== ViewType.Query ? "hidden" : ""
                  }`}
                >
                  <Pagination
                    currentPage={currentPage}
                    totalPages={groupedResults.length}
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
                        {result?.results.length}
                      </td>
                      <td>in</td>
                      <td className="text-gray-500 font-bold">
                        {groupedResults.length}
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
                  <Table>
                    <Table.Head>
                      <Table.HeadCell className="whitespace-nowrap">
                        Query
                      </Table.HeadCell>
                      <Table.HeadCell className="whitespace-nowrap">
                        Proposed Taxon
                      </Table.HeadCell>
                      <Table.HeadCell className="whitespace-nowrap">
                        Rank
                      </Table.HeadCell>
                      <Table.HeadCell className="whitespace-nowrap">
                        Identity (%)
                      </Table.HeadCell>
                      <Table.HeadCell className="whitespace-nowrap">
                        BitScore
                      </Table.HeadCell>
                      <Table.HeadCell className="whitespace-nowrap">
                        Composition
                      </Table.HeadCell>
                    </Table.Head>
                    <Table.Body>
                      {currentRecords
                        .flatMap((res) => res.chunk)
                        .map((record, index) => (
                          <ResultRow key={index} record={record} />
                        ))}
                    </Table.Body>
                  </Table>
                )}
              </div>
            )}

            {groupedBy === ViewType.Subject &&
              groupedResults &&
              groupedResults.map((group, index) => (
                <SectionScroller
                  key={index}
                  sectionName={
                    <>
                      <div className="flex gap-8 items-baseline">
                        <div className="text-3xl">
                          {kebabToScinameString(group.name, group.rank)}
                        </div>
                        <div className="text-sm text-gray-500 uppercase mt-1">
                          {kebabToPlain(group.rank)}
                        </div>
                        <div className="text-lg text-gray-500">
                          x{group.chunk.reduce((acc, item) => acc + 1, 0)}
                        </div>
                      </div>
                      <div className="-ml-2">
                        <TaxonomyCell taxonomy={group.taxonomy} />
                      </div>
                    </>
                  }
                  rowHeight={groupedSectionHeight}
                  totalItems={group.chunk.length}
                  items={group.chunk.map((record, index) => {
                    let occurrences = record.taxon?.consensusBeans.reduce(
                      (acc, item) => acc + item.occurrences,
                      0
                    );

                    const taxon = record.taxon;

                    return (
                      <div
                        key={index}
                        className="flex justify-between items-center text-lg text-gray-100 dark:text-gray-100 bg-gray-800 dark:bg-gray-800 p-2 hover:bg-gray-700 dark:hover:bg-gray-700 group"
                        style={{ height: `${groupedSectionHeight}px` }}
                      >
                        <div className="whitespace-nowrap text-gray-900 dark:text-gray-100 py-1">
                          <button
                            className="group-hover:underline group-hover:text-blue-500 mr-3"
                            onClick={() => handleQueryDetails(record)}
                          >
                            {record.query}
                          </button>
                          <CopyToClipboard text={record.query} />
                        </div>
                        {taxon && (
                          <div className="flex justify-between align-middle items-center gap-12">
                            <div className="py-1">
                              {taxon.percIdentity.toFixed(1)}{" "}
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                            <div className="py-1">{taxon.bitScore}</div>
                            <div className="py-1">
                              <div className="w-[250px] h-full flex whitespace-nowrap">
                                {taxon.consensusBeans
                                  .slice(0, chunkSize)
                                  .map((item, index) => (
                                    <Tooltip
                                      key={index}
                                      content={`${kebabToScinameString(
                                        item.identifier,
                                        item.rank
                                      )} x${item.occurrences}`}
                                    >
                                      <div
                                        key={index}
                                        className={`border border-gray-300 dark:border-gray-700 rounded-md h-5`}
                                        style={{
                                          width:
                                            (item.occurrences /
                                              (occurrences as number)) *
                                              OCCURRENCES_MAX_SIZE +
                                            "px",
                                          backgroundColor: SEQUENCIAL_COLORS.at(
                                            index
                                          ) as string,
                                        }}
                                      >
                                        &nbsp;
                                      </div>
                                    </Tooltip>
                                  ))}
                                {taxon &&
                                  taxon?.consensusBeans.length > chunkSize && (
                                    <FaPlus className="ml-1" />
                                  )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  visibleItemsLength={10}
                  containerHeight={
                    group.chunk.length > pageSize
                      ? pageSize * groupedSectionHeight
                      : group.chunk.length === 1
                      ? 2 * groupedSectionHeight
                      : group.chunk.length * groupedSectionHeight
                  }
                />
              ))}
          </>
        ) : (
          <ResultUpload resultSetter={setResult} />
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

function ConsensusModal({
  result,
  openModal,
  setOpenModal,
}: {
  result: Result | undefined;
  openModal: boolean;
  setOpenModal: () => void;
}) {
  return !result ? null : (
    <Modal show={openModal} onClose={() => setOpenModal()}>
      <Modal.Header>{result.query}</Modal.Header>
      <Modal.Body>
        <div className="m-1">
          {result?.taxon?.consensusBeans.map((item, index) => (
            <div
              key={index}
              className="p-4 border-t border-gray-500 shadow bg-gray-100 dark:bg-gray-800 text-gray-100"
            >
              <div>
                <span className="text-lg">
                  {kebabToSciname(item.identifier, item.rank)}
                </span>
                <span className="text-sm ml-3 text-gray-500">
                  {kebabToPlain(item.rank)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 mr-2">Occurrences:</span>
                {item.occurrences}
              </div>
              <div className="flex max-h-[150px] overflow-auto">
                <span className="text-gray-500 mr-2">Accessions:</span>
                <div className="flex flex-wrap">
                  {item.accessions.map((acc, index) => (
                    <div key={index} className="mr-3">
                      {acc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  );
}

function ResultRow({ record }: { record: Result }) {
  const chunkSize = 5;

  const occurrences = useMemo(
    () =>
      record.taxon?.consensusBeans.reduce(
        (acc, item) => acc + item.occurrences,
        0
      ) || 0,
    [record.taxon?.consensusBeans]
  );

  const [showChildren, setShowChildren] = useState(false);

  return (
    <Fragment key={record.query + "-child"}>
      <Table.Row
        className="text-lg bg-white border-t dark:border-t-gray-700 dark:bg-gray-800 hover:border hover:border-gray-500 border-b-none"
        onClick={() => setShowChildren(!showChildren)}
      >
        <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-gray-100 pt-4 pb-3">
          {record.query}
        </Table.Cell>
        {record.taxon && (
          <Fragment>
            <Table.Cell className="whitespace-nowrap text-gray-900 dark:text-gray-100 py-1">
              {kebabToSciname(
                record.taxon.identifier,
                record.taxon.reachedRank
              )}
            </Table.Cell>
            <Table.Cell className="py-1">
              {kebabToPlain(record.taxon.reachedRank)}
            </Table.Cell>
            <Table.Cell className="py-1">
              {record.taxon.percIdentity.toFixed(1)}
            </Table.Cell>
            <Table.Cell className="py-1">{record.taxon.bitScore}</Table.Cell>
            <Table.Cell className="py-1">
              <div className="w-[150px] h-full flex whitespace-nowrap">
                {record.taxon.consensusBeans
                  .slice(0, chunkSize)
                  .map((item, index) => (
                    <Tooltip
                      key={index}
                      content={`${kebabToScinameString(
                        item.identifier,
                        item.rank
                      )} x${item.occurrences}`}
                    >
                      <div
                        key={index}
                        className={`border border-gray-300 dark:border-gray-700 rounded-md h-5`}
                        style={{
                          width:
                            (item.occurrences / occurrences) *
                              OCCURRENCES_MAX_SIZE +
                            "px",
                          backgroundColor: SEQUENCIAL_COLORS.at(
                            index
                          ) as string,
                        }}
                      >
                        &nbsp;
                      </div>
                    </Tooltip>
                  ))}
                {record?.taxon &&
                  record?.taxon?.consensusBeans.length > chunkSize && (
                    <FaPlus className="ml-1" />
                  )}
              </div>
            </Table.Cell>
          </Fragment>
        )}
      </Table.Row>

      {record?.taxon?.taxonomy && (
        <Table.Row className="bg-white dark:bg-gray-800 border-t-none">
          <Table.Cell colSpan={7} className="whitespace-nowrap py-1 px-2">
            <TaxonomyCell taxonomy={record?.taxon?.taxonomy} />
          </Table.Cell>
        </Table.Row>
      )}

      {showChildren && (
        <Table.Row className="bg-white dark:border-gray-700 dark:bg-gray-700">
          <Table.Cell colSpan={8}>
            <div className="mx-1 my-2">
              {record?.taxon?.consensusBeans.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border-t border-gray-500 shadow bg-gray-100 dark:bg-gray-800 text-gray-100"
                >
                  <div>
                    <span className="text-lg">
                      {kebabToSciname(item.identifier, item.rank)}
                    </span>
                    <span className="text-sm ml-3 text-gray-500">
                      {kebabToPlain(item.rank)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 mr-2">Occurrences:</span>
                    {item.occurrences}
                  </div>
                  <div className="flex">
                    <span className="text-gray-500 mr-2">Accessions:</span>
                    <div className="flex flex-wrap">
                      {item.accessions.map((acc, index) => (
                        <div key={index} className="mr-3">
                          {acc}
                        </div>
                      ))}
                    </div>
                  </div>
                  <TaxonomyCell
                    taxonomy={item.taxonomy}
                    className="-ml-2 mt-2"
                  />
                </div>
              ))}
            </div>
          </Table.Cell>
        </Table.Row>
      )}
    </Fragment>
  );
}

function CopyToClipboard({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <MdCopyAll
      className={
        "inline invisible group-hover:visible hover:cursor-pointer " + className
      }
      onClick={() => navigator.clipboard.writeText(text)}
    />
  );
}
