import { act, render, screen } from "@testing-library/react";
import { TaxonomyCell } from "./TaxonomyCell";

async function renderCell(taxonomy: string) {
  const utils = render(<TaxonomyCell taxonomy={taxonomy} />);
  // let floating-ui settle its async position update
  await act(async () => {});
  return utils;
}

function segments() {
  return screen
    .queryAllByTestId("flowbite-tooltip-target")
    .map((el) => el.textContent);
}

function tooltips() {
  return screen
    .queryAllByTestId("flowbite-tooltip")
    .map((el) => el.querySelector("div")!.textContent);
}

describe("TaxonomyCell", () => {
  test("splits on ';' and renders each 'rank__name' as '>' + plain name", async () => {
    await renderCell("d__bacteria;g__bacillus;s__bacillus-subtilis");
    expect(segments()).toEqual([">Bacteria", ">Bacillus", ">Bacillus Subtilis"]);
    expect(tooltips()).toEqual(["DOMAIN", "GENUS", "SPECIES"]);
  });

  test.each([
    ["superkingdom", "KINGDOM"],
    ["d", "DOMAIN"],
    ["p", "PHYLUM"],
    ["c", "CLASS"],
    ["o", "ORDER"],
    ["f", "FAMILY"],
    ["g", "GENUS"],
    ["s", "SPECIES"],
    ["k", "K"],
    ["no-rank", "NO-RANK"],
  ])("rank %s -> tooltip %s", async (rank, expected) => {
    await renderCell(`${rank}__x`);
    expect(tooltips()).toEqual([expected]);
  });

  test("empty taxonomy renders a single empty span", async () => {
    const { container } = await renderCell("");
    expect(container.firstElementChild!.innerHTML).toBe("<span></span>");
  });

  test("segments without exactly one '__' are rendered raw", async () => {
    const { container } = await renderCell("a__b__c;plain");
    expect(segments()).toEqual([]);
    expect(
      Array.from(container.firstElementChild!.children).map((el) => el.outerHTML)
    ).toEqual(["<span>a__b__c</span>", "<span>plain</span>"]);
  });

  // BUG-U05: kebabToPlain("") used to read word[0] of an empty string.
  test("BUG-U05: a rank with an empty name renders an empty segment", async () => {
    await renderCell("d__bacteria;g__");
    expect(segments()).toEqual([">Bacteria", ">"]);
  });
});
