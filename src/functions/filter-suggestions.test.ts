import { activeValueToken, buildSuggestionIndex, suggestValues } from "./filter-suggestions";
import { ConsensusBean, Result } from "@/types/BlutilsResult";

const bean = (identifier: string, occurrences: number): ConsensusBean => ({
  rank: "species",
  identifier,
  occurrences,
  taxonomy: null,
  accessions: [],
});

function rec(query: string, rank: string, taxonomy: string, beans: ConsensusBean[] | null): Result {
  return {
    query,
    taxon: {
      reachedRank: rank,
      identifier: "x",
      percIdentity: 99,
      bitScore: 800,
      taxonomy,
      mutated: false,
      singleMatch: false,
      consensusBeans: beans,
    },
  };
}

const results: Result[] = [
  rec("S1.a", "genus", "d__bacteria;p__bacillota;g__bacillus", [bean("b", 2)]),
  rec("S1.b", "genus", "d__bacteria;p__bacillota;g__listeria", [bean("b", 4), bean("c", 1)]),
  rec("S2.a", "species-group", "d__bacteria;p__bacillota;species-group__bacillus-subtilis-group", [
    bean("b", 2),
    bean("c", 2),
  ]),
  { query: "S2.b" },
];

describe("activeValueToken", () => {
  it("detects the key being typed and its partial value", () => {
    expect(activeValueToken("q:")).toEqual({ key: "q", partial: "", start: 0 });
    expect(activeValueToken("id>=97 rank:gen")).toEqual({ key: "rank", partial: "gen", start: 7 });
    expect(activeValueToken('t:"bacillus sub')).toEqual({ key: "t", partial: "bacillus sub", start: 0 });
    expect(activeValueToken("RULE:Maj")).toEqual({ key: "rule", partial: "Maj", start: 0 });
  });

  it("is null when no value is being typed", () => {
    expect(activeValueToken("")).toBeNull();
    expect(activeValueToken("bacillus")).toBeNull();
    expect(activeValueToken("id>=9")).toBeNull();
    expect(activeValueToken("q:abc ")).toBeNull();
    expect(activeValueToken('t:"closed" ')).toBeNull();
    expect(activeValueToken("xq:abc")).toBeNull();
  });
});

describe("buildSuggestionIndex", () => {
  const index = buildSuggestionIndex(results);

  it("lists unique queries in order", () => {
    expect(index.q.map((s) => s.value)).toEqual(["S1.a", "S1.b", "S2.a", "S2.b"]);
  });

  it("counts lineage names, ranks (readable) and rule words, most frequent first", () => {
    expect(index.t.slice(0, 2)).toEqual([
      { value: "bacillota", count: 3 },
      { value: "bacteria", count: 3 },
    ]);
    expect(index.t.map((s) => s.value)).toContain("bacillus subtilis group");
    expect(index.rank).toEqual([
      { value: "genus", count: 2 },
      { value: "species group", count: 1 },
    ]);
    expect(index.rule).toEqual([
      { value: "ambiguous", count: 1 },
      { value: "majority", count: 1 },
      { value: "unanimous", count: 1 },
      { value: "unresolved", count: 1 },
    ]);
  });
});

describe("suggestValues", () => {
  const index = buildSuggestionIndex(results);

  it("returns the top values for an empty partial, honouring the limit", () => {
    expect(suggestValues(index, "rank", "")).toHaveLength(2);
    expect(suggestValues(index, "q", "", 2).map((s) => s.value)).toEqual(["S1.a", "S1.b"]);
  });

  it("matches case-insensitively, prefix matches first", () => {
    expect(suggestValues(index, "t", "BACIL").map((s) => s.value)).toEqual([
      "bacillota",
      "bacillus",
      "bacillus subtilis group",
    ]);
    expect(suggestValues(index, "t", "sub").map((s) => s.value)).toEqual(["bacillus subtilis group"]);
    expect(suggestValues(index, "q", "2.").map((s) => s.value)).toEqual(["S2.a", "S2.b"]);
  });

  it("returns nothing when no value matches", () => {
    expect(suggestValues(index, "rule", "zzz")).toEqual([]);
  });
});
