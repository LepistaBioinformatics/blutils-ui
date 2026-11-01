import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { renderWithRouter } from "@/test-utils";
import small from "@/__fixtures__/small.result.json";
import { ResultLoader } from "./ResultLoader";

const EXAMPLE_RAW_RESULT_URL =
  "https://raw.githubusercontent.com/LepistaBioinformatics/blutils/8c42f3e7bfe2d1e9de2038985e7c9a47625b6e78/test/mock/output/zymo-mock/blutils.consensus.json";

const INVALID_FILE = /isn't a valid Blutils result/;
const SAMPLE_FAILED = /Couldn't load the sample dataset/;
const URL_FAILED = /Couldn't load the result file/;

function LocationProbe() {
  return <div data-testid="location-search">{useLocation().search}</div>;
}

function renderLoader(route = "/") {
  const resultSetter = jest.fn();
  const utils = renderWithRouter(
    <>
      <ResultLoader resultSetter={resultSetter} />
      <LocationProbe />
    </>,
    { route }
  );
  // the label text changes after a selection, so keep the input reference
  const input = screen.getByLabelText(/choose your result file/i) as HTMLInputElement;
  return { ...utils, resultSetter, input };
}

function search() {
  return new URLSearchParams(screen.getByTestId("location-search").textContent!);
}

function jsonFile(content: string, name = "blutils.consensus.json") {
  return new File([content], name, { type: "application/json" });
}

function viewButton() {
  return screen.getByRole("button", { name: "View results" });
}

function sampleButton() {
  return screen.getByRole("button", { name: "Load a sample dataset" });
}

function fakeResponse(body: string, init: { ok?: boolean; status?: number } = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

let fetchSpy: jest.SpyInstance;

// Waits until `fetch` was called `calls` times and every load has finished,
// then checks that no further fetch happens.
async function settle(calls: number) {
  await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(calls));
  await waitFor(() => expect(sampleButton()).toBeEnabled());
  await act(async () => {});
  expect(fetchSpy).toHaveBeenCalledTimes(calls);
}

beforeEach(() => {
  fetchSpy = jest
    .spyOn(global, "fetch")
    .mockResolvedValue(fakeResponse(JSON.stringify(small)));
});

