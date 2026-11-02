import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./FilterBar";
import { FilterToken, tokenLabel } from "@/functions/record-filter";
import { SuggestionIndex } from "@/functions/filter-suggestions";

const index: SuggestionIndex = {
  q: [{ value: "SRR1.a" }, { value: "SRR1.b" }, { value: "SRR2.a" }],
  t: [
    { value: "bacteria", count: 9 },
    { value: "bacillota", count: 7 },
    { value: "bacillus subtilis group", count: 3 },
  ],
  rank: [
    { value: "genus", count: 5 },
    { value: "species", count: 4 },
  ],
  rule: [
    { value: "unanimous", count: 6 },
    { value: "majority", count: 2 },
  ],
};

function Harness({ initial = [] as FilterToken[] }) {
  const [tokens, setTokens] = useState<FilterToken[]>(initial);
  return (
    <>
      <FilterBar tokens={tokens} onChange={setTokens} tree={[]} suggestions={index} />
      <output data-testid="tokens">{tokens.map(tokenLabel).join(" | ")}</output>
    </>
  );
}

const input = () => screen.getByRole("combobox", { name: "Filter records" });
const options = () => screen.queryAllByRole("option").map((o) => o.textContent);
const chips = () => screen.getByTestId("tokens").textContent;

describe("FilterBar value suggestions", () => {
  it("clicking a key button opens its values, most frequent first, with counts", () => {
    render(<Harness />);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    userEvent.click(screen.getByRole("button", { name: "+ Rank" }));
    const listbox = screen.getByRole("listbox", { name: "Rank suggestions" });
    expect(within(listbox).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "genus×5",
      "species×4",
    ]);
    expect(input()).toHaveAttribute("aria-expanded", "true");
  });

  it("typing narrows the values", () => {
    render(<Harness />);
    userEvent.click(screen.getByRole("button", { name: "+ Taxonomy" }));
    userEvent.type(input(), "bacil");
    expect(options()).toEqual(["bacillota×7", "bacillus subtilis group×3"]);
  });

  it("clicking a value adds its chip and clears the box", () => {
    render(<Harness />);
    userEvent.click(screen.getByRole("button", { name: "+ Taxonomy" }));
    userEvent.click(screen.getByRole("option", { name: /bacillus subtilis group/ }));
    expect(chips()).toBe("Taxonomy: bacillus subtilis group");
    expect(input()).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ArrowDown/ArrowUp move the highlight and Enter picks it", () => {
    render(<Harness />);
    userEvent.click(screen.getByRole("button", { name: "+ Query" }));
    userEvent.keyboard("{arrowdown}{arrowdown}{arrowdown}{arrowup}");
    expect(screen.getByRole("option", { selected: true })).toHaveTextContent("SRR1.b");
    expect(input()).toHaveAttribute("aria-activedescendant");
    userEvent.keyboard("{enter}");
    expect(chips()).toBe("Query: SRR1.b");
  });

  it("Enter without a highlight commits the typed text as before", () => {
    render(<Harness />);
    userEvent.type(input(), "rule:maj{enter}");
    expect(chips()).toBe("Rule: maj");
  });

  it("text typed before the key is committed together with the pick", () => {
    render(<Harness />);
    userEvent.type(input(), "id>=97 rule:");
    userEvent.click(screen.getByRole("option", { name: /majority/ }));
    expect(chips()).toBe("Identity >= 97% | Rule: majority");
  });

  it("Escape closes the list but keeps the text; a second Escape clears it", () => {
    render(<Harness />);
    userEvent.type(input(), "rank:");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    userEvent.keyboard("{escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input()).toHaveValue("rank:");
    userEvent.keyboard("{escape}");
    expect(input()).toHaveValue("");
  });

  it("shows nothing for keys without suggestions or without matches", () => {
    render(<Harness />);
    userEvent.click(screen.getByRole("button", { name: "+ Identity" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    userEvent.clear(input());
    userEvent.type(input(), "rank:zzz");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("the list closes when the box loses focus", () => {
    render(<Harness />);
    userEvent.click(screen.getByRole("button", { name: "+ Rule" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    userEvent.tab();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("renders the footer slot inside the bar, after the filter buttons", () => {
    render(
      <FilterBar tokens={[]} onChange={() => {}} tree={[]} footer={<button>View slot</button>} />
    );
    const buttons = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    const tree = buttons.findIndex((text) => text.includes("Taxonomy tree"));
    expect(tree).toBeGreaterThan(-1);
    expect(buttons.indexOf("View slot")).toBeGreaterThan(tree);
    expect(screen.getByRole("button", { name: "View slot" })).toBeInTheDocument();
  });
});
