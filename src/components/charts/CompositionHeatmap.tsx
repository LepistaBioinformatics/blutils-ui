import { Composition, Weighting } from "@/functions/chart-data";
import { formatValue, percent, useChartTooltip } from "./ChartTooltip";

interface Props {
  data: Composition;
  weighting: Weighting;
}

const STEPS = 7;
const capitalize = (value: string) => value.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** Sequential bins of the share, relative to the largest share in the table. */
function step(share: number, max: number) {
  if (share <= 0) return 0;
  return Math.max(1, Math.ceil((share / (max || 1)) * STEPS));
}

/** Subjects × top taxa; one sequential hue, light (low share) to dark (high). */
export function CompositionHeatmap({ data, weighting }: Props) {
  const { containerRef, bind, node } = useChartTooltip();
  const max = Math.max(0, ...data.rows.flatMap((row) => row.shares));

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400" aria-label="Legend">
        <span>0%</span>
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} className="inline-block h-3 w-5 rounded-sm" style={{ background: `var(--seq-${i + 1})` }} />
        ))}
        <span>{percent(max)} of a subject</span>
      </div>
      <table className="border-separate border-spacing-0.5 text-xs" aria-label="Share of each taxon per subject">
        <thead>
          <tr>
            <th />
            {data.taxa.map((taxon) => (
              <th key={taxon} scope="col" className="h-32 w-7 align-bottom font-normal text-gray-600 dark:text-gray-400">
                <span className="inline-block max-h-32 truncate [writing-mode:vertical-rl] rotate-180" title={capitalize(taxon)}>
                  {capitalize(taxon)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.subject}>
              <th scope="row" className="max-w-[10rem] truncate pr-2 text-left font-normal text-gray-700 dark:text-gray-300" title={row.subject}>
                {row.subject}
              </th>
              {row.shares.map((share, i) => (
                <td
                  key={data.taxa[i]}
                  data-testid="heatmap-cell"
                  tabIndex={0}
                  aria-label={`${capitalize(data.taxa[i])} in ${row.subject}: ${percent(share)}`}
                  className="h-6 w-7 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                  style={{ background: `var(--seq-${step(share, max)})` }}
                  {...bind(
                    <>
                      <div className="font-semibold">{capitalize(data.taxa[i])}</div>
                      <div>
                        {row.subject}: {percent(share)} · {formatValue(Math.round(share * row.total), weighting)}
                      </div>
                    </>
                  )}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {node}
    </div>
  );
}
