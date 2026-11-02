import { act, renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ViewType } from "@/types/ViewType";
import { useResultsUrlState } from "./use-results-url-state";

function renderUrlState(route = "/") {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]} useTransitions={false}>
      {children}
    </MemoryRouter>
  );
  return renderHook(
    () => ({ state: useResultsUrlState(), search: useLocation().search }),
    { wrapper }
  );
}

function params(search: string) {
  return Object.fromEntries(new URLSearchParams(search));
}

describe("useResultsUrlState", () => {
  test("defaults to the Table view and no group", () => {
    const { result } = renderUrlState();
    expect(result.current.state.view).toBe(ViewType.Table);
    expect(result.current.state.group).toBeNull();
  });

  test("reads v and g from the URL", () => {
    const { result } = renderUrlState("/?v=grouped-by-taxonomy&g=bacillus");
    expect(result.current.state.view).toBe(ViewType.GroupedByTaxonomy);
    expect(result.current.state.group).toBe("bacillus");
  });

  test.each(["nope", "", "TABLE"])("an unknown v (%p) falls back to the Table view", (v) => {
    const { result } = renderUrlState(`/?v=${v}`);
    expect(result.current.state.view).toBe(ViewType.Table);
  });

  test("setView sets v, drops g and keeps p", () => {
    const { result } = renderUrlState("/?p=https%3A%2F%2Fx%2Fy.json&v=grouped-by-taxonomy&g=bacillus");
    act(() => result.current.state.setView(ViewType.GroupedBySubject));
    expect(params(result.current.search)).toEqual({
      p: "https://x/y.json",
      v: "grouped-by-subject",
    });
    expect(result.current.state.view).toBe(ViewType.GroupedBySubject);
    expect(result.current.state.group).toBeNull();
  });

  test("setGroup sets g and keeps p and v", () => {
    const { result } = renderUrlState("/?p=https%3A%2F%2Fx%2Fy.json&v=grouped-by-subject");
    act(() => result.current.state.setGroup("S2"));
    expect(params(result.current.search)).toEqual({
      p: "https://x/y.json",
      v: "grouped-by-subject",
      g: "S2",
    });
    expect(result.current.state.group).toBe("S2");

    act(() => result.current.state.setGroup("S3"));
    expect(result.current.state.group).toBe("S3");
    expect(params(result.current.search).v).toBe("grouped-by-subject");
  });

  test("group names with reserved URL characters round-trip", () => {
    const { result } = renderUrlState();
    act(() => result.current.state.setGroup("a&b=c d/e?f#g"));
    expect(result.current.state.group).toBe("a&b=c d/e?f#g");
  });

  test("the setters are stable across renders", () => {
    const { result, rerender } = renderUrlState();
    const { setView, setGroup } = result.current.state;
    rerender();
    expect(result.current.state.setView).toBe(setView);
    expect(result.current.state.setGroup).toBe(setGroup);
  });

  test("filter defaults to an empty string and reads ?f=", () => {
    expect(renderUrlState().result.current.state.filter).toBe("");
    const { result } = renderUrlState("/?f=q%3AS2%20id%3E%3D99");
    expect(result.current.state.filter).toBe("q:S2 id>=99");
  });

  test("setFilter sets f (trimmed) and keeps p, v and g", () => {
    const { result } = renderUrlState(
      "/?p=https%3A%2F%2Fx%2Fy.json&v=grouped-by-taxonomy&g=bacillus"
    );
    act(() => result.current.state.setFilter('  q:S2 t:"bacillus subtilis"  '));
    expect(params(result.current.search)).toEqual({
      p: "https://x/y.json",
      v: "grouped-by-taxonomy",
      g: "bacillus",
      f: 'q:S2 t:"bacillus subtilis"',
    });
    expect(result.current.state.filter).toBe('q:S2 t:"bacillus subtilis"');
  });

  test.each(["", "   "])("setFilter(%p) removes f", (empty) => {
    const { result } = renderUrlState("/?p=x&f=q%3AS2");
    act(() => result.current.state.setFilter(empty));
    expect(params(result.current.search)).toEqual({ p: "x" });
    expect(result.current.state.filter).toBe("");
  });

  test("setView keeps f (and still drops g)", () => {
    const { result } = renderUrlState("/?v=grouped-by-taxonomy&g=bacillus&f=q%3AS2");
    act(() => result.current.state.setView(ViewType.Table));
    expect(params(result.current.search)).toEqual({ v: "table", f: "q:S2" });
  });

  test("setGroup keeps f", () => {
    const { result } = renderUrlState("/?v=grouped-by-taxonomy&f=q%3AS2");
    act(() => result.current.state.setGroup("bacillus"));
    expect(params(result.current.search).f).toBe("q:S2");
  });
});
