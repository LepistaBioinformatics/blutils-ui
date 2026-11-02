import { useState } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeResult, makeTaxon } from "@/test-utils";
import { Result } from "@/types/BlutilsResult";
import { ResultsGroupedByTaxonomy } from "@/types/GroupedResults";
import { ViewType } from "@/types/ViewType";
import small from "@/__fixtures__/small.result.json";
import nullBeans from "@/__fixtures__/null-beans.result.json";
import { Grouped } from "./Grouped";

// Tooltips (the header's TaxonomyCell) are covered by TaxonomyCell tests. Here
// floating-ui positioning only slows every test down; render content inline.
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

async function renderGrouped(
  results: ResultsGroupedByTaxonomy[],
  group: string | null = null,
  onGroupChange = jest.fn()
) {
  const utils = render(<Grouped results={results} group={group} onGroupChange={onGroupChange} />);
  // let the virtualizer measure and floating-ui settle
  await act(async () => {});
  return { ...utils, onGroupChange };
}

// Owns the current group like Results/index.tsx does through `?g=`.
function StatefulGrouped({ results }: { results: ResultsGroupedByTaxonomy[] }) {
  const [group, setGroup] = useState<string | null>(null);
  return <Grouped results={results} group={group} onGroupChange={setGroup} />;
}

function sidebarEntries() {
  return within(screen.getByRole("navigation", { name: "Groups" })).getAllByRole("button");
}

function header() {
  return document.querySelector("h3") as HTMLElement;
}

function recordList() {
  return screen.getByLabelText("Group records");
}

function recordQueries() {
  return within(recordList())
    .queryAllByRole("article")
    .map((a) => a.getAttribute("aria-label"));
}

// One RecordItem entry per record
function itemRow(query: string) {
  return screen.getByRole("article", { name: query });
}

