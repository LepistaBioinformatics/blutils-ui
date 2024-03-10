import { Table as FBTable } from "flowbite-react";
import { Fragment, useMemo, useState } from "react";
import { Result } from "@/types/BlutilsResult";
import { kebabToSciname } from "@/functions/kebab-to-scientific-name";
import { kebabToPlain } from "@/functions/kebab-to-plain";
import { TaxonomyCell } from "../TaxonomyCell";
import { MiniChart } from "@/components/MiniChart";

export function Row({ record }: { record: Result }) {
  const occurrences = useMemo(
    () =>
      record.taxon?.consensusBeans.reduce(
        (acc, item) => acc + item.occurrences,
        0
      ) || 0,
    [record.taxon?.consensusBeans]
  );

  const [showChildren, setShowChildren] = useState(false);
  const taxon = record.taxon;

  return (
    <Fragment key={record.query + "-child"}>
      <FBTable.Row
        className="text-lg bg-white border-t dark:border-t-gray-700 dark:bg-gray-800 hover:border hover:border-gray-500 border-b-none"
        onClick={() => setShowChildren(!showChildren)}
      >
        <FBTable.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-gray-100 pt-2 pb-1">
          {record.query}
        </FBTable.Cell>
        {!taxon ? (
          <FBTable.Cell
            colSpan={5}
            className="whitespace-nowrap text-gray-900 dark:text-gray-100 py-1"
          >
            No significant match
          </FBTable.Cell>
        ) : (
          <Fragment>
            <FBTable.Cell className="whitespace-nowrap text-gray-900 dark:text-gray-100 py-1">
              {kebabToSciname(taxon.identifier, taxon.reachedRank)}
            </FBTable.Cell>
            <FBTable.Cell className="py-1">
              {kebabToPlain(taxon.reachedRank)}
            </FBTable.Cell>
            <FBTable.Cell className="py-1">
              {taxon.percIdentity.toFixed(1)}
            </FBTable.Cell>
            <FBTable.Cell className="py-1">{taxon.bitScore}</FBTable.Cell>
            <FBTable.Cell className="py-1">
              <MiniChart taxon={taxon} occurrences={occurrences} />
            </FBTable.Cell>
          </Fragment>
        )}
      </FBTable.Row>

      {taxon?.taxonomy && (
        <FBTable.Row className="bg-white dark:bg-gray-800 border-t-none">
          <FBTable.Cell colSpan={7} className="whitespace-nowrap py-1 px-2">
            <TaxonomyCell taxonomy={taxon?.taxonomy} />
          </FBTable.Cell>
        </FBTable.Row>
      )}

      {showChildren && (
        <FBTable.Row className="bg-white dark:border-gray-700 dark:bg-gray-700">
          <FBTable.Cell colSpan={8}>
            <div className="mx-1 my-2">
              {taxon?.consensusBeans.map((item, index) => (
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
          </FBTable.Cell>
        </FBTable.Row>
      )}
    </Fragment>
  );
}
