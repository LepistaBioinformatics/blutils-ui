import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table } from "flowbite-react";
import { Result } from "@/types/BlutilsResult";
import { BeanSelectionRules } from "@/types/BeanSelectionRules";
import small from "@/__fixtures__/small.result.json";
import nullBeans from "@/__fixtures__/null-beans.result.json";
import { Row } from "./Row";

// Deep copy so a test never mutates the shared fixture.
function fixture(query: string): Result {
  const found = small.results.find((r) => r.query === query);
  return JSON.parse(JSON.stringify(found)) as Result;
}

// Table.Cell requires flowbite's Table/Table.Body context.
async function renderRow(record: Result, handleQueryDetails = jest.fn()) {
  const utils = render(
    <Table>
      <Table.Body>
        <Row record={record} handleQueryDetails={handleQueryDetails} />
      </Table.Body>
    </Table>
  );
  // let floating-ui settle its async position update
  await act(async () => {});
  return { ...utils, handleQueryDetails };
}

function firstRowCells() {
  return within(screen.getAllByRole("row")[0]).getAllByRole("cell");
}

// [query, name, rule, rank, identity, bitScore, composition]
function ruleDiv() {
  return firstRowCells()[2].firstElementChild as HTMLElement;
}

describe("Row", () => {
  test("taxon null: 'No significant match' spanning 7 columns and no taxonomy row", async () => {
    await renderRow(fixture("S1_no-hit"));
    expect(screen.getAllByRole("row")).toHaveLength(1);
    const cells = firstRowCells();
    expect(cells).toHaveLength(2);
    expect(cells[1]).toHaveTextContent("No significant match");
    expect(cells[1]).toHaveAttribute("colspan", "7");
  });

  test("renders the taxon cells: sciname, rank, identity rounded to 1 decimal, bitScore", async () => {
    await renderRow(fixture("S2_rule-two"));
    const cells = firstRowCells();
    expect(cells).toHaveLength(7);
    expect(cells[0]).toHaveTextContent("S2_rule-two");
    expect(cells[1].querySelector("span.italic")).toHaveTextContent(/^Bacillus$/);
    expect(cells[3]).toHaveTextContent(/^Genus$/);
    expect(cells[4]).toHaveTextContent(/^99\.4$/);
    expect(cells[5]).toHaveTextContent(/^845$/);
  });

  test("taxonomy present: second row with the taxonomy cell spanning 7 columns", async () => {
    await renderRow(fixture("S2_rule-two"));
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(2);
    const [cell] = within(rows[1]).getAllByRole("cell");
    expect(cell).toHaveAttribute("colspan", "7");
    expect(cell).toHaveTextContent("Bacillota");
    expect(cell).toHaveTextContent("Bacillus");
  });

  test("rule 1: green rule number, no secondary bean name", async () => {
    await renderRow(fixture("S1_single"));
    expect(ruleDiv().style.color).toBe("green");
    expect(
      within(ruleDiv()).getByTestId("flowbite-tooltip-target")
    ).toHaveTextContent(/^1$/);
    expect(within(ruleDiv()).getByTestId("flowbite-tooltip")).toHaveTextContent(
      "Only one consensus bean"
    );
    expect(firstRowCells()[1].querySelector("span.text-sm")).toBeNull();
  });

  test("rule 2: orange rule number and the most probable bean under the taxon", async () => {
    await renderRow(fixture("S2_rule-two"));
    expect(ruleDiv().style.color).toBe("orange");
    expect(
      within(ruleDiv()).getByTestId("flowbite-tooltip-target")
    ).toHaveTextContent(/^2$/);
    const secondary = firstRowCells()[1].querySelector("span.text-sm");
    expect(secondary).toHaveTextContent(/^Bacillus subtilis$/);
    expect(secondary!.querySelector("span.italic")).not.toBeNull();
  });

  test("rule 0: no colour and no number, tooltip still describes the rule", async () => {
    await renderRow(fixture("S2_tie"));
    expect(ruleDiv().style.color).toBe("");
    expect(
      within(ruleDiv()).getByTestId("flowbite-tooltip-target")
    ).toHaveTextContent(/^$/);
    expect(within(ruleDiv()).getByTestId("flowbite-tooltip")).toHaveTextContent(
      "No consensus beans"
    );
  });

  // BUG-U12: with rule 0 the bean is undefined, so `undefined !== taxon.identifier`
  // used to render an empty <span> under the taxon name.
  test("BUG-U12: rule 0 renders no secondary span", async () => {
    await renderRow(fixture("S2_tie"));
    expect(firstRowCells()[1].querySelector("span.text-sm")).toBeNull();
  });

  test("clicking the query calls handleQueryDetails with the record", async () => {
    const record = fixture("S1_single");
    const { handleQueryDetails } = await renderRow(record);
    userEvent.click(screen.getByRole("button", { name: "S1_single" }));
    expect(handleQueryDetails).toHaveBeenCalledTimes(1);
    expect(handleQueryDetails).toHaveBeenCalledWith(record);
  });

  test("the copy icon writes the query to the clipboard", async () => {
    await renderRow(fixture("S1_no-hit"));
    userEvent.click(firstRowCells()[0].querySelector("svg")!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("S1_no-hit");
  });

  test("BUG-U14: clicking the row itself does not re-render it", async () => {
    // BUG-U14: the row used to toggle a `showChildren` state that was never
    // read, re-rendering the row on every click.
    await renderRow(fixture("S2_rule-two"));
    const before = document.body.textContent;
    const spy = jest.spyOn(BeanSelectionRules, "getMostProbableTaxon");
    userEvent.click(firstRowCells()[3]);
    await act(async () => {});
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(document.body.textContent).toBe(before);
    spy.mockRestore();
  });

  test("BUG-U21: re-rendering the row keeps the rule cell mounted", async () => {
    // BUG-U21: `ConsensusTule` used to be declared inside Row's render, so every
    // render produced a new component type and remounted the rule cell.
    const record = fixture("S2_rule-two");
    const { rerender } = await renderRow(record);
    const before = ruleDiv();
    rerender(
      <Table>
        <Table.Body>
          <Row record={record} handleQueryDetails={jest.fn()} />
        </Table.Body>
      </Table>
    );
    await act(async () => {});
    expect(ruleDiv()).toBe(before);
  });

  // BUG-U02: `record.taxon?.consensusBeans.reduce` used to guard only taxon.
  test("BUG-U02: taxon with consensusBeans null renders the row", async () => {
    const record = nullBeans.results[0] as unknown as Result;
    await renderRow(record);
    expect(firstRowCells()[0]).toHaveTextContent("S9_null-beans");
  });
});
