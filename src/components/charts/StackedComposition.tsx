import { Composition, Weighting } from "@/functions/chart-data";
import { formatValue, percent, SERIES, SERIES_OTHER, useChartTooltip } from "./ChartTooltip";

interface Props {
  data: Composition;
  weighting: Weighting;
}

const capitalize = (value: string) => value.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** One 100% bar per subject; the top taxa keep fixed colors, the rest is "Other". */
export function StackedComposition({ data, weighting }: Props) {
  const { containerRef, bind, node } = useChartTooltip();
  const legend = [...data.taxa.map((name, i) => ({ name: capitalize(name), color: SERIES(i) })), { name: "Other", color: SERIES_OTHER }];

  return (
    <div ref={containerRef} className="relative">
      <ul aria-label="Legend" className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700 dark:text-gray-300">
        {legend.map((entry) => (
          <li key={entry.name} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: entry.color }} />
            {entry.name}
          </li>
        ))}
      </ul>
      <div role="list" aria-label="Composition per subject" className="flex flex-col gap-1.5">
        {data.rows.map((row) => {
          const segments = [
            ...row.shares.map((share, i) => ({ name: capitalize(data.taxa[i]), share, color: SERIES(i) })),
            { name: "Other", share: row.other, color: SERIES_OTHER },
          ].filter((s) => s.share > 0);
          return (
            <div role="listitem" key={row.subject} className="grid grid-cols-[10rem_1fr_7rem] items-center gap-3 text-sm">
              <span className="truncate text-gray-700 dark:text-gray-300" title={row.subject}>
                {row.subject}
              </span>
              <span className="flex h-5 gap-0.5 overflow-hidden rounded" aria-label={`${row.subject} composition`}>
                {segments.map((segment) => (
                  <span
                    key={segment.name}
                    data-testid="composition-stack-segment"
                    tabIndex={0}
                    aria-label={`${segment.name}: ${percent(segment.share)} of ${row.subject}`}
                    className="h-full outline-none first:rounded-l last:rounded-r focus-visible:ring-2 focus-visible:ring-gray-400"
                    style={{ width: `${segment.share * 100}%`, background: segment.color }}
                    {...bind(
                      <>
                        <div className="font-semibold">{segment.name}</div>
                        <div>
                          {row.subject}: {percent(segment.share)} · {formatValue(Math.round(segment.share * row.total), weighting)}
                        </div>
                      </>
                    )}
                  />
                ))}
              </span>
              <span className="text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {formatValue(row.total, weighting)}
              </span>
            </div>
          );
        })}
      </div>
      {node}
    </div>
  );
}
