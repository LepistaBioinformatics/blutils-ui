import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "@/types/BlutilsResult";
import { ResultsGroupedByTaxonomy } from "@/types/GroupedResults";
import { ViewType } from "@/types/ViewType";
import { makeResult, makeTaxon } from "@/test-utils";
import { TEST_ROW_HEIGHT, TEST_VIEWPORT } from "@/test-utils/virtual";
import small from "@/__fixtures__/small.result.json";
import { Table } from "./Table";

// Filtering now happens in Results (FilterBar); Table only lists what it gets.
// Search and "Unmatched" behaviors are covered in FilterBar.test.tsx and the
// Results integration tests.

// Same shape Results/index.tsx builds for the Table view: one group per query,
// sorted by name. Deep copy so a test never mutates the shared fixture.
function groupsFromFixture(): ResultsGroupedByTaxonomy[] {
  const results = JSON.parse(JSON.stringify(small.results)) as Result[];
  return results
    .map((r) => ({
      name: r.query,
      rank: r.taxon?.reachedRank || "",
      taxonomy: r.taxon?.taxonomy || "",
      groupedBy: ViewType.Table,
      chunk: [r],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function Harness({ records, total }: { records: ResultsGroupedByTaxonomy[]; total?: number }) {
  return <Table records={records} total={total ?? records.flatMap((r) => r.chunk).length} />;
}

async function renderTable(records = groupsFromFixture(), total?: number) {
  const utils = render(<Harness records={records} total={total} />);
  // let the virtualizer measure
  await act(async () => {});
  return utils;
}

function list() {
  return screen.getByLabelText("Records");
}

function mountedItems() {
  return Array.from(list().querySelectorAll("[data-index]"));
}

function queries() {
  return within(list())
    .queryAllByRole("article")
    .map((a) => a.getAttribute("aria-label"));
}

// ResultsPaginationStats: "<total> records" or "<shown> of <total> records"
function stats(container: HTMLElement) {
  const cells = container.querySelector("table")!.querySelectorAll("td");
  return Array.from(cells)
    .map((td) => td.textContent)
    .join(" ");
}

function manyGroups(count: number): ResultsGroupedByTaxonomy[] {
  return Array.from({ length: count }, (_, i) => {
    const query = `Q${String(i).padStart(4, "0")}`;
    return {
      name: query,
      rank: "genus",
      taxonomy: "",
      groupedBy: ViewType.Table,
      chunk: [makeResult({ query, taxon: makeTaxon() })],
    };
  });
}

// jsdom has no scrolling: emulate the browser moving the box and firing "scroll"
// (fireEvent is wrapped in act).
function scrollListTo(top: number) {
  const box = list();
  box.scrollTop = top;
  fireEvent.scroll(box);
}

const ALL_QUERIES = [
  "S1_no-hit",
  "S1_single",
  "S2_rule-two",
  "S2_tie",
  "S3_many-beans",
  "S3_species-group",
];

describe("Table", () => {
  test("renders every record as an entry, under the column header, with a 'records' total", async () => {
    const { container } = await renderTable();
    expect(queries()).toEqual(ALL_QUERIES);
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "Query·Taxonomy",
      "Proposed taxon",
      "Rule",
      "Composition",
    ]);
    expect(stats(container)).toBe("6 records");
  });

  test("the header sits outside the scrolling list", async () => {
    await renderTable();
    expect(list()).not.toContainElement(screen.getAllByRole("columnheader")[0]);
  });

  test("records of a group with several results are all listed", async () => {
    const records = groupsFromFixture();
    const merged = [
      { ...records[0], chunk: [...records[0].chunk, ...records[1].chunk] },
      ...records.slice(2),
    ];
    const { container } = await renderTable(merged);
    expect(queries()).toEqual(ALL_QUERIES);
    expect(stats(container)).toBe("6 records");
  });

  test("with fewer records than the total the stats read '<shown> of <total> records'", async () => {
    const { container } = await renderTable(groupsFromFixture().slice(0, 2), 6);
    expect(queries()).toEqual(["S1_no-hit", "S1_single"]);
    expect(stats(container)).toBe("2 of 6 records");
  });

  test("there is no pagination, no page size control and no table filter of its own", async () => {
    await renderTable();
    expect(document.querySelector("nav")).toBeNull();
    expect(screen.queryByText(/Page Size/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Unmatched/)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("a large record set mounts only a window of entries", async () => {
    const { container } = await renderTable(manyGroups(1000));
    await waitFor(() => expect(mountedItems().length).toBeGreaterThan(0));
    const mounted = mountedItems().length;
    expect(mounted).toBeLessThan(100);
    expect(mounted).toBeGreaterThanOrEqual(TEST_VIEWPORT.height / TEST_ROW_HEIGHT);
    expect(queries()[0]).toBe("Q0000");
    expect(stats(container)).toBe("1000 records");
  });

  test("scrolling the list mounts the entries at that offset, up to the last record", async () => {
    await renderTable(manyGroups(1000));
    await waitFor(() => expect(mountedItems().length).toBeGreaterThan(0));
    // Unmeasured entries count with the estimated height, so the end of the
    // list moves while entries get measured: keep scrolling until it shows.
    await waitFor(() => {
      scrollListTo(1_000_000);
      expect(queries()).toContain("Q0999");
    });
    expect(queries()).not.toContain("Q0000");
    expect(mountedItems().length).toBeLessThan(100);
  });

  test("new records (a changed filter) scroll the list back to the top", async () => {
    const records = manyGroups(1000);
    const { rerender } = await renderTable(records);
    await waitFor(() => expect(mountedItems().length).toBeGreaterThan(0));
    const box = list() as HTMLElement & { scrollTo: unknown };
    const scrollTo = jest.fn();
    box.scrollTo = scrollTo;

    scrollListTo(500 * TEST_ROW_HEIGHT);
    await waitFor(() => expect(queries()).not.toContain("Q0000"));

    rerender(<Harness records={records.slice(0, 900)} total={1000} />);
    await act(async () => {});
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  test("clicking a query opens the consensus modal; Close dismisses it", async () => {
    await renderTable();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: "S2_rule-two" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("h3")).toHaveTextContent("S2_rule-two");
    expect(within(dialog).getByText("A1")).toBeInTheDocument();

    userEvent.click(within(dialog).getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("empty records: no entries and '0 records'", async () => {
    const { container } = await renderTable([], 0);
    expect(queries()).toEqual([]);
    expect(stats(container)).toBe("0 records");
  });

  test("everything filtered out: no entries and '0 of 6 records'", async () => {
    const { container } = await renderTable([], 6);
    expect(queries()).toEqual([]);
    expect(stats(container)).toBe("0 of 6 records");
  });

  describe("sorting", () => {
    const shownQueries = () =>
      within(screen.getByLabelText("Records"))
        .getAllByRole("article")
        .map((a) => a.getAttribute("aria-label") ?? "");
    const natural = new Intl.Collator(undefined, { numeric: true }).compare;

    test("starts in the original order, with no column marked as sorted", async () => {
      await renderTable();
      expect(shownQueries()).toEqual(ALL_QUERIES);
      screen.getAllByRole("columnheader").forEach((h) => expect(h).not.toHaveAttribute("aria-sort"));
      expect(screen.queryByRole("button", { name: "Original order" })).not.toBeInTheDocument();
    });

    test("Query cycles ascending → descending → original order", async () => {
      await renderTable();
      const query = () => screen.getByRole("button", { name: "Sort by Query" });

      userEvent.click(query());
      expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-sort", "ascending");
      expect(shownQueries()).toEqual([...ALL_QUERIES].sort(natural));

      userEvent.click(query());
      expect(screen.getAllByRole("columnheader")[0]).toHaveAttribute("aria-sort", "descending");
      expect(shownQueries()).toEqual([...ALL_QUERIES].sort(natural).reverse());

      userEvent.click(query());
      expect(screen.getAllByRole("columnheader")[0]).not.toHaveAttribute("aria-sort");
      expect(shownQueries()).toEqual(ALL_QUERIES);
    });

    test("the 'Original order' button restores the file order", async () => {
      await renderTable();
      userEvent.click(screen.getByRole("button", { name: "Sort by Proposed taxon" }));
      expect(shownQueries()).not.toEqual(ALL_QUERIES);
      userEvent.click(screen.getByRole("button", { name: "Original order" }));
      expect(shownQueries()).toEqual(ALL_QUERIES);
      expect(screen.queryByRole("button", { name: "Original order" })).not.toBeInTheDocument();
    });

    test("Proposed taxon sorts by the taxon; records without one go last", async () => {
      await renderTable();
      userEvent.click(screen.getByRole("button", { name: "Sort by Proposed taxon" }));
      expect(screen.getAllByRole("columnheader")[1]).toHaveAttribute("aria-sort", "ascending");
      expect(screen.getAllByRole("columnheader")[0]).not.toHaveAttribute("aria-sort");
      const shown = shownQueries();
      expect(shown[shown.length - 1]).toBe("S1_no-hit");
    });

    test("Taxonomy sorts by the lineage", async () => {
      await renderTable();
      userEvent.click(screen.getByRole("button", { name: "Sort by Taxonomy" }));
      expect(screen.getByRole("button", { name: "Sort by Taxonomy" })).toHaveAttribute("aria-pressed", "true");
      // S3_many-beans stops at the family, so its lineage sorts first.
      expect(shownQueries()[0]).toBe("S3_many-beans");
      expect(shownQueries()[shownQueries().length - 1]).toBe("S1_no-hit");
    });
  });

  describe("keyboard navigation", () => {
    // `hidden`: while a dialog is open, flowbite marks the page aria-hidden.
    const highlighted = () =>
      within(screen.getByLabelText("Records"))
        .getAllByRole("article", { hidden: true })
        .filter((a) => a.getAttribute("aria-current") === "true")
        .map((a) => a.getAttribute("aria-label"));

    test("ArrowDown/ArrowUp move the highlighted record; nothing is highlighted at first", async () => {
      await renderTable();
      expect(highlighted()).toEqual([]);
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      expect(highlighted()).toEqual([ALL_QUERIES[0]]);
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      expect(highlighted()).toEqual([ALL_QUERIES[1]]);
      fireEvent.keyDown(document.body, { key: "ArrowUp" });
      expect(highlighted()).toEqual([ALL_QUERIES[0]]);
      fireEvent.keyDown(document.body, { key: "ArrowUp" });
      expect(highlighted()).toEqual([ALL_QUERIES[0]]);
    });

    test("Enter opens the details of the highlighted record", async () => {
      await renderTable();
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      fireEvent.keyDown(document.body, { key: "Enter" });
      expect(
        within(screen.getByRole("dialog")).getByRole("heading", { name: ALL_QUERIES[1] })
      ).toBeInTheDocument();
    });

    test("arrows do nothing while a dialog is open", async () => {
      await renderTable();
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      fireEvent.keyDown(document.body, { key: "Enter" });
      fireEvent.keyDown(document.body, { key: "ArrowDown" });
      expect(highlighted()).toEqual([ALL_QUERIES[0]]);
    });
  });
});

