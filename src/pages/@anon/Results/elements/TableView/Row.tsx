import { Table as FBTable, Tooltip } from "flowbite-react";
import { Fragment, useMemo, useState } from "react";
import { Result } from "@/types/BlutilsResult";
import { kebabToSciname } from "@/functions/kebab-to-scientific-name";
import { kebabToPlain } from "@/functions/kebab-to-plain";
import { TaxonomyCell } from "../TaxonomyCell";
import { MiniChart } from "@/components/MiniChart";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import { CopyToClipboard } from "@/components/CopyToClipBoard";

interface Props {
  record: Result;
  handleQueryDetails: (result: Result | undefined) => void;
}

export function Row({ record, handleQueryDetails }: Props) {
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

  const mostProbableTaxon = BeanSelectionRules.getMostProbableTaxon(
    taxon?.consensusBeans
  );

  const ConsensusTule = () => (
    <div
      className="min-w-[10px] max-w-min text-right text-gray-500"
      style={{
        color:
          mostProbableTaxon.rule === 1
            ? "green"
            : mostProbableTaxon.rule === 2
            ? "orange"
            : "",
      }}
    >
      <Tooltip
        content={BeanSelectionRules.getRuleDescription(mostProbableTaxon.rule)}
      >
        {mostProbableTaxon.rule !== 0 && mostProbableTaxon.rule}
      </Tooltip>
    </div>
  );

  return (
    <Fragment key={record.query + "-child"}>
      <FBTable.Row
        className="text-lg bg-white border-t dark:border-t-gray-700 dark:bg-gray-800 hover:dark:bg-gray-900 border-b-none group"
        onClick={() => setShowChildren(!showChildren)}
      >
        <FBTable.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-gray-100 pt-2 pb-1">
          <button
            className="group-hover:underline group-hover:text-blue-500 mr-3"
            onClick={() => handleQueryDetails(record)}
          >
            {record.query}
          </button>
          <CopyToClipboard text={record.query} />
        </FBTable.Cell>
        {!taxon ? (
          <FBTable.Cell
            colSpan={7}
            className="whitespace-nowrap text-gray-900 dark:text-gray-100 py-1"
          >
            No significant match
          </FBTable.Cell>
        ) : (
          <Fragment>
            <FBTable.Cell className="whitespace-nowrap flex flex-col align-top text-gray-900 dark:text-gray-100 py-1">
              {kebabToSciname(taxon.identifier, taxon.reachedRank)}
              {mostProbableTaxon.bean?.identifier !== taxon.identifier && (
                <span className="text-sm text-gray-300">
                  {mostProbableTaxon.bean &&
                    kebabToSciname(
                      mostProbableTaxon?.bean.identifier,
                      mostProbableTaxon?.bean.rank
                    )}
                </span>
              )}
            </FBTable.Cell>
            <FBTable.Cell className="py-1">
              <ConsensusTule />
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
    </Fragment>
  );
}
