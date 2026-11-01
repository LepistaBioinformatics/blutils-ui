import { act, render, screen } from "@testing-library/react";
import { makeBean, makeTaxon } from "@/test-utils";
import { Taxon } from "@/types/BlutilsResult";
import nullBeans from "@/__fixtures__/null-beans.result.json";
import { MiniChart } from "./MiniChart";

async function renderChart(taxon: Taxon, occurrences: number) {
  const utils = render(<MiniChart taxon={taxon} occurrences={occurrences} />);
  // let floating-ui settle its async position update
  await act(async () => {});
  return utils;
}

function bars(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-testid="flowbite-tooltip-target"] > div'
    )
  );
}

function rootSvgs(container: HTMLElement) {
  return Array.from(container.firstElementChild!.children).filter(
    (el) => el.tagName.toLowerCase() === "svg"
  );
}

function beans(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeBean({ identifier: `taxon-${i}`, rank: "genus", occurrences: 1 })
  );
}

describe("MiniChart", () => {
  test("bar width is occurrences_i / occurrences * 200px", async () => {
    const taxon = makeTaxon({
      consensusBeans: [
        makeBean({ identifier: "a", occurrences: 2 }),
        makeBean({ identifier: "b", occurrences: 1 }),
        makeBean({ identifier: "c", occurrences: 1 }),
      ],
    });
    const { container } = await renderChart(taxon, 4);
    expect(bars(container).map((bar) => bar.style.width)).toEqual([
      "100px",
      "50px",
      "50px",
    ]);
  });

  test("bars use SEQUENCIAL_COLORS in order, index 0 = #00A087", async () => {
    const { container } = await renderChart(makeTaxon({ consensusBeans: beans(2) }), 2);
    const [first, second] = bars(container);
    expect(first).toHaveStyle({ backgroundColor: "#00A087" });
    expect(second).toHaveStyle({ backgroundColor: "#5EAE00" });
  });

  test("renders at most 5 bars and no plus icon with exactly 5 beans", async () => {
    const { container } = await renderChart(makeTaxon({ consensusBeans: beans(5) }), 5);
    expect(bars(container)).toHaveLength(5);
    expect(rootSvgs(container)).toHaveLength(0);
  });

  test("more than 5 beans: 5 bars plus the FaPlus icon", async () => {
    const { container } = await renderChart(makeTaxon({ consensusBeans: beans(6) }), 6);
    expect(bars(container)).toHaveLength(5);
    expect(rootSvgs(container)).toHaveLength(1);
  });

  test("tooltip content is '<sciname> x<occurrences>'", async () => {
    const taxon = makeTaxon({
      consensusBeans: [
        makeBean({ identifier: "bacillus-subtilis", rank: "species", occurrences: 3 }),
        makeBean({ identifier: "bacillus-subtilis-group", rank: "species-group", occurrences: 2 }),
      ],
    });
    await renderChart(taxon, 5);
    const tooltips = screen.getAllByTestId("flowbite-tooltip");
    expect(tooltips).toHaveLength(2);
    expect(tooltips[0]).toHaveTextContent("Bacillus subtilis x3");
    expect(tooltips[1]).toHaveTextContent("Bacillus Subtilis Group x2");
  });

  test("occurrences = 0: invalid widths (Infinity/NaN px) are dropped by the style setter", async () => {
    const taxon = makeTaxon({
      consensusBeans: [
        makeBean({ identifier: "a", occurrences: 2 }),
        makeBean({ identifier: "b", occurrences: 0 }),
      ],
    });
    const { container } = await renderChart(taxon, 0);
    const [infinite, nan] = bars(container);
    expect(infinite.style.width).toBe("");
    expect(nan.style.width).toBe("");
    expect(infinite.getAttribute("style")).not.toMatch(/width/);
  });

  // BUG-U02: `taxon.consensusBeans.slice` used to run without a null guard.
  test("BUG-U02: consensusBeans null renders an empty chart", () => {
    const taxon = nullBeans.results[0].taxon as unknown as Taxon;
    const { container } = render(<MiniChart taxon={taxon} occurrences={1} />);
    expect(bars(container)).toHaveLength(0);
  });
});
