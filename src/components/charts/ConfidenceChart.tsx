import { GroupConfidence, Weighting } from "@/functions/chart-data";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import { formatValue, percent, useChartTooltip } from "./ChartTooltip";

interface Props {
  groups: GroupConfidence[];
  weighting: Weighting;
  label: (name: string) => string;
}

const RULE_COLOR: Record<BeanSelectionRules.RuleKind, string> = {
  unanimous: "var(--rule-unanimous)",
  majority: "var(--rule-majority)",
  ambiguous: "var(--rule-ambiguous)",
  unresolved: "var(--rule-unresolved)",
};

/** Per group: identity spread (min–max line, quartile box, median) and the rule mix. */
export function ConfidenceChart({ groups, weighting, label }: Props) {
  const { containerRef, bind, node } = useChartTooltip();
  const finite = groups.filter((g) => g.identity.n > 0);
  const lo = Math.floor(Math.min(...finite.map((g) => g.identity.min), 100) / 5) * 5;
  const hi = 100;
  const x = (value: number) => `${((value - lo) / (hi - lo || 1)) * 100}%`;

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400" aria-label="Legend">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-6 rounded-sm bg-gray-400 dark:bg-gray-500" /> Identity (quartiles, median, min–max)
        </span>
        {BeanSelectionRules.RULE_KINDS.map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: RULE_COLOR[kind] }} />
            {BeanSelectionRules.RULE_INFO[kind].label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-[12rem_1fr_10rem] items-center gap-x-4 gap-y-1.5 text-sm" role="table" aria-label="Confidence per group">
        <div role="row" className="contents text-xs uppercase tracking-wide text-gray-400">
          <span role="columnheader">Group</span>
          <span role="columnheader" className="flex justify-between">
            <span>{lo}%</span>
            <span>identity</span>
            <span>{hi}%</span>
          </span>
          <span role="columnheader">Rule mix</span>
        </div>
        {groups.map((group) => {
          const id = group.identity;
          const total = group.weight || 1;
          return (
            <div role="row" key={group.name} className="contents">
              <span role="cell" className="truncate text-gray-700 dark:text-gray-300" title={label(group.name)}>
                {label(group.name)}
              </span>
              <span
                role="cell"
                tabIndex={0}
                aria-label={id.n ? `${label(group.name)} identity: median ${id.median.toFixed(1)}%, quartiles ${id.q1.toFixed(1)}–${id.q3.toFixed(1)}%, range ${id.min.toFixed(1)}–${id.max.toFixed(1)}%` : `${label(group.name)}: no matched records`}
                className="relative h-4 outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                {...bind(
                  id.n ? (
                    <>
                      <div className="font-semibold">{label(group.name)}</div>
                      <div>Median {id.median.toFixed(1)}% · IQR {id.q1.toFixed(1)}–{id.q3.toFixed(1)}%</div>
                      <div>Range {id.min.toFixed(1)}–{id.max.toFixed(1)}% · n={id.n}</div>
                    </>
                  ) : (
                    "No matched records"
                  )
                )}
              >
                {id.n > 0 && (
                  <>
                    <span className="absolute top-1/2 h-px -translate-y-1/2 bg-gray-400" style={{ left: x(id.min), width: `calc(${x(id.max)} - ${x(id.min)})` }} />
                    <span className="absolute inset-y-0.5 rounded-sm bg-gray-300 dark:bg-gray-600" style={{ left: x(id.q1), width: `max(2px, calc(${x(id.q3)} - ${x(id.q1)}))` }} />
                    <span data-testid="identity-median" className="absolute inset-y-0 w-0.5 bg-gray-900 dark:bg-gray-100" style={{ left: x(id.median) }} />
                  </>
                )}
              </span>
              <span role="cell" className="flex h-3.5 gap-0.5 overflow-hidden rounded">
                {BeanSelectionRules.RULE_KINDS.filter((kind) => group.rules[kind] > 0).map((kind) => (
                  <span
                    key={kind}
                    data-testid="rule-segment"
                    tabIndex={0}
                    aria-label={`${BeanSelectionRules.RULE_INFO[kind].label}: ${formatValue(group.rules[kind], weighting)}, ${percent(group.rules[kind] / total)}`}
                    className="h-full outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                    style={{ width: `${(group.rules[kind] / total) * 100}%`, background: RULE_COLOR[kind] }}
                    {...bind(
                      <>
                        <div className="font-semibold">{BeanSelectionRules.RULE_INFO[kind].label}</div>
                        <div>
                          {formatValue(group.rules[kind], weighting)} · {percent(group.rules[kind] / total)}
                        </div>
                      </>
                    )}
                  />
                ))}
              </span>
            </div>
          );
        })}
      </div>
      {node}
    </div>
  );
}
