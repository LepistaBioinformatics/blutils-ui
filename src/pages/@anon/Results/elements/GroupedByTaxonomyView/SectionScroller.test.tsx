import { act, fireEvent, render, screen } from "@testing-library/react";
import { triggerIntersection } from "@/test-utils";
import SectionScroller from "./SectionScroller";

const TAXONOMY = "d__bacteria;p__bacillota;g__bacillus";

function items(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} data-testid="item">
      item-{i}
    </div>
  ));
}

function renderScroller(totalItems = 50, containerHeight = 400) {
  const utils = render(
    <SectionScroller
      name="bacillus-subtilis"
      rank="species"
      taxonomy={TAXONOMY}
      rowHeight={40}
      totalItems={totalItems}
      items={items(totalItems)}
      visibleItemsLength={10}
      containerHeight={containerHeight}
    />
  );
  const section = document.getElementById("bacillus-subtilis") as HTMLElement;
  return { ...utils, section };
}

async function showSection() {
  act(() => triggerIntersection(true));
  // let floating-ui (TaxonomyCell tooltips) settle
  await act(async () => {});
}

function renderedItems() {
  return screen.queryAllByTestId("item").map((el) => el.textContent);
}

function scrollContainer(section: HTMLElement) {
  return section.children[1] as HTMLElement;
}

describe("GroupedByTaxonomyView/SectionScroller", () => {
  test("renders an anchor section with minHeight = containerHeight + 129 and no content", () => {
    const { section } = renderScroller(50, 400);
    expect(section).toHaveStyle({ minHeight: "529px" });
    expect(section).toBeEmptyDOMElement();
  });

  test("shows the header only after the section intersects", async () => {
    const { section } = renderScroller(50);
    await showSection();
    const header = section.querySelector("h3")!;
    expect(header).toHaveTextContent("Bacillus subtilis");
    expect(header).toHaveTextContent("Species");
    expect(header).toHaveTextContent("x50");
    // TaxonomyCell is rendered in the header (taxonomy view only)
    expect(header).toHaveTextContent("Bacillota");
    expect(screen.getAllByTestId("flowbite-tooltip").map((t) => t.textContent!.trim())).toEqual([
      "DOMAIN",
      "PHYLUM",
      "GENUS",
    ]);
  });

  test("leaving the viewport hides the content again", async () => {
    const { section } = renderScroller(50);
    await showSection();
    act(() => triggerIntersection(false));
    expect(section).toBeEmptyDOMElement();
  });

  test("scroll container is containerHeight + 25 tall and the inner track rowHeight * totalItems", async () => {
    const { section } = renderScroller(50, 400);
    await showSection();
    const container = scrollContainer(section);
    expect(container).toHaveStyle({ height: "425px", overflow: "auto" });
    expect(container.firstElementChild).toHaveStyle({ height: "2000px" });
  });

  test("initially renders visibleItemsLength + 1 items with no offset", async () => {
    const { section } = renderScroller(50);
    await showSection();
    expect(renderedItems()).toEqual(
      Array.from({ length: 11 }, (_, i) => `item-${i}`)
    );
    const track = scrollContainer(section).firstElementChild!.firstElementChild as HTMLElement;
    expect(track.style.transform).toBe("translateY(0px)");
  });

  test("scrollTop 400 renders items 10..20 translated by 400px", async () => {
    const { section } = renderScroller(50);
    await showSection();
    fireEvent.scroll(scrollContainer(section), { target: { scrollTop: 400 } });
    expect(renderedItems()).toEqual(
      Array.from({ length: 11 }, (_, i) => `item-${i + 10}`)
    );
    const track = scrollContainer(section).firstElementChild!.firstElementChild as HTMLElement;
    expect(track.style.transform).toBe("translateY(400px)");
  });

  test("a partial row scroll rounds the first item up", async () => {
    const { section } = renderScroller(50);
    await showSection();
    fireEvent.scroll(scrollContainer(section), { target: { scrollTop: 41 } });
    expect(renderedItems()[0]).toBe("item-2");
    const track = scrollContainer(section).firstElementChild!.firstElementChild as HTMLElement;
    expect(track.style.transform).toBe("translateY(80px)");
  });
});
