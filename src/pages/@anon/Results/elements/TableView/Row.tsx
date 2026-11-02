import { Table as FBTable, Tooltip } from "flowbite-react";
import { Fragment, useMemo } from "react";
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

function ConsensusTule({ rule }: { rule: number }) {
  return (
    <div
      className="min-w-[10px] max-w-min text-right text-gray-600 dark:text-gray-400"
      style={{
        color: rule === 1 ? "green" : rule === 2 ? "orange" : "",
      }}
    >
      <Tooltip content={BeanSelectionRules.getRuleDescription(rule)}>
        {rule !== 0 && rule}
      </Tooltip>
    </div>
  );
}

export function Row({ record, handleQueryDetails }: Props) {
  const occurrences = useMemo(
    () =>
      record.taxon?.consensusBeans?.reduce(
        (acc, item) => acc + item.occurrences,
        0
      ) || 0,
    [record.taxon?.consensusBeans]
  );

  const taxon = record.taxon;

  const mostProbableTaxon = BeanSelectionRules.getMostProbableTaxon(
    taxon?.consensusBeans
  );

  return (
    <Fragment key={record.query + "-child"}>
      <FBTable.Row
        className="text-lg bg-white border-t dark:border-t-gray-700 dark:bg-gray-800 hover:dark:bg-gray-900 border-b-none group"
      >
        <FBTable.Cell className="whitespace-nowrap font-medium text-gray-900 dark:text-gray-100 pt-2 pb-1">
          <button
            className="group-hover:underline group-hover:text-brand-600 dark:group-hover:text-brand-400 mr-3"
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
              {mostProbableTaxon.bean &&
                mostProbableTaxon.bean.identifier !== taxon.identifier && (
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {kebabToSciname(
                      mostProbableTaxon.bean.identifier,
                      mostProbableTaxon.bean.rank
                    )}
                  </span>
                )}
            </FBTable.Cell>
            <FBTable.Cell className="py-1">
              <ConsensusTule rule={mostProbableTaxon.rule} />
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
