import { BeanSelectionRules } from "./BeanSelectionRules";
import { makeBean } from "@/test-utils";
import { ConsensusBean } from "./BlutilsResult";

// `Rules` is not exported, so the numeric values are used directly:
// 0 = NO_BEANS, 1 = ABSOLUTE_BEAN, 2 = TWICE_OF_SECOND_BEAN.
const NO_BEANS = 0;
const ABSOLUTE_BEAN = 1;
const TWICE_OF_SECOND_BEAN = 2;

function beans(...occurrences: number[]): ConsensusBean[] {
  return occurrences.map((occ, i) =>
    makeBean({ identifier: `taxon-${i}-${occ}`, occurrences: occ })
  );
}

describe("BeanSelectionRules.getRuleDescription", () => {
  test.each([
    [0, "No consensus beans"],
    [1, "Only one consensus bean"],
    [2, "Twice the occurrences of the second most frequent taxon"],
  ])("rule %i returns its description", (rule, description) => {
    expect(BeanSelectionRules.getRuleDescription(rule)).toBe(description);
  });

  test.each([3, -1])("rule %i throws an Error with 'Invalid rule'", (rule) => {
    expect(() => BeanSelectionRules.getRuleDescription(rule)).toThrow(
      new Error("Invalid rule")
    );
  });
});

describe("BeanSelectionRules.getMostProbableTaxon", () => {
  test("undefined input returns no bean and rule NO_BEANS", () => {
    expect(BeanSelectionRules.getMostProbableTaxon(undefined)).toEqual({
      bean: undefined,
      rule: NO_BEANS,
    });
  });

  test("null input (Rust Option serialized as null) returns rule NO_BEANS", () => {
    expect(
      BeanSelectionRules.getMostProbableTaxon(null as unknown as undefined)
    ).toEqual({ bean: undefined, rule: NO_BEANS });
  });

  test("empty array returns rule NO_BEANS", () => {
    expect(BeanSelectionRules.getMostProbableTaxon([])).toEqual({
      bean: undefined,
      rule: NO_BEANS,
    });
  });

  test("single bean is returned with rule ABSOLUTE_BEAN", () => {
    const input = beans(1);
    expect(BeanSelectionRules.getMostProbableTaxon(input)).toEqual({
      bean: input[0],
      rule: ABSOLUTE_BEAN,
    });
  });

  test("[5, 2] returns the 5-occurrence bean with rule TWICE_OF_SECOND_BEAN", () => {
    const input = beans(5, 2);
    const top = input[0];
    const result = BeanSelectionRules.getMostProbableTaxon(input);
    expect(result.bean).toBe(top);
    expect(result.rule).toBe(TWICE_OF_SECOND_BEAN);
  });

  test("[4, 2] hits the >= boundary and returns rule TWICE_OF_SECOND_BEAN", () => {
    const input = beans(4, 2);
    const top = input[0];
    const result = BeanSelectionRules.getMostProbableTaxon(input);
    expect(result.bean).toBe(top);
    expect(result.rule).toBe(TWICE_OF_SECOND_BEAN);
  });

  test("[5, 3] is below twice the second and returns rule NO_BEANS", () => {
    expect(BeanSelectionRules.getMostProbableTaxon(beans(5, 3))).toEqual({
      bean: undefined,
      rule: NO_BEANS,
    });
  });

  test("[3, 3] tie returns rule NO_BEANS", () => {
    expect(BeanSelectionRules.getMostProbableTaxon(beans(3, 3))).toEqual({
      bean: undefined,
      rule: NO_BEANS,
    });
  });

  test("[2, 6] picks the 6-occurrence bean regardless of input order", () => {
    const input = beans(2, 6);
    const six = input[1];
    const result = BeanSelectionRules.getMostProbableTaxon(input);
    expect(result.bean).toBe(six);
    expect(result.rule).toBe(TWICE_OF_SECOND_BEAN);
  });

  test("only the top two beans are compared ([6, 3, 3])", () => {
    const input = beans(6, 3, 3);
    const result = BeanSelectionRules.getMostProbableTaxon(input);
    expect(result.bean?.occurrences).toBe(6);
    expect(result.rule).toBe(TWICE_OF_SECOND_BEAN);
  });

  // BUG-U03: the caller's array used to be sorted in place.
  test("BUG-U03: does not mutate the caller's array", () => {
    const input = Object.freeze(beans(2, 6)) as ConsensusBean[];
    const result = BeanSelectionRules.getMostProbableTaxon(input);
    expect(result.bean?.occurrences).toBe(6);
    expect(result.rule).toBe(TWICE_OF_SECOND_BEAN);
    expect(input.map((b) => b.occurrences)).toEqual([2, 6]);
  });
});

describe("BeanSelectionRules.getRuleKind", () => {
  it("null or empty beans are 'unresolved'", () => {
    expect(BeanSelectionRules.getRuleKind(null)).toBe("unresolved");
    expect(BeanSelectionRules.getRuleKind(undefined)).toBe("unresolved");
    expect(BeanSelectionRules.getRuleKind([])).toBe("unresolved");
  });

  it("a single bean is 'unanimous'", () => {
    expect(BeanSelectionRules.getRuleKind(beans(3))).toBe("unanimous");
  });

  it("a top bean with at least twice the runner-up is 'majority'", () => {
    expect(BeanSelectionRules.getRuleKind(beans(4, 2))).toBe("majority");
    expect(BeanSelectionRules.getRuleKind(beans(1, 9, 3))).toBe("majority");
  });

  it("several beans without a 2x winner are 'ambiguous' (rule 0 with beans)", () => {
    expect(BeanSelectionRules.getRuleKind(beans(5, 4))).toBe("ambiguous");
    expect(BeanSelectionRules.getMostProbableTaxon(beans(5, 4)).rule).toBe(NO_BEANS);
  });

  it("every kind has a one-word label, a summary and an explanation", () => {
    for (const kind of BeanSelectionRules.RULE_KINDS) {
      const info = BeanSelectionRules.RULE_INFO[kind];
      expect(info.label).toMatch(/^[A-Z][a-z]+$/);
      expect(info.summary).not.toHaveLength(0);
      expect(info.explanation).not.toHaveLength(0);
    }
    expect(BeanSelectionRules.RULE_KINDS).toEqual([
      "unanimous",
      "majority",
      "ambiguous",
      "unresolved",
    ]);
  });
});
