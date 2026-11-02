import fs from "fs";
import path from "path";
import { Component, ReactNode } from "react";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation, useNavigate } from "react-router-dom";
import { makeResult, makeTaxon, renderWithRouter } from "@/test-utils";
import small from "@/__fixtures__/small.result.json";
import { Results } from ".";
import { exampleResultUrl } from "./elements/ResultLoader";

jest.mock("flowbite-react", () =>
  require("@/test-utils/flowbite-tooltip-mock").withInlineTooltip()
);

// The sample dataset is served with the app (public/examples).
const EXAMPLE_RAW_RESULT_URL = exampleResultUrl();

// <ui root>/../blutils/test/mock/output/zymo-mock (monorepo checkout only)
const ZYMO_PATH = path.resolve(
  __dirname,
  "../../../../../blutils/test/mock/output/zymo-mock/blutils.consensus.json"
);

function LocationProbe() {
  return <div data-testid="location-search">{useLocation().search}</div>;
}

// Stands in for the browser's back button.
function HistoryBack() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>history back</button>;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <div role="alert" data-testid="boundary-error">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

function renderPage(route = "/") {
  return renderWithRouter(
    <ErrorBoundary>
      <Results />
      <LocationProbe />
      <HistoryBack />
    </ErrorBoundary>,
    { route }
  );
}

function search() {
  return new URLSearchParams(screen.getByTestId("location-search").textContent!);
}

function fakeResponse(body: string) {
  return { ok: true, status: 200, text: () => Promise.resolve(body) } as unknown as Response;
}

async function upload(content: unknown, name = "blutils.consensus.json") {
  const input = screen.getByLabelText(/choose your result file/i);
  const raw = typeof content === "string" ? content : JSON.stringify(content);
  userEvent.upload(input, new File([raw], name, { type: "application/json" }));
  userEvent.click(screen.getByRole("button", { name: "View results" }));
}

async function waitForTable() {
  await screen.findByLabelText("Records", undefined, { timeout: 4000 });
  await act(async () => {});
}

async function uploadAndWaitForTable(content: unknown = small, name?: string) {
  await upload(content, name);
  await waitForTable();
}

// ResultsPaginationStats renders "<total> records" or "<shown> of <total> records"
function stats() {
  const row = document.querySelector("tr.flex")!;
  return Array.from(row.querySelectorAll("td"))
    .map((td) => td.textContent)
    .join(" ");
}

// Records mounted by the virtualized Table list (one RecordItem article each).
function tableQueries() {
  return within(screen.getByLabelText("Records"))
    .queryAllByRole("article")
    .map((a) => a.getAttribute("aria-label"));
}

// Group entries only: the subject view's sidebar also holds the wrap control.
function sidebarEntries() {
  return Array.from(
    screen.getByRole("navigation", { name: "Groups" }).querySelectorAll<HTMLElement>(
      "[data-index] button"
    )
  );
}

// Sidebar entries of the grouped views: every group, current one or not.
function groupAnchors() {
  return sidebarEntries().map((a) => ({
    name: a.getAttribute("title"),
    count: a.lastElementChild!.textContent,
  }));
}

function currentGroupQueries() {
  return within(screen.getByLabelText("Group records"))
    .queryAllByRole("article")
    .map((a) => a.getAttribute("aria-label"));
}

function sidebarEntry(name: string) {
  return sidebarEntries().find((e) => e.getAttribute("title") === name)!;
}

type View = "table" | "grouped-by-taxonomy" | "grouped-by-subject";

const VIEW_BUTTONS: Record<View, string> = {
  table: "Table",
  "grouped-by-taxonomy": "By taxonomy",
  "grouped-by-subject": "By subject",
};

function viewButtons() {
  return within(screen.getByRole("group", { name: "View" })).getAllByRole("button");
}

// Label of the pressed view button.
function currentView() {
  return viewButtons()
    .filter((b) => b.getAttribute("aria-pressed") === "true")
    .map((b) => b.textContent);
}

async function switchView(value: View) {
  userEvent.click(within(screen.getByRole("group", { name: "View" })).getByRole("button", {
    name: VIEW_BUTTONS[value],
  }));
  await act(async () => {});
}

function filterInput() {
  return screen.getByLabelText("Filter records");
}

