import { Fragment, useMemo, useState } from "react";
import { BlutilsResult, Result } from "../../../types/BlutilsResult";
import { ResultUpload } from "./elements/ResultUpload";
import { Button, Pagination, Table, Tooltip } from "flowbite-react";
import { kebabToPlain } from "../../../functions/kebab-to-plain";
import { TaxonomyCell } from "./elements/TaxonomyCell";
import {
  kebabToSciname,
  kebabToScinameString,
} from "../../../functions/kebab-to-scientific-name";
import { SEQUENCIAL_COLORS } from "../../../constants/sequencial-colors";
import { FaPlus } from "react-icons/fa6";

export function Results() {
  const [result, setResult] = useState<BlutilsResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const paginateResults = useMemo(() => {
    if (result) {
      const results = result.results;
      const pages = [];

      for (let i = 0; i < results.length; i += pageSize) {
        pages.push(results.slice(i, i + pageSize));
      }

      return pages;
    }

    return [];
  }, [result, pageSize]);

  const currentRecords = useMemo(() => {
    return paginateResults[currentPage - 1];
  }, [currentPage, paginateResults]);

  const onPageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="max-w-screen min-h-screen">
      <div className="m-6 ">
        {currentRecords ? (
          <>
            <div className="my-5 flex gap-8 justify-between">
              <div>
                <Button onClick={() => setResult(null)}>Reset</Button>
              </div>

              <div className="-mt-2">
                <Pagination
                  currentPage={currentPage}
                  totalPages={paginateResults.length}
                  onPageChange={onPageChange}
                />
              </div>
            </div>

            <div>
              <table className="text-gray-400 dark:text-gray-600 text-sm">
                <tbody>
                  <tr className="flex gap-2">
                    <td>Number of queries</td>
                    <td className="text-gray-500 font-bold">
                      {result?.results.length}
                    </td>
                    <td>from</td>
                    <td className="text-gray-500 font-bold">
                      {paginateResults.length}
                    </td>
                    <td>pages</td>
                  </tr>
                </tbody>
              </table>
            </div>

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
                  <Table.Body className="">
                    {currentRecords.map((res, index) => (
                      <TableRow key={index} record={res} />
                    ))}
                  </Table.Body>
                </Table>
              )}
            </div>
          </>
        ) : (
          <ResultUpload resultSetter={setResult} />
        )}
      </div>
    </div>
  );
}

function TableRow({ record }: { record: Result }) {
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
    <Fragment>
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
                      content={`${kebabToScinameString(
                        item.identifier,
                        item.rank
                      )} x${item.occurrences}`}
                    >
                      <div
                        key={index}
                        className={`border border-gray-300 dark:border-gray-700 rounded-md h-5`}
                        style={{
                          width: (item.occurrences / occurrences) * 100 + "px",
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
            <div className="mx-3 my-2">
              {record?.taxon?.consensusBeans.map((item, index) => (
                <div
                  key={index}
                  className="my-5 p-4 border border-gray-500 rounded-lg shadow bg-gray-100 dark:bg-gray-800 text-gray-100"
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
                    <div className="flex">
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
