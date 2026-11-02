import { Result } from "@/types/BlutilsResult";
import { readableLineage } from "./record-filter";

export interface TaxonomyTreeNode {
  /** Readable name, e.g. "bacillus subtilis group". */
  name: string;
  /** Raw rank prefix from the lineage, e.g. "g" or "species-group". */
  rank: string;
  /** Readable lineage from the root to this node; the `t:` filter value. */
  path: string;
  /** Records whose lineage passes through this node. */
  count: number;
  children: TaxonomyTreeNode[];
}

interface MutableNode extends TaxonomyTreeNode {
  index: Map<string, MutableNode>;
}

/** Builds the lineage tree of a result, with record counts per node. */
export function buildTaxonomyTree(results: Result[]): TaxonomyTreeNode[] {
  const root = new Map<string, MutableNode>();

  for (const result of results) {
    const taxonomy = result.taxon?.taxonomy;
    if (!taxonomy) continue;

    const names = readableLineage(taxonomy).split(" > ");
    const ranks = taxonomy
      .split(";")
      .filter((bit) => bit.trim())
      .map((bit) => (bit.includes("__") ? bit.slice(0, bit.indexOf("__")) : ""));

    let level = root;
    names.forEach((name, depth) => {
      let node = level.get(name);
      if (!node) {
        node = {
          name,
          rank: ranks[depth] ?? "",
          path: names.slice(0, depth + 1).join(" > "),
          count: 0,
          children: [],
          index: new Map(),
        };
        level.set(name, node);
      }
      node.count += 1;
      level = node.index;
    });
  }

  const freeze = (level: Map<string, MutableNode>): TaxonomyTreeNode[] =>
    Array.from(level.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ index, ...node }) => ({ ...node, children: freeze(index) }));

  return freeze(root);
}
