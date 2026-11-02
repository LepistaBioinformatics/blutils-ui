import { suggestWrapCharacters, wrapKey } from "./suggest-wrap-characters";

describe("wrapKey", () => {
  it("keeps the text before the first occurrence of the character", () => {
    expect(wrapKey("SRR20752596.1_size_54", ".")).toBe("SRR20752596");
    expect(wrapKey("SRR20752596.1_size_54", "_")).toBe("SRR20752596.1");
  });

  it("returns the whole query without a character, or when the prefix is empty (BUG-U09)", () => {
    expect(wrapKey("S1_a", undefined)).toBe("S1_a");
    expect(wrapKey("_S1", "_")).toBe("_S1");
    expect(wrapKey("S1", "|")).toBe("S1");
  });
});

describe("suggestWrapCharacters", () => {
  const sra = [
    "SRR20752596.1_size_54",
    "SRR20752596.2_size_7",
    "SRR20752596.3_size_3",
    "SRR25708009.1_size_75",
    "SRR25708009.2_size_8",
  ];

  it("suggests the separator that groups the queries by run", () => {
    expect(suggestWrapCharacters(sra)).toEqual([{ character: ".", groups: 2, coverage: 1 }]);
  });

  it("drops characters that leave one group per query or a single group", () => {
    // "_" leaves one group per query; "-" puts everything in a single group.
    expect(suggestWrapCharacters(["a-1_x", "a-2_y", "a-3_z"]).map((s) => s.character)).toEqual([]);
  });

  it("drops characters present in less than half of the queries", () => {
    expect(suggestWrapCharacters(["a|1", "a|2", "b3", "b4", "c5"])).toEqual([]);
  });

  it("orders by coverage, then by fewer groups, and honours max", () => {
    const queries = ["s1.r1|a", "s1.r1|b", "s1.r2|c", "s2.r2|d", "s3_x"];
    expect(suggestWrapCharacters(queries)).toEqual([
      { character: ".", groups: 3, coverage: 0.8 },
      { character: "|", groups: 4, coverage: 0.8 },
    ]);
    expect(suggestWrapCharacters(queries, 1).map((s) => s.character)).toEqual(["."]);
  });

  it("returns nothing for fewer than two queries", () => {
    expect(suggestWrapCharacters([])).toEqual([]);
    expect(suggestWrapCharacters(["a.b"])).toEqual([]);
  });
});
