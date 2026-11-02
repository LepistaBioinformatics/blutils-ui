import { Result } from "@/types/BlutilsResult";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import { readableLineage } from "./record-filter";

export type Weighting = "records" | "reads";

/** Ranks the charts aggregate by, broadest first. */
export const CHART_RANKS = ["domain", "phylum", "class", "order", "family", "genus", "species"] as const;
export type ChartRank = (typeof CHART_RANKS)[number];

const RANK_PREFIXES: Record<ChartRank, string[]> = {
  domain: ["d", "domain", "k", "kingdom", "superkingdom"],
  phylum: ["p", "phylum"],
  class: ["c", "class"],
  order: ["o", "order"],
  family: ["f", "family"],
  genus: ["g", "genus"],
  species: ["s", "species"],
};

export const NO_MATCH = "No match";

/** Reads behind a dereplicated query (`…_size_54`, `…;size=54`); 1 without a size. */
export function readCount(query: string): number {
  const match = query.match(/size[_=](\d+)/i);
  return match ? Number(match[1]) : 1;
}

export function weightOf(result: Result, weighting: Weighting): number {
  return weighting === "reads" ? readCount(result.query) : 1;
}

/** Readable taxon name of the record at `rank`, from its lineage. */
export function taxonAtRank(result: Result, rank: ChartRank): string {
  const taxonomy = result.taxon?.taxonomy;
  if (!result.taxon) return NO_MATCH;
  if (taxonomy) {
    for (const bit of taxonomy.split(";")) {
      const at = bit.indexOf("__");
      if (at === -1) continue;
      if (RANK_PREFIXES[rank].includes(bit.slice(0, at).toLowerCase())) {
        const name = readableLineage(bit);
        if (name) return name;
      }
    }
  }
  return `Unclassified ${rank}`;
}

export interface AbundanceItem {
  name: string;
  value: number;
  share: number;
}

/** Weight per taxon at `rank`, largest first (ties by name). */
export function abundance(results: Result[], rank: ChartRank, weighting: Weighting): AbundanceItem[] {
  const totals = new Map<string, number>();
  let total = 0;
  for (const result of results) {
    const weight = weightOf(result, weighting);
    const name = taxonAtRank(result, rank);
    totals.set(name, (totals.get(name) ?? 0) + weight);
    total += weight;
  }
  return Array.from(totals, ([name, value]) => ({ name, value, share: total ? value / total : 0 })).sort(
    (a, b) => b.value - a.value || a.name.localeCompare(b.name)
  );
}

/** Keeps the first `limit` items and folds the rest into one "Other" item. */
export function foldOther(items: AbundanceItem[], limit: number): AbundanceItem[] {
  if (items.length <= limit) return items;
  const rest = items.slice(limit);
  return [
    ...items.slice(0, limit),
    {
      name: `Other (${rest.length})`,
      value: rest.reduce((acc, item) => acc + item.value, 0),
      share: rest.reduce((acc, item) => acc + item.share, 0),
    },
  ];
}

export interface WeightedNode {
  name: string;
  /** Readable lineage from the root, the `t:` filter value. */
  path: string;
  value: number;
  children: WeightedNode[];
}

/** Lineage tree weighted by records or reads (sunburst). */
export function weightedTree(results: Result[], weighting: Weighting): WeightedNode[] {
  type Mutable = WeightedNode & { index: Map<string, Mutable> };
  const root = new Map<string, Mutable>();
  for (const result of results) {
    const lineage = readableLineage(result.taxon?.taxonomy);
    if (!lineage) continue;
    const weight = weightOf(result, weighting);
    const names = lineage.split(" > ");
    let level = root;
    names.forEach((name, depth) => {
      let node = level.get(name);
      if (!node) {
        node = { name, path: names.slice(0, depth + 1).join(" > "), value: 0, children: [], index: new Map() };
        level.set(name, node);
      }
      node.value += weight;
      level = node.index;
    });
  }
  const freeze = (level: Map<string, Mutable>): WeightedNode[] =>
    Array.from(level.values())
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
      .map(({ index, ...node }) => ({ ...node, children: freeze(index) }));
  return freeze(root);
}

