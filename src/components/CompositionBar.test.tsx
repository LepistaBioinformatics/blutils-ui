import { render, screen } from "@testing-library/react";
import { Taxon } from "@/types/BlutilsResult";
import { makeBean, makeTaxon } from "@/test-utils";
import { CompositionBar } from "./CompositionBar";

function renderBar(taxon: Taxon) {
  render(<CompositionBar taxon={taxon} />);
  return screen.getByTestId("composition");
}

function segments() {
  return screen.queryAllByTestId("composition-segment");
}

function titles() {
  return segments().map((s) => s.getAttribute("title"));
}

function widths() {
  return segments().map((s) => parseFloat(s.style.width));
}

function beans(occurrences: number[]) {
  return occurrences.map((n, i) =>
    makeBean({ identifier: `genus-${i}`, rank: "genus", occurrences: n })
  );
}

describe("CompositionBar", () => {
  test("the values row reads identity (one decimal) % then bit score bits", () => {
    const root = renderBar(makeTaxon({ percIdentity: 99.356, bitScore: 843 }));
    expect(root).toHaveTextContent(/^99\.4%843bits/);
  });

  test("segments are sorted by occurrences, largest first, with sciname ×n titles", () => {
    renderBar(
      makeTaxon({
        consensusBeans: [
          makeBean({ identifier: "bacillus-cereus", rank: "species", occurrences: 2 }),
          makeBean({ identifier: "bacillus-subtilis", rank: "species", occurrences: 4 }),
        ],
      })
    );
    expect(titles()).toEqual(["Bacillus subtilis ×4", "Bacillus cereus ×2"]);
  });

  test("the bar's aria-label lists every bean, sorted, beyond the top 5 too", () => {
    renderBar(makeTaxon({ consensusBeans: beans([1, 7, 6, 5, 4, 3, 2]) }));
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      "Composition: Genus 1 ×7, Genus 2 ×6, Genus 3 ×5, Genus 4 ×4, Genus 5 ×3, Genus 6 ×2, Genus 0 ×1"
    );
  });

  test("five beans make five segments and no '+N'", () => {
    renderBar(makeTaxon({ consensusBeans: beans([5, 4, 3, 2, 1]) }));
    expect(segments()).toHaveLength(5);
    expect(screen.queryByTitle(/more$/)).not.toBeInTheDocument();
  });

  test("beyond 5 beans only the top 5 get segments and the rest is a '+N' marker", () => {
    renderBar(makeTaxon({ consensusBeans: beans([7, 6, 5, 4, 3, 2, 1]) }));
    expect(segments()).toHaveLength(5);
    expect(titles()).not.toContain("Genus 5 ×2");
    const more = screen.getByTitle("2 more");
    expect(more).toHaveTextContent(/^\+2$/);
    // no "others" segment
    expect(titles().some((t) => /others/.test(t!))).toBe(false);
  });

  test("widths are proportional to occurrences over the total of all beans", () => {
    renderBar(makeTaxon({ consensusBeans: beans([3, 1]) }));
    expect(widths()).toEqual([75, 25]);
  });

  test("hidden beans still count in the total, so the shown widths sum below 100%", () => {
    renderBar(makeTaxon({ consensusBeans: beans([5, 5, 5, 5, 5, 5, 10]) }));
    // total 40: 10 → 25%, each 5 → 12.5%; two 5s are hidden
    expect(widths()).toEqual([25, 12.5, 12.5, 12.5, 12.5]);
    expect(widths().reduce((a, b) => a + b, 0)).toBe(75);
  });

  // BUG-U02: `consensusBeans` is nullable (Option in Rust).
  test("BUG-U02: consensusBeans null renders the values and an empty bar", () => {
    const root = renderBar(makeTaxon({ consensusBeans: null, percIdentity: 100, bitScore: 845 }));
    expect(segments()).toHaveLength(0);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Composition: no consensus beans");
    expect(root).toHaveTextContent(/^100\.0%845bits$/);
  });

  test("BUG-U02: an empty bean list renders an empty bar", () => {
    renderBar(makeTaxon({ consensusBeans: [] }));
    expect(segments()).toHaveLength(0);
    expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Composition: no consensus beans");
  });

  test("beans whose occurrences sum to zero render no segments", () => {
    renderBar(makeTaxon({ consensusBeans: beans([0, 0]) }));
    expect(segments()).toHaveLength(0);
  });
});
