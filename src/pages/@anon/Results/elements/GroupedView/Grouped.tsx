import { GroupedResults } from "@/types/PaginatedResults";
import SectionScroller from "./SectionScroller";
import { kebabToScinameString } from "@/functions/kebab-to-scientific-name";
import { kebabToPlain } from "@/functions/kebab-to-plain";
import { TaxonomyCell } from "../TaxonomyCell";
import { CopyToClipboard } from "@/components/CopyToClipBoard";
import { MiniChart } from "@/components/MiniChart";
import { Result } from "@/types/BlutilsResult";
import { ConsensusModal } from "./ConsensusModal";
import { useState } from "react";

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
    <div>
      {results &&
        results.map((result, index) => (
          <SectionScroller
            key={index}
            sectionName={
              <div className="mt-16 mb-8">
                <div className="flex gap-8 items-baseline">
                  <div className="text-3xl">
                    {kebabToScinameString(result.name, result.rank)}
                  </div>
                  <div className="text-sm text-gray-500 uppercase mt-1">
                    {kebabToPlain(result.rank)}
                  </div>
                  <div className="text-lg text-gray-500">
                    x{result.chunk.reduce((acc) => acc + 1, 0)}
                  </div>
                </div>
                <div className="-ml-2 mt-3">
                  <TaxonomyCell taxonomy={result.taxonomy} />
                </div>
              </div>
            }
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
            visibleItemsLength={10}
            containerHeight={
              result.chunk.length > pageSize
                ? pageSize * groupedSectionHeight
                : result.chunk.length === 1
                ? 2 * groupedSectionHeight
                : result.chunk.length * groupedSectionHeight
            }
          />
        ))}

      <ConsensusModal
        result={currentQuery}
        openModal={!!currentQuery}
        setOpenModal={() => handleQueryDetails(undefined)}
      />
    </div>
  );
}