describe("ResultLoader — file upload", () => {
  test("'View results' is disabled until a file is selected", () => {
    renderLoader();
    expect(viewButton()).toBeDisabled();
    expect(screen.getByText("blutils.consensus.json from your run")).toBeInTheDocument();
  });

  test("selecting a file shows its name and enables 'View results'", () => {
    const { input } = renderLoader();
    userEvent.upload(input, jsonFile("{}", "my-run.json"));
    expect(screen.getByText("my-run.json")).toBeInTheDocument();
    expect(screen.getByText("Click to choose a different file")).toBeInTheDocument();
    expect(viewButton()).toBeEnabled();
  });

  test("a valid upload calls resultSetter with the parsed object and sets ?p=<file name>", async () => {
    const { input, resultSetter } = renderLoader();
    userEvent.upload(input, jsonFile(JSON.stringify(small), "small.json"));
    userEvent.click(viewButton());
    await waitFor(() => expect(resultSetter).toHaveBeenCalledTimes(1));
    expect(resultSetter).toHaveBeenCalledWith(small);
    expect(search().get("p")).toBe("small.json");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // a bare file name is not a URL, so nothing is fetched
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test.each([
    ["an object without results", '{"foo": 1}'],
    ["an array", "[]"],
    ["results: null", '{"results":null}'],
  ])("BUG-U06: wrong-shape JSON (%s) shows the 'not a valid Blutils result' alert", async (_, content) => {
    // BUG-U06: wrong-shape JSON used to be passed to resultSetter and crash the parent.
    const { input, resultSetter } = renderLoader();
    userEvent.upload(input, jsonFile(content));
    userEvent.click(viewButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_FILE);
    expect(resultSetter).not.toHaveBeenCalled();
    expect(search().has("p")).toBe(false);
  });

  test.each([
    ["invalid JSON", "{not json"],
    ["JSONL (two JSON documents)", '{"query":"a"}\n{"query":"b"}\n'],
  ])("%s shows the 'not a valid Blutils result' alert", async (_, content) => {
    const { input, resultSetter } = renderLoader();
    userEvent.upload(input, jsonFile(content));
    userEvent.click(viewButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_FILE);
    expect(resultSetter).not.toHaveBeenCalled();
    expect(search().has("p")).toBe(false);
  });

  // U11: JSON-only by design. The UI (and the engine) only produce/consume
  // JSON, so YAML and JSONL uploads are rejected.
  test("U11: the file input only accepts JSON", () => {
    const { input } = renderLoader();
    expect(input).toHaveAttribute("accept", ".json,application/json");
  });

  test.each([
    [
      "YAML",
      new File(["results:\n  - query: S1\n"], "blutils.consensus.yaml", {
        type: "application/yaml",
      }),
    ],
    [
      "JSONL",
      new File(['{"query":"a"}\n{"query":"b"}\n'], "blutils.consensus.jsonl", {
        type: "application/jsonl",
      }),
    ],
  ])("U11: a %s upload shows the 'not a valid Blutils result' alert", async (_, file) => {
    // U11: JSON-only by design.
    const { input, resultSetter } = renderLoader();
    userEvent.upload(input, file);
    userEvent.click(viewButton());
    expect(await screen.findByRole("alert")).toHaveTextContent(INVALID_FILE);
    expect(resultSetter).not.toHaveBeenCalled();
    expect(search().has("p")).toBe(false);
  });

  test("choosing another file clears the error", async () => {
    const { input } = renderLoader();
    userEvent.upload(input, jsonFile("{not json"));
    userEvent.click(viewButton());
    await screen.findByRole("alert");
    userEvent.upload(input, jsonFile("{}", "other.json"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("ResultLoader — ?p= URL", () => {
  test("?p=<http(s) URL> fetches it on mount and passes the result to resultSetter", async () => {
    const { resultSetter } = renderLoader("/?p=https://x/y.json");
    await waitFor(() => expect(resultSetter).toHaveBeenCalledWith(small));
    await settle(1); // BUG-U19: used to fetch twice
    expect(fetchSpy).toHaveBeenCalledWith("https://x/y.json");
    expect(search().get("p")).toBe("https://x/y.json");
  });

  test("BUG-U19: ?p=<unencoded URL> is fetched once although setSearchParams re-encodes it", async () => {
    // BUG-U19: `?p=https://x/y.json` becomes `?p=https%3A%2F%2Fx%2Fy.json` after
    // the first load; the navigation used to re-run the effect and fetch again.
    const { resultSetter } = renderLoader("/?p=https://x/y.json");
    await settle(1);
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual(["https://x/y.json"]);
    expect(resultSetter).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?p=https%3A%2F%2Fx%2Fy.json"
    );
  });

  test.each(["foo", "blutils.consensus.json"])("?p=%s is not a URL and is not fetched", async (p) => {
    const { resultSetter } = renderLoader(`/?p=${p}`);
    await act(async () => {});
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(resultSetter).not.toHaveBeenCalled();
  });

  test("BUG-U20: a failing ?p= URL shows a generic error message", async () => {
    // BUG-U20: the message used to mention the sample dataset even for a user URL.
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    renderLoader("/?p=https://x/y.json");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(URL_FAILED);
    expect(alert).not.toHaveTextContent(SAMPLE_FAILED);
    await settle(1);
  });

  test("BUG-U06: a ?p= URL with a wrong-shape body shows an error", async () => {
    fetchSpy.mockResolvedValue(fakeResponse('{"foo": 1}'));
    const { resultSetter } = renderLoader("/?p=https://x/y.json");
    // OP-04: a fetched body that is not a Blutils result gets the upload message.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(INVALID_FILE);
    expect(alert).not.toHaveTextContent(URL_FAILED);
    await settle(1);
    expect(resultSetter).not.toHaveBeenCalled();
  });

  test("OP-04: a ?p= URL with an invalid JSON body shows the 'not a valid Blutils result' alert", async () => {
    // OP-04: invalid JSON fetched from ?p= used to show the load error.
    fetchSpy.mockResolvedValue(fakeResponse("{not json"));
    const { resultSetter } = renderLoader("/?p=https://x/y.json");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(INVALID_FILE);
    expect(alert).not.toHaveTextContent(URL_FAILED);
    await settle(1);
    expect(resultSetter).not.toHaveBeenCalled();
  });

  test("OP-04: a non-ok ?p= response still shows the load error", async () => {
    // OP-04: only parse/shape failures switch to the upload message.
    fetchSpy.mockResolvedValue(fakeResponse(JSON.stringify(small), { ok: false, status: 500 }));
    const { resultSetter } = renderLoader("/?p=https://x/y.json");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(URL_FAILED);
    expect(alert).not.toHaveTextContent(INVALID_FILE);
    await settle(1);
    expect(resultSetter).not.toHaveBeenCalled();
  });
});

describe("ResultLoader — sample dataset", () => {
  test("the sample button fetches EXAMPLE_RAW_RESULT_URL and sets ?p=<url>", async () => {
    const { resultSetter } = renderLoader();
    userEvent.click(sampleButton());
    await settle(1);
    expect(search().get("p")).toBe(EXAMPLE_RAW_RESULT_URL);
    expect(fetchSpy).toHaveBeenCalledWith(EXAMPLE_RAW_RESULT_URL);
    expect(resultSetter).toHaveBeenCalledWith(small);
  });

  test("BUG-U19: a successful sample load fetches and sets the result once", async () => {
    // BUG-U19: setting ?p=<url> after the first load used to make the ?p= effect
    // fetch again.
    const { resultSetter } = renderLoader();
    userEvent.click(sampleButton());
    await settle(1);
    expect(resultSetter).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([EXAMPLE_RAW_RESULT_URL]);
  });

  test("while loading the button is disabled and a spinner is shown", async () => {
    let resolve!: (r: Response) => void;
    fetchSpy.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    renderLoader();
    userEvent.click(sampleButton());
    expect(sampleButton()).toBeDisabled();
    expect(screen.getByRole("status")).toBeInTheDocument();

    fetchSpy.mockResolvedValue(fakeResponse(JSON.stringify(small)));
    await act(async () => resolve(fakeResponse(JSON.stringify(small))));
    await settle(1); // BUG-U19: used to fetch twice
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("a network failure shows 'Couldn't load the sample dataset'", async () => {
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    const { resultSetter } = renderLoader();
    userEvent.click(sampleButton());
    // OP-04: network failures keep the load error, not the upload message.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(SAMPLE_FAILED);
    expect(alert).not.toHaveTextContent(INVALID_FILE);
    expect(resultSetter).not.toHaveBeenCalled();
    await settle(1);
    expect(search().has("p")).toBe(false);
  });

  test("a 404 HTML page shows the sample-dataset error", async () => {
    fetchSpy.mockResolvedValue(fakeResponse("<html>Not Found</html>", { ok: false, status: 404 }));
    const { resultSetter } = renderLoader();
    userEvent.click(sampleButton());
    // OP-04: a non-ok response keeps the load error even though the body is not JSON.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(SAMPLE_FAILED);
    expect(alert).not.toHaveTextContent(INVALID_FILE);
    await settle(1);
    expect(resultSetter).not.toHaveBeenCalled();
  });

  // BUG-U07: `response.ok` used to be ignored. The body is a valid result so
  // only the status check (not the BUG-U06 shape check) can reject it.
  test("BUG-U07: a non-ok response shows an error and is not passed to resultSetter", async () => {
    fetchSpy.mockResolvedValue(fakeResponse(JSON.stringify(small), { ok: false, status: 404 }));
    const { resultSetter } = renderLoader();
    userEvent.click(sampleButton());
    // OP-04: a non-ok response keeps the sample load error.
    expect(await screen.findByRole("alert")).toHaveTextContent(SAMPLE_FAILED);
    await settle(1);
    expect(resultSetter).not.toHaveBeenCalled();
  });

  test.each([
    ["an object without results", '{"foo": 1}'],
    ["invalid JSON", "{not json"],
  ])(
    "OP-04: a sample body with %s shows the 'not a valid Blutils result' alert",
    async (_, body) => {
      // OP-04: a fetched sample body that is not a Blutils result used to show
      // the load error; it now shows the upload message.
      fetchSpy.mockResolvedValue(fakeResponse(body));
      const { resultSetter } = renderLoader();
      userEvent.click(sampleButton());
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(INVALID_FILE);
      expect(alert).not.toHaveTextContent(SAMPLE_FAILED);
      await settle(1);
      expect(resultSetter).not.toHaveBeenCalled();
      expect(search().has("p")).toBe(false);
    }
  );
});
