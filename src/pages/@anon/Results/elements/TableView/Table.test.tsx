import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Result } from "@/types/BlutilsResult";
import { ResultsGroupedByTaxonomy } from "@/types/GroupedResults";
import { ViewType } from "@/types/ViewType";
import small from "@/__fixtures__/small.result.json";
import { Table } from "./Table";

// Tooltips are covered by Row/MiniChart/TaxonomyCell tests. Here they only cost
// time: floating-ui positions ~10 tooltips per row on every update, which
// makes each test take seconds. Render the content inline instead.
jest.mock("flowbite-react", () => {
  const actual = jest.requireActual("flowbite-react");
  return {
    ...actual,
    Tooltip: ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => (
      <>
        <div data-testid="flowbite-tooltip-target">{children}</div>
        <div data-testid="flowbite-tooltip">{content}</div>
      </>
    ),
  };
});

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

async function renderTable(records = groupsFromFixture(), pageSize = 10) {
  const handlePageSize = jest.fn();
  const utils = render(
    <Table records={records} pageSize={pageSize} handlePageSize={handlePageSize} />
  );
  await settle();
  return { ...utils, handlePageSize };
}

// let floating-ui settle its async position updates (tooltips, dropdowns)
async function settle() {
  await act(async () => {});
}

function queries() {
  const body = screen.getByTestId("table-element").querySelector("tbody")!;
  return Array.from(body.querySelectorAll("button")).map((b) => b.textContent);
}

// ResultsPaginationStats renders "<total> in <groups> pages"
function stats(container: HTMLElement) {
  const cells = container.querySelector("table")!.querySelectorAll("td");
  return Array.from(cells)
    .map((td) => td.textContent)
    .join(" ");
}

// Role queries over the whole table are slow (many tooltips), so the helpers
// below use text/selector queries instead.
function pagination() {
  return document.querySelector("nav") as HTMLElement;
}

function pageButton(name: string) {
  return within(pagination()).getByText(name, { selector: "button" });
}

function dropdownTrigger(label: string) {
  return screen.getByText(label).closest("button") as HTMLButtonElement;
}

function menuItems() {
  return Array.from(document.querySelectorAll('[role="menuitem"]')).map((i) => i.textContent);
}

function menuItem(name: string) {
  return screen.getByText(name, { selector: '[role="menuitem"] button' });
}

function currentPageItem() {
  return pagination().querySelector('li[aria-current="page"]');
}

async function search(header: "Query" | "Proposed Taxon", term: string) {
  userEvent.click(screen.getByText(header));
  const input = screen.getByPlaceholderText("Search...");
  userEvent.type(input, term);
  fireEvent.blur(input);
  await settle();
}

