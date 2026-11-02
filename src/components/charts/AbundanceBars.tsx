import { AbundanceItem, Weighting } from "@/functions/chart-data";
import { formatValue, percent, useChartTooltip } from "./ChartTooltip";

interface Props {
  items: AbundanceItem[];
  weighting: Weighting;
  /** Called with the taxon name; rows only act as buttons when it returns true for `canOpen`. */
  onOpen?: (name: string) => void;
  canOpen?: (name: string) => boolean;
}

const capitalize = (value: string) => value.replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** One horizontal bar per taxon (single series: magnitude only), largest first. */
export function AbundanceBars({ items, weighting, onOpen, canOpen }: Props) {
  const { containerRef, bind, node } = useChartTooltip();
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div ref={containerRef} className="relative" role="list" aria-label="Abundance by taxon">
      {items.map((item) => {
        const isOther = item.name.startsWith("Other (");
        const openable = !isOther && !!onOpen && (canOpen?.(item.name) ?? true);
        const label = `${capitalize(item.name)}: ${formatValue(item.value, weighting)}, ${percent(item.share)}`;
        const content = (
          <>
            <span className="w-48 shrink-0 truncate text-right text-sm text-gray-700 dark:text-gray-300" title={capitalize(item.name)}>
              {capitalize(item.name)}
            </span>
            <span className="relative h-3.5 flex-1">
              <span
                data-testid="abundance-bar"
                className="absolute inset-y-0 left-0 rounded-r"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: isOther ? "var(--series-other)" : "var(--series-1)",
                }}
              />
            </span>
            <span className="w-28 shrink-0 text-right text-xs tabular-nums text-gray-600 dark:text-gray-400">
              {item.value.toLocaleString()} · {percent(item.share)}
            </span>
          </>
        );
        const tooltip = bind(
          <>
            <div className="font-semibold">{capitalize(item.name)}</div>
            <div>
              {formatValue(item.value, weighting)} · {percent(item.share)}
            </div>
            {openable && <div className="opacity-75">Click to open the group</div>}
          </>
        );
        return (
          <div role="listitem" key={item.name}>
            {openable ? (
              <button
                type="button"
                aria-label={`${label}. Open the group`}
                onClick={() => onOpen!(item.name)}
                className="flex w-full items-center gap-3 rounded-md px-1 py-1 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:hover:bg-gray-800"
                {...tooltip}
              >
                {content}
              </button>
            ) : (
              <div aria-label={label} className="flex items-center gap-3 px-1 py-1" tabIndex={0} {...tooltip}>
                {content}
              </div>
            )}
          </div>
        );
      })}
      {node}
    </div>
  );
}
