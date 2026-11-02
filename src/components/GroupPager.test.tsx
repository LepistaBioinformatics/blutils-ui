import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupPager, PagerGroup } from "./GroupPager";

const GROUPS: PagerGroup[] = ["alpha", "beta", "gamma"].map((name, i) => ({
  name,
  label: name.toUpperCase(),
  count: i + 1,
}));

async function renderPager(current: number, groups = GROUPS) {
  const onNavigate = jest.fn();
  const utils = render(
    <GroupPager groups={groups} current={current} onNavigate={onNavigate}>
      <div>content of {groups[current].name}</div>
    </GroupPager>
  );
  // let the sidebar virtualizer measure its entries
  await act(async () => {});
  return { ...utils, onNavigate };
}

// Both the wide bars and the mobile bar are in the DOM (jsdom applies no CSS).
function navButtons(name: "Previous group" | "Next group") {
  return screen.queryAllByRole("button", { name });
}

function sidebar() {
  return screen.getByRole("navigation", { name: "Groups" });
}

function sidebarEntries() {
  return within(sidebar()).getAllByRole("button");
}

function pressKey(key: string, init: KeyboardEventInit = {}, target: Element = document.body) {
  fireEvent.keyDown(target, { key, ...init });
}

describe("GroupPager", () => {
  test("renders the children of the current group", async () => {
    await renderPager(1);
    expect(screen.getByText("content of beta")).toBeInTheDocument();
  });

  test("the first group has no 'Previous group' chevron", async () => {
    await renderPager(0);
    expect(navButtons("Previous group")).toHaveLength(0);
    expect(navButtons("Next group")).toHaveLength(2);
  });

  test("the last group has no 'Next group' chevron", async () => {
    await renderPager(2);
    expect(navButtons("Next group")).toHaveLength(0);
    expect(navButtons("Previous group")).toHaveLength(2);
  });

  test("a single group has no chevrons at all", async () => {
    await renderPager(0, GROUPS.slice(0, 1));
    expect(navButtons("Previous group")).toHaveLength(0);
    expect(navButtons("Next group")).toHaveLength(0);
  });

  test("the wide chevrons are titled with the neighbouring group names", async () => {
    await renderPager(1);
    expect(navButtons("Previous group")[0]).toHaveAttribute("title", "alpha");
    expect(navButtons("Next group")[0]).toHaveAttribute("title", "gamma");
  });

  test.each([0, 1])("clicking chevron %i of each pair navigates", async (i) => {
    const { onNavigate } = await renderPager(1);
    userEvent.click(navButtons("Next group")[i]);
    expect(onNavigate).toHaveBeenLastCalledWith(2);
    userEvent.click(navButtons("Previous group")[i]);
    expect(onNavigate).toHaveBeenLastCalledWith(0);
    expect(onNavigate).toHaveBeenCalledTimes(2);
  });

  test("ArrowRight and ArrowLeft navigate", async () => {
    const { onNavigate } = await renderPager(1);
    pressKey("ArrowRight");
    expect(onNavigate).toHaveBeenLastCalledWith(2);
    pressKey("ArrowLeft");
    expect(onNavigate).toHaveBeenLastCalledWith(0);
    expect(onNavigate).toHaveBeenCalledTimes(2);
  });

  test("arrow keys do nothing past either end", async () => {
    const first = await renderPager(0);
    pressKey("ArrowLeft");
    expect(first.onNavigate).not.toHaveBeenCalled();
    first.unmount();

    const last = await renderPager(2);
    pressKey("ArrowRight");
    expect(last.onNavigate).not.toHaveBeenCalled();
  });

  test("other keys are ignored", async () => {
    const { onNavigate } = await renderPager(1);
    pressKey("ArrowDown");
    pressKey("Enter");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test.each(["altKey", "ctrlKey", "metaKey", "shiftKey"])(
    "arrow keys are ignored with %s held",
    async (modifier) => {
      const { onNavigate } = await renderPager(1);
      pressKey("ArrowRight", { [modifier]: true });
      pressKey("ArrowLeft", { [modifier]: true });
      expect(onNavigate).not.toHaveBeenCalled();
    }
  );

  test.each([
    ["an input", () => document.createElement("input")],
    ["a textarea", () => document.createElement("textarea")],
    ["a select", () => document.createElement("select")],
  ])("arrow keys are ignored while typing in %s", async (_, create) => {
    const { onNavigate } = await renderPager(1);
    const field = document.body.appendChild(create());
    pressKey("ArrowRight", {}, field);
    expect(onNavigate).not.toHaveBeenCalled();
    field.remove();
  });

  test("arrow keys are ignored while typing in a contenteditable element", async () => {
    const { onNavigate } = await renderPager(1);
    const editable = document.body.appendChild(document.createElement("div"));
    // jsdom does not implement isContentEditable
    Object.defineProperty(editable, "isContentEditable", { value: true });
    pressKey("ArrowRight", {}, editable);
    expect(onNavigate).not.toHaveBeenCalled();
    editable.remove();
  });

  test("arrow keys are ignored while a dialog is open and work again once it closes", async () => {
    const { onNavigate } = await renderPager(1);
    const dialog = document.body.appendChild(document.createElement("div"));
    dialog.setAttribute("role", "dialog");
    pressKey("ArrowRight");
    expect(onNavigate).not.toHaveBeenCalled();

    dialog.remove();
    pressKey("ArrowRight");
    expect(onNavigate).toHaveBeenCalledWith(2);
  });

  test("the key listener is removed on unmount", async () => {
    const { onNavigate, unmount } = await renderPager(1);
    unmount();
    pressKey("ArrowRight");
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test("the sidebar lists every group with its count and a header", async () => {
    await renderPager(0);
    expect(sidebar()).toHaveTextContent("3 groups");
    expect(sidebarEntries().map((e) => [e.getAttribute("title"), e.textContent])).toEqual([
      ["alpha", "ALPHAx1"],
      ["beta", "BETAx2"],
      ["gamma", "GAMMAx3"],
    ]);
  });

  test("the sidebar marks only the current group with aria-current", async () => {
    await renderPager(1);
    expect(sidebarEntries().map((e) => e.getAttribute("aria-current"))).toEqual([
      null,
      "page",
      null,
    ]);
  });

  test("clicking a sidebar entry navigates to it", async () => {
    const { onNavigate } = await renderPager(0);
    userEvent.click(sidebarEntries()[2]);
    expect(onNavigate).toHaveBeenCalledWith(2);
  });

  test("the sidebar is virtualized for many groups", async () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      name: `g${i}`,
      label: `g${i}`,
      count: 1,
    }));
    await renderPager(0, many);
    expect(sidebar()).toHaveTextContent("1000 groups");
    const mounted = sidebarEntries().length;
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(100);
  });

  test.each([
    [0, "1 / 3"],
    [1, "2 / 3"],
    [2, "3 / 3"],
  ])("the mobile bar shows the position of group %i as '%s'", async (current, text) => {
    await renderPager(current);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  test("sidebarHeader renders in the sidebar and again above the content", async () => {
    render(
      <GroupPager
        groups={GROUPS}
        current={0}
        onNavigate={jest.fn()}
        sidebarHeader={<span>extra controls</span>}
      >
        <div>content</div>
      </GroupPager>
    );
    await act(async () => {});
    const copies = screen.getAllByText("extra controls");
    expect(copies).toHaveLength(2);
    expect(sidebar()).toContainElement(copies[0]);
    expect(sidebar()).not.toContainElement(copies[1]);
    // the group entries are unaffected
    expect(sidebarEntries()).toHaveLength(3);
  });

  test("without sidebarHeader nothing extra is rendered", async () => {
    await renderPager(0);
    expect(sidebarEntries()).toHaveLength(3);
  });

  describe("navigation pulse", () => {
    const pulsing = (name: "Previous group" | "Next group") =>
      navButtons(name).map((b) => within(b).queryByText((_, el) => el?.getAttribute("data-pulse") === "true") !== null);

    test("nothing pulses before the first navigation", async () => {
      await renderPager(1);
      expect(pulsing("Previous group")).toEqual([false, false]);
      expect(pulsing("Next group")).toEqual([false, false]);
    });

    test("clicking Next pulses the Next chevrons", async () => {
      await renderPager(1);
      userEvent.click(navButtons("Next group")[0]);
      expect(pulsing("Next group")).toEqual([true, true]);
      expect(pulsing("Previous group")).toEqual([false, false]);
    });

    test("ArrowLeft pulses the Previous chevrons; ArrowRight then moves the pulse", async () => {
      await renderPager(1);
      pressKey("ArrowLeft");
      expect(pulsing("Previous group")).toEqual([true, true]);
      pressKey("ArrowRight");
      expect(pulsing("Next group")).toEqual([true, true]);
      expect(pulsing("Previous group")).toEqual([false, false]);
    });

    test("each navigation restarts the animation without remounting the button", async () => {
      await renderPager(1);
      const button = navButtons("Next group")[0];
      userEvent.click(button);
      // eslint-disable-next-line testing-library/no-node-access
      const first = button.querySelector('[data-pulse="true"]');
      userEvent.click(button);
      // eslint-disable-next-line testing-library/no-node-access
      const second = button.querySelector('[data-pulse="true"]');
      expect(second).not.toBe(first);
      expect(navButtons("Next group")[0]).toBe(button);
    });
  });
});

