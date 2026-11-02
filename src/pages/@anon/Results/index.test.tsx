import fs from "fs";
import path from "path";
import { Component, ReactNode } from "react";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { makeResult, makeTaxon, renderWithRouter, triggerIntersection } from "@/test-utils";
import small from "@/__fixtures__/small.result.json";
import { Results } from ".";

jest.mock("flowbite-react", () =>
  require("@/test-utils/flowbite-tooltip-mock").withInlineTooltip()
);

const EXAMPLE_RAW_RESULT_URL =
  "https://raw.githubusercontent.com/LepistaBioinformatics/blutils/8c42f3e7bfe2d1e9de2038985e7c9a47625b6e78/test/mock/output/zymo-mock/blutils.consensus.json";

// <ui root>/../blutils/test/mock/output/zymo-mock (monorepo checkout only)
const ZYMO_PATH = path.resolve(
  __dirname,
  "../../../../../blutils/test/mock/output/zymo-mock/blutils.consensus.json"
);

function LocationProbe() {
  return <div data-testid="location-search">{useLocation().search}</div>;
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

async function uploadAndWaitForTable(content: unknown = small, name?: string) {
  await upload(content, name);
  await screen.findByText("Page Size > 10");
  await act(async () => {});
}

// ResultsPaginationStats renders "<total> in <groups> pages"
function stats() {
  const row = document.querySelector("tr.flex")!;
  return Array.from(row.querySelectorAll("td"))
    .map((td) => td.textContent)
    .join(" ");
}

function tableQueries() {
  const body = screen.getByTestId("table-element").querySelector("tbody")!;
  return Array.from(body.querySelectorAll("button")).map((b) => b.textContent);
}

// Sidebar anchors of the grouped views: rendered without any intersection.
function groupAnchors() {
  return Array.from(document.querySelectorAll("aside a[title]")).map((a) => ({
    name: a.getAttribute("title"),
    count: a.lastElementChild!.textContent,
  }));
}

function viewSelect() {
  return screen.getByRole("combobox");
}

async function switchView(value: "table" | "grouped-by-taxonomy" | "grouped-by-subject") {
  userEvent.selectOptions(viewSelect(), value);
  await act(async () => {});
}

function wrapInput() {
  return screen.getByPlaceholderText("Wrap character");
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
    expect(screen.queryByTestId("table-element")).not.toBeInTheDocument();
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
    expect(stats()).toBe("6 in 1 pages");
    expect(search().get("p")).toBe("small.json");
  });

  test("results: [] renders an empty table with '0 in 0 pages'", async () => {
    renderPage();
    await uploadAndWaitForTable({ results: [], config: small.config });
    expect(stats()).toBe("0 in 0 pages");
    expect(tableQueries()).toEqual([]);
  });

  test("the sample button fetches only once on the full page (loader unmounts after the first load)", async () => {
    // BUG-U19 does not reproduce here: the first resultSetter call replaces the
    // loader with the Table, so the ?p= effect never re-runs.
    renderPage();
    userEvent.click(screen.getByRole("button", { name: "Load a sample dataset" }));
    await screen.findByText("Page Size > 10");
    await act(async () => {});
    await act(async () => {});
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(EXAMPLE_RAW_RESULT_URL);
    expect(search().get("p")).toBe(EXAMPLE_RAW_RESULT_URL);
  });

  test("?p=<URL> on the full page fetches only once", async () => {
    renderPage("/?p=https://x/y.json");
    await screen.findByText("Page Size > 10");
    await act(async () => {});
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
    expect(screen.queryByTestId("table-element")).not.toBeInTheDocument();
    expect(search().has("p")).toBe(false);
    expect(screen.getByTestId("location-search")).toHaveTextContent(/^$/);
  });

  test("Reset after a ?p=<URL> load does not refetch", async () => {
    renderPage("/?p=https://x/y.json");
    await screen.findByText("Page Size > 10");
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
  test("the view select offers the three views, Table first", async () => {
    renderPage();
    await uploadAndWaitForTable();
    const options = Array.from((viewSelect() as HTMLSelectElement).options).map((o) => [
      o.value,
      o.textContent,
    ]);
    expect(options).toEqual([
      ["table", "TABLE"],
      ["grouped-by-taxonomy", "GROUPED BY TAXONOMY"],
      ["grouped-by-subject", "GROUPED BY SUBJECT"],
    ]);
    expect(viewSelect()).toHaveValue("table");
  });

  test("the wrap input is disabled in the Table view and enabled in the grouped views", async () => {
    renderPage();
    await uploadAndWaitForTable();
    expect(wrapInput()).toBeDisabled();
    await switchView("grouped-by-subject");
    expect(wrapInput()).toBeEnabled();
    await switchView("grouped-by-taxonomy");
    expect(wrapInput()).toBeEnabled();
    await switchView("table");
    expect(wrapInput()).toBeDisabled();
  });

  test("switching the view resets pageSize to 10", async () => {
    renderPage();
    await uploadAndWaitForTable();
    userEvent.click(screen.getByText("Page Size > 10").closest("button")!);
    await act(async () => {});
    userEvent.click(screen.getByText("25", { selector: '[role="menuitem"] button' }));
    await act(async () => {});
    expect(screen.getByText("Page Size > 25")).toBeInTheDocument();

    await switchView("grouped-by-subject");
    await switchView("table");
    expect(screen.getByText("Page Size > 10")).toBeInTheDocument();
  });

  test("Grouped by Subject without a wrap character has one group per query", async () => {
    renderPage();
    await uploadAndWaitForTable();
    await switchView("grouped-by-subject");
    expect(screen.queryByTestId("table-element")).not.toBeInTheDocument();
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
    act(() => triggerIntersection(true));
    await act(async () => {});
    expect(screen.getByText("S1_no-hit", { selector: "button" })).toBeInTheDocument();
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

const describeZymo = fs.existsSync(ZYMO_PATH) ? describe : describe.skip;

describeZymo("Results page — zymo smoke test", () => {
  test("the Table renders 10 rows on page 1", async () => {
    const raw = fs.readFileSync(ZYMO_PATH, "utf8");
    const zymo = JSON.parse(raw) as { results: { query: string }[] };
    fetchSpy.mockResolvedValue(fakeResponse(raw));
    renderPage("/?p=https://x/zymo.json");
    await screen.findByText("Page Size > 10", undefined, { timeout: 4000 });
    await act(async () => {});

    const expected = zymo.results
      .map((r) => r.query)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 10);
    expect(tableQueries()).toEqual(expected);
    expect(stats()).toBe(`${zymo.results.length} in 363 pages`);
  });
});
