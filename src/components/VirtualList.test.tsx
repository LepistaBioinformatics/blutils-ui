import { createRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { TEST_ROW_HEIGHT, TEST_VIEWPORT } from "@/test-utils/virtual";
import { VirtualList, VirtualListHandle } from "./VirtualList";

async function renderList(count: number, listRef = createRef<VirtualListHandle>()) {
  const utils = render(
    <VirtualList
      aria-label="Items"
      count={count}
      estimateSize={TEST_ROW_HEIGHT}
      listRef={listRef}
      renderItem={(index) => <span>item {index}</span>}
    />
  );
  await act(async () => {});
  return { ...utils, listRef };
}

function mountedItems() {
  return Array.from(screen.getByLabelText("Items").querySelectorAll("[data-index]")).map(
    (el) => el.textContent
  );
}

describe("VirtualList", () => {
  test("a small list renders every item in order", async () => {
    await renderList(5);
    expect(mountedItems()).toEqual(["item 0", "item 1", "item 2", "item 3", "item 4"]);
  });

  test("an empty list renders no items", async () => {
    await renderList(0);
    expect(mountedItems()).toEqual([]);
  });

  test("a 1000-item list mounts only a window of items", async () => {
    await renderList(1000);
    const items = mountedItems();
    expect(items[0]).toBe("item 0");
    expect(items.length).toBeGreaterThanOrEqual(TEST_VIEWPORT.height / TEST_ROW_HEIGHT);
    expect(items.length).toBeLessThan(100);
  });

  test("the inner box is as tall as every item together", async () => {
    await renderList(1000);
    const inner = screen.getByLabelText("Items").firstElementChild as HTMLElement;
    expect(inner).toHaveStyle({ height: `${1000 * TEST_ROW_HEIGHT}px` });
  });

  test("scrollToIndex scrolls the box to that item", async () => {
    const { listRef } = await renderList(1000);
    const box = screen.getByLabelText("Items") as HTMLElement & { scrollTo: unknown };
    const scrollTo = jest.fn();
    box.scrollTo = scrollTo;
    // jsdom has no layout: the virtualizer clamps targets to scrollHeight - clientHeight
    Object.defineProperty(box, "scrollHeight", { value: 1000 * TEST_ROW_HEIGHT });

    act(() => listRef.current!.scrollToIndex(500));
    // align "auto" puts an item below the viewport at its bottom edge
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 501 * TEST_ROW_HEIGHT - TEST_VIEWPORT.height })
    );

    scrollTo.mockClear();
    act(() => listRef.current!.scrollToTop());
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });
});