async function chooseUnmatched(current: string, option: string) {
  userEvent.click(dropdownTrigger(`Unmatched > ${current}`));
  await settle();
  userEvent.click(menuItem(option));
  await settle();
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
  test("renders every record on page 1 with the headers", async () => {
    const { container } = await renderTable();
    expect(queries()).toEqual(ALL_QUERIES);
    ["Query", "Proposed Taxon", "Rule", "Rank", "Identity (%)", "BitScore", "Composition"].forEach(
      (h) => expect(screen.getByText(h)).toBeInTheDocument()
    );
    expect(stats(container)).toBe("6 in 1 pages");
  });

  test("pageSize counts groups, not records", async () => {
    const records = groupsFromFixture();
    // merge two groups into one with 2 records
    const merged = [
      { ...records[0], chunk: [...records[0].chunk, ...records[1].chunk] },
      ...records.slice(2),
    ];
    const { container } = await renderTable(merged, 2);
    expect(queries()).toEqual(["S1_no-hit", "S1_single", "S2_rule-two"]);
    expect(stats(container)).toBe("5 in 3 pages");
  });

  test("pagination switches the visible groups", async () => {
    const { container } = await renderTable(groupsFromFixture(), 2);
    expect(stats(container)).toBe("6 in 3 pages");
    expect(currentPageItem()).toHaveTextContent("1");

    userEvent.click(pageButton("2"));
    await settle();
    expect(queries()).toEqual(["S2_rule-two", "S2_tie"]);

    userEvent.click(pageButton("Next"));
    await settle();
    expect(queries()).toEqual(["S3_many-beans", "S3_species-group"]);
    expect(currentPageItem()).toHaveTextContent("3");
    expect(pageButton("Next")).toBeDisabled();
  });

  test("the page size dropdown offers 10/15/25/50/100 and calls handlePageSize", async () => {
    const { handlePageSize } = await renderTable();
    userEvent.click(dropdownTrigger("Page Size > 10"));
    await settle();
    expect(menuItems()).toEqual([
      "10",
      "15",
      "25",
      "50",
      "100",
    ]);
    userEvent.click(menuItem("25"));
    await settle();
    expect(handlePageSize).toHaveBeenCalledWith(25);
  });

  describe("Unmatched filter", () => {
    test("defaults to SHOW-ALSO and lists the three actions", async () => {
      await renderTable();
      userEvent.click(dropdownTrigger("Unmatched > SHOW-ALSO"));
      await settle();
      expect(menuItems()).toEqual([
        "Show Also",
        "Show Only",
        "Omit",
      ]);
    });

    test("SHOW-ONLY keeps only records without a taxon", async () => {
      const { container } = await renderTable();
      await chooseUnmatched("SHOW-ALSO", "Show Only");
      expect(dropdownTrigger("Unmatched > SHOW-ONLY")).toBeInTheDocument();
      expect(queries()).toEqual(["S1_no-hit"]);
      expect(stats(container)).toBe("1 in 1 pages");
    });

    test("OMIT drops records without a taxon (empty groups removed)", async () => {
      const { container } = await renderTable();
      await chooseUnmatched("SHOW-ALSO", "Omit");
      expect(queries()).toEqual(ALL_QUERIES.filter((q) => q !== "S1_no-hit"));
      expect(stats(container)).toBe("5 in 1 pages");
    });
  });

  describe("search", () => {
    test("query search is case-insensitive", async () => {
      const { container } = await renderTable();
      await search("Query", "s2_");
      expect(queries()).toEqual(["S2_rule-two", "S2_tie"]);
      expect(stats(container)).toBe("2 in 1 pages");
    });

    test("subject search matches the taxon identifier case-insensitively", async () => {
      await renderTable();
      await search("Proposed Taxon", "BACILLUS-SUB");
      expect(queries()).toEqual(["S1_single", "S3_species-group"]);
    });

    test("subject search never matches records without a taxon", async () => {
      await renderTable();
      await search("Proposed Taxon", "no-hit");
      expect(queries()).toEqual([]);
    });

    test("query and subject terms are combined with AND", async () => {
      await renderTable();
      await search("Query", "s1");
      await search("Proposed Taxon", "bacillus");
      expect(queries()).toEqual(["S1_single"]);
    });

    test("search combines with the Unmatched filter", async () => {
      await renderTable();
      await chooseUnmatched("SHOW-ALSO", "Omit");
      await search("Query", "s1");
      expect(queries()).toEqual(["S1_single"]);
    });

    // BUG-U04: SearchableHeadCell used to emit "" for a whitespace-only term,
    // which Table treated as a filter that matches nothing.
    test("BUG-U04: a whitespace-only term does not filter", async () => {
      await renderTable();
      await search("Query", "   ");
      expect(queries()).toEqual(ALL_QUERIES);
    });

    test("clearing the term restores every row", async () => {
      const { container } = await renderTable();
      await search("Query", "s2_");
      const clear = container.querySelectorAll("thead th")[0].querySelectorAll("svg");
      userEvent.click(clear[clear.length - 1]);
      await waitFor(() => expect(queries()).toEqual(ALL_QUERIES));
    });
  });

  // BUG-U08: currentPage used to survive a filter that shrinks the page count,
  // leaving Pagination with no current page and both arrows enabled.
  test("BUG-U08: filtering resets to page 1", async () => {
    await renderTable(groupsFromFixture(), 1);
    userEvent.click(pageButton("3"));
    await settle();
    await search("Query", "s2_");
    expect(queries()).toEqual(["S2_rule-two"]);
    expect(currentPageItem()).toHaveTextContent("1");
    expect(pageButton("Previous")).toBeDisabled();
  });

  test("BUG-U08: changing the page size resets to page 1", async () => {
    const { rerender, handlePageSize } = await renderTable(groupsFromFixture(), 1);
    userEvent.click(pageButton("3"));
    await settle();
    userEvent.click(dropdownTrigger("Page Size > 1"));
    await settle();
    userEvent.click(menuItem("15"));
    await settle();
    expect(handlePageSize).toHaveBeenCalledWith(15);

    // the parent owns pageSize; emulate it passing a page size of 2
    rerender(
      <Table records={groupsFromFixture()} pageSize={2} handlePageSize={handlePageSize} />
    );
    await settle();
    expect(currentPageItem()).toHaveTextContent("1");
    expect(queries()).toEqual(["S1_no-hit", "S1_single"]);
  });

  // BUG-U17: with zero results Pagination got totalPages=0, so Next stayed enabled
  // and moved to page 0; the table then read paginatedResults[-1] for good.
  test("BUG-U17: with zero results 'Next' is disabled and clearing the filter shows the rows", async () => {
    const { container } = await renderTable();
    await search("Query", "zzz");
    const next = pageButton("Next");
    expect(next).toBeDisabled();
    userEvent.click(next);
    await settle();

    const clear = container.querySelectorAll("thead th")[0].querySelectorAll("svg");
    userEvent.click(clear[clear.length - 1]);
    await waitFor(() => expect(queries()).toEqual(ALL_QUERIES));
  });

  test("clicking a query opens the consensus modal; Close dismisses it", async () => {
    await renderTable();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    userEvent.click(screen.getByText("S2_rule-two", { selector: "tbody button" }));
    await settle();
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("h3")).toHaveTextContent("S2_rule-two");
    expect(within(dialog).getByText("A1")).toBeInTheDocument();

    userEvent.click(within(dialog).getByLabelText("Close"));
    await settle();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("empty records: no rows and '0 in 0 pages'", async () => {
    const { container } = await renderTable([]);
    expect(queries()).toEqual([]);
    expect(stats(container)).toBe("0 in 0 pages");
  });
});