async function applyFilter(text: string) {
  userEvent.type(filterInput(), `${text}{enter}`);
  await act(async () => {});
}

function chips() {
  return screen.queryAllByTestId("filter-chip").map((c) => c.textContent);
}

// The wrap control lives in the subject view only, rendered twice (sidebar and
// the narrow-screen copy above the content); the first is the sidebar one.
function wrapInput() {
  return screen.getAllByLabelText("Wrap character")[0];
}

async function submitWrap(character: string) {
  userEvent.type(wrapInput(), `${character}{enter}`);
  await act(async () => {});
}

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
  fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(fakeResponse(JSON.stringify(small)));
});

describe("Results page — loading", () => {
  test("without a result it shows the loader and no table", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /open your results/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Records")).not.toBeInTheDocument();
  });

  test("uploading small.result.json renders the Table view", async () => {
    renderPage();
    await uploadAndWaitForTable(small, "small.json");
    expect(screen.queryByRole("heading", { name: /open your results/i })).not.toBeInTheDocument();
    expect(tableQueries()).toEqual([
      "S1_no-hit",
      "S1_single",
      "S2_rule-two",
      "S2_tie",
      "S3_many-beans",
      "S3_species-group",
    ]);
    expect(stats()).toBe("6 records");
    expect(search().get("p")).toBe("small.json");
  });

  test("results: [] renders an empty table with '0 records'", async () => {
    renderPage();
    await uploadAndWaitForTable({ results: [], config: small.config });
    expect(stats()).toBe("0 records");
    expect(tableQueries()).toEqual([]);
  });

  test("the sample button fetches only once on the full page (loader unmounts after the first load)", async () => {
    // BUG-U19 does not reproduce here: the first resultSetter call replaces the
    // loader with the Table, so the ?p= effect never re-runs.
    renderPage();
    userEvent.click(screen.getByRole("button", { name: "Load a sample dataset" }));
    await waitForTable();
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(EXAMPLE_RAW_RESULT_URL);
    expect(search().get("p")).toBe(EXAMPLE_RAW_RESULT_URL);
  });

  test("?p=<URL> on the full page fetches only once", async () => {
    renderPage("/?p=https://x/y.json");
    await waitForTable();
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("https://x/y.json");
  });

  test("Reset goes back to the loader and removes ?p", async () => {
    renderPage();
    await uploadAndWaitForTable(small, "small.json");
    expect(search().has("p")).toBe(true);
    userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(await screen.findByRole("heading", { name: /open your results/i })).toBeInTheDocument();
    expect(screen.queryByLabelText("Records")).not.toBeInTheDocument();
    expect(search().has("p")).toBe(false);
    expect(screen.getByTestId("location-search")).toHaveTextContent(/^$/);
  });

  test("Reset after a ?p=<URL> load does not refetch", async () => {
    renderPage("/?p=https://x/y.json");
    await waitForTable();
    userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await screen.findByRole("heading", { name: /open your results/i });
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("Results page — BUG-U06: valid JSON with the wrong shape", () => {
  // BUG-U06: `blutilsResult.results.reduce` used to run with no shape check and
  // crash the page (there is no error boundary in the app).
  test.each(["{}", "[]", '{"results":null}'])(
    "BUG-U06: a wrong-shape result (%s) shows a validation message instead of crashing",
    async (content) => {
      renderPage();
      await upload(content);
      expect(await screen.findByRole("alert")).toHaveTextContent(/isn't a valid Blutils result/);
      expect(screen.queryByTestId("boundary-error")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /open your results/i })).toBeInTheDocument();
    }
  );
});

describe("Results page — view switching", () => {
  test("the segmented view selector offers the three views, Table first and pressed", async () => {
    renderPage();
    await uploadAndWaitForTable();
    expect(viewButtons().map((b) => b.textContent)).toEqual(["Table", "By taxonomy", "By subject"]);
    expect(currentView()).toEqual(["Table"]);
    // The old <select> is gone (the filter input is the only combobox).
    expect(screen.queryByRole("combobox", { name: /view/i })).not.toBeInTheDocument();
  });

  test("clicking a view button presses it and writes ?v=", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-taxonomy");
    expect(currentView()).toEqual(["By taxonomy"]);
    expect(search().get("v")).toBe("grouped-by-taxonomy");
    expect(screen.queryByLabelText("Records")).not.toBeInTheDocument();
    await switchView("table");
    expect(currentView()).toEqual(["Table"]);
    expect(tableQueries()).toHaveLength(6);
  });

  test("the wrap control exists only in the By subject view", async () => {
    renderPage();
    await uploadAndWaitForTable();
    expect(screen.queryAllByLabelText("Wrap character")).toHaveLength(0);
    expect(screen.queryByPlaceholderText("Wrap character")).not.toBeInTheDocument();
    await switchView("grouped-by-taxonomy");
    expect(screen.queryAllByLabelText("Wrap character")).toHaveLength(0);
    await switchView("grouped-by-subject");
    // sidebar copy + narrow-screen copy
    expect(screen.getAllByLabelText("Wrap character")).toHaveLength(2);
    expect(
      within(screen.getByRole("navigation", { name: "Groups" })).getByLabelText("Wrap character")
    ).toBe(wrapInput());
    await switchView("table");
    expect(screen.queryAllByLabelText("Wrap character")).toHaveLength(0);
  });

  test("a suggested wrap character groups the subject view; clicking it again ungroups", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-subject");
    // "_" groups the six small-fixture queries into S1, S2 and S3
    const suggestion = () =>
      screen.getAllByRole("button", { name: 'Use "_" as wrap character (3 groups)' })[0];
    expect(suggestion()).toHaveAttribute("aria-pressed", "false");

    userEvent.click(suggestion());
    await act(async () => {});
    expect(groupAnchors().map((g) => g.name)).toEqual(["S1", "S2", "S3"]);
    expect(suggestion()).toHaveAttribute("aria-pressed", "true");
    expect(wrapInput()).toHaveValue("_");

    userEvent.click(suggestion());
    await act(async () => {});
    expect(groupAnchors()).toHaveLength(6);
    expect(wrapInput()).toHaveValue("");
  });

  test("'Clear wrap character' ungroups the subject view", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-subject");
    await submitWrap("_");
    expect(groupAnchors()).toHaveLength(3);
    userEvent.click(screen.getAllByRole("button", { name: "Clear wrap character" })[0]);
    await act(async () => {});
    expect(groupAnchors()).toHaveLength(6);
    expect(screen.queryByRole("button", { name: "Clear wrap character" })).not.toBeInTheDocument();
  });

  test("the wrap character is kept across views and ignored by By taxonomy", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-subject");
    await submitWrap("_");
    await switchView("grouped-by-taxonomy");
    expect(groupAnchors()).toHaveLength(5);
    await switchView("grouped-by-subject");
    expect(groupAnchors().map((g) => g.name)).toEqual(["S1", "S2", "S3"]);
    expect(wrapInput()).toHaveValue("_");
  });

  test("the wrap character applies to the filtered queries", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter("has:match");
    await switchView("grouped-by-subject");
    await submitWrap("_");
    expect(groupAnchors()).toEqual([
      { name: "S1", count: "x1" },
      { name: "S2", count: "x2" },
      { name: "S3", count: "x2" },
    ]);
  });

  test("Grouped by Subject without a wrap character has one group per query", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-subject");
    expect(screen.queryByLabelText("Records")).not.toBeInTheDocument();
    expect(groupAnchors().map((g) => g.name)).toEqual([
      "S1_no-hit",
      "S1_single",
      "S2_rule-two",
      "S2_tie",
      "S3_many-beans",
      "S3_species-group",
    ]);
  });

  test("Grouped by Subject with wrap '_' groups queries by their prefix", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-subject");
    await submitWrap("_");
    expect(groupAnchors()).toEqual([
      { name: "S1", count: "x2" },
      { name: "S2", count: "x2" },
      { name: "S3", count: "x2" },
    ]);
  });

  test("the wrap character is ignored by the Table view", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-subject");
    await submitWrap("_");
    await switchView("table");
    expect(tableQueries()).toHaveLength(6);
  });

  test("BUG-U22: submitting a wrap character does not log to the console", async () => {
    // BUG-U22: a leftover debug `console.log(character)` ran on every submit.
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-subject");
    await submitWrap("_");
    expect(groupAnchors()).toHaveLength(3);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  // BUG-U09: "_lead".split("_")[0] === "" used to be a falsy key, dropping the query.
  test("BUG-U09: a query starting with the wrap character keeps its own group", async () => {
    renderPage();
    await uploadAndWaitForTable({
      results: [makeResult({ query: "_lead" }), makeResult({ query: "S1_a" })],
      config: small.config,
    });
    await switchView("grouped-by-subject");
    await submitWrap("_");
    expect(groupAnchors()).toHaveLength(2);
    expect(groupAnchors()).toEqual(
      expect.arrayContaining([
        { name: "_lead", count: "x1" },
        { name: "S1", count: "x1" },
      ])
    );
  });

  // BUG-U01: `key = unidentifiedKey` used to be overwritten by
  // `key = item.taxon?.identifier`, so taxon-less results disappeared. Rendering
  // the group needs the BUG-U05 fix (kebabToPlain("") for its empty rank).
  test("BUG-U01: taxon-less results are grouped under 'Unidentified'", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-taxonomy");
    expect(groupAnchors()).toEqual([
      { name: "bacillaceae", count: "x1" },
      { name: "bacillus", count: "x2" },
      { name: "bacillus-subtilis", count: "x1" },
      { name: "bacillus-subtilis-group", count: "x1" },
      { name: "Unidentified", count: "x1" },
    ]);
    userEvent.click(sidebarEntry("Unidentified"));
    await waitFor(() => expect(currentGroupQueries()).toEqual(["S1_no-hit"]));
  });

  test("Grouped by Taxonomy keeps results whose taxon shares an identifier together", async () => {
    renderPage();
    await uploadAndWaitForTable({
      results: [
        makeResult({ query: "q1", taxon: makeTaxon({ identifier: "escherichia" }) }),
        makeResult({ query: "q2", taxon: makeTaxon({ identifier: "escherichia" }) }),
        { query: "q3", taxon: null },
      ],
      config: small.config,
    });
    await switchView("grouped-by-taxonomy");
    // BUG-U01: the taxon-less q3 now lands in the "Unidentified" group
    expect(groupAnchors()).toEqual([
      { name: "escherichia", count: "x2" },
      { name: "Unidentified", count: "x1" },
    ]);
  });
});

