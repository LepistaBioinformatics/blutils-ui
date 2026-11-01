import { kebabToPlain } from "./kebab-to-plain";

describe("kebabToPlain", () => {
  test.each([
    ["show-also", "Show Also"],
    ["no-rank", "No Rank"],
    ["species", "Species"],
    ["species-subgroup", "Species Subgroup"],
    ["already-Capital", "Already Capital"],
  ])("%s -> %s", (input, expected) => {
    expect(kebabToPlain(input)).toBe(expected);
  });

  test("spaces are treated like hyphens", () => {
    expect(kebabToPlain("no rank")).toBe("No Rank");
  });

  // BUG-U05: an empty segment used to make `word[0]` undefined -> TypeError.
  test("BUG-U05: empty segments do not throw", () => {
    expect(kebabToPlain("")).toBe("");
    expect(() => kebabToPlain("a--b")).not.toThrow();
    expect(() => kebabToPlain("-a")).not.toThrow();
    expect(() => kebabToPlain("a-")).not.toThrow();
  });
});
