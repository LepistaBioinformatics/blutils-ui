import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChartPanel, ChartKind } from "./ChartPanel";
import { makeResult, makeTaxon } from "@/test-utils";
import { ConsensusBean, Result } from "@/types/BlutilsResult";

const bean = (identifier: string, occurrences: number): ConsensusBean => ({
  rank: "species",
  identifier,
  occurrences,
  taxonomy: null,
  accessions: [],
});

const SACC = "k__fungi;p__ascomycota;g__saccharomyces";
const CRYP = "k__fungi;p__basidiomycota;g__cryptococcus";

function rec(query: string, taxonomy: string, identifier: string, identity = 99): Result {
  return makeResult({
    query,
    taxon: makeTaxon({ identifier, taxonomy, percIdentity: identity, consensusBeans: [bean(identifier, 1)] }),
  });
}

// Taxonomy view groups (by identifier) and subject view groups (by sample).
const RECORDS = [
  rec("S1.1_size_100", SACC, "saccharomyces"),
  rec("S1.2_size_1", CRYP, "cryptococcus", 95),
  rec("S2.1_size_1", CRYP, "cryptococcus", 97),
  rec("S2.2_size_1", CRYP, "cryptococcus", 98),
];
const BY_TAXON = [
  { name: "cryptococcus", chunk: RECORDS.slice(1) },
  { name: "saccharomyces", chunk: RECORDS.slice(0, 1) },
];
const BY_SUBJECT = [
  { name: "S1", chunk: RECORDS.slice(0, 2) },
  { name: "S2", chunk: RECORDS.slice(2) },
];

function renderPanel(kind: ChartKind, chart: string | null) {
  const handlers = { onChartChange: jest.fn(), onOpenGroup: jest.fn(), onFilterTaxonomy: jest.fn() };
  render(
    <ChartPanel
      kind={kind}
      groups={kind === "taxonomy" ? BY_TAXON : BY_SUBJECT}
      chart={chart}
      groupLabel={(name) => name}
      {...handlers}
    />
  );
  return handlers;
}

const abundanceRows = () =>
  within(screen.getByRole("list", { name: "Abundance by taxon" }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

describe("ChartPanel", () => {
  test("offers the charts of its view; an unknown chart id falls back to the first", () => {
    const { onChartChange } = renderPanel("taxonomy", "nope");
    const charts = within(screen.getByRole("group", { name: "Chart" })).getAllByRole("button");
    expect(charts.map((b) => b.textContent)).toEqual(["Abundance", "Lineage", "Confidence"]);
    expect(charts[0]).toHaveAttribute("aria-pressed", "true");
    userEvent.click(charts[2]);
    expect(onChartChange).toHaveBeenCalledWith("confidence");
  });

  test("abundance: bars by records, then by reads (size_N)", () => {
    renderPanel("taxonomy", "abundance");
    expect(abundanceRows()).toEqual(["Cryptococcus3 · 75%", "Saccharomyces1 · 25%"]);
    userEvent.click(screen.getByRole("button", { name: /^reads$/i }));
    expect(abundanceRows()).toEqual(["Saccharomyces100 · 97%", "Cryptococcus3 · 2.9%"]);
  });

  test("abundance: the rank selector re-aggregates (phylum)", () => {
    renderPanel("taxonomy", "abundance");
    userEvent.selectOptions(screen.getByRole("combobox", { name: "Rank" }), "phylum");
    expect(abundanceRows()).toEqual(["Basidiomycota3 · 75%", "Ascomycota1 · 25%"]);
  });

  test("abundance: clicking a bar opens the matching group", () => {
    const { onOpenGroup } = renderPanel("taxonomy", "abundance");
    userEvent.click(screen.getByRole("button", { name: /^Saccharomyces: .* Open the group$/ }));
    expect(onOpenGroup).toHaveBeenCalledWith("saccharomyces");
  });

  // jsdom 16 has no PointerEvent coordinates; focus drives the same tooltip.
  test("abundance: a focused bar shows a tooltip, hidden again on blur", () => {
    renderPanel("taxonomy", "abundance");
    const bar = screen.getByRole("button", { name: /^Cryptococcus: / });
    fireEvent.focus(bar);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Cryptococcus3 records · 75%");
    fireEvent.blur(bar);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("sunburst: zooming into a branch, filtering by it and zooming back", () => {
    const { onFilterTaxonomy } = renderPanel("taxonomy", "sunburst");
    const fungi = screen.getByRole("button", { name: /^Fungi: 4 records, 100%\. Zoom in$/ });
    userEvent.click(fungi);
    userEvent.click(screen.getByRole("button", { name: /^Basidiomycota: 3 records, 75%\. Zoom in$/ }));
    userEvent.click(screen.getByRole("button", { name: "Filter by Basidiomycota" }));
    expect(onFilterTaxonomy).toHaveBeenCalledWith("fungi > basidiomycota");
    userEvent.click(within(screen.getByRole("navigation", { name: "Sunburst zoom" })).getByRole("button", { name: "All" }));
    expect(screen.queryByRole("button", { name: /^Filter by/ })).not.toBeInTheDocument();
  });

  test("confidence: one row per group with an identity median and a rule mix", () => {
    renderPanel("taxonomy", "confidence");
    const table = screen.getByRole("table", { name: "Confidence per group" });
    expect(within(table).getAllByTestId("identity-median")).toHaveLength(2);
    expect(within(table).getByLabelText(/^cryptococcus identity: median 97\.0%/)).toBeInTheDocument();
    expect(within(table).getAllByTestId("rule-segment").length).toBeGreaterThan(0);
  });

  test("composition: one stacked bar per subject with a legend", () => {
    renderPanel("subject", "composition");
    expect(within(screen.getByRole("list", { name: "Legend" })).getAllByRole("listitem").map((i) => i.textContent)).toEqual([
      "Cryptococcus",
      "Saccharomyces",
      "Other",
    ]);
    expect(screen.getByLabelText("Saccharomyces: 50% of S1")).toBeInTheDocument();
    expect(screen.getByLabelText("Cryptococcus: 100% of S2")).toBeInTheDocument();
  });

  test("heatmap: a cell per subject and taxon with its share", () => {
    renderPanel("subject", "heatmap");
    expect(screen.getAllByTestId("heatmap-cell")).toHaveLength(4);
    expect(screen.getByLabelText("Cryptococcus in S2: 100%")).toBeInTheDocument();
  });

  test("summary: records, reads, matched and mean identity per subject", () => {
    renderPanel("subject", "summary");
    const rows = within(screen.getByRole("table", { name: "Summary per subject" })).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell").slice(0, 4).map((c) => c.textContent))).toEqual([
      ["2", "101", "100%", "97.0%"],
      ["2", "2", "100%", "97.5%"],
    ]);
  });

  test("ranked charts show the rank selector; the others do not", () => {
    renderPanel("subject", "summary");
    expect(screen.queryByRole("combobox", { name: "Rank" })).not.toBeInTheDocument();
  });
});
