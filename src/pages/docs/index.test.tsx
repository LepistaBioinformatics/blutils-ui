import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { renderWithRouter } from "@/test-utils";
import { DOCS_RAW_BASE } from "./docs-config";
import { Docs } from ".";

// react-markdown and remark-gfm are ESM-only. The mock renders the Markdown
// source as text, except `![alt](src)` and `[text](href)`, which go through the
// `components` map so the page's img/a overrides can be tested.
jest.mock("react-markdown", () => {
  const TOKEN = /(!?)\[([^\]]*)\]\(([^)]*)\)/g;
  return {
    __esModule: true,
    default: ({ children, components, remarkPlugins }: any) => {
      const { img: Img, a: A } = components;
      const parts: any[] = [];
      let last = 0;
      let match: RegExpExecArray | null;
      while ((match = TOKEN.exec(children)) !== null) {
        parts.push(children.slice(last, match.index));
        const [, bang, text, target] = match;
        parts.push(
          bang ? (
            <Img key={match.index} src={target} alt={text || undefined} />
          ) : (
            <A key={match.index} href={target}>
              {text}
            </A>
          )
        );
        last = TOKEN.lastIndex;
      }
      parts.push(children.slice(last));
      return (
        <div
          data-testid="markdown"
          data-plugins={remarkPlugins.map((p: Function) => p.name).join(",")}
        >
          {parts}
        </div>
      );
    },
  };
});
jest.mock("remark-gfm", () => ({ __esModule: true, default: function remarkGfm() {} }));

type FakeResponse = { ok: boolean; status: number; text: () => Promise<string> };

function fakeResponse(body: string, init: { ok?: boolean; status?: number } = {}): FakeResponse {
  return { ok: init.ok ?? true, status: init.status ?? 200, text: () => Promise.resolve(body) };
}

function renderDocs(route = "/docs") {
  return renderWithRouter(
    <Routes>
      <Route path="/docs" element={<Docs />} />
      <Route path="/docs/:page" element={<Docs />} />
    </Routes>,
    { route }
  );
}

function sidebarLink(name: string) {
  return screen.getByRole("link", { name });
}

const ERROR_HEADING = "This page couldn't be loaded";

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
  fetchSpy = jest
    .spyOn(global, "fetch")
    .mockImplementation((url) =>
      Promise.resolve(fakeResponse(`content of ${String(url).slice(DOCS_RAW_BASE.length)}`) as unknown as Response)
    );
});

describe("Docs page — loading", () => {
  test("/docs fetches the overview (README.md) and renders it", async () => {
    renderDocs("/docs");
    expect(await screen.findByTestId("markdown")).toHaveTextContent("content of README.md");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(`${DOCS_RAW_BASE}README.md`);
  });

  test("/docs/:page fetches DOCS_RAW_BASE + the page file", async () => {
    renderDocs("/docs/create-database");
    expect(await screen.findByTestId("markdown")).toHaveTextContent(
      "content of 01_create_blutils_database.md"
    );
    expect(fetchSpy).toHaveBeenCalledWith(`${DOCS_RAW_BASE}01_create_blutils_database.md`);
  });

  test("the Markdown is rendered with the remark-gfm plugin", async () => {
    renderDocs("/docs");
    expect(await screen.findByTestId("markdown")).toHaveAttribute("data-plugins", "remarkGfm");
  });

  test("shows 'Loading documentation…' while the fetch is pending", async () => {
    let resolve!: (r: FakeResponse) => void;
    fetchSpy.mockReturnValue(new Promise((r) => (resolve = r)));
    renderDocs("/docs");
    expect(screen.getByText(/Loading documentation…/)).toBeInTheDocument();
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();

    await act(async () => resolve(fakeResponse("done")));
    expect(screen.getByTestId("markdown")).toHaveTextContent("done");
    expect(screen.queryByText(/Loading documentation…/)).not.toBeInTheDocument();
  });

  test("an unknown slug shows the error without fetching", async () => {
    renderDocs("/docs/nope");
    expect(screen.getByRole("heading", { name: ERROR_HEADING })).toBeInTheDocument();
    await act(async () => {});
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/LepistaBioinformatics/blutils/tree/main/docs/book"
    );
  });

  test("a non-ok response shows the error", async () => {
    fetchSpy.mockResolvedValue(fakeResponse("404: Not Found", { ok: false, status: 404 }));
    renderDocs("/docs");
    expect(await screen.findByRole("heading", { name: ERROR_HEADING })).toBeInTheDocument();
    expect(screen.queryByTestId("markdown")).not.toBeInTheDocument();
  });

  test("a network failure shows the error", async () => {
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    renderDocs("/docs");
    expect(await screen.findByRole("heading", { name: ERROR_HEADING })).toBeInTheDocument();
  });
});

