import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeResult, makeTaxon, triggerIntersection } from "@/test-utils";
import { Result } from "@/types/BlutilsResult";
import { ResultsGroupedByTaxonomy } from "@/types/GroupedResults";
import { ViewType } from "@/types/ViewType";
import small from "@/__fixtures__/small.result.json";
import nullBeans from "@/__fixtures__/null-beans.result.json";
import { Grouped } from "./Grouped";

// Tooltips are covered by Row/MiniChart/TaxonomyCell tests. Here floating-ui
// positioning only makes every test take over a second; render content inline.
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

function fixtureResults(): Result[] {
  // deep copy so a test never mutates the shared fixture
  return JSON.parse(JSON.stringify(small.results)) as Result[];
}

function group(name: string, chunk: Result[]): ResultsGroupedByTaxonomy {
  return {
    name,
    rank: chunk[0].taxon?.reachedRank || "",
    taxonomy: chunk[0].taxon?.taxonomy || "",
    groupedBy: ViewType.GroupedByTaxonomy,
    chunk,
  };
}

// Same shape Results/index.tsx builds for the taxonomy view (key = taxon
// identifier, sorted by name). Taxon-less results, which the page puts in an
// "Unidentified" group, are left out here and covered by dedicated tests.
function groupsFromFixture(): ResultsGroupedByTaxonomy[] {
  const byKey: Record<string, Result[]> = {};
  fixtureResults().forEach((r) => {
    const key = r.taxon?.identifier;
    if (!key) return;
    (byKey[key] ||= []).push(r);
  });
  return Object.entries(byKey)
    .map(([name, chunk]) => group(name, chunk))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function manyResults(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeResult({ query: `Q${i}`, taxon: makeTaxon() })
  );
}

async function renderGrouped(results: ResultsGroupedByTaxonomy[], pageSize = 10) {
  const utils = render(<Grouped results={results} pageSize={pageSize} />);
  await act(async () => {});
  return utils;
}

async function showSections() {
  act(() => triggerIntersection(true));
  // let floating-ui settle the tooltips that just mounted
  await act(async () => {});
}

function section(name: string) {
  return document.getElementById(name) as HTMLElement;
}

// item row = the div holding the query button
function itemRow(query: string) {
  return screen.getByText(query, { selector: "button" }).parentElement!.parentElement as HTMLElement;
}

