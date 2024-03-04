import { Fragment, useMemo, useState } from "react";
import { BlutilsResult } from "../../../types/BlutilsResult";
import { ResultUpload } from "./elements/ResultUpload";
import { Button, Pagination, Table, Tooltip } from "flowbite-react";
import { kebabToPlain } from "../../../functions/kebab-to-plain";
import { TaxonomyCell } from "./elements/TaxonomyCell";
import { kebabToSciname } from "../../../functions/kebab-to-scientific-name";
import { SEQUENCIAL_COLORS } from "../../../constants/sequencial-colors";

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
    <div className="m-6 max-w-screen  min-h-screen">
      <div className="">
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
                <Table hoverable>
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
                    <Table.HeadCell className="whitespace-nowrap">
                      Taxonomy
                    </Table.HeadCell>
                  </Table.Head>
                  <Table.Body className="divide-y">
                    {currentRecords.map((res, index) => {
                      const occurrences =
                        res.taxon?.consensusBeans.reduce(
                          (acc, item) => acc + item.occurrences,
                          0
                        ) || 0;

                      return (
                        <Table.Row
                          key={index}
                          className="bg-white dark:border-gray-700 dark:bg-gray-800"
                        >
                          <Table.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                            {res.query}
                          </Table.Cell>
                          {res.taxon && (
                            <Fragment>
                              <Table.Cell className="whitespace-nowrap text-gray-900 dark:text-white">
                                {kebabToSciname(
                                  res.taxon.identifier,
                                  res.taxon.reachedRank
                                )}
                              </Table.Cell>
                              <Table.Cell>
                                {kebabToPlain(res.taxon.reachedRank)}
                              </Table.Cell>
                              <Table.Cell>
                                {res.taxon.percIdentity.toFixed(1)}
                              </Table.Cell>
                              <Table.Cell>{res.taxon.bitScore}</Table.Cell>
                              <Table.Cell>
                                <div className="w-[150px] flex">
                                  {res.taxon.consensusBeans.map(
                                    (item, index) => (
                                      <Tooltip
                                        content={kebabToSciname(
                                          item.identifier,
                                          item.rank
                                        )}
                                      >
                                        <div
                                          key={index}
                                          className="text-xs border border-gray-300 dark:border-gray-700 h-4"
                                          style={{
                                            width:
                                              (item.occurrences / occurrences) *
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
                                    )
                                  )}
                                </div>
                              </Table.Cell>
                              <Table.Cell className="whitespace-nowrap">
                                <TaxonomyCell taxonomy={res.taxon.taxonomy} />
                              </Table.Cell>
                            </Fragment>
                          )}
                        </Table.Row>
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
