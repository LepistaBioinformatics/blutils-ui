import { act, fireEvent, render, screen } from "@testing-library/react";
import { triggerIntersection } from "@/test-utils";
import SectionScroller from "./SectionScroller";

function items(count: number) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} data-testid="item">
      item-{i}
    </div>
  ));
}

function renderScroller(name = "S1", totalItems = 50, containerHeight = 400) {
  const utils = render(
    <SectionScroller
      name={name}
      rowHeight={40}
      totalItems={totalItems}
      items={items(totalItems)}
      visibleItemsLength={10}
      containerHeight={containerHeight}
    />
  );
  const section = document.getElementById(name) as HTMLElement;
  return { ...utils, section };
}

function showSection() {
  act(() => triggerIntersection(true));
}

function renderedItems() {
  return screen.queryAllByTestId("item").map((el) => el.textContent);
}

function scrollContainer(section: HTMLElement) {
  return section.children[1] as HTMLElement;
}

function track(section: HTMLElement) {
  return scrollContainer(section).firstElementChild!.firstElementChild as HTMLElement;
}

describe("GroupedByQueryView/SectionScroller", () => {
  test("renders an anchor section with minHeight = containerHeight + 129 and no content", () => {
    const { section } = renderScroller("S1", 50, 400);
    expect(section).toHaveStyle({ minHeight: "529px" });
    expect(section).toBeEmptyDOMElement();
  });

  test("after intersecting shows the name and count, without rank or taxonomy", () => {
    const { section } = renderScroller("S1", 3, 120);
    showSection();
    const header = section.querySelector("h3")!;
    expect(header).toHaveTextContent(/^S1x3$/);
    expect(screen.queryByTestId("flowbite-tooltip")).not.toBeInTheDocument();
  });

  test("BUG-U18: the query name is shown verbatim", () => {
    // BUG-U18: the name used to go through kebabToScinameString ("S1_rule two").
    const { section } = renderScroller("s1_rule-two", 3, 120);
    showSection();
    expect(section.querySelector("h3")).toHaveTextContent(/^s1_rule-twox3$/);
  });

  test("leaving the viewport hides the content again", () => {
    const { section } = renderScroller();
    showSection();
    act(() => triggerIntersection(false));
    expect(section).toBeEmptyDOMElement();
  });

  test("scroll container is containerHeight + 25 tall and the inner track rowHeight * totalItems", () => {
    const { section } = renderScroller("S1", 50, 400);
    showSection();
    expect(scrollContainer(section)).toHaveStyle({ height: "425px", overflow: "auto" });
    expect(scrollContainer(section).firstElementChild).toHaveStyle({ height: "2000px" });
  });

  test("initially renders visibleItemsLength + 1 items with no offset", () => {
    const { section } = renderScroller();
    showSection();
    expect(renderedItems()).toEqual(Array.from({ length: 11 }, (_, i) => `item-${i}`));
    expect(track(section).style.transform).toBe("translateY(0px)");
  });

  test("scrollTop 400 renders items 10..20 translated by 400px", () => {
    const { section } = renderScroller();
    showSection();
    fireEvent.scroll(scrollContainer(section), { target: { scrollTop: 400 } });
    expect(renderedItems()).toEqual(Array.from({ length: 11 }, (_, i) => `item-${i + 10}`));
    expect(track(section).style.transform).toBe("translateY(400px)");
  });

  test("near the end only the remaining items are rendered", () => {
    const { section } = renderScroller();
    showSection();
    fireEvent.scroll(scrollContainer(section), { target: { scrollTop: 1800 } });
    expect(renderedItems()).toEqual(Array.from({ length: 5 }, (_, i) => `item-${i + 45}`));
    expect(track(section).style.transform).toBe("translateY(1800px)");
  });
});
