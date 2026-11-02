import {
  abundance,
  composition,
  confidence,
  foldOther,
  NO_MATCH,
  readCount,
  subjectSummary,
  taxonAtRank,
  weightedTree,
  weightOf,
} from "./chart-data";
import { ConsensusBean, Result } from "@/types/BlutilsResult";

const bean = (identifier: string, occurrences: number): ConsensusBean => ({
  rank: "species",
  identifier,
  occurrences,
  taxonomy: null,
  accessions: [],
});

function rec(query: string, taxonomy: string | null, identity = 99, beans: ConsensusBean[] | null = [bean("x", 1)]): Result {
  return {
    query,
    taxon: {
      reachedRank: "genus",
      identifier: "x",
      percIdentity: identity,
      bitScore: 500,
      taxonomy,
      mutated: false,
      singleMatch: false,
      consensusBeans: beans,
    },
  };
}

const SACC = "k__fungi;p__ascomycota;g__saccharomyces;s__saccharomyces-cerevisiae";
const CRYP = "k__fungi;p__basidiomycota;g__cryptococcus";
const BAC = "d__bacteria;p__bacillota;g__bacillus";

const A1 = rec("S1.1_size_10", SACC, 99);
const A2 = rec("S1.2_size_30", CRYP, 97, [bean("a", 2), bean("b", 1)]);
const B1 = rec("S2.1_size_5", SACC, 95, [bean("a", 2), bean("b", 2)]);
const B2: Result = { query: "S2.2" };
const ALL = [A1, A2, B1, B2];

describe("readCount / weightOf", () => {
  it("reads size_N or size=N, defaulting to 1", () => {
    expect(readCount("SRR1.1_size_54")).toBe(54);
    expect(readCount("seq1;size=7;")).toBe(7);
    expect(readCount("plain")).toBe(1);
  });

  it("weights 1 per record or by reads", () => {
    expect(weightOf(A1, "records")).toBe(1);
    expect(weightOf(A1, "reads")).toBe(10);
  });
});

describe("taxonAtRank", () => {
  it("finds the readable name at the rank (k__ and d__ both count as domain)", () => {
    expect(taxonAtRank(A1, "genus")).toBe("saccharomyces");
    expect(taxonAtRank(A1, "species")).toBe("saccharomyces cerevisiae");
    expect(taxonAtRank(A1, "domain")).toBe("fungi");
    expect(taxonAtRank(rec("x", BAC), "domain")).toBe("bacteria");
  });

  it("reports missing ranks and missing matches", () => {
    expect(taxonAtRank(A2, "species")).toBe("Unclassified species");
    expect(taxonAtRank(rec("x", null), "genus")).toBe("Unclassified genus");
    expect(taxonAtRank(B2, "genus")).toBe(NO_MATCH);
  });
});

describe("abundance / foldOther", () => {
  it("sums weights per taxon, largest first, with shares", () => {
    expect(abundance(ALL, "genus", "records")).toEqual([
      { name: "saccharomyces", value: 2, share: 0.5 },
      // ties break by name, locale-aware
      { name: "cryptococcus", value: 1, share: 0.25 },
      { name: "No match", value: 1, share: 0.25 },
    ]);
    expect(abundance(ALL, "genus", "reads").map((i) => [i.name, i.value])).toEqual([
      ["cryptococcus", 30],
      ["saccharomyces", 15],
      ["No match", 1],
    ]);
  });

  it("folds everything past the limit into Other", () => {
    const folded = foldOther(abundance(ALL, "genus", "records"), 1);
    expect(folded.map((i) => [i.name, i.value])).toEqual([
      ["saccharomyces", 2],
      ["Other (2)", 2],
    ]);
    expect(folded[1].share).toBeCloseTo(0.5);
  });
});

describe("weightedTree", () => {
  it("weights each lineage level and sorts children by weight", () => {
    const [fungi] = weightedTree(ALL, "reads");
    expect(fungi).toMatchObject({ name: "fungi", path: "fungi", value: 45 });
    expect(fungi.children.map((c) => [c.name, c.value])).toEqual([
      ["basidiomycota", 30],
      ["ascomycota", 15],
    ]);
  });
});

describe("confidence", () => {
  it("summarizes identity and rule mix per group", () => {
    const [group] = confidence([{ name: "g", chunk: [A1, A2, B1, B2] }], "records");
    expect(group.weight).toBe(4);
    expect(group.identity).toMatchObject({ min: 95, median: 97, max: 99, n: 3 });
    expect(group.rules).toEqual({ unanimous: 1, majority: 1, ambiguous: 1, unresolved: 1 });
  });

  it("an empty identity set gives NaN", () => {
    const [group] = confidence([{ name: "g", chunk: [B2] }], "records");
    expect(group.identity.median).toBeNaN();
  });
});

describe("composition", () => {
  const groups = [
    { name: "S1", chunk: [A1, A2] },
    { name: "S2", chunk: [B1, B2] },
  ];

  it("fixes the top taxa overall and gives each subject its shares", () => {
    const result = composition(groups, "genus", "records", 1);
    expect(result.taxa).toEqual(["saccharomyces"]);
    expect(result.rows).toEqual([
      { subject: "S1", total: 2, shares: [0.5], other: 0.5 },
      { subject: "S2", total: 2, shares: [0.5], other: 0.5 },
    ]);
  });

  it("weights by reads", () => {
    const result = composition(groups, "genus", "reads", 2);
    expect(result.taxa).toEqual(["cryptococcus", "saccharomyces"]);
    expect(result.rows[0].shares[0]).toBeCloseTo(30 / 40);
  });
});

describe("subjectSummary", () => {
  it("counts records, reads, matched share, mean identity and rules", () => {
    const [s1, s2] = subjectSummary(
      [
        { name: "S1", chunk: [A1, A2] },
        { name: "S2", chunk: [B1, B2] },
      ],
      "records"
    );
    expect(s1).toMatchObject({ subject: "S1", records: 2, reads: 40, matched: 1, meanIdentity: 98 });
    expect(s2.matched).toBe(0.5);
    expect(s2.meanIdentity).toBe(95);
    expect(s2.rules).toEqual({ unanimous: 0, majority: 0, ambiguous: 1, unresolved: 1 });
  });
});