describe("GroupedByTaxonomyView/Grouped", () => {
  test("the sidebar lists one entry per group with sciname and count", async () => {
    await renderGrouped(groupsFromFixture());
    const entries = sidebarEntries();
    expect(entries.map((e) => e.getAttribute("title"))).toEqual([
      "bacillaceae",
      "bacillus",
      "bacillus-subtilis",
      "bacillus-subtilis-group",
    ]);
    expect(entries.map((e) => e.textContent)).toEqual([
      "Bacillaceaex1",
      "Bacillusx2",
      "Bacillus subtilisx1",
      "Bacillus Subtilis Groupx1",
    ]);
    expect(screen.getByRole("navigation", { name: "Groups" })).toHaveTextContent("4 groups");
  });

  test("without a group only the first group and its records are rendered", async () => {
    await renderGrouped(groupsFromFixture());
    expect(header()).toHaveTextContent(/^BacillaceaeFamilyx1/);
    expect(recordQueries()).toEqual(["S3_many-beans"]);
    expect(screen.queryByText("S2_rule-two", { selector: "button" })).not.toBeInTheDocument();
    expect(sidebarEntries()[0]).toHaveAttribute("aria-current", "page");
  });

  test("the group prop selects the rendered group and the active sidebar entry", async () => {
    await renderGrouped(groupsFromFixture(), "bacillus");
    expect(recordQueries()).toEqual(["S2_rule-two", "S2_tie"]);
    const active = sidebarEntries().filter((e) => e.getAttribute("aria-current") === "page");
    expect(active.map((e) => e.getAttribute("title"))).toEqual(["bacillus"]);
  });

  test("an unknown group falls back to the first group", async () => {
    const { onGroupChange } = await renderGrouped(groupsFromFixture(), "does-not-exist");
    expect(recordQueries()).toEqual(["S3_many-beans"]);
    // the fallback does not rewrite the URL
    expect(onGroupChange).not.toHaveBeenCalled();
  });

  test("the section header shows sciname, rank, count and the taxonomy cell", async () => {
    await renderGrouped(groupsFromFixture(), "bacillus");
    expect(header()).toHaveTextContent(/^BacillusGenusx2/);
    expect(header()).toHaveTextContent("Bacillota");
    expect(header()).toHaveTextContent("Bacillales");
  });

  test("navigation reports the target group's name", async () => {
    const { onGroupChange } = await renderGrouped(groupsFromFixture(), "bacillus");
    userEvent.click(screen.getAllByRole("button", { name: "Next group" })[0]);
    expect(onGroupChange).toHaveBeenLastCalledWith("bacillus-subtilis");
    userEvent.click(screen.getAllByRole("button", { name: "Previous group" })[0]);
    expect(onGroupChange).toHaveBeenLastCalledWith("bacillaceae");
    userEvent.click(sidebarEntries()[3]);
    expect(onGroupChange).toHaveBeenLastCalledWith("bacillus-subtilis-group");
  });

  test("Next, ArrowRight and the sidebar step through the groups", async () => {
    render(<StatefulGrouped results={groupsFromFixture()} />);
    await act(async () => {});
    expect(recordQueries()).toEqual(["S3_many-beans"]);

    userEvent.click(screen.getAllByRole("button", { name: "Next group" })[0]);
    await waitFor(() => expect(recordQueries()).toEqual(["S2_rule-two", "S2_tie"]));

    userEvent.keyboard("{arrowright}");
    await waitFor(() => expect(recordQueries()).toEqual(["S1_single"]));

    userEvent.click(sidebarEntries()[3]);
    await waitFor(() => expect(recordQueries()).toEqual(["S3_species-group"]));
    expect(screen.queryByRole("button", { name: "Next group" })).not.toBeInTheDocument();
  });

  test("a large group mounts only a window of records", async () => {
    await renderGrouped([group("thousand", manyResults(1000))]);
    await waitFor(() => expect(recordQueries().length).toBeGreaterThan(0));
    const queries = recordQueries();
    expect(queries.length).toBeLessThan(100);
    expect(queries[0]).toBe("Q0");
    expect(header()).toHaveTextContent("x1000");
  });

  test("records are RecordItem entries under the shared column header", async () => {
    await renderGrouped(groupsFromFixture(), "bacillus");
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "Query·Taxonomy",
      "Proposed taxon",
      "Rule",
      "Composition",
    ]);
    expect(recordList()).not.toContainElement(screen.getAllByRole("columnheader")[0]);
  });

  test("a majority item: proposed taxon, most probable bean, rule word and composition bar", async () => {
    await renderGrouped(groupsFromFixture(), "bacillus");
    const row = itemRow("S2_rule-two");
    expect(row).toHaveTextContent("Bacillus subtilis");
    expect(within(row).getByRole("button", { name: /^Rule: Majority/ })).toBeInTheDocument();
    const composition = within(row).getByTestId("composition");
    expect(within(composition).getAllByTestId("composition-segment")).toHaveLength(2);
    expect(composition).toHaveTextContent("99.4");
    expect(composition).toHaveTextContent("845");
  });

  test("a unanimous item", async () => {
    await renderGrouped(groupsFromFixture(), "bacillus-subtilis");
    const row = itemRow("S1_single");
    expect(within(row).getByRole("button", { name: /^Rule: Unanimous/ })).toBeInTheDocument();
    expect(row).toHaveTextContent("100.0");
  });

  test("an ambiguous item still shows identity", async () => {
    await renderGrouped(groupsFromFixture(), "bacillus");
    const row = itemRow("S2_tie");
    expect(within(row).getByRole("button", { name: /^Rule: Ambiguous/ })).toBeInTheDocument();
    expect(row).toHaveTextContent("99.4");
  });

  test("an item without a taxon shows only the query", async () => {
    const noHit = fixtureResults().find((r) => r.query === "S1_no-hit")!;
    await renderGrouped([{ ...group("Unidentified", [noHit]), rank: "no-rank" }]);
    expect(itemRow("S1_no-hit")).toHaveTextContent(/^S1_no-hitNo significant match$/);
  });

  // BUG-U05: the header's kebabToPlain("") used to throw for the "Unidentified"
  // group that Results/index.tsx builds since the BUG-U01 fix.
  test("BUG-U05: an 'Unidentified' group (rank \"\") renders its items", async () => {
    const noHit = fixtureResults().find((r) => r.query === "S1_no-hit")!;
    await renderGrouped([group("Unidentified", [noHit])]);
    expect(itemRow("S1_no-hit")).toHaveTextContent(/^S1_no-hitNo significant match$/);
  });

  test("the copy icon writes the query to the clipboard", async () => {
    await renderGrouped(groupsFromFixture(), "bacillus");
    userEvent.click(itemRow("S2_tie").querySelector("svg")!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("S2_tie");
  });

  test("clicking a query opens the consensus modal; Close dismisses it", async () => {
    await renderGrouped(groupsFromFixture(), "bacillus");
    userEvent.click(screen.getByRole("button", { name: "S2_rule-two" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("h3")).toHaveTextContent("S2_rule-two");
    expect(within(dialog).getByText("A1")).toBeInTheDocument();
    userEvent.click(within(dialog).getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  test("ArrowRight does not navigate while the consensus modal is open", async () => {
    const { onGroupChange } = await renderGrouped(groupsFromFixture(), "bacillus");
    userEvent.click(screen.getByRole("button", { name: "S2_rule-two" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    userEvent.keyboard("{arrowright}");
    expect(onGroupChange).not.toHaveBeenCalled();
  });

  // BUG-U02: `record.taxon?.consensusBeans.reduce` used to guard only taxon and
  // threw while rendering the item.
  test("BUG-U02: a taxon with consensusBeans null renders the item", async () => {
    const chunk = nullBeans.results as unknown as Result[];
    await renderGrouped([{ ...group("bacillus", chunk), taxonomy: "" }]);
    const row = itemRow("S9_null-beans");
    expect(within(row).getByTestId("composition")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /^Rule: Unresolved/ })).toBeInTheDocument();
  });

  describe("sorting within the group", () => {
    const shown = () =>
      within(recordList())
        .getAllByRole("article")
        .map((a) => a.getAttribute("aria-label"));

    function twoGroups(): ResultsGroupedByTaxonomy[] {
      const mk = (name: string, queries: string[]) => ({
        name,
        rank: "genus",
        taxonomy: "",
        groupedBy: ViewType.GroupedByTaxonomy,
        chunk: queries.map((query) => makeResult({ query, taxon: makeTaxon() })),
      });
      return [mk("alpha", ["Q.2", "Q.10", "Q.1"]), mk("beta", ["R.3", "R.20", "R.1"])];
    }

    test("starts in the original order and cycles Query asc → desc → original", async () => {
      await renderGrouped(twoGroups());
      expect(shown()).toEqual(["Q.2", "Q.10", "Q.1"]);
      const sortBy = () => screen.getByRole("button", { name: "Sort by Query" });
      userEvent.click(sortBy());
      expect(shown()).toEqual(["Q.1", "Q.2", "Q.10"]);
      userEvent.click(sortBy());
      expect(shown()).toEqual(["Q.10", "Q.2", "Q.1"]);
      userEvent.click(sortBy());
      expect(shown()).toEqual(["Q.2", "Q.10", "Q.1"]);
    });

    test("'Original order' restores the group's order", async () => {
      await renderGrouped(twoGroups());
      userEvent.click(screen.getByRole("button", { name: "Sort by Query" }));
      userEvent.click(screen.getByRole("button", { name: "Original order" }));
      expect(shown()).toEqual(["Q.2", "Q.10", "Q.1"]);
      expect(screen.queryByRole("button", { name: "Original order" })).not.toBeInTheDocument();
    });

    test("the sort is kept when moving to another group", async () => {
      render(<StatefulGrouped results={twoGroups()} />);
      await act(async () => {});
      userEvent.click(screen.getByRole("button", { name: "Sort by Query" }));
      userEvent.click(screen.getAllByRole("button", { name: "Next group" })[0]);
      await act(async () => {});
      expect(shown()).toEqual(["R.1", "R.3", "R.20"]);
    });
  });
});

