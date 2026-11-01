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

// Each bean is rendered as a card whose first child holds the name and count.
function beanCards() {
  return Array.from(
    screen.getByRole("dialog").querySelectorAll<HTMLElement>("div.p-4.border-t")
  );
}

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

  test("the header shows the query (portaled dialog)", () => {
    const { container } = renderModal(fixture("S2_rule-two"));
    const dialog = screen.getByRole("dialog");
    expect(container).not.toContainElement(dialog);
    expect(within(dialog).getByRole("heading")).toHaveTextContent(/^S2_rule-two$/);
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

    const nameCopy = within(first).getByText("Bacillus subtilis").parentElement!.querySelector("svg")!;
    userEvent.click(nameCopy);
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("Bacillus subtilis");

    const accCopy = within(first).getByText("Accessions").querySelector("svg")!;
    userEvent.click(accCopy);
    expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("A1 A2 A3 A4");
  });

  test("taxon null renders the dialog with an empty body", () => {
    renderModal(fixture("S1_no-hit"));
    expect(screen.getByRole("dialog")).toHaveTextContent(/^S1_no-hit$/);
    expect(beanCards()).toHaveLength(0);
  });

  test("the close button calls setOpenModal", () => {
    const { setOpenModal } = renderModal(fixture("S1_single"));
    userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(setOpenModal).toHaveBeenCalledTimes(1);
  });

  // BUG-U02: `result?.taxon?.consensusBeans.map` used to guard only taxon; the
  // children are evaluated even when the modal is closed.
  test("BUG-U02: taxon with consensusBeans null renders an empty body", () => {
    const result = nullBeans.results[0] as unknown as Result;
    renderModal(result);
    expect(screen.getByRole("dialog")).toHaveTextContent(/^S9_null-beans$/);
    expect(beanCards()).toHaveLength(0);
  });
});
