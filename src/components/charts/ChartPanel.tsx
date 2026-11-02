import { useMemo, useState } from "react";
import {
  abundance,
  CHART_RANKS,
  ChartRank,
  composition,
  confidence,
  foldOther,
  NamedGroup,
  subjectSummary,
  weightedTree,
  Weighting,
} from "@/functions/chart-data";
import { AbundanceBars } from "./AbundanceBars";
import { LineageSunburst } from "./LineageSunburst";
import { ConfidenceChart } from "./ConfidenceChart";
import { StackedComposition } from "./StackedComposition";
import { CompositionHeatmap } from "./CompositionHeatmap";
import { SubjectSummaryTable } from "./SubjectSummaryTable";

export type ChartKind = "taxonomy" | "subject";

interface ChartDef {
  id: string;
  label: string;
  /** Whether the chart aggregates by a rank (shows the rank selector). */
  ranked: boolean;
}

export const CHARTS: Record<ChartKind, ChartDef[]> = {
  taxonomy: [
    { id: "abundance", label: "Abundance", ranked: true },
    { id: "sunburst", label: "Lineage", ranked: false },
    { id: "confidence", label: "Confidence", ranked: false },
  ],
  subject: [
    { id: "composition", label: "Composition", ranked: true },
    { id: "heatmap", label: "Heatmap", ranked: true },
    { id: "summary", label: "Summary", ranked: false },
  ],
};

const ABUNDANCE_LIMIT = 30;
const COMPOSITION_TOP = 8;
const HEATMAP_TOP = 20;
const CONFIDENCE_LIMIT = 25;

interface Props {
  kind: ChartKind;
  groups: NamedGroup[];
  /** Chart id from the URL (`?c=`); unknown → the first chart of the kind. */
  chart: string | null;
  onChartChange: (id: string) => void;
  /** Open a group (by its name in this view) in List mode. */
  onOpenGroup: (name: string) => void;
  /** Add a `t:` filter for a lineage path. */
  onFilterTaxonomy: (path: string) => void;
  /** Display label of a group name. */
  groupLabel: (name: string) => string;
}

const PILL = "rounded-full px-3 py-1 text-sm";
const PILL_ON = "bg-white font-semibold text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white";
const PILL_OFF = "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white";

export function ChartPanel({ kind, groups, chart, onChartChange, onOpenGroup, onFilterTaxonomy, groupLabel }: Props) {
  const defs = CHARTS[kind];
  const current = defs.find((d) => d.id === chart) ?? defs[0];
  const [weighting, setWeighting] = useState<Weighting>("records");
  const [rank, setRank] = useState<ChartRank>("genus");

  const results = useMemo(() => groups.flatMap((g) => g.chunk), [groups]);
  // abundance names are readable lineage names; group names are kebab identifiers
  const groupByReadable = useMemo(
    () => new Map(groups.map((g) => [g.name.replace(/-/g, " ").toLowerCase(), g.name])),
    [groups]
  );

  let body = null;
  if (current.id === "abundance") {
    body = (
      <AbundanceBars
        items={foldOther(abundance(results, rank, weighting), ABUNDANCE_LIMIT)}
        weighting={weighting}
        canOpen={(name) => groupByReadable.has(name)}
        onOpen={(name) => onOpenGroup(groupByReadable.get(name)!)}
      />
    );
  } else if (current.id === "sunburst") {
    body = <LineageSunburst tree={weightedTree(results, weighting)} weighting={weighting} onFilter={onFilterTaxonomy} />;
  } else if (current.id === "confidence") {
    const rows = confidence(groups, weighting)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, CONFIDENCE_LIMIT);
    body = <ConfidenceChart groups={rows} weighting={weighting} label={groupLabel} />;
  } else if (current.id === "composition") {
    body = <StackedComposition data={composition(groups, rank, weighting, COMPOSITION_TOP)} weighting={weighting} />;
  } else if (current.id === "heatmap") {
    body = <CompositionHeatmap data={composition(groups, rank, weighting, HEATMAP_TOP)} weighting={weighting} />;
  } else {
    body = <SubjectSummaryTable rows={subjectSummary(groups, weighting)} weighting={weighting} />;
  }

  return (
    <section aria-label="Charts" className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
        <div role="group" aria-label="Chart" className="inline-flex rounded-full bg-gray-100 p-0.5 dark:bg-gray-700">
          {defs.map((def) => (
            <button
              key={def.id}
              type="button"
              aria-pressed={def.id === current.id}
              onClick={() => onChartChange(def.id)}
              className={`${PILL} ${def.id === current.id ? PILL_ON : PILL_OFF}`}
            >
              {def.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Count" className="inline-flex rounded-full bg-gray-100 p-0.5 dark:bg-gray-700">
          {(["records", "reads"] as Weighting[]).map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={weighting === w}
              title={w === "reads" ? "Weight each query by the reads in its name (size_N)" : "One per query"}
              onClick={() => setWeighting(w)}
              className={`${PILL} capitalize ${weighting === w ? PILL_ON : PILL_OFF}`}
            >
              {w}
            </button>
          ))}
        </div>
        {current.ranked && (
          <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            Rank
            <select
              value={rank}
              onChange={(event) => setRank(event.target.value as ChartRank)}
              className="rounded-lg border-0 bg-gray-100 py-1 pl-3 pr-8 text-sm capitalize text-gray-900 focus:ring-1 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-100"
            >
              {CHART_RANKS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto pb-6">{body}</div>
    </section>
  );
}
