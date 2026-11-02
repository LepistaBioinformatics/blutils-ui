import { DEFAULT_SORT, nextSort, sortRecords } from "./sort-records";
import { Result } from "@/types/BlutilsResult";

function rec(query: string, identifier?: string, taxonomy: string | null = null): Result {
  return identifier
    ? {
        query,
        taxon: {
          reachedRank: "genus",
          identifier,
          percIdentity: 99,
          bitScore: 800,
          taxonomy,
          mutated: false,
          singleMatch: false,
          consensusBeans: null,
        },
      }
    : { query };
}

const records = [
  rec("S.10", "listeria", "d__bacteria;p__bacillota;g__listeria"),
  rec("S.2", "bacillus", "d__bacteria;p__bacillota;g__bacillus"),
  rec("S.1"),
  rec("S.3", "escherichia", "d__bacteria;p__pseudomonadota;g__escherichia"),
  rec("S.4", "bacillus-subtilis-group", null),
];
const queries = (list: Result[]) => list.map((r) => r.query);

describe("sortRecords", () => {
  it("no sort (the default) keeps the original order", () => {
    expect(DEFAULT_SORT).toBeNull();
    expect(queries(sortRecords(records, DEFAULT_SORT))).toEqual(queries(records));
  });

  it("sorts by query ascending in natural order (S.2 before S.10)", () => {
    expect(queries(sortRecords(records, { key: "query", direction: "asc" }))).toEqual([
      "S.1",
      "S.2",
      "S.3",
      "S.4",
      "S.10",
    ]);
  });

  it("sorts by query descending", () => {
    expect(queries(sortRecords(records, { key: "query", direction: "desc" }))).toEqual([
      "S.10",
      "S.4",
      "S.3",
      "S.2",
      "S.1",
    ]);
  });

  it("sorts by proposed taxon; records without a taxon go last in both directions", () => {
    expect(queries(sortRecords(records, { key: "taxon", direction: "asc" }))).toEqual([
      "S.2",
      "S.4",
      "S.3",
      "S.10",
      "S.1",
    ]);
    expect(queries(sortRecords(records, { key: "taxon", direction: "desc" }))).toEqual([
      "S.10",
      "S.3",
      "S.4",
      "S.2",
      "S.1",
    ]);
  });

  it("sorts by taxonomy (readable lineage); no lineage goes last", () => {
    expect(queries(sortRecords(records, { key: "taxonomy", direction: "asc" }))).toEqual([
      "S.2",
      "S.10",
      "S.3",
      "S.1",
      "S.4",
    ]);
  });

  it("does not mutate the input", () => {
    const copy = [...records];
    sortRecords(records, { key: "taxon", direction: "desc" });
    expect(records).toEqual(copy);
  });
});

describe("nextSort", () => {
  it("cycles ascending → descending → original order for the same key", () => {
    expect(nextSort(null, "taxon")).toEqual({ key: "taxon", direction: "asc" });
    expect(nextSort({ key: "taxon", direction: "asc" }, "taxon")).toEqual({ key: "taxon", direction: "desc" });
    expect(nextSort({ key: "taxon", direction: "desc" }, "taxon")).toBeNull();
  });

  it("a different key always starts ascending", () => {
    expect(nextSort({ key: "query", direction: "desc" }, "taxonomy")).toEqual({
      key: "taxonomy",
      direction: "asc",
    });
  });
});
