import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeResult, makeTaxon } from "@/test-utils";
import { Result } from "@/types/BlutilsResult";
import { ResultsGroupedByQuery } from "@/types/GroupedResults";
import { ViewType } from "@/types/ViewType";
import small from "@/__fixtures__/small.result.json";
import nullBeans from "@/__fixtures__/null-beans.result.json";
import { Grouped } from "./Grouped";

// Tooltips are covered by the TaxonomyCell tests. Here floating-ui positioning
// only slows every test down; render content inline.
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

interface Extra {
  wrapCharacter?: string;
  onWrapCharacterChange?: jest.Mock;
  queries?: string[];
}

function view(
  results: ResultsGroupedByQuery[],
  group: string | null,
  onGroupChange: jest.Mock,
  { wrapCharacter, onWrapCharacterChange = jest.fn(), queries }: Extra = {}
) {
  return (
    <Grouped
      results={results}
      group={group}
      onGroupChange={onGroupChange}
      wrapCharacter={wrapCharacter}
      onWrapCharacterChange={onWrapCharacterChange}
      queries={queries ?? results.flatMap((r) => r.chunk.map((c) => c.query))}
    />
  );
}

async function renderGrouped(
  results: ResultsGroupedByQuery[],
  group: string | null = null,
  onGroupChange = jest.fn(),
  extra: Extra = {}
) {
  const onWrapCharacterChange = extra.onWrapCharacterChange ?? jest.fn();
  const utils = render(
    view(results, group, onGroupChange, { ...extra, onWrapCharacterChange })
  );
  // let the virtualizer measure and floating-ui settle
  await act(async () => {});
  return { ...utils, onGroupChange, onWrapCharacterChange };
}

function nav() {
  return screen.getByRole("navigation", { name: "Groups" });
}

// Group entries only: the sidebar also holds the wrap control.
function sidebarEntries() {
  return Array.from(nav().querySelectorAll<HTMLElement>("[data-index] button"));
}

function header() {
  return document.querySelector("h3") as HTMLElement;
}

function recordQueries() {
  return within(screen.getByLabelText("Group records"))
    .queryAllByRole("article")
    .map((a) => a.getAttribute("aria-label"));
}

function itemRow(query: string) {
  return screen.getByRole("article", { name: query });
}