describe("Docs page — navigation", () => {
  test("the sidebar lists every page and marks the active one with aria-current", async () => {
    renderDocs("/docs/run-blast");
    await screen.findByTestId("markdown");
    const links = ["Overview", "Create the database", "Run BLAST & consensus", "Online viewer"];
    links.forEach((name) => expect(sidebarLink(name)).toBeInTheDocument());
    expect(sidebarLink("Overview")).toHaveAttribute("href", "/docs/overview");
    expect(sidebarLink("Run BLAST & consensus")).toHaveAttribute("aria-current", "page");
    expect(sidebarLink("Overview")).not.toHaveAttribute("aria-current");
  });

  test("/docs (no slug) marks Overview as active", async () => {
    renderDocs("/docs");
    await screen.findByTestId("markdown");
    expect(sidebarLink("Overview")).toHaveAttribute("aria-current", "page");
  });

  test("clicking a sidebar link fetches the new page, moves aria-current and scrolls to the top", async () => {
    renderDocs("/docs/overview");
    await screen.findByTestId("markdown");
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });

    userEvent.click(sidebarLink("Online viewer"));
    await waitFor(() =>
      expect(screen.getByTestId("markdown")).toHaveTextContent("content of 03_blutils_online_viewer.md")
    );
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(sidebarLink("Online viewer")).toHaveAttribute("aria-current", "page");
    expect(sidebarLink("Overview")).not.toHaveAttribute("aria-current");
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });

  test("a response for a page left before it loaded is ignored (cancelled guard)", async () => {
    const pending: Record<string, (r: FakeResponse) => void> = {};
    fetchSpy.mockImplementation(
      (url) => new Promise((r) => (pending[String(url).slice(DOCS_RAW_BASE.length)] = r))
    );
    renderDocs("/docs/overview");
    userEvent.click(sidebarLink("Online viewer"));
    await act(async () => pending["03_blutils_online_viewer.md"](fakeResponse("viewer page")));
    await act(async () => pending["README.md"](fakeResponse("stale overview")));
    expect(screen.getByTestId("markdown")).toHaveTextContent("viewer page");
  });

  test("a failure for a page left before it loaded is ignored", async () => {
    const pending: Record<string, () => void> = {};
    fetchSpy.mockImplementation((url) => {
      const file = String(url).slice(DOCS_RAW_BASE.length);
      return file === "README.md"
        ? new Promise((_, reject) => (pending[file] = () => reject(new Error("late"))))
        : Promise.resolve(fakeResponse("viewer page"));
    });
    renderDocs("/docs/overview");
    userEvent.click(sidebarLink("Online viewer"));
    await screen.findByTestId("markdown");
    await act(async () => pending["README.md"]());
    expect(screen.getByTestId("markdown")).toHaveTextContent("viewer page");
    expect(screen.queryByRole("heading", { name: ERROR_HEADING })).not.toBeInTheDocument();
  });
});

describe("Docs page — markdownComponents", () => {
  async function renderMarkdown(markdown: string) {
    fetchSpy.mockResolvedValue(fakeResponse(markdown));
    renderDocs("/docs");
    return screen.findByTestId("markdown");
  }

  test("a relative image is resolved against DOCS_RAW_BASE and lazy-loaded", async () => {
    const md = await renderMarkdown("![A diagram](./images/flow.png)");
    const img = md.querySelector("img")!;
    expect(img).toHaveAttribute("src", `${DOCS_RAW_BASE}images/flow.png`);
    expect(img).toHaveAttribute("alt", "A diagram");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  test("an absolute image URL is kept and a missing alt becomes ''", async () => {
    const md = await renderMarkdown("![](https://cdn.example.org/x.png)");
    const img = md.querySelector("img")!;
    expect(img).toHaveAttribute("src", "https://cdn.example.org/x.png");
    expect(img).toHaveAttribute("alt", "");
  });

  test("a link to a book page becomes an in-app link that navigates", async () => {
    const md = await renderMarkdown(
      "See [the BLAST step](./02_run_blast_and_generate_consensus_identities.md#usage)."
    );
    const link = screen.getByRole("link", { name: "the BLAST step" });
    expect(md).toContainElement(link);
    expect(link).toHaveAttribute("href", "/docs/run-blast");
    expect(link).not.toHaveAttribute("target");

    userEvent.click(link);
    await waitFor(() =>
      expect(fetchSpy).toHaveBeenLastCalledWith(
        `${DOCS_RAW_BASE}02_run_blast_and_generate_consensus_identities.md`
      )
    );
    await act(async () => {});
    expect(sidebarLink("Run BLAST & consensus")).toHaveAttribute("aria-current", "page");
  });

  test("an external http(s) link opens in a new tab", async () => {
    await renderMarkdown("[NCBI](https://www.ncbi.nlm.nih.gov/)");
    const link = screen.getByRole("link", { name: "NCBI" });
    expect(link).toHaveAttribute("href", "https://www.ncbi.nlm.nih.gov/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  test.each([
    ["an in-page anchor", "#install"],
    ["a mailto link", "mailto:lab@example.org"],
    ["a repo file outside the book", "../CHANGELOG.md"],
  ])("%s stays a plain link in the same tab", async (_, href) => {
    await renderMarkdown(`[target](${href})`);
    const link = screen.getByRole("link", { name: "target" });
    expect(link).toHaveAttribute("href", href);
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });
});
