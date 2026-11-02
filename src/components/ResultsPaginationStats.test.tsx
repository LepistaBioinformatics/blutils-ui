import { render, screen } from "@testing-library/react";
import { ViewType } from "@/types/ViewType";
import { ResultsPaginationStats } from "./ResultsPaginationStats";

function cellTexts() {
  return screen.getAllByRole("cell").map((cell) => cell.textContent);
}

describe("ResultsPaginationStats", () => {
  test("Table view reads 'N records'", () => {
    render(<ResultsPaginationStats total={42} groups={5} groupedBy={ViewType.Table} />);
    expect(cellTexts()).toEqual(["42", "records"]);
  });

  test.each([ViewType.GroupedBySubject, ViewType.GroupedByTaxonomy])(
    "%s view reads 'N in M groups'",
    (view) => {
      render(<ResultsPaginationStats total={42} groups={7} groupedBy={view} />);
      expect(cellTexts()).toEqual(["42", "in", "7", "groups"]);
    }
  );

  test("renders zero totals", () => {
    render(<ResultsPaginationStats total={0} groups={0} groupedBy={ViewType.Table} />);
    expect(cellTexts()).toEqual(["0", "records"]);
  });
});
