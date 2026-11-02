import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "@/types/BlutilsResult";
import small from "@/__fixtures__/small.result.json";
import nullBeans from "@/__fixtures__/null-beans.result.json";
import { ConsensusModal } from "./ConsensusModal";

function fixture(query: string): Result {
  const found = small.results.find((r) => r.query === query);
  return JSON.parse(JSON.stringify(found)) as Result;
}

function renderModal(result: Result | undefined, openModal = true) {
  const setOpenModal = jest.fn();
  const utils = render(
    <ConsensusModal result={result} openModal={openModal} setOpenModal={setOpenModal} />
  );
  return { ...utils, setOpenModal };
}

const dialog = () => screen.getByRole("dialog");
const section = (name: string | RegExp) => within(dialog()).getByRole("region", { name });
const sectionNames = () =>
  within(dialog())
    .queryAllByRole("region")
    .map((s) => s.getAttribute("aria-label"));
const beanCards = () => within(dialog()).queryAllByTestId("bean-card");

describe("ConsensusModal", () => {
  test("result undefined renders nothing", () => {
    const { container } = renderModal(undefined);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("openModal false renders nothing", () => {
    renderModal(fixture("S2_rule-two"), false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("the header shows the query with a copy icon (portaled dialog)", () => {
    const { container } = renderModal(fixture("S2_rule-two"));
    expect(container).not.toContainElement(dialog());
    const heading = within(dialog()).getByRole("heading", { name: "S2_rule-two" });
    // eslint-disable-next-line testing-library/no-node-access
    userEvent.click(heading.querySelector("svg")!);
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("S2_rule-two");
  });

  test("shows every row field in order, the rule right above the consensus beans", () => {
    renderModal(fixture("S2_rule-two"));
    expect(sectionNames()).toEqual([
      "Proposed taxon",
      "Composition",
      "Taxonomy",
      "Details",
      "Rule",
      "Consensus beans (2)",
    ]);
  });

  test("proposed taxon: sciname at the reached rank and the most probable bean", () => {
    renderModal(fixture("S2_rule-two"));
    const proposed = section("Proposed taxon");
    expect(within(proposed).getByText("Bacillus")).toHaveClass("italic");
    expect(within(proposed).getByText("Genus")).toBeInTheDocument();
    expect(proposed).toHaveTextContent("Most probable: Bacillus subtilis");
  });

  test("composition: identity, bit score and one bar segment per bean", () => {
    renderModal(fixture("S2_rule-two"));
    const composition = section("Composition");
    expect(within(composition).getByTestId("composition")).toBeInTheDocument();
    expect(within(composition).getAllByTestId("composition-segment")).toHaveLength(2);
  });

  test("rule: the word, its summary and its explanation", () => {
    renderModal(fixture("S2_rule-two"));
    const rule = section("Rule");
    expect(within(rule).getByText("Majority")).toBeInTheDocument();
    expect(rule).toHaveTextContent("Twice the occurrences of the second most frequent taxon");
    expect(rule).toHaveTextContent(/at least twice the occurrences of the runner-up/);
  });

  test("taxonomy: one rank per line, rank then name", () => {
    renderModal(fixture("S1_single"));
    const taxonomy = section("Taxonomy");
    const ranks = within(taxonomy).getAllByRole("term").map((t) => t.textContent);
    const names = within(taxonomy).getAllByRole("definition").map((d) => d.textContent);
    expect(ranks).toEqual(["Domain", "Phylum", "Class", "Order", "Family", "Genus", "Species"]);
    expect(names).toEqual([
      "Bacteria",
      "Bacillota",
      "Bacilli",
      "Bacillales",
      "Bacillaceae",
      "Bacillus",
      "Bacillus Subtilis",
    ]);
  });

  test("details: reached and max allowed rank, single match and mutated", () => {
    renderModal(fixture("S2_rule-two"));
    const details = section("Details");
    const pairs = within(details)
      .getAllByRole("term")
      .map((dt) => `${dt.textContent}=${dt.nextElementSibling?.textContent}`);
    expect(pairs).toEqual([
      "Reached rank=Genus",
      "Max allowed rank=Species",
      "Single match=No",
      "Mutated=Yes",
    ]);
  });

  test("details include the run id when present", () => {
    renderModal({ ...fixture("S1_single"), runId: "run-42" });
    expect(section("Details")).toHaveTextContent("Runrun-42");
  });

  test("one card per bean with sciname, rank, occurrences and accessions", () => {
    renderModal(fixture("S2_rule-two"));
    const cards = beanCards();
    expect(cards).toHaveLength(2);

    const [first, second] = cards;
    expect(within(first).getByText("Bacillus subtilis")).toHaveClass("italic");
    expect(within(first).getByText("Species")).toBeInTheDocument();
    expect(within(first).getByText("4")).toBeInTheDocument();
    expect(within(first).getByText("Accessions")).toBeInTheDocument();
    ["A1", "A2", "A3", "A4"].forEach((acc) =>
      expect(within(first).getByText(acc)).toBeInTheDocument()
    );

    expect(within(second).getByText("Bacillus cereus")).toBeInTheDocument();
    expect(within(second).getByText("2")).toBeInTheDocument();
    expect(within(second).getByText("B1")).toBeInTheDocument();
    expect(within(second).getByText("B2")).toBeInTheDocument();
  });

  test("non-italic ranks render the plain name", () => {
    renderModal(fixture("S3_species-group"));
    const [card] = beanCards();
    const name = within(card).getByText("Bacillus Subtilis Group");
    expect(name).not.toHaveClass("italic");
    expect(within(card).getByText("Species Group")).toBeInTheDocument();
  });

  test("copy icons write the sciname and the space-joined accessions", () => {
    renderModal(fixture("S2_rule-two"));
    const [first] = beanCards();

    // eslint-disable-next-line testing-library/no-node-access
    const nameCopy = within(first).getByText("Bacillus subtilis").parentElement!.querySelector("svg")!;
    userEvent.click(nameCopy);
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("Bacillus subtilis");

    // eslint-disable-next-line testing-library/no-node-access
    const accCopy = within(first).getByText("Accessions").querySelector("svg")!;
    userEvent.click(accCopy);
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("A1 A2 A3 A4");
  });

  test("taxon null shows 'No significant match' and no sections", () => {
    renderModal(fixture("S1_no-hit"));
    expect(dialog()).toHaveTextContent("No significant match");
    expect(sectionNames()).toEqual([]);
    expect(beanCards()).toHaveLength(0);
  });

  test("the close button calls setOpenModal", () => {
    const { setOpenModal } = renderModal(fixture("S1_single"));
    userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(setOpenModal).toHaveBeenCalledTimes(1);
  });

  // BUG-U02: `result?.taxon?.consensusBeans.map` used to guard only taxon.
  test("BUG-U02: taxon with consensusBeans null renders the summary without beans", () => {
    const result = nullBeans.results[0] as unknown as Result;
    renderModal(result);
    expect(within(dialog()).getByRole("heading", { name: "S9_null-beans" })).toBeInTheDocument();
    expect(within(section("Rule")).getByText("Unresolved")).toBeInTheDocument();
    expect(within(section("Composition")).queryAllByTestId("composition-segment")).toHaveLength(0);
    expect(beanCards()).toHaveLength(0);
    expect(sectionNames()).not.toContainEqual(expect.stringMatching(/^Consensus beans/));
  });

  test("Escape closes the dialog", () => {
    const { setOpenModal } = renderModal(fixture("S1_single"));
    userEvent.keyboard("{escape}");
    expect(setOpenModal).toHaveBeenCalledTimes(1);
  });

  test("a click outside the dialog (on the backdrop) closes it", () => {
    const { setOpenModal } = renderModal(fixture("S1_single"));
    // eslint-disable-next-line testing-library/no-node-access
    const backdrop = dialog().parentElement!.closest('[data-testid="modal-overlay"]') ?? dialog().parentElement!;
    userEvent.click(backdrop);
    expect(setOpenModal).toHaveBeenCalled();
  });
});

