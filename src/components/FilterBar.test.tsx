import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterToken, parseFilter, serializeFilter } from "@/functions/record-filter";
import { buildTaxonomyTree } from "@/functions/taxonomy-tree";
import { Result } from "@/types/BlutilsResult";
import small from "@/__fixtures__/small.result.json";
import { FilterBar } from "./FilterBar";

const TREE = buildTaxonomyTree(small.results as unknown as Result[]);

// Owns the committed tokens like Results does through `?f=`.
function StatefulFilterBar({
  initial = "",
  onChange,
}: {
  initial?: string;
  onChange?: (tokens: FilterToken[]) => void;
}) {
  const [tokens, setTokens] = useState(() => parseFilter(initial));
  return (
    <>
      <FilterBar
        tokens={tokens}
        tree={TREE}
        onChange={(next) => {
          onChange?.(next);
          setTokens(next);
        }}
      />
      <output data-testid="serialized">{serializeFilter(tokens)}</output>
    </>
  );
}

function renderBar(initial = "") {
  const onChange = jest.fn();
  render(<StatefulFilterBar initial={initial} onChange={onChange} />);
  return { onChange };
}

function input() {
  return screen.getByLabelText("Filter records") as HTMLInputElement;
}

function chips() {
  return screen.queryAllByTestId("filter-chip").map((c) => c.textContent);
}

function serialized() {
  return screen.getByTestId("serialized").textContent;
}

function button(name: string) {
  return screen.getByRole("button", { name });
}

describe("FilterBar", () => {
  test("starts with no chips, no Clear button and an empty box", () => {
    renderBar();
    expect(chips()).toEqual([]);
    expect(input()).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  test("renders a chip per committed token", () => {
    renderBar('q:S2 t:"bacillus subtilis" id>=99 has:match free');
    expect(chips()).toEqual([
      "Query: S2",
      "Taxonomy: bacillus subtilis",
      "Identity >= 99%",
      "Matched only",
      '"free"',
    ]);
  });

  test("Enter parses the draft into chips and clears the box", () => {
    const { onChange } = renderBar();
    userEvent.type(input(), 'q:S2 t:"bacillus subtilis group" bits>800{enter}');
    expect(chips()).toEqual([
      "Query: S2",
      "Taxonomy: bacillus subtilis group",
      "Bit score > 800",
    ]);
    expect(input()).toHaveValue("");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(serialized()).toBe('q:S2 t:"bacillus subtilis group" bits>800');
  });

  test("Enter appends to the existing chips and skips duplicates", () => {
    renderBar("q:S2");
    userEvent.type(input(), "q:S2 rank:genus{enter}");
    expect(chips()).toEqual(["Query: S2", "Rank: genus"]);
  });

  // BUG-U04: a whitespace-only term used to become a filter that matched nothing.
  test("BUG-U04: an empty or whitespace-only entry adds no chip", () => {
    const { onChange } = renderBar();
    userEvent.type(input(), "{enter}");
    userEvent.type(input(), "   {enter}");
    expect(chips()).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
    expect(input()).toHaveValue("");
  });

  test("a chip's remove button removes only that chip", () => {
    renderBar("q:S2 rank:genus");
    userEvent.click(button("Remove filter Query: S2"));
    expect(chips()).toEqual(["Rank: genus"]);
  });

  test("Backspace in the empty box removes the last chip", () => {
    renderBar("q:S2 rank:genus");
    userEvent.type(input(), "{backspace}");
    expect(chips()).toEqual(["Query: S2"]);
  });

  test("Backspace while typing edits the draft and keeps the chips", () => {
    const { onChange } = renderBar("q:S2");
    userEvent.type(input(), "ab{backspace}");
    expect(input()).toHaveValue("a");
    expect(chips()).toEqual(["Query: S2"]);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("Escape clears the draft without committing it", () => {
    const { onChange } = renderBar();
    userEvent.type(input(), "q:S2{esc}");
    expect(input()).toHaveValue("");
    expect(chips()).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
  });

  test.each([
    ["+ Query", "q:"],
    ["+ Taxonomy", "t:"],
    ["+ Rank", "rank:"],
    ["+ Rule", "rule:"],
    ["+ Identity", "id>="],
    ["+ Bit score", "bits>="],
  ])("'%s' inserts %s into the box and focuses it", (name, prefix) => {
    renderBar();
    userEvent.click(button(name));
    expect(input()).toHaveValue(prefix);
    expect(input()).toHaveFocus();
  });

  test("a prefix is appended after the current draft, then typing completes it", () => {
    renderBar();
    userEvent.type(input(), "q:S2 ");
    userEvent.click(button("+ Identity"));
    expect(input()).toHaveValue("q:S2 id>=");
    userEvent.type(input(), "99{enter}");
    expect(chips()).toEqual(["Query: S2", "Identity >= 99%"]);
  });

  test("Matched and Unmatched toggle has:match / no:match and exclude each other", () => {
    renderBar("q:S2");
    const matched = button("Matched");
    const unmatched = button("Unmatched");
    expect(matched).toHaveAttribute("aria-pressed", "false");
    expect(unmatched).toHaveAttribute("aria-pressed", "false");

    userEvent.click(matched);
    expect(matched).toHaveAttribute("aria-pressed", "true");
    expect(serialized()).toBe("q:S2 has:match");

    userEvent.click(unmatched);
    expect(matched).toHaveAttribute("aria-pressed", "false");
    expect(unmatched).toHaveAttribute("aria-pressed", "true");
    expect(serialized()).toBe("q:S2 no:match");

    userEvent.click(unmatched);
    expect(unmatched).toHaveAttribute("aria-pressed", "false");
    expect(serialized()).toBe("q:S2");
  });

  test("typing no:match replaces an existing has:match chip", () => {
    renderBar("has:match");
    userEvent.type(input(), "no:match{enter}");
    expect(chips()).toEqual(["Unmatched only"]);
    expect(button("Unmatched")).toHaveAttribute("aria-pressed", "true");
  });

  test("'Clear filters' removes every chip and then hides itself", () => {
    renderBar("q:S2 rank:genus has:match");
    userEvent.click(button("Clear filters"));
    expect(chips()).toEqual([]);
    expect(serialized()).toBe("");
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  test("'Taxonomy tree' opens the tree; picking a node adds a t: chip with its path and closes", async () => {
    renderBar("q:S");
    userEvent.click(button("Taxonomy tree"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("tree")).toBeInTheDocument();

    userEvent.click(within(dialog).getByTitle("Filter by bacteria > bacillota"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(chips()).toEqual(["Query: S", "Taxonomy: bacteria > bacillota"]);
    expect(serialized()).toBe('q:S t:"bacteria > bacillota"');
  });

  test("closing the tree without picking adds nothing", async () => {
    const { onChange } = renderBar();
    userEvent.click(button("Taxonomy tree"));
    userEvent.click(within(screen.getByRole("dialog")).getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onChange).not.toHaveBeenCalled();
  });
});
