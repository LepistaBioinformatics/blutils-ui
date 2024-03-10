import { GroupedResults } from "@/types/PaginatedResults";
import SectionScroller from "./SectionScroller";
import { CopyToClipboard } from "@/components/CopyToClipBoard";
import { MiniChart } from "@/components/MiniChart";
import { Result } from "@/types/BlutilsResult";
import { ConsensusModal } from "./ConsensusModal";
import { useState } from "react";
import { kebabToScinameString } from "@/functions/kebab-to-scientific-name";

interface Props {
  results: GroupedResults[];
  pageSize: number;
}

export function Grouped({ results, pageSize }: Props) {
  const groupedSectionHeight = 40;

  const [currentQuery, setCurrentQuery] = useState<Result | undefined>(
    undefined
  );

  const handleQueryDetails = (result: Result | undefined) => {
    setCurrentQuery(result);
  };

  return (
    <>
      <div className="flex mb-32">
        <aside className="sticky py-8 flex flex-col gap-3 top-0 max-h-[90vh] overflow-auto text-gray-900 dark:text-gray-100">
          {results.map((result, index) => (
            <a
              key={index}
              href={`#${result.name}`}
              title={result.name}
              className="text-left hover:cursor-pointer hover:rounded-lg border border-transparent hover:border-gray-300 hover:transition-all hover:bg-gray-800 dark:hover:bg-gray-800 p-2 mx-3 flex justify-between items-center gap-5"
            >
              <div>{kebabToScinameString(result.name, result.rank)}</div>
              <div>
                <span className="text-gray-500 text-sm mr-2">x</span>
                {result.chunk.length}
              </div>
            </a>
          ))}
        </aside>

        <div className="w-full">
          {results &&
            results.map((result, index) => (
              <SectionScroller
                key={index}
                name={result.name}
                rank={result.rank}
                taxonomy={result.taxonomy}
                rowHeight={groupedSectionHeight}
                totalItems={result.chunk.length}
                items={result.chunk.map((record, index) => {
                  const occurrences = record.taxon?.consensusBeans.reduce(
                    (acc, item) => acc + item.occurrences,
                    0
                  );

                  const taxon = record.taxon;

                  return (
                    <div
                      key={index}
                      className="flex justify-between items-center text-lg text-gray-100 dark:text-gray-100 bg-gray-800 dark:bg-gray-800 p-2 hover:bg-gray-700 dark:hover:bg-gray-700 border-b-[0.5px] border-gray-300 dark:border-gray-700 group"
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
                            <MiniChart
                              taxon={taxon}
                              occurrences={occurrences as number}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                visibleItemsLength={pageSize}
                containerHeight={
                  result.chunk.length > pageSize
                    ? pageSize * groupedSectionHeight
                    : result.chunk.length === 1
                    ? 2 * groupedSectionHeight
                    : result.chunk.length * groupedSectionHeight
                }
              />
            ))}
        </div>
      </div>

      <ConsensusModal
        result={currentQuery}
        openModal={!!currentQuery}
        setOpenModal={() => handleQueryDetails(undefined)}
      />
    </>
  );
}
