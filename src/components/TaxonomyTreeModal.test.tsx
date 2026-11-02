import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { buildTaxonomyTree, TaxonomyTreeNode } from "@/functions/taxonomy-tree";
import { Result } from "@/types/BlutilsResult";
import small from "@/__fixtures__/small.result.json";
import { TaxonomyTreeModal } from "./TaxonomyTreeModal";

const TREE = buildTaxonomyTree(small.results as unknown as Result[]);

function renderTree(tree: TaxonomyTreeNode[] = TREE) {
  const onPick = jest.fn();
  const onClose = jest.fn();
  render(<TaxonomyTreeModal tree={tree} onPick={onPick} onClose={onClose} />);
  return { onPick, onClose };
}

// Visible node names, in document order.
// Collapsed branches stay mounted (for the close animation) but aria-hidden.
function visibleNames() {
  return Array.from(
    screen.getByRole("tree").querySelectorAll('button[title^="Filter by "]')
  )
    .filter((b) => !b.closest('[aria-hidden="true"]'))
    .map((b) => b.textContent);
}

function treeItem(name: string) {
  return screen.getByTitle(new RegExp(`^Filter by (.* > )?${name}$`)).closest(
    '[role="treeitem"]'
  ) as HTMLElement;
}

function count(name: string) {
  // the row holding the name button ends with "×<count>"
  return treeItem(name).firstElementChild!.lastElementChild!.textContent;
}

describe("TaxonomyTreeModal", () => {
  test("is a dialog titled 'Taxonomy tree' holding a tree", () => {
    renderTree();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Taxonomy tree");
    expect(within(dialog).getByRole("tree", { name: "Taxonomy tree" })).toBeInTheDocument();
  });

  test("the first two levels start expanded, deeper nodes collapsed", () => {
    renderTree();
    expect(visibleNames()).toEqual(["Bacteria", "Bacillota", "Bacilli"]);
    ["bacteria", "bacillota"].forEach((name) =>
      expect(treeItem(name)).toHaveAttribute("aria-expanded", "true")
    );
    expect(treeItem("bacilli")).toHaveAttribute("aria-expanded", "false");
  });

  test("each node shows its record count", () => {
    renderTree();
    // the 5 small-fixture results with a taxonomy all pass through bacteria
    expect(count("bacteria")).toBe("×5");
    expect(count("bacillota")).toBe("×5");
  });

  test("expand and collapse buttons toggle a node's children", async () => {
    renderTree();
    userEvent.click(screen.getByRole("button", { name: "Collapse bacillota" }));
    expect(treeItem("bacillota")).toHaveAttribute("aria-expanded", "false");
    expect(visibleNames()).toEqual(["Bacteria", "Bacillota"]);
    userEvent.click(screen.getByRole("button", { name: "Expand bacillota" }));

    // A first open mounts the children and expands them on the next frame.
    for (const name of ["bacilli", "bacillales", "bacillaceae", "bacillus"]) {
      userEvent.click(await screen.findByRole("button", { name: `Expand ${name}` }));
      await screen.findByRole("button", { name: `Collapse ${name}` });
    }
    expect(visibleNames()).toEqual([
      "Bacteria",
      "Bacillota",
      "Bacilli",
      "Bacillales",
      "Bacillaceae",
      "Bacillus",
      "Bacillus Subtilis",
      "Bacillus Subtilis Group",
    ]);
    expect(count("bacillaceae")).toBe("×5");
    expect(count("bacillus")).toBe("×4");
    expect(count("bacillus subtilis")).toBe("×1");

    userEvent.click(screen.getByRole("button", { name: "Collapse bacillota" }));
    expect(visibleNames()).toEqual(["Bacteria", "Bacillota"]);
  });

  test("leaves have no expand button and no aria-expanded", () => {
    renderTree([{ name: "leaf", rank: "s", path: "leaf", count: 1, children: [] }]);
    expect(screen.queryByRole("button", { name: /^(Expand|Collapse) / })).not.toBeInTheDocument();
    expect(treeItem("leaf")).not.toHaveAttribute("aria-expanded");
  });

  test("the rank prefix is shown as a readable rank", () => {
    renderTree();
    expect(treeItem("bacteria").firstElementChild).toHaveTextContent(/^BacteriaDomain×5$/);
    expect(treeItem("bacillota").firstElementChild).toHaveTextContent(/^BacillotaPhylum×5$/);
  });

  test("clicking a node name picks its full path", () => {
    const { onPick } = renderTree();
    userEvent.click(screen.getByTitle("Filter by bacteria > bacillota"));
    expect(onPick).toHaveBeenCalledWith("bacteria > bacillota");
  });

  test("the Close button calls onClose", () => {
    const { onClose, onPick } = renderTree();
    userEvent.click(within(screen.getByRole("dialog")).getByLabelText("Close"));
    expect(onClose).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });

  test("an empty tree says there is no taxonomy", () => {
    renderTree([]);
    expect(screen.getByText("No taxonomy in this result.")).toBeInTheDocument();
    expect(screen.queryByRole("tree")).not.toBeInTheDocument();
  });

  test("a collapsed branch stays mounted for the animation but is hidden and inert", async () => {
    renderTree();
    userEvent.click(screen.getByRole("button", { name: "Collapse bacillota" }));
    // eslint-disable-next-line testing-library/no-node-access
    const group = treeItem("bacillota").querySelector('div[aria-hidden="true"]');
    expect(group).toHaveAttribute("inert");
    expect(screen.queryByRole("button", { name: /Expand bacilli$/ })).not.toBeInTheDocument();
  });
});