export type RuleCounts = Record<BeanSelectionRules.RuleKind, number>;

const emptyRules = (): RuleCounts => ({ unanimous: 0, majority: 0, ambiguous: 0, unresolved: 0 });

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const low = Math.floor(pos);
  const high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
}

export interface GroupConfidence {
  name: string;
  weight: number;
  /** Identity five-number summary of the records with a taxon (NaN when none). */
  identity: { min: number; q1: number; median: number; q3: number; max: number; n: number };
  rules: RuleCounts;
}

export interface NamedGroup {
  name: string;
  chunk: Result[];
}

/** Identity spread and rule mix per group, weighted by records or reads. */
export function confidence(groups: NamedGroup[], weighting: Weighting): GroupConfidence[] {
  return groups.map((group) => {
    const identities = group.chunk
      .filter((r) => r.taxon)
      .map((r) => r.taxon!.percIdentity)
      .sort((a, b) => a - b);
    const rules = emptyRules();
    let weight = 0;
    for (const result of group.chunk) {
      const w = weightOf(result, weighting);
      rules[BeanSelectionRules.getRuleKind(result.taxon?.consensusBeans)] += w;
      weight += w;
    }
    return {
      name: group.name,
      weight,
      identity: {
        min: identities[0] ?? NaN,
        q1: quantile(identities, 0.25),
        median: quantile(identities, 0.5),
        q3: quantile(identities, 0.75),
        max: identities[identities.length - 1] ?? NaN,
        n: identities.length,
      },
      rules,
    };
  });
}

export interface CompositionRow {
  subject: string;
  total: number;
  /** Share (0–1) of each of `taxa`, in that order. */
  shares: number[];
  other: number;
}

export interface Composition {
  /** Top taxa overall, fixed order: a color follows its taxon in every row. */
  taxa: string[];
  rows: CompositionRow[];
}

/** Per-subject composition at `rank`: the `topN` taxa overall, the rest as "other". */
export function composition(
  groups: NamedGroup[],
  rank: ChartRank,
  weighting: Weighting,
  topN: number
): Composition {
  const taxa = abundance(
    groups.flatMap((g) => g.chunk),
    rank,
    weighting
  )
    .slice(0, topN)
    .map((item) => item.name);

  const rows = groups.map((group) => {
    const values = new Map<string, number>();
    let total = 0;
    for (const result of group.chunk) {
      const weight = weightOf(result, weighting);
      const name = taxonAtRank(result, rank);
      values.set(name, (values.get(name) ?? 0) + weight);
      total += weight;
    }
    const shares = taxa.map((name) => (total ? (values.get(name) ?? 0) / total : 0));
    return {
      subject: group.name,
      total,
      shares,
      other: Math.max(0, 1 - shares.reduce((a, b) => a + b, 0)),
    };
  });
  return { taxa, rows };
}

export interface SubjectSummary {
  subject: string;
  records: number;
  reads: number;
  /** Share of the weight with a significant match (0–1). */
  matched: number;
  /** Mean identity of the matched records (weighted); NaN without matches. */
  meanIdentity: number;
  rules: RuleCounts;
}

export function subjectSummary(groups: NamedGroup[], weighting: Weighting): SubjectSummary[] {
  return groups.map((group) => {
    const rules = emptyRules();
    let total = 0;
    let matched = 0;
    let identitySum = 0;
    let reads = 0;
    for (const result of group.chunk) {
      const weight = weightOf(result, weighting);
      reads += readCount(result.query);
      total += weight;
      rules[BeanSelectionRules.getRuleKind(result.taxon?.consensusBeans)] += weight;
      if (result.taxon) {
        matched += weight;
        identitySum += result.taxon.percIdentity * weight;
      }
    }
    return {
      subject: group.name,
      records: group.chunk.length,
      reads,
      matched: total ? matched / total : 0,
      meanIdentity: matched ? identitySum / matched : NaN,
      rules,
    };
  });
}
