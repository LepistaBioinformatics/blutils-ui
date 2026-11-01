import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeResult, makeTaxon, triggerIntersection } from "@/test-utils";
import { Result } from "@/types/BlutilsResult";
import { ResultsGroupedByQuery } from "@/types/GroupedResults";
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

function group(name: string, chunk: Result[]): ResultsGroupedByQuery {
  return {
    name,
    rank: chunk[0].taxon?.reachedRank || "",
    groupedBy: ViewType.GroupedBySubject,
    chunk,
  };
}

// Same shape Results/index.tsx builds for "Grouped by Subject" with break
// character "_": key = query prefix, rank = first record's reachedRank.
function groupsFromFixture(): ResultsGroupedByQuery[] {
  const byKey: Record<string, Result[]> = {};
  fixtureResults().forEach((r) => {
    const key = r.query.split("_")[0];
    (byKey[key] ||= []).push(r);
  });
  return Object.entries(byKey)
    .map(([name, chunk]) => group(name, chunk))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Without a break character every query is its own group.
function groupsPerQuery(): ResultsGroupedByQuery[] {
  return fixtureResults()
    .map((r) => group(r.query, [r]))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function manyResults(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeResult({ query: `Q${i}`, taxon: makeTaxon() })
  );
}

async function renderGrouped(results: ResultsGroupedByQuery[], pageSize = 10) {
  const utils = render(<Grouped results={results} pageSize={pageSize} />);
  await act(async () => {});
  return utils;
}

async function showSections() {
  act(() => triggerIntersection(true));
  await act(async () => {});
}

function section(name: string) {
  return document.getElementById(name) as HTMLElement;
}

function itemRow(query: string) {
  return screen.getByText(query, { selector: "button" }).parentElement!.parentElement as HTMLElement;
}

describe("GroupedByQueryView/Grouped", () => {
  test("the aside lists one anchor per group with name and count", async () => {
    await renderGrouped(groupsFromFixture());
    const links = Array.from(document.querySelectorAll("aside a"));
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#S1", "#S2", "#S3"]);
    expect(links.map((a) => a.getAttribute("title"))).toEqual(["S1", "S2", "S3"]);
    expect(links.map((a) => a.textContent)).toEqual(["S1x2", "S2x2", "S3x2"]);
    links.forEach((a) => expect(section(a.getAttribute("title")!)).not.toBeNull());
  });

  // BUG-U18: query names used to go through kebabToScinameString with the first
  // record's rank ("S1_no-hit" -> "S1_no Hit").
  test("BUG-U18: query names are shown verbatim", async () => {
    await renderGrouped(groupsPerQuery());
    const links = Array.from(document.querySelectorAll("aside a"));
    expect(links.map((a) => a.firstElementChild!.textContent)).toEqual(
      links.map((a) => a.getAttribute("title"))
    );
    await showSections();
    expect(section("S2_rule-two").querySelector("h3")).toHaveTextContent(/^S2_rule-twox1$/);
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
    expect(section("one")).toHaveStyle({ minHeight: "209px" });
    expect(section("three")).toHaveStyle({ minHeight: "249px" });
    expect(section("ten")).toHaveStyle({ minHeight: "529px" });
    expect(section("twelve")).toHaveStyle({ minHeight: "529px" });
  });

  test("items are rendered only after the section intersects", async () => {
    await renderGrouped(groupsFromFixture());
    expect(screen.queryByText("S1_single")).not.toBeInTheDocument();
    await showSections();
    small.results.forEach(({ query }) =>
      expect(screen.getByText(query, { selector: "button" })).toBeInTheDocument()
    );
  });

  test("the section header shows the name and count only (no rank, no taxonomy)", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    expect(section("S2").querySelector("h3")).toHaveTextContent(/^S2x2$/);
  });

  test("large groups are virtualized to pageSize + 1 items", async () => {
    await renderGrouped([group("twelve", manyResults(12))], 10);
    await showSections();
    expect(within(section("twelve")).getAllByRole("button").map((b) => b.textContent)).toEqual(
      Array.from({ length: 11 }, (_, i) => `Q${i}`)
    );
  });

  test("item rows: most probable bean, coloured rule, identity, bitScore and chart", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();

    const ruleTwo = itemRow("S2_rule-two");
    expect(ruleTwo.querySelector("span.italic")).toHaveTextContent(/^Bacillus subtilis$/);
    const rule = within(ruleTwo).getByText("2").closest("div.min-w-\\[10px\\]") as HTMLElement;
    expect(rule.style.color).toBe("orange");
    expect(ruleTwo).toHaveTextContent("99.4%");
    expect(ruleTwo).toHaveTextContent("845");
    expect(ruleTwo.querySelectorAll(".rounded-md.h-5")).toHaveLength(2);

    const single = itemRow("S1_single");
    const green = within(single).getByText("1").closest("div.min-w-\\[10px\\]") as HTMLElement;
    expect(green.style.color).toBe("green");

    const tie = itemRow("S2_tie");
    expect(tie.querySelector("div.min-w-\\[10px\\]")).toBeNull();
    expect(tie).toHaveTextContent("99.4%");

    expect(itemRow("S1_no-hit")).toHaveTextContent(/^S1_no-hit$/);
  });

  test("the copy icon writes the query to the clipboard", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    const button = screen.getByText("S3_many-beans", { selector: "button" });
    userEvent.click(button.parentElement!.querySelector("svg")!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("S3_many-beans");
  });

  test("clicking a query opens the consensus modal; Close dismisses it", async () => {
    await renderGrouped(groupsFromFixture());
    await showSections();
    userEvent.click(screen.getByText("S2_rule-two", { selector: "button" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("h3")).toHaveTextContent("S2_rule-two");
    expect(within(dialog).getByText("B2")).toBeInTheDocument();
    userEvent.click(within(dialog).getByLabelText("Close"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // BUG-U02: `record.taxon?.consensusBeans.reduce` used to guard only taxon and
  // runs while building the items array, before any intersection.
  test("BUG-U02: a taxon with consensusBeans null renders the item", async () => {
    const chunk = nullBeans.results as unknown as Result[];
    await renderGrouped([group("S9", chunk)]);
    await showSections();
    expect(screen.getByText("S9_null-beans", { selector: "button" })).toBeInTheDocument();
  });
});
