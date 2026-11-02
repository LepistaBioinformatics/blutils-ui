import { render, screen } from "@testing-library/react";
import App from "./App";

// react-markdown and remark-gfm are ESM-only; the lazy docs route imports them.
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => {} }));

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
  fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    text: () => Promise.resolve("# Overview"),
  } as unknown as Response);
});

afterEach(() => {
  window.history.pushState({}, "", "/");
});

test("renders the result loader at the root route", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: /open your results/i })
  ).toBeInTheDocument();
});

test("renders the not-found page for unknown routes", () => {
  window.history.pushState({}, "", "/does-not-exist");

  render(<App />);

  expect(screen.getByText(/page not found/i, { selector: "p" })).toBeInTheDocument();
});

test("the root route is wrapped in the Shell", () => {
  render(<App />);

  expect(screen.getByText("Blutils UI")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Documentation" })).toBeInTheDocument();
});

test("the not-found page is rendered outside the Shell", () => {
  window.history.pushState({}, "", "/does-not-exist");

  render(<App />);

  expect(screen.queryByText("Blutils UI")).not.toBeInTheDocument();
});

test("/404 renders the not-found page", () => {
  window.history.pushState({}, "", "/404");

  render(<App />);

  expect(screen.getByText("Page not found", { selector: "p" })).toBeInTheDocument();
});

test("/5xx renders the internal error page", () => {
  window.history.pushState({}, "", "/5xx");

  render(<App />);

  expect(screen.getByText("Oh no!")).toBeInTheDocument();
  expect(screen.queryByText("Blutils UI")).not.toBeInTheDocument();
});

// `Docs` is a module-scoped lazy(): once resolved, the fallback never shows
// again in this file, so this must stay the first test that visits /docs.
test("/docs shows the lazy 'Loading…' fallback, then the docs page", async () => {
  window.history.pushState({}, "", "/docs");

  render(<App />);

  expect(screen.getByText(/^Loading…$/)).toBeInTheDocument();
  expect(await screen.findByTestId("markdown")).toHaveTextContent("# Overview");
  expect(screen.queryByText(/^Loading…$/)).not.toBeInTheDocument();
  expect(fetchSpy).toHaveBeenCalledTimes(1);
});

test("/docs/:page loads the requested page", async () => {
  window.history.pushState({}, "", "/docs/run-blast");

  render(<App />);

  await screen.findByTestId("markdown");
  expect(fetchSpy).toHaveBeenCalledWith(
    expect.stringMatching(/\/docs\/book\/02_run_blast_and_generate_consensus_identities\.md$/)
  );
});
