import { SubjectSummary, Weighting } from "@/functions/chart-data";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import { formatValue, percent, useChartTooltip } from "./ChartTooltip";

interface Props {
  rows: SubjectSummary[];
  weighting: Weighting;
}

const RULE_COLOR: Record<BeanSelectionRules.RuleKind, string> = {
  unanimous: "var(--rule-unanimous)",
  majority: "var(--rule-majority)",
  ambiguous: "var(--rule-ambiguous)",
  unresolved: "var(--rule-unresolved)",
};

/** Quality overview per subject: size, matched share, mean identity, rule mix. */
export function SubjectSummaryTable({ rows, weighting }: Props) {
  const { containerRef, bind, node } = useChartTooltip();
  return (
    <div ref={containerRef} className="relative overflow-x-auto">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400" aria-label="Legend">
        {BeanSelectionRules.RULE_KINDS.map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: RULE_COLOR[kind] }} />
            {BeanSelectionRules.RULE_INFO[kind].label}
          </span>
        ))}
      </div>
      <table className="w-full text-sm" aria-label="Summary per subject">
        <thead className="text-left text-xs uppercase tracking-wide text-gray-400">
          <tr>
            <th className="py-1 pr-4 font-semibold">Subject</th>
            <th className="py-1 pr-4 text-right font-semibold">Records</th>
            <th className="py-1 pr-4 text-right font-semibold">Reads</th>
            <th className="py-1 pr-4 text-right font-semibold">Matched</th>
            <th className="py-1 pr-4 text-right font-semibold">Mean identity</th>
            <th className="w-1/3 py-1 font-semibold">Rule mix ({weighting})</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200/70 dark:divide-gray-700/60">
          {rows.map((row) => {
            const total = BeanSelectionRules.RULE_KINDS.reduce((acc, kind) => acc + row.rules[kind], 0) || 1;
            return (
              <tr key={row.subject} className="text-gray-800 dark:text-gray-200">
                <th scope="row" className="py-1.5 pr-4 text-left font-medium">{row.subject}</th>
                <td className="py-1.5 pr-4 text-right tabular-nums">{row.records.toLocaleString()}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{row.reads.toLocaleString()}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{percent(row.matched)}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">
                  {Number.isNaN(row.meanIdentity) ? "—" : `${row.meanIdentity.toFixed(1)}%`}
                </td>
                <td className="py-1.5">
                  <span className="flex h-3.5 gap-0.5 overflow-hidden rounded">
                    {BeanSelectionRules.RULE_KINDS.filter((kind) => row.rules[kind] > 0).map((kind) => (
                      <span
                        key={kind}
                        tabIndex={0}
                        aria-label={`${BeanSelectionRules.RULE_INFO[kind].label}: ${percent(row.rules[kind] / total)}`}
                        className="h-full outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                        style={{ width: `${(row.rules[kind] / total) * 100}%`, background: RULE_COLOR[kind] }}
                        {...bind(
                          <>
                            <div className="font-semibold">{BeanSelectionRules.RULE_INFO[kind].label}</div>
                            <div>
                              {formatValue(row.rules[kind], weighting)} · {percent(row.rules[kind] / total)}
                            </div>
                          </>
                        )}
                      />
                    ))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {node}
    </div>
  );
}
