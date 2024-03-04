import { Fragment, useMemo, useState } from "react";
import { BlutilsResult } from "../../../types/BlutilsResult";
import { ResultUpload } from "./elements/ResultUpload";
import { Button, Pagination, Table, Tooltip } from "flowbite-react";
import { kebabToPlain } from "../../../functions/kebab-to-plain";
import { TaxonomyCell } from "./elements/TaxonomyCell";
import {
  kebabToSciname,
  kebabToScinameString,
} from "../../../functions/kebab-to-scientific-name";
import { SEQUENCIAL_COLORS } from "../../../constants/sequencial-colors";
import { FaPlus } from "react-icons/fa";

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
              <table className="text-gray-500 text-sm">
                <tbody>
                  <tr>
                    <td>Number of queries</td>
                    <td>{result?.results.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="overflow-auto text-gray-900 dark:text-white">
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
                    {currentRecords.map((res, index) => {
                      const occurrences =
                        res.taxon?.consensusBeans.reduce(
                          (acc, item) => acc + item.occurrences,
                          0
                        ) || 0;

                      const chunkSize = 5;
                      const largetThanFive =
                        res?.taxon?.consensusBeans &&
                        res?.taxon?.consensusBeans.length > chunkSize;

                      let showChildren = false;

                      return (
                        <Fragment key={index}>
                          <Table.Row className="bg-white border-t dark:border-t-gray-700 dark:bg-gray-800 hover:bg-gray-600 border-b-none">
                            <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white pt-4 pb-3">
                              {res.query}
                            </Table.Cell>
                            {res.taxon && (
                              <Fragment>
                                <Table.Cell className="whitespace-nowrap text-gray-900 dark:text-white py-1">
                                  {kebabToSciname(
                                    res.taxon.identifier,
                                    res.taxon.reachedRank
                                  )}
                                </Table.Cell>
                                <Table.Cell className="py-1">
                                  {kebabToPlain(res.taxon.reachedRank)}
                                </Table.Cell>
                                <Table.Cell className="py-1">
                                  {res.taxon.percIdentity.toFixed(1)}
                                </Table.Cell>
                                <Table.Cell className="py-1">
                                  {res.taxon.bitScore}
                                </Table.Cell>
                                <Table.Cell className="py-1">
                                  <div className="w-[150px] flex  whitespace-nowrap">
                                    {res.taxon.consensusBeans
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
                                              width:
                                                (item.occurrences /
                                                  occurrences) *
                                                  100 +
                                                "px",
                                              backgroundColor:
                                                SEQUENCIAL_COLORS.at(
                                                  index
                                                ) as string,
                                            }}
                                          >
                                            &nbsp;
                                          </div>
                                        </Tooltip>
                                      ))}
                                    {largetThanFive === true && (
                                      <FaPlus
                                        className="mt-1 ml-1"
                                        onClick={() =>
                                          (showChildren = !showChildren)
                                        }
                                      />
                                    )}
                                  </div>
                                </Table.Cell>
                              </Fragment>
                            )}
                          </Table.Row>
                          {res?.taxon?.taxonomy && (
                            <Table.Row className="bg-white dark:bg-gray-800 border-t-none">
                              <Table.Cell
                                colSpan={7}
                                className="whitespace-nowrap py-1 px-2"
                              >
                                <TaxonomyCell taxonomy={res?.taxon?.taxonomy} />
                              </Table.Cell>
                            </Table.Row>
                          )}
                          {showChildren &&
                            res?.taxon?.consensusBeans.map((item, index) => (
                              <Table.Row className="bg-white dark:border-gray-700 dark:bg-gray-800">
                                <Table.Cell colSpan={7}>
                                  {kebabToSciname(item.identifier, item.rank)}
                                </Table.Cell>
                              </Table.Row>
                            ))}
                        </Fragment>
                      );
                    })}
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
