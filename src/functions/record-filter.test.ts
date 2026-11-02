import {
  matchesFilter,
  parseFilter,
  readableLineage,
  serializeFilter,
  tokenLabel,
} from "./record-filter";
import { ConsensusBean, Result } from "@/types/BlutilsResult";

function bean(identifier: string, occurrences: number): ConsensusBean {
  return { rank: "species", identifier, occurrences, taxonomy: null, accessions: [] };
}

const bacillus: Result = {
  query: "SRR20752596.1_size_54",
  taxon: {
    reachedRank: "species-group",
    identifier: "bacillus-subtilis-group",
    percIdentity: 99.4,
    bitScore: 843,
    taxonomy:
      "d__bacteria;clade__terrabacteria-group;p__bacillota;g__bacillus;species-group__bacillus-subtilis-group",
    mutated: false,
    singleMatch: false,
    consensusBeans: [bean("bacillus-subtilis", 4), bean("bacillus-velezensis", 2)],
  },
};

const salmonella: Result = {
  query: "SRR25708009.9_size_75",
  taxon: {
    reachedRank: "species",
    identifier: "salmonella-enterica",
    percIdentity: 97,
    bitScore: 612,
    taxonomy: "d__bacteria;p__pseudomonadota;g__salmonella;s__salmonella-enterica",
    mutated: false,
    singleMatch: false,
    consensusBeans: [bean("salmonella-enterica", 3)],
  },
};

const noHit: Result = { query: "SRR25708009.99_size_8" };

const records = [bacillus, salmonella, noHit];
const run = (text: string) =>
  records.filter((r) => matchesFilter(r, parseFilter(text))).map((r) => r.query);

describe("parseFilter", () => {
  it("returns no tokens for empty, null or whitespace-only text", () => {
    expect(parseFilter("")).toEqual([]);
    expect(parseFilter(null)).toEqual([]);
    expect(parseFilter("   \t ")).toEqual([]);
  });

  it("parses keys, quoted values, metrics and has/no", () => {
    expect(
      parseFilter('q:SRR207 t:"bacillus subtilis group" rank:genus rule:Majority id>=97 bits<500 has:match no:match bacillus')
    ).toEqual([
      { kind: "q", value: "SRR207" },
      { kind: "t", value: "bacillus subtilis group" },
      { kind: "rank", value: "genus" },
      { kind: "rule", value: "Majority" },
      { kind: "id", op: ">=", value: 97 },
      { kind: "bits", op: "<", value: 500 },
      { kind: "has", value: "match" },
      { kind: "has", value: "no-match" },
      { kind: "text", value: "bacillus" },
    ]);
  });

  it("is case-insensitive for keys and metrics", () => {
    expect(parseFilter("Q:abc ID>99.5")).toEqual([
      { kind: "q", value: "abc" },
      { kind: "id", op: ">", value: 99.5 },
    ]);
  });

  it("treats unknown keys as free text and drops empty values", () => {
    expect(parseFilter("foo:bar q: t:\"\"")).toEqual([{ kind: "text", value: "foo:bar" }]);
  });

  it("keeps a quoted free-text phrase whole", () => {
    expect(parseFilter('"terrabacteria group"')).toEqual([
      { kind: "text", value: "terrabacteria group" },
    ]);
  });

  it("round-trips through serializeFilter", () => {
    const text = 'q:SRR207 t:"bacteria > bacillota" id>=97 no:match "two words"';
    expect(serializeFilter(parseFilter(text))).toBe(text);
    expect(parseFilter(serializeFilter(parseFilter(text)))).toEqual(parseFilter(text));
  });
});

describe("readableLineage", () => {
  it("drops rank prefixes, lower-cases and turns hyphens into spaces", () => {
    expect(readableLineage("d__Bacteria;clade__terrabacteria-group;p__bacillota")).toBe(
      "bacteria > terrabacteria group > bacillota"
    );
  });

  it("returns an empty string without taxonomy", () => {
    expect(readableLineage(null)).toBe("");
    expect(readableLineage(undefined)).toBe("");
  });
});

describe("matchesFilter", () => {
  it("an empty filter keeps everything", () => {
    expect(run("")).toHaveLength(3);
  });

  it("q: matches the query case-insensitively", () => {
    expect(run("q:srr2075")).toEqual([bacillus.query]);
  });

  it("t: matches the readable lineage, spaces included", () => {
    expect(run('t:"terrabacteria group"')).toEqual([bacillus.query]);
    expect(run("t:bacteria")).toEqual([bacillus.query, salmonella.query]);
  });

  it("a tree path t: keeps exactly the records under that node", () => {
    expect(run('t:"bacteria > pseudomonadota"')).toEqual([salmonella.query]);
  });

  it("free text matches query, proposed taxon or lineage", () => {
    expect(run("subtilis")).toEqual([bacillus.query]);
    expect(run("size_8")).toEqual([noHit.query]);
    expect(run('"salmonella enterica"')).toEqual([salmonella.query]);
  });

  it("rank: compares the reached rank, with or without hyphens", () => {
    expect(run("rank:species")).toEqual([salmonella.query]);
    expect(run('rank:"species group"')).toEqual([bacillus.query]);
  });

  it("rule: matches the rule word", () => {
    expect(run("rule:majority")).toEqual([bacillus.query]);
    expect(run("rule:Unanimous")).toEqual([salmonella.query]);
    expect(run("rule:unresolved")).toEqual([noHit.query]);
  });

  it("id and bits compare numerically and exclude records without a taxon", () => {
    expect(run("id>=99")).toEqual([bacillus.query]);
    expect(run("id<99")).toEqual([salmonella.query]);
    expect(run("bits>612")).toEqual([bacillus.query]);
    expect(run("bits<=612")).toEqual([salmonella.query]);
  });

  it("has:match / no:match split matched and unmatched records", () => {
    expect(run("has:match")).toEqual([bacillus.query, salmonella.query]);
    expect(run("no:match")).toEqual([noHit.query]);
  });

  it("combines tokens with AND", () => {
    expect(run("t:bacteria id>=99")).toEqual([bacillus.query]);
    expect(run("q:SRR25708009 has:match")).toEqual([salmonella.query]);
    expect(run("q:SRR20752596 no:match")).toEqual([]);
  });
});

describe("tokenLabel", () => {
  it("gives readable chip labels", () => {
    expect(parseFilter('q:a t:"b c" rank:genus rule:majority id>=97 bits<5 has:match no:match x').map(tokenLabel)).toEqual([
      "Query: a",
      "Taxonomy: b c",
      "Rank: genus",
      "Rule: majority",
      "Identity >= 97%",
      "Bit score < 5",
      "Matched only",
      "Unmatched only",
      '"x"',
    ]);
  });
});
