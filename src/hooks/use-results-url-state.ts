import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ViewType } from "@/types/ViewType";

const VIEW_PARAM = "v";
const GROUP_PARAM = "g";
const FILTER_PARAM = "f";
const MODE_PARAM = "m";
const CHART_PARAM = "c";

export type GroupMode = "list" | "charts";

function parseView(value: string | null): ViewType {
  return (Object.values(ViewType) as string[]).includes(value ?? "")
    ? (value as ViewType)
    : ViewType.Table;
}

/**
 * Results view, grouped-view group and record filter, kept in the URL (`?v=`,
 * `?g=`, `?f=`) so a link restores them and back/forward walks through the
 * visited groups. Every write keeps the other params (notably `?p=`); switching
 * the view keeps the filter.
 */
export function useResultsUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const view = parseView(searchParams.get(VIEW_PARAM));
  const group = searchParams.get(GROUP_PARAM);
  const filter = searchParams.get(FILTER_PARAM) ?? "";
  const mode: GroupMode = searchParams.get(MODE_PARAM) === "charts" ? "charts" : "list";
  const chart = searchParams.get(CHART_PARAM);

  const setView = useCallback(
    (next: ViewType) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set(VIEW_PARAM, next);
        params.delete(GROUP_PARAM);
        // Chart ids belong to a view; the List/Charts mode carries over.
        params.delete(CHART_PARAM);
        return params;
      }),
    [setSearchParams]
  );

  const setGroup = useCallback(
    (name: string) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set(GROUP_PARAM, name);
        return params;
      }),
    [setSearchParams]
  );

  const setMode = useCallback(
    (next: GroupMode) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (next === "charts") params.set(MODE_PARAM, "charts");
        else params.delete(MODE_PARAM);
        return params;
      }),
    [setSearchParams]
  );

  const setChart = useCallback(
    (next: string) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set(CHART_PARAM, next);
        return params;
      }),
    [setSearchParams]
  );

  /** Leave the charts for a group's list (one history entry). */
  const openGroup = useCallback(
    (name: string) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set(GROUP_PARAM, name);
        params.delete(MODE_PARAM);
        return params;
      }),
    [setSearchParams]
  );

  const setFilter = useCallback(
    (next: string) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (next.trim()) params.set(FILTER_PARAM, next.trim());
        else params.delete(FILTER_PARAM);
        return params;
      }),
    [setSearchParams]
  );

  return useMemo(
    () => ({ view, group, filter, mode, chart, setView, setGroup, setFilter, setMode, setChart, openGroup }),
    [view, group, filter, mode, chart, setView, setGroup, setFilter, setMode, setChart, openGroup]
  );
}
