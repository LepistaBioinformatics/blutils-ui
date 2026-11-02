import { ReactNode } from "react";
import { CopyToClipboard } from "@/components/CopyToClipBoard";
import { CompositionBar } from "@/components/CompositionBar";
import { RuleTag } from "@/components/RuleBadge";
import { kebabToPlain } from "@/functions/kebab-to-plain";
import { kebabToSciname } from "@/functions/kebab-to-scientific-name";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import { Result } from "@/types/BlutilsResult";
import { Modal } from "flowbite-react";
import { translateRank } from "./TaxonomyCell";

interface Props {
  result: Result | undefined;
  openModal: boolean;
  setOpenModal: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {title}
      </h4>
      {children}
    </section>
  );
}

/** `d__bacteria;g__bacillus` → [["domain", "bacteria"], ["genus", "bacillus"]]. */
function lineageLevels(taxonomy: string | null): [string, string][] {
  if (!taxonomy) return [];
  return taxonomy
    .split(";")
    .filter((bit) => bit.trim())
    .map((bit) => {
      const at = bit.indexOf("__");
      return at === -1 ? ["", bit] : [translateRank(bit.slice(0, at)), bit.slice(at + 2)];
    });
}

const yesNo = (value: boolean) => (value ? "Yes" : "No");

/** Everything shown in the record's row, in full, plus the consensus beans. */
export function ConsensusModal({ result, openModal, setOpenModal }: Props) {
  if (!result) return null;

  const taxon = result.taxon;
  const mostProbable = BeanSelectionRules.getMostProbableTaxon(taxon?.consensusBeans);
  const rule = BeanSelectionRules.getRuleKind(taxon?.consensusBeans);
  const ruleInfo = BeanSelectionRules.RULE_INFO[rule];
  const beans = taxon?.consensusBeans ?? [];

  const details: [string, ReactNode][] = [];
  if (result.runId) details.push(["Run", result.runId]);
  if (taxon) {
    details.push(["Reached rank", kebabToPlain(taxon.reachedRank)]);
    if (taxon.maxAllowedRank) details.push(["Max allowed rank", kebabToPlain(taxon.maxAllowedRank)]);
    details.push(["Single match", yesNo(taxon.singleMatch)]);
    details.push(["Mutated", yesNo(taxon.mutated)]);
  }

  return (
    <Modal show={openModal} onClose={() => setOpenModal()} size="3xl" dismissible>
      <Modal.Header>
        <span className="group inline-flex items-center gap-2">
          {result.query}
          <CopyToClipboard text={result.query} />
        </span>
      </Modal.Header>
      <Modal.Body>
        <div className="flex flex-col gap-5 text-gray-900 dark:text-gray-100">
          {!taxon ? (
            <p className="text-gray-500 dark:text-gray-400">No significant match</p>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-[1fr_14rem]">
                <Section title="Proposed taxon">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-semibold">
                      {kebabToSciname(taxon.identifier, taxon.reachedRank)}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {kebabToPlain(taxon.reachedRank)}
                    </span>
                  </div>
                  {mostProbable.bean && mostProbable.bean.identifier !== taxon.identifier && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Most probable: {kebabToSciname(mostProbable.bean.identifier, mostProbable.bean.rank)}
                    </p>
                  )}
                </Section>
                <Section title="Composition">
                  <CompositionBar taxon={taxon} />
                </Section>
              </div>

              {taxon.taxonomy && (
                <Section title="Taxonomy">
                  <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-0.5 text-sm">
                    {lineageLevels(taxon.taxonomy).map(([rank, name], index) => (
                      <div key={index} className="contents">
                        <dt className="text-xs uppercase leading-5 tracking-wide text-gray-500 dark:text-gray-400">
                          {rank ? kebabToPlain(rank) : "—"}
                        </dt>
                        <dd>{kebabToPlain(name)}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              )}

              {details.length > 0 && (
                <Section title="Details">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                    {details.map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              )}

              <Section title="Rule">
                <div className="flex flex-wrap items-center gap-2">
                  <RuleTag rule={rule} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{ruleInfo.summary}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{ruleInfo.explanation}</p>
              </Section>
            </>
          )}

          {beans.length > 0 && (
            <Section title={`Consensus beans (${beans.length})`}>
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                {beans.map((item, index) => {
                  const sciName = kebabToSciname(item.identifier, item.rank);

                  return (
                    <div
                      key={index}
                      data-testid="bean-card"
                      className="py-3 text-gray-900 first:pt-1 dark:text-gray-100"
                    >
                      <div className="mb-3 flex justify-between text-xl">
                        <div className="group">
                          <span>
                            {sciName}
                            <CopyToClipboard
                              text={sciName.props.children}
                              className="mx-2 mb-1 text-gray-900 dark:text-white"
                            />
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {kebabToPlain(item.rank)}
                          </span>
                        </div>
                        <div>
                          <span className="mr-1 text-gray-600 dark:text-gray-400">x</span>
                          <span>{item.occurrences}</span>
                        </div>
                      </div>
                      <div className="max-h-[150px] overflow-auto">
                        <div className="group mr-2 text-sm text-gray-600 dark:text-gray-400">
                          Accessions
                          <CopyToClipboard
                            text={item.accessions.join(" ")}
                            className="mb-1 ml-3 text-lg text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="flex flex-wrap text-sm text-gray-600 dark:text-gray-400">
                          {item.accessions.map((acc, accIndex) => (
                            <div key={accIndex} className="mr-3">
                              {acc}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}
