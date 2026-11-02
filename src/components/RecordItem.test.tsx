import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "@/types/BlutilsResult";
import { makeResult, makeTaxon } from "@/test-utils";
import small from "@/__fixtures__/small.result.json";
import nullBeans from "@/__fixtures__/null-beans.result.json";
import { RecordHeader, RecordItem, RECORD_GRID } from "./RecordItem";

function fixture(query: string): Result {
  const found = (small.results as unknown as Result[]).find((r) => r.query === query)!;
  // deep copy so a test never mutates the shared fixture
  return JSON.parse(JSON.stringify(found));
}

function renderItem(record: Result) {
  const onOpenDetails = jest.fn();
  render(<RecordItem record={record} onOpenDetails={onOpenDetails} />);
  return { onOpenDetails, item: screen.getByRole("article", { name: record.query }) };
}

// Grid children, in column order: query, proposed taxon, rule, composition.
function columns(item: HTMLElement) {
  return Array.from(item.children) as HTMLElement[];
}

describe("RecordHeader", () => {
  test("labels the four columns on the shared grid", () => {
    render(<RecordHeader />);
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "Query",
      "Proposed taxon",
      "Rule",
      "Composition",
    ]);
    expect(screen.getByRole("row").className).toContain(RECORD_GRID);
  });
});

describe("RecordItem", () => {
  test("is an article on the same grid as the header", () => {
    const { item } = renderItem(fixture("S2_rule-two"));
    expect(item.className).toContain(RECORD_GRID);
    expect(columns(item)).toHaveLength(4);
  });

  test("the query column shows the title, the rank chip and the readable lineage", () => {
    const { item } = renderItem(fixture("S2_rule-two"));
    const [query] = columns(item);
    expect(within(query).getByRole("button", { name: "S2_rule-two" })).toBeInTheDocument();
    expect(query).toHaveTextContent("Genus");
    const lineage = within(query).getByTitle(
      "Bacteria > Bacillota > Bacilli > Bacillales > Bacillaceae > Bacillus"
    );
    expect(lineage).toHaveTextContent(
      /^Bacteria › Bacillota › Bacilli › Bacillales › Bacillaceae › Bacillus$/
    );
  });

  test("the proposed taxon column shows the sciname and the differing most probable bean", () => {
    const { item } = renderItem(fixture("S2_rule-two"));
    const proposed = columns(item)[1];
    const lines = Array.from(proposed.children).map((c) => c.textContent);
    expect(lines).toEqual(["Bacillus", "Bacillus subtilis"]);
    // genus and species are italic scinames
    expect(proposed.querySelectorAll("span.italic")).toHaveLength(2);
  });

  test("no secondary line when the most probable bean is the proposed taxon", () => {
    const { item } = renderItem(fixture("S1_single"));
    const proposed = columns(item)[1];
    expect(Array.from(proposed.children).map((c) => c.textContent)).toEqual([
      "Bacillus subtilis",
    ]);
  });

  // BUG-U12: with rule 0 the bean is undefined; the old Row compared
  // `undefined !== taxon.identifier` and rendered an empty secondary span.
  test("BUG-U12: an ambiguous record (rule 0) renders no secondary bean line", () => {
    const { item } = renderItem(fixture("S2_tie"));
    const proposed = columns(item)[1];
    expect(proposed.children).toHaveLength(1);
    expect(proposed).toHaveTextContent(/^Bacillus$/);
    expect(within(item).getByRole("button", { name: /^Rule: Ambiguous/ })).toBeInTheDocument();
  });

  test.each([
    ["S1_single", "Unanimous"],
    ["S2_rule-two", "Majority"],
    ["S2_tie", "Ambiguous"],
  ])("%s shows the rule word %s", (query, word) => {
    const { item } = renderItem(fixture(query));
    expect(columns(item)[2]).toHaveTextContent(word);
  });

  test("an empty bean list is 'Unresolved'", () => {
    const { item } = renderItem(
      makeResult({ query: "q", taxon: makeTaxon({ consensusBeans: [] }) })
    );
    expect(columns(item)[2]).toHaveTextContent("Unresolved");
  });

  test("the composition column holds identity, bit score and the bar", () => {
    const { item } = renderItem(fixture("S2_rule-two"));
    const composition = within(columns(item)[3]).getByTestId("composition");
    expect(composition).toHaveTextContent(/^99\.4%845bits/);
    expect(within(composition).getAllByTestId("composition-segment")).toHaveLength(2);
  });

  test("a record without a taxon shows 'No significant match' and nothing else", () => {
    const { item } = renderItem(fixture("S1_no-hit"));
    expect(columns(item)).toHaveLength(2);
    expect(columns(item)[1]).toHaveTextContent(/^No significant match$/);
    expect(within(item).queryByTestId("composition")).not.toBeInTheDocument();
    expect(within(item).queryByRole("button", { name: /^Rule:/ })).not.toBeInTheDocument();
    // no rank chip or lineage under the title
    expect(columns(item)[0]).toHaveTextContent(/^S1_no-hit$/);
  });

  test("clicking the query title opens the details", () => {
    const record = fixture("S2_rule-two");
    const { onOpenDetails } = renderItem(record);
    userEvent.click(screen.getByRole("button", { name: "S2_rule-two" }));
    expect(onOpenDetails).toHaveBeenCalledWith(record);
  });

  test("the copy icon writes the query to the clipboard and does not open the details", () => {
    const { item, onOpenDetails } = renderItem(fixture("S2_tie"));
    userEvent.click(columns(item)[0].querySelector("svg")!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("S2_tie");
    expect(onOpenDetails).not.toHaveBeenCalled();
  });

  test("query names are shown verbatim", () => {
    renderItem(makeResult({ query: "S1_no-hit_x.1" }));
    expect(screen.getByRole("button", { name: "S1_no-hit_x.1" })).toBeInTheDocument();
  });

  // BUG-U02: `taxon.consensusBeans` is `Option` in Rust; null used to crash the
  // row renderers that reduced over it.
  test("BUG-U02: a taxon with consensusBeans null renders the entry", () => {
    const record = nullBeans.results[0] as unknown as Result;
    const { item } = renderItem(record);
    expect(within(item).getByRole("button", { name: record.query })).toBeInTheDocument();
    expect(columns(item)[2]).toHaveTextContent("Unresolved");
    const composition = within(item).getByTestId("composition");
    expect(within(composition).queryAllByTestId("composition-segment")).toHaveLength(0);
    expect(within(composition).getByRole("img")).toHaveAttribute(
      "aria-label",
      "Composition: no consensus beans"
    );
  });
});