const DEEP_LINK = "/?p=https://x/y.json&v=grouped-by-taxonomy&g=bacillus";

async function openDeepLink(route = DEEP_LINK) {
  renderPage(route);
  await screen.findByLabelText("Group records", undefined, { timeout: 4000 });
  await act(async () => {});
}

describe("Results page — URL state and group navigation", () => {
  test("?v= alone opens that view after a ?p= load", async () => {
    renderPage("/?p=https://x/y.json&v=grouped-by-subject");
    await screen.findByLabelText("Group records", undefined, { timeout: 4000 });
    expect(currentView()).toEqual(["By subject"]);
    expect(groupAnchors()).toHaveLength(6);
  });

  test("a deep link ?p=&v=&g= loads straight onto that group and keeps every param", async () => {
    await openDeepLink();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("https://x/y.json");
    expect(currentView()).toEqual(["By taxonomy"]);
    expect(currentGroupQueries()).toEqual(["S2_rule-two", "S2_tie"]);
    expect(sidebarEntry("bacillus")).toHaveAttribute("aria-current", "page");
    expect(Object.fromEntries(search())).toEqual({
      p: "https://x/y.json",
      v: "grouped-by-taxonomy",
      g: "bacillus",
    });
  });

  test("an unknown ?g= falls back to the first group without rewriting the URL", async () => {
    await openDeepLink("/?p=https://x/y.json&v=grouped-by-taxonomy&g=nope");
    expect(currentGroupQueries()).toEqual(["S3_many-beans"]);
    expect(search().get("g")).toBe("nope");
  });

  test("Next writes ?g= and history back returns to the previous group", async () => {
    await openDeepLink();
    userEvent.click(screen.getAllByRole("button", { name: "Next group" })[0]);
    await waitFor(() => expect(search().get("g")).toBe("bacillus-subtilis"));
    expect(currentGroupQueries()).toEqual(["S1_single"]);
    expect(search().get("p")).toBe("https://x/y.json");
    expect(search().get("v")).toBe("grouped-by-taxonomy");

    userEvent.click(screen.getByRole("button", { name: "history back" }));
    await waitFor(() => expect(search().get("g")).toBe("bacillus"));
    expect(currentGroupQueries()).toEqual(["S2_rule-two", "S2_tie"]);
    // going back does not reload the result
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("switching the view drops ?g= and keeps ?p=", async () => {
    await openDeepLink();
    await switchView("grouped-by-subject");
    expect(Object.fromEntries(search())).toEqual({
      p: "https://x/y.json",
      v: "grouped-by-subject",
    });
    expect(currentGroupQueries()).toEqual(["S1_no-hit"]);
  });

  test("Reset clears every param", async () => {
    await openDeepLink();
    userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await screen.findByRole("heading", { name: /open your results/i });
    expect(screen.getByTestId("location-search")).toHaveTextContent(/^$/);
  });

  test("ArrowRight navigates with the consensus modal closed and is blocked while it is open", async () => {
    await openDeepLink();
    userEvent.click(screen.getByRole("button", { name: "S2_rule-two" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    userEvent.keyboard("{arrowright}");
    await act(async () => {});
    expect(search().get("g")).toBe("bacillus");

    userEvent.click(within(screen.getByRole("dialog")).getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    userEvent.keyboard("{arrowright}");
    await waitFor(() => expect(search().get("g")).toBe("bacillus-subtilis"));
    expect(currentGroupQueries()).toEqual(["S1_single"]);
  });

  test("typing an arrow key in the wrap character field does not navigate", async () => {
    await openDeepLink("/?p=https://x/y.json&v=grouped-by-subject&g=S2_rule-two");
    userEvent.type(wrapInput(), "_{arrowright}");
    await act(async () => {});
    expect(search().get("g")).toBe("S2_rule-two");
    expect(currentGroupQueries()).toEqual(["S2_rule-two"]);
  });

  test("the wrap character keeps the current group when it still exists", async () => {
    await openDeepLink("/?p=https://x/y.json&v=grouped-by-subject");
    await submitWrap("_");
    userEvent.click(sidebarEntry("S2"));
    await waitFor(() => expect(currentGroupQueries()).toEqual(["S2_rule-two", "S2_tie"]));
    // "_r" regroups everything, but "S2_rule-two" still yields an "S2" group
    userEvent.clear(wrapInput());
    await submitWrap("_r");
    await waitFor(() => expect(groupAnchors()).toHaveLength(6));
    expect(search().get("g")).toBe("S2");
    expect(currentGroupQueries()).toEqual(["S2_rule-two"]);

    // a regroup without that name falls back to the first group
    userEvent.clear(wrapInput());
    await submitWrap("-");
    await waitFor(() => expect(currentGroupQueries()).toEqual(["S1_no-hit"]));
  });
});

describe("Results page — advanced filter", () => {
  test("the filter bar appears only once a result is loaded", async () => {
    renderPage();
    expect(screen.queryByLabelText("Filter records")).not.toBeInTheDocument();
    await uploadAndWaitForTable();
    expect(filterInput()).toBeInTheDocument();
  });

  test("q: and t: chips filter the Table (AND) and the stats read '<n> of <total> records'", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter("q:S2 t:bacillus");
    expect(chips()).toEqual(["Query: S2", "Taxonomy: bacillus"]);
    expect(tableQueries()).toEqual(["S2_rule-two", "S2_tie"]);
    expect(stats()).toBe("2 of 6 records");
    expect(search().get("f")).toBe("q:S2 t:bacillus");
  });

  test("query matching is case-insensitive", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter("q:s3_");
    expect(tableQueries()).toEqual(["S3_many-beans", "S3_species-group"]);
  });

  test("t: matches the readable lineage with quotes and spaces", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter('t:"Bacillus Subtilis"');
    expect(tableQueries()).toEqual(["S1_single", "S3_species-group"]);
  });

  test("free text matches the query, the proposed taxon and the taxonomy", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter("bacillaceae");
    // every record with a taxonomy passes through the family
    expect(tableQueries()).toHaveLength(5);
    expect(tableQueries()).not.toContain("S1_no-hit");
  });

  // BUG-U04: a whitespace-only term used to filter every row out.
  test("BUG-U04: a whitespace-only entry does not filter", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter("   ");
    expect(chips()).toEqual([]);
    expect(tableQueries()).toHaveLength(6);
    expect(search().has("f")).toBe(false);
  });

  test("Unmatched keeps only records without a taxon; Matched drops them", async () => {
    renderPage();
    await uploadAndWaitForTable();
    userEvent.click(screen.getByRole("button", { name: "Unmatched" }));
    await act(async () => {});
    expect(tableQueries()).toEqual(["S1_no-hit"]);
    expect(stats()).toBe("1 of 6 records");
    expect(search().get("f")).toBe("no:match");

    userEvent.click(screen.getByRole("button", { name: "Matched" }));
    await act(async () => {});
    expect(tableQueries()).toHaveLength(5);
    expect(tableQueries()).not.toContain("S1_no-hit");
    expect(search().get("f")).toBe("has:match");
  });

  test("a filter that matches nothing empties the Table; removing the chip restores it", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter("q:zzz");
    expect(tableQueries()).toEqual([]);
    expect(stats()).toBe("0 of 6 records");
    userEvent.click(screen.getByRole("button", { name: "Remove filter Query: zzz" }));
    await act(async () => {});
    expect(tableQueries()).toHaveLength(6);
    expect(stats()).toBe("6 records");
    expect(search().has("f")).toBe(false);
  });

  test("picking a taxonomy tree node adds a t: chip and keeps only records under it", async () => {
    renderPage();
    await uploadAndWaitForTable();
    userEvent.click(screen.getByRole("button", { name: "Taxonomy tree" }));
    userEvent.click(screen.getByTitle("Filter by bacteria > bacillota"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(chips()).toEqual(["Taxonomy: bacteria > bacillota"]);
    expect(tableQueries()).toHaveLength(5);
    expect(stats()).toBe("5 of 6 records");
  });

  test("switching to By taxonomy keeps the chips and shows only the matching groups", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter("q:S3");
    await switchView("grouped-by-taxonomy");
    expect(chips()).toEqual(["Query: S3"]);
    expect(search().get("f")).toBe("q:S3");
    expect(groupAnchors()).toEqual([
      { name: "bacillaceae", count: "x1" },
      { name: "bacillus-subtilis-group", count: "x1" },
    ]);
    expect(currentGroupQueries()).toEqual(["S3_many-beans"]);
  });

  test("a ?f= deep link restores the chips and filters on load", async () => {
    renderPage("/?p=https://x/y.json&f=q%3AS3%20has%3Amatch");
    await waitForTable();
    expect(chips()).toEqual(["Query: S3", "Matched only"]);
    expect(screen.getByRole("button", { name: "Matched" })).toHaveAttribute("aria-pressed", "true");
    expect(tableQueries()).toEqual(["S3_many-beans", "S3_species-group"]);
    expect(stats()).toBe("2 of 6 records");
    expect(search().get("p")).toBe("https://x/y.json");
  });

  test("?f= with ?v=&g= opens the filtered grouped view on that group", async () => {
    renderPage("/?p=https://x/y.json&v=grouped-by-taxonomy&g=bacillus-subtilis-group&f=q%3AS3");
    await screen.findByLabelText("Group records", undefined, { timeout: 4000 });
    expect(currentGroupQueries()).toEqual(["S3_species-group"]);
  });

  test("Reset clears the filter with every other param", async () => {
    renderPage("/?p=https://x/y.json&f=q%3AS3");
    await waitForTable();
    userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await screen.findByRole("heading", { name: /open your results/i });
    expect(screen.getByTestId("location-search")).toHaveTextContent(/^$/);
    expect(screen.queryByLabelText("Filter records")).not.toBeInTheDocument();
  });

  test("a current group that the filter removes falls back to the first remaining group", async () => {
    await openDeepLink();
    expect(currentGroupQueries()).toEqual(["S2_rule-two", "S2_tie"]);
    await applyFilter("q:S3");
    expect(groupAnchors().map((g) => g.name)).toEqual(["bacillaceae", "bacillus-subtilis-group"]);
    expect(currentGroupQueries()).toEqual(["S3_many-beans"]);
    expect(sidebarEntry("bacillaceae")).toHaveAttribute("aria-current", "page");
  });

  test.each(["grouped-by-taxonomy", "grouped-by-subject"] as const)(
    "%s with nothing left shows 'No records match the filter.'",
    async (view) => {
      renderPage();
      await uploadAndWaitForTable();
      await switchView(view);
      await applyFilter("q:zzz");
      expect(screen.getByText("No records match the filter.")).toBeInTheDocument();
      expect(screen.queryByRole("navigation", { name: "Groups" })).not.toBeInTheDocument();

      userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      await act(async () => {});
      expect(screen.queryByText("No records match the filter.")).not.toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Groups" })).toBeInTheDocument();
    }
  );

  test("the Table view never shows the grouped empty-state message", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await applyFilter("q:zzz");
    expect(screen.queryByText("No records match the filter.")).not.toBeInTheDocument();
  });
});

