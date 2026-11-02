import { render } from "@testing-library/react";
import { kebabToSciname, kebabToScinameString } from "./kebab-to-scientific-name";

describe("kebabToSciname", () => {
  test("species is rendered italic with only the first word capitalized", () => {
    const { container } = render(kebabToSciname("bacillus-subtilis", "species"));
    expect(container.innerHTML).toBe(
      '<span class="italic">Bacillus subtilis</span>'
    );
  });

  test.each([
    ["bacillus", "genus", "Bacillus"],
    ["escherichia-coli-k12", "subspecies", "Escherichia coli k12"],
  ])("%s (%s) is italic -> %s", (value, rank, expected) => {
    const { container } = render(kebabToSciname(value, rank));
    const span = container.querySelector("span")!;
    expect(span).toHaveClass("italic");
    expect(span).toHaveTextContent(expected);
  });

  test("species-subgroup is not italic and capitalizes every word", () => {
    const { container } = render(
      kebabToSciname("bacillus-subtilis-group", "species-subgroup")
    );
    expect(container.innerHTML).toBe("<span>Bacillus Subtilis Group</span>");
  });

  test("rank match is case-sensitive: 'Species' is not italic", () => {
    const { container } = render(kebabToSciname("bacillus-subtilis", "Species"));
    expect(container.innerHTML).toBe("<span>Bacillus Subtilis</span>");
  });

  test.each([
    ["species", "Bacillus subtilis"],
    ["family", "Bacillus Subtilis"],
  ])(
    "props.children is a plain string for rank %s (contract used by ConsensusModal)",
    (rank, expected) => {
      const element = kebabToSciname("bacillus-subtilis", rank);
      expect(typeof element.props.children).toBe("string");
      expect(element.props.children).toBe(expected);
    }
  );

  // Italic branch only indexes the first word, so an inner empty segment survives.
  test("inner empty segment in an italic rank does not throw", () => {
    expect(kebabToSciname("a--b", "species").props.children).toBe("A  b");
  });

  // BUG-U05: an empty first segment used to make `word[0]` undefined -> TypeError.
  test("BUG-U05: empty segments render without throwing", () => {
    expect(() => kebabToSciname("", "species")).not.toThrow();
    expect(() => kebabToSciname("-a", "species")).not.toThrow();
    expect(() => kebabToSciname("a--b", "family")).not.toThrow();
  });
});

describe("kebabToScinameString", () => {
  test.each([
    ["bacillus-subtilis", "species", "Bacillus subtilis"],
    ["bacillus", "genus", "Bacillus"],
    ["escherichia-coli-k12", "subspecies", "Escherichia coli k12"],
    ["bacillus-subtilis-group", "species-subgroup", "Bacillus Subtilis Group"],
    ["bacillus-subtilis", "Species", "Bacillus Subtilis"],
  ])("(%s, %s) -> %s", (value, rank, expected) => {
    expect(kebabToScinameString(value, rank)).toBe(expected);
  });

  test("inner empty segment in an italic rank does not throw", () => {
    expect(kebabToScinameString("a--b", "species")).toBe("A  b");
  });

  // BUG-U05: an empty first segment used to make `word[0]` undefined -> TypeError.
  test("BUG-U05: empty segments do not throw", () => {
    expect(() => kebabToScinameString("", "species")).not.toThrow();
    expect(() => kebabToScinameString("-a", "species")).not.toThrow();
    expect(() => kebabToScinameString("a--b", "family")).not.toThrow();
  });
});
