import { useState } from "react";
import { Modal } from "flowbite-react";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";

type RuleKind = BeanSelectionRules.RuleKind;

const COLOR: Record<RuleKind, string> = {
  unanimous: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  majority: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ambiguous: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  unresolved: "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

interface Props {
  rule: RuleKind;
}

/** The rule word as a static tag (no modal), e.g. inside another dialog. */
export function RuleTag({ rule }: Props) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${COLOR[rule]}`}>
      {BeanSelectionRules.RULE_INFO[rule].label}
    </span>
  );
}

/** The rule as a word; clicking it explains every rule in a modal. */
export function RuleBadge({ rule }: Props) {
  const [open, setOpen] = useState(false);
  const info = BeanSelectionRules.RULE_INFO[rule];

  return (
    <>
      <button
        type="button"
        title={info.summary}
        aria-label={`Rule: ${info.label}. Show how rules work`}
        onClick={() => setOpen(true)}
        className={`rounded-full px-2.5 py-0.5 text-sm font-medium hover:underline ${COLOR[rule]}`}
      >
        {info.label}
      </button>
      {open && <RulesModal current={rule} onClose={() => setOpen(false)} />}
    </>
  );
}

function RulesModal({ current, onClose }: { current: RuleKind; onClose: () => void }) {
  return (
    <Modal show onClose={onClose} size="lg" dismissible>
      <Modal.Header>How the proposed taxon is chosen</Modal.Header>
      <Modal.Body>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Each record keeps the consensus beans (candidate taxa and how many reference hits
          support each). The rule tells how the most probable taxon was picked among them.
        </p>
        <ul className="flex flex-col gap-3">
          {BeanSelectionRules.RULE_KINDS.map((kind) => {
            const info = BeanSelectionRules.RULE_INFO[kind];
            const active = kind === current;
            return (
              <li
                key={kind}
                aria-current={active ? "true" : undefined}
                className={`rounded-lg border p-3 ${
                  active
                    ? "border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-700/40"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${COLOR[kind]}`}>
                    {info.label}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{info.summary}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{info.explanation}</p>
              </li>
            );
          })}
        </ul>
      </Modal.Body>
    </Modal>
  );
}