const describeZymo = fs.existsSync(ZYMO_PATH) ? describe : describe.skip;

describeZymo("Results page — zymo smoke test", () => {
  test("the Table mounts only a window of rows and the stats show the total", async () => {
    const raw = fs.readFileSync(ZYMO_PATH, "utf8");
    const zymo = JSON.parse(raw) as { results: { query: string }[] };
    fetchSpy.mockResolvedValue(fakeResponse(raw));
    renderPage("/?p=https://x/zymo.json");
    await waitForTable();
    await waitFor(() => expect(tableQueries().length).toBeGreaterThan(0));

    // The Table starts in the original (file) order.
    const sorted = zymo.results.map((r) => r.query);
    const mounted = tableQueries();
    expect(mounted.length).toBeLessThan(100);
    expect(mounted).toEqual(sorted.slice(0, mounted.length));
    expect(stats()).toBe(`${zymo.results.length} records`);
  });
});

describe("Results page — charts (009)", () => {
  const displayButtons = () =>
    within(screen.getByRole("group", { name: "Display" })).getAllByRole("button");

  test("the List/Charts switch exists only in the grouped views", async () => {
    renderPage("/?p=https://x/y.json&v=table");
    await screen.findByLabelText("Records", undefined, { timeout: 4000 });
    expect(screen.queryByRole("group", { name: "Display" })).not.toBeInTheDocument();
  });

  test("Charts replaces the pager with the chart panel and writes ?m=charts", async () => {
    await openDeepLink();
    expect(displayButtons().map((b) => b.textContent)).toEqual(["list", "charts"]);
    userEvent.click(displayButtons()[1]);
    expect(await screen.findByRole("region", { name: "Charts" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Group records")).not.toBeInTheDocument();
    expect(search().get("m")).toBe("charts");
  });

  test("a ?m=charts&c= deep link opens that chart; clicking a bar goes back to the group list", async () => {
    renderPage("/?p=https://x/y.json&v=grouped-by-taxonomy&m=charts&c=abundance");
    const bars = await screen.findByRole("list", { name: "Abundance by taxon" }, { timeout: 4000 });
    userEvent.click(within(bars).getByRole("button", { name: /^Bacillus: .*Open the group$/ }));
    await screen.findByLabelText("Group records");
    expect(search().get("m")).toBeNull();
    expect(search().get("g")).toBe("bacillus");
  });

  test("the sunburst filter adds a t: chip and the charts follow the filter", async () => {
    renderPage("/?p=https://x/y.json&v=grouped-by-taxonomy&m=charts&c=sunburst");
    userEvent.click(await screen.findByRole("button", { name: /^Bacteria: .*Zoom in$/ }, { timeout: 4000 }));
    userEvent.click(screen.getByRole("button", { name: "Filter by Bacteria" }));
    expect(screen.getAllByTestId("filter-chip").map((c) => c.textContent)).toEqual(["Taxonomy: bacteria"]);
    expect(search().get("f")).toBe("t:bacteria");
  });

  test("switching view keeps the charts mode and drops the chart id", async () => {
    renderPage("/?p=https://x/y.json&v=grouped-by-taxonomy&m=charts&c=sunburst");
    await screen.findByRole("region", { name: "Charts" }, { timeout: 4000 });
    userEvent.click(screen.getByRole("button", { name: "By subject" }));
    expect(await screen.findByRole("button", { name: "Composition", pressed: true })).toBeInTheDocument();
    expect(search().get("m")).toBe("charts");
    expect(search().get("c")).toBeNull();
  });
});