describe("GroupedByQueryView/Grouped", () => {
  test("the sidebar lists one entry per group with name and count", async () => {
    await renderGrouped(groupsFromFixture());
    const entries = sidebarEntries();
    expect(entries.map((e) => e.getAttribute("title"))).toEqual(["S1", "S2", "S3"]);
    expect(entries.map((e) => e.textContent)).toEqual(["S1x2", "S2x2", "S3x2"]);
    expect(screen.getByRole("navigation", { name: "Groups" })).toHaveTextContent("3 groups");
  });

  // BUG-U18: query names used to go through kebabToScinameString with the first
  // record's rank ("S1_no-hit" -> "S1_no Hit").
  test("BUG-U18: query names are shown verbatim", async () => {
    await renderGrouped(groupsPerQuery(), "S2_rule-two");
    const entries = sidebarEntries();
    expect(entries.map((e) => e.firstElementChild!.textContent)).toEqual(
      entries.map((e) => e.getAttribute("title"))
    );
    expect(header()).toHaveTextContent(/^S2_rule-twox1$/);
  });

  test("only the current group is rendered; unknown or missing falls back to the first", async () => {
    const { rerender, onGroupChange } = await renderGrouped(groupsFromFixture());
    expect(recordQueries()).toEqual(["S1_no-hit", "S1_single"]);

    rerender(view(groupsFromFixture(), "S2", onGroupChange));
    await waitFor(() => expect(recordQueries()).toEqual(["S2_rule-two", "S2_tie"]));
    expect(screen.queryByText("S1_single", { selector: "button" })).not.toBeInTheDocument();

    rerender(view(groupsFromFixture(), "nope", onGroupChange));
    await waitFor(() => expect(recordQueries()).toEqual(["S1_no-hit", "S1_single"]));
    expect(onGroupChange).not.toHaveBeenCalled();
  });

  test("the section header shows the name and count only (no rank, no taxonomy)", async () => {
    await renderGrouped(groupsFromFixture(), "S2");
    expect(header()).toHaveTextContent(/^S2x2$/);
  });

  test("navigation reports the target group's name and marks the current entry", async () => {
    const { onGroupChange } = await renderGrouped(groupsFromFixture(), "S2");
    expect(sidebarEntries()[1]).toHaveAttribute("aria-current", "page");
    userEvent.click(screen.getAllByRole("button", { name: "Next group" })[0]);
    expect(onGroupChange).toHaveBeenLastCalledWith("S3");
    userEvent.keyboard("{arrowleft}");
    expect(onGroupChange).toHaveBeenLastCalledWith("S1");
    userEvent.click(sidebarEntries()[2]);
    expect(onGroupChange).toHaveBeenLastCalledWith("S3");
  });

  test("a large group mounts only a window of records", async () => {
    await renderGrouped([group("thousand", manyResults(1000))]);
    await waitFor(() => expect(recordQueries().length).toBeGreaterThan(0));
    const queries = recordQueries();
    expect(queries.length).toBeLessThan(100);
    expect(queries[0]).toBe("Q0");
  });

  test("item rows are RecordItem entries: rule word, proposed taxon and donut", async () => {
    const { rerender, onGroupChange } = await renderGrouped(groupsFromFixture(), "S2");
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).toEqual([
      "Query·Taxonomy",
      "Proposed taxon",
      "Rule",
      "Composition",
    ]);

    const ruleTwo = itemRow("S2_rule-two");
    expect(ruleTwo).toHaveTextContent("Bacillus subtilis");
    expect(within(ruleTwo).getByRole("button", { name: /^Rule: Majority/ })).toBeInTheDocument();
    expect(within(ruleTwo).getAllByTestId("composition-segment")).toHaveLength(2);
    expect(ruleTwo).toHaveTextContent("845");

    const tie = itemRow("S2_tie");
    expect(within(tie).getByRole("button", { name: /^Rule: Ambiguous/ })).toBeInTheDocument();

    rerender(view(groupsFromFixture(), "S1", onGroupChange));
    await screen.findByRole("article", { name: "S1_single" });
    expect(
      within(itemRow("S1_single")).getByRole("button", { name: /^Rule: Unanimous/ })
    ).toBeInTheDocument();
    expect(itemRow("S1_no-hit")).toHaveTextContent(/^S1_no-hitNo significant match$/);
  });

  test("the wrap control sits in the sidebar and above the content", async () => {
    await renderGrouped(groupsFromFixture());
    expect(screen.getAllByLabelText("Wrap character")).toHaveLength(2);
    expect(within(nav()).getByLabelText("Wrap character")).toBeInTheDocument();
    expect(screen.getByLabelText("Group records")).not.toContainElement(
      screen.getAllByLabelText("Wrap character")[1]
    );
  });

  test("the wrap control suggests separators from the queries prop and reports changes", async () => {
    const { onWrapCharacterChange } = await renderGrouped(groupsPerQuery(), null, jest.fn(), {
      queries: ["A_1", "A_2", "B_1"],
    });
    userEvent.click(
      within(nav()).getByRole("button", { name: 'Use "_" as wrap character (2 groups)' })
    );
    expect(onWrapCharacterChange).toHaveBeenCalledWith("_");

    userEvent.type(within(nav()).getByLabelText("Wrap character"), "-{enter}");
    expect(onWrapCharacterChange).toHaveBeenLastCalledWith("-");
  });

  test("the wrapCharacter prop is shown in both copies of the control", async () => {
    await renderGrouped(groupsFromFixture(), null, jest.fn(), { wrapCharacter: "_" });
    screen.getAllByLabelText("Wrap character").forEach((input) => expect(input).toHaveValue("_"));
    expect(screen.getAllByRole("button", { name: "Clear wrap character" })).toHaveLength(2);
  });

  test("arrow keys typed in the wrap input do not navigate", async () => {
    const { onGroupChange } = await renderGrouped(groupsFromFixture(), "S2");
    userEvent.type(within(nav()).getByLabelText("Wrap character"), "{arrowright}{arrowleft}");
    expect(onGroupChange).not.toHaveBeenCalled();
  });

  test("the copy icon writes the query to the clipboard", async () => {
    await renderGrouped(groupsFromFixture(), "S3");
    userEvent.click(itemRow("S3_many-beans").querySelector("svg")!);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("S3_many-beans");
  });

  test("clicking a query opens the consensus modal; Close dismisses it", async () => {
    await renderGrouped(groupsFromFixture(), "S2");
    userEvent.click(screen.getByRole("button", { name: "S2_rule-two" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector("h3")).toHaveTextContent("S2_rule-two");
    expect(within(dialog).getByText("B2")).toBeInTheDocument();
    userEvent.click(within(dialog).getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  // BUG-U02: `record.taxon?.consensusBeans.reduce` used to guard only taxon and
  // threw while rendering the item.
  test("BUG-U02: a taxon with consensusBeans null renders the item", async () => {
    const chunk = nullBeans.results as unknown as Result[];
    await renderGrouped([group("S9", chunk)]);
    const row = itemRow("S9_null-beans");
    expect(within(row).getByTestId("composition")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: /^Rule: Unresolved/ })).toBeInTheDocument();
  });
});