describe("GroupedByTaxonomyView/Grouped", () => {
  test("the aside lists one anchor per group with sciname and count", async () => {
    await renderGrouped(groupsFromFixture());
    const links = Array.from(document.querySelectorAll("aside a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "#bacillaceae",
      "#bacillus",
      "#bacillus-subtilis",
      "#bacillus-subtilis-group",
    ]);
    expect(links.map((a) => a.getAttribute("title"))).toEqual([
      "bacillaceae",
      "bacillus",
      "bacillus-subtilis",
      "bacillus-subtilis-group",
    ]);
    expect(links.map((a) => a.textContent)).toEqual([
      "Bacillaceaex1",
      "Bacillusx2",
      "Bacillus subtilisx1",
      "Bacillus Subtilis Groupx1",
    ]);
  });

  test("each anchor targets a section with the same id", async () => {
    await renderGrouped(groupsFromFixture());
    Array.from(document.querySelectorAll("aside a")).forEach((a) =>
      expect(section(a.getAttribute("title")!)).not.toBeNull()
    );
  });

  test("containerHeight: n·40 for n ≤ pageSize, 80 for a single record, pageSize·40 above it", async () => {
    await renderGrouped(
      [
        group("one", manyResults(1)),
        group("three", manyResults(3)),
        group("ten", manyResults(10)),
        group("twelve", manyResults(12)),
      ],
      10
    );
    // section minHeight = containerHeight + 129
    expect(section("one")).toHaveStyle({ minHeight: "209px" });
    expect(section("three")).toHaveStyle({ minHeight: "249px" });
    expect(section("ten")).toHaveStyle({ minHeight: "529px" });
    expect(section("twelve")).toHaveStyle({ minHeight: "529px" });
  });

  test("items are rendered only after the section intersects", async () => {
    await renderGrouped(groupsFromFixture());
    expect(screen.queryByText("S2_rule-two")).not.toBeInTheDocument();
    await showSections();
    ["S1_single", "S2_rule-two", "S2_tie", "S3_many-beans", "S3_species-group"].forEach((q) =>
      expect(screen.getByText(q, { selector: "button" })).toBeInTheDocument()
    );
  });

  test("the section header shows sciname, rank, count and the taxonomy cell", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    const header = section("bacillus").querySelector("h3")!;
    expect(header).toHaveTextContent(/^BacillusGenusx2/);
    expect(header).toHaveTextContent("Bacillota");
    expect(header).toHaveTextContent("Bacillales");
  });

  test("large groups are virtualized to pageSize + 1 items", async () => {
    await renderGrouped([group("twelve", manyResults(12))], 10);
    await showSections();
    expect(within(section("twelve")).getAllByRole("button").map((b) => b.textContent)).toEqual(
      Array.from({ length: 11 }, (_, i) => `Q${i}`)
    );
  });

  test("rule 2 item: most probable bean, orange rule, identity, bitScore and chart", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    const row = itemRow("S2_rule-two");
    expect(row.querySelector("span.italic")).toHaveTextContent(/^Bacillus subtilis$/);
    const rule = within(row).getByText("2").closest("div.min-w-\\[10px\\]") as HTMLElement;
    expect(rule.style.color).toBe("orange");
    expect(row).toHaveTextContent("99.4%");
    expect(row).toHaveTextContent("845");
    expect(row.querySelectorAll(".rounded-md.h-5")).toHaveLength(2);
  });

  test("rule 1 item: green rule", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    const row = itemRow("S1_single");
    const rule = within(row).getByText("1").closest("div.min-w-\\[10px\\]") as HTMLElement;
    expect(rule.style.color).toBe("green");
    expect(row).toHaveTextContent("100.0%");
  });

  test("rule 0 item: no bean name and no rule, identity still shown", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    const row = itemRow("S2_tie");
    expect(row.querySelector("span.italic")).toBeNull();
    expect(row.querySelector("div.min-w-\\[10px\\]")).toBeNull();
    expect(row).toHaveTextContent("99.4%");
  });

  test("an item without a taxon shows only the query", async () => {
    const noHit = fixtureResults().find((r) => r.query === "S1_no-hit")!;
    await renderGrouped([{ ...group("Unidentified", [noHit]), rank: "no-rank" }]);
    await showSections();
    expect(itemRow("S1_no-hit")).toHaveTextContent(/^S1_no-hit$/);
  });

  // BUG-U05: the header's kebabToPlain("") used to throw for the "Unidentified"
  // group that Results/index.tsx builds since the BUG-U01 fix.
  test("BUG-U05: an 'Unidentified' group (rank \"\") renders its items", async () => {
    const noHit = fixtureResults().find((r) => r.query === "S1_no-hit")!;
    await renderGrouped([group("Unidentified", [noHit])]);
    await showSections();
    expect(itemRow("S1_no-hit")).toHaveTextContent(/^S1_no-hit$/);
  });

  test("the copy icon writes the query to the clipboard", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    const button = screen.getByText("S2_tie", { selector: "button" });
    userEvent.click(button.parentElement!.querySelector("svg")!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("S2_tie");
  });

  test("clicking a query opens the consensus modal; Close dismisses it", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    userEvent.click(screen.getByText("S2_rule-two", { selector: "button" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("h3")).toHaveTextContent("S2_rule-two");
    expect(within(dialog).getByText("A1")).toBeInTheDocument();
    userEvent.click(within(dialog).getByLabelText("Close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // BUG-U02: `record.taxon?.consensusBeans.reduce` used to guard only taxon and
  // runs while building the items array, before any intersection.
  test("BUG-U02: a taxon with consensusBeans null renders the item", async () => {
    const chunk = nullBeans.results as unknown as Result[];
    await renderGrouped([{ ...group("bacillus", chunk), taxonomy: "" }]);
    await showSections();
    expect(screen.getByText("S9_null-beans", { selector: "button" })).toBeInTheDocument();
  });
});
