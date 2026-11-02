import { buildTaxonomyTree } from "./taxonomy-tree";
import { Result } from "@/types/BlutilsResult";

function result(query: string, taxonomy: string | null): Result {
  return taxonomy === undefined
    ? { query }
    : {
        query,
        taxon: {
          reachedRank: "genus",
          identifier: "x",
          percIdentity: 99,
          bitScore: 500,
          taxonomy,
          mutated: false,
          singleMatch: false,
          consensusBeans: null,
        },
      };
}

describe("buildTaxonomyTree", () => {
  const tree = buildTaxonomyTree([
    result("a", "d__bacteria;p__bacillota;g__bacillus"),
    result("b", "d__bacteria;p__bacillota;g__listeria"),
    result("c", "d__bacteria;p__pseudomonadota"),
    result("d", null),
    { query: "e" },
  ]);

  it("nests lineage levels with record counts per node", () => {
    expect(tree).toHaveLength(1);
    const bacteria = tree[0];
    expect(bacteria).toMatchObject({ name: "bacteria", rank: "d", path: "bacteria", count: 3 });
    expect(bacteria.children.map((c) => [c.name, c.count])).toEqual([
      ["bacillota", 2],
      ["pseudomonadota", 1],
    ]);
  });

  it("gives each node its readable path from the root (the t: filter value)", () => {
    const genera = tree[0].children[0].children;
    expect(genera.map((g) => g.path)).toEqual([
      "bacteria > bacillota > bacillus",
      "bacteria > bacillota > listeria",
    ]);
    expect(genera[0].rank).toBe("g");
    expect(genera[0].children).toEqual([]);
  });

  it("skips records without a taxon or taxonomy", () => {
    expect(buildTaxonomyTree([result("d", null), { query: "e" }])).toEqual([]);
  });

  it("sorts siblings by name and keeps multi-word names readable", () => {
    const [root] = buildTaxonomyTree([
      result("a", "d__bacteria;species-group__bacillus-subtilis-group"),
      result("b", "d__bacteria;clade__terrabacteria-group"),
    ]);
    expect(root.children.map((c) => [c.name, c.rank])).toEqual([
      ["bacillus subtilis group", "species-group"],
      ["terrabacteria group", "clade"],
    ]);
  });
});
