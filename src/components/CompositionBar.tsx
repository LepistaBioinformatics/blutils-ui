import { compositionColor } from "@/constants/sequencial-colors";
import { kebabToScinameString } from "@/functions/kebab-to-scientific-name";
import { Taxon } from "@/types/BlutilsResult";

interface Props {
  taxon: Taxon;
}

const TOP_BEANS = 5;

/**
 * Identity and bit score side by side, with the consensus composition below
 * as a bar: one block per bean (top 5, widths by occurrences), "+N" for the
 * rest.
 */
export function CompositionBar({ taxon }: Props) {
  const beans = [...(taxon.consensusBeans ?? [])].sort(
    (a, b) => b.occurrences - a.occurrences
  );
  const total = beans.reduce((acc, bean) => acc + bean.occurrences, 0);
  const shown = beans.slice(0, TOP_BEANS);
  const hidden = beans.length - shown.length;

  return (
    <div className="flex w-full flex-col gap-1.5" data-testid="composition">
      <div className="flex items-baseline justify-end gap-4 whitespace-nowrap">
        <div>
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {taxon.percIdentity.toFixed(1)}
          </span>
          <span className="ml-0.5 text-xs text-gray-500 dark:text-gray-400">%</span>
        </div>
        <div>
          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {taxon.bitScore}
          </span>
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">bits</span>
        </div>
      </div>
      <div
        role="img"
        aria-label={
          shown.length > 0
            ? `Composition: ${beans
                .map((b) => `${kebabToScinameString(b.identifier, b.rank)} ×${b.occurrences}`)
                .join(", ")}`
            : "Composition: no consensus beans"
        }
        className="flex h-4 w-full items-center gap-0.5"
      >
        {total > 0 &&
          shown.map((bean, index) => (
            <div
              key={bean.identifier + index}
              data-testid="composition-segment"
              title={`${kebabToScinameString(bean.identifier, bean.rank)} ×${bean.occurrences}`}
              className="h-full rounded-md"
              style={{
                width: `${(bean.occurrences / total) * 100}%`,
                backgroundColor: compositionColor(index),
              }}
            />
          ))}
        {hidden > 0 && (
          <span
            className="ml-1 shrink-0 text-xs text-gray-500 dark:text-gray-400"
            title={`${hidden} more`}
          >
            +{hidden}
          </span>
        )}
      </div>
    </div>
  );
}
